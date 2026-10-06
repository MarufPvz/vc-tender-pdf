export type Language = 'en' | 'bn';

export type DocumentStatus =
  | 'OK'
  | 'MISSING'
  | 'EXPIRY_NEEDED'
  | 'EXPIRED'
  | 'NOT_PROVIDED';

export type MatchConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS' | 'NONE';

export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // YYYY-MM-DD
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
  aliases?: string[];
}

export interface UploadedDocument {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  hash: string;
  readable: boolean;
  hasTextLayer: boolean;
  isScanned: boolean;
  extractedText: string;
  normalizedText: string;
  detectedYears: string[];
  duplicate: boolean;
  duplicateOf?: string; // name or id of primary file with same hash
  analysisStatus: 'pending' | 'analyzing' | 'ready' | 'error';
  errorReason?: string;
  arrayBuffer?: ArrayBuffer;
}

export interface Assignment {
  requirementId: string;
  fileId: string | null;
  expiryDate: string | null; // YYYY-MM-DD
}

export interface CandidateMatch {
  requirementId: string;
  fileId: string;
  score: number;
  margin: number;
  level: MatchConfidenceLevel;
  evidence: string[];
  detectedYear?: string;
}

export interface ValidationSummary {
  total: number;
  okCount: number;
  missingCount: number;
  expiryNeededCount: number;
  expiredCount: number;
  notProvidedCount: number;
  blockingCount: number;
  canGenerate: boolean;
  blockingReasons: Array<{ requirementId: string; reason: string }>;
}
