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

function parsePlural(text: string, params: Record<string, string | number>): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    const match = /\{(\w+),\s*plural\s*,/.exec(text.slice(i));
    if (!match) {
      result += text.slice(i);
      break;
    }

    const matchIndex = i + match.index;
    const key = match[1];

    result += text.slice(i, matchIndex);

    let depth = 0;
    let endIndex = -1;
    for (let j = matchIndex; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) {
          endIndex = j;
          break;
        }
      }
    }

    if (endIndex === -1) {
      result += match[0];
      i = matchIndex + match[0].length;
      continue;
    }

    const bodyStart = matchIndex + match[0].length;
    const body = text.slice(bodyStart, endIndex);

    i = endIndex + 1;

    if (!(key in params)) {
      result += text.slice(matchIndex, endIndex + 1);
      continue;
    }

    const val = params[key];
    const num = typeof val === 'number' ? val : Number(val);

    const clauses: Record<string, string> = {};
    let bodyIdx = 0;
    while (bodyIdx < body.length) {
      const clauseMatch = /^\s*(=?\w+)\s*\{/.exec(body.slice(bodyIdx));
      if (!clauseMatch) break;

      const kw = clauseMatch[1];
      const contentStart = bodyIdx + clauseMatch[0].length;
      let cDepth = 1;
      let cEnd = -1;
      for (let k = contentStart; k < body.length; k++) {
        if (body[k] === '{') cDepth++;
        else if (body[k] === '}') {
          cDepth--;
          if (cDepth === 0) {
            cEnd = k;
            break;
          }
        }
      }

      if (cEnd === -1) break;
      clauses[kw] = body.slice(contentStart, cEnd);
      bodyIdx = cEnd + 1;
    }

    let selected: string | null = null;
    if (!isNaN(num)) {
      if (`=${num}` in clauses) selected = clauses[`=${num}`];
      else if (num === 0 && 'zero' in clauses) selected = clauses['zero'];
      else if (num === 1 && 'one' in clauses) selected = clauses['one'];
    }

    if (selected === null && 'other' in clauses) {
      selected = clauses['other'];
    }

    if (selected !== null) {
      result += selected;
    } else {
      result += text.slice(matchIndex, endIndex + 1);
    }
  }

  return result;
}

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
      text = parsePlural(text, params);
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
