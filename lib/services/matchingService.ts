import { Requirement, UploadedDocument, Assignment } from '../types';

export interface MatchSuggestion {
  requirementId: string;
  fileId: string;
  confidence: number;
  fileName: string;
  requirementTitle: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[_\-+.]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

/**
 * Computes token similarity between a filename and requirement titles.
 */
function calculateMatchScore(fileName: string, req: Requirement): number {
  const normFile = normalizeText(fileName);
  const normEn = normalizeText(req.title_en);
  const normBn = normalizeText(req.title_bn);

  // Exact match
  if (normFile === normEn || normFile === normBn) return 1.0;

  // Direct substring inclusion
  if (normFile.includes(normEn) || normEn.includes(normFile)) return 0.85;

  const fileTokens = normFile.split(/\s+/).filter(t => t.length > 2);
  const enTokens = normEn.split(/\s+/).filter(t => t.length > 2);
  const bnTokens = normBn.split(/\s+/).filter(t => t.length > 1);

  if (fileTokens.length === 0) return 0;

  // Check English token overlap
  let matchCountEn = 0;
  for (const token of fileTokens) {
    if (enTokens.some(et => et.includes(token) || token.includes(et))) {
      matchCountEn++;
    }
  }

  // Check Bangla token overlap
  let matchCountBn = 0;
  for (const token of fileTokens) {
    if (bnTokens.some(bt => bt === token)) {
      matchCountBn++;
    }
  }

  const scoreEn = enTokens.length > 0 ? matchCountEn / Math.max(fileTokens.length, enTokens.length) : 0;
  const scoreBn = bnTokens.length > 0 ? matchCountBn / Math.max(fileTokens.length, bnTokens.length) : 0;

  return Math.max(scoreEn, scoreBn);
}

/**
 * Finds high-confidence match suggestions for unassigned requirements and unused files.
 */
export function getAutoMatchSuggestions(
  requirements: Requirement[],
  files: UploadedDocument[],
  currentAssignments: Record<string, Assignment>
): MatchSuggestion[] {
  const assignedFileIds = new Set(
    Object.values(currentAssignments)
      .map(a => a.fileId)
      .filter((id): id is string => id !== null)
  );

  const availableFiles = files.filter(f => f.readable && !f.duplicate && !assignedFileIds.has(f.id));
  const unassignedReqs = requirements.filter(r => !currentAssignments[r.id]?.fileId);

  const suggestions: MatchSuggestion[] = [];
  const usedFileIdsInSuggestions = new Set<string>();

  for (const req of unassignedReqs) {
    let bestMatch: { file: UploadedDocument; score: number } | null = null;

    for (const file of availableFiles) {
      if (usedFileIdsInSuggestions.has(file.id)) continue;

      const score = calculateMatchScore(file.name, req);
      if (score >= 0.4 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { file, score };
      }
    }

    if (bestMatch) {
      suggestions.push({
        requirementId: req.id,
        fileId: bestMatch.file.id,
        confidence: bestMatch.score,
        fileName: bestMatch.file.name,
        requirementTitle: req.title_en,
      });
      usedFileIdsInSuggestions.add(bestMatch.file.id);
    }
  }

  return suggestions;
}
