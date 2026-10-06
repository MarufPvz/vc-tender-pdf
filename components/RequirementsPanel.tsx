'use client';

import React from 'react';
import { Requirement, Assignment, UploadedDocument, DocumentStatus, CandidateMatch } from '../lib/types';
import { RequirementRow } from './RequirementRow';
import { useTranslation } from '../lib/i18n';
import { Sparkles, CheckCheck, X } from 'lucide-react';

interface RequirementsPanelProps {
  requirements: Requirement[];
  assignments: Record<string, Assignment>;
  files: UploadedDocument[];
  candidateMatches: Record<string, CandidateMatch[]>;
  submissionDeadline: string;
  hasUnconfirmedHighMatches: boolean;
  onApplyAllStrongMatches: () => void;
  onDismissAutoMatch: () => void;
  onOpenSelector: (req: Requirement) => void;
  onRemoveAssignment: (reqId: string) => void;
  onUpdateExpiryDate: (reqId: string, date: string) => void;
  onPreviewFile: (file: UploadedDocument) => void;
  onAcceptCandidate: (reqId: string, fileId: string) => void;
  getStatus: (req: Requirement) => DocumentStatus;
}

export function RequirementsPanel({
  requirements,
  assignments,
  files,
  candidateMatches,
  submissionDeadline,
  hasUnconfirmedHighMatches,
  onApplyAllStrongMatches,
  onDismissAutoMatch,
  onOpenSelector,
  onRemoveAssignment,
  onUpdateExpiryDate,
  onPreviewFile,
  onAcceptCandidate,
  getStatus,
}: RequirementsPanelProps) {
  const { t } = useTranslation();
  const fileMap = new Map<string, UploadedDocument>(files.map(f => [f.id, f]));

  // Count strong unassigned matches
  const strongMatchCount = Object.values(candidateMatches).filter(
    list => list.length > 0 && list[0].level === 'HIGH'
  ).length;

  return (
    <div className="space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t('requirements.title')}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {t('requirements.countBadge', { count: requirements.length })}
          </span>
        </div>
      </div>

      {/* Auto-match banner for unambiguous high confidence suggestions */}
      {hasUnconfirmedHighMatches && strongMatchCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {t('requirements.autoMatchNotice', { count: strongMatchCount })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onApplyAllStrongMatches}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t('requirements.applyAutoMatch')}
            </button>
            <button
              type="button"
              onClick={onDismissAutoMatch}
              className="p-1 rounded-md text-indigo-500 hover:bg-indigo-100 transition-colors"
              title={t('requirements.dismissAutoMatch')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-3">
        {requirements.map(req => {
          const assign = assignments[req.id];
          const assignedFile = assign?.fileId ? fileMap.get(assign.fileId) : undefined;
          const status = getStatus(req);
          const candidates = candidateMatches[req.id] || [];

          return (
            <RequirementRow
              key={req.id}
              requirement={req}
              assignment={assign}
              assignedFile={assignedFile}
              candidates={candidates}
              allFiles={files}
              status={status}
              submissionDeadline={submissionDeadline}
              onSelectDocument={() => onOpenSelector(req)}
              onChangeDocument={() => onOpenSelector(req)}
              onRemoveDocument={() => onRemoveAssignment(req.id)}
              onUpdateExpiryDate={(date) => onUpdateExpiryDate(req.id, date)}
              onPreviewFile={onPreviewFile}
              onAcceptCandidate={(fileId) => onAcceptCandidate(req.id, fileId)}
            />
          );
        })}
      </div>
    </div>
  );
}
