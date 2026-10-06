import { UploadedDocument } from '../types';

/**
 * Calculates SHA-256 hexadecimal hash using the browser's SubtleCrypto API.
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Groups and updates duplicate flags across all uploaded files based on exact content hash.
 * The earliest file with a hash remains canonical; any other file with identical hash is flagged duplicate.
 */
export function updateDuplicateFlags(files: UploadedDocument[]): UploadedDocument[] {
  const firstSeenByHash = new Map<string, { id: string; name: string }>();

  return files.map(file => {
    // If the file is unreadable or has no hash, don't flag as duplicate
    if (!file.hash) {
      return { ...file, duplicate: false, duplicateOf: undefined };
    }

    const existing = firstSeenByHash.get(file.hash);
    if (existing && existing.id !== file.id) {
      return {
        ...file,
        duplicate: true,
        duplicateOf: existing.name,
      };
    } else {
      if (!existing) {
        firstSeenByHash.set(file.hash, { id: file.id, name: file.name });
      }
      return {
        ...file,
        duplicate: false,
        duplicateOf: undefined,
      };
    }
  });
}

/**
 * Verifies if assigning a candidate file to targetRequirementId would violate
 * the rule that identical content cannot be assigned to multiple requirements.
 */
export function isContentHashAlreadyAssigned(
  candidateFile: UploadedDocument,
  targetRequirementId: string,
  assignments: Record<string, { requirementId: string; fileId: string | null }>,
  allFiles: UploadedDocument[]
): { isConflict: boolean; conflictingRequirementId?: string } {
  if (!candidateFile.hash) return { isConflict: false };

  const fileMap = new Map(allFiles.map(f => [f.id, f]));

  for (const [reqId, assign] of Object.entries(assignments)) {
    if (reqId === targetRequirementId) continue;
    if (!assign.fileId) continue;

    const assignedFile = fileMap.get(assign.fileId);
    if (assignedFile && assignedFile.hash === candidateFile.hash) {
      return { isConflict: true, conflictingRequirementId: reqId };
    }
  }

  return { isConflict: false };
}
