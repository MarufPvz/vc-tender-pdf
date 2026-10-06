import { Requirement, Assignment, DocumentStatus, ValidationSummary, UploadedDocument } from '../types';

export const BLOCKING_STATUSES = new Set<DocumentStatus>(['MISSING', 'EXPIRY_NEEDED', 'EXPIRED']);

export function isBlockingStatus(status: DocumentStatus): boolean {
  return BLOCKING_STATUSES.has(status);
}

/**
 * Pure deterministic status calculation for a single requirement according to specification rules.
 */
export function calculateRequirementStatus(
  requirement: Requirement,
  assignment: Assignment | undefined,
  submissionDeadline: string
): DocumentStatus {
  // If no file assigned:
  if (!assignment || !assignment.fileId) {
    return requirement.mandatory ? 'MISSING' : 'NOT_PROVIDED';
  }

  // File is assigned:
  if (!requirement.has_expiry) {
    return 'OK';
  }

  // Expiry is required:
  const expiry = assignment.expiryDate ? assignment.expiryDate.trim() : '';
  if (!expiry) {
    return 'EXPIRY_NEEDED';
  }

  // Pure string comparison on YYYY-MM-DD to avoid timezone skew
  // E.g. "2026-10-19" < "2026-10-20" -> Expired
  // "2026-10-20" >= "2026-10-20" -> OK
  const deadline = submissionDeadline.trim();
  if (expiry < deadline) {
    return 'EXPIRED';
  }

  return 'OK';
}

/**
 * Calculates complete status breakdown for the whole tender package.
 */
export function calculateValidationSummary(
  requirements: Requirement[],
  assignments: Record<string, Assignment>,
  submissionDeadline: string
): ValidationSummary {
  let okCount = 0;
  let missingCount = 0;
  let expiryNeededCount = 0;
  let expiredCount = 0;
  let notProvidedCount = 0;
  let blockingCount = 0;
  const blockingReasons: Array<{ requirementId: string; reason: string }> = [];

  for (const req of requirements) {
    const status = calculateRequirementStatus(req, assignments[req.id], submissionDeadline);

    switch (status) {
      case 'OK':
        okCount++;
        break;
      case 'MISSING':
        missingCount++;
        blockingCount++;
        blockingReasons.push({
          requirementId: req.id,
          reason: `Missing mandatory document: ${req.title_en}`,
        });
        break;
      case 'EXPIRY_NEEDED':
        expiryNeededCount++;
        blockingCount++;
        blockingReasons.push({
          requirementId: req.id,
          reason: `Expiry date required for: ${req.title_en}`,
        });
        break;
      case 'EXPIRED':
        expiredCount++;
        blockingCount++;
        blockingReasons.push({
          requirementId: req.id,
          reason: `Document expired before deadline: ${req.title_en}`,
        });
        break;
      case 'NOT_PROVIDED':
        notProvidedCount++;
        // Optional document without file does NOT block generation
        break;
    }
  }

  const canGenerate = requirements.length > 0 && blockingCount === 0;

  return {
    total: requirements.length,
    okCount,
    missingCount,
    expiryNeededCount,
    expiredCount,
    notProvidedCount,
    blockingCount,
    canGenerate,
    blockingReasons,
  };
}

/**
 * Deep pre-generation validation check to catch edge cases before running PDF generation.
 */
export function validateBeforeGeneration(
  requirements: Requirement[],
  assignments: Record<string, Assignment>,
  files: UploadedDocument[],
  submissionDeadline: string
): { isValid: boolean; error?: string } {
  if (!requirements || requirements.length === 0) {
    return { isValid: false, error: 'No requirements loaded' };
  }

  const summary = calculateValidationSummary(requirements, assignments, submissionDeadline);
  if (!summary.canGenerate) {
    return {
      isValid: false,
      error: summary.blockingReasons[0]?.reason || 'Please resolve all blocking issues before generating the package',
    };
  }

  const fileMap = new Map<string, UploadedDocument>(files.map(f => [f.id, f]));
  const seenHashes = new Map<string, string>(); // hash -> reqId

  for (const req of requirements) {
    const assign = assignments[req.id];
    if (assign && assign.fileId) {
      const file = fileMap.get(assign.fileId);
      if (!file) {
        return {
          isValid: false,
          error: `Assigned file for "${req.title_en}" could not be found`,
        };
      }

      if (!file.readable) {
        return {
          isValid: false,
          error: `Assigned file "${file.name}" for "${req.title_en}" is unreadable or corrupted`,
        };
      }

      // Check for duplicate content assigned across multiple requirements
      if (file.hash) {
        if (seenHashes.has(file.hash)) {
          return {
            isValid: false,
            error: `Duplicate document content cannot be assigned to multiple requirements (${req.title_en})`,
          };
        }
        seenHashes.set(file.hash, req.id);
      }
    }
  }

  return { isValid: true };
}
