'use client';

import React, { useState, useRef } from 'react';
import { UploadedDocument, Requirement, Assignment } from '../lib/types';
import { FileItem } from './FileItem';
import { useTranslation } from '../lib/i18n';
import { UploadCloud, Search, Loader2 } from 'lucide-react';

interface DocumentsPanelProps {
  files: UploadedDocument[];
  requirements: Requirement[];
  assignments: Record<string, Assignment>;
  isProcessing: boolean;
  processingProgress?: { current: number; total: number };
  onUploadFiles: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile: (file: UploadedDocument) => void;
}

export function DocumentsPanel({
  files,
  requirements,
  assignments,
  isProcessing,
  processingProgress,
  onUploadFiles,
  onRemoveFile,
  onPreviewFile,
}: DocumentsPanelProps) {
  const { language, t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const formattedTotalSize = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';

  // Map fileId to matched requirement title
  const assignedReqByFileId = new Map<string, string>();
  for (const req of requirements) {
    const assign = assignments[req.id];
    if (assign && assign.fileId) {
      assignedReqByFileId.set(assign.fileId, language === 'bn' ? req.title_bn : req.title_en);
    }
  }

  // Filtered files
  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t('documents.title')}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {t('documents.countBadge', { count: files.length, size: formattedTotalSize })}
          </span>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-indigo-900">
                {processingProgress
                  ? t('documents.readingCount', {
                      current: processingProgress.current,
                      total: processingProgress.total,
                    })
                  : t('documents.readingPdf')}
              </p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {t('documents.dropTitle')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('documents.dropSubtitle')}
                </p>
              </div>
              <div className="mt-1">
                <span className="text-2xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {t('documents.limitsNotice')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search Input when multiple files exist */}
      {files.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('documents.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        {files.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/50 border border-slate-200/60 rounded-xl text-slate-400">
            <p className="text-xs font-medium">{t('documents.emptyTitle')}</p>
            <p className="text-2xs text-slate-400 mt-1">{t('documents.emptySubtitle')}</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            {t('dialogs.noMatchingFiles')}
          </div>
        ) : (
          filteredFiles.map(file => (
            <FileItem
              key={file.id}
              file={file}
              matchedRequirementTitle={assignedReqByFileId.get(file.id)}
              onPreview={onPreviewFile}
              onRemove={onRemoveFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
