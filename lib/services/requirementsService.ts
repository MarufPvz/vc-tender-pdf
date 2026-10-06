import { Tender, Requirement } from '../types';

export interface ParseRequirementsResult {
  success: boolean;
  tender?: Tender;
  requirements?: Requirement[];
  error?: string;
}

export function parseAndValidateRequirements(jsonString: string): ParseRequirementsResult {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'JSON root must be an object' };
    }

    // Validate Tender object
    const tender = data.tender;
    if (!tender || typeof tender !== 'object') {
      return { success: false, error: 'Missing "tender" object in requirements file' };
    }

    const requiredTenderFields = ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline'];
    for (const field of requiredTenderFields) {
      if (!tender[field] || typeof tender[field] !== 'string') {
        return { success: false, error: `Missing or invalid tender field: "${field}"` };
      }
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tender.submission_deadline.trim())) {
      return { success: false, error: 'submission_deadline must be in YYYY-MM-DD format' };
    }

    // Validate Requirements array
    const reqs = data.requirements;
    if (!Array.isArray(reqs)) {
      return { success: false, error: '"requirements" must be an array' };
    }

    if (reqs.length === 0) {
      return { success: false, error: '"requirements" array cannot be empty' };
    }

    const validatedReqs: Requirement[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < reqs.length; i++) {
      const item = reqs[i];
      if (!item || typeof item !== 'object') {
        return { success: false, error: `Requirement at index ${i} is not a valid object` };
      }

      if (!item.id || typeof item.id !== 'string') {
        return { success: false, error: `Requirement at index ${i} has invalid "id"` };
      }

      if (seenIds.has(item.id)) {
        return { success: false, error: `Duplicate requirement id: "${item.id}"` };
      }
      seenIds.add(item.id);

      if (typeof item.order !== 'number') {
        return { success: false, error: `Requirement "${item.id}" must have a numeric "order"` };
      }

      if (!item.title_en || typeof item.title_en !== 'string') {
        return { success: false, error: `Requirement "${item.id}" missing "title_en"` };
      }

      if (!item.title_bn || typeof item.title_bn !== 'string') {
        return { success: false, error: `Requirement "${item.id}" missing "title_bn"` };
      }

      validatedReqs.push({
        id: item.id.trim(),
        order: item.order,
        title_en: item.title_en.trim(),
        title_bn: item.title_bn.trim(),
        mandatory: Boolean(item.mandatory),
        has_expiry: Boolean(item.has_expiry),
      });
    }

    // Always sort strictly by order
    validatedReqs.sort((a, b) => a.order - b.order);

    const validatedTender: Tender = {
      tender_id: tender.tender_id.trim(),
      title: tender.title.trim(),
      procuring_entity: tender.procuring_entity.trim(),
      bidder: tender.bidder.trim(),
      submission_deadline: tender.submission_deadline.trim(),
    };

    return {
      success: true,
      tender: validatedTender,
      requirements: validatedReqs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON file';
    return { success: false, error: `JSON Parse Error: ${message}` };
  }
}

export const SAMPLE_REQUIREMENTS_JSON = JSON.stringify({
  tender: {
    tender_id: "T-2026-0417",
    title: "Supply and Installation of IT Equipment",
    procuring_entity: "Directorate of Secondary and Higher Education",
    bidder: "TechServe Bangladesh Ltd.",
    submission_deadline: "2026-10-20"
  },
  requirements: [
    {
      id: "req_01",
      order: 1,
      title_en: "Trade License",
      title_bn: "হালনাগাদ ট্রেড লাইসেন্স",
      mandatory: true,
      has_expiry: true
    },
    {
      id: "req_02",
      order: 2,
      title_en: "TIN Certificate",
      title_bn: "টিআইএন সনদপত্র",
      mandatory: true,
      has_expiry: false
    },
    {
      id: "req_03",
      order: 3,
      title_en: "VAT Registration Certificate",
      title_bn: "ভ্যাট নিবন্ধন সনদ",
      mandatory: true,
      has_expiry: false
    },
    {
      id: "req_04",
      order: 4,
      title_en: "Similar Work Experience Certificate",
      title_bn: "সমজাতীয় কাজের অভিজ্ঞতা সনদ",
      mandatory: true,
      has_expiry: false
    },
    {
      id: "req_05",
      order: 5,
      title_en: "Bank Solvency Certificate",
      title_bn: "ব্যাংক সচ্ছলতা সনদপত্র",
      mandatory: true,
      has_expiry: true
    },
    {
      id: "req_06",
      order: 6,
      title_en: "Manufacturer Authorization Letter",
      title_bn: "উৎপাদনকারী প্রতিষ্ঠানের অনুমোদন পত্র",
      mandatory: true,
      has_expiry: true
    },
    {
      id: "req_07",
      order: 7,
      title_en: "ISO 9001 Quality Certification",
      title_bn: "আইএসও ৯০০১ মান সনদ",
      mandatory: false,
      has_expiry: true
    },
    {
      id: "req_08",
      order: 8,
      title_en: "Environmental Compliance Certificate",
      title_bn: "পরিবেশ ছাড়পত্র",
      mandatory: false,
      has_expiry: false
    }
  ]
}, null, 2);
