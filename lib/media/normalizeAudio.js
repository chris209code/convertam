// Audio normalization — plain RMS-level analysis over decoded audio, no AI
// involved (same posture as silenceDetect.js). Computes a linear gain
// multiplier that would bring a clip's own audio, within its trim range, to
// a fixed target loudness — the caller applies it via timeline.js's
// setClipGain rather than this module touching timeline state itself.

import { decodeAudioFile } from './audioEncode';

// -20 dBFS RMS is a conventional "comfortable, not peaking" target for
// general speech/video content — not true LUFS loudness (which needs
// perceptual weighting this module deliberately doesn't implement), but a
// reasonable, explainable approximation for "make this clip's volume match
// the others" without pulling in a full loudness-measurement library.
const TARGET_RMS_DB = -20;

export async function computeNormalizationGain(file, sourceStart, sourceEnd) {
  const audioBuffer = await decodeAudioFile(file);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(sourceStart * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.ceil(sourceEnd * sampleRate));
  if (endSample <= startSample) return 1;

  let sumSquares = 0;
  let count = 0;
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = startSample; i < endSample; i++) {
      sumSquares += data[i] * data[i];
      count++;
    }
  }
  if (!count) return 1;
  const rms = Math.sqrt(sumSquares / count);
  if (rms <= 0) return 1; // silent range — nothing to normalize against

  const currentDb = 20 * Math.log10(rms);
  const gainDb = TARGET_RMS_DB - currentDb;
  const gain = Math.pow(10, gainDb / 20);
  // Clamped to setClipGain's own range — an extreme swing (near-silent or
  // already-clipping source) would just amplify noise or distortion rather
  // than produce something actually more listenable.
  return Math.max(0.1, Math.min(4, gain));
}
