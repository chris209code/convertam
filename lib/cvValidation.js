// Shared validation for the CV Improver / Cover Letter Writer "professional
// career consultant" redesign — a defense-in-depth safety net, not a
// replacement for good prompting. Every check here runs server-side AFTER
// Gemini responds, so a CV or cover letter with real problems never reaches
// the browser even if the prompt alone didn't fully prevent it.

// Words that turn a professional title into a job-application-form label
// instead of an actual professional identity — e.g. "Quality Assurance
// Applicant" instead of "Quality Assurance Professional".
const BANNED_TITLE_WORDS = /\b(applicant|candidate|seeking|applying for|looking for|job seeker)\b/i;

export function titleHasBannedWords(title) {
  return !!title && BANNED_TITLE_WORDS.test(title);
}

// Instruction-style verbs Gemini sometimes leaves behind when it means to
// suggest an edit rather than perform one — "Consider adding...",
// "Elaborate on...". Anchored to the START of a sentence/bullet and to the
// verb's base form specifically, so genuine CV achievement language in the
// past tense ("Improved throughput by 12%", "Provided technical support to
// 20+ clients") never false-positives: "Improved"/"Provided" don't have a
// word boundary right after "Improve"/"Provide", so \b correctly excludes
// them while still catching the bare imperative form.
const LEAKAGE_VERBS = ['consider', 'elaborate', 'mention', 'include', 'quantify', 'provide', 'insert', 'add', 'expand', 'explain'];
const LEAKAGE_SENTENCE_START_RE = new RegExp(`^(${LEAKAGE_VERBS.join('|')})\\b`, 'i');

// Bracketed placeholders like "[Your Name]" or "[Insert company here]" that
// should never survive into a document meant to be sent as-is.
const PLACEHOLDER_RE = /\[[^\]]{1,80}\]/;

// Splits a block of text into sentence-ish units so each can be checked
// independently — one bad sentence shouldn't disqualify an otherwise clean
// paragraph in the fallback-strip step.
function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]).map((s) => s.trim()).filter(Boolean);
}

function textHasLeakage(text) {
  if (!text) return false;
  if (PLACEHOLDER_RE.test(text)) return true;
  return splitSentences(text).some((s) => LEAKAGE_SENTENCE_START_RE.test(s));
}

// Scans every CV-only field (never the review/suggestions fields, which are
// allowed — expected, even — to contain advisory language) for leakage.
// Returns { clean, issues } where issues is a human-readable list for
// logging and for deciding whether a regeneration pass is worth it.
export function detectCvLeakage(structured) {
  const issues = [];
  if (titleHasBannedWords(structured.title)) issues.push(`title contains a banned word: "${structured.title}"`);
  if (textHasLeakage(structured.summary)) issues.push('summary contains instruction-like or placeholder text');
  (structured.experience || []).forEach((exp, i) => {
    (exp.responsibilities || []).forEach((b) => {
      if (textHasLeakage(b)) issues.push(`experience[${i}] responsibility contains instruction-like or placeholder text: "${b}"`);
    });
    (exp.achievements || []).forEach((b) => {
      if (textHasLeakage(b)) issues.push(`experience[${i}] achievement contains instruction-like or placeholder text: "${b}"`);
    });
  });
  (structured.skills || []).forEach((s) => { if (textHasLeakage(s)) issues.push(`skill contains instruction-like text: "${s}"`); });
  (structured.certifications || []).forEach((c) => { if (textHasLeakage(c)) issues.push(`certification contains instruction-like text: "${c}"`); });
  return { clean: issues.length === 0, issues };
}

// Last-resort fallback if a regeneration pass still leaves leakage behind —
// deterministically strips only the offending sentence rather than the
// whole field, so a mostly-good paragraph doesn't get thrown away over one
// bad sentence. Never empties a field entirely (an empty summary is worse
// than one unlikely leftover sentence) — leaves the original in that case.
export function stripCvLeakage(structured) {
  const cleaned = { ...structured };
  if (titleHasBannedWords(cleaned.title)) {
    cleaned.title = cleaned.title.replace(BANNED_TITLE_WORDS, '').replace(/\s{2,}/g, ' ').trim();
  }
  if (textHasLeakage(cleaned.summary)) {
    const kept = splitSentences(cleaned.summary).filter((s) => !LEAKAGE_SENTENCE_START_RE.test(s) && !PLACEHOLDER_RE.test(s));
    if (kept.length > 0) cleaned.summary = kept.join(' ');
  }
  cleaned.experience = (cleaned.experience || []).map((exp) => ({
    ...exp,
    responsibilities: (exp.responsibilities || []).filter((b) => !textHasLeakage(b)),
    achievements: (exp.achievements || []).filter((b) => !textHasLeakage(b)),
  }));
  cleaned.skills = (cleaned.skills || []).filter((s) => !textHasLeakage(s));
  cleaned.certifications = (cleaned.certifications || []).filter((c) => !textHasLeakage(c));
  return cleaned;
}

// Cover letter completeness — the actual bug report was truncation
// (maxOutputTokens too low), so this specifically checks for the
// fingerprints of a cut-off response: no terminal punctuation, no sign-off,
// suspiciously short for a "complete" letter.
const SIGNOFF_RE = /\b(sincerely|regards|best regards|yours sincerely|yours faithfully|kind regards)\b/i;
const GREETING_RE = /^dear\b/i;

export function validateCoverLetter(letter) {
  const issues = [];
  const trimmed = (letter || '').trim();
  if (!trimmed) { issues.push('empty'); return { complete: false, issues }; }
  if (!GREETING_RE.test(trimmed)) issues.push('missing a greeting at the start');
  if (!/[.!?]["')]?$/.test(trimmed)) issues.push('does not end with terminal punctuation — looks cut off mid-sentence');
  if (!SIGNOFF_RE.test(trimmed)) issues.push('missing a professional sign-off (e.g. "Sincerely,")');
  if (trimmed.length < 300) issues.push('too short to be a complete 3-4 paragraph letter');
  const paragraphs = trimmed.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length < 3) issues.push('fewer than 3 paragraphs — looks incomplete');
  return { complete: issues.length === 0, issues };
}
