// Engine-agnostic translation interface for Document Translator. The UI,
// the workspace/session integration, and the API route orchestration below
// never talk to a specific provider — they call the two methods here.
// Switching providers later (e.g. adopting Google Cloud Translation's native
// document translation, pending the real-document evaluation) means writing
// a new file in ./engines/ that implements this same interface and pointing
// the registry at it — nothing else in the app changes. See the decision
// recorded in /root/.claude/plans/radiant-dazzling-oasis.md.
//
// Every engine implementation must provide:
//   translateText({ apiKey, text, sourceLanguage, targetLanguage, mode })
//     -> { translatedText, detectedSourceLanguage, requestId, usage }
//     Flat-text translation for Fast/Accurate modes. `mode` is 'fast' or
//     'accurate' — how that maps to prompt/model behavior is entirely up to
//     the engine implementation.
//   translateBlocks({ apiKey, blocks, sourceLanguage, targetLanguage })
//     -> { translatedBlocks, detectedSourceLanguage, requestId, usage }
//     Array-in/array-out batch translation for Preserve Formatting mode
//     (Phase 2+). `blocks` and `translatedBlocks` must be the same length,
//     in the same order — callers rely on this to reinject translations
//     back into document structure.
//
// Every engine must also provide its own bounded-retry/timeout behavior
// internally (the Gemini adapter gets this from callGemini()) — that
// reliability contract is part of what "an engine" means here, not
// something layered on afterward by the route.

import { geminiEngine } from './engines/geminiEngine';

const ENGINES = {
  gemini: geminiEngine,
};

export function getTranslationEngine() {
  const name = process.env.TRANSLATION_ENGINE || 'gemini';
  const engine = ENGINES[name];
  if (!engine) {
    throw new Error(`Unknown TRANSLATION_ENGINE "${name}" — no adapter registered for it.`);
  }
  return engine;
}
