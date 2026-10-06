/**
 * Client-side PDF page rendering service using pdfjs-dist.
 */

// Dynamically imported on client to prevent SSR issues
let pdfjsInstance: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsInstance) {
    try {
      const lib = await import('pdfjs-dist');
      // Set worker source to unpkg matching the library version
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
      }
      pdfjsInstance = lib;
    } catch (err) {
      console.warn('Failed to initialize pdfjs-dist worker:', err);
    }
  }
  return pdfjsInstance;
}

export async function renderPdfPage(
  buffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.2
): Promise<{ totalPages: number }> {
  const lib = await getPdfJs();
  if (!lib) {
    throw new Error('PDF.js library not loaded');
  }

  // Use a copy of the buffer to avoid detaching or locking issues
  const data = new Uint8Array(buffer.slice(0));
  const loadingTask = lib.getDocument({
    data,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const validPageNum = Math.max(1, Math.min(pageNumber, totalPages));
  const page = await pdfDoc.getPage(validPageNum);
  const viewport = page.getViewport({ scale });

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) {
    throw new Error('Canvas 2D context not available');
  }

  const renderContext = {
    canvasContext,
    viewport,
    canvas,
  };

  await page.render(renderContext).promise;
  return { totalPages };
}
