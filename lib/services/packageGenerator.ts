import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Tender, Requirement, Assignment, UploadedDocument } from '../types';

export interface GenerationProgressCallback {
  (step: 'cover' | 'merging' | 'footers' | 'finalizing', progress: number): void;
}

export interface GeneratePackageResult {
  pdfBytes: Uint8Array;
  filename: string;
  totalPages: number;
  fileSizeBytes: number;
}

/**
 * Formats a date string (YYYY-MM-DD or Date object) into English long date format (e.g., "20 October 2026").
 */
export function formatEnglishDate(dateInput: string | Date): string {
  try {
    let date: Date;
    if (typeof dateInput === 'string') {
      const [year, month, day] = dateInput.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = dateInput;
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

export async function generateTenderPackage(
  tender: Tender,
  requirements: Requirement[],
  assignments: Record<string, Assignment>,
  files: UploadedDocument[],
  onProgress?: GenerationProgressCallback
): Promise<GeneratePackageResult> {
  // 1. Sort requirements strictly by order
  const sortedReqs = [...requirements].sort((a, b) => a.order - b.order);

  // 2. Filter included requirements (those with an assigned file)
  const fileMap = new Map<string, UploadedDocument>(files.map(f => [f.id, f]));
  const includedItems: Array<{ req: Requirement; doc: UploadedDocument }> = [];

  for (const req of sortedReqs) {
    const assign = assignments[req.id];
    if (assign && assign.fileId) {
      const doc = fileMap.get(assign.fileId);
      if (doc && doc.readable) {
        includedItems.push({ req, doc });
      }
    }
  }

  // 3. Create target PDF document
  const mergedPdf = await PDFDocument.create();
  const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // 4. Create English Cover Page (A4 standard: 595.28 x 841.89 points)
  onProgress?.('cover', 15);
  const coverPage = mergedPdf.addPage([595.28, 841.89]);
  const { width: pageWidth, height: pageHeight } = coverPage.getSize();

  const margin = 50;
  let cursorY = pageHeight - 70;

  // Header
  coverPage.drawText('TENDER PACKAGE', {
    x: margin,
    y: cursorY,
    size: 22,
    font: helveticaBold,
    color: rgb(0.08, 0.12, 0.2),
  });

  cursorY -= 28;
  coverPage.drawText(tender.title, {
    x: margin,
    y: cursorY,
    size: 13,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Top divider
  cursorY -= 20;
  coverPage.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: pageWidth - margin, y: cursorY },
    thickness: 1,
    color: rgb(0.8, 0.83, 0.88),
  });

  // Tender Metadata Section
  cursorY -= 26;
  const drawField = (label: string, value: string) => {
    coverPage.drawText(label.toUpperCase(), {
      x: margin,
      y: cursorY,
      size: 8.5,
      font: helveticaBold,
      color: rgb(0.45, 0.5, 0.58),
    });
    cursorY -= 15;
    coverPage.drawText(value, {
      x: margin,
      y: cursorY,
      size: 11,
      font: helveticaFont,
      color: rgb(0.1, 0.15, 0.22),
    });
    cursorY -= 22;
  };

  drawField('Tender ID', tender.tender_id);
  drawField('Procuring Entity', tender.procuring_entity);
  drawField('Bidder', tender.bidder);
  drawField('Submission Deadline', formatEnglishDate(tender.submission_deadline));
  drawField('Package Creation Date', formatEnglishDate(new Date()));

  // Section divider before included documents
  cursorY -= 6;
  coverPage.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: pageWidth - margin, y: cursorY },
    thickness: 1,
    color: rgb(0.8, 0.83, 0.88),
  });

  // Included Documents Header
  cursorY -= 26;
  coverPage.drawText('INCLUDED DOCUMENTS', {
    x: margin,
    y: cursorY,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  cursorY -= 18;

  // List of Included Documents
  for (let i = 0; i < includedItems.length; i++) {
    const item = includedItems[i];
    const orderStr = (i + 1).toString().padStart(2, '0');
    const docTitle = `${orderStr}.  ${item.req.title_en}`;
    const pageMeta = `(${item.doc.pageCount} ${item.doc.pageCount === 1 ? 'page' : 'pages'})`;

    // Avoid overflowing the cover page
    if (cursorY < 70) {
      break;
    }

    coverPage.drawText(docTitle, {
      x: margin + 6,
      y: cursorY,
      size: 10,
      font: helveticaFont,
      color: rgb(0.15, 0.2, 0.28),
    });

    const metaWidth = helveticaFont.widthOfTextAtSize(pageMeta, 9);
    coverPage.drawText(pageMeta, {
      x: pageWidth - margin - metaWidth,
      y: cursorY,
      size: 9,
      font: helveticaFont,
      color: rgb(0.45, 0.5, 0.58),
    });

    cursorY -= 20;
  }

  // 5. Merge Document Pages in Requirement Order
  onProgress?.('merging', 40);

  for (let i = 0; i < includedItems.length; i++) {
    const item = includedItems[i];
    let sourceBuffer: ArrayBuffer;

    if (item.doc.arrayBuffer) {
      sourceBuffer = item.doc.arrayBuffer;
    } else {
      sourceBuffer = await item.doc.file.arrayBuffer();
    }

    const sourceDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true });
    const pageIndices = sourceDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(sourceDoc, pageIndices);

    for (const copiedPage of copiedPages) {
      mergedPdf.addPage(copiedPage);
    }

    const progressPct = 40 + Math.round(((i + 1) / includedItems.length) * 35);
    onProgress?.('merging', progressPct);
  }

  // 6. Add Footers on EVERY Page: "<tender_id> | Page X of Y"
  onProgress?.('footers', 80);
  const totalPages = mergedPdf.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const page = mergedPdf.getPage(i);
    const { width: pWidth } = page.getSize();
    const pageNumber = i + 1;
    const footerText = `${tender.tender_id} | Page ${pageNumber} of ${totalPages}`;

    const fontSize = 8.5;
    const textWidth = helveticaFont.widthOfTextAtSize(footerText, fontSize);
    const footerX = (pWidth - textWidth) / 2;
    const footerY = 18; // Safe bottom margin

    // Subtle background rectangle to prevent text collision if existing page has bottom markings
    page.drawRectangle({
      x: footerX - 6,
      y: footerY - 3,
      width: textWidth + 12,
      height: fontSize + 6,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });

    page.drawText(footerText, {
      x: footerX,
      y: footerY,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.2, 0.25, 0.3),
    });
  }

  // 7. Finalize and verify
  onProgress?.('finalizing', 95);
  const pdfBytes = await mergedPdf.save();

  // Strict filename requirement: <tender_id>_Package.pdf
  const sanitizedTenderId = tender.tender_id.replace(/[^\w-]/g, '_');
  const filename = `${sanitizedTenderId}_Package.pdf`;

  onProgress?.('finalizing', 100);

  return {
    pdfBytes,
    filename,
    totalPages,
    fileSizeBytes: pdfBytes.byteLength,
  };
}
