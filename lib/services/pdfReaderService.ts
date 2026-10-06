import { PDFDocument } from 'pdf-lib';
import { UploadedDocument } from '../types';
import { calculateSha256 } from './duplicateService';

export interface ReadPdfResult {
  success: boolean;
  doc?: UploadedDocument;
  error?: string;
}

let pdfjsInstance: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsInstance) {
    try {
      const lib = await import('pdfjs-dist');
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
      }
      pdfjsInstance = lib;
    } catch (err) {
      console.warn('Failed to initialize pdfjs-dist for text extraction:', err);
    }
  }
  return pdfjsInstance;
}

/**
 * Normalizes text for comparison and indexing.
 */
export function normalizeExtractedText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_\-+./]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts 4-digit years (e.g., 2024, 2025, 2026, 2027) from filename and text.
 */
export function extractYears(filename: string, text: string): string[] {
  const combined = `${filename} ${text}`;
  const matches = combined.match(/\b(20[1-3][0-9])\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches)).sort().reverse();
}

/**
 * Attempts text extraction across pages using pdfjs-dist.
 */
async function extractTextFromPdf(buffer: ArrayBuffer, maxPages = 10): Promise<string> {
  try {
    const lib = await getPdfJs();
    if (!lib) return '';

    const data = new Uint8Array(buffer.slice(0));
    const loadingTask = lib.getDocument({
      data,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pageCount = Math.min(pdfDoc.numPages, maxPages);
    let collectedText = '';

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .filter(Boolean);
      collectedText += ' ' + pageStrings.join(' ');
    }

    return collectedText.trim();
  } catch (err) {
    console.warn('Text extraction warning:', err);
    return '';
  }
}

export async function processPdfFile(file: File): Promise<UploadedDocument> {
  const id = crypto.randomUUID ? crypto.randomUUID() : `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Quick sanity check for PDF mime/extension
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  if (!isPdf) {
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      hash: '',
      readable: false,
      hasTextLayer: false,
      isScanned: false,
      extractedText: '',
      normalizedText: '',
      detectedYears: [],
      duplicate: false,
      analysisStatus: 'error',
      errorReason: 'Not a PDF file',
    };
  }

  try {
    const buffer = await file.arrayBuffer();

    // 1. Calculate content SHA-256 hash
    const hash = await calculateSha256(buffer);

    // 2. Load PDF using pdf-lib to count pages and verify structure
    let pageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      pageCount = pdfDoc.getPageCount();

      if (pageCount <= 0) {
        throw new Error('PDF has 0 pages');
      }
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Damaged or password-protected PDF';
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        pageCount: 0,
        hash,
        readable: false,
        hasTextLayer: false,
        isScanned: false,
        extractedText: '',
        normalizedText: '',
        detectedYears: [],
        duplicate: false,
        analysisStatus: 'error',
        errorReason: msg.includes('Encrypt') ? 'Password protected PDF' : 'Damaged or unreadable PDF structure',
        arrayBuffer: buffer,
      };
    }

    // 3. Attempt Text Extraction using PDF.js
    const rawExtractedText = await extractTextFromPdf(buffer, 8);
    const normalizedText = normalizeExtractedText(rawExtractedText);

    // Check if meaningful text exists (more than 25 alphanumeric characters)
    const alphanumericCount = (normalizedText.match(/[\p{L}\p{N}]/gu) || []).length;
    const hasTextLayer = alphanumericCount >= 25;
    const isScanned = !hasTextLayer; // Opened successfully but lacks machine-readable text

    // 4. Extract detected years from filename and extracted text
    const detectedYears = extractYears(file.name, rawExtractedText);

    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount,
      hash,
      readable: true,
      hasTextLayer,
      isScanned,
      extractedText: rawExtractedText,
      normalizedText,
      detectedYears,
      duplicate: false,
      analysisStatus: 'ready',
      arrayBuffer: buffer,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to read file';
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      hash: '',
      readable: false,
      hasTextLayer: false,
      isScanned: false,
      extractedText: '',
      normalizedText: '',
      detectedYears: [],
      duplicate: false,
      analysisStatus: 'error',
      errorReason: msg,
    };
  }
}

/**
 * Validates a batch of files against constraints:
 * - PDF only
 * - Total file count <= 30
 * - Total size <= 50 MB (50 * 1024 * 1024 bytes)
 */
export function validateUploadLimits(
  existingFiles: UploadedDocument[],
  newFiles: File[]
): {
  validFiles: File[];
  rejectedNonPdf: File[];
  exceededCount: boolean;
  exceededSize: boolean;
} {
  const MAX_FILES = 30;
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

  const validFiles: File[] = [];
  const rejectedNonPdf: File[] = [];

  for (const f of newFiles) {
    const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
    if (isPdf) {
      validFiles.push(f);
    } else {
      rejectedNonPdf.push(f);
    }
  }

  const projectedTotalFiles = existingFiles.length + validFiles.length;
  const existingSizeBytes = existingFiles.reduce((acc, f) => acc + f.size, 0);
  const newSizeBytes = validFiles.reduce((acc, f) => acc + f.size, 0);
  const projectedTotalSize = existingSizeBytes + newSizeBytes;

  const exceededCount = projectedTotalFiles > MAX_FILES;
  const exceededSize = projectedTotalSize > MAX_SIZE_BYTES;

  return {
    validFiles,
    rejectedNonPdf,
    exceededCount,
    exceededSize,
  };
}
