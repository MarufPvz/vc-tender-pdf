'use client';

import React from 'react';
import { Requirement, Assignment, UploadedDocument, DocumentStatus, CandidateMatch } from '../lib/types';
import { RequirementRow } from './RequirementRow';
import { useTranslation } from '../lib/i18n';
import { Sparkles } from 'lucide-react';

interface RequirementsPanelProps {
  requirements: Requirement[];
  assignments: Record<string, Assignment>;
  files: UploadedDocument[];
  candidateMatches: Record<string, CandidateMatch[]>;
  submissionDeadline: string;
  onOpenAutoMatchReview: () => void;
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
  onOpenAutoMatchReview,
  onOpenSelector,
  onRemoveAssignment,
  onUpdateExpiryDate,
  onPreviewFile,
  onAcceptCandidate,
  getStatus,
}: RequirementsPanelProps) {
  const { t } = useTranslation();
  const fileMap = new Map(files.map(f => [f.id, f]));

  // Check how many unassigned requirements exist
  const unassignedCount = requirements.filter(r => !assignments[r.id]?.fileId).length;
  const hasAvailableFiles = files.some(f => f.readable && !f.duplicate);

  return (
    <div className="space-y-4">
      {/* Panel Header with Prominent Auto-Match CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t('requirements.title')}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {t('requirements.countBadge', { count: requirements.length })}
          </span>
        </div>

        {/* Prominent Auto-Match Action Button */}
        {unassignedCount > 0 && hasAvailableFiles && (
          <button
            type="button"
            onClick={onOpenAutoMatchReview}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{t('autoMatch.buttonLabel')}</span>
          </button>
        )}
      </div>

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
