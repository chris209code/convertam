// Lazy-loaded, self-hosted ffmpeg.wasm wrapper — the app's one "produce a
// real MP4" backbone (see the approved architecture plan's §4). Never
// imported at the top of a page — only dynamically imported the moment a
// user clicks Burn Captions / Create Captioned Video / Audiogram, so it
// never affects initial page load for anyone who doesn't use those actions.
//
// Deliberately the single-threaded core (@ffmpeg/core, not @ffmpeg/core-mt):
// the multi-threaded core needs cross-origin-isolation (COOP/COEP) headers
// set site-wide, which this repo doesn't have today and which risks
// breaking unrelated embeds/ads/analytics elsewhere on the site if added
// carelessly. Single-threaded is slower but works everywhere with zero
// site-wide config changes — an explicit, disclosed tradeoff, not an
// oversight (see the plan's decision matrix).
//
// Core assets are self-hosted under /public/ffmpeg-core/ rather than
// loaded from a CDN — this session already hit a hard proxy block loading
// a CDN-hosted pdf.js worker earlier and had to self-host around it;
// self-hosting from the start avoids repeating that failure mode, and also
// means this works even for end users on networks that block cdnjs-style
// CDNs.

let ffmpegSingleton = null;
let loadingPromise = null;

async function getFFmpeg({ onLog } = {}) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ]);
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));

    const baseURL = '/ffmpeg-core';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })().catch((err) => {
    loadingPromise = null; // allow retry on next call rather than caching a permanent failure
    throw new FfmpegLoadError(err);
  });

  return loadingPromise;
}

export class FfmpegLoadError extends Error {
  constructor(cause) {
    super('Could not load the video rendering engine. Check your connection and try again.');
    this.cause = cause;
  }
}

export class FfmpegRenderError extends Error {
  constructor(message) {
    super(message || 'Rendering failed. Please try again with a shorter or smaller file.');
  }
}

export class FfmpegCancelledError extends Error {
  constructor() {
    super('Rendering was cancelled.');
  }
}

// Called by a user-initiated Cancel action. ffmpeg.wasm has no per-call abort
// token — terminate() is the only way to interrupt an in-flight exec(), and
// it kills the whole worker, so the singleton is dropped and the next render
// simply reloads a fresh core (same lazy-load path as the first-ever call).
export function terminateFFmpeg() {
  if (ffmpegSingleton) {
    try { ffmpegSingleton.terminate(); } catch { /* already gone */ }
  }
  ffmpegSingleton = null;
  loadingPromise = null;
}

export function randomName(ext) {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// Cleans up ffmpeg.wasm's in-memory virtual filesystem after every render —
// this is the "cleanup" step of the pipeline for the client-side render
// path; there is no server-side equivalent to clean up because nothing is
// ever written server-side for these operations (see the plan's §6).
async function cleanupFiles(ffmpeg, paths) {
  await Promise.all(paths.map((p) => ffmpeg.deleteFile(p).catch(() => {})));
}
export const cleanupVirtualFiles = cleanupFiles;

// Exposes the lazy-loaded ffmpeg singleton directly for callers that need
// to run several exec() calls across one render (lib/media/timelineRender.js's
// trim-then-concat pipeline) rather than the single self-contained
// operations below — same loader, same single-threaded self-hosted core,
// no second ffmpeg instance.
export async function getFFmpegHandle() {
  return getFFmpeg();
}

// WebM (from MediaRecorder, used by the audiogram/captioned-video pipeline)
// -> a genuine MP4 container, so output format is guaranteed regardless of
// which codecs the user's browser happened to support for MediaRecorder.
// crf is optional — omitted, every existing caller keeps ffmpeg's own
// default (23) unchanged. Passed by Video Editor's export quality setting:
// lower CRF = higher quality/larger file, higher CRF = smaller/lower
// quality, the same convention libx264 itself uses.
export async function remuxToMp4(webmBlob, { onProgress, crf } = {}) {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inName = randomName('webm');
  const outName = randomName('mp4');

  const progressHandler = onProgress ? ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))) : null;
  if (progressHandler) ffmpeg.on('progress', progressHandler);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(webmBlob));
    // 'ultrafast' rather than 'veryfast' — single-threaded ffmpeg.wasm
    // software encoding is already the slow part of this pipeline (see
    // videoCompose.js's resolution comment); the faster preset trades a
    // larger output file for meaningfully less wall-clock time, which
    // matters far more for an audiogram-style export than bitrate efficiency.
    const args = ['-i', inName, '-c:v', 'libx264', '-preset', 'ultrafast'];
    if (crf != null) args.push('-crf', String(crf));
    args.push('-c:a', 'aac', outName);
    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new FfmpegRenderError();
    const data = await ffmpeg.readFile(outName);
    return new Blob([data], { type: 'video/mp4' });
  } finally {
    if (progressHandler) ffmpeg.off('progress', progressHandler);
    await cleanupFiles(ffmpeg, [inName, outName]);
  }
}

// Burns styled subtitles (an ASS string from captions.js's transcriptToAss)
// directly into a video's pixels — the genuine "must contain the captions"
// requirement, not a preview-only overlay. ffmpeg.wasm's exec() takes an
// argv array, never a shell string, so there is no shell-injection surface
// here regardless of what the subtitle text contains.
//
// ffmpeg.wasm's virtual filesystem has no fontconfig database, so libass
// (the library backing the subtitles filter) cannot resolve a generic
// family name like "Arial" the way a real OS install would — without an
// explicit font, it silently burns zero visible glyphs while ffmpeg still
// reports success. fontsdir= points libass at a real font file (Liberation
// Sans, SIL OFL-licensed, bundled at public/fonts/) written into ffmpeg's
// filesystem first, so the family name in captions.js's ASS style actually
// resolves to real glyphs.
let fontLoadedPromise = null;
async function ensureFont(ffmpeg) {
  if (!fontLoadedPromise) {
    fontLoadedPromise = (async () => {
      const { fetchFile } = await import('@ffmpeg/util');
      await ffmpeg.writeFile('LiberationSans-Regular.ttf', await fetchFile('/fonts/LiberationSans-Regular.ttf'));
    })().catch((err) => {
      fontLoadedPromise = null;
      throw err;
    });
  }
  return fontLoadedPromise;
}

// cancelToken: optional { cancelled: bool }, set by the caller from a
// Cancel button. This function can't check it mid-exec() (ffmpeg.wasm has
// no abort signal for that) — the caller must also call terminateFFmpeg()
// to actually interrupt the run; this just makes the resulting rejection
// legible as an intentional cancellation rather than a real failure.
export async function burnAssSubtitles({ videoFile, assText, onProgress, cancelToken }) {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inName = randomName(videoFile.name.split('.').pop() || 'mp4');
  const assName = 'captions.ass';
  const outName = randomName('mp4');

  const progressHandler = onProgress ? ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))) : null;
  if (progressHandler) ffmpeg.on('progress', progressHandler);

  try {
    await ensureFont(ffmpeg);
    await ffmpeg.writeFile(inName, await fetchFile(videoFile));
    await ffmpeg.writeFile(assName, assText);
    // subtitles= filter burns the .ass file's own styling (font/size/
    // color/position/outline) into the video frames — not a plain,
    // unstyled drawtext loop. fontsdir=. tells libass to look for fonts in
    // ffmpeg's current virtual-FS working directory, where ensureFont()
    // just wrote LiberationSans-Regular.ttf.
    const code = await ffmpeg.exec(['-i', inName, '-vf', `subtitles=${assName}:fontsdir=.`, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'copy', outName]);
    if (code !== 0) throw new FfmpegRenderError('Could not burn captions into this video. It may use a codec this version doesn\'t support yet.');
    const data = await ffmpeg.readFile(outName);
    return new Blob([data], { type: 'video/mp4' });
  } catch (err) {
    if (cancelToken?.cancelled) throw new FfmpegCancelledError();
    throw err;
  } finally {
    if (progressHandler) ffmpeg.off('progress', progressHandler);
    await cleanupFiles(ffmpeg, [inName, assName, outName]);
  }
}

export function isFfmpegSupported() {
  return typeof WebAssembly !== 'undefined' && typeof MediaRecorder !== 'undefined';
}
