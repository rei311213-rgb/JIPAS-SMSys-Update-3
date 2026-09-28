import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, translations } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('jipas_lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const clearExternalTranslationCookies = () => {
    if (typeof document === 'undefined') return;
    try {
      const hostname = window.location.hostname;
      const domains = ['', `.${hostname}`, hostname, 'localhost', `.${hostname.split('.').slice(-2).join('.')}`];
      const paths = ['/', ''];
      
      domains.forEach(d => {
        paths.forEach(p => {
          const domainPart = d ? `; domain=${d}` : '';
          const pathPart = p ? `; path=${p}` : '; path=/';
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC${pathPart}${domainPart}`;
        });
      });
    } catch {
      // ignore
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('jipas_lang', lang);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      if (lang === 'en') {
        clearExternalTranslationCookies();
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      if (language === 'en') {
        clearExternalTranslationCookies();
      }
    }
  }, [language]);

  const t = useMemo(() => {
    return (key: string, defaultText?: string): string => {
      const entry = translations[key];
      if (entry && entry[language]) {
        return entry[language];
      }
      return defaultText ?? entry?.en ?? key;
    };
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
