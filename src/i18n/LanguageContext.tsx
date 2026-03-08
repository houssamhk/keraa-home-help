import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ar } from './translations/ar';
import { fr } from './translations/fr';
import { en } from './translations/en';

export type Language = 'ar' | 'fr' | 'en';
type Translations = Omit<typeof ar, 'dir'> & { dir: 'rtl' | 'ltr' };

const translationsMap: Record<Language, Translations> = { ar, fr, en } as Record<Language, Translations>;

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'sakani-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'ar' || stored === 'fr' || stored === 'en') ? stored : 'ar';
  });

  const t = translationsMap[language];
  const dir = t.dir;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  // Apply dir attribute to document
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
