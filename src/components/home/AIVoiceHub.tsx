import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Wrench, 
  Map, 
  Sparkles,
  Send,
  MessageSquare,
  Loader2,
  Settings,
  CreditCard,
  Calendar,
  Shield,
  Heart,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage } from "@/i18n/LanguageContext";

function renderMessageWithLinks(content: string, onNavigate: (route: string) => void) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const linkUrl = match[2];

    if (linkUrl.startsWith('/')) {
      parts.push(
        <button
          key={match.index}
          onClick={() => onNavigate(linkUrl)}
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 font-medium hover:text-primary/80 transition-colors mx-1"
        >
          {linkText} →
        </button>
      );
    } else {
      parts.push(
        <a key={match.index} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

interface AIVoiceHubProps {
  userName?: string;
  onNavigate: (route: string) => void;
  needsKYC?: boolean;
}

export function AIVoiceHub({ userName = "Guest", onNavigate, needsKYC }: AIVoiceHubProps) {
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { favorites } = useFavorites();
  const { t } = useLanguage();
  
  const textChat = useChat();
  const { messages, isLoading, error } = textChat;

  const quickActions = [
    { id: 'properties', icon: Home, label: t.quickActions.properties, route: '/properties' },
    { id: 'favorites', icon: Heart, label: t.quickActions.favorites, route: '/favorites', badge: favorites.size > 0 ? favorites.size : undefined },
    { id: 'handymen', icon: Wrench, label: t.quickActions.handymen, route: '/handymen' },
    { id: 'map', icon: Map, label: t.quickActions.map, route: '/map' },
    { id: 'contracts', icon: MessageSquare, label: t.quickActions.contracts, route: '/contracts' },
    { id: 'wallet', icon: Wallet, label: t.quickActions.wallet, route: '/wallet' },
    { id: 'bills', icon: CreditCard, label: t.quickActions.bills, route: '/bills' },
    { id: 'appointments', icon: Calendar, label: t.quickActions.appointments, route: '/appointments' },
  ];

  const suggestions = t.home.suggestions;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = () => {
    if (textInput.trim()) {
      textChat.sendMessage(textInput);
      setTextInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    textChat.sendMessage(suggestion);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-full flex flex-col bg-background safe-area-inset">
      {/* Header */}
      <motion.header 
        className="px-4 pt-4 pb-3 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('/settings')}
              className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center group transition-transform active:scale-95"
            >
              <span className="text-primary-foreground font-bold text-base group-hover:opacity-0 transition-opacity">
                {userName.charAt(0).toUpperCase()}
              </span>
              <Settings className="w-5 h-5 text-primary-foreground absolute opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <div>
              <p className="text-muted-foreground text-[11px] leading-tight">{t.home.greeting}</p>
              <h1 className="font-serif text-lg font-bold text-foreground leading-tight">{userName}</h1>
            </div>
          </div>
          <NotificationCenter onNavigate={onNavigate} />
        </div>
      </motion.header>

      {/* KYC Alert */}
      {needsKYC && (
        <div className="px-4 pb-2">
          <button
            onClick={() => onNavigate('/kyc')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm"
          >
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-primary">{t.home.completeKYC}</span>
          </button>
        </div>
      )}

      {/* Chat Messages */}
      {hasMessages ? (
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass-card rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="text-sm whitespace-pre-wrap" dir="auto">
                    {renderMessageWithLinks(msg.content, onNavigate)}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap" dir="auto">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* AI Assistant Card */}
          <motion.div
            className="glass-card p-5 text-center mb-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-serif text-lg font-bold text-foreground mb-1">{t.home.aiAssistant}</h2>
            <p className="text-muted-foreground text-sm">{t.home.aiDescription}</p>
          </motion.div>

          {/* Suggestions */}
          <div className="space-y-2 mb-5">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                className="w-full text-right px-4 py-3 glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                "{suggestion}"
              </motion.button>
            ))}
          </div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 text-center">{t.home.quickAccess}</p>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.id}
                  onClick={() => onNavigate(action.route)}
                  className="flex flex-col items-center gap-1.5 group relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 border border-transparent group-hover:border-primary/30 transition-all">
                    <action.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    {action.badge && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
            
            {/* Role Dashboards */}
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              <Button variant="glass" size="sm" onClick={() => onNavigate('/owner-dashboard')} className="gap-1.5 text-xs">
                <Home className="w-3.5 h-3.5" />
                {t.home.ownerPanel}
              </Button>
              <Button variant="glass" size="sm" onClick={() => onNavigate('/handyman-dashboard')} className="gap-1.5 text-xs">
                <Wrench className="w-3.5 h-3.5" />
                {t.home.handymanPanel}
              </Button>
              <Button variant="gold" size="sm" onClick={() => onNavigate('/admin')} className="gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5" />
                {t.home.admins}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        </div>
      )}

      {/* Text Input */}
      <motion.div 
        className="px-4 pb-4 flex-shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="glass-card p-2 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            placeholder={t.home.askPlaceholder}
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm"
            dir="auto"
          />
          <Button 
            variant="gold" 
            size="icon"
            onClick={handleSendText}
            disabled={!textInput.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
