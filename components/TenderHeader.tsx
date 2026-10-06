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
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {t('tender.statusTag')}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {tender.tender_id}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug mt-1">
            {tender.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 lg:self-start">
          <span>{t('app.localOnlyNotice')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5 text-sm sm:text-base">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('tender.procuringEntity')}
            </p>
            <p className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
              {tender.procuring_entity}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('tender.bidder')}
            </p>
            <p className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
              {tender.bidder}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 mt-0.5 border border-indigo-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              {t('tender.submissionDeadline')}
            </p>
            <p className="font-extrabold text-indigo-950 text-sm sm:text-base mt-0.5">
              {formattedDeadline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
