import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Send, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user?: {
    full_name: string;
    avatar_url: string;
  };
}

interface ChatPageProps {
  onBack: () => void;
  conversationId?: string;
  otherUserId?: string;
}

export function ChatPage({ onBack, conversationId: initialConversationId, otherUserId }: ChatPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      subscribeToMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    
    if (!error && data) {
      // Fetch other user profiles
      const enrichedConversations = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', otherUserId)
            .single();
          
          return {
            ...conv,
            other_user: profile || undefined
          };
        })
      );
      setConversations(enrichedConversations);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
      
      // Mark as read
      if (user) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id);
      }
    }
  };

  const subscribeToMessages = (convId: string) => {
    const channel = supabase
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !activeConversation) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: newMessage.trim()
      });

    if (!error) {
      setNewMessage('');
      
      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation);
    }
  };

  const startConversation = async (targetUserId: string) => {
    if (!user) return;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`)
      .single();

    if (existing) {
      setActiveConversation(existing.id);
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: targetUserId
        })
        .select()
        .single();

      if (!error && newConv) {
        setActiveConversation(newConv.id);
        fetchConversations();
      }
    }
  };

  useEffect(() => {
    if (otherUserId && user) {
      startConversation(otherUserId);
    }
  }, [otherUserId, user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  };

  // Conversation List View
  if (!activeConversation && !otherUserId) {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pt-6 pb-4 flex items-center gap-4"
        >
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">المحادثات</h1>
        </motion.header>

        <div className="px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">لا توجد محادثات بعد</p>
              <p className="text-sm text-muted-foreground mt-2">
                ابدأ محادثة مع مالك عقار أو حرفي
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, index) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setActiveConversation(conv.id)}
                  className="w-full glass-card p-4 flex items-center gap-4 text-right"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold">
                      {conv.other_user?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {conv.other_user?.full_name || 'مستخدم'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(conv.last_message_at)}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-border"
      >
        <Button variant="glass" size="icon" onClick={() => setActiveConversation(null)}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-primary-foreground font-bold">م</span>
        </div>
        <div>
          <h2 className="font-medium text-foreground">محادثة</h2>
          <p className="text-xs text-muted-foreground">متصل الآن</p>
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                msg.sender_id === user?.id
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'glass-card rounded-bl-md'
              }`}
            >
              <p className="text-sm" dir="auto">{msg.content}</p>
              <div className={`flex items-center gap-1 mt-1 ${
                msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}>
                <span className="text-xs opacity-70">{formatTime(msg.created_at)}</span>
                {msg.sender_id === user?.id && (
                  msg.is_read ? (
                    <CheckCheck className="w-3 h-3 opacity-70" />
                  ) : (
                    <Check className="w-3 h-3 opacity-70" />
                  )
                )}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="glass-card p-2 flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-foreground placeholder:text-muted-foreground"
            dir="auto"
          />
          <Button
            variant="gold"
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
