// Reusable, dependency-free text-processing engine — pure functions only
// (string in, string out; no state, no DOM). This is the shared core the
// Text Cleaner Studio is built on, and the same core future Data Tools
// (Email Extractor, Phone Extractor, Duplicate Remover, CSV Cleaner,
// JSON Cleaner) are meant to import from rather than reimplementing their
// own line-splitting, regex or dedupe logic.
//
// Every operation is line-based where that's the natural unit ("Sort",
// "Remove Duplicate Lines", trimming) and whole-text-based where it isn't
// (case conversion, punctuation/emoji/HTML stripping) — each function
// documents which. All are O(n) or O(n log n) in the size of the text,
// deliberately avoiding per-character string concatenation in a loop
// (which is what actually causes "freezing" on huge input) in favour of
// array split/map/filter/join, which V8 handles efficiently even at
// hundreds of thousands of lines.

export function splitLines(text) {
  if (text === '') return [];
  return text.split('\n');
}

export function joinLines(lines) {
  return lines.join('\n');
}

function isBlank(line) {
  return line.trim() === '';
}

// ---------------------------------------------------------------------
// CLEAN
// ---------------------------------------------------------------------

export function removeBlankLines(text) {
  return joinLines(splitLines(text).filter((l) => !isBlank(l)));
}

// Exact-match dedupe, order-preserving (first occurrence wins) — a plain
// Set lookup, O(n), not the O(n^2) nested-loop approach that would choke
// well before 100,000 lines.
export function removeDuplicateLines(text) {
  const seen = new Set();
  const out = [];
  for (const line of splitLines(text)) {
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  return joinLines(out);
}

export function trimLeadingSpaces(text) {
  return joinLines(splitLines(text).map((l) => l.replace(/^[ \t]+/, '')));
}

export function trimTrailingSpaces(text) {
  return joinLines(splitLines(text).map((l) => l.replace(/[ \t]+$/, '')));
}

// Collapses runs of the plain space character only — the common "I typed
// two spaces after a period" case.
export function removeExtraSpaces(text) {
  return joinLines(splitLines(text).map((l) => l.replace(/ {2,}/g, ' ')));
}

// Broader than removeExtraSpaces: collapses ANY whitespace run (spaces,
// tabs, non-breaking spaces) into one regular space — for text pasted
// out of a spreadsheet or PDF full of tabs and stray Unicode spaces.
export function normalizeMultipleSpaces(text) {
  return joinLines(splitLines(text).map((l) => l.replace(/[ \t ]{2,}/g, ' ')));
}

// Collapses 2+ consecutive blank lines down to exactly one — keeps
// paragraph breaks but removes excessive gaps. Deliberately distinct from
// removeBlankLines, which removes every blank line unconditionally.
export function removeEmptyParagraphs(text) {
  return text.replace(/(\n[ \t]*){3,}/g, '\n\n');
}

// ---------------------------------------------------------------------
// CASE
// ---------------------------------------------------------------------

export function toUpperCase(text) {
  return text.toUpperCase();
}

export function toLowerCase(text) {
  return text.toLowerCase();
}

export function toTitleCase(text) {
  return text.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function toSentenceCase(text) {
  return text.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (c) => c.toUpperCase());
}

export function toggleCase(text) {
  return text.replace(/\p{L}/gu, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()));
}

// ---------------------------------------------------------------------
// SORT (line-based)
// ---------------------------------------------------------------------

export function sortLinesAZ(text) {
  return joinLines(splitLines(text).sort((a, b) => a.localeCompare(b)));
}

export function sortLinesZA(text) {
  return joinLines(splitLines(text).sort((a, b) => b.localeCompare(a)));
}

export function reverseLines(text) {
  return joinLines(splitLines(text).reverse());
}

// Fisher-Yates — uniform, O(n), no bias.
export function randomizeLines(text) {
  const lines = splitLines(text);
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }
  return joinLines(lines);
}

// ---------------------------------------------------------------------
// REMOVE (whole-text, regex-based — exported patterns so future tools,
// e.g. an Email/Phone/URL Extractor, can reuse the exact same matcher
// instead of redefining it and risking a subtly different pattern).
// ---------------------------------------------------------------------

export const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
export const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g;

export function extractMatches(text, pattern) {
  return text.match(pattern) || [];
}

export function removeNumbers(text) {
  return text.replace(/[0-9]/g, '');
}

// Unicode-aware punctuation stripping (\p{P}) rather than a hand-rolled
// ASCII punctuation class, so accented/non-Latin punctuation is handled
// correctly too.
export function removePunctuation(text) {
  return text.replace(/\p{P}/gu, '');
}

// Anything that isn't a Unicode letter, number, or whitespace.
export function removeSpecialCharacters(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, '');
}

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

export function removeEmojis(text) {
  return text.replace(EMOJI_PATTERN, '');
}

// A hand-rolled indexOf scan rather than /<[^>]*>/g — that pattern is
// safe for well-formed tags, but text full of unmatched '<' characters
// (no closing '>' anywhere after them) forces the same kind of O(n^2)
// backtracking that the sentence-count regex had. indexOf is a single
// linear scan no matter how the input is shaped, and an unmatched '<' is
// simply left in place rather than eating the rest of the text.
export function removeHtmlTags(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('<', i);
    if (start === -1) { result += text.slice(i); break; }
    result += text.slice(i, start);
    const end = text.indexOf('>', start);
    if (end === -1) { result += text.slice(start); break; }
    i = end + 1;
  }
  return result;
}

export function removeUrls(text) {
  return text.replace(URL_PATTERN, '');
}

// ---------------------------------------------------------------------
// FIND & REPLACE
// ---------------------------------------------------------------------

// Builds a RegExp from a plain find string (escaping regex metacharacters
// unless useRegex is on) so Find/Replace, Whole Word and Case Sensitive
// all compose through one code path. Returns null on an invalid pattern
// (e.g. malformed regex the user typed) instead of throwing, so a bad
// input can never crash the pipeline.
export function buildFindPattern(find, { caseSensitive = false, wholeWord = false, useRegex = false, global = true } = {}) {
  if (!find) return null;
  let source = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wholeWord) source = `\\b${source}\\b`;
  const flags = `${global ? 'g' : ''}${caseSensitive ? '' : 'i'}`;
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

export function findReplace(text, { find, replace = '', caseSensitive = false, wholeWord = false, useRegex = false, all = true }) {
  const pattern = buildFindPattern(find, { caseSensitive, wholeWord, useRegex, global: all });
  if (!pattern) return text;
  return text.replace(pattern, replace);
}

// ---------------------------------------------------------------------
// OPERATION REGISTRY — drives both the category-grouped button grid and
// pipeline execution, so adding a new simple (parameterless) operation
// only ever means adding one entry here.
// ---------------------------------------------------------------------

export const OPERATIONS = [
  { id: 'remove-blank-lines', label: 'Remove Blank Lines', category: 'clean', apply: removeBlankLines },
  { id: 'remove-duplicate-lines', label: 'Remove Duplicate Lines', category: 'clean', apply: removeDuplicateLines },
  { id: 'trim-leading-spaces', label: 'Trim Leading Spaces', category: 'clean', apply: trimLeadingSpaces },
  { id: 'trim-trailing-spaces', label: 'Trim Trailing Spaces', category: 'clean', apply: trimTrailingSpaces },
  { id: 'remove-extra-spaces', label: 'Remove Extra Spaces', category: 'clean', apply: removeExtraSpaces },
  { id: 'normalize-multiple-spaces', label: 'Normalize Multiple Spaces', category: 'clean', apply: normalizeMultipleSpaces },
  { id: 'remove-empty-paragraphs', label: 'Remove Empty Paragraphs', category: 'clean', apply: removeEmptyParagraphs },

  { id: 'uppercase', label: 'UPPERCASE', category: 'case', apply: toUpperCase },
  { id: 'lowercase', label: 'lowercase', category: 'case', apply: toLowerCase },
  { id: 'title-case', label: 'Title Case', category: 'case', apply: toTitleCase },
  { id: 'sentence-case', label: 'Sentence case', category: 'case', apply: toSentenceCase },
  { id: 'toggle-case', label: 'Toggle Case', category: 'case', apply: toggleCase },

  { id: 'sort-az', label: 'Sort A-Z', category: 'sort', apply: sortLinesAZ },
  { id: 'sort-za', label: 'Sort Z-A', category: 'sort', apply: sortLinesZA },
  { id: 'reverse-lines', label: 'Reverse Lines', category: 'sort', apply: reverseLines },
  { id: 'randomize-lines', label: 'Randomize Lines', category: 'sort', apply: randomizeLines },

  { id: 'remove-numbers', label: 'Remove Numbers', category: 'remove', apply: removeNumbers },
  { id: 'remove-punctuation', label: 'Remove Punctuation', category: 'remove', apply: removePunctuation },
  { id: 'remove-special-characters', label: 'Remove Special Characters', category: 'remove', apply: removeSpecialCharacters },
  { id: 'remove-emojis', label: 'Remove Emojis', category: 'remove', apply: removeEmojis },
  { id: 'remove-html-tags', label: 'Remove HTML Tags', category: 'remove', apply: removeHtmlTags },
  { id: 'remove-urls', label: 'Remove URLs', category: 'remove', apply: removeUrls },
];

export function operationById(id) {
  return OPERATIONS.find((op) => op.id === id);
}

// Runs an ordered pipeline of { opId, params? } steps against the
// original text. `find-replace` is the one step type with params — every
// other step is one of the parameterless OPERATIONS above. Returns the
// final text plus, per step, the text right after that step (used for
// the "highlight changes" preview) without ever mutating the input.
export function applyPipeline(text, pipeline) {
  let current = text;
  const steps = [];
  for (const step of pipeline) {
    if (step.opId === 'find-replace') {
      current = findReplace(current, step.params);
    } else {
      const op = operationById(step.opId);
      if (op) current = op.apply(current);
    }
    steps.push(current);
  }
  return { result: current, steps };
}
