// Parses an uploaded .srt/.vtt file's text into the SAME normalized
// { segments: [{ start, end, text }] } shape lib/media/captions.js's
// transcriptToAss (and the SRT/VTT/TXT exporters) already work with —
// this is the reverse of transcriptToSrt/transcriptToVtt. Feeding a
// parsed file straight into transcriptToAss is what lets "Burn Subtitles"
// reuse the exact same styled ffmpeg burn-in pipeline Auto Captions
// already uses, instead of a second, parallel rendering path.
//
// Deliberately tolerant, not strict: real-world .srt/.vtt files vary a lot
// (missing cue numbers, VTT cue identifiers/settings, WEBVTT NOTE/STYLE
// blocks, inline <b>/<i>/<v> tags) — this extracts every block that has a
// genuine "TIME --> TIME" line and treats everything after it, up to the
// next blank line, as that cue's text. Blocks without a timestamp line
// (the WEBVTT header, NOTE/STYLE blocks) are silently skipped rather than
// treated as errors.

const TIMESTAMP_LINE = /-->/;

// "HH:MM:SS,mmm" (SRT) or "HH:MM:SS.mmm" / "MM:SS.mmm" (VTT) -> seconds.
// Returns NaN for anything unparseable so the caller can skip that cue
// rather than silently invent a 0:00 timestamp.
function parseTimestamp(raw) {
  const clean = raw.trim().replace(',', '.');
  const parts = clean.split(':').map((p) => p.trim());
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (![h, m, s].every(Number.isFinite)) return NaN;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (![m, s].every(Number.isFinite)) return NaN;
    return m * 60 + s;
  }
  return NaN;
}

// Strips VTT/SRT inline markup (<b>, <i>, <u>, <v Speaker>, <c.class>,
// <00:00:01.000> karaoke timestamps) — a plain-text burn-in doesn't apply
// per-word styling, so these tags would otherwise show up as literal text.
function stripInlineTags(text) {
  return text.replace(/<[^>]*>/g, '');
}

function parseBlocks(text) {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.split(/\n\s*\n/).map((b) => b.split('\n')).filter((lines) => lines.some((l) => l.trim()));
}

function blocksToSegments(blocks) {
  const segments = [];
  for (const lines of blocks) {
    const timeLineIndex = lines.findIndex((l) => TIMESTAMP_LINE.test(l));
    if (timeLineIndex === -1) continue; // header/NOTE/STYLE block, or a cue with no timestamp line at all
    const [startRaw, endRawWithSettings] = lines[timeLineIndex].split('-->');
    const endRaw = (endRawWithSettings || '').trim().split(/\s+/)[0]; // drop trailing VTT cue settings (align:/line:/position:)
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const text = stripInlineTags(lines.slice(timeLineIndex + 1).join('\n')).trim();
    if (!text) continue;
    segments.push({ start, end, text });
  }
  segments.sort((a, b) => a.start - b.start);
  return segments;
}

export function parseSrt(text) {
  return { segments: blocksToSegments(parseBlocks(text)) };
}

export function parseVtt(text) {
  return { segments: blocksToSegments(parseBlocks(text)) };
}

// filename is used only as a hint when the content itself is ambiguous —
// the real signal is the WEBVTT header, since that's unambiguous and
// content-based detection shouldn't depend on a caller passing a filename
// at all (e.g. a renamed or extension-less file still parses correctly).
export function parseSubtitleFile(text, filename = '') {
  const looksLikeVtt = /^﻿?\s*WEBVTT/i.test(text) || /\.vtt$/i.test(filename);
  const { segments } = looksLikeVtt ? parseVtt(text) : parseSrt(text);
  // A .srt with a stray "WEBVTT"-less header or a .vtt someone saved with
  // an .srt extension both still parse fine either way, since both parsers
  // ultimately just look for "TIME --> TIME" lines — this fallback only
  // matters for the rare file that produced zero cues under the guessed
  // format (e.g. a VTT file misdetected as SRT because of a missing
  // header) by trying the other parser once before giving up.
  if (!segments.length) {
    const { segments: retrySegments } = looksLikeVtt ? parseSrt(text) : parseVtt(text);
    if (retrySegments.length) return { segments: retrySegments };
  }
  return { segments };
}
