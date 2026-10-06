'use client';

import React from 'react';
import { AutoMatchProposal, Requirement, UploadedDocument } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  ArrowRight,
  X,
  FileScan,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';
import { detectProposalConflicts } from '../lib/services/matchingService';

interface AutoMatchReviewModalProps {
  isOpen: boolean;
  proposals: AutoMatchProposal[];
  requirements: Requirement[];
  files: UploadedDocument[];
  onToggleProposal: (proposalId: string) => void;
  onSelectAmbiguousOption: (proposalId: string, fileId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onApply: () => void;
  onPreview: (file: UploadedDocument) => void;
  onClose: () => void;
}

export function AutoMatchReviewModal({
  isOpen,
  proposals,
  requirements,
  files,
  onToggleProposal,
  onSelectAmbiguousOption,
  onSelectAll,
  onClearAll,
  onApply,
  onPreview,
  onClose,
}: AutoMatchReviewModalProps) {
  const { language, t } = useTranslation();

  if (!isOpen) return null;

  const fileMap = new Map(files.map(f => [f.id, f]));
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  // Detect conflicts where same file is selected multiple times
  const conflicts = detectProposalConflicts(proposals);

  // Counts
  const totalCount = proposals.length;
  const strongCount = proposals.filter(p => p.confidence === 'high').length;
  const possibleCount = proposals.filter(p => p.confidence === 'medium').length;
  const ambiguousCount = proposals.filter(p => p.confidence === 'ambiguous').length;
  const selectedCount = proposals.filter(p => p.selected && p.fileId).length;

  const hasConflicts = conflicts.size > 0;
  const canApply = selectedCount > 0 && !hasConflicts;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {t('autoMatch.reviewTitle')}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {t('autoMatch.reviewSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Badges & Batch Action Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Summary Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">
              {t('autoMatch.suggestionsFound', { count: totalCount })}
            </span>
            <span className="text-slate-300">·</span>
            {strongCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {t('autoMatch.strongMatchesCount', { count: strongCount })}
              </span>
            )}
            {possibleCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                • {t('autoMatch.possibleMatchesCount', { count: possibleCount })}
              </span>
            )}
            {ambiguousCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {t('autoMatch.ambiguousCount', { count: ambiguousCount })}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {t('autoMatch.selectedCount', { count: selectedCount })}
            </span>
          </div>

          {/* Select All / Clear All buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              {t('autoMatch.selectAll')}
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 transition-colors"
            >
              {t('autoMatch.clearAll')}
            </button>
          </div>
        </div>

        {/* Proposals List Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/30">
          {proposals.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                {t('autoMatch.noProposalsTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t('autoMatch.noProposalsSubtitle')}
              </p>
            </div>
          ) : (
            proposals.map((proposal) => {
              const req = reqMap.get(proposal.requirementId);
              const reqTitle = req ? (language === 'bn' ? req.title_bn : req.title_en) : '';
              const file = proposal.fileId ? fileMap.get(proposal.fileId) : undefined;
              const isConflicting = Boolean(proposal.fileId && conflicts.has(proposal.fileId) && proposal.selected);
              const isAmbiguous = proposal.confidence === 'ambiguous';

              return (
                <div
                  key={proposal.id}
                  className={`rounded-xl border transition-all p-4 ${
                    isConflicting
                      ? 'bg-rose-50/50 border-rose-300 shadow-2xs'
                      : isAmbiguous
                      ? 'bg-amber-50/30 border-amber-200/80 shadow-2xs'
                      : proposal.selected
                      ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-200/50'
                      : 'bg-white/80 border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Bar: Direction and Selection */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Direction (PDF -> Requirement) */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox (only for non-ambiguous or when an ambiguous option is selected) */}
                      {!isAmbiguous ? (
                        <button
                          type="button"
                          onClick={() => onToggleProposal(proposal.id)}
                          className="mt-0.5 text-indigo-600 focus:outline-none"
                        >
                          {proposal.selected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                          )}
                        </button>
                      ) : (
                        <div className="mt-0.5 p-0.5 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Requirement Title and Direction */}
                        <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900">
                          {file ? (
                            <>
                              <span className="font-mono text-indigo-900 truncate max-w-[220px]" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                {t('autoMatch.willBeMatchedTo')}
                              </span>
                              <span className="text-slate-800 underline decoration-indigo-200 underline-offset-2">
                                {reqTitle}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-amber-950 font-semibold">
                                {reqTitle}
                              </span>
                            </>
                          )}
                        </div>

                        {/* File metadata & Confidence Tag */}
                        {file && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                            <span>{t('requirements.pagesCount', { pages: file.pageCount })}</span>
                            <span>·</span>
                            <span>{formatFileSize(file.size)}</span>
                            {file.isScanned ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                <FileScan className="w-3 h-3" />
                                {t('documents.scannedTag')}
                              </span>
                            ) : (
                              <span className="text-2xs font-medium text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                {t('documents.textPdfTag')}
                              </span>
                            )}
                            {file.detectedYears.length > 0 && (
                              <span className="font-mono text-2xs font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                {file.detectedYears.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Confidence Badge & Preview */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isAmbiguous ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          {t('autoMatch.ambiguous')}
                        </span>
                      ) : proposal.confidence === 'high' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {t('autoMatch.strongMatch')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          • {t('autoMatch.possibleMatch')}
                        </span>
                      )}

                      {file && (
                        <button
                          type="button"
                          onClick={() => onPreview(file)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('autoMatch.previewPdf')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ambiguous Candidates Selection (Radio Group) */}
                  {isAmbiguous && proposal.ambiguousOptions && (
                    <div className="mt-3 pt-3 border-t border-amber-200/70 space-y-2">
                      <p className="text-xs font-semibold text-amber-950">
                        {t('autoMatch.ambiguousPrompt')}
                      </p>
                      <div className="space-y-1.5">
                        {proposal.ambiguousOptions.map((opt) => {
                          const optFile = fileMap.get(opt.fileId);
                          if (!optFile) return null;
                          const isOptSelected = proposal.fileId === opt.fileId && proposal.selected;

                          return (
                            <div
                              key={opt.fileId}
                              onClick={() => onSelectAmbiguousOption(proposal.id, opt.fileId)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isOptSelected
                                  ? 'bg-indigo-50 border-indigo-400 font-semibold shadow-2xs'
                                  : 'bg-white border-amber-200 hover:bg-amber-50/40'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isOptSelected
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-slate-400 bg-white'
                                  }`}
                                >
                                  {isOptSelected && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <span className="text-xs font-mono text-slate-900 truncate max-w-xs" title={optFile.name}>
                                  {optFile.name}
                                </span>
                                <span className="text-2xs text-slate-500">
                                  ({t('requirements.pagesCount', { pages: optFile.pageCount })})
                                </span>
                                {optFile.detectedYears.length > 0 && (
                                  <span className="font-mono text-3xs font-semibold bg-slate-100 px-1 py-0.2 rounded">
                                    {optFile.detectedYears.join(', ')}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreview(optFile);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title={t('autoMatch.previewPdf')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reasons / Evidence Bullets */}
                  {proposal.reasons.length > 0 && !isAmbiguous && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-2xs text-slate-600">
                      {proposal.reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Conflict Notice */}
                  {isConflicting && (
                    <div className="mt-2 text-2xs font-semibold text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {t('autoMatch.conflictWarning')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {hasConflicts && (
              <span className="text-rose-600 font-semibold">
                {t('autoMatch.conflictWarning')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t('autoMatch.cancel')}
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={onApply}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                canApply
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {selectedCount > 0
                  ? t('autoMatch.applySelected', { count: selectedCount })
                  : t('autoMatch.noSelection')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
