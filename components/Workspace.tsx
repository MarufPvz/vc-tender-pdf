'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tender, Requirement, UploadedDocument, Assignment } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { AppHeader } from './AppHeader';
import { TenderHeader } from './TenderHeader';
import { RequirementsPanel } from './RequirementsPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { PackageStatusPanel } from './PackageStatusPanel';
import { DocumentSelectorModal } from './DocumentSelectorModal';
import { PdfPreviewModal } from './PdfPreviewModal';
import { GenerationModal } from './GenerationModal';
import { ToastAlert, ToastMessage } from './ToastAlert';
import { InitialScreen } from './InitialScreen';

import { processPdfFile, validateUploadLimits } from '../lib/services/pdfReaderService';
import { updateDuplicateFlags } from '../lib/services/duplicateService';
import { calculateValidationSummary, calculateRequirementStatus, validateBeforeGeneration } from '../lib/services/validationService';
import { getAutoMatchSuggestions } from '../lib/services/matchingService';
import { generateTenderPackage, GeneratePackageResult } from '../lib/services/packageGenerator';
import { downloadFile } from '../lib/services/downloadService';
import { exportChecklistCsv } from '../lib/services/exportCsvService';
import { saveProjectToStorage, loadProjectFromStorage } from '../lib/services/storageService';

export function Workspace() {
  const { language, t } = useTranslation();

  // Primary State
  const [tender, setTender] = useState<Tender | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [files, setFiles] = useState<UploadedDocument[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});

  // File Upload State
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | undefined>();

  // Modals & Selection State
  const [selectorRequirement, setSelectorRequirement] = useState<Requirement | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedDocument | null>(null);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

  // Generation Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'cover' | 'merging' | 'footers' | 'finalizing'>('cover');
  const [generationProgressPct, setGenerationProgressPct] = useState(0);
  const [generationResult, setGenerationResult] = useState<GeneratePackageResult | null>(null);

  // Auto-match State
  const [dismissedAutoMatch, setDismissedAutoMatch] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'error' | 'success' | 'warning' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Status Summary Calculation (Pure deterministic derivation)
  const validationSummary = useMemo(() => {
    if (!tender) {
      return {
        total: 0,
        okCount: 0,
        missingCount: 0,
        expiryNeededCount: 0,
        expiredCount: 0,
        notProvidedCount: 0,
        blockingCount: 0,
        canGenerate: false,
        blockingReasons: [],
      };
    }
    return calculateValidationSummary(requirements, assignments, tender.submission_deadline);
  }, [tender, requirements, assignments]);

  // Compute Auto-Match suggestions
  const autoMatchSuggestions = useMemo(() => {
    if (dismissedAutoMatch || !tender) return [];
    return getAutoMatchSuggestions(requirements, files, assignments);
  }, [requirements, files, assignments, dismissedAutoMatch, tender]);

  // Handler: Tender Loaded from JSON
  const handleTenderLoaded = (loadedTender: Tender, loadedReqs: Requirement[]) => {
    setTender(loadedTender);
    setRequirements(loadedReqs);
    setFiles([]);
    setAssignments({});
    setGenerationResult(null);
  };

  // Handler: Start Over
  const handleResetTender = () => {
    if (window.confirm(t('header.resetConfirm'))) {
      setTender(null);
      setRequirements([]);
      setFiles([]);
      setAssignments({});
      setGenerationResult(null);
    }
  };

  // Handler: File Uploads
  const handleUploadFiles = async (newRawFiles: File[]) => {
    const check = validateUploadLimits(files, newRawFiles);

    if (check.rejectedNonPdf.length > 0) {
      addToast('error', t('errors.nonPdf'));
    }

    if (check.exceededCount) {
      addToast('error', t('errors.tooManyFiles'));
      return;
    }

    if (check.exceededSize) {
      addToast('error', t('errors.sizeLimitExceeded'));
      return;
    }

    if (check.validFiles.length === 0) return;

    setIsProcessingFiles(true);
    const validFilesToProcess = check.validFiles;
    const processedDocs: UploadedDocument[] = [];

    for (let i = 0; i < validFilesToProcess.length; i++) {
      setProcessingProgress({ current: i + 1, total: validFilesToProcess.length });
      const doc = await processPdfFile(validFilesToProcess[i]);
      if (!doc.readable) {
        addToast('warning', `${doc.name}: ${doc.errorReason || t('errors.unreadablePdf')}`);
      }
      processedDocs.push(doc);
    }

    // Combine and update duplicate flags based on exact content SHA-256
    setFiles(prev => {
      const merged = [...prev, ...processedDocs];
      return updateDuplicateFlags(merged);
    });

    setDismissedAutoMatch(false);
    setIsProcessingFiles(false);
    setProcessingProgress(undefined);
  };

  // Handler: Remove File
  const handleRemoveFile = (fileId: string) => {
    // 1. Remove file from list
    setFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId);
      return updateDuplicateFlags(remaining);
    });

    // 2. Remove any assignment that used this file
    setAssignments(prev => {
      const updated = { ...prev };
      for (const [reqId, assign] of Object.entries(updated)) {
        if (assign.fileId === fileId) {
          updated[reqId] = {
            requirementId: reqId,
            fileId: null,
            expiryDate: null,
          };
        }
      }
      return updated;
    });
  };

  // Handler: Assign Document to Requirement
  const handleAssignDocument = (requirementId: string, fileId: string) => {
    setAssignments(prev => {
      const updated = { ...prev };

      // Free file if previously assigned to another requirement
      for (const [rId, assign] of Object.entries(updated)) {
        if (assign.fileId === fileId && rId !== requirementId) {
          updated[rId] = {
            ...assign,
            fileId: null,
            expiryDate: null,
          };
        }
      }

      const existingAssign = updated[requirementId];
      updated[requirementId] = {
        requirementId,
        fileId,
        expiryDate: existingAssign?.expiryDate || null,
      };

      return updated;
    });
  };

  // Handler: Remove Assignment
  const handleRemoveAssignment = (requirementId: string) => {
    setAssignments(prev => ({
      ...prev,
      [requirementId]: {
        requirementId,
        fileId: null,
        expiryDate: null,
      },
    }));
  };

  // Handler: Update Expiry Date
  const handleUpdateExpiryDate = (requirementId: string, date: string) => {
    setAssignments(prev => {
      const current = prev[requirementId] || { requirementId, fileId: null, expiryDate: null };
      return {
        ...prev,
        [requirementId]: {
          ...current,
          expiryDate: date ? date.trim() : null,
        },
      };
    });
  };

  // Handler: Apply Auto-Match Suggestions
  const handleApplyAutoMatch = () => {
    setAssignments(prev => {
      const updated = { ...prev };
      for (const item of autoMatchSuggestions) {
        updated[item.requirementId] = {
          requirementId: item.requirementId,
          fileId: item.fileId,
          expiryDate: updated[item.requirementId]?.expiryDate || null,
        };
      }
      return updated;
    });
    setDismissedAutoMatch(true);
    addToast('success', t('requirements.applyAutoMatch'));
  };

  // Handler: Generate Final Package
  const handleGeneratePackage = async () => {
    if (!tender) return;

    // Run final pre-generation validation
    const preCheck = validateBeforeGeneration(requirements, assignments, files, tender.submission_deadline);
    if (!preCheck.isValid) {
      addToast('error', preCheck.error || t('errors.generationFailed'));
      return;
    }

    setIsGenerating(true);
    setIsGenerationModalOpen(true);
    setGenerationStep('cover');
    setGenerationProgressPct(10);
    setGenerationResult(null);

    try {
      const result = await generateTenderPackage(
        tender,
        requirements,
        assignments,
        files,
        (step, pct) => {
          setGenerationStep(step);
          setGenerationProgressPct(pct);
        }
      );

      setGenerationResult(result);
      setIsGenerating(false);

      // Automatically trigger browser download
      downloadFile(result.pdfBytes, result.filename);
    } catch (err: unknown) {
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : t('errors.generationFailed');
      addToast('error', msg);
    }
  };

  // Handler: Download Package from Success Modal
  const handleDownloadGenerated = () => {
    if (generationResult) {
      downloadFile(generationResult.pdfBytes, generationResult.filename);
    }
  };

  // Handler: Export Checklist (CSV)
  const handleExportCsv = () => {
    if (!tender) return;
    exportChecklistCsv(requirements, assignments, files, tender.submission_deadline, tender.tender_id, language);
  };

  // Handler: Save Project (IndexedDB)
  const handleSaveProject = async () => {
    if (!tender) return;
    try {
      await saveProjectToStorage(tender, requirements, assignments, files);
      addToast('success', t('header.projectSaved'));
    } catch {
      addToast('error', 'Could not save project to browser storage.');
    }
  };

  // Handler: Load Project (IndexedDB)
  const handleLoadProject = async () => {
    try {
      const restored = await loadProjectFromStorage();
      if (restored) {
        setTender(restored.tender);
        setRequirements(restored.requirements);
        setAssignments(restored.assignments);
        setFiles(restored.files);
        addToast('success', t('header.projectLoaded'));
      } else {
        addToast('warning', 'No saved project found.');
      }
    } catch {
      addToast('error', 'Failed to load saved project.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* App Header */}
      <AppHeader
        tenderId={tender?.tender_id}
        isTenderLoaded={Boolean(tender)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onResetTender={handleResetTender}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!tender ? (
          <InitialScreen onTenderLoaded={handleTenderLoaded} />
        ) : (
          <div>
            {/* Tender Metadata Summary */}
            <TenderHeader tender={tender} />

            {/* Main Two-Column Document Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Requirements List (55% on desktop: 7 cols of 12) */}
              <div className="lg:col-span-7">
                <RequirementsPanel
                  requirements={requirements}
                  assignments={assignments}
                  files={files}
                  submissionDeadline={tender.submission_deadline}
                  autoMatchSuggestions={autoMatchSuggestions}
                  onApplyAutoMatch={handleApplyAutoMatch}
                  onDismissAutoMatch={() => setDismissedAutoMatch(true)}
                  onOpenSelector={(req) => setSelectorRequirement(req)}
                  onRemoveAssignment={handleRemoveAssignment}
                  onUpdateExpiryDate={handleUpdateExpiryDate}
                  onPreviewFile={(file) => setPreviewFile(file)}
                  getStatus={(req) => calculateRequirementStatus(req, assignments[req.id], tender.submission_deadline)}
                />
              </div>

              {/* Uploaded Documents Panel (45% on desktop: 5 cols of 12) */}
              <div className="lg:col-span-5">
                <DocumentsPanel
                  files={files}
                  requirements={requirements}
                  assignments={assignments}
                  isProcessing={isProcessingFiles}
                  processingProgress={processingProgress}
                  onUploadFiles={handleUploadFiles}
                  onRemoveFile={handleRemoveFile}
                  onPreviewFile={(file) => setPreviewFile(file)}
                />
              </div>
            </div>

            {/* Bottom Package Status Panel & Generate Action */}
            <PackageStatusPanel
              summary={validationSummary}
              isGenerating={isGenerating}
              onGenerate={handleGeneratePackage}
              onExportCsv={handleExportCsv}
            />
          </div>
        )}
      </main>

      {/* Document Selector Modal */}
      <DocumentSelectorModal
        isOpen={Boolean(selectorRequirement)}
        requirement={selectorRequirement}
        files={files}
        assignments={assignments}
        requirements={requirements}
        onSelect={(fileId) => {
          if (selectorRequirement) {
            handleAssignDocument(selectorRequirement.id, fileId);
          }
        }}
        onClose={() => setSelectorRequirement(null)}
      />

      {/* PDF Canvas Preview Modal */}
      <PdfPreviewModal
        key={previewFile?.id || 'none'}
        isOpen={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Generation Progress & Success Modal */}
      <GenerationModal
        isOpen={isGenerationModalOpen}
        isGenerating={isGenerating}
        currentStep={generationStep}
        progressPct={generationProgressPct}
        result={generationResult}
        onDownload={handleDownloadGenerated}
        onClose={() => setIsGenerationModalOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastAlert toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
