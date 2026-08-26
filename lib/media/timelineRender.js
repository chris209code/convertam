// Timeline export pipeline — turns a lib/media/timeline.js timeline into a
// real, playable MP4. Two genuinely different strategies depending on what
// the timeline actually needs, picked automatically (never fakes one with
// the other):
//
// - Simple (single track, no overlay): trims each clip with ffmpeg
//   (frame-accurate re-encode, since arbitrary user split points won't
//   land on keyframes) and concatenates them — the same ffmpeg.wasm engine
//   already used and verified for caption burn-in, no new dependency.
// - Composed (split-screen / picture-in-picture): extends
//   renderCaptionedVideo.js's exact canvas+MediaRecorder+remux pattern —
//   compositionLayouts.js's drawCompositionFrame is the same function
//   driving both the live preview and this export capture, so preview
//   never drifts from the exported file.

import { getTrackClips, findActiveClipAt, getTotalDuration, getMasterGain, MAIN_TRACK, clipDuration, BLEND_TRANSITION_TYPES, isOverlayTrackAudible, isSoundTrackAudible } from './timeline';
import { drawCompositionFrame, drawTextOverlays, drawImageOverlays, drawShapeOverlays, drawWatermark, drawMasterFade, drawCaptions, getComposeSize, getFadeOpacity, buildCutoutCanvas } from './compositionLayouts';
import { findActiveCaptionEvent } from './captions';
import { validateRenderDuration } from './limits';
import { duckGainAtTime } from './ducking';
import { ensureSegmenterLoaded, getPersonMaskCanvas } from './segmentation';
import { QUALITY_CRF, TARGET_VIDEO_KBPS } from './exportQuality';

const RESOLUTION_HEIGHT = { '480p': 480, '720p': 720, '1080p': 1080 };
// See exportQuality.js — 1.4x headroom over the UI's own size-estimate
// target lets CRF's per-frame efficiency still apply to easy content
// without letting a busy composited scene run away unbounded.
function maxrateKbpsFor(timeline) {
  const target = TARGET_VIDEO_KBPS[timeline.exportResolution]?.[timeline.exportQuality] ?? TARGET_VIDEO_KBPS['720p'].balanced;
  return Math.round(target * 1.4);
}

export class TimelineRenderError extends Error {
  constructor(message) {
    super(message || 'Could not export this timeline. Please try again.');
  }
}

// Thrown (not silently swallowed) when a caller-supplied cancelToken —
// { cancelled: bool } — is flipped mid-render, same convention as
// ffmpegClient.js's FfmpegCancelledError for burn-captions; callers should
// catch this specifically and treat it as "the user stopped this," not as
// a real failure.
export class TimelineRenderCancelledError extends Error {
  constructor() {
    super('Export cancelled.');
  }
}

export function isTimelineExportSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined'
  );
}

function pickMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

function pickAudioMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

// ---------------------------------------------------------------------
// Simple path: trim + concat via ffmpeg (no overlay track)
// ---------------------------------------------------------------------

export async function renderSimpleTimeline(timeline, { onStatus, onProgress, cancelToken }) {
  const { getFFmpegHandle, randomName, cleanupVirtualFiles } = await import('./ffmpegClient');
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpegHandle();

  const clips = getTrackClips(timeline, MAIN_TRACK);
  if (!clips.length) throw new TimelineRenderError('Add at least one clip to the timeline before exporting.');

  const totalDuration = getTotalDuration(timeline);
  const durationError = validateRenderDuration(totalDuration);
  if (durationError) throw new TimelineRenderError(durationError);

  // A 'replace'/'mix' clip counts as having audio for stream-consistency
  // purposes below regardless of whether its own source has an audio track.
  const clipHasOwnAudio = (clip, source) => clip.audioMode === 'keep' && source?.hasAudio;
  const clipHasReplacementAudio = (clip) => (clip.audioMode === 'replace' || clip.audioMode === 'mix') && clip.audioSourceId;
  const anyAudio = clips.some((c) => clipHasOwnAudio(c, timeline.sources.find((s) => s.id === c.sourceId)) || clipHasReplacementAudio(c));

  onStatus?.('preparing');
  const segmentNames = [];
  const writtenSourceFiles = new Map(); // sourceId -> ffmpeg filename, so a re-used source isn't re-uploaded per clip
  const crf = QUALITY_CRF[timeline.exportQuality] ?? QUALITY_CRF.balanced;
  const maxrateKbps = maxrateKbpsFor(timeline);
  const maxrateArgs = ['-maxrate', `${maxrateKbps}k`, '-bufsize', `${maxrateKbps * 2}k`];
  const targetHeight = RESOLUTION_HEIGHT[timeline.exportResolution] ?? RESOLUTION_HEIGHT['720p'];
  // 'min(ih,N)' never upscales a source shorter than the target — this
  // path only ever runs for a single, un-reframed video (see
  // renderTimeline()'s dispatch), so there's no fixed target frame to fill
  // the way the composed canvas has; capping height while preserving the
  // source's own aspect ratio is the honest equivalent for a straight trim.
  const scaleFilter = `scale=-2:'min(ih,${targetHeight})'`;
  // Omitted entirely (not just set to some detected value) when 'original'
  // — ffmpeg's own default, with no -r flag at all, is to preserve the
  // source's rate exactly, which is the correct "original fps" behavior
  // without this module needing to actually know that number.
  const fpsArgs = timeline.exportFps && timeline.exportFps !== 'original' ? ['-r', String(timeline.exportFps)] : [];

  try {
    for (let i = 0; i < clips.length; i++) {
      if (cancelToken?.cancelled) throw new TimelineRenderCancelledError();
      const clip = clips[i];
      const source = timeline.sources.find((s) => s.id === clip.sourceId);
      if (!source) continue;

      let inName = writtenSourceFiles.get(source.id);
      if (!inName) {
        inName = randomName((source.file.name.split('.').pop() || 'mp4'));
        await ffmpeg.writeFile(inName, await fetchFile(source.file));
        writtenSourceFiles.set(source.id, inName);
      }

      const outName = randomName('mp4');
      const hasOwnAudio = clipHasOwnAudio(clip, source);
      const replacementSource = clipHasReplacementAudio(clip) ? timeline.sources.find((s) => s.id === clip.audioSourceId) : null;
      const clipLenSeconds = clip.sourceEnd - clip.sourceStart;
      const args = ['-ss', String(clip.sourceStart), '-to', String(clip.sourceEnd), '-i', inName];

      if (replacementSource) {
        let audioInName = writtenSourceFiles.get(replacementSource.id);
        if (!audioInName) {
          audioInName = randomName((replacementSource.file.name.split('.').pop() || 'm4a'));
          await ffmpeg.writeFile(audioInName, await fetchFile(replacementSource.file));
          writtenSourceFiles.set(replacementSource.id, audioInName);
        }
        args.push('-i', audioInName);
        // apad pads with silence if the replacement audio is shorter than
        // the clip; -t on the output caps it to the clip's own length
        // regardless of whether the replacement runs long or short, so
        // this segment's duration always matches its video, never fabricating
        // extra silent/frozen video to cover a mismatch.
        if (clip.audioMode === 'mix' && hasOwnAudio) {
          // Sum the clip's own audio with the replacement, not just play
          // one over the other silently — amix normalizes levels so mixing
          // two full-volume tracks doesn't just clip/distort.
          args.push('-filter_complex', `[0:v]${scaleFilter}[v];[0:a][1:a]amix=inputs=2:duration=first[a]`, '-map', '[v]', '-map', '[a]');
        } else {
          args.push('-filter_complex', `[0:v]${scaleFilter}[v];[1:a]apad[a]`, '-map', '[v]', '-map', '[a]');
        }
        args.push('-t', String(clipLenSeconds), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), ...maxrateArgs, '-c:a', 'aac');
      } else if (hasOwnAudio) {
        args.push('-vf', scaleFilter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), ...maxrateArgs, '-c:a', 'aac');
      } else if (anyAudio) {
        // Keep the concatenated output's stream layout consistent: every
        // segment needs an audio stream if any segment has one, so a
        // muted/silent segment gets a real (silent) generated track rather
        // than being dropped and breaking the concat.
        args.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-shortest', '-vf', scaleFilter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), ...maxrateArgs, '-c:a', 'aac');
      } else {
        args.push('-an', '-vf', scaleFilter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), ...maxrateArgs);
      }
      args.push(...fpsArgs, outName);

      const code = await ffmpeg.exec(args);
      if (code !== 0) throw new TimelineRenderError(`Could not process clip ${i + 1}. It may use a codec this version doesn't support yet.`);
      segmentNames.push(outName);
      onProgress?.((i + 1) / (clips.length + 1) * 0.8);
    }

    onStatus?.('finalizing');
    const listName = 'concat-list.txt';
    const listContent = segmentNames.map((n) => `file '${n}'`).join('\n');
    await ffmpeg.writeFile(listName, listContent);
    const concatName = randomName('mp4');
    const concatCode = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', listName, '-c', 'copy', concatName]);
    if (concatCode !== 0) throw new TimelineRenderError('Could not combine the timeline\'s clips into one video.');
    onProgress?.(0.85);

    // One extra pass burns the watermark into the whole concatenated
    // video, rather than threading it into each per-clip branch above
    // (several of which already differ by audio mode) — costs one more
    // re-encode of the full-length result instead of the previous plain
    // stream copy, still far cheaper than the composed/canvas path.
    const watermarkPngBlob = await createWatermarkPngBlob(targetHeight);
    const watermarkName = 'watermark.png';
    await ffmpeg.writeFile(watermarkName, await fetchFile(watermarkPngBlob));
    const outName = randomName('mp4');
    const watermarkArgs = [
      '-i', concatName, '-i', watermarkName,
      '-filter_complex', `overlay=W-w-16:H-h-16`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), ...maxrateArgs,
    ];
    if (anyAudio) watermarkArgs.push('-c:a', 'copy');
    else watermarkArgs.push('-an');
    watermarkArgs.push(outName);
    const watermarkCode = await ffmpeg.exec(watermarkArgs);
    if (watermarkCode !== 0) throw new TimelineRenderError('Could not finish this export.');
    onProgress?.(0.98);

    const data = await ffmpeg.readFile(outName);
    await cleanupVirtualFiles(ffmpeg, [...writtenSourceFiles.values(), ...segmentNames, listName, concatName, watermarkName, outName]);
    onProgress?.(1);
    onStatus?.('done');
    return new Blob([data], { type: 'video/mp4' });
  } catch (err) {
    await cleanupVirtualFiles(ffmpeg, [...writtenSourceFiles.values(), ...segmentNames, 'concat-list.txt']).catch(() => {});
    if (err instanceof TimelineRenderCancelledError || err instanceof TimelineRenderError) throw err;
    throw new TimelineRenderError();
  }
}

// Simple-path equivalent of compositionLayouts.js's drawWatermark — that
// function needs a live canvas 2D context (the composed path always has
// one), which the simple/ffmpeg path never does; this renders the same
// "convertam.app" mark to a small transparent PNG instead, once, then
// ffmpeg's overlay filter burns it into the final video. Kept visually
// consistent with drawWatermark (same text, weight, opacity, shadow).
async function createWatermarkPngBlob(targetHeight) {
  const fontSize = Math.max(10, Math.round(targetHeight * 0.022));
  const padX = Math.round(fontSize * 0.5);
  const padY = Math.round(fontSize * 0.6);
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `700 ${fontSize}px sans-serif`;
  const textWidth = measure.measureText('convertam.app').width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(textWidth) + padX * 2;
  canvas.height = fontSize + padY * 2;
  const ctx = canvas.getContext('2d');
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = fontSize * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText('convertam.app', padX, canvas.height / 2);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// ---------------------------------------------------------------------
// Composed path: split-screen / picture-in-picture via canvas capture
// ---------------------------------------------------------------------

// reversedBlobs (clipId -> Blob) substitutes a clip's normal source with a
// pre-rendered reversed+trimmed copy (see prerenderReversedClips) — native
// <video> elements have no reverse-playback mode, so a genuinely reversed
// clip has to already exist as a real forward-playable file before capture
// starts. currentTime for a reversed clip is driven separately by the
// caller (0-based into the reversed copy, not the original sourceTime).
async function loadClipIntoElement(videoEl, clip, timeline, reversedBlobs) {
  const reversedBlob = clip.reversed && reversedBlobs?.get(clip.id);
  const source = timeline.sources.find((s) => s.id === clip.sourceId);
  if (!source && !reversedBlob) return;
  const key = reversedBlob ? `reversed:${clip.id}` : source.id;
  if (videoEl.dataset.sourceId !== key) {
    videoEl.src = URL.createObjectURL(reversedBlob || source.file);
    videoEl.dataset.sourceId = key;
    // onerror/timeout resolve rather than reject — a clip that fails to
    // decode falls back to simply not being drawn that frame (mainEl/layer
    // stays null-ish upstream) instead of hanging the whole export forever.
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 8000);
      videoEl.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      videoEl.onerror = () => { clearTimeout(timer); resolve(); };
    });
  }
}

// Pre-renders a reversed, already-trimmed-to-[sourceStart,sourceEnd] copy of
// every reversed clip via ffmpeg's reverse/areverse filters — the one part
// of "reverse" that genuinely needs doing before capture starts, since the
// capture loop otherwise just plays/seeks a <video> element forward. Not
// gated behind the composed/simple dispatch the way most effects are: this
// runs whenever any clip is reversed, because it's cheap relative to the
// capture itself and keeps the capture loop's per-frame logic uniform.
async function prerenderReversedClips(clips, timeline, onStatus) {
  const reversedClips = clips.filter((c) => c.reversed);
  if (!reversedClips.length) return new Map();
  onStatus?.('preparing');
  const { getFFmpegHandle, randomName, cleanupVirtualFiles } = await import('./ffmpegClient');
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpegHandle();
  const result = new Map();
  const writtenSourceFiles = new Map();
  const tempNames = [];
  try {
    for (const clip of reversedClips) {
      const source = timeline.sources.find((s) => s.id === clip.sourceId);
      if (!source || source.kind === 'image') continue; // a static image has no direction to reverse
      let inName = writtenSourceFiles.get(source.id);
      if (!inName) {
        inName = randomName((source.file.name.split('.').pop() || 'mp4'));
        await ffmpeg.writeFile(inName, await fetchFile(source.file));
        writtenSourceFiles.set(source.id, inName);
      }
      // WebM/VP8+Opus, not MP4/H.264+AAC: this file gets loaded straight
      // back into a <video> element for canvas capture, which needs the
      // BROWSER's own decoder — unlike H.264/AAC (proprietary, not every
      // Chromium build ships it), VP8/Opus is a royalty-free codec every
      // Chromium build decodes natively, matching what the rest of this
      // composed pipeline already produces via MediaRecorder. (VP9 would be
      // the natural first choice, but this build's bundled ffmpeg.wasm core
      // crashes encoding it — see the ffmpeg-core README before revisiting.)
      const outName = randomName('webm');
      const args = ['-ss', String(clip.sourceStart), '-to', String(clip.sourceEnd), '-i', inName];
      if (source.hasAudio) {
        args.push('-vf', 'reverse', '-af', 'areverse', '-c:v', 'libvpx', '-crf', '10', '-b:v', '1M', '-c:a', 'libopus');
      } else {
        args.push('-an', '-vf', 'reverse', '-c:v', 'libvpx', '-crf', '10', '-b:v', '1M');
      }
      args.push(outName);
      tempNames.push(outName);
      let code;
      try {
        code = await ffmpeg.exec(args);
      } catch {
        continue; // this clip's video/layer just falls back to its normal (non-reversed) source below
      }
      if (code === 0) {
        const data = await ffmpeg.readFile(outName);
        result.set(clip.id, new Blob([data], { type: 'video/webm' }));
      }
    }
  } finally {
    await cleanupVirtualFiles(ffmpeg, [...writtenSourceFiles.values(), ...tempNames]).catch(() => {});
  }
  return result;
}

// Extracts waveform peaks once per clip with ducking enabled, up front —
// the same "analyze once, look up per frame" shape prerenderReversedClips
// uses for reverse. Keyed by clip id (not source id): two clips sharing a
// source could have different sourceStart/sourceEnd windows, but
// duckGainAtTime only needs the WHOLE source's peaks + duration to map any
// absolute source-relative time, so this still only decodes each distinct
// source file once.
async function prerenderDuckingEnvelopes(clips, timeline) {
  const duckingClips = clips.filter((c) => c.duckBackground && c.audioMode === 'mix');
  if (!duckingClips.length) return new Map();
  const { extractWaveformPeaks } = await import('./waveform');
  const peaksBySource = new Map();
  const result = new Map();
  for (const clip of duckingClips) {
    const source = timeline.sources.find((s) => s.id === clip.sourceId);
    if (!source || !source.hasAudio) continue;
    if (!peaksBySource.has(source.id)) {
      try {
        peaksBySource.set(source.id, await extractWaveformPeaks(source.file, 400));
      } catch {
        continue;
      }
    }
    result.set(clip.id, { peaks: peaksBySource.get(source.id), sourceDuration: source.duration });
  }
  return result;
}

async function loadImageIntoElement(imgEl, clip, timeline) {
  const source = timeline.sources.find((s) => s.id === clip.sourceId);
  if (!source) return;
  if (imgEl.dataset.sourceId !== source.id) {
    imgEl.src = URL.createObjectURL(source.file);
    imgEl.dataset.sourceId = source.id;
    // onerror/timeout resolve rather than reject — same reasoning as
    // loadClipIntoElement above: a photo that fails to decode (e.g. a
    // format the browser's <img> can't read) should just not draw that
    // frame, not throw out of the frame() loop and silently freeze the
    // rest of the export on whatever was last drawn.
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 8000);
      imgEl.onload = () => { clearTimeout(timer); resolve(); };
      imgEl.onerror = () => { clearTimeout(timer); resolve(); };
    });
  }
}

// Replacement/mix audio is keyed by source id directly (not by clip),
// since it's a standalone audio file rather than something with its own
// trim points synced to the video — it always plays from its own start
// for as long as the clip it's attached to is on screen.
async function loadAudioIntoElement(audioEl, source) {
  if (!source) return;
  if (audioEl.dataset.sourceId !== source.id) {
    audioEl.src = URL.createObjectURL(source.file);
    audioEl.dataset.sourceId = source.id;
    await new Promise((resolve) => { audioEl.onloadedmetadata = resolve; });
  }
}

// { timeline, onStatus, onProgress }
export async function renderComposedTimeline(timeline, { onStatus, onProgress, cancelToken, captionEvents }) {
  if (!isTimelineExportSupported()) {
    throw new TimelineRenderError('Composing video isn\'t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  if (!mainClips.length) throw new TimelineRenderError('Add a main clip before exporting.');

  const totalDuration = getTotalDuration(timeline);
  const durationError = validateRenderDuration(totalDuration);
  if (durationError) throw new TimelineRenderError(durationError);

  onStatus?.('preparing');

  const allClips = [...mainClips, ...(timeline.overlayTracks || []).flatMap((t) => getTrackClips(timeline, t.id))];
  const reversedBlobs = await prerenderReversedClips(allClips, timeline, onStatus);
  const duckingEnvelopes = await prerenderDuckingEnvelopes(allClips, timeline);

  const canvas = document.createElement('canvas');
  const { width: composeWidth, height: composeHeight } = getComposeSize(timeline.frameAspect, timeline.exportResolution);
  canvas.width = composeWidth;
  canvas.height = composeHeight;
  const ctx = canvas.getContext('2d');

  // Logo/watermark images are loaded once, up front, rather than per-frame
  // — same reasoning as the main/overlay video elements only ever getting
  // a new .src when the active clip actually changes.
  const imageOverlayEls = new Map();
  await Promise.all(timeline.imageOverlays.map(async (o) => {
    const source = timeline.sources.find((s) => s.id === o.sourceId);
    if (!source) return;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(source.file);
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    imageOverlayEls.set(o.sourceId, img);
  }));

  // backgroundType 'image' — same one-time-load pattern as the overlay
  // images above.
  let backgroundImageEl = null;
  if (timeline.backgroundType === 'image' && timeline.backgroundImageSourceId) {
    const bgSource = timeline.sources.find((s) => s.id === timeline.backgroundImageSourceId);
    if (bgSource) {
      backgroundImageEl = document.createElement('img');
      backgroundImageEl.src = URL.createObjectURL(bgSource.file);
      await new Promise((resolve) => { backgroundImageEl.onload = resolve; backgroundImageEl.onerror = resolve; });
    }
  }

  // Not muted: some browsers skip audio-track decoding entirely for a
  // muted <video> element as a performance optimization, which would
  // silently kill the Web Audio tap below even though gain/routing is
  // otherwise correct. Direct output never actually reaches the speakers
  // anyway, because ensureAudioRouted() below calls createMediaElementSource
  // before play() starts, which implicitly disconnects the element's audio
  // from the hardware output in favor of the Web Audio graph.
  const mainVideoEl = document.createElement('video');
  mainVideoEl.playsInline = true;
  // A static image on the MAIN track (slideshow) has no video to decode —
  // loadClipIntoElement/mainVideoEl silently fail to show anything for it
  // (same reason the overlay-track loop below needs its own image element).
  const mainImageEl = document.createElement('img');
  // A second, always-available main-track element used only during a
  // 'crossfade' transition's tail — holds the NEXT clip frozen on its own
  // first frame while it dissolves in over the outgoing clip. No audio tap
  // needed: crossfade reuses the outgoing/incoming clips' own existing
  // fadeOut/fadeIn gain ramps, same as a plain Fade transition.
  const mainCrossfadeVideoEl = document.createElement('video');
  mainCrossfadeVideoEl.playsInline = true;
  // Same idea as mainCrossfadeVideoEl, for when the blend's incoming clip
  // is a static image instead — kept as its own element (not reusing
  // mainImageEl) since the CURRENT clip can also be an image being drawn
  // through mainImageEl at the very same moment.
  const mainCrossfadeImageEl = document.createElement('img');
  // Replacement/mix audio for the main track plays through its own hidden
  // <audio> element and gain node, summed into the same destination as the
  // track's own video audio — 'replace' silences the video's own gain while
  // this one plays, 'mix' leaves both audible together.
  const mainReplaceAudioEl = document.createElement('audio');

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();

  // Every other gain node routes through this one master gain before
  // reaching dest — project-level volume/mute/fade-in/fade-out (see
  // timeline.js's getMasterGain) apply on top of everything else.
  const masterGain = audioCtx.createGain();
  masterGain.connect(dest);

  const mainGain = audioCtx.createGain();
  const mainReplaceGain = audioCtx.createGain();
  mainGain.connect(masterGain);
  mainReplaceGain.connect(masterGain);

  function ensureAudioRouted(mediaEl, gainNode, existingSourceRef) {
    // A media element can only ever have one MediaElementSourceNode
    // created from it — created once here, gain toggled per active clip's
    // audioMode afterwards rather than reconnecting nodes every frame.
    if (existingSourceRef.current) return;
    existingSourceRef.current = audioCtx.createMediaElementSource(mediaEl);
    existingSourceRef.current.connect(gainNode);
  }
  const mainSrcRef = { current: null };
  const mainReplaceSrcRef = { current: null };

  // One full element/gain-node set per overlay track — a fixed pair
  // (main+overlay) only ever covered exactly one overlay; a multi-track
  // timeline (see timeline.js's overlayTracks) needs one of everything per
  // track, all summed into the same `dest` the main track already uses.
  const overlayLayers = (timeline.overlayTracks || []).map((track) => {
    const videoEl = document.createElement('video');
    videoEl.playsInline = true;
    const imageEl = document.createElement('img');
    const replaceAudioEl = document.createElement('audio');
    const gain = audioCtx.createGain();
    const replaceGain = audioCtx.createGain();
    gain.connect(masterGain);
    replaceGain.connect(masterGain);
    return {
      trackId: track.id,
      videoEl, imageEl, replaceAudioEl, gain, replaceGain,
      srcRef: { current: null },
      replaceSrcRef: { current: null },
      lastClipId: null,
      replaceLastRef: { value: null },
      lastCutoutCanvas: null, // cached masked-person canvas — see the cutout block in the frame loop below
      lastCutoutAt: 0,
    };
  });

  // One audio element/gain-node pair per sound track (see timeline.js's
  // soundTracks) — much simpler than an overlay layer since there's no
  // video/image to draw, just this one clip's own audio routed into the
  // same masterGain as everything else.
  const soundLayers = (timeline.soundTracks || []).map((track) => ({
    trackId: track.id,
    audioEl: document.createElement('audio'),
    gain: audioCtx.createGain(),
    srcRef: { current: null },
    lastClipId: null,
  }));
  soundLayers.forEach((layer) => layer.gain.connect(masterGain));

  // 'original' has no real meaning for a canvas capture (there's no single
  // source rate to preserve once multiple clips/tracks are composited) —
  // falls back to this module's long-standing 30fps default.
  const captureFps = timeline.exportFps && timeline.exportFps !== 'original' ? timeline.exportFps : 30;
  const canvasStream = canvas.captureStream(captureFps);
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mimeType = pickMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
  } catch {
    await audioCtx.close();
    throw new TimelineRenderError('This browser can\'t record video. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = () => reject(new TimelineRenderError('Recording failed while composing this video.'));
  });

  onStatus?.('rendering');
  recorder.start();
  let startTime = performance.now();
  let lastMainClipId = null;

  // A backgrounded/minimized tab throttles or fully suspends
  // requestAnimationFrame, but the Web Audio graph keeps rendering audio in
  // real time regardless of visibility — left unhandled, that mismatch
  // silently desyncs the recording: the canvas stops receiving new frames
  // while dest.stream keeps flowing, so the exported video's own duration
  // ends up shorter than its audio. Freezing BOTH streams together while
  // hidden (rather than trying to keep pushing frames through the
  // throttling) guarantees they can never drift apart — the export just
  // takes longer in wall-clock time when the tab is hidden, never less
  // content on one side.
  let hiddenAt = null;
  let elementsPausedForHiding = [];
  function handleVisibilityChange() {
    if (document.hidden) {
      if (hiddenAt != null) return;
      hiddenAt = performance.now();
      audioCtx.suspend().catch(() => {});
      const candidates = [
        mainVideoEl, mainCrossfadeVideoEl, mainReplaceAudioEl,
        ...overlayLayers.flatMap((l) => [l.videoEl, l.replaceAudioEl]),
        ...soundLayers.map((l) => l.audioEl),
      ];
      elementsPausedForHiding = candidates.filter((el) => !el.paused && !el.ended);
      elementsPausedForHiding.forEach((el) => el.pause());
    } else if (hiddenAt != null) {
      startTime += performance.now() - hiddenAt;
      hiddenAt = null;
      audioCtx.resume().catch(() => {});
      elementsPausedForHiding.forEach((el) => el.play().catch(() => {}));
      elementsPausedForHiding = [];
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Shared by every track (main and each overlay): routes a clip's
  // replace/mix audio (if any) into its own gain node, and returns whether
  // the clip's own video audio should still be audible ('mix') or not
  // ('replace'/anything else). duckGain (0..1, default 1) is an extra
  // multiplier — see prerenderDuckingEnvelopes — applied via a short ramp
  // rather than an instant jump so a threshold crossing doesn't click.
  async function applyReplacementAudio(clip, audioEl, gainNode, srcRef, lastClipIdRef, duckGain = 1) {
    const isReplaceOrMix = (clip.audioMode === 'replace' || clip.audioMode === 'mix') && clip.audioSourceId;
    if (!isReplaceOrMix) {
      gainNode.gain.value = 0;
      lastClipIdRef.value = null;
      return false;
    }
    if (clip.id !== lastClipIdRef.value) {
      const audioSource = timeline.sources.find((s) => s.id === clip.audioSourceId);
      await loadAudioIntoElement(audioEl, audioSource);
      ensureAudioRouted(audioEl, gainNode, srcRef);
      audioEl.currentTime = 0;
      await audioEl.play().catch(() => {});
      lastClipIdRef.value = clip.id;
    }
    gainNode.gain.setTargetAtTime(duckGain, audioCtx.currentTime, 0.15);
    return clip.audioMode === 'mix';
  }
  const mainReplaceLastRef = { value: null };
  let wasCancelled = false;

  await new Promise((resolve) => {
    async function frame() {
      if (cancelToken?.cancelled) { wasCancelled = true; resolve(); return; }
      if (document.hidden) { requestAnimationFrame(frame); return; }
      const t = (performance.now() - startTime) / 1000;
      if (t >= totalDuration) { resolve(); return; }

      masterGain.gain.value = getMasterGain(timeline, t);

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, t);
      const mainSource = mainHit ? timeline.sources.find((s) => s.id === mainHit.clip.sourceId) : null;
      const mainIsImage = mainSource?.kind === 'image';

      if (mainHit && mainIsImage) {
        await loadImageIntoElement(mainImageEl, mainHit.clip, timeline);
      } else if (mainHit && mainHit.clip.id !== lastMainClipId) {
        await loadClipIntoElement(mainVideoEl, mainHit.clip, timeline, reversedBlobs);
        ensureAudioRouted(mainVideoEl, mainGain, mainSrcRef);
        // A reversed clip's pre-rendered copy has its own 0-based timeline
        // (already trimmed to this clip's range), not the source's own —
        // elapsedInClip is exactly that offset, speed already folded in via
        // sourceTime's own math.
        mainVideoEl.currentTime = mainHit.clip.reversed ? mainHit.sourceTime - mainHit.clip.sourceStart : mainHit.sourceTime;
        mainVideoEl.playbackRate = mainHit.clip.speed || 1;
        await mainVideoEl.play().catch(() => {});
        lastMainClipId = mainHit.clip.id;
      }
      let mainOpacity = 1;
      if (mainHit && mainIsImage) {
        // Same as the overlay-track isImage branch: no video audio track of
        // its own, but replace/mix audio (e.g. narration) can still apply.
        await applyReplacementAudio(mainHit.clip, mainReplaceAudioEl, mainReplaceGain, mainReplaceSrcRef, mainReplaceLastRef, 1);
        mainOpacity = getFadeOpacity(mainHit.clip, mainHit.sourceTime - mainHit.clip.sourceStart);
        mainGain.gain.value = 0;
      } else if (mainHit) {
        const mainDuckEnvelope = duckingEnvelopes.get(mainHit.clip.id);
        const mainDuckGain = mainDuckEnvelope ? duckGainAtTime(mainDuckEnvelope.peaks, mainDuckEnvelope.sourceDuration, mainHit.sourceTime) : 1;
        const mixKeepsOwnAudio = await applyReplacementAudio(mainHit.clip, mainReplaceAudioEl, mainReplaceGain, mainReplaceSrcRef, mainReplaceLastRef, mainDuckGain);
        mainOpacity = getFadeOpacity(mainHit.clip, mainHit.sourceTime - mainHit.clip.sourceStart);
        // Fades apply to audio too, not just the visual — a clip fading to
        // black that stayed at full volume would cut abruptly instead.
        mainGain.gain.value = ((mainHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * mainOpacity * (mainHit.clip.gain ?? 1);
      } else {
        mainGain.gain.value = 0;
        mainReplaceGain.gain.value = 0;
      }

      const drawnOverlayLayers = [];
      for (const layer of overlayLayers) {
        const hit = findActiveClipAt(timeline, layer.trackId, t);
        const source = hit ? timeline.sources.find((s) => s.id === hit.clip.sourceId) : null;
        const isImage = source?.kind === 'image';
        const track = timeline.overlayTracks.find((tr) => tr.id === layer.trackId);
        const trackHidden = !!track?.hidden;
        const trackAudible = isOverlayTrackAudible(timeline, layer.trackId);
        let opacity = 1;

        if (hit && isImage) {
          await loadImageIntoElement(layer.imageEl, hit.clip, timeline);
          // An image has no audio track of its own, but it can still carry
          // replace/mix audio (e.g. narration under a static title card).
          await applyReplacementAudio(hit.clip, layer.replaceAudioEl, layer.replaceGain, layer.replaceSrcRef, layer.replaceLastRef, trackAudible ? 1 : 0);
          layer.gain.gain.value = 0; // no video audio track to keep regardless of mode
          if (!trackHidden) drawnOverlayLayers.push({ trackId: layer.trackId, el: layer.imageEl, clip: hit.clip, opacity });
        } else if (hit) {
          if (hit.clip.id !== layer.lastClipId) {
            await loadClipIntoElement(layer.videoEl, hit.clip, timeline, reversedBlobs);
            ensureAudioRouted(layer.videoEl, layer.gain, layer.srcRef);
            layer.videoEl.currentTime = hit.clip.reversed ? hit.sourceTime - hit.clip.sourceStart : hit.sourceTime;
            layer.videoEl.playbackRate = hit.clip.speed || 1;
            await layer.videoEl.play().catch(() => {});
            layer.lastClipId = hit.clip.id;
          }
          const layerDuckEnvelope = duckingEnvelopes.get(hit.clip.id);
          const layerDuckGain = (layerDuckEnvelope ? duckGainAtTime(layerDuckEnvelope.peaks, layerDuckEnvelope.sourceDuration, hit.sourceTime) : 1) * (trackAudible ? 1 : 0);
          const mixKeepsOwnAudio = await applyReplacementAudio(hit.clip, layer.replaceAudioEl, layer.replaceGain, layer.replaceSrcRef, layer.replaceLastRef, layerDuckGain);
          opacity = getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart);
          layer.gain.gain.value = ((hit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * opacity * (hit.clip.gain ?? 1) * (trackAudible ? 1 : 0);
          // Person cutout — same throttled re-segment + cache-between-updates
          // approach as the live preview (see VideoEditorWorkspace.js's tick
          // loop), so preview and export never disagree about how often the
          // mask actually refreshes.
          let cutoutCanvas = null;
          if (track?.cutoutEnabled && (track.mode || 'pip') === 'pip') {
            const now = performance.now();
            if (now - layer.lastCutoutAt > 100) {
              ensureSegmenterLoaded();
              const mask = getPersonMaskCanvas(layer.videoEl);
              if (mask) {
                layer.lastCutoutCanvas = buildCutoutCanvas(layer.videoEl, mask, track.cutoutFeather ?? 0.3);
                layer.lastCutoutAt = now;
              }
            }
            cutoutCanvas = layer.lastCutoutCanvas;
          }
          if (!trackHidden) drawnOverlayLayers.push({ trackId: layer.trackId, el: layer.videoEl, clip: hit.clip, opacity, cutoutCanvas });
        } else {
          layer.gain.gain.value = 0;
          layer.replaceGain.gain.value = 0;
          layer.lastClipId = null;
        }
      }

      for (const soundLayer of soundLayers) {
        const soundTrack = timeline.soundTracks.find((tr) => tr.id === soundLayer.trackId);
        const hit = findActiveClipAt(timeline, soundLayer.trackId, t);
        if (hit && isSoundTrackAudible(timeline, soundLayer.trackId)) {
          if (hit.clip.id !== soundLayer.lastClipId) {
            const source = timeline.sources.find((s) => s.id === hit.clip.sourceId);
            await loadAudioIntoElement(soundLayer.audioEl, source);
            ensureAudioRouted(soundLayer.audioEl, soundLayer.gain, soundLayer.srcRef);
            soundLayer.audioEl.currentTime = hit.sourceTime;
            await soundLayer.audioEl.play().catch(() => {});
            soundLayer.lastClipId = hit.clip.id;
          }
          const opacity = getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart);
          soundLayer.gain.gain.value = opacity * (hit.clip.gain ?? 1) * (soundTrack?.volume ?? 1);
        } else {
          soundLayer.gain.gain.value = 0;
          soundLayer.lastClipId = null;
        }
      }

      // 'crossfade' transition tail — see mainCrossfadeVideoEl's own
      // comment above for why the incoming clip is held frozen rather than
      // played during the blend.
      let crossfadeLayer = null;
      if (mainHit && BLEND_TRANSITION_TYPES.includes(mainHit.clip.transitionOut?.type) && mainHit.clip.fadeOut > 0) {
        const dur = mainHit.clip.sourceEnd - mainHit.clip.sourceStart;
        const elapsedInClip = mainHit.sourceTime - mainHit.clip.sourceStart;
        if (elapsedInClip > dur - mainHit.clip.fadeOut) {
          const mainList = getTrackClips(timeline, MAIN_TRACK);
          const idx = mainList.findIndex((c) => c.id === mainHit.clip.id);
          const nextClip = idx >= 0 ? mainList[idx + 1] : null;
          const nextSource = nextClip ? timeline.sources.find((s) => s.id === nextClip.sourceId) : null;
          const progress = Math.max(0, Math.min(1, (elapsedInClip - (dur - mainHit.clip.fadeOut)) / mainHit.clip.fadeOut));
          if (nextClip && nextSource?.kind === 'image') {
            // A static image needs no seeking/freezing — it's already a
            // single, permanent frame — so it can join the exact same blend
            // draw path (drawInto/drawCover) already used for video.
            await loadImageIntoElement(mainCrossfadeImageEl, nextClip, timeline);
            crossfadeLayer = { el: mainCrossfadeImageEl, clip: nextClip, opacity: progress };
          } else if (nextClip && nextSource) {
            await loadClipIntoElement(mainCrossfadeVideoEl, nextClip, timeline, reversedBlobs);
            // "The clip's own first frame" is elapsedInClip === 0 either
            // way — for a reversed clip that's position 0 in its
            // pre-rendered reversed copy (see prerenderReversedClips), not
            // nextClip.sourceStart (which would be its LAST frame reversed).
            const frozenAt = nextClip.reversed ? 0 : nextClip.sourceStart;
            if (Math.abs(mainCrossfadeVideoEl.currentTime - frozenAt) > 0.05) {
              mainCrossfadeVideoEl.currentTime = frozenAt;
            }
            crossfadeLayer = { el: mainCrossfadeVideoEl, clip: nextClip, opacity: progress };
          }
        }
      }

      drawCompositionFrame(ctx, {
        timeline,
        mainEl: mainHit ? (mainIsImage ? mainImageEl : mainVideoEl) : null,
        mainClip: mainHit?.clip || null,
        mainOpacity,
        crossfadeEl: crossfadeLayer?.el || null,
        crossfadeClip: crossfadeLayer?.clip || null,
        crossfadeOpacity: crossfadeLayer?.opacity || 0,
        transitionType: mainHit?.clip.transitionOut?.type,
        overlayLayers: drawnOverlayLayers,
        backgroundImageEl,
        rounded: true,
        border: true,
        canvasWidth: composeWidth, canvasHeight: composeHeight,
      });
      drawImageOverlays(ctx, { timeline, timelineSeconds: t, imageElements: imageOverlayEls, canvasWidth: composeWidth, canvasHeight: composeHeight });
      drawShapeOverlays(ctx, { timeline, timelineSeconds: t, canvasWidth: composeWidth, canvasHeight: composeHeight });
      drawTextOverlays(ctx, { timeline, timelineSeconds: t, canvasWidth: composeWidth, canvasHeight: composeHeight });
      if (timeline.captionsEnabled && captionEvents?.length) {
        const activeCaptionEvent = findActiveCaptionEvent(captionEvents, t);
        if (activeCaptionEvent) drawCaptions(ctx, { style: timeline.captionStyle, event: activeCaptionEvent, timelineSeconds: t, timeline, canvasWidth: composeWidth, canvasHeight: composeHeight });
      }
      drawWatermark(ctx, composeWidth, composeHeight);
      drawMasterFade(ctx, { timeline, timelineSeconds: t, totalDuration, canvasWidth: composeWidth, canvasHeight: composeHeight });

      onProgress?.(Math.min(1, t / totalDuration) * 0.7);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  recorder.stop();
  await stopped;
  mainVideoEl.pause();
  mainCrossfadeVideoEl.pause();
  mainReplaceAudioEl.pause();
  if (mainVideoEl.src) URL.revokeObjectURL(mainVideoEl.src);
  if (mainImageEl.src) URL.revokeObjectURL(mainImageEl.src);
  if (mainCrossfadeVideoEl.src) URL.revokeObjectURL(mainCrossfadeVideoEl.src);
  if (mainCrossfadeImageEl.src) URL.revokeObjectURL(mainCrossfadeImageEl.src);
  if (mainReplaceAudioEl.src) URL.revokeObjectURL(mainReplaceAudioEl.src);
  for (const layer of overlayLayers) {
    layer.videoEl.pause();
    layer.replaceAudioEl.pause();
    if (layer.videoEl.src) URL.revokeObjectURL(layer.videoEl.src);
    if (layer.imageEl.src) URL.revokeObjectURL(layer.imageEl.src);
    if (layer.replaceAudioEl.src) URL.revokeObjectURL(layer.replaceAudioEl.src);
  }
  for (const soundLayer of soundLayers) {
    soundLayer.audioEl.pause();
    if (soundLayer.audioEl.src) URL.revokeObjectURL(soundLayer.audioEl.src);
  }
  imageOverlayEls.forEach((img) => { if (img.src) URL.revokeObjectURL(img.src); });
  if (backgroundImageEl?.src) URL.revokeObjectURL(backgroundImageEl.src);
  await audioCtx.close();

  if (wasCancelled) throw new TimelineRenderCancelledError();

  const webmBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (!webmBlob.size) throw new TimelineRenderError('Recording produced no video data. Please try again.');

  onStatus?.('finalizing');
  const { remuxToMp4 } = await import('./ffmpegClient');
  const crf = QUALITY_CRF[timeline.exportQuality] ?? QUALITY_CRF.balanced;
  const mp4Blob = await remuxToMp4(webmBlob, { onProgress: (p) => onProgress?.(0.7 + p * 0.3), crf, maxrateKbps: maxrateKbpsFor(timeline), fps: captureFps });
  onStatus?.('done');
  return mp4Blob;
}

// ---------------------------------------------------------------------
// Audio-only path: the edited timeline's actual audio mix, with none of
// renderComposedTimeline's canvas drawing or video encoding. Built for
// Auto Captions — transcription only ever needs audio, and video encoding
// is by far the most expensive part of a full export, so this exists to
// let captioning start without exporting a video first (see
// VideoEditorWorkspace's Auto Captions section for the full rationale).
// Deliberately a near-exact copy of renderComposedTimeline's audio graph
// (same gain routing, same ducking/replace/mix handling, same reversed-clip
// prerender) with every canvas/video-track line removed — kept as a
// separate function rather than threading an "audio-only" flag through the
// composed path, since that would make an already-long function harder to
// follow for a difference this large (no canvas, no draw calls, no video
// track on the recorder, no remux step). Still bound to real-time playback
// like the composed path is (a live <video> element has to actually play
// to produce audio for the Web Audio tap below — there's no way to render
// faster than real-time without a full non-realtime buffer-scheduling
// engine, out of scope here), so this takes roughly as long as the
// timeline's own duration — but skips the compositing and video encoding
// that make a full export slower still.
// ---------------------------------------------------------------------

export async function renderTimelineAudio(timeline, { onStatus, onProgress, cancelToken }) {
  if (!isTimelineExportSupported()) {
    throw new TimelineRenderError('Rendering audio isn\'t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  if (!mainClips.length) throw new TimelineRenderError('Add a main clip before generating captions.');

  const totalDuration = getTotalDuration(timeline);
  const durationError = validateRenderDuration(totalDuration);
  if (durationError) throw new TimelineRenderError(durationError);

  onStatus?.('preparing');

  const allClips = [...mainClips, ...(timeline.overlayTracks || []).flatMap((t) => getTrackClips(timeline, t.id))];
  const reversedBlobs = await prerenderReversedClips(allClips, timeline, onStatus);
  const duckingEnvelopes = await prerenderDuckingEnvelopes(allClips, timeline);

  // Not muted, same reasoning as renderComposedTimeline's mainVideoEl —
  // some browsers skip audio decoding entirely for a muted element.
  const mainVideoEl = document.createElement('video');
  mainVideoEl.playsInline = true;
  const mainReplaceAudioEl = document.createElement('audio');

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();

  const masterGain = audioCtx.createGain();
  masterGain.connect(dest);

  const mainGain = audioCtx.createGain();
  const mainReplaceGain = audioCtx.createGain();
  mainGain.connect(masterGain);
  mainReplaceGain.connect(masterGain);

  function ensureAudioRouted(mediaEl, gainNode, existingSourceRef) {
    if (existingSourceRef.current) return;
    existingSourceRef.current = audioCtx.createMediaElementSource(mediaEl);
    existingSourceRef.current.connect(gainNode);
  }
  const mainSrcRef = { current: null };
  const mainReplaceSrcRef = { current: null };

  const overlayLayers = (timeline.overlayTracks || []).map((track) => {
    const videoEl = document.createElement('video');
    videoEl.playsInline = true;
    const replaceAudioEl = document.createElement('audio');
    const gain = audioCtx.createGain();
    const replaceGain = audioCtx.createGain();
    gain.connect(masterGain);
    replaceGain.connect(masterGain);
    return {
      trackId: track.id,
      videoEl, replaceAudioEl, gain, replaceGain,
      srcRef: { current: null },
      replaceSrcRef: { current: null },
      lastClipId: null,
      replaceLastRef: { value: null },
    };
  });

  const soundLayers = (timeline.soundTracks || []).map((track) => ({
    trackId: track.id,
    audioEl: document.createElement('audio'),
    gain: audioCtx.createGain(),
    srcRef: { current: null },
    lastClipId: null,
  }));
  soundLayers.forEach((layer) => layer.gain.connect(masterGain));

  const mimeType = pickAudioMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(dest.stream, mimeType ? { mimeType } : undefined);
  } catch {
    await audioCtx.close();
    throw new TimelineRenderError('This browser can\'t record audio. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = () => reject(new TimelineRenderError('Recording failed while rendering this timeline\'s audio.'));
  });

  onStatus?.('rendering');
  recorder.start();
  let startTime = performance.now();
  let lastMainClipId = null;

  // See renderComposedTimeline's identical handler for why: a backgrounded
  // tab can throttle this loop while the Web Audio graph keeps rendering in
  // real time, desyncing captured audio from the timeline positions it's
  // meant to represent. Freezing the graph while hidden keeps them locked.
  let hiddenAt = null;
  let elementsPausedForHiding = [];
  function handleVisibilityChange() {
    if (document.hidden) {
      if (hiddenAt != null) return;
      hiddenAt = performance.now();
      audioCtx.suspend().catch(() => {});
      const candidates = [
        mainVideoEl, mainReplaceAudioEl,
        ...overlayLayers.flatMap((l) => [l.videoEl, l.replaceAudioEl]),
        ...soundLayers.map((l) => l.audioEl),
      ];
      elementsPausedForHiding = candidates.filter((el) => !el.paused && !el.ended);
      elementsPausedForHiding.forEach((el) => el.pause());
    } else if (hiddenAt != null) {
      startTime += performance.now() - hiddenAt;
      hiddenAt = null;
      audioCtx.resume().catch(() => {});
      elementsPausedForHiding.forEach((el) => el.play().catch(() => {}));
      elementsPausedForHiding = [];
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  async function applyReplacementAudio(clip, audioEl, gainNode, srcRef, lastClipIdRef, duckGain = 1) {
    const isReplaceOrMix = (clip.audioMode === 'replace' || clip.audioMode === 'mix') && clip.audioSourceId;
    if (!isReplaceOrMix) {
      gainNode.gain.value = 0;
      lastClipIdRef.value = null;
      return false;
    }
    if (clip.id !== lastClipIdRef.value) {
      const audioSource = timeline.sources.find((s) => s.id === clip.audioSourceId);
      await loadAudioIntoElement(audioEl, audioSource);
      ensureAudioRouted(audioEl, gainNode, srcRef);
      audioEl.currentTime = 0;
      await audioEl.play().catch(() => {});
      lastClipIdRef.value = clip.id;
    }
    gainNode.gain.setTargetAtTime(duckGain, audioCtx.currentTime, 0.15);
    return clip.audioMode === 'mix';
  }
  const mainReplaceLastRef = { value: null };
  let wasCancelled = false;

  await new Promise((resolve) => {
    async function frame() {
      if (cancelToken?.cancelled) { wasCancelled = true; resolve(); return; }
      if (document.hidden) { requestAnimationFrame(frame); return; }
      const t = (performance.now() - startTime) / 1000;
      if (t >= totalDuration) { resolve(); return; }

      masterGain.gain.value = getMasterGain(timeline, t);

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, t);

      if (mainHit && mainHit.clip.id !== lastMainClipId) {
        await loadClipIntoElement(mainVideoEl, mainHit.clip, timeline, reversedBlobs);
        ensureAudioRouted(mainVideoEl, mainGain, mainSrcRef);
        mainVideoEl.currentTime = mainHit.clip.reversed ? mainHit.sourceTime - mainHit.clip.sourceStart : mainHit.sourceTime;
        mainVideoEl.playbackRate = mainHit.clip.speed || 1;
        await mainVideoEl.play().catch(() => {});
        lastMainClipId = mainHit.clip.id;
      }
      if (mainHit) {
        const mainDuckEnvelope = duckingEnvelopes.get(mainHit.clip.id);
        const mainDuckGain = mainDuckEnvelope ? duckGainAtTime(mainDuckEnvelope.peaks, mainDuckEnvelope.sourceDuration, mainHit.sourceTime) : 1;
        const mixKeepsOwnAudio = await applyReplacementAudio(mainHit.clip, mainReplaceAudioEl, mainReplaceGain, mainReplaceSrcRef, mainReplaceLastRef, mainDuckGain);
        const mainOpacity = getFadeOpacity(mainHit.clip, mainHit.sourceTime - mainHit.clip.sourceStart);
        // Fades apply to audio too, not just the visual — a clip fading to
        // black that stayed at full volume would cut abruptly instead.
        mainGain.gain.value = ((mainHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * mainOpacity * (mainHit.clip.gain ?? 1);
      } else {
        mainGain.gain.value = 0;
        mainReplaceGain.gain.value = 0;
      }

      for (const layer of overlayLayers) {
        const hit = findActiveClipAt(timeline, layer.trackId, t);
        const source = hit ? timeline.sources.find((s) => s.id === hit.clip.sourceId) : null;
        const isImage = source?.kind === 'image';
        const trackAudible = isOverlayTrackAudible(timeline, layer.trackId);

        if (hit && isImage) {
          // An image has no video audio track of its own, but can still
          // carry replace/mix audio (e.g. narration under a title card).
          await applyReplacementAudio(hit.clip, layer.replaceAudioEl, layer.replaceGain, layer.replaceSrcRef, layer.replaceLastRef, trackAudible ? 1 : 0);
          layer.gain.gain.value = 0;
        } else if (hit) {
          if (hit.clip.id !== layer.lastClipId) {
            await loadClipIntoElement(layer.videoEl, hit.clip, timeline, reversedBlobs);
            ensureAudioRouted(layer.videoEl, layer.gain, layer.srcRef);
            layer.videoEl.currentTime = hit.clip.reversed ? hit.sourceTime - hit.clip.sourceStart : hit.sourceTime;
            layer.videoEl.playbackRate = hit.clip.speed || 1;
            await layer.videoEl.play().catch(() => {});
            layer.lastClipId = hit.clip.id;
          }
          const layerDuckEnvelope = duckingEnvelopes.get(hit.clip.id);
          const layerDuckGain = (layerDuckEnvelope ? duckGainAtTime(layerDuckEnvelope.peaks, layerDuckEnvelope.sourceDuration, hit.sourceTime) : 1) * (trackAudible ? 1 : 0);
          const mixKeepsOwnAudio = await applyReplacementAudio(hit.clip, layer.replaceAudioEl, layer.replaceGain, layer.replaceSrcRef, layer.replaceLastRef, layerDuckGain);
          const opacity = getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart);
          layer.gain.gain.value = ((hit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * opacity * (hit.clip.gain ?? 1) * (trackAudible ? 1 : 0);
        } else {
          layer.gain.gain.value = 0;
          layer.replaceGain.gain.value = 0;
          layer.lastClipId = null;
        }
      }

      for (const soundLayer of soundLayers) {
        const soundTrack = timeline.soundTracks.find((tr) => tr.id === soundLayer.trackId);
        const hit = findActiveClipAt(timeline, soundLayer.trackId, t);
        if (hit && isSoundTrackAudible(timeline, soundLayer.trackId)) {
          if (hit.clip.id !== soundLayer.lastClipId) {
            const source = timeline.sources.find((s) => s.id === hit.clip.sourceId);
            await loadAudioIntoElement(soundLayer.audioEl, source);
            ensureAudioRouted(soundLayer.audioEl, soundLayer.gain, soundLayer.srcRef);
            soundLayer.audioEl.currentTime = hit.sourceTime;
            await soundLayer.audioEl.play().catch(() => {});
            soundLayer.lastClipId = hit.clip.id;
          }
          const opacity = getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart);
          soundLayer.gain.gain.value = opacity * (hit.clip.gain ?? 1) * (soundTrack?.volume ?? 1);
        } else {
          soundLayer.gain.gain.value = 0;
          soundLayer.lastClipId = null;
        }
      }

      onProgress?.(Math.min(1, t / totalDuration));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  recorder.stop();
  await stopped;
  mainVideoEl.pause();
  mainReplaceAudioEl.pause();
  if (mainVideoEl.src) URL.revokeObjectURL(mainVideoEl.src);
  if (mainReplaceAudioEl.src) URL.revokeObjectURL(mainReplaceAudioEl.src);
  for (const layer of overlayLayers) {
    layer.videoEl.pause();
    layer.replaceAudioEl.pause();
    if (layer.videoEl.src) URL.revokeObjectURL(layer.videoEl.src);
    if (layer.replaceAudioEl.src) URL.revokeObjectURL(layer.replaceAudioEl.src);
  }
  for (const soundLayer of soundLayers) {
    soundLayer.audioEl.pause();
    if (soundLayer.audioEl.src) URL.revokeObjectURL(soundLayer.audioEl.src);
  }
  await audioCtx.close();

  if (wasCancelled) throw new TimelineRenderCancelledError();

  const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
  if (!audioBlob.size) throw new TimelineRenderError('Rendering produced no audio data. Please try again.');
  onStatus?.('done');
  return audioBlob;
}

// Picks the right strategy — never silently substitutes one for the other.
// The composed (canvas) path is required whenever anything needs actual
// per-frame drawing rather than a straight ffmpeg trim+concat: an overlay
// track, a reframed (non-landscape) canvas, per-clip speed/fades/filters/
// crop focus/volume/reverse, or any text/shape/logo layer. All of those
// reuse the exact same canvas-drawing functions (buildFilterString,
// getFadeOpacity, drawCover with cropFocus, drawTextOverlays,
// drawImageOverlays) the live preview already uses, so there is exactly one
// implementation of each effect — the simple path stays a fast, untouched
// trim+concat for the common case of an unedited single video with no
// overlay, no reframe, and no effects.
export async function renderTimeline(timeline, callbacks) {
  const hasOverlay = (timeline.overlayTracks || []).some((t) => getTrackClips(timeline, t.id).length > 0);
  const needsReframe = (timeline.frameAspect || 'landscape') !== 'landscape';
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  const isDefaultFilters = (f) => !f || (f.brightness === 1 && f.contrast === 1 && f.saturation === 1 && f.grayscale === 0);
  const needsClipEffects = mainClips.some((c) => (c.speed || 1) !== 1 || c.fadeIn > 0 || c.fadeOut > 0 || !isDefaultFilters(c.filters) || c.reversed || (c.gain ?? 1) !== 1 || c.duckBackground || (c.rotation || 0) !== 0 || c.flipH || c.flipV);
  const needsOverlayLayers = timeline.textOverlays.length > 0 || timeline.imageOverlays.length > 0 || (timeline.shapeOverlays || []).length > 0;
  const needsMasterAudio = timeline.masterMuted || (timeline.masterVolume ?? 1) !== 1 || (timeline.masterFadeIn || 0) > 0 || (timeline.masterFadeOut || 0) > 0;
  // 'contain' can letterbox/pillarbox even without a reframe, whenever the
  // source's own aspect ratio doesn't exactly match the canvas — the simple
  // path has no concept of a background fill at all, so it has to run
  // through the composed path to honor 'contain' + backgroundType correctly.
  const needsFitMode = timeline.fitMode === 'contain';
  // The simple/ffmpeg path's per-clip `-ss/-to` args assume a real,
  // time-based source — a still image has no timebase of its own, so
  // trimming it that way produces a near-instant single-frame segment
  // instead of the clip's actual on-timeline duration. Any image-kind main
  // clip (a slideshow-style clip) has to go through the composed/canvas
  // path, which already draws a static image for its full clip duration
  // exactly like the live preview does.
  const needsImageClips = mainClips.some((c) => timeline.sources.find((s) => s.id === c.sourceId)?.kind === 'image');
  // The simple/ffmpeg path is a straight trim+concat of the main track's
  // clips in order — it has no way to leave a silent/black gap between two
  // of them. Free-form positioning (moveClip/moveClips) can leave gaps, so
  // any gap (or a first clip not starting at 0) forces the composed path,
  // which draws whatever's active moment-by-moment (nothing, during a gap).
  const needsGaps = mainClips.some((c, i) => (i === 0 ? c.start > 0.001 : c.start > mainClips[i - 1].start + clipDuration(mainClips[i - 1]) + 0.001));
  // Any number of independent sound clips (timeline.js's soundTracks,
  // which also holds the linked main-audio track and the Audio Track bed)
  // — the simple/ffmpeg path has no concept of an audio source outside the
  // main track's own clips, so any of these forces the composed path.
  const needsSoundTracks = (timeline.soundTracks || []).length > 0;
  // Captions are drawn on canvas (see compositionLayouts.js's drawCaptions)
  // exactly like text overlays, rather than burned in by a separate ffmpeg
  // pass — so, exactly like needsOverlayLayers above, their presence has to
  // force the composed path or they'd never get drawn at all.
  const needsCaptions = !!timeline.captionsEnabled && (callbacks.captionEvents?.length ?? 0) > 0;
  const needsComposed = hasOverlay || needsReframe || needsClipEffects || needsOverlayLayers || needsMasterAudio || needsFitMode || needsGaps || needsImageClips || needsSoundTracks || needsCaptions;
  return needsComposed ? renderComposedTimeline(timeline, callbacks) : renderSimpleTimeline(timeline, callbacks);
}
