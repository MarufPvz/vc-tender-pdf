'use client';

import React from 'react';
import { useTranslation } from '../lib/i18n';
import { AlertCircle, X, ArrowRight } from 'lucide-react';

interface ConfirmReplaceModalProps {
  isOpen: boolean;
  requirementTitle: string;
  currentFileName: string;
  newFileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmReplaceModal({
  isOpen,
  requirementTitle,
  currentFileName,
  newFileName,
  onConfirm,
  onCancel,
}: ConfirmReplaceModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('dialogs.confirmReplaceTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('dialogs.confirmReplaceMessage', {
              requirement: requirementTitle,
              currentFile: currentFileName,
              newFile: newFileName,
            })}
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span>Current:</span>
              <span className="font-mono font-medium text-slate-800 truncate max-w-[200px]" title={currentFileName}>
                {currentFileName}
              </span>
            </div>
            <div className="flex items-center justify-between text-indigo-700 font-semibold">
              <span className="flex items-center gap-1">
                New <ArrowRight className="w-3 h-3" />
              </span>
              <span className="font-mono truncate max-w-[200px]" title={newFileName}>
                {newFileName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {t('dialogs.keepCurrentBtn')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            {t('dialogs.replaceBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
