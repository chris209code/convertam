// Gemini responseSchema + prompt definitions for Smart Parser's AI
// enhancement layer. Three actions, each exactly one callGemini call —
// there is no action that loops per-field or per-page; a whole document
// (or a whole custom-schema request) is one call, matching the same
// cost-discipline every other multi-step AI tool in Convertam follows.

export const CLASSIFY_PROMPT = `You are a document classification engine. Read the attached document content and identify what kind of document it is.

Respond with:
- documentType: a short, specific label (e.g. "Invoice", "Bank Statement", "Receipt", "Research Report", "Resume/CV", "Contract", "Business Letter", "Form", "Spreadsheet Export", "Unknown")
- confidenceLevel: "high", "medium", or "low"
- summary: one or two sentences describing what this specific document contains

Be accurate and conservative. If you cannot determine the type, use "Unknown" rather than guessing.`;

export const CLASSIFY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    documentType: { type: 'STRING' },
    confidenceLevel: { type: 'STRING' },
    summary: { type: 'STRING' },
  },
  required: ['documentType', 'confidenceLevel', 'summary'],
};

export function buildExtractSchemaPrompt(fields) {
  const fieldList = fields.map((f) => `- ${f}`).join('\n');
  return `You are a structured data extraction engine. Read the attached document and extract exactly these fields:

${fieldList}

For each field, return its value exactly as it appears in the document (do not reformat dates, currency, or numbers). If a field cannot be found in the document, return an empty string for its value and note that in "note". Never invent a value that is not actually present in the document.`;
}

export const EXTRACT_SCHEMA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fields: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          field: { type: 'STRING' },
          value: { type: 'STRING' },
          confidence: { type: 'STRING' },
          note: { type: 'STRING' },
        },
        required: ['field', 'value', 'confidence'],
      },
    },
  },
  required: ['fields'],
};

export const ANALYZE_PROMPT = `You are a document analysis assistant. You are given the raw text of a document plus a list of fields already extracted from it by a deterministic (non-AI) parser. In one pass:

- Identify what kind of document this is (documentType, e.g. "Invoice", "Bank Statement", "Receipt", "Report") and write a short (2-4 sentence) plain-language summary of what it contains and what was extracted from it.
- For any already-extracted field whose value looks incomplete, inconsistent, or clearly wrong given the document context, propose a corrected value (only if you can find genuine support for it in the document text — never invent one).
- Note anything ambiguous or worth the user double-checking.

Only propose a correction when you are genuinely confident it is right — for anything else, leave the field's cleanedValue equal to its original value.`;

export const ANALYZE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    documentType: { type: 'STRING' },
    summary: { type: 'STRING' },
    cleanedFields: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          field: { type: 'STRING' },
          originalValue: { type: 'STRING' },
          cleanedValue: { type: 'STRING' },
          changed: { type: 'BOOLEAN' },
        },
        required: ['field', 'originalValue', 'cleanedValue', 'changed'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['documentType', 'summary', 'cleanedFields'],
};
