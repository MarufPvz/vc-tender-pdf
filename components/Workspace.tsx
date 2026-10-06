'use client';

import React, { useState, useMemo } from 'react';
import { Tender, Requirement, UploadedDocument, Assignment, AutoMatchProposal } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { AppHeader } from './AppHeader';
import { TenderHeader } from './TenderHeader';
import { RequirementsPanel } from './RequirementsPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { PackageStatusPanel } from './PackageStatusPanel';
import { DocumentSelectorModal } from './DocumentSelectorModal';
import { PdfPreviewModal } from './PdfPreviewModal';
import { GenerationModal } from './GenerationModal';
import { ConfirmReplaceModal } from './ConfirmReplaceModal';
import { AutoMatchReviewModal } from './AutoMatchReviewModal';
import { ToastAlert, ToastMessage } from './ToastAlert';
import { InitialScreen } from './InitialScreen';

import { processPdfFile, validateUploadLimits } from '../lib/services/pdfReaderService';
import { updateDuplicateFlags } from '../lib/services/duplicateService';
import { calculateValidationSummary, calculateRequirementStatus, validateBeforeGeneration } from '../lib/services/validationService';
import { analyzeAllCandidates, generateAutoMatchProposals } from '../lib/services/matchingService';
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
  const [isAutoMatchReviewOpen, setIsAutoMatchReviewOpen] = useState(false);
  const [autoMatchProposals, setAutoMatchProposals] = useState<AutoMatchProposal[]>([]);

  // Replacement Confirmation State
  const [replaceTarget, setReplaceTarget] = useState<{
    requirement: Requirement;
    currentFile: UploadedDocument;
    newFileId: string;
  } | null>(null);

  // Generation Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'cover' | 'merging' | 'footers' | 'finalizing'>('cover');
  const [generationProgressPct, setGenerationProgressPct] = useState(0);
  const [generationResult, setGenerationResult] = useState<GeneratePackageResult | null>(null);

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

  // Candidate Match Analysis across requirements & unassigned documents
  const candidateMatches = useMemo(() => {
    if (!tender || files.length === 0) return {};
    return analyzeAllCandidates(requirements, files, assignments);
  }, [tender, requirements, files, assignments]);

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

  // Core Assign logic
  const executeAssignment = (requirementId: string, fileId: string) => {
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

  // Handler: Assign Document with replacement check
  const handleRequestAssignment = (requirement: Requirement, fileId: string) => {
    const existingAssign = assignments[requirement.id];
    const currentFileId = existingAssign?.fileId;

    if (currentFileId && currentFileId !== fileId) {
      const currentDoc = files.find(f => f.id === currentFileId);
      if (currentDoc) {
        setReplaceTarget({
          requirement,
          currentFile: currentDoc,
          newFileId: fileId,
        });
        return;
      }
    }

    executeAssignment(requirement.id, fileId);
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

  // TWO-STEP AUTO-MATCH WORKFLOW
  // 1. Open Review Panel with generated proposals
  const handleOpenAutoMatchReview = () => {
    const proposals = generateAutoMatchProposals(requirements, files, assignments);
    setAutoMatchProposals(proposals);
    setIsAutoMatchReviewOpen(true);
  };

  // 2. Toggle individual proposal selection
  const handleToggleProposal = (proposalId: string) => {
    setAutoMatchProposals(prev =>
      prev.map(p => {
        if (p.id !== proposalId) return p;
        // If ambiguous and no file has been chosen yet, do not allow checking
        if (p.confidence === 'ambiguous' && !p.fileId) return p;
        return { ...p, selected: !p.selected };
      })
    );
  };

  // 3. User chooses which candidate to use in an ambiguous match
  const handleSelectAmbiguousOption = (proposalId: string, fileId: string) => {
    setAutoMatchProposals(prev =>
      prev.map(p => {
        if (p.id !== proposalId) return p;
        return {
          ...p,
          fileId,
          selected: true, // Automatically select once user makes their choice
        };
      })
    );
  };

  // 4. Select all valid proposals
  const handleSelectAllProposals = () => {
    setAutoMatchProposals(prev =>
      prev.map(p => {
        // Can only select if fileId is defined
        if (p.fileId) {
          return { ...p, selected: true };
        }
        return p;
      })
    );
  };

  // 5. Clear all proposal selections
  const handleClearAllProposals = () => {
    setAutoMatchProposals(prev => prev.map(p => ({ ...p, selected: false })));
  };

  // 6. Apply selected matches (confirmed assignments)
  const handleApplyAutoMatches = () => {
    const selectedProposals = autoMatchProposals.filter(p => p.selected && p.fileId);

    setAssignments(prev => {
      const updated = { ...prev };
      for (const proposal of selectedProposals) {
        if (proposal.fileId) {
          updated[proposal.requirementId] = {
            requirementId: proposal.requirementId,
            fileId: proposal.fileId,
            expiryDate: updated[proposal.requirementId]?.expiryDate || null,
          };
        }
      }
      return updated;
    });

    setIsAutoMatchReviewOpen(false);
    addToast('success', t('autoMatch.successApplied', { count: selectedProposals.length }));
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

  const newDocForReplace = replaceTarget ? files.find(f => f.id === replaceTarget.newFileId) : null;

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
                  candidateMatches={candidateMatches}
                  submissionDeadline={tender.submission_deadline}
                  onOpenAutoMatchReview={handleOpenAutoMatchReview}
                  onOpenSelector={(req) => setSelectorRequirement(req)}
                  onRemoveAssignment={handleRemoveAssignment}
                  onUpdateExpiryDate={handleUpdateExpiryDate}
                  onPreviewFile={(file) => setPreviewFile(file)}
                  onAcceptCandidate={(reqId, fileId) => {
                    const req = requirements.find(r => r.id === reqId);
                    if (req) handleRequestAssignment(req, fileId);
                  }}
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

      {/* Auto-Match Review Modal (Two-Step Workflow) */}
      <AutoMatchReviewModal
        isOpen={isAutoMatchReviewOpen}
        proposals={autoMatchProposals}
        requirements={requirements}
        files={files}
        onToggleProposal={handleToggleProposal}
        onSelectAmbiguousOption={handleSelectAmbiguousOption}
        onSelectAll={handleSelectAllProposals}
        onClearAll={handleClearAllProposals}
        onApply={handleApplyAutoMatches}
        onPreview={(file) => setPreviewFile(file)}
        onClose={() => setIsAutoMatchReviewOpen(false)}
      />

      {/* Document Selector Modal */}
      <DocumentSelectorModal
        isOpen={Boolean(selectorRequirement)}
        requirement={selectorRequirement}
        files={files}
        assignments={assignments}
        requirements={requirements}
        candidateMatchesForReq={selectorRequirement ? candidateMatches[selectorRequirement.id] : []}
        onSelect={(fileId) => {
          if (selectorRequirement) {
            handleRequestAssignment(selectorRequirement, fileId);
          }
        }}
        onClose={() => setSelectorRequirement(null)}
      />

      {/* Confirm Replacement Modal */}
      <ConfirmReplaceModal
        isOpen={Boolean(replaceTarget)}
        requirementTitle={
          replaceTarget
            ? (language === 'bn' ? replaceTarget.requirement.title_bn : replaceTarget.requirement.title_en)
            : ''
        }
        currentFileName={replaceTarget?.currentFile.name || ''}
        newFileName={newDocForReplace?.name || ''}
        onConfirm={() => {
          if (replaceTarget) {
            executeAssignment(replaceTarget.requirement.id, replaceTarget.newFileId);
            setReplaceTarget(null);
          }
        }}
        onCancel={() => setReplaceTarget(null)}
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
