import { Requirement, Assignment, UploadedDocument, Language } from '../types';
import { calculateRequirementStatus } from './validationService';

export function exportChecklistCsv(
  requirements: Requirement[],
  assignments: Record<string, Assignment>,
  files: UploadedDocument[],
  submissionDeadline: string,
  tenderId: string,
  language: Language
): void {
  const fileMap = new Map(files.map(f => [f.id, f]));
  const sortedReqs = [...requirements].sort((a, b) => a.order - b.order);

  const headers = ['Document', 'File Name', 'Pages', 'Expiry Date', 'Status'];
  const rows = sortedReqs.map(req => {
    const docTitle = language === 'bn' ? req.title_bn : req.title_en;
    const assign = assignments[req.id];
    const file = assign?.fileId ? fileMap.get(assign.fileId) : undefined;
    const status = calculateRequirementStatus(req, assign, submissionDeadline);

    const fileName = file ? file.name : (req.mandatory ? 'Missing' : 'Not provided');
    const pages = file ? String(file.pageCount) : '-';
    const expiry = assign?.expiryDate ? assign.expiryDate : (req.has_expiry ? 'Required' : 'N/A');

    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

    return [
      escapeCsv(docTitle),
      escapeCsv(fileName),
      escapeCsv(pages),
      escapeCsv(expiry),
      escapeCsv(status)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${tenderId.replace(/[^\w-]/g, '_')}_Checklist.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
