// Silence detection — plain amplitude-threshold analysis over decoded
// audio, no AI involved. Returns candidate silent ranges for the caller to
// show the user for review; NEVER applies a cut on its own, matching this
// codebase's "never fabricate/never silently act" posture — a viewer's own
// judgment about what counts as "dead air worth cutting" varies too much to
// automate without a look.

import { decodeAudioFile } from './audioEncode';

// Named aggressiveness presets shared by every caller (Video Editor) so
// "how aggressive should this be" always means the same thing everywhere:
// Light only catches long, unambiguous dead air; Aggressive also catches
// ordinary short breathing pauses.
export const SILENCE_AGGRESSIVENESS = {
  light: { thresholdDb: -45, minSilenceMs: 700 },
  medium: { thresholdDb: -40, minSilenceMs: 400 },
  aggressive: { thresholdDb: -34, minSilenceMs: 200 },
};

// Buffer-based core — the actual analysis, reusable without a decode round
// trip whenever the caller already holds a decoded AudioBuffer (Recording
// Studio's clips and Voice Over's takes both do). sourceStart/sourceEnd
// bound the analysis to a clip/take's own trimmed range; thresholdDb is a
// standard dBFS silence threshold, minSilenceMs is the minimum stretch
// length worth flagging (shorter gaps are natural speech pauses, not
// "silence to remove").
export function detectSilenceInBuffer(audioBuffer, sourceStart, sourceEnd, { thresholdDb = -40, minSilenceMs = 400 } = {}) {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const startSample = Math.max(0, Math.floor(sourceStart * sampleRate));
  const endSample = Math.min(channelData.length, Math.floor(sourceEnd * sampleRate));
  const threshold = Math.pow(10, thresholdDb / 20); // dBFS -> linear amplitude
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.02)); // 20ms RMS windows
  const minSilenceSamples = Math.floor((minSilenceMs / 1000) * sampleRate);

  const ranges = [];
  let silenceStart = null;
  for (let i = startSample; i < endSample; i += windowSize) {
    const windowEnd = Math.min(endSample, i + windowSize);
    let sumSq = 0;
    for (let j = i; j < windowEnd; j++) sumSq += channelData[j] * channelData[j];
    const rms = Math.sqrt(sumSq / Math.max(1, windowEnd - i));
    const isSilent = rms < threshold;
    if (isSilent && silenceStart === null) {
      silenceStart = i;
    } else if (!isSilent && silenceStart !== null) {
      if (i - silenceStart >= minSilenceSamples) ranges.push({ start: silenceStart / sampleRate, end: i / sampleRate });
      silenceStart = null;
    }
  }
  if (silenceStart !== null && endSample - silenceStart >= minSilenceSamples) {
    ranges.push({ start: silenceStart / sampleRate, end: endSample / sampleRate });
  }
  return ranges;
}

// File-in convenience wrapper — what Video Editor's own clip inspector
// actually has (a File reference, not a pre-decoded buffer).
export async function detectSilence(file, sourceStart, sourceEnd, options = {}) {
  const audioBuffer = await decodeAudioFile(file);
  return detectSilenceInBuffer(audioBuffer, sourceStart, sourceEnd, options);
}
