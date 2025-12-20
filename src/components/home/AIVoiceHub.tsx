import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Home, 
  Wrench, 
  Map, 
  AlertTriangle,
  Sparkles,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIVoiceHubProps {
  userName?: string;
  onNavigate: (route: string) => void;
}

export function AIVoiceHub({ userName = "Guest", onNavigate }: AIVoiceHubProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");

  const quickActions = [
    { id: 'properties', icon: Home, label: 'Find Home', route: '/properties' },
    { id: 'handymen', icon: Wrench, label: 'Hire Help', route: '/handymen' },
    { id: 'map', icon: Map, label: 'Explore Map', route: '/map' },
  ];

  const suggestions = [
    "Find a 2-bedroom apartment in Algiers",
    "I need a plumber urgently",
    "Show me houses under 50,000 DZD/month",
    "Book a cleaner for this Friday",
  ];

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Simulate listening
      setTranscription("");
      setTimeout(() => {
        setTranscription("I'm looking for a 2-bedroom...");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.header 
        className="px-6 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Good evening,</p>
            <h1 className="font-serif text-2xl font-bold text-foreground">{userName}</h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-semibold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </motion.header>

      {/* AI Voice Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Ambient rings */}
        <div className="relative">
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
            </>
          )}
          
          {/* Main AI button */}
          <motion.button
            onClick={toggleListening}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-primary shadow-gold' 
                : 'bg-gradient-to-br from-primary to-accent'
            }`}
            whileTap={{ scale: 0.95 }}
            animate={isListening ? { scale: [1, 1.05, 1] } : {}}
            transition={isListening ? { duration: 1, repeat: Infinity } : {}}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="listening"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                >
                  <MicOff className="w-10 h-10 text-primary-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0, rotate: 90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -90 }}
                  className="flex items-center gap-1"
                >
                  <Mic className="w-10 h-10 text-primary-foreground" />
                  <Sparkles className="w-5 h-5 text-primary-foreground absolute -top-1 -right-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Status text */}
        <motion.p 
          className="mt-6 text-center"
          animate={{ opacity: isListening ? 1 : 0.7 }}
        >
          {isListening ? (
            <span className="text-primary font-medium">Listening...</span>
          ) : (
            <span className="text-muted-foreground">Tap to speak with AI</span>
          )}
        </motion.p>

        {/* Transcription */}
        <AnimatePresence>
          {transcription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 px-6 py-3 glass-card max-w-xs"
            >
              <p className="text-foreground text-center">{transcription}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {!isListening && (
          <motion.div 
            className="mt-8 w-full max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3 text-center">
              Try saying
            </p>
            <div className="space-y-2">
              {suggestions.slice(0, 2).map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="w-full text-left px-4 py-3 glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  onClick={() => {
                    setTranscription(suggestion);
                    setIsListening(true);
                  }}
                >
                  "{suggestion}"
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <motion.div 
        className="px-6 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-center gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.id}
              onClick={() => onNavigate(action.route)}
              className="flex flex-col items-center gap-2 group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 border border-transparent transition-all">
                <action.icon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* SOS Button */}
      <motion.div 
        className="px-6 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button 
          variant="sos" 
          size="lg" 
          className="w-full"
          onClick={() => onNavigate('/emergency')}
        >
          <AlertTriangle className="w-5 h-5" />
          Emergency SOS - Urgent Handyman
        </Button>
      </motion.div>
    </div>
  );
}
