'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from './en';
import { bn } from './bn';
import { Language } from '../types';

type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = { en, bn };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'tender-builder-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'bn') {
        return saved;
      }
    } catch {
      // Local storage may be restricted in some environments
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage error
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let current: unknown = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Fallback to English
        let fallback: unknown = translations.en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    let text = current;
    if (params) {
      // 1. Process ICU plural format first: {key, plural, one {...} other {...}}
      text = text.replace(
        /\{([a-zA-Z0-9_]+),\s*plural,\s*([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}/g,
        (match, key, choicesStr) => {
          if (!(key in params)) {
            return match;
          }
          const rawVal = params[key];
          const num = Number(rawVal);
          if (isNaN(num)) {
            return match;
          }

          const choices: Record<string, string> = {};
          const choiceRegex = /([=\w]+)\s*\{([^{}]*)\}/g;
          let choiceMatch: RegExpExecArray | null;
          while ((choiceMatch = choiceRegex.exec(choicesStr)) !== null) {
            choices[choiceMatch[1]] = choiceMatch[2];
          }

          let selectedText: string | undefined;
          if (`=${num}` in choices) {
            selectedText = choices[`=${num}`];
          } else if (num === 0 && 'zero' in choices) {
            selectedText = choices['zero'];
          } else if (num === 1 && 'one' in choices) {
            selectedText = choices['one'];
          } else if (num === 2 && 'two' in choices) {
            selectedText = choices['two'];
          } else if ('other' in choices) {
            selectedText = choices['other'];
          } else {
            selectedText = Object.values(choices)[0] ?? '';
          }

          return selectedText.replace(/#/g, String(rawVal));
        }
      );

      // 2. Process variable substitutions: {k}
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className={language === 'bn' ? 'lang-bn' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
