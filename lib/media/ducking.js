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

// ---- Shared core for Recording Studio's cross-track ducking and Voice
// Over's "duck the original video under narration" — both need "does THIS
// AudioBuffer have signal at this moment," not the pre-extracted-peaks
// lookup above (which is built for a different, already-analyzed-once
// pipeline). RMS is measured directly off raw channel data instead, since
// both callers already hold a decoded AudioBuffer in memory.

// A small RMS window (not peak) reads noticeably lower than the peak-based
// DUCK_THRESHOLD above for the same perceived loudness, so this gets its
// own, separately-tuned threshold rather than sharing that constant.
export const RMS_PRESENCE_THRESHOLD = 0.035;
// How many extra steps to keep the "signal present" state held after it
// actually drops — a natural short breath/pause in speech shouldn't pump
// the background volume back up and immediately back down.
const HOLD_STEPS = 4;

export function rmsWindowAt(channelData, sampleRate, timeSeconds, windowSeconds = 0.03) {
  const center = Math.floor(timeSeconds * sampleRate);
  const half = Math.floor((windowSeconds * sampleRate) / 2);
  const start = Math.max(0, center - half);
  const end = Math.min(channelData.length, center + half);
  if (end <= start) return 0;
  let sumSq = 0;
  for (let i = start; i < end; i++) sumSq += channelData[i] * channelData[i];
  return Math.sqrt(sumSq / (end - start));
}

// boolean[] "is signal present" -> boolean[] with HOLD_STEPS of trailing
// hold applied after each true run, so a duck curve built from this never
// pumps rapidly between words.
export function applyDuckHold(presentArray) {
  let holdRemaining = 0;
  return presentArray.map((isPresent) => {
    if (isPresent) { holdRemaining = HOLD_STEPS; return true; }
    if (holdRemaining > 0) { holdRemaining -= 1; return true; }
    return false;
  });
}

// boolean[] (after applyDuckHold) -> the actual gain multiplier curve to
// apply to whichever audio is being ducked.
export function presenceToGain(heldArray) {
  return heldArray.map((isPresent) => (isPresent ? DUCK_GAIN : 1));
}
