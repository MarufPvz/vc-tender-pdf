'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UploadedDocument } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { renderPdfPage } from '../lib/services/pdfPreviewService';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  file: UploadedDocument | null;
  onClose: () => void;
}

export function PdfPreviewModal({ isOpen, file, onClose }: PdfPreviewModalProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(file?.pageCount || 1);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages, p + 1));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, totalPages]);

  // Render page when file, currentPage, or scale changes
  useEffect(() => {
    if (!isOpen || !file || !canvasRef.current) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const render = async () => {
      try {
        let buffer = file.arrayBuffer;
        if (!buffer) {
          buffer = await file.file.arrayBuffer();
        }

        if (isCancelled || !canvasRef.current) return;

        const result = await renderPdfPage(buffer, currentPage, canvasRef.current, scale);
        if (!isCancelled) {
          setTotalPages(result.totalPages);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Render failed';
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, file, currentPage, scale]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-slate-500">
                {t('preview.pageOf', { current: currentPage, total: totalPages })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                title={t('preview.zoomOut')}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-600">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                title={t('preview.zoomIn')}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto bg-slate-100/70 p-4 sm:p-6 flex items-center justify-center relative min-h-[350px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-600">{t('preview.rendering')}</p>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center gap-2 text-center p-6 bg-white rounded-xl border border-rose-200 max-w-md shadow-xs">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-sm font-semibold text-slate-800">{t('preview.failedToRender')}</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : (
            <div className="shadow-lg border border-slate-300/80 bg-white rounded overflow-hidden">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
          )}
        </div>

        {/* Bottom Paging Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t('preview.prevPage')}</span>
          </button>

          <span className="text-xs font-medium text-slate-600">
            {t('preview.pageOf', { current: currentPage, total: totalPages })}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>{t('preview.nextPage')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
