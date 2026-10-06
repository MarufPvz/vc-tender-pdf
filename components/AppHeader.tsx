'use client';

import React from 'react';
import { useTranslation } from '../lib/i18n';
import { FileText, Save, FolderOpen, RotateCcw } from 'lucide-react';

interface AppHeaderProps {
  tenderId?: string;
  onSaveProject?: () => void;
  onLoadProject?: () => void;
  onResetTender?: () => void;
  isTenderLoaded: boolean;
}

export function AppHeader({
  tenderId,
  onSaveProject,
  onLoadProject,
  onResetTender,
  isTenderLoaded,
}: AppHeaderProps) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {t('app.name')}
              </h1>
              {tenderId && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {tenderId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        {/* Actions & Language Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isTenderLoaded && (
            <>
              {onSaveProject && (
                <button
                  type="button"
                  onClick={onSaveProject}
                  title={t('header.saveProject')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('header.saveProject')}</span>
                </button>
              )}

              {onLoadProject && (
                <button
                  type="button"
                  onClick={onLoadProject}
                  title={t('header.loadProject')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('header.loadProject')}</span>
                </button>
              )}

              {onResetTender && (
                <button
                  type="button"
                  onClick={onResetTender}
                  title={t('header.resetTender')}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('header.resetTender')}</span>
                </button>
              )}
            </>
          )}

          {/* Bilingual Segmented Control */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                language === 'bn'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
