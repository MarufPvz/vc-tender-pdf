'use client';

import React, { useRef, useState } from 'react';
import { useTranslation } from '../lib/i18n';
import { FileCode, UploadCloud, AlertCircle, Sparkles } from 'lucide-react';
import { parseAndValidateRequirements, SAMPLE_REQUIREMENTS_JSON } from '../lib/services/requirementsService';
import { Tender, Requirement } from '../lib/types';

interface InitialScreenProps {
  onTenderLoaded: (tender: Tender, requirements: Requirement[]) => void;
}

export function InitialScreen({ onTenderLoaded }: InitialScreenProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        const result = parseAndValidateRequirements(content);
        if (result.success && result.tender && result.requirements) {
          onTenderLoaded(result.tender, result.requirements);
        } else {
          setErrorMessage(result.error || t('initial.invalidJsonDesc'));
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage('Could not read the selected file.');
    };
    reader.readAsText(file);
  };

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleLoadSample = () => {
    const result = parseAndValidateRequirements(SAMPLE_REQUIREMENTS_JSON);
    if (result.success && result.tender && result.requirements) {
      onTenderLoaded(result.tender, result.requirements);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        {/* Title & Description */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
            <FileCode className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('initial.title')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto">
            {t('initial.subtitle')}
          </p>
        </div>

        {/* Error Alert if JSON failed */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-rose-900">{t('initial.invalidJsonTitle')}</p>
              <p className="text-rose-700 mt-0.5 font-medium">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="mt-2 text-rose-800 font-bold underline hover:no-underline"
              >
                {t('initial.chooseAnother')}
              </button>
            </div>
          </div>
        )}

        {/* Dropzone & File Picker */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-10 transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <button
                type="button"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-sm transition-colors"
              >
                {t('initial.selectButton')}
              </button>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2.5">
                {t('initial.dropJsonHint')}
              </p>
            </div>
          </div>
        </div>

        {/* Sample Tender Option */}
        <div className="pt-2">
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-2">{t('initial.orSample')}</p>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{t('initial.loadSampleButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
