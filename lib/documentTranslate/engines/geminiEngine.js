// Gemini implementation of the engine-agnostic translation interface
// defined in lib/documentTranslate/engine.js. This is the only adapter that
// exists today — kept on Gemini because it's cheaper per document than a
// dedicated NMT API even after Gemini's Oct-2026 3.5 Flash repricing (see
// the cost analysis in conversation), while operating cost during the
// demand-validation period is the priority over cost predictability. The
// platform limits in lib/documentTranslate/limits.js are what actually
// bound worst-case spend, independent of which engine is behind this file.

import { callGemini } from '@/lib/geminiClient';

// A hung Gemini call would otherwise only be bounded by the route's own
// serverless timeout (60s) — this gives translation its own tighter,
// request-level bound so a stuck call fails fast and predictably instead of
// silently eating the whole function budget.
const REQUEST_TIMEOUT_MS = 25000;

const MODE_CONFIG = {
  fast: {
    temperature: 0.4,
    instruction: 'Prioritize speed and a direct, natural translation. Do not over-explain or add commentary — just translate accurately and idiomatically.',
  },
  accurate: {
    temperature: 0.1,
    instruction: 'Prioritize precision and idiomatic quality over speed. Preserve nuance, tone, and register from the source text. Re-read your translation mentally before finalizing it to catch anything that reads unnaturally in the target language.',
  },
};

// Deliberately generous and flat, not scaled from source length — an
// earlier version estimated the budget from source character count at a
// fixed chars-per-token ratio, which silently assumed English-like
// tokenization efficiency. Gemini's tokenizer needs measurably MORE tokens
// per character for lower-resource languages — Hausa, Yoruba, Igbo, and
// Swahili among them, exactly the languages this tool differentiates on —
// so that estimate could under-budget a translation into one of those,
// truncating the response mid-JSON and surfacing as a generic "incomplete
// response" parse failure. There's no real cost to requesting more: Gemini
// bills only the tokens actually generated, not the requested ceiling, and
// the platform's own MAX_CHARACTERS cap (limits.js) already bounds how
// large a single request can be — so this is sized to comfortably cover
// the worst case at that cap (10,000 source characters) even in a
// low-resource target language, with real headroom, not tuned per request.
const TRANSLATION_OUTPUT_TOKEN_BUDGET = 16384;

const translateTextSchema = {
  type: 'OBJECT',
  properties: {
    detectedSourceLanguage: { type: 'STRING' },
    translatedText: { type: 'STRING' },
  },
  required: ['detectedSourceLanguage', 'translatedText'],
};

const translateBlocksSchema = {
  type: 'OBJECT',
  properties: {
    detectedSourceLanguage: { type: 'STRING' },
    translatedBlocks: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['detectedSourceLanguage', 'translatedBlocks'],
};

async function translateText({ apiKey, text, sourceLanguage, targetLanguage, mode }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.fast;
  const sourceNote = sourceLanguage && sourceLanguage !== 'auto'
    ? `The source language is ${sourceLanguage}.`
    : 'Detect the source language yourself.';

  const prompt = `You are a professional document translator. ${sourceNote} Translate the text below into ${targetLanguage}.

${config.instruction}

Preserve paragraph breaks and line breaks exactly as they appear in the source — do not merge or split paragraphs. Do not translate proper nouns that shouldn't change (brand names, etc.) unless a target-language equivalent is standard. Return your best detected/confirmed source language name (in English, e.g. "French") and the full translated text.

Text to translate:
"""
${text}
"""`;

  const { parsed, requestId, usage } = await callGemini({
    apiKey,
    toolName: `document-translator:${mode}`,
    routeName: '/api/document-translate',
    parts: [{ text: prompt }],
    schema: translateTextSchema,
    maxOutputTokens: TRANSLATION_OUTPUT_TOKEN_BUDGET,
    temperature: config.temperature,
    timeoutMs: REQUEST_TIMEOUT_MS,
    inputSizeApprox: text.length,
  });

  return {
    translatedText: parsed.translatedText,
    detectedSourceLanguage: parsed.detectedSourceLanguage,
    requestId,
    usage,
  };
}

async function translateBlocks({ apiKey, blocks, sourceLanguage, targetLanguage }) {
  const sourceNote = sourceLanguage && sourceLanguage !== 'auto'
    ? `The source language is ${sourceLanguage}.`
    : 'Detect the source language yourself.';

  const totalLength = blocks.reduce((sum, b) => sum + b.length, 0);

  const prompt = `You are a professional document translator. ${sourceNote} Translate every item in the JSON array below into ${targetLanguage}, preserving structure.

You MUST return exactly ${blocks.length} translated items, in the exact same order as the input — one translation per input item, even if an item is short, a heading, or a single word. Never merge, split, skip, or reorder items — the caller reinserts your output back into the original document structure by position, so count and order must match exactly.

Input items (JSON array):
${JSON.stringify(blocks)}`;

  const { parsed, requestId, usage } = await callGemini({
    apiKey,
    toolName: 'document-translator:preserve-formatting',
    routeName: '/api/document-translate',
    parts: [{ text: prompt }],
    schema: translateBlocksSchema,
    maxOutputTokens: TRANSLATION_OUTPUT_TOKEN_BUDGET,
    temperature: 0.1,
    timeoutMs: REQUEST_TIMEOUT_MS,
    inputSizeApprox: totalLength,
  });

  if (!Array.isArray(parsed.translatedBlocks) || parsed.translatedBlocks.length !== blocks.length) {
    throw new Error(`Translation block count mismatch: expected ${blocks.length}, got ${parsed.translatedBlocks?.length ?? 0}.`);
  }

  return {
    translatedBlocks: parsed.translatedBlocks,
    detectedSourceLanguage: parsed.detectedSourceLanguage,
    requestId,
    usage,
  };
}

export const geminiEngine = { translateText, translateBlocks };
