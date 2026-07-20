// Pure, single-pass-per-metric text statistics — no state, reusable by
// any future tool that needs the same numbers (word/character counts are
// exactly the kind of thing a CSV/JSON cleaner would also want).

function num(v) {
  return Number.isFinite(v) ? v : 0;
}

export function computeStats(text) {
  if (!text) {
    return {
      characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, paragraphs: 0, sentences: 0,
      readingTimeSec: 0, speakingTimeSec: 0, avgWordLength: 0, longestLine: 0, shortestLine: 0,
    };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  const lineArr = text.split('\n');
  const lines = lineArr.length;

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length;
  // .split() on a plain (non-negated) character class, not .match() on a
  // "[^x]* then require x" pattern — the latter forces the backtracking
  // engine to retry every possible split point when a huge input has few
  // or no sentence-ending characters, which is effectively O(n^2) and is
  // exactly what froze the page on a 100,000+ line, punctuation-free
  // input during testing.
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim() !== '').length;

  // 200 wpm reading, 130 wpm speaking — commonly cited averages.
  const readingTimeSec = Math.round((words / 200) * 60);
  const speakingTimeSec = Math.round((words / 130) * 60);

  const avgWordLength = words > 0 ? charactersNoSpaces / words : 0;

  let longestLine = 0;
  let shortestLine = lineArr.length > 0 ? Infinity : 0;
  for (const l of lineArr) {
    if (l.length > longestLine) longestLine = l.length;
    if (l.length < shortestLine) shortestLine = l.length;
  }
  if (!Number.isFinite(shortestLine)) shortestLine = 0;

  return {
    characters: num(characters), charactersNoSpaces: num(charactersNoSpaces),
    words: num(words), lines: num(lines), paragraphs: num(paragraphs), sentences: num(sentences),
    readingTimeSec: num(readingTimeSec), speakingTimeSec: num(speakingTimeSec),
    avgWordLength: num(avgWordLength), longestLine: num(longestLine), shortestLine: num(shortestLine),
  };
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} sec`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min} min ${sec} sec` : `${min} min`;
}
