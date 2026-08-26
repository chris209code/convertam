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
// maxrateKbps is also optional, and independent of crf: CRF alone targets a
// *quality level*, not a size, so a visually busy canvas-composited source
// (overlays/transitions/captions/text — lots of per-frame noise a plain
// video camera never produces) can need a much higher bitrate to hit the
// same CRF than typical footage does, which is exactly what let a Video
// Editor export's real output balloon far past the size the UI had
// estimated. Passing maxrateKbps caps that: libx264's "constrained quality"
// mode (-crf plus -maxrate/-bufsize) keeps CRF's per-frame efficiency for
// easy content while hard-capping the bitrate for busy content, so the
// final file can't drift arbitrarily far from what was promised up front.
// fps is also optional but matters a lot: the source WebM comes from
// MediaRecorder capturing a canvas.captureStream(), whose frame timestamps
// are only APPROXIMATELY spaced at the requested rate — a real browser
// never emits perfectly even intervals. Without an explicit output -r,
// ffmpeg's frame-rate auto-detection picks up on whatever the single
// smallest gap between any two timestamps in the whole file happens to be
// and treats THAT as the nominal rate, then duplicate-pads every real frame
// out to fill it — one stray ~1ms-spaced pair (easily produced by a
// recorder hiccup) was enough to make every export from this pipeline get
// muxed as ~1000fps with the video padded to ~1000 frames per real second,
// which is both a container/player-compatibility risk and (far more
// consequentially) why re-encoding a normal video could take dramatically
// longer than its own runtime: the single-threaded ffmpeg.wasm encoder was
// being handed 30-40x the real number of frames to process. Passing the
// capture's own intended fps here forces sane, correct CFR output instead.
export async function remuxToMp4(webmBlob, { onProgress, crf, maxrateKbps, fps } = {}) {
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
    // bufsize ~2x maxrate is the standard VBV buffer sizing for this mode —
    // small enough to keep the cap meaningful over short spans, large
    // enough not to force needless quality loss on brief complex bursts.
    if (maxrateKbps != null) args.push('-maxrate', `${maxrateKbps}k`, '-bufsize', `${maxrateKbps * 2}k`);
    // An output -r conforms the stream to real, constant frame timing —
    // see the fps comment above for why this can't just be left to ffmpeg's
    // own default detection.
    if (fps != null) args.push('-r', String(fps));
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

// Same CRF/resolution convention Video Editor's own export panel uses
// (lib/media/timelineRender.js's QUALITY_CRF/RESOLUTION_HEIGHT) — kept as a
// small local copy rather than importing from that file, since timelineRender
// is built around a whole Timeline object this tool has no reason to depend on.
const QUALITY_CRF = { small: 32, balanced: 23, high: 18 };
const RESOLUTION_HEIGHT = { '480p': 480, '720p': 720, '1080p': 1080 };

// Re-encodes a single video file at a lower resolution/quality — the "make
// this file smaller" half of the standalone Compress & Split tool. Unlike
// Video Editor's export, there's no timeline/composition to render, just one
// straight re-encode, so this is a much simpler wrapper than timelineRender.js.
export async function compressVideo({ videoFile, resolution, quality, onProgress, cancelToken }) {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inName = randomName(videoFile.name.split('.').pop() || 'mp4');
  const outName = randomName('mp4');

  const progressHandler = onProgress ? ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))) : null;
  if (progressHandler) ffmpeg.on('progress', progressHandler);

  const crf = QUALITY_CRF[quality] ?? QUALITY_CRF.balanced;
  const targetHeight = RESOLUTION_HEIGHT[resolution] || null; // null/'original' = keep source resolution

  try {
    await ffmpeg.writeFile(inName, await fetchFile(videoFile));
    const args = ['-i', inName];
    // -2 keeps width even (required by libx264's default chroma subsampling)
    // while scaling to the target height and preserving aspect ratio.
    if (targetHeight) args.push('-vf', `scale=-2:${targetHeight}`);
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-c:a', 'aac', outName);
    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new FfmpegRenderError('Could not compress this video. It may use a codec this version doesn\'t support yet.');
    const data = await ffmpeg.readFile(outName);
    return new Blob([data], { type: 'video/mp4' });
  } catch (err) {
    if (cancelToken?.cancelled) throw new FfmpegCancelledError();
    throw err;
  } finally {
    if (progressHandler) ffmpeg.off('progress', progressHandler);
    await cleanupFiles(ffmpeg, [inName, outName]);
  }
}

// Cuts one video file into consecutive fixed-length chunks via stream copy
// (-c copy) — no decode/re-encode, so this is fast and lossless even for a
// huge file. The tradeoff: -ss before -i seeks to the nearest keyframe at or
// before the requested start time rather than an exact frame, so a chunk's
// real boundary can land up to a couple of seconds off the requested one —
// disclosed in the UI rather than silently promising frame-exact cuts. Video
// Editor's own trim tool is the place for frame-accurate edits afterward;
// this tool's job is just getting a huge file down to postable-sized pieces.
export async function splitVideoIntoChunks({ videoFile, chunkSeconds, totalDurationSeconds, onProgress, cancelToken }) {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  // -c copy stream-copies the source codec unchanged, so the OUTPUT container
  // must be one that codec is actually valid in — a webm (VP8/VP9 + Opus)
  // source stream-copied into an .mp4 container fails outright, since MP4
  // doesn't support those codecs. Splitting always keeps the source's own
  // extension/container rather than hardcoding .mp4, exactly because this
  // is a lossless copy, not a re-encode that could target any container.
  const ext = (videoFile.name.split('.').pop() || 'mp4').toLowerCase();
  const inName = randomName(ext);
  const mimeType = videoFile.type || `video/${ext}`;
  const chunkCount = Math.max(1, Math.ceil(totalDurationSeconds / chunkSeconds));

  try {
    await ffmpeg.writeFile(inName, await fetchFile(videoFile));
    const chunks = [];
    for (let i = 0; i < chunkCount; i++) {
      if (cancelToken?.cancelled) throw new FfmpegCancelledError();
      const start = i * chunkSeconds;
      const outName = randomName(ext);
      const code = await ffmpeg.exec(['-ss', String(start), '-i', inName, '-t', String(chunkSeconds), '-c', 'copy', outName]);
      if (code !== 0) throw new FfmpegRenderError('Could not split this video. It may use a codec this version doesn\'t support yet.');
      const data = await ffmpeg.readFile(outName);
      chunks.push({ blob: new Blob([data], { type: mimeType }), ext });
      await cleanupFiles(ffmpeg, [outName]);
      onProgress?.((i + 1) / chunkCount);
    }
    return chunks;
  } catch (err) {
    if (cancelToken?.cancelled) throw new FfmpegCancelledError();
    throw err;
  } finally {
    await cleanupFiles(ffmpeg, [inName]);
  }
}

// Keeps only the given time ranges of a video and stitches the kept parts
// back into one file, in order — the "point A to point B" / "mark where to
// cut and drop the part I don't want" manual trim mode. Same -c copy stream
// approach as splitVideoIntoChunks (fast, lossless, keyframe-snapped cuts,
// source's own container/codec preserved) but adds a concat step to rejoin
// the kept ranges when there's more than one — a plain -ss/-t extract only
// covers a single kept range.
export async function trimVideoBySegments({ videoFile, keepSegments, onProgress, cancelToken }) {
  if (!keepSegments?.length) throw new FfmpegRenderError('No part of the video was kept.');
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const ext = (videoFile.name.split('.').pop() || 'mp4').toLowerCase();
  const inName = randomName(ext);
  const mimeType = videoFile.type || `video/${ext}`;
  const needsConcat = keepSegments.length > 1;
  const totalSteps = keepSegments.length + (needsConcat ? 1 : 0);
  const partNames = [];
  let outName;

  try {
    await ffmpeg.writeFile(inName, await fetchFile(videoFile));
    for (let i = 0; i < keepSegments.length; i++) {
      if (cancelToken?.cancelled) throw new FfmpegCancelledError();
      const { start, end } = keepSegments[i];
      const partName = randomName(ext);
      const code = await ffmpeg.exec(['-ss', String(start), '-i', inName, '-t', String(Math.max(0.05, end - start)), '-c', 'copy', partName]);
      if (code !== 0) throw new FfmpegRenderError('Could not trim this video. It may use a codec this version doesn\'t support yet.');
      partNames.push(partName);
      onProgress?.((i + 1) / totalSteps);
    }

    outName = partNames[0];
    if (needsConcat) {
      if (cancelToken?.cancelled) throw new FfmpegCancelledError();
      const listName = 'concat-list.txt';
      await ffmpeg.writeFile(listName, partNames.map((n) => `file '${n}'`).join('\n'));
      outName = randomName(ext);
      const code = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', listName, '-c', 'copy', outName]);
      await cleanupFiles(ffmpeg, [listName]);
      if (code !== 0) throw new FfmpegRenderError('Could not stitch the kept parts of this video back together.');
      onProgress?.(1);
    }

    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([data], { type: mimeType });
    await cleanupFiles(ffmpeg, needsConcat ? [...partNames, outName] : partNames);
    return { blob, ext };
  } catch (err) {
    await cleanupFiles(ffmpeg, needsConcat ? [...partNames, outName] : partNames);
    if (cancelToken?.cancelled) throw new FfmpegCancelledError();
    throw err;
  } finally {
    await cleanupFiles(ffmpeg, [inName]);
  }
}

export function isFfmpegSupported() {
  return typeof WebAssembly !== 'undefined' && typeof MediaRecorder !== 'undefined';
}
