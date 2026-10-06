import { Requirement, UploadedDocument, Assignment, CandidateMatch } from '../types';

/**
 * Standard known keyword aliases for tender documents to boost match accuracy.
 */
const DOCUMENT_ALIASES: Record<string, string[]> = {
  trade: ['trade license', 'ব্যবসায়িক লাইসেন্স', 'ট্রেড লাইসেন্স', 'incorporation', 'registration'],
  tin: ['taxpayer', 'tax identification', 'ই-টিআইএন', 'e-tin', 'tin certificate', 'জাতীয় রাজস্ব বোর্ড', 'আয়কর'],
  vat: ['value added tax', 'বিন', 'bin', 'ভ্যাট চালান', 'মূসক', 'musak', 'vat registration'],
  experience: ['similar work', 'completion certificate', 'অভিজ্ঞতা', 'work order', 'performance certificate'],
  bank: ['solvency', 'credit facility', 'সচ্ছলতা', 'bank statement', 'financial statement', 'balance confirmation'],
  authorization: ['manufacturer authorization', 'maf', 'অনুমোদন', 'oem authorization', 'distributorship'],
  iso: ['quality management', 'iso 9001', 'মান সনদ', 'standards certification'],
  environmental: ['department of environment', 'পরিবেশ ছাড়পত্র', 'environmental clearance', 'doe'],
};

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[_\-+./]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

/**
 * Tokenizes text into meaningful words of length > 2 (or > 1 for Bengali).
 */
export function tokenize(text: string): string[] {
  const norm = normalizeToken(text);
  return norm.split(/\s+/).filter(t => t.length > 2 || /[\u0980-\u09FF]/.test(t));
}

/**
 * Computes Jaccard / Overlap similarity between two token lists.
 */
function tokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  let matches = 0;
  for (const a of tokensA) {
    if (tokensB.some(b => b === a || b.includes(a) || a.includes(b))) {
      matches++;
    }
  }
  return matches / Math.min(tokensA.length, tokensB.length);
}

/**
 * Calculates candidate match score and detailed evidence for a document against a requirement.
 */
export function evaluateDocumentForRequirement(
  file: UploadedDocument,
  req: Requirement
): { score: number; evidence: string[] } {
  const evidence: string[] = [];

  const reqEnTokens = tokenize(req.title_en);
  const reqBnTokens = tokenize(req.title_bn);
  const allReqTokens = Array.from(new Set([...reqEnTokens, ...reqBnTokens]));

  const filenameTokens = tokenize(file.name.replace(/\.pdf$/i, ''));
  const contentTokens = file.hasTextLayer ? tokenize(file.extractedText.slice(0, 3000)) : [];

  // 1. Content similarity (50% weight if text layer exists)
  let contentScore = 0;
  if (file.hasTextLayer && contentTokens.length > 0) {
    const rawContentOverlap = tokenOverlap(allReqTokens, contentTokens);
    // Direct phrase match check
    const contentLower = file.normalizedText;
    const normEn = normalizeToken(req.title_en);
    const normBn = normalizeToken(req.title_bn);

    if (normEn && contentLower.includes(normEn)) {
      contentScore = 1.0;
      evidence.push(`Found exact title "${req.title_en}" in document text`);
    } else if (normBn && contentLower.includes(normBn)) {
      contentScore = 1.0;
      evidence.push(`Found Bengali title in document text`);
    } else {
      contentScore = rawContentOverlap;
      if (rawContentOverlap > 0.4) {
        evidence.push(`Matched key terms in text (${Math.round(rawContentOverlap * 100)}%)`);
      }
    }
  }

  // 2. Title and Alias keyword evidence (25% weight)
  let aliasScore = 0;
  for (const [key, aliases] of Object.entries(DOCUMENT_ALIASES)) {
    const isRelevantToReq = allReqTokens.some(t => t.includes(key));
    if (isRelevantToReq) {
      for (const alias of aliases) {
        const aliasNorm = normalizeToken(alias);
        const inContent = file.normalizedText.includes(aliasNorm);
        const inFilename = file.name.toLowerCase().includes(aliasNorm);

        if (inContent || inFilename) {
          aliasScore = Math.max(aliasScore, 0.9);
          evidence.push(`Matched domain keyword: "${alias}"`);
        }
      }
    }
  }

  // 3. Filename similarity (15% weight)
  const filenameOverlap = tokenOverlap(allReqTokens, filenameTokens);
  const normEn = normalizeToken(req.title_en);
  const normFile = normalizeToken(file.name.replace(/\.pdf$/i, ''));
  let filenameScore = filenameOverlap;

  if (normFile.includes(normEn) || normEn.includes(normFile)) {
    filenameScore = 1.0;
    evidence.push(`Filename matches requirement title`);
  } else if (filenameOverlap > 0.4) {
    evidence.push(`Filename token match (${Math.round(filenameOverlap * 100)}%)`);
  }

  // Combined score calculation
  let finalScore = 0;
  if (file.hasTextLayer) {
    finalScore = (contentScore * 50) + (aliasScore * 25) + (filenameScore * 15) + 10;
  } else {
    // For scanned files without text layer, rely on filename and aliases with lower maximum
    finalScore = (filenameScore * 40) + (aliasScore * 30);
  }

  // Detected Year evidence
  if (file.detectedYears.length > 0) {
    evidence.push(`Detected year: ${file.detectedYears.join(', ')}`);
  }

  return {
    score: Math.min(100, Math.round(finalScore)),
    evidence,
  };
}

/**
 * Evaluates all unassigned candidate files for all requirements,
 * detecting high confidence matches and ambiguities (margins).
 */
export function analyzeAllCandidates(
  requirements: Requirement[],
  files: UploadedDocument[],
  assignments: Record<string, Assignment>
): Record<string, CandidateMatch[]> {
  const assignedFileIds = new Set(
    Object.values(assignments)
      .map(a => a.fileId)
      .filter((id): id is string => id !== null)
  );

  const availableFiles = files.filter(f => f.readable && !f.duplicate && !assignedFileIds.has(f.id));
  const results: Record<string, CandidateMatch[]> = {};

  for (const req of requirements) {
    // If requirement already assigned, skip candidate generation
    if (assignments[req.id]?.fileId) {
      results[req.id] = [];
      continue;
    }

    const candidates: Array<{
      file: UploadedDocument;
      score: number;
      evidence: string[];
    }> = [];

    for (const file of availableFiles) {
      const evaluation = evaluateDocumentForRequirement(file, req);
      if (evaluation.score >= 35) {
        candidates.push({
          file,
          score: evaluation.score,
          evidence: evaluation.evidence,
        });
      }
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // Compute margin and ambiguity
    const candidateMatches: CandidateMatch[] = candidates.map((cand, idx) => {
      const runnerUpScore = candidates[idx + 1]?.score || 0;
      const margin = cand.score - runnerUpScore;

      let level: CandidateMatch['level'] = 'LOW';

      // Check if ambiguous (e.g. 2025 vs 2026, or top two candidates are very close)
      if (candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < 15 && cand.score >= 50) {
        level = 'AMBIGUOUS';
      } else if (cand.score >= 75 && margin >= 15) {
        level = 'HIGH';
      } else if (cand.score >= 50) {
        level = 'MEDIUM';
      } else {
        level = 'LOW';
      }

      return {
        requirementId: req.id,
        fileId: cand.file.id,
        score: cand.score,
        margin,
        level,
        evidence: cand.evidence,
        detectedYear: cand.file.detectedYears[0],
      };
    });

    results[req.id] = candidateMatches;
  }

  return results;
}
