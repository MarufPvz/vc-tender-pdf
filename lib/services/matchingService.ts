import { Requirement, UploadedDocument, Assignment, CandidateMatch, AutoMatchProposal } from '../types';

/**
 * Known keyword aliases for tender documents to boost match accuracy.
 */
const DOCUMENT_ALIASES: Record<string, string[]> = {
  trade: ['trade license', 'ব্যবসায়িক লাইসেন্স', 'ট্রেড লাইসেন্স', 'incorporation', 'registration'],
  tin: ['taxpayer', 'tax identification', 'ই-টিআইএন', 'e-tin', 'tin certificate', 'জাতীয় রাজস্ব বোর্ড', 'আয়কর', 'tin'],
  vat: ['value added tax', 'বিন', 'bin', 'ভ্যাট চালান', 'মূসক', 'musak', 'vat registration', 'vat'],
  experience: ['similar work', 'completion certificate', 'অভিজ্ঞতা', 'work order', 'performance certificate', 'experience'],
  bank: ['solvency', 'credit facility', 'সচ্ছলতা', 'bank statement', 'financial statement', 'balance confirmation', 'bank solvency'],
  authorization: ['manufacturer authorization', 'maf', 'অনুমোদন', 'oem authorization', 'distributorship'],
  iso: ['quality management', 'iso 9001', 'মান সনদ', 'standards certification', 'iso'],
  environmental: ['department of environment', 'পরিবেশ ছাড়পত্র', 'environmental clearance', 'doe'],
};

/**
 * Normalizes text for clean token comparison.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[_\-+.]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

export function normalizeToken(token: string): string {
  return normalizeText(token);
}

/**
 * Computes match score and detailed evidence for a document against a requirement.
 * Uses the proven, reliable architecture based on direct title matching, token overlap,
 * domain keywords, and text layer confirmation.
 */
export function evaluateDocumentForRequirement(
  file: UploadedDocument,
  req: Requirement
): { score: number; evidence: string[] } {
  const evidence: string[] = [];

  const normFile = normalizeText(file.name);
  const normEn = normalizeText(req.title_en);
  const normBn = normalizeText(req.title_bn);

  let score = 0;

  // 1. Exact match with English or Bengali title
  if (normFile === normEn || (normBn && normFile === normBn)) {
    score = 1.0;
    evidence.push(`Exact title match with "${req.title_en}"`);
  }
  // 2. Direct substring match (e.g. "trade license" in "trade license 2026" or vice-versa)
  else if (normFile.includes(normEn) || (normEn.length > 3 && normEn.includes(normFile))) {
    score = 0.90;
    evidence.push(`Filename matches "${req.title_en}"`);
  } else if (normBn && (normFile.includes(normBn) || (normBn.length > 3 && normBn.includes(normFile)))) {
    score = 0.90;
    evidence.push(`Filename matches Bangla title`);
  } else {
    // 3. Token overlap between filename and requirement titles
    const fileTokens = normFile.split(/\s+/).filter(t => t.length > 2);
    const enTokens = normEn.split(/\s+/).filter(t => t.length > 2);
    const bnTokens = normBn.split(/\s+/).filter(t => t.length > 1);

    let matchCountEn = 0;
    for (const token of fileTokens) {
      if (enTokens.some(et => et.includes(token) || token.includes(et))) {
        matchCountEn++;
      }
    }

    let matchCountBn = 0;
    for (const token of fileTokens) {
      if (bnTokens.some(bt => bt === token)) {
        matchCountBn++;
      }
    }

    const scoreEn = enTokens.length > 0 ? matchCountEn / Math.max(fileTokens.length, enTokens.length) : 0;
    const scoreBn = bnTokens.length > 0 ? matchCountBn / Math.max(fileTokens.length, bnTokens.length) : 0;
    const tokenScore = Math.max(scoreEn, scoreBn);

    if (tokenScore >= 0.3) {
      score = Math.max(score, tokenScore * 0.85);
      evidence.push(`Keyword match in filename (${Math.round(tokenScore * 100)}%)`);
    }

    // 4. Check domain aliases (e.g. "trade", "tin", "vat", "bank", "solvency", "experience")
    for (const [key, aliases] of Object.entries(DOCUMENT_ALIASES)) {
      const isRelevant = normEn.includes(key) || normBn.includes(key);
      if (isRelevant) {
        for (const alias of aliases) {
          const normAlias = normalizeText(alias);
          if (normFile.includes(normAlias)) {
            score = Math.max(score, 0.85);
            evidence.push(`Matched document keyword: "${alias}"`);
          }
        }
      }
    }
  }

  // 5. Bonus from extracted text layer (boosts confidence, NEVER penalizes)
  if (file.hasTextLayer && file.normalizedText) {
    if (normEn && file.normalizedText.includes(normEn)) {
      score = Math.max(score, 0.95);
      evidence.push(`Found "${req.title_en}" in document text`);
    } else if (normBn && file.normalizedText.includes(normBn)) {
      score = Math.max(score, 0.95);
      evidence.push(`Found title in document text`);
    } else {
      for (const [key, aliases] of Object.entries(DOCUMENT_ALIASES)) {
        if (normEn.includes(key) || normBn.includes(key)) {
          for (const alias of aliases) {
            const normAlias = normalizeText(alias);
            if (file.normalizedText.includes(normAlias)) {
              score = Math.max(score, 0.88);
              evidence.push(`Document text mentions "${alias}"`);
            }
          }
        }
      }
    }
  }

  // 6. Year evidence
  if (file.detectedYears && file.detectedYears.length > 0) {
    evidence.push(`Year: ${file.detectedYears.join(', ')}`);
  }

  return {
    score: Math.min(100, Math.round(score * 100)),
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

      // Check if ambiguous (e.g. 2025 vs 2026, or top two candidates are very close in score)
      if (candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < 15 && cand.score >= 50) {
        level = 'AMBIGUOUS';
      } else if (cand.score >= 70 && margin >= 15) {
        level = 'HIGH';
      } else if (cand.score >= 45) {
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

/**
 * Generates initial temporary AutoMatchProposal items for the two-step review workflow.
 * Clear, high-confidence matches are preselected; ambiguous or medium matches are unselected.
 */
export function generateAutoMatchProposals(
  requirements: Requirement[],
  files: UploadedDocument[],
  assignments: Record<string, Assignment>
): AutoMatchProposal[] {
  const unassignedReqs = requirements.filter(r => !assignments[r.id]?.fileId);

  const assignedFileIds = new Set(
    Object.values(assignments)
      .map(a => a.fileId)
      .filter((id): id is string => id !== null)
  );

  // Exact duplicates of assigned files or other duplicates are filtered out
  const availableFiles = files.filter(f => f.readable && !f.duplicate && !assignedFileIds.has(f.id));
  const proposals: AutoMatchProposal[] = [];
  const preassignedFileIds = new Set<string>();

  for (const req of unassignedReqs) {
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

    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) continue;

    const top = candidates[0];
    const runnerUp = candidates[1];
    const margin = runnerUp ? top.score - runnerUp.score : top.score;

    // Detect ambiguity: multiple candidates scoring >= 50 with close margin < 15
    const isAmbiguous = runnerUp && runnerUp.score >= 50 && margin < 15;

    if (isAmbiguous) {
      proposals.push({
        id: `proposal-${req.id}`,
        requirementId: req.id,
        fileId: null, // User must choose
        score: top.score,
        confidence: 'ambiguous',
        reasons: [`Multiple candidate documents found (${candidates.length})`],
        selected: false, // NEVER preselected
        ambiguousOptions: candidates.slice(0, 3).map(c => ({
          fileId: c.file.id,
          score: c.score,
          reasons: c.evidence,
        })),
      });
    } else if (top.score >= 70 && margin >= 15) {
      const canPreselect = !preassignedFileIds.has(top.file.id);
      if (canPreselect) {
        preassignedFileIds.add(top.file.id);
      }

      proposals.push({
        id: `proposal-${req.id}`,
        requirementId: req.id,
        fileId: top.file.id,
        score: top.score,
        confidence: 'high',
        reasons: top.evidence,
        selected: canPreselect, // Preselected for strong match
      });
    } else if (top.score >= 35) {
      proposals.push({
        id: `proposal-${req.id}`,
        requirementId: req.id,
        fileId: top.file.id,
        score: top.score,
        confidence: 'medium',
        reasons: top.evidence,
        selected: false, // Unselected by default for medium match
      });
    }
  }

  return proposals;
}

/**
 * Checks for conflicts where the same file is selected for multiple requirements.
 */
export function detectProposalConflicts(
  proposals: AutoMatchProposal[]
): Map<string, string[]> {
  const fileToReqs = new Map<string, string[]>();
  for (const p of proposals) {
    if (p.selected && p.fileId) {
      const list = fileToReqs.get(p.fileId) || [];
      list.push(p.requirementId);
      fileToReqs.set(p.fileId, list);
    }
  }
  const conflicts = new Map<string, string[]>();
  for (const [fileId, reqIds] of fileToReqs.entries()) {
    if (reqIds.length > 1) {
      conflicts.set(fileId, reqIds);
    }
  }
  return conflicts;
}
