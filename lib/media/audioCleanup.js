// Audio Cleanup — a single reusable client-side DSP engine shared by Audio
// Studio, Video Editor's per-clip audio controls, and Screen Recorder's
// microphone option, so there is exactly one implementation instead of
// three. Pure Web Audio API signal processing: no AI, no model download,
// no server, no ongoing cost — a highpass filter for rumble, notch filters
// for mains hum (both 50Hz and 60Hz plus their first harmonic, since the
// recording's origin isn't known ahead of time), an optional voice-
// presence EQ boost, an optional 3-band bass/mid/treble EQ, an optional
// dynamics compressor, an optional RMS-based loudness normalization pass,
// and a simple blockwise noise gate for quiet background hiss between
// speech.
//
// This is signal processing, not a learned denoiser — it genuinely
// reduces hum/rumble/hiss and evens out levels, but it does not (and does
// not claim to) surgically remove arbitrary background noise the way an
// ML model like RNNoise could. Every caller's UI copy should say
// "reduces," never "removes" or "eliminates."

const INTENSITY_PRESETS = {
  light: { highpassHz: 60, humQ: 8, gateThresholdDb: -52, gateReduction: 0.3 },
  medium: { highpassHz: 90, humQ: 12, gateThresholdDb: -45, gateReduction: 0.55 },
  strong: { highpassHz: 120, humQ: 18, gateThresholdDb: -38, gateReduction: 0.8 },
};

export const CLEANUP_INTENSITIES = ['light', 'medium', 'strong'];

const HUM_FREQUENCIES = [50, 60, 100, 120]; // both mains frequencies (50Hz EU/UK/etc, 60Hz US/etc) plus each one's first harmonic

// Builds the filter chain (highpass + hum notches + optional voice
// presence EQ) onto `inputNode` within `ctx`, returning the final node to
// connect onward. Deliberately the ONE place this graph is assembled —
// used identically by cleanAudioBuffer's OfflineAudioContext below and by
// Screen Recorder's LIVE microphone graph (a real-time AudioContext),
// since a BiquadFilterNode chain behaves the same in both.
export function buildCleanupFilterChain(ctx, inputNode, { intensity = 'medium', reduceHum = true, voiceEnhance = false, eq = null, compress = false } = {}) {
  const preset = INTENSITY_PRESETS[intensity] || INTENSITY_PRESETS.medium;
  let node = inputNode;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = preset.highpassHz;
  node.connect(highpass);
  node = highpass;

  if (reduceHum) {
    for (const freq of HUM_FREQUENCIES) {
      const notch = ctx.createBiquadFilter();
      notch.type = 'notch';
      notch.frequency.value = freq;
      notch.Q.value = preset.humQ;
      node.connect(notch);
      node = notch;
    }
  }

  if (voiceEnhance) {
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3000; // consonant clarity / speech-presence band
    presence.Q.value = 1;
    presence.gain.value = 4;
    node.connect(presence);
    node = presence;

    const declutter = ctx.createBiquadFilter();
    declutter.type = 'lowshelf';
    declutter.frequency.value = 200;
    declutter.gain.value = -2; // trims a little low-end boxiness so the presence boost doesn't sound harsh
    node.connect(declutter);
    node = declutter;
  }

  if (eq && (eq.bass || eq.mid || eq.treble)) {
    node = buildEqChain(ctx, node, eq);
  }

  if (compress) {
    const compressor = ctx.createDynamicsCompressor();
    // A gentle, general-purpose "even things out" setting rather than a
    // hard limiter — brings loud peaks down without audibly squashing
    // normal speech, distinct from applyNormalization's single flat gain
    // (that just scales the whole buffer; this reacts moment-to-moment).
    compressor.threshold.value = -24;
    compressor.knee.value = 24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;
    node.connect(compressor);
    node = compressor;
  }

  return node;
}

// Basic 3-band EQ — low-shelf/peaking/high-shelf, each independently
// adjustable in dB. Split out from buildCleanupFilterChain since it's only
// wired in when at least one band is non-zero (see the `eq &&` guard
// above), same lazy-node-creation posture as every other stage in the chain.
function buildEqChain(ctx, inputNode, { bass = 0, mid = 0, treble = 0 }) {
  let node = inputNode;
  if (bass) {
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 150;
    bassFilter.gain.value = bass;
    node.connect(bassFilter);
    node = bassFilter;
  }
  if (mid) {
    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;
    midFilter.gain.value = mid;
    node.connect(midFilter);
    node = midFilter;
  }
  if (treble) {
    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 6000;
    trebleFilter.gain.value = treble;
    node.connect(trebleFilter);
    node = trebleFilter;
  }
  return node;
}

// Simple blockwise RMS-envelope gate over an already-rendered buffer — not
// a Web Audio graph node. Web Audio has no stock gate node, and a
// real-time one needs an AudioWorkletProcessor, which only earns its
// complexity for streaming audio; since the whole buffer already exists
// in memory here, a plain per-window RMS pass gets the same practical
// result (quiet stretches pulled down, not silenced outright — gentle
// reduction, never a hard cut that could clip a quiet word) with none of
// that async module-loading machinery.
function applyNoiseGate(buffer, thresholdDb, reduction) {
  const threshold = Math.pow(10, thresholdDb / 20);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.02)); // 20ms windows, matching silenceDetect.js's own convention
  const smoothing = 0.25; // how far gain moves toward its target each window — low value avoids audible "pumping" between words

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    let gain = 1;
    for (let i = 0; i < data.length; i += windowSize) {
      const end = Math.min(data.length, i + windowSize);
      let sumSq = 0;
      for (let j = i; j < end; j++) sumSq += data[j] * data[j];
      const rms = Math.sqrt(sumSq / Math.max(1, end - i));
      const targetGain = rms < threshold ? (1 - reduction) : 1;
      gain += (targetGain - gain) * smoothing;
      for (let j = i; j < end; j++) data[j] *= gain;
    }
  }
}

// Same -20 dBFS RMS convention as normalizeAudio.js, applied here across
// the WHOLE buffer (not a clip's trim range) since cleanup operates on a
// standalone file/render, not a timeline clip.
const TARGET_RMS_DB = -20;
function applyNormalization(buffer) {
  let sumSq = 0;
  let count = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) { sumSq += data[i] * data[i]; count++; }
  }
  if (!count) return;
  const rms = Math.sqrt(sumSq / count);
  if (rms <= 0) return;
  const gainDb = TARGET_RMS_DB - 20 * Math.log10(rms);
  const gain = Math.max(0.1, Math.min(4, Math.pow(10, gainDb / 20)));
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = Math.max(-1, Math.min(1, data[i] * gain));
  }
}

// options: { intensity: 'light'|'medium'|'strong', reduceHum, voiceEnhance, normalize }
// Returns a new AudioBuffer — the original is never mutated, so a caller
// can always offer a genuine Original <-> Cleaned comparison.
export async function cleanAudioBuffer(audioBuffer, options = {}) {
  const { intensity = 'medium', normalize = false } = options;
  const preset = INTENSITY_PRESETS[intensity] || INTENSITY_PRESETS.medium;

  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const output = buildCleanupFilterChain(offlineCtx, source, options);
  output.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();

  applyNoiseGate(rendered, preset.gateThresholdDb, preset.gateReduction);
  if (normalize) applyNormalization(rendered);

  return rendered;
}

// File-in, cleaned-WAV-Blob-out convenience wrapper — what Audio Studio's
// standalone panel and Video Editor's per-clip "Clean audio" action both
// actually need, so neither has to know about decodeAudioFile/pcmToWavBlob
// itself. Downmixes to mono on the way out, same quality-preserving-but-
// mono convention fileToQualityWav already uses for Extract Audio (a
// stereo WAV encoder doesn't exist in this codebase yet, and voice
// recordings — this feature's actual target — are commonly mono anyway).
//
// startSeconds/endSeconds are optional — when given (Video Editor passes
// a clip's own trim range), only that slice of the source is decoded and
// cleaned, so cleaning one clip's audio never touches the rest of a
// longer source file it was cut from.
export async function cleanAudioFile(file, options = {}) {
  const { decodeAudioFile, resampleToMono, pcmToWavBlob, sliceAudioBuffer } = await import('./audioEncode');
  let audioBuffer = await decodeAudioFile(file);
  if (Number.isFinite(options.startSeconds) && Number.isFinite(options.endSeconds)) {
    audioBuffer = sliceAudioBuffer(audioBuffer, options.startSeconds, options.endSeconds);
  }
  const cleaned = await cleanAudioBuffer(audioBuffer, options);
  const samples = await resampleToMono(cleaned, cleaned.sampleRate);
  const blob = pcmToWavBlob(samples, cleaned.sampleRate);
  return { blob, durationSeconds: cleaned.duration };
}
