import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Home, 
  Wrench, 
  Map, 
  Sparkles,
  Send,
  MessageSquare,
  Loader2,
  Settings,
  MessageCircle,
  CreditCard,
  Bell,
  Calendar,
  Shield,
  Phone,
  PhoneOff,
  Volume2,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useChat } from "@/hooks/useChat";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useFavorites } from "@/hooks/useFavorites";

interface AIVoiceHubProps {
  userName?: string;
  onNavigate: (route: string) => void;
  needsKYC?: boolean;
}

export function AIVoiceHub({ userName = "Guest", onNavigate, needsKYC }: AIVoiceHubProps) {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { favorites } = useFavorites();
  
  // Voice chat hook for voice mode
  const voiceChat = useVoiceChat();
  
  // Text chat hook for text mode
  const textChat = useChat();

  // Use the appropriate chat based on mode
  const messages = inputMode === "voice" ? voiceChat.messages : textChat.messages;
  const isLoading = inputMode === "voice" ? voiceChat.isLoading : textChat.isLoading;
  const error = inputMode === "voice" ? voiceChat.error : textChat.error;

  const quickActions = [
    { id: 'properties', icon: Home, label: 'العقارات', route: '/properties' },
    { id: 'favorites', icon: Heart, label: 'المفضلة', route: '/favorites', badge: favorites.size > 0 ? favorites.size : undefined },
    { id: 'handymen', icon: Wrench, label: 'الحرفيون', route: '/handymen' },
    { id: 'map', icon: Map, label: 'الخريطة', route: '/map' },
    { id: 'contracts', icon: MessageSquare, label: 'العقود', route: '/contracts' },
    { id: 'bills', icon: CreditCard, label: 'الفواتير', route: '/bills' },
    { id: 'appointments', icon: Calendar, label: 'المواعيد', route: '/appointments' },
    { id: 'service-requests', icon: Wrench, label: 'طلباتي', route: '/service-requests' },
  ];

  const suggestions = [
    "ابحث عن شقة في الجزائر العاصمة",
    "أحتاج سباك بشكل عاجل",
    "أظهر لي منازل أقل من 50,000 دج/شهر",
    "احجز منظف ليوم الجمعة",
  ];

  // Scroll to bottom when new messages arrive
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
    if (inputMode === "text") {
      textChat.sendMessage(suggestion);
    }
  };

  const hasMessages = messages.length > 0;

  // Determine conversation state for voice mode
  const getVoiceStatus = () => {
    if (!voiceChat.isSupported) return "غير مدعوم";
    if (voiceChat.isSpeaking) return "جاري الرد...";
    if (voiceChat.isListening) return "جاري الاستماع...";
    if (voiceChat.isConversationActive) return "في انتظار حديثك...";
    return "اضغط لبدء المحادثة";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.header 
        className="px-6 pt-6 pb-4 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">مرحباً،</p>
            <h1 className="font-serif text-2xl font-bold text-foreground">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationCenter onNavigate={onNavigate} />
            {/* Chat Button */}
            <Button
              variant="glass"
              size="icon"
              onClick={() => onNavigate('/chat')}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            {/* Settings Button */}
            <Button
              variant="glass"
              size="icon"
              onClick={() => onNavigate('/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
            {/* Mode Toggle */}
            <Button
              variant="glass"
              size="sm"
              onClick={() => setInputMode(inputMode === "voice" ? "text" : "voice")}
              className="gap-2"
            >
              {inputMode === "voice" ? (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">كتابة</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span className="text-xs">صوت</span>
                </>
              )}
            </Button>
            {/* Profile Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

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
                {msg.role === "assistant" && inputMode === "voice" && voiceChat.isSpeaking && i === messages.length - 1 && (
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span className="text-xs">جاري التحدث...</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap" dir="auto">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        /* AI Voice Section - when no messages */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {inputMode === "voice" ? (
            <>
              {/* Voice Conversation UI */}
              <div className="relative">
                {/* Ambient rings when active */}
                {voiceChat.isConversationActive && (
                  <>
                    <motion.div
                      className={`absolute inset-0 rounded-full border ${voiceChat.isListening ? 'border-primary/50' : voiceChat.isSpeaking ? 'border-accent/50' : 'border-muted/30'}`}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className={`absolute inset-0 rounded-full border ${voiceChat.isListening ? 'border-primary/50' : voiceChat.isSpeaking ? 'border-accent/50' : 'border-muted/30'}`}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.div
                      className={`absolute inset-0 rounded-full border ${voiceChat.isListening ? 'border-primary/50' : voiceChat.isSpeaking ? 'border-accent/50' : 'border-muted/30'}`}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                    />
                  </>
                )}
                
                {/* Main conversation button - TOGGLE */}
                <motion.button
                  onClick={voiceChat.toggleConversation}
                  disabled={!voiceChat.isSupported}
                  className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                    voiceChat.isConversationActive
                      ? voiceChat.isSpeaking 
                        ? 'bg-accent shadow-lg'
                        : voiceChat.isListening
                          ? 'bg-primary shadow-gold'
                          : 'bg-gradient-to-br from-primary to-accent'
                      : 'bg-gradient-to-br from-muted to-muted-foreground/20'
                  } ${!voiceChat.isSupported ? 'opacity-50' : ''}`}
                  whileTap={{ scale: 0.95 }}
                  animate={voiceChat.isListening ? { scale: [1, 1.05, 1] } : {}}
                  transition={voiceChat.isListening ? { duration: 1, repeat: Infinity } : {}}
                >
                  <AnimatePresence mode="wait">
                    {voiceChat.isConversationActive ? (
                      <motion.div
                        key="active"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        className="flex flex-col items-center"
                      >
                        {voiceChat.isSpeaking ? (
                          <Volume2 className="w-10 h-10 text-white animate-pulse" />
                        ) : voiceChat.isListening ? (
                          <Mic className="w-10 h-10 text-white" />
                        ) : (
                          <PhoneOff className="w-10 h-10 text-white" />
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ scale: 0, rotate: 90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -90 }}
                        className="flex items-center gap-1"
                      >
                        <Phone className="w-10 h-10 text-white" />
                        <Sparkles className="w-5 h-5 text-white absolute -top-1 -right-1" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Status text */}
              <motion.div 
                className="mt-6 text-center"
                animate={{ opacity: 1 }}
              >
                <p className={`font-medium ${
                  voiceChat.isConversationActive 
                    ? voiceChat.isSpeaking 
                      ? 'text-accent' 
                      : voiceChat.isListening 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                    : 'text-muted-foreground'
                }`}>
                  {getVoiceStatus()}
                </p>
                {voiceChat.isConversationActive && (
                  <p className="text-xs text-muted-foreground mt-2">
                    اضغط الزر لإنهاء المحادثة
                  </p>
                )}
              </motion.div>

              {/* Live Transcription */}
              <AnimatePresence>
                {voiceChat.transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 px-6 py-3 glass-card max-w-xs"
                  >
                    <p className="text-foreground text-center text-sm" dir="auto">
                      {voiceChat.transcript}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* Text input mode - centered */
            <div className="w-full max-w-sm">
              <div className="glass-card p-6 text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">اكتب رسالتك للذكاء الاصطناعي</p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          <motion.div 
            className="mt-8 w-full max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3 text-center">
              جرّب قول
            </p>
            <div className="space-y-2">
              {suggestions.slice(0, 2).map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="w-full text-right px-4 py-3 glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={inputMode === "voice"}
                >
                  "{suggestion}"
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      {(hasMessages || inputMode === "text") && (
        <motion.div 
          className="px-4 pb-4 flex-shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-card p-2 flex items-center gap-2">
            {inputMode === "text" ? (
              <>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-foreground placeholder:text-muted-foreground"
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
              </>
            ) : (
              /* Voice toggle button when there are messages */
              <Button
                variant={voiceChat.isConversationActive ? "destructive" : "gold"}
                className="flex-1 gap-2"
                onClick={voiceChat.toggleConversation}
                disabled={!voiceChat.isSupported}
              >
                {voiceChat.isConversationActive ? (
                  <>
                    <PhoneOff className="w-5 h-5" />
                    <span>إنهاء المحادثة</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    <span>بدء المحادثة</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      {!hasMessages && (
        <motion.div 
          className="px-6 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-center gap-4 flex-wrap">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.id}
                onClick={() => onNavigate(action.route)}
                className="flex flex-col items-center gap-2 group relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 border border-transparent transition-all">
                  <action.icon className={`w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors ${action.id === 'favorites' ? 'group-hover:fill-primary/20' : ''}`} />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
          
          {/* Role-based Dashboard Links */}
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Button
              variant="glass"
              size="sm"
              onClick={() => onNavigate('/owner-dashboard')}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              <span>لوحة المالك</span>
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => onNavigate('/handyman-dashboard')}
              className="gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>لوحة الحرفي</span>
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => onNavigate('/admin')}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>لوحة المشرفين</span>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
