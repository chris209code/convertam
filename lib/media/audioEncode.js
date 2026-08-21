// Low-level Web Audio helpers shared by audio extraction (video -> WAV) and
// transcription prep (any audio -> compact 8kHz mono WAV for
// /api/media-transcribe). Kept dependency-free — no ffmpeg.wasm, no
// third-party encoder — because both use cases only need PCM WAV, which is
// a well-known, trivial-to-hand-write container: raw samples, a 44-byte
// header, no compression codec to implement.

// Decodes any file the browser's Web Audio API can handle (audio file, or
// a video file — decodeAudioData reads only the audio track of a video
// container in every browser tested) into an AudioBuffer. Rejects with a
// clear error rather than resolving with a low-quality guess when a file
// genuinely has no decodable audio.
export async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextClass();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer;
  } finally {
    ctx.close();
  }
}

// Mixes an AudioBuffer down to mono and resamples to targetSampleRate using
// OfflineAudioContext (the standard, dependency-free way to resample in a
// browser) — used both for "shrink to 8kHz for transcription" and, at a
// higher target rate, for "Extract Audio"'s quality-preserving WAV output.
export async function resampleToMono(audioBuffer, targetSampleRate) {
  if (audioBuffer.numberOfChannels === 1 && audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer.getChannelData(0);
  }
  const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(1, targetLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  const merger = offlineCtx.createChannelMerger(1);
  // Explicit mono downmix (average all input channels) rather than relying
  // on the audio graph's default channel-count reduction, which is not
  // guaranteed to average — connecting a multi-channel source straight
  // into a 1-channel destination via createChannelMerger + gain averaging
  // keeps this deterministic across browsers.
  if (audioBuffer.numberOfChannels > 1) {
    const splitter = offlineCtx.createChannelSplitter(audioBuffer.numberOfChannels);
    source.connect(splitter);
    const gain = 1 / audioBuffer.numberOfChannels;
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const g = offlineCtx.createGain();
      g.gain.value = gain;
      splitter.connect(g, ch);
      g.connect(offlineCtx.destination);
    }
  } else {
    source.connect(offlineCtx.destination);
  }
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

// Extracts a time-range sub-AudioBuffer, a plain data copy with no decode
// or resample work of its own — the building block chunked transcription
// uses to hand each chunk's window to resampleToMono() independently, as
// if it were its own short file. Uses the AudioBuffer constructor directly
// (supported in every browser this app already targets) rather than
// opening a throwaway AudioContext just to call createBuffer().
export function sliceAudioBuffer(audioBuffer, startSeconds, endSeconds) {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.ceil(endSeconds * sampleRate));
  const length = Math.max(1, endSample - startSample);
  const sliced = new AudioBuffer({ numberOfChannels: audioBuffer.numberOfChannels, length, sampleRate });
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    sliced.getChannelData(ch).set(audioBuffer.getChannelData(ch).subarray(startSample, startSample + length));
  }
  return sliced;
}

// Concatenates AudioBuffers back-to-back into one buffer — the building
// block "remove these ranges" (silence trimming) needs: keep-segments are
// sliced out via sliceAudioBuffer, then stitched together here so the cut
// points are seamless with no re-encode/decode round trip.
export function concatAudioBuffers(buffers) {
  const nonEmpty = buffers.filter((b) => b && b.length > 0);
  if (nonEmpty.length === 0) return buffers[0] || new AudioBuffer({ numberOfChannels: 1, length: 1, sampleRate: 44100 });
  const sampleRate = nonEmpty[0].sampleRate;
  const numberOfChannels = nonEmpty[0].numberOfChannels;
  const totalLength = nonEmpty.reduce((sum, b) => sum + b.length, 0);
  const out = new AudioBuffer({ numberOfChannels, length: totalLength, sampleRate });
  let offset = 0;
  nonEmpty.forEach((b) => {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      out.getChannelData(ch).set(b.getChannelData(Math.min(ch, b.numberOfChannels - 1)), offset);
    }
    offset += b.length;
  });
  return out;
}

// Cuts `removeRanges` (absolute seconds into `audioBuffer`, any order/
// overlap) out and stitches the remaining pieces back together —
// automatic silence removal's actual edit, used identically by Recording
// Studio (per clip, via audioTimeline.js's removeSilenceFromClip) and
// Voice Over (per take, directly). A short linear fade at every new join
// point prevents an audible click where two previously non-adjacent
// samples now touch.
const FADE_AT_CUT_SECONDS = 0.008;
export function removeRangesFromBuffer(audioBuffer, removeRanges) {
  const duration = audioBuffer.duration;
  const merged = removeRanges
    .map((r) => ({ start: Math.max(0, r.start), end: Math.min(duration, r.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start)
    .reduce((acc, r) => {
      const last = acc[acc.length - 1];
      if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
      else acc.push({ ...r });
      return acc;
    }, []);

  const keep = [];
  let cursor = 0;
  merged.forEach((r) => {
    if (r.start > cursor) keep.push({ start: cursor, end: r.start });
    cursor = Math.max(cursor, r.end);
  });
  if (cursor < duration) keep.push({ start: cursor, end: duration });
  if (keep.length === 0) return audioBuffer;

  const segments = keep.map((seg) => sliceAudioBuffer(audioBuffer, seg.start, seg.end));
  segments.forEach((seg, i) => {
    const fadeSamples = Math.min(Math.floor(FADE_AT_CUT_SECONDS * seg.sampleRate), Math.floor(seg.length / 2));
    if (fadeSamples <= 0) return;
    for (let ch = 0; ch < seg.numberOfChannels; ch++) {
      const data = seg.getChannelData(ch);
      if (i > 0) for (let j = 0; j < fadeSamples; j++) data[j] *= j / fadeSamples;
      if (i < segments.length - 1) for (let j = 0; j < fadeSamples; j++) data[data.length - 1 - j] *= j / fadeSamples;
    }
  });

  return concatAudioBuffers(segments);
}

// One chunk's worth of the transcription pipeline: slice a window out of an
// already-decoded AudioBuffer, then reuse the exact same resample+encode
// path fileToTranscribeWav uses for a whole file — so a file short enough
// to produce exactly one chunk is byte-for-byte identical to the
// pre-chunking single-request behavior.
export function sliceAndEncodeChunk(audioBuffer, startSeconds, endSeconds, sampleRate) {
  const sliced = sliceAudioBuffer(audioBuffer, startSeconds, endSeconds);
  return resampleToMono(sliced, sampleRate).then((samples) => ({ blob: pcmToWavBlob(samples, sampleRate), start: startSeconds, end: endSeconds }));
}

// Float32 PCM samples (range -1..1) -> a real WAV file Blob. Hand-written
// because the format is simple enough that a dependency would be overkill:
// a 44-byte RIFF/WAVE header followed by 16-bit signed little-endian PCM.
export function pcmToWavBlob(samples, sampleRate) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample; // mono
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// AudioBuffer -> a real WAV file Blob, preserving however many channels the
// buffer actually has (unlike pcmToWavBlob above, which is hard-coded mono
// for the transcription/extract-audio paths that never need stereo).
// Recording Studio's mixdown always renders a stereo AudioBuffer via
// OfflineAudioContext, so this is what makes a real stereo WAV export
// possible — no stereo WAV encoder existed in this codebase before it.
export function audioBufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * numChannels;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(audioBuffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function floatTo16BitPCM(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// AudioBuffer -> MP3 Blob via @breezystack/lamejs, a pure-JS (no WASM, no
// server round-trip) open-source encoder — loaded lazily via dynamic
// import() since it's only ever needed at export time, not on every page
// load. This is the only MP3 encoding path in the app; nothing sends audio
// to a paid transcoding service to produce this.
export async function encodeMp3FromAudioBuffer(audioBuffer, kbps = 128) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const encoder = new Mp3Encoder(numChannels, audioBuffer.sampleRate, kbps);
  const left = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const right = numChannels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : null;

  const blockSize = 1152; // lamejs's expected frame size
  const chunks = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const mp3buf = right
      ? encoder.encodeBuffer(leftChunk, right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(leftChunk);
    if (mp3buf.length > 0) chunks.push(mp3buf);
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);
  return new Blob(chunks, { type: 'audio/mpeg' });
}

// The one entry point transcription prep needs: any audio/video file ->
// a compact mono WAV at TRANSCRIBE_SAMPLE_RATE, small enough to inline as
// base64 within Vercel's request-body ceiling (see limits.js's own header
// comment for the exact math).
export async function fileToTranscribeWav(file, sampleRate) {
  const audioBuffer = await decodeAudioFile(file);
  const samples = await resampleToMono(audioBuffer, sampleRate);
  return { blob: pcmToWavBlob(samples, sampleRate), durationSeconds: audioBuffer.duration };
}

// "Extract Audio" quality-preserving path: keeps the source's own sample
// rate (already mono-downmixed) rather than forcing a fixed rate, so the
// downloaded file isn't needlessly degraded from what the video actually had.
export async function fileToQualityWav(file) {
  const audioBuffer = await decodeAudioFile(file);
  const samples = await resampleToMono(audioBuffer, audioBuffer.sampleRate);
  return { blob: pcmToWavBlob(samples, audioBuffer.sampleRate), durationSeconds: audioBuffer.duration };
}
