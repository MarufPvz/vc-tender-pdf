'use client';

import React from 'react';
import { ValidationSummary } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ArrowRight, Download, FileSpreadsheet } from 'lucide-react';

interface PackageStatusPanelProps {
  summary: ValidationSummary;
  isGenerating: boolean;
  onGenerate: () => void;
  onExportCsv?: () => void;
}

export function PackageStatusPanel({
  summary,
  isGenerating,
  onGenerate,
  onExportCsv,
}: PackageStatusPanelProps) {
  const { t } = useTranslation();

  return (
    <footer className="mt-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Status Counters & Message */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {t('packageStatus.title')}
            </h3>
            {summary.canGenerate ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('packageStatus.readyTitle')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('packageStatus.notReadyTitle', { count: summary.blockingCount })}
              </span>
            )}
          </div>

          {/* Counters Pill-Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {summary.okCount} {t('status.ok')}
            </span>

            {summary.expiryNeededCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/60">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {summary.expiryNeededCount} {t('status.expiryNeeded')}
              </span>
            )}

            {summary.missingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-md border border-rose-200/60">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                {summary.missingCount} {t('status.missing')}
              </span>
            )}

            {summary.expiredCount > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-md border border-rose-200/60">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                {summary.expiredCount} {t('status.expired')}
              </span>
            )}

            {summary.notProvidedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60">
                <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                {summary.notProvidedCount} {t('status.notProvided')}
              </span>
            )}
          </div>

          {!summary.canGenerate && (
            <p className="text-xs text-slate-500">
              {t('packageStatus.resolveIssuesToGenerate')}
            </p>
          )}
        </div>

        {/* Right: Primary CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t('packageStatus.exportCsvBtn')}</span>
            </button>
          )}

          <button
            type="button"
            disabled={!summary.canGenerate || isGenerating}
            onClick={onGenerate}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
              summary.canGenerate && !isGenerating
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
            }`}
          >
            {isGenerating ? (
              <>
                <Download className="w-4 h-4 animate-bounce" />
                <span>{t('packageStatus.generatingBtn')}</span>
              </>
            ) : (
              <>
                <span>{t('packageStatus.generateBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
