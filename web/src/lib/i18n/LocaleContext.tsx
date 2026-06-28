'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Locale, type TranslationKeys } from './translations';

type LocaleContextValue = {
  locale: Locale;
  t: TranslationKeys;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'ag-pos-locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === 'en' || saved === 'id') setLocale(saved);
  }, []);

  const toggleLocale = () => {
    setLocale((prev) => {
      const next: Locale = prev === 'en' ? 'id' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <LocaleContext.Provider value={{ locale, t: translations[locale], toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
