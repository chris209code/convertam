// Gemini responseSchema + prompt-field definitions for Summarize PDF's
// map-reduce pipeline, passed to lib/geminiClient.js's callGemini({ schema })
// the same way app/api/contract-summarizer/route.js and
// app/api/data-analyst/route.js already do. The map step (per-chunk)
// produces one compact digest regardless of chosen summary type — cheap to
// compute once — and every type differentiates only in the final
// reduce/direct step, via its own schema + fieldInstructions here.

export const chunkSummarySchema = {
  type: 'OBJECT',
  properties: {
    keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
    numbers: { type: 'ARRAY', items: { type: 'STRING' } },
    dates: { type: 'ARRAY', items: { type: 'STRING' } },
    actionItems: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['keyPoints'],
};

export const LENGTH_TARGETS = {
  short: { label: 'Short', hint: '~100 words', targetWords: 100 },
  medium: { label: 'Medium', hint: '~300 words', targetWords: 300 },
  detailed: { label: 'Detailed', hint: '~800 words', targetWords: 800 },
};

// Human-readable labels for every field any summary type can produce —
// shared by lib/pdfSummarize/formatSummary.js so every export format
// (plain text, Markdown, PDF, DOCX) and the on-screen result renders the
// same heading for the same field, in one place.
export const FIELD_LABELS = {
  overview: 'Overview',
  keyPoints: 'Key Points',
  importantNumbers: 'Important Numbers',
  importantDates: 'Important Dates',
  actionItems: 'Action Items',
  finalTakeaway: 'Final Takeaway',
  summary: 'Executive Summary',
  bullets: 'Summary',
  mainTopics: 'Main Topics',
  definitions: 'Definitions',
  keyFacts: 'Key Facts',
  examQuestions: 'Possible Exam Questions',
  decisions: 'Decisions',
  risks: 'Risks',
  opportunities: 'Opportunities',
  recommendations: 'Recommendations',
  conclusions: 'Conclusions',
};

// `fieldOrder` controls both prompt field order and export/render order.
// `fixedTargetWords`, when set, overrides the user's Short/Medium/Detailed
// choice — Executive Summary's 300-500 word range is a fixed product
// decision, not a user-adjustable length.
export const SUMMARY_TYPES = {
  smart: {
    id: 'smart', label: 'Smart Summary', icon: '🧠',
    description: 'Overview, key points, numbers, dates, action items and a final takeaway',
    fieldOrder: ['overview', 'keyPoints', 'importantNumbers', 'importantDates', 'actionItems', 'finalTakeaway'],
    schema: {
      type: 'OBJECT',
      properties: {
        overview: { type: 'STRING' },
        keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
        importantNumbers: { type: 'ARRAY', items: { type: 'STRING' } },
        importantDates: { type: 'ARRAY', items: { type: 'STRING' } },
        actionItems: { type: 'ARRAY', items: { type: 'STRING' } },
        finalTakeaway: { type: 'STRING' },
      },
      required: ['overview', 'keyPoints', 'finalTakeaway'],
    },
    fieldInstructions: `- overview: a plain-English overview of what this document is and covers
- keyPoints: the most important points (bullet strings)
- importantNumbers: important figures/amounts/statistics mentioned, with brief context
- importantDates: important dates/deadlines mentioned, with brief context
- actionItems: concrete tasks or requests found in the document
- finalTakeaway: one or two sentences capturing the single most important thing a reader should walk away with`,
  },
  executive: {
    id: 'executive', label: 'Executive Summary', icon: '💼',
    description: 'A polished 300–500 word narrative summary for a professional audience',
    fieldOrder: ['summary'],
    fixedTargetWords: 400,
    schema: { type: 'OBJECT', properties: { summary: { type: 'STRING' } }, required: ['summary'] },
    fieldInstructions: `- summary: a polished, professional executive summary written in flowing paragraphs (not bullet points), 300-500 words, suitable for a business audience who has not read the source document.`,
  },
  bullet: {
    id: 'bullet', label: 'Bullet Summary', icon: '•',
    description: 'Only concise bullet points — no paragraphs',
    fieldOrder: ['bullets'],
    schema: { type: 'OBJECT', properties: { bullets: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['bullets'] },
    fieldInstructions: `- bullets: the document's content as a flat list of concise bullet points only — no paragraphs, no sub-headings, just the facts, one idea per bullet.`,
  },
  studyNotes: {
    id: 'studyNotes', label: 'Study Notes', icon: '📚',
    description: 'Main topics, definitions, key facts, and possible exam questions',
    fieldOrder: ['mainTopics', 'definitions', 'keyFacts', 'examQuestions'],
    schema: {
      type: 'OBJECT',
      properties: {
        mainTopics: { type: 'ARRAY', items: { type: 'STRING' } },
        definitions: { type: 'ARRAY', items: { type: 'STRING' } },
        keyFacts: { type: 'ARRAY', items: { type: 'STRING' } },
        examQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['mainTopics', 'keyFacts'],
    },
    fieldInstructions: `- mainTopics: the main topics/themes covered, as short labels
- definitions: important terms with their definition, each formatted as "Term: definition"
- keyFacts: standalone facts worth remembering
- examQuestions: plausible exam or quiz questions a student might be asked about this material — questions only, no answers`,
  },
  keyInsights: {
    id: 'keyInsights', label: 'Key Insights', icon: '💡',
    description: 'Decisions, risks, opportunities, recommendations and conclusions',
    fieldOrder: ['decisions', 'risks', 'opportunities', 'recommendations', 'conclusions'],
    schema: {
      type: 'OBJECT',
      properties: {
        decisions: { type: 'ARRAY', items: { type: 'STRING' } },
        risks: { type: 'ARRAY', items: { type: 'STRING' } },
        opportunities: { type: 'ARRAY', items: { type: 'STRING' } },
        recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
        conclusions: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: [],
    },
    fieldInstructions: `- decisions: decisions stated or implied in the document
- risks: risks, concerns, or warnings raised
- opportunities: opportunities identified
- recommendations: recommendations made
- conclusions: conclusions drawn
Leave any category as an empty array if genuinely nothing relevant is present in the document — never invent content to fill a category.`,
  },
  actionItems: {
    id: 'actionItems', label: 'Action Items', icon: '✅',
    description: 'Just the tasks and things someone needs to do',
    fieldOrder: ['actionItems'],
    schema: { type: 'OBJECT', properties: { actionItems: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['actionItems'] },
    fieldInstructions: `- actionItems: concrete tasks, requests, or things someone needs to do, found in the document. Return an empty array if none are present — never invent tasks.`,
  },
};

// The "what should be summarized" focus filter — a fixed, known list
// rather than accepting arbitrary client-supplied strings into the prompt.
// Purely additive: appended as one instruction line to whichever prompt is
// already being sent, never a separate AI call (see pipeline.js).
export const FOCUS_AREAS = [
  'Financial figures',
  'Risks',
  'Recommendations',
  'Important dates',
  'Definitions',
  'Timeline',
  'People mentioned',
  'Exam-style notes',
];

// Chapter Summary is architecturally different (one call per detected
// chapter rather than one document-wide result) — its schema lives
// separately from SUMMARY_TYPES, which pipeline.js's document-wide
// direct/reduce path uses. This display-only descriptor lets the UI's type
// picker list it alongside the SUMMARY_TYPES entries without pulling it
// into the document-wide schema/fieldOrder machinery it doesn't use.
export const CHAPTER_SUMMARY_META = {
  id: 'chapter', label: 'Chapter Summary', icon: '📑',
  description: 'One summary per detected chapter or section',
};

// "Ask this document" (Phase 3) — the cheap first-tier answer schema.
// needsFullText lets the model itself flag when the already-generated
// summary genuinely lacks enough detail to answer, so the caller can
// decide whether a second, costlier call against the actual document text
// is worth making, rather than guessing from prose or always re-sending
// the full document on every question.
export const askAnswerSchema = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    needsFullText: { type: 'BOOLEAN' },
  },
  required: ['answer', 'needsFullText'],
};

export const chapterSummarySchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary'],
};
