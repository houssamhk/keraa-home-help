import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const assistantResponseRef = useRef("");

  // Load conversation list
  const loadConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (data) setConversations(data as Conversation[]);
  }, []);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoadingHistory(true);
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      setActiveConversationId(conversationId);
    }
    setIsLoadingHistory(false);
  }, []);

  // Start new conversation
  const newConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    assistantResponseRef.current = "";
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from('ai_conversations').delete().eq('id', conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      newConversation();
    }
  }, [activeConversationId, newConversation]);

  // Save message to DB
  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    });
  }, []);

  // Generate title from first message
  const generateTitle = (content: string) => {
    return content.length > 40 ? content.slice(0, 40) + '...' : content;
  };

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    const currentMessages = [...messages, userMsg];

    setMessages(currentMessages);
    setIsLoading(true);
    setError(null);
    assistantResponseRef.current = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("يجب تسجيل الدخول لاستخدام المحادثة");
      }

      // Create or use existing conversation
      let convId = activeConversationId;
      if (!convId) {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: session.user.id,
            title: generateTitle(input),
          })
          .select('id')
          .single();

        if (newConv) {
          convId = newConv.id;
          setActiveConversationId(convId);
        }
      } else {
        // Update timestamp
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

      // Save user message
      if (convId) await saveMessage(convId, 'user', input);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: currentMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "فشل الاتصال");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantResponseRef.current += content;

              if (!assistantAdded) {
                setMessages(prev => [...prev, { role: "assistant", content: assistantResponseRef.current }]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
                    newMessages[lastIndex] = { ...newMessages[lastIndex], content: assistantResponseRef.current };
                  }
                  return newMessages;
                });
              }
            }
          } catch {
            // JSON parse error - continue
          }
        }
      }

      // Save assistant response
      if (convId && assistantResponseRef.current) {
        await saveMessage(convId, 'assistant', assistantResponseRef.current);
      }

      // Refresh conversation list
      loadConversations();
    } catch (e) {
      console.error("Chat error:", e);
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, activeConversationId, saveMessage, loadConversations]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    assistantResponseRef.current = "";
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversations,
    activeConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
    isLoadingHistory,
    loadConversations,
  };
}
