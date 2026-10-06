'use client';

import React from 'react';
import { UploadedDocument } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { FileText, Eye, Trash2, Copy, AlertCircle } from 'lucide-react';

interface FileItemProps {
  file: UploadedDocument;
  matchedRequirementTitle?: string;
  onPreview: (file: UploadedDocument) => void;
  onRemove: (fileId: string) => void;
}

export function FileItem({
  file,
  matchedRequirementTitle,
  onPreview,
  onRemove,
}: FileItemProps) {
  const { t } = useTranslation();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
        !file.readable
          ? 'bg-rose-50/30 border-rose-200'
          : file.duplicate
          ? 'bg-amber-50/20 border-amber-200'
          : matchedRequirementTitle
          ? 'bg-indigo-50/20 border-indigo-200/60'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div
          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
            !file.readable
              ? 'bg-rose-100 text-rose-600'
              : file.duplicate
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors'
          }`}
        >
          {!file.readable ? (
            <AlertCircle className="w-4 h-4" />
          ) : file.duplicate ? (
            <Copy className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate" title={file.name}>
            {file.name}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
            {file.readable ? (
              <>
                <span>{t('requirements.pagesCount', { pages: file.pageCount })}</span>
                <span>·</span>
                <span>{formatFileSize(file.size)}</span>
              </>
            ) : (
              <span className="text-rose-600 font-medium">
                {file.errorReason || t('documents.unreadableTag')}
              </span>
            )}
          </div>

          {/* Status Label */}
          <div className="mt-1">
            {file.duplicate ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {file.duplicateOf
                  ? t('documents.duplicateOfTag', { filename: file.duplicateOf })
                  : t('documents.duplicateTag')}
              </span>
            ) : matchedRequirementTitle ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                {t('documents.matchedTag', { req: matchedRequirementTitle })}
              </span>
            ) : file.readable ? (
              <span className="inline-flex items-center text-2xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {t('documents.readyTag')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {file.readable && (
          <button
            type="button"
            onClick={() => onPreview(file)}
            title={t('documents.previewBtn')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(file.id)}
          title={t('documents.removeFileBtn')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
