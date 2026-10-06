'use client';

import React from 'react';
import { Requirement, Assignment, UploadedDocument, DocumentStatus, CandidateMatch } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  FileText,
  Calendar,
  Eye,
  FileScan,
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface RequirementRowProps {
  requirement: Requirement;
  assignment?: Assignment;
  assignedFile?: UploadedDocument;
  candidates?: CandidateMatch[];
  allFiles: UploadedDocument[];
  status: DocumentStatus;
  submissionDeadline: string;
  onSelectDocument: () => void;
  onChangeDocument: () => void;
  onRemoveDocument: () => void;
  onUpdateExpiryDate: (date: string) => void;
  onPreviewFile: (file: UploadedDocument) => void;
  onAcceptCandidate: (fileId: string) => void;
}

export function RequirementRow({
  requirement,
  assignment,
  assignedFile,
  candidates = [],
  allFiles,
  status,
  onSelectDocument,
  onChangeDocument,
  onRemoveDocument,
  onUpdateExpiryDate,
  onPreviewFile,
  onAcceptCandidate,
}: RequirementRowProps) {
  const { language, t } = useTranslation();

  const title = language === 'bn' ? requirement.title_bn : requirement.title_en;
  const orderNumber = requirement.order.toString().padStart(2, '0');
  const fileMap = new Map(allFiles.map(f => [f.id, f]));

  // Status visual badge styling & icon
  const getStatusBadge = () => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {t('status.ok')}
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-4 h-4 text-rose-600" />
            {t('status.missing')}
          </span>
        );
      case 'EXPIRY_NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('status.expiryNeeded')}
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-4 h-4 text-rose-600" />
            {t('status.expired')}
          </span>
        );
      case 'NOT_PROVIDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <MinusCircle className="w-4 h-4 text-slate-500" />
            {t('status.notProvided')}
          </span>
        );
    }
  };

  const topCandidate = candidates[0];
  const topCandidateFile = topCandidate ? fileMap.get(topCandidate.fileId) : undefined;
  const isAmbiguous = topCandidate?.level === 'AMBIGUOUS';
  const isStrongMatch = topCandidate?.level === 'HIGH';

  return (
    <div
      className={`rounded-xl border transition-all p-4 sm:p-5 ${
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs sm:text-sm font-extrabold flex items-center justify-center border border-slate-300">
            {orderNumber}
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-slate-600">
              <span className={requirement.mandatory ? 'font-semibold text-slate-800' : 'text-slate-600'}>
                {requirement.mandatory ? t('requirements.mandatory') : t('requirements.optional')}
              </span>
              <span>·</span>
              {requirement.has_expiry && (
                <>
                  <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
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

      {/* Main Content: Matched file details OR Candidate Match Suggestion OR Select Button */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-col gap-3">
        {assignedFile ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                {assignedFile.isScanned ? (
                  <FileScan className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span className="text-sm sm:text-base font-semibold text-slate-900 max-w-[220px] sm:max-w-xs truncate" title={assignedFile.name}>
                  {assignedFile.name}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-600 border-l border-slate-300 pl-2.5">
                  {t('requirements.pagesCount', { pages: assignedFile.pageCount })}
                </span>
                {assignedFile.detectedYears.length > 0 && (
                  <span className="text-xs font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                    {assignedFile.detectedYears.join(', ')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPreviewFile(assignedFile)}
                  title={t('actions.preview')}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors ml-1"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Expiry Date Input */}
              {requirement.has_expiry && (
                <div className="flex items-center gap-2 bg-amber-50/70 px-3 py-1.5 rounded-xl border border-amber-300">
                  <label
                    htmlFor={`expiry-${requirement.id}`}
                    className="text-xs sm:text-sm font-bold text-amber-950 shrink-0"
                  >
                    {t('requirements.expiryDateLabel')}:
                  </label>
                  <input
                    id={`expiry-${requirement.id}`}
                    type="date"
                    value={assignment?.expiryDate || ''}
                    onChange={(e) => onUpdateExpiryDate(e.target.value)}
                    className="text-xs sm:text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('requirements.expiryPlaceholder')}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={onChangeDocument}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                {t('requirements.changeDocBtn')}
              </button>
              <button
                type="button"
                onClick={onRemoveDocument}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors"
              >
                {t('requirements.removeDocBtn')}
              </button>
            </div>
          </div>
        ) : (
          /* Unassigned State: Check for Candidate Matches & Ambiguity */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {isAmbiguous ? (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">
                  {t('requirements.ambiguousMatch', { count: candidates.length })}
                </span>
                <span className="text-amber-900 font-medium">
                  ({candidates.slice(0, 2).map(c => fileMap.get(c.fileId)?.name).join(' · ')})
                </span>
              </div>
            ) : isStrongMatch && topCandidateFile ? (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-indigo-950">
                  {t('requirements.strongMatch', { percent: topCandidate.score })}:
                </span>
                <span className="font-mono text-slate-900 font-semibold truncate max-w-[200px]" title={topCandidateFile.name}>
                  {topCandidateFile.name}
                </span>
                {topCandidate.detectedYear && (
                  <span className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-mono text-xs font-bold">
                    {topCandidate.detectedYear}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-slate-500 italic">
                {t('requirements.noDocSelected')}
              </div>
            )}

            {/* Selection Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isAmbiguous ? (
                <button
                  type="button"
                  onClick={onSelectDocument}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors shadow-2xs"
                >
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  {t('requirements.chooseDocument')}
                </button>
              ) : isStrongMatch && topCandidateFile ? (
                <>
                  <button
                    type="button"
                    onClick={() => onAcceptCandidate(topCandidate.fileId)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {t('requirements.useDocument')}
                  </button>
                  <button
                    type="button"
                    onClick={onSelectDocument}
                    className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {t('requirements.changeDocBtn')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onSelectDocument}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {t('requirements.selectDocBtn')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
