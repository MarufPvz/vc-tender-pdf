'use client';

import React from 'react';
import { Requirement, Assignment, UploadedDocument, DocumentStatus } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, FileText, Calendar, Eye } from 'lucide-react';

interface RequirementRowProps {
  requirement: Requirement;
  assignment?: Assignment;
  assignedFile?: UploadedDocument;
  status: DocumentStatus;
  submissionDeadline: string;
  onSelectDocument: () => void;
  onChangeDocument: () => void;
  onRemoveDocument: () => void;
  onUpdateExpiryDate: (date: string) => void;
  onPreviewFile: (file: UploadedDocument) => void;
}

export function RequirementRow({
  requirement,
  assignment,
  assignedFile,
  status,
  onSelectDocument,
  onChangeDocument,
  onRemoveDocument,
  onUpdateExpiryDate,
  onPreviewFile,
}: RequirementRowProps) {
  const { language, t } = useTranslation();

  const title = language === 'bn' ? requirement.title_bn : requirement.title_en;
  const orderNumber = requirement.order.toString().padStart(2, '0');

  // Status visual badge styling & icon
  const getStatusBadge = () => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {t('status.ok')}
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {t('status.missing')}
          </span>
        );
      case 'EXPIRY_NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {t('status.expiryNeeded')}
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {t('status.expired')}
          </span>
        );
      case 'NOT_PROVIDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
            {t('status.notProvided')}
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all p-4 ${
        status === 'MISSING' || status === 'EXPIRED'
          ? 'bg-rose-50/20 border-rose-200/80'
          : status === 'EXPIRY_NEEDED'
          ? 'bg-amber-50/20 border-amber-200/80'
          : assignedFile
          ? 'bg-white border-slate-200 shadow-2xs'
          : 'bg-slate-50/40 border-slate-200'
      }`}
    >
      {/* Top Header: Order, Title, Badges, and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center border border-slate-200">
            {orderNumber}
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900 leading-snug">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
              <span className={requirement.mandatory ? 'font-medium text-slate-700' : 'text-slate-500'}>
                {requirement.mandatory ? t('requirements.mandatory') : t('requirements.optional')}
              </span>
              <span>·</span>
              {requirement.has_expiry && (
                <>
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                    <Calendar className="w-3 h-3" />
                    {t('requirements.expiryRequired')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="self-start sm:self-center shrink-0">
          {getStatusBadge()}
        </div>
      </div>

      {/* Main Content: Matched file details or select button */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {assignedFile ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800 max-w-[200px] sm:max-w-xs truncate" title={assignedFile.name}>
                {assignedFile.name}
              </span>
              <span className="text-xs text-slate-500 border-l border-slate-200 pl-2">
                {t('requirements.pagesCount', { pages: assignedFile.pageCount })}
              </span>
              <button
                type="button"
                onClick={() => onPreviewFile(assignedFile)}
                title={t('actions.preview')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expiry Date Input (only shown when has_expiry is true AND document is matched) */}
            {requirement.has_expiry && (
              <div className="flex items-center gap-2 bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-200">
                <label
                  htmlFor={`expiry-${requirement.id}`}
                  className="text-xs font-medium text-amber-900 shrink-0"
                >
                  {t('requirements.expiryDateLabel')}:
                </label>
                <input
                  id={`expiry-${requirement.id}`}
                  type="date"
                  value={assignment?.expiryDate || ''}
                  onChange={(e) => onUpdateExpiryDate(e.target.value)}
                  className="text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('requirements.expiryPlaceholder')}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">
            {t('requirements.noDocSelected')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {assignedFile ? (
            <>
              <button
                type="button"
                onClick={onChangeDocument}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t('requirements.changeDocBtn')}
              </button>
              <button
                type="button"
                onClick={onRemoveDocument}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
              >
                {t('requirements.removeDocBtn')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSelectDocument}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {t('requirements.selectDocBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
