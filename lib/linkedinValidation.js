// LinkedIn Optimizer's defense-in-depth safety net — mirrors
// lib/cvValidation.js's leakage checks exactly (same banned-title-word,
// instruction-leakage, and placeholder rules) but scanning LinkedIn profile
// sections instead of CV fields. Kept as its own module rather than
// generalizing cvValidation.js further, since the two tools' field shapes
// (a flat CV object vs. a sections-keyed results object) are different
// enough that a shared "validate this whole document" function would need
// its own branching anyway.
import { titleHasBannedWords, textHasLeakage, splitSentences, LEAKAGE_SENTENCE_START_RE, PLACEHOLDER_RE } from './cvValidation';

const SECTION_KEYS = ['headline', 'about', 'experience', 'skills'];

// Scans only the sections actually present in `results` (the caller only
// requests optimization for the sections the candidate chose) for
// instruction-leakage, placeholders, or a banned-word headline. Returns
// { clean, issues } for logging and to decide whether a regeneration pass
// is worth it.
export function detectLinkedInLeakage(results) {
  const issues = [];
  SECTION_KEYS.forEach((key) => {
    const section = results[key];
    if (!section?.improved) return;
    if (key === 'headline' && titleHasBannedWords(section.improved)) {
      issues.push(`headline contains a banned word: "${section.improved}"`);
    }
    if (textHasLeakage(section.improved)) {
      issues.push(`${key} contains instruction-like or placeholder text`);
    }
  });
  return { clean: issues.length === 0, issues };
}

// Last-resort deterministic fallback, same philosophy as
// cvValidation.js's stripCvLeakage: strip only the offending sentence
// rather than the whole section, and never empty a section entirely.
export function stripLinkedInLeakage(results) {
  const cleaned = { ...results };
  SECTION_KEYS.forEach((key) => {
    const section = cleaned[key];
    if (!section?.improved) return;
    let text = section.improved;
    if (key === 'headline') {
      text = text.replace(/\b(applicant|candidate|seeking|applying for|looking for|job seeker)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    }
    if (textHasLeakage(text)) {
      const kept = splitSentences(text).filter((s) => !LEAKAGE_SENTENCE_START_RE.test(s) && !PLACEHOLDER_RE.test(s));
      if (kept.length > 0) text = kept.join(' ');
    }
    cleaned[key] = { ...section, improved: text };
  });
  return cleaned;
}
