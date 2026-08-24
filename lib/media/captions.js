// Caption engine — transcript segments -> caption cues -> SRT / VTT / ASS
// (the last for burn-in styling via ffmpegClient.js's subtitle filter).
// Pure functions, no AI, no media processing — everything here is string
// templating and interval arithmetic.

const DEFAULT_MAX_CHARS_PER_LINE = 42; // a common, readable subtitle-line convention
const DEFAULT_MAX_LINES_PER_CUE = 2;
const DEFAULT_MIN_CUE_SECONDS = 0.8;

// Greedy word-wrap into at most maxLines lines of at most maxCharsPerLine —
// if the text genuinely doesn't fit, the last line is allowed to overflow
// rather than silently dropping words (never lose transcript content).
function wrapText(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        // Last allowed line — everything remaining goes here, even if long.
        const restIdx = words.indexOf(word);
        current = words.slice(restIdx).join(' ');
        lines.push(current);
        return lines;
      }
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Splits one transcript segment into one or more caption cues when its text
// is too long for maxLinesPerCue lines. Time is divided proportionally by
// character count across cues — an approximation (matches the same
// documented tradeoff as transcript.js's splitSegment), not exact word-level
// timing, since V1 has no word-level timestamps to divide by instead.
function segmentToCues(segment, opts) {
  const { maxCharsPerLine, maxLinesPerCue, minCueSeconds } = opts;
  const maxCharsPerCue = maxCharsPerLine * maxLinesPerCue;
  if (segment.text.length <= maxCharsPerCue) {
    return [{ start: segment.start, end: Math.max(segment.end, segment.start + minCueSeconds), lines: wrapText(segment.text, maxCharsPerLine, maxLinesPerCue) }];
  }

  // Split the segment's text at word boundaries into maxCharsPerCue-sized
  // chunks, then divide the segment's time range proportionally.
  const words = segment.text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerCue && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
  const totalDuration = segment.end - segment.start;
  let elapsed = 0;
  return chunks.map((chunk) => {
    const share = (chunk.length / totalChars) * totalDuration;
    const start = segment.start + elapsed;
    elapsed += share;
    const end = segment.start + elapsed;
    return { start, end: Math.max(end, start + minCueSeconds), lines: wrapText(chunk, maxCharsPerLine, maxLinesPerCue) };
  });
}

export function transcriptToCaptionCues(transcript, options = {}) {
  const opts = {
    maxCharsPerLine: options.maxCharsPerLine ?? DEFAULT_MAX_CHARS_PER_LINE,
    maxLinesPerCue: options.maxLinesPerCue ?? DEFAULT_MAX_LINES_PER_CUE,
    minCueSeconds: options.minCueSeconds ?? DEFAULT_MIN_CUE_SECONDS,
  };
  const cues = [];
  for (const segment of transcript.segments) {
    if (!segment.text.trim()) continue;
    cues.push(...segmentToCues(segment, opts));
  }
  // Guard against overlap that could result from the minCueSeconds floor
  // pushing one cue's end past the next cue's start.
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i].end > cues[i + 1].start) cues[i].end = cues[i + 1].start;
  }
  return cues;
}

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

export function formatSrtTimestamp(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms, 3)}`;
}

export function formatVttTimestamp(seconds) {
  return formatSrtTimestamp(seconds).replace(',', '.');
}

function formatAssTimestamp(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${pad(m)}:${pad(sec)}.${pad(cs)}`;
}

export function transcriptToSrt(transcript, options) {
  const cues = transcriptToCaptionCues(transcript, options);
  return cues
    .map((cue, i) => `${i + 1}\n${formatSrtTimestamp(cue.start)} --> ${formatSrtTimestamp(cue.end)}\n${cue.lines.join('\n')}\n`)
    .join('\n')
    .trim() + '\n';
}

export function transcriptToVtt(transcript, options) {
  const cues = transcriptToCaptionCues(transcript, options);
  const body = cues
    .map((cue) => `${formatVttTimestamp(cue.start)} --> ${formatVttTimestamp(cue.end)}\n${cue.lines.join('\n')}\n`)
    .join('\n')
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

// #RRGGBB -> ASS's &H(AA)BBGGRR hex, alpha byte 00 = fully opaque (ASS
// alpha is inverted relative to CSS: 00=opaque, FF=transparent).
function hexToAssColor(hex, opacity = 1) {
  const clean = (hex || '#FFFFFF').replace('#', '');
  const r = clean.substring(0, 2) || 'FF';
  const g = clean.substring(2, 4) || 'FF';
  const b = clean.substring(4, 6) || 'FF';
  const alpha = pad(Math.round((1 - opacity) * 255).toString(16), 2).toUpperCase();
  return `&H${alpha}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

// One sane default style for V1 — full customization (fonts/colors/
// position/presets) is explicitly P1 per the plan; this is enough to make
// "Video caption burn-in" (a P0 requirement) genuinely styled and readable,
// not a placeholder.
// fontFamily must match a family libass can actually resolve inside
// ffmpeg.wasm's sandboxed filesystem — there is no fontconfig database in
// that environment, so a generic name like "Arial" silently resolves to
// nothing and the subtitles filter burns zero visible glyphs (ffmpeg still
// reports success, since the encode itself works fine — only the text is
// missing). "Liberation Sans" is the actual family name embedded in the
// bundled public/fonts/LiberationSans-Regular.ttf that ffmpegClient.js
// explicitly loads into ffmpeg's filesystem via fontsdir= before burning.
export const DEFAULT_CAPTION_STYLE = {
  fontFamily: 'Liberation Sans',
  fontSize: 28,
  color: '#FFFFFF',
  outlineColor: '#000000',
  backgroundOpacity: 0, // 0 = outline-only (classic subtitle look), no background box
  position: 'bottom', // 'bottom' | 'top' | 'middle'
};

// ---- Canvas-drawn captions (compositionLayouts.js's drawCaptions) — unlike
// the ASS/SRT/VTT export helpers above, which wrap text into fixed-width
// lines up front (a constraint of those file formats), the canvas renderer
// wraps text itself at draw time based on the user's own chosen box width.
// What it needs from here is each spoken chunk's RAW text plus, for word-
// by-word/karaoke highlighting, a per-word timestamp — not pre-wrapped
// lines. ----

// Splits `text` into words and distributes [start,end) across them
// proportionally by character count — the same documented approximation
// segmentToCues (above) and transcript.js's splitSegment already use
// elsewhere in this codebase for the same reason: V1 has no real per-word
// ASR timestamps to divide by instead (see transcript.js's own comment on
// segment.words always being null in V1).
export function synthesizeWordTimings(text, start, end) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;
  const duration = Math.max(0, end - start);
  let elapsed = 0;
  return words.map((word) => {
    const share = (word.length / totalChars) * duration;
    const wordStart = start + elapsed;
    elapsed += share;
    return { text: word, start: wordStart, end: start + elapsed };
  });
}

// Normalizes either caption source — a transcript from Auto Captions
// ({ segments: [{ start, end, text, words }] }), or a parsed .srt/.vtt from
// Burn Subtitles ({ segments: [{ start, end, text }] }, see
// subtitleParse.js) — into one shared shape for the canvas renderer:
// [{ start, end, text, words }]. Real word timestamps are used as-is
// whenever a segment already has them; otherwise words are synthesized so
// word-by-word/karaoke highlighting always has something to animate
// against, even if only an approximation.
export function getCaptionEvents(source) {
  if (!source?.segments?.length) return [];
  return source.segments
    .filter((s) => s.text?.trim())
    .map((s) => {
      const text = s.text.trim();
      return {
        start: s.start,
        end: s.end,
        text,
        words: (Array.isArray(s.words) && s.words.length) ? s.words : synthesizeWordTimings(text, s.start, s.end),
      };
    });
}

export function findActiveCaptionEvent(events, timeSeconds) {
  return events.find((e) => timeSeconds >= e.start && timeSeconds < e.end) || null;
}

const ASS_ALIGNMENT = { bottom: 2, top: 8, middle: 5 };

// ASS/SSA subtitle file — the format ffmpeg's `subtitles=` filter uses to
// burn genuinely styled (font/size/color/outline/position) captions into
// video, rather than the plain, unstyled rendering ffmpeg gives a raw .srt.
export function transcriptToAss(transcript, style = DEFAULT_CAPTION_STYLE, options = {}) {
  const cues = transcriptToCaptionCues(transcript, options);
  const primaryColor = hexToAssColor(style.color, 1);
  const outlineColor = hexToAssColor(style.outlineColor, 1);
  const backColor = hexToAssColor('#000000', 1 - (style.backgroundOpacity ?? 0));
  const alignment = ASS_ALIGNMENT[style.position] ?? 2;
  const borderStyle = (style.backgroundOpacity ?? 0) > 0 ? 3 : 1; // 3 = opaque box, 1 = outline+shadow

  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${primaryColor},${primaryColor},${outlineColor},${backColor},0,0,0,0,100,100,0,0,${borderStyle},2,1,${alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = cues
    .map((cue) => `Dialogue: 0,${formatAssTimestamp(cue.start)},${formatAssTimestamp(cue.end)},Default,,0,0,0,,${cue.lines.join('\\N')}`)
    .join('\n');

  return header + events + '\n';
}
