// Orchestrates Summarize PDF's clean -> chunk -> map -> reduce pipeline.
// Uses lib/geminiClient.js's callGemini() directly (retries, circuit
// breaker, structured JSON output already built in) — the same shared
// entry point contract-summarizer and data-analyst use. No provider
// abstraction layer here: Gemini is the only provider used anywhere in
// this app, so there's nothing to make swappable.

import { callGemini } from '@/lib/geminiClient';
import { cleanPages } from './clean';
import { chunkText, detectSections, groupPagesByChapter } from './chunk';
import { chunkSummarySchema, chapterSummarySchema, SUMMARY_TYPES, LENGTH_TARGETS, askAnswerSchema } from './schema';

function focusAreasLine(focusAreas) {
  if (!focusAreas || focusAreas.length === 0) return '';
  return `\n\nPay special attention to: ${focusAreas.join(', ')}. Prioritize this content over less relevant material, but never fabricate information not actually present in the document.`;
}

function chunkPrompt(focusAreas) {
  return `You are analyzing one section of a larger document. Extract, from ONLY the text below:
- keyPoints: the most important facts or ideas in this section (short, plain-English bullet strings)
- numbers: any important figures, amounts, percentages, or statistics mentioned (as they appear, with brief context)
- dates: any important dates or deadlines mentioned (with brief context)
- actionItems: anything that reads as a task, request, or thing someone needs to do

Be concise. If a category has nothing relevant in this section, return an empty array for it. Do not summarize the whole document — only this section.${focusAreasLine(focusAreas)}`;
}

function finalPromptHeader(typeConfig, targetWords, focusAreas) {
  return `You are synthesizing a final summary of a document from a series of section-level digests (each digest already extracted key points, numbers, dates, and action items from one part of the document). Combine them into one coherent, deduplicated result, written as if you had read the whole document:

${typeConfig.fieldInstructions}

Target roughly ${targetWords} words total across all fields combined. Do not simply concatenate the digests — synthesize and deduplicate them into one coherent result.${focusAreasLine(focusAreas)}`;
}

function directPromptHeader(typeConfig, targetWords, focusAreas) {
  return `You are a document summarizer. Read the following document text and produce a structured result:

${typeConfig.fieldInstructions}

Target roughly ${targetWords} words total across all fields combined.${focusAreasLine(focusAreas)}`;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Generic across every summary type's shape — sums words from every
// string/array-of-string field rather than hardcoding Smart Summary's
// field names, since each type has its own set of fields.
function countSummaryWords(summary) {
  const parts = [];
  for (const value of Object.values(summary || {})) {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) parts.push(...value.filter((v) => typeof v === 'string'));
  }
  return wordCount(parts.join(' '));
}

function digestToText(digest, index) {
  const lines = [`Section ${index + 1}:`];
  if (digest.keyPoints?.length) lines.push(`Key points: ${digest.keyPoints.join('; ')}`);
  if (digest.numbers?.length) lines.push(`Numbers: ${digest.numbers.join('; ')}`);
  if (digest.dates?.length) lines.push(`Dates: ${digest.dates.join('; ')}`);
  if (digest.actionItems?.length) lines.push(`Action items: ${digest.actionItems.join('; ')}`);
  return lines.join('\n');
}

async function summarizeChunk({ apiKey, chunk, focusAreas }) {
  const parts = [{ text: `${chunkPrompt(focusAreas)}\n\n--- SECTION TEXT ---\n${chunk.text}` }];
  const { parsed } = await callGemini({
    apiKey,
    toolName: 'summarize-pdf:chunk',
    routeName: '/api/summarize-pdf',
    parts,
    schema: chunkSummarySchema,
    // A section dense with figures/dates (financial reports, data-heavy
    // pages) can legitimately produce a longer digest than a plain-prose
    // section — 2048 was tight enough to occasionally truncate mid-JSON on
    // real documents, which surfaced as a hard pipeline failure even though
    // every other chunk succeeded. Raising the ceiling costs nothing when
    // the model doesn't need it (billed on actual output, not the cap).
    maxOutputTokens: 4096,
    temperature: 0.2,
    inputSizeApprox: chunk.text.length,
  });
  return parsed;
}

// Runs `items` through `worker` with at most `concurrency` in flight at
// once — enough to shorten wall-clock time on multi-chunk documents without
// firing every chunk at once, which would risk tripping callGemini's own
// circuit breaker (opens after 3 recent 429s) under real rate limits.
// Per-item failures are captured rather than left to reject the whole
// Promise.all — one bad chunk (a transient 500, or two truncated JSON
// attempts in a row) used to take down documents that were otherwise
// summarizing fine, forcing a full, from-scratch retry that re-paid for
// every chunk including the ones that had already succeeded.
async function mapWithConcurrency(items, worker, concurrency = 2) {
  const results = new Array(items.length);
  const errors = new Array(items.length);
  let nextIndex = 0;
  async function runNext() {
    const index = nextIndex++;
    if (index >= items.length) return;
    try {
      results[index] = await worker(items[index], index);
    } catch (err) {
      errors[index] = err;
    }
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
  return { results, errors };
}

// summarizeDocument({ apiKey, pages, type, length, focusAreas }) ->
// { summary, wordCount, chunkCount }. `pages` must already be the selected
// range (the API route slices before calling this). Single-chunk documents
// (the common case) skip the map step entirely and summarize directly,
// avoiding a wasted extra AI call.
export async function summarizeDocument({ apiKey, pages, type = 'smart', length = 'medium', focusAreas = [] }) {
  const typeConfig = SUMMARY_TYPES[type] || SUMMARY_TYPES.smart;
  const targetWords = typeConfig.fixedTargetWords ?? (LENGTH_TARGETS[length]?.targetWords ?? LENGTH_TARGETS.medium.targetWords);
  const cleaned = cleanPages(pages);
  if (cleaned.length === 0) {
    throw new Error('No readable text remained after cleaning this document.');
  }
  const chunks = chunkText(cleaned);

  let summary;
  if (chunks.length <= 1) {
    const soloText = chunks[0]?.text || cleaned.map((p) => p.text).join('\n\n');
    const { parsed } = await callGemini({
      apiKey,
      toolName: `summarize-pdf:direct:${type}`,
      routeName: '/api/summarize-pdf',
      parts: [{ text: `${directPromptHeader(typeConfig, targetWords, focusAreas)}\n\n--- DOCUMENT TEXT ---\n${soloText}` }],
      schema: typeConfig.schema,
      maxOutputTokens: 8192,
      temperature: 0.3,
      inputSizeApprox: soloText.length,
    });
    summary = parsed;
  } else {
    const { results: digestResults, errors: digestErrors } = await mapWithConcurrency(chunks, (chunk) => summarizeChunk({ apiKey, chunk, focusAreas }));
    const digests = digestResults.filter(Boolean);
    // Only bail out if every single chunk failed — a partial set of
    // digests still produces a legitimate, if slightly less complete,
    // summary, which beats discarding successful (already-paid-for) work
    // over one bad chunk.
    if (digests.length === 0) {
      throw digestErrors.find(Boolean) || new Error('Could not summarize this document. Please try again.');
    }
    const combinedDigestText = digests.map((digest, i) => digestToText(digest, i)).join('\n\n');
    const { parsed } = await callGemini({
      apiKey,
      toolName: `summarize-pdf:final:${type}`,
      routeName: '/api/summarize-pdf',
      parts: [{ text: `${finalPromptHeader(typeConfig, targetWords, focusAreas)}\n\n--- SECTION DIGESTS ---\n${combinedDigestText}` }],
      schema: typeConfig.schema,
      maxOutputTokens: 8192,
      temperature: 0.3,
      inputSizeApprox: combinedDigestText.length,
    });
    summary = parsed;
  }

  return {
    summary,
    wordCount: countSummaryWords(summary),
    chunkCount: chunks.length,
  };
}

async function summarizeOneChapter({ apiKey, chapter, focusAreas }) {
  const text = chapter.pages.map((p) => p.text).join('\n\n');
  const prompt = `You are summarizing one chapter/section of a larger document, titled "${chapter.title}". Produce:
- summary: a concise paragraph (roughly 80-150 words) summarizing this chapter only
- keyPoints: 3-5 of the most important points from this chapter, as short bullet strings

Do not reference other chapters — summarize only the text below.${focusAreasLine(focusAreas)}`;
  const { parsed } = await callGemini({
    apiKey,
    toolName: 'summarize-pdf:chapter',
    routeName: '/api/summarize-pdf',
    parts: [{ text: `${prompt}\n\n--- CHAPTER TEXT ---\n${text}` }],
    schema: chapterSummarySchema,
    maxOutputTokens: 2048,
    temperature: 0.3,
    inputSizeApprox: text.length,
  });
  return { title: chapter.title, ...parsed };
}

// summarizeChapters({ apiKey, pages, focusAreas }) -> { chapters, chapterCount }
// Requires detected headings — callers should check chapters.length > 0
// (via detectSections/groupPagesByChapter) before offering this mode, and
// show a clear "no chapters detected" message otherwise rather than a
// silent empty result.
export async function summarizeChapters({ apiKey, pages, focusAreas = [] }) {
  const cleaned = cleanPages(pages);
  const sections = detectSections(cleaned);
  const chapters = groupPagesByChapter(cleaned, sections);
  if (chapters.length === 0) {
    throw new Error('No chapters or sections could be detected in this document. Try Smart Summary instead.');
  }

  const { results, errors } = await mapWithConcurrency(chapters, (chapter) => summarizeOneChapter({ apiKey, chapter, focusAreas }));
  const successfulChapters = results.filter(Boolean);
  // Same partial-failure tolerance as the map step above — one chapter
  // failing to summarize shouldn't discard every other chapter that
  // succeeded.
  if (successfulChapters.length === 0) {
    throw errors.find(Boolean) || new Error('Could not summarize any chapters. Please try again.');
  }
  return { chapters: successfulChapters, chapterCount: successfulChapters.length };
}

function askHistoryBlock(history) {
  if (!history || history.length === 0) return '';
  return `\n\nConversation so far (most recent last — use this to resolve references like "it" or "that" to what was actually discussed):\n${history.map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`).join('\n')}\n`;
}

// "Ask this document" (Phase 3), tier 1 — cheap: answers from the already-
// generated summary text alone, no re-processing of the source document.
// This is the common case, since a good summary already contains most of
// what a reasonable follow-up question asks about.
export async function answerFromSummary({ apiKey, question, history, summaryText }) {
  const prompt = `You already produced the following summary of a document for this user, and are now answering their follow-up questions about it.

${askHistoryBlock(history)}
SUMMARY:
${summaryText}

Question: "${question}"

Answer using ONLY the summary above and the conversation so far — never invent facts that aren't in it. If the summary genuinely does not contain enough detail to answer, still give your best partial answer explaining what's missing, and set needsFullText to true. Otherwise answer directly in 2-5 sentences (or a short list if the question calls for one), and set needsFullText to false.`;
  const { parsed } = await callGemini({
    apiKey,
    toolName: 'summarize-pdf:ask-summary',
    routeName: '/api/summarize-pdf-ask',
    parts: [{ text: prompt }],
    schema: askAnswerSchema,
    maxOutputTokens: 1024,
    temperature: 0.2,
    inputSizeApprox: prompt.length,
  });
  return parsed;
}

// Tier 2 — only called when tier 1 flags needsFullText: re-reads the actual
// document text (the same page range the summary was generated from) to
// answer a question the compact summary alone couldn't cover. Costlier, so
// it's a fallback rather than the default path.
export async function answerFromFullText({ apiKey, question, history, pages }) {
  const cleaned = cleanPages(pages);
  const text = cleaned.map((p) => p.text).join('\n\n');
  const prompt = `The summary you gave earlier wasn't detailed enough to answer this follow-up question. Here is the actual document text (the same range the summary was based on) — answer directly and concisely using only this text, never inventing facts.
${askHistoryBlock(history)}
DOCUMENT TEXT:
${text}

Question: "${question}"

Answer in 2-5 sentences unless the question calls for a list.`;
  const { raw } = await callGemini({
    apiKey,
    toolName: 'summarize-pdf:ask-fulltext',
    routeName: '/api/summarize-pdf-ask',
    parts: [{ text: prompt }],
    maxOutputTokens: 1024,
    temperature: 0.2,
    inputSizeApprox: text.length,
  });
  return raw.trim();
}
