// Audio ducking — automatically lowers a mixed-in background/replacement
// track's volume while a clip's OWN audio has signal (e.g. voice recorded
// over background music), so the two don't fight for attention. Plain
// amplitude-threshold analysis over already-extracted waveform peaks (see
// lib/media/waveform.js's extractWaveformPeaks — reused rather than
// re-decoding the same audio a second time), no AI involved, same posture
// as silenceDetect.js and normalizeAudio.js.

// Peaks below this linear amplitude count as "silent" (foreground has
// nothing to protect) — conservative enough to sit above typical room-tone
// noise floor without triggering on it.
const DUCK_THRESHOLD = 0.08;
// Background multiplier while the foreground has signal (~-12dB) — audible
// but not silenced, so a brief pause in speech doesn't make the music
// vanish and reappear jarringly.
export const DUCK_GAIN = 0.25;

// peaks is a fixed-length array covering the WHOLE source file (see
// extractWaveformPeaks), sourceDuration is that file's total duration —
// together they let any absolute source-relative time be mapped to a peak
// bucket. Returns 1 (no ducking) or DUCK_GAIN (background lowered).
export function duckGainAtTime(peaks, sourceDuration, sourceTimeSeconds) {
  if (!Array.isArray(peaks) || !peaks.length || !sourceDuration) return 1;
  const idx = Math.max(0, Math.min(peaks.length - 1, Math.floor((sourceTimeSeconds / sourceDuration) * peaks.length)));
  return peaks[idx] > DUCK_THRESHOLD ? DUCK_GAIN : 1;
}
