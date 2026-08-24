// Client-side metadata extraction — no server round-trip, no FFmpeg. Uses
// only native <audio>/<video> element APIs and Web Audio's decodeAudioData.
// Fields the browser genuinely cannot expose reliably (bitrate, fps, codec)
// are returned as null/estimated rather than guessed at, per the spec's own
// "where available" language — the UI is responsible for showing "—" or an
// "(estimated)" label for those, never a fabricated-looking number.

function loadMediaElement(file, tag) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    const url = URL.createObjectURL(file);
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => resolve({ el, url });
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this file. It may be corrupted or in an unsupported format.')); };
  });
}

function extToFormat(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return ext || null;
}

export async function extractAudioMetadata(file) {
  const { el, url } = await loadMediaElement(file, 'audio');
  const duration = el.duration;
  URL.revokeObjectURL(url);

  let sampleRate = null;
  let channels = null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    sampleRate = audioBuffer.sampleRate;
    channels = audioBuffer.numberOfChannels;
    ctx.close();
  } catch {
    // decodeAudioData failing doesn't necessarily mean the file is
    // unusable — <audio> already got a duration above — just that the
    // browser can't (or won't, e.g. some DRM/streaming-only codecs)
    // decode it into raw samples for detailed inspection. Fields stay null.
  }

  return {
    fileName: file.name,
    sizeBytes: file.size,
    format: extToFormat(file.name),
    duration: Number.isFinite(duration) ? duration : null,
    sampleRate,
    channels,
    // Bitrate isn't a metadata field the browser exposes — this is a
    // derived estimate (file size / duration), labeled as such wherever
    // it's shown, never presented as the file's real encoded bitrate.
    estimatedBitrateKbps: Number.isFinite(duration) && duration > 0 ? Math.round((file.size * 8) / duration / 1000) : null,
  };
}

export async function extractVideoMetadata(file) {
  const { el, url } = await loadMediaElement(file, 'video');
  const duration = el.duration;
  const width = el.videoWidth || null;
  const height = el.videoHeight || null;
  URL.revokeObjectURL(url);

  let hasAudio = null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    // A successful decode with real, non-silent-length data means there is
    // a decodable audio track. A short/zero-length result is treated the
    // same as "no audio track" — this is a best-effort check, not a
    // guaranteed container-level answer (no demuxer is used), consistent
    // with this module's honesty policy on unavailable fields.
    hasAudio = audioBuffer.length > 0;
    ctx.close();
  } catch {
    hasAudio = false;
  }

  return {
    fileName: file.name,
    sizeBytes: file.size,
    format: extToFormat(file.name),
    duration: Number.isFinite(duration) ? duration : null,
    width,
    height,
    aspectRatio: width && height ? +(width / height).toFixed(3) : null,
    hasAudio,
    // Not reliably exposed by any standard browser API without a real
    // demuxer — left null rather than guessed, per spec's "where available"
    // requirement for fps/codec.
    fps: null,
    videoCodec: null,
    audioCodec: null,
  };
}

// Duration + dimensions only — skips extractVideoMetadata's own audio-track
// probe above, which decodes the ENTIRE audio track into memory via
// decodeAudioData. Used by Compress & Split Video, whose files can be up to
// 2GB, where that full decode would be slow and memory-heavy for no benefit
// this tool actually needs — compressing or splitting always keeps whatever
// audio track exists, regardless of whether one was detected up front.
export async function extractVideoBasicMetadata(file) {
  const { el, url } = await loadMediaElement(file, 'video');
  const duration = el.duration;
  const width = el.videoWidth || null;
  const height = el.videoHeight || null;
  URL.revokeObjectURL(url);
  return {
    fileName: file.name,
    sizeBytes: file.size,
    format: extToFormat(file.name),
    duration: Number.isFinite(duration) ? duration : null,
    width,
    height,
  };
}

// Static image metadata for overlay sources — no duration, no audio, just
// pixel dimensions via the native Image element (no decode library needed).
export async function extractImageMetadata(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image file. It may be corrupted or in an unsupported format.'));
      el.src = url;
    });
    const width = img.naturalWidth || null;
    const height = img.naturalHeight || null;
    return {
      fileName: file.name,
      sizeBytes: file.size,
      format: extToFormat(file.name),
      width,
      height,
      aspectRatio: width && height ? +(width / height).toFixed(3) : null,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Same as formatDuration but keeps one decimal place (tenths of a second),
// e.g. "0:16.3" — needed anywhere the reader is aiming for an exact split
// point rather than just glancing at roughly where playback is.
export function formatDurationPrecise(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  // Round to the nearest tenth first so a value like 69.98s becomes exactly
  // 70.0s before splitting into minutes/seconds — otherwise rounding each
  // part separately can print a bogus "1:60.0" instead of carrying to "1:10.0".
  const total = Math.round(Math.max(0, seconds) * 10) / 10;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const secStr = s.toFixed(1).padStart(4, '0');
  return h > 0 ? `${h}:${pad(m)}:${secStr}` : `${m}:${secStr}`;
}
