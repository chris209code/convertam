// Splits cleaned page text into AI-sized chunks (~2,500 words each) without
// ever cutting mid-sentence, detects likely chapter/section headings, and
// groups pages into chapters from those headings for Chapter Summary mode.

export const MAX_CHAPTERS = 15;

const HEADING_PATTERNS = [
  /^(chapter|section|part)\s+\d+/i,
  /^\d+(\.\d+)*\s+[A-Z]/,
  /^[A-Z][A-Z\s]{3,59}$/, // short standalone ALL-CAPS line, e.g. "EXECUTIVE SUMMARY"
];

function looksLikeHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  return HEADING_PATTERNS.some((re) => re.test(trimmed));
}

// Returns [{ pageNumber, text }] for every line across all pages that looks
// like a section/chapter heading.
export function detectSections(pages) {
  const sections = [];
  for (const page of pages) {
    for (const line of page.text.split('\n')) {
      if (looksLikeHeading(line)) {
        sections.push({ pageNumber: page.number, text: line.trim() });
      }
    }
  }
  return sections;
}

function splitIntoParagraphs(pages) {
  // Each paragraph carries the page number it started on, so a chunk can
  // report which pages it actually covers.
  const paragraphs = [];
  for (const page of pages) {
    const blocks = page.text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      paragraphs.push({ pageNumber: page.number, text: block });
    }
  }
  return paragraphs;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Splits an over-long paragraph at sentence boundaries as a fallback — only
// triggers for genuinely huge single paragraphs (PDFs extracted without
// real paragraph breaks do happen).
function splitLongParagraph(text, targetWords) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const pieces = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && wordCount(current + sentence) > targetWords) {
      pieces.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

// Groups cleaned pages into chunks of roughly targetWords each, breaking at
// paragraph boundaries (never mid-sentence), and tags each chunk with the
// range of source pages it covers.
export function chunkText(pages, { targetWords = 2500 } = {}) {
  const paragraphs = splitIntoParagraphs(pages);
  const chunks = [];
  let currentTexts = [];
  let currentWords = 0;
  let currentPages = new Set();

  function flush() {
    if (currentTexts.length === 0) return;
    const pageNumbers = [...currentPages].sort((a, b) => a - b);
    chunks.push({
      text: currentTexts.join('\n\n'),
      startPage: pageNumbers[0],
      endPage: pageNumbers[pageNumbers.length - 1],
      wordCount: currentWords,
    });
    currentTexts = [];
    currentWords = 0;
    currentPages = new Set();
  }

  for (const paragraph of paragraphs) {
    const words = wordCount(paragraph.text);
    const pieces = words > targetWords ? splitLongParagraph(paragraph.text, targetWords) : [paragraph.text];
    for (const piece of pieces) {
      const pieceWords = wordCount(piece);
      if (currentWords > 0 && currentWords + pieceWords > targetWords) flush();
      currentTexts.push(piece);
      currentWords += pieceWords;
      currentPages.add(paragraph.pageNumber);
    }
  }
  flush();
  return chunks;
}

// Groups cleaned pages into chapters using detectSections' heading
// positions — each chapter runs from one heading's page up to (but not
// including) the next heading's page. Content before the first detected
// heading is dropped rather than invented into a fake "Introduction"
// chapter. Capped at MAX_CHAPTERS so a document with a heading-like line on
// nearly every page (false positives, or a genuinely heading-heavy
// document) can't balloon into dozens of per-chapter AI calls — callers
// should surface that cap to the user rather than silently truncating.
export function groupPagesByChapter(pages, sections) {
  if (!sections || sections.length === 0) return [];

  const seenPages = new Set();
  const boundaries = [];
  for (const s of sections) {
    if (seenPages.has(s.pageNumber)) continue; // one boundary per page, first heading wins
    seenPages.add(s.pageNumber);
    boundaries.push({ pageNumber: s.pageNumber, title: s.text });
  }
  boundaries.sort((a, b) => a.pageNumber - b.pageNumber);
  const capped = boundaries.slice(0, MAX_CHAPTERS);

  const lastPageNumber = pages[pages.length - 1]?.number ?? 0;
  const chapters = [];
  for (let i = 0; i < capped.length; i++) {
    const start = capped[i].pageNumber;
    const end = i + 1 < capped.length ? capped[i + 1].pageNumber - 1 : lastPageNumber;
    const chapterPages = pages.filter((p) => p.number >= start && p.number <= end);
    if (chapterPages.length === 0) continue;
    chapters.push({ title: capped[i].title, pages: chapterPages });
  }
  return chapters;
}
