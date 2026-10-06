import { Tender, Requirement, Assignment, UploadedDocument } from '../types';

const DB_NAME = 'TenderPackageBuilderDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

interface StoredProject {
  id: string;
  updatedAt: number;
  tender: Tender;
  requirements: Requirement[];
  assignments: Record<string, Assignment>;
  files: Array<{
    id: string;
    name: string;
    size: number;
    pageCount: number;
    hash: string;
    duplicate: boolean;
    duplicateOf?: string;
    readable: boolean;
    hasTextLayer?: boolean;
    isScanned?: boolean;
    extractedText?: string;
    normalizedText?: string;
    detectedYears?: string[];
    analysisStatus?: 'pending' | 'analyzing' | 'ready' | 'error';
    arrayBuffer: ArrayBuffer;
  }>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToStorage(
  tender: Tender,
  requirements: Requirement[],
  assignments: Record<string, Assignment>,
  files: UploadedDocument[]
): Promise<void> {
  const db = await openDB();

  // Convert files to serializable array buffers
  const serializedFiles = await Promise.all(
    files.map(async f => {
      const buffer = f.arrayBuffer || (await f.file.arrayBuffer());
      return {
        id: f.id,
        name: f.name,
        size: f.size,
        pageCount: f.pageCount,
        hash: f.hash,
        duplicate: f.duplicate,
        duplicateOf: f.duplicateOf,
        readable: f.readable,
        hasTextLayer: f.hasTextLayer,
        isScanned: f.isScanned,
        extractedText: f.extractedText,
        normalizedText: f.normalizedText,
        detectedYears: f.detectedYears,
        analysisStatus: f.analysisStatus,
        arrayBuffer: buffer,
      };
    })
  );

  const project: StoredProject = {
    id: 'current-project',
    updatedAt: Date.now(),
    tender,
    requirements,
    assignments,
    files: serializedFiles,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(project);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

export async function loadProjectFromStorage(): Promise<{
  tender: Tender;
  requirements: Requirement[];
  assignments: Record<string, Assignment>;
  files: UploadedDocument[];
} | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get('current-project');
      getReq.onsuccess = () => {
        const result: StoredProject | undefined = getReq.result;
        if (!result) return resolve(null);

        const restoredFiles: UploadedDocument[] = result.files.map(f => {
          const fileObj = new File([f.arrayBuffer as BlobPart], f.name, { type: 'application/pdf' });
          return {
            id: f.id,
            name: f.name,
            size: f.size,
            pageCount: f.pageCount,
            hash: f.hash,
            duplicate: f.duplicate,
            duplicateOf: f.duplicateOf,
            readable: f.readable,
            hasTextLayer: f.hasTextLayer ?? true,
            isScanned: f.isScanned ?? false,
            extractedText: f.extractedText ?? '',
            normalizedText: f.normalizedText ?? '',
            detectedYears: f.detectedYears ?? [],
            analysisStatus: f.analysisStatus ?? 'ready',
            file: fileObj,
            arrayBuffer: f.arrayBuffer,
          };
        });

        resolve({
          tender: result.tender,
          requirements: result.requirements,
          assignments: result.assignments,
          files: restoredFiles,
        });
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}
