'use client';

import React from 'react';
import { UploadedDocument } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { FileText, Eye, Trash2, Copy, AlertCircle, FileScan } from 'lucide-react';

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
              : file.isScanned
              ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors'
          }`}
        >
          {!file.readable ? (
            <AlertCircle className="w-4 h-4" />
          ) : file.duplicate ? (
            <Copy className="w-4 h-4" />
          ) : file.isScanned ? (
            <FileScan className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm sm:text-base font-bold text-slate-900 truncate" title={file.name}>
            {file.name}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-slate-600">
            {file.readable ? (
              <>
                <span className="font-medium">{t('requirements.pagesCount', { pages: file.pageCount })}</span>
                <span>·</span>
                <span className="font-medium">{formatFileSize(file.size)}</span>
                {file.detectedYears.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      {file.detectedYears.join(', ')}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-rose-700 font-semibold">
                {file.errorReason || t('documents.unreadableTag')}
              </span>
            )}
          </div>

          {/* Status & Analysis Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {file.duplicate ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {file.duplicateOf
                  ? t('documents.duplicateOfTag', { filename: file.duplicateOf })
                  : t('documents.duplicateTag')}
              </span>
            ) : matchedRequirementTitle ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {t('documents.matchedTag', { req: matchedRequirementTitle })}
              </span>
            ) : file.readable ? (
              <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {t('documents.readyTag')}
              </span>
            ) : null}

            {file.readable && (
              file.isScanned ? (
                <span
                  title={t('documents.scannedNotice')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md"
                >
                  <FileScan className="w-3.5 h-3.5 text-amber-600" />
                  {t('documents.scannedTag')}
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  {t('documents.textPdfTag')}
                </span>
              )
            )}
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
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Eye className="w-4.5 h-4.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(file.id)}
          title={t('documents.removeFileBtn')}
          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
