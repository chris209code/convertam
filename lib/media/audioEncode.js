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
