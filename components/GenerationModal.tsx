'use client';

import React from 'react';
import { useTranslation } from '../lib/i18n';
import { CheckCircle2, Download, FileText, Loader2, X } from 'lucide-react';
import { GeneratePackageResult } from '../lib/services/packageGenerator';

interface GenerationModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  currentStep: 'cover' | 'merging' | 'footers' | 'finalizing';
  progressPct: number;
  result: GeneratePackageResult | null;
  onDownload: () => void;
  onClose: () => void;
}

export function GenerationModal({
  isOpen,
  isGenerating,
  currentStep,
  progressPct,
  result,
  onDownload,
  onClose,
}: GenerationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const steps = [
    { key: 'cover', label: t('generationModal.stepCover') },
    { key: 'merging', label: t('generationModal.stepMerge') },
    { key: 'footers', label: t('generationModal.stepFooters') },
    { key: 'finalizing', label: t('generationModal.stepFinalize') },
  ];

  const getStepStatus = (key: string) => {
    const order = ['cover', 'merging', 'footers', 'finalizing'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(key);

    if (result) return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {result ? t('generationModal.successTitle') : t('generationModal.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {result ? t('generationModal.successSubtitle') : t('generationModal.subtitle')}
              </p>
            </div>
          </div>
          {!isGenerating && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* In Progress View */}
        {isGenerating && (
          <div className="py-6 space-y-5">
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Steps list */}
            <div className="space-y-3">
              {steps.map(step => {
                const status = getStepStatus(step.key);
                return (
                  <div key={step.key} className="flex items-center gap-3 text-xs">
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : status === 'current' ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span
                      className={
                        status === 'current'
                          ? 'font-semibold text-slate-900'
                          : status === 'completed'
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Success View */}
        {result && (
          <div className="py-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('generationModal.filenameLabel')}:</span>
                <span className="font-mono font-semibold text-slate-900 truncate max-w-[200px]" title={result.filename}>
                  {result.filename}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('generationModal.totalPagesLabel')}:</span>
                <span className="font-semibold text-slate-800">
                  {t('requirements.pagesCount', { pages: result.totalPages })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('generationModal.fileSizeLabel')}:</span>
                <span className="font-semibold text-slate-800">{formatFileSize(result.fileSizeBytes)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onDownload}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('generationModal.downloadBtn')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                {t('generationModal.closeBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
