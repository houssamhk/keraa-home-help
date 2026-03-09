import { useState } from "react";
import { motion } from "framer-motion";
import { Languages, Check, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage, type Language } from "@/i18n/LanguageContext";

interface LanguagePickerProps {
  onComplete: () => void;
}

const languageOptions = [
  { value: 'ar' as Language, label: 'العربية', nativeLabel: 'العربية', flag: '🇩🇿' },
  { value: 'en' as Language, label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { value: 'fr' as Language, label: 'Français', nativeLabel: 'Français', flag: '🇫🇷' }
];

export function LanguagePicker({ onComplete }: LanguagePickerProps) {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    setIsConfirming(true);
    setLanguage(selectedLang);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const selectedOption = languageOptions.find(opt => opt.value === selectedLang);

  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col items-center justify-center safe-area-inset p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(30 70% 50% / 0.1) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md elevated-card">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-gold">
              <Languages className="w-8 h-8 text-primary-foreground" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6"
          >
            <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
              {t.languagePicker.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t.languagePicker.subtitle}
            </p>
          </motion.div>

          {/* Language Selection */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Select value={selectedLang} onValueChange={(value: Language) => setSelectedLang(value)}>
              <SelectTrigger className="w-full h-12 text-left">
                <SelectValue>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{selectedOption?.flag}</span>
                    <span className="font-medium">{selectedOption?.nativeLabel}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="h-12">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.flag}</span>
                      <span className="font-medium">{option.nativeLabel}</span>
                      {selectedLang === option.value && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Confirm Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Button 
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full h-12 font-semibold"
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t.loading}
                </div>
              ) : (
                t.languagePicker.continue
              )}
            </Button>
          </motion.div>

          {/* Skip Option */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <button 
              onClick={onComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.languagePicker.skip}
            </button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}