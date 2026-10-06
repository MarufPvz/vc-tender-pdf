'use client';

import React, { useState } from 'react';
import { Requirement, UploadedDocument, Assignment } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { Search, X, FileText, Check, AlertCircle, Copy } from 'lucide-react';
import { isContentHashAlreadyAssigned } from '../lib/services/duplicateService';

interface DocumentSelectorModalProps {
  isOpen: boolean;
  requirement: Requirement | null;
  files: UploadedDocument[];
  assignments: Record<string, Assignment>;
  requirements: Requirement[];
  onSelect: (fileId: string) => void;
  onClose: () => void;
}

export function DocumentSelectorModal({
  isOpen,
  requirement,
  files,
  assignments,
  requirements,
  onSelect,
  onClose,
}: DocumentSelectorModalProps) {
  const { language, t } = useTranslation();
  const [search, setSearch] = useState('');

  if (!isOpen || !requirement) return null;

  const currentReqTitle = language === 'bn' ? requirement.title_bn : requirement.title_en;

  // Build map of fileId -> requirement title
  const assignedReqTitleByFileId = new Map<string, string>();
  for (const req of requirements) {
    const a = assignments[req.id];
    if (a && a.fileId) {
      assignedReqTitleByFileId.set(a.fileId, language === 'bn' ? req.title_bn : req.title_en);
    }
  }

  // Filter files by search
  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t('dialogs.selectDocumentTitle', { requirement: currentReqTitle })}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {requirement.mandatory ? t('requirements.mandatory') : t('requirements.optional')}
              {requirement.has_expiry && ` · ${t('requirements.expiryRequired')}`}
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

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dialogs.searchFiles')}
              autoFocus
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {t('dialogs.noMatchingFiles')}
            </div>
          ) : (
            filtered.map((file) => {
              // 1. Is it currently selected for this requirement?
              const isCurrentlySelected = assignments[requirement.id]?.fileId === file.id;

              // 2. Is it in use by another requirement?
              const inUseByTitle = assignedReqTitleByFileId.get(file.id);
              const isAssignedToOther = inUseByTitle && !isCurrentlySelected;

              // 3. Does it violate the duplicate content rule?
              const duplicateConflict = isContentHashAlreadyAssigned(
                file,
                requirement.id,
                assignments,
                files
              );

              // 4. Is the file unreadable?
              const isUnreadable = !file.readable;

              const isDisabled = isUnreadable || isAssignedToOther || duplicateConflict.isConflict;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelect(file.id);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isDisabled
                      ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                      : isCurrentlySelected
                      ? 'bg-indigo-50/60 border-indigo-300 cursor-pointer shadow-xs'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isUnreadable
                          ? 'bg-rose-100 text-rose-600'
                          : isCurrentlySelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isUnreadable ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('requirements.pagesCount', { pages: file.pageCount })}
                      </p>

                      {/* Explanation for why disabled */}
                      {isAssignedToOther && (
                        <p className="text-2xs text-amber-700 font-medium mt-1">
                          {t('dialogs.fileInUse', { requirement: inUseByTitle })}
                        </p>
                      )}
                      {duplicateConflict.isConflict && (
                        <p className="text-2xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <Copy className="w-3 h-3" />
                          {t('dialogs.fileDuplicateUsed', {
                            requirement:
                              duplicateConflict.conflictingRequirementId &&
                              requirements.find(r => r.id === duplicateConflict.conflictingRequirementId)
                                ? (language === 'bn'
                                    ? requirements.find(r => r.id === duplicateConflict.conflictingRequirementId)!.title_bn
                                    : requirements.find(r => r.id === duplicateConflict.conflictingRequirementId)!.title_en)
                                : '',
                          })}
                        </p>
                      )}
                      {isUnreadable && (
                        <p className="text-2xs text-rose-600 font-medium mt-1">
                          {t('dialogs.fileUnreadable')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side check or action */}
                  <div className="shrink-0">
                    {isCurrentlySelected ? (
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : !isDisabled ? (
                      <span className="text-xs font-semibold text-indigo-600">
                        {t('dialogs.select')}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            {t('dialogs.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
