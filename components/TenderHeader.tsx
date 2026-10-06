'use client';

import React from 'react';
import { Tender } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { Building2, User, Calendar, ShieldCheck } from 'lucide-react';
import { formatEnglishDate } from '../lib/services/packageGenerator';

interface TenderHeaderProps {
  tender: Tender;
}

export function TenderHeader({ tender }: TenderHeaderProps) {
  const { language, t } = useTranslation();

  // Format date display for UI
  const formattedDeadline = language === 'bn'
    ? tender.submission_deadline
    : formatEnglishDate(tender.submission_deadline);

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('tender.statusTag')}
            </span>
            <span className="text-xs font-mono font-medium text-slate-500">
              {tender.tender_id}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {tender.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 lg:self-start">
          <span>{t('app.localOnlyNotice')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-md bg-slate-100 text-slate-600 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {t('tender.procuringEntity')}
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {tender.procuring_entity}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-md bg-slate-100 text-slate-600 mt-0.5">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {t('tender.bidder')}
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {tender.bidder}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-md bg-indigo-50 text-indigo-600 mt-0.5">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {t('tender.submissionDeadline')}
            </p>
            <p className="font-semibold text-indigo-950 mt-0.5">
              {formattedDeadline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
