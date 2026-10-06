import { PDFDocument } from 'pdf-lib';
import { UploadedDocument } from '../types';
import { calculateSha256 } from './duplicateService';

export interface ReadPdfResult {
  success: boolean;
  doc?: UploadedDocument;
  error?: string;
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
      duplicate: false,
      readable: false,
      errorReason: 'Not a PDF file',
    };
  }

  try {
    const buffer = await file.arrayBuffer();

    // Calculate content SHA-256 hash
    const hash = await calculateSha256(buffer);

    // Attempt to load PDF using pdf-lib to accurately count pages and verify readability
    let pageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      pageCount = pdfDoc.getPageCount();

      if (pageCount <= 0) {
        throw new Error('PDF has 0 pages');
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        pageCount,
        hash,
        duplicate: false,
        readable: true,
        arrayBuffer: buffer,
      };
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Damaged or password-protected PDF';
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        pageCount: 0,
        hash,
        duplicate: false,
        readable: false,
        errorReason: msg.includes('Encrypt') ? 'Password protected PDF' : 'Damaged or unreadable PDF structure',
        arrayBuffer: buffer,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to read file';
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      hash: '',
      duplicate: false,
      readable: false,
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
