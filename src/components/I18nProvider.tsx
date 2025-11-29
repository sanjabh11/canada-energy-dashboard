/**
 * I18nProvider Component
 * 
 * Provides internationalization context to the application.
 * Addresses Gap #3: Bilingual EN/FR (HIGH Priority)
 * 
 * Usage:
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 */

import React, { useState, useEffect, ReactNode } from 'react';
import {
  I18nContext,
  Language,
  translations,
  detectBrowserLanguage,
  getStoredLanguage,
  storeLanguage
} from '../lib/i18n';

interface I18nProviderProps {
  /** Default language (overrides auto-detection) */
  defaultLanguage?: Language;
  /** Child components */
  children: ReactNode;
}

export function I18nProvider({
  defaultLanguage,
  children
}: I18nProviderProps) {
  // Initialize language from: props > localStorage > browser detection
  const [language, setLanguageState] = useState<Language>(() => {
    if (defaultLanguage) return defaultLanguage;
    const stored = getStoredLanguage();
    if (stored) return stored;
    return detectBrowserLanguage();
  });

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    storeLanguage(language);
  }, [language]);

  // Handle language change
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const value = {
    language,
    setLanguage,
    t: translations[language]
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export default I18nProvider;
