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

import { getTrackClips, findActiveClipAt, getTotalDuration, MAIN_TRACK, OVERLAY_TRACK, clipDuration } from './timeline';
import { drawCompositionFrame, COMPOSE_WIDTH, COMPOSE_HEIGHT } from './compositionLayouts';
import { validateRenderDuration } from './limits';

export class TimelineRenderError extends Error {
  constructor(message) {
    super(message || 'Could not export this timeline. Please try again.');
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

// ---------------------------------------------------------------------
// Simple path: trim + concat via ffmpeg (no overlay track)
// ---------------------------------------------------------------------

export async function renderSimpleTimeline(timeline, { onStatus, onProgress }) {
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

  try {
    for (let i = 0; i < clips.length; i++) {
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
          args.push('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[a]', '-map', '0:v', '-map', '[a]');
        } else {
          args.push('-filter_complex', '[1:a]apad[a]', '-map', '0:v', '-map', '[a]');
        }
        args.push('-t', String(clipLenSeconds), '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac');
      } else if (hasOwnAudio) {
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac');
      } else if (anyAudio) {
        // Keep the concatenated output's stream layout consistent: every
        // segment needs an audio stream if any segment has one, so a
        // muted/silent segment gets a real (silent) generated track rather
        // than being dropped and breaking the concat.
        args.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac');
      } else {
        args.push('-an', '-c:v', 'libx264', '-preset', 'veryfast');
      }
      args.push(outName);

      const code = await ffmpeg.exec(args);
      if (code !== 0) throw new TimelineRenderError(`Could not process clip ${i + 1}. It may use a codec this version doesn't support yet.`);
      segmentNames.push(outName);
      onProgress?.((i + 1) / (clips.length + 1) * 0.8);
    }

    onStatus?.('finalizing');
    const listName = 'concat-list.txt';
    const listContent = segmentNames.map((n) => `file '${n}'`).join('\n');
    await ffmpeg.writeFile(listName, listContent);
    const outName = randomName('mp4');
    const code = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', listName, '-c', 'copy', outName]);
    if (code !== 0) throw new TimelineRenderError('Could not combine the timeline\'s clips into one video.');
    onProgress?.(0.95);

    const data = await ffmpeg.readFile(outName);
    await cleanupVirtualFiles(ffmpeg, [...writtenSourceFiles.values(), ...segmentNames, listName, outName]);
    onProgress?.(1);
    onStatus?.('done');
    return new Blob([data], { type: 'video/mp4' });
  } catch (err) {
    await cleanupVirtualFiles(ffmpeg, [...writtenSourceFiles.values(), ...segmentNames, 'concat-list.txt']).catch(() => {});
    if (err instanceof TimelineRenderError) throw err;
    throw new TimelineRenderError();
  }
}

// ---------------------------------------------------------------------
// Composed path: split-screen / picture-in-picture via canvas capture
// ---------------------------------------------------------------------

async function loadClipIntoElement(videoEl, clip, timeline) {
  const source = timeline.sources.find((s) => s.id === clip.sourceId);
  if (!source) return;
  if (videoEl.dataset.sourceId !== source.id) {
    videoEl.src = URL.createObjectURL(source.file);
    videoEl.dataset.sourceId = source.id;
    await new Promise((resolve) => { videoEl.onloadedmetadata = resolve; });
  }
}

async function loadImageIntoElement(imgEl, clip, timeline) {
  const source = timeline.sources.find((s) => s.id === clip.sourceId);
  if (!source) return;
  if (imgEl.dataset.sourceId !== source.id) {
    imgEl.src = URL.createObjectURL(source.file);
    imgEl.dataset.sourceId = source.id;
    await new Promise((resolve, reject) => { imgEl.onload = resolve; imgEl.onerror = reject; });
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
export async function renderComposedTimeline(timeline, { onStatus, onProgress }) {
  if (!isTimelineExportSupported()) {
    throw new TimelineRenderError('Composing video isn\'t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  if (!mainClips.length) throw new TimelineRenderError('Add a main clip before exporting.');

  const totalDuration = getTotalDuration(timeline);
  const durationError = validateRenderDuration(totalDuration);
  if (durationError) throw new TimelineRenderError(durationError);

  onStatus?.('preparing');

  const canvas = document.createElement('canvas');
  canvas.width = COMPOSE_WIDTH;
  canvas.height = COMPOSE_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Not muted: some browsers skip audio-track decoding entirely for a
  // muted <video> element as a performance optimization, which would
  // silently kill the Web Audio tap below even though gain/routing is
  // otherwise correct. Direct output never actually reaches the speakers
  // anyway, because ensureAudioRouted() below calls createMediaElementSource
  // before play() starts, which implicitly disconnects the element's audio
  // from the hardware output in favor of the Web Audio graph.
  const mainVideoEl = document.createElement('video');
  mainVideoEl.playsInline = true;
  const overlayVideoEl = document.createElement('video');
  overlayVideoEl.playsInline = true;
  // A static image overlay reuses the same composition/draw path as a
  // video overlay (compositionLayouts.js's drawCover works on either) —
  // just a separate element to hold it, since it never plays/seeks.
  const overlayImageEl = document.createElement('img');
  // Replacement/mix audio for each track plays through its own hidden
  // <audio> element and gain node, summed into the same destination as the
  // track's own video audio — 'replace' silences the video's own gain while
  // this one plays, 'mix' leaves both audible together.
  const mainReplaceAudioEl = document.createElement('audio');
  const overlayReplaceAudioEl = document.createElement('audio');

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();

  const mainGain = audioCtx.createGain();
  const overlayGain = audioCtx.createGain();
  const mainReplaceGain = audioCtx.createGain();
  const overlayReplaceGain = audioCtx.createGain();
  mainGain.connect(dest);
  overlayGain.connect(dest);
  mainReplaceGain.connect(dest);
  overlayReplaceGain.connect(dest);

  function ensureAudioRouted(mediaEl, gainNode, existingSourceRef) {
    // A media element can only ever have one MediaElementSourceNode
    // created from it — created once here, gain toggled per active clip's
    // audioMode afterwards rather than reconnecting nodes every frame.
    if (existingSourceRef.current) return;
    existingSourceRef.current = audioCtx.createMediaElementSource(mediaEl);
    existingSourceRef.current.connect(gainNode);
  }
  const mainSrcRef = { current: null };
  const overlaySrcRef = { current: null };
  const mainReplaceSrcRef = { current: null };
  const overlayReplaceSrcRef = { current: null };

  const canvasStream = canvas.captureStream(30);
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
  const startTime = performance.now();
  let lastMainClipId = null;
  let lastOverlayClipId = null;
  let lastMainReplaceClipId = null;
  let lastOverlayReplaceClipId = null;

  // Shared by both tracks: routes a clip's replace/mix audio (if any) into
  // its own gain node, and returns whether the clip's own video audio
  // should still be audible ('mix') or not ('replace'/anything else).
  async function applyReplacementAudio(clip, audioEl, gainNode, srcRef, lastClipIdRef) {
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
    gainNode.gain.value = 1;
    return clip.audioMode === 'mix';
  }
  const mainReplaceLastRef = { value: null };
  const overlayReplaceLastRef = { value: null };

  await new Promise((resolve) => {
    async function frame() {
      const t = (performance.now() - startTime) / 1000;
      if (t >= totalDuration) { resolve(); return; }

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, t);
      const overlayHit = timeline.compositionMode !== 'single' ? findActiveClipAt(timeline, OVERLAY_TRACK, t) : null;

      if (mainHit && mainHit.clip.id !== lastMainClipId) {
        await loadClipIntoElement(mainVideoEl, mainHit.clip, timeline);
        ensureAudioRouted(mainVideoEl, mainGain, mainSrcRef);
        mainVideoEl.currentTime = mainHit.sourceTime;
        await mainVideoEl.play().catch(() => {});
        lastMainClipId = mainHit.clip.id;
      }
      if (mainHit) {
        const mixKeepsOwnAudio = await applyReplacementAudio(mainHit.clip, mainReplaceAudioEl, mainReplaceGain, mainReplaceSrcRef, mainReplaceLastRef);
        mainGain.gain.value = (mainHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0;
      } else {
        mainGain.gain.value = 0;
        mainReplaceGain.gain.value = 0;
      }

      const overlaySource = overlayHit ? timeline.sources.find((s) => s.id === overlayHit.clip.sourceId) : null;
      const overlayIsImage = overlaySource?.kind === 'image';

      if (overlayHit && overlayIsImage) {
        await loadImageIntoElement(overlayImageEl, overlayHit.clip, timeline);
        // An image has no audio track of its own, but it can still carry
        // replace/mix audio (e.g. narration under a static title card).
        const mixKeepsOwnAudio = await applyReplacementAudio(overlayHit.clip, overlayReplaceAudioEl, overlayReplaceGain, overlayReplaceSrcRef, overlayReplaceLastRef);
        overlayGain.gain.value = 0; // no video audio track to keep regardless of mode
        void mixKeepsOwnAudio;
      } else if (overlayHit) {
        if (overlayHit.clip.id !== lastOverlayClipId) {
          await loadClipIntoElement(overlayVideoEl, overlayHit.clip, timeline);
          ensureAudioRouted(overlayVideoEl, overlayGain, overlaySrcRef);
          overlayVideoEl.currentTime = overlayHit.sourceTime;
          await overlayVideoEl.play().catch(() => {});
          lastOverlayClipId = overlayHit.clip.id;
        }
        const mixKeepsOwnAudio = await applyReplacementAudio(overlayHit.clip, overlayReplaceAudioEl, overlayReplaceGain, overlayReplaceSrcRef, overlayReplaceLastRef);
        overlayGain.gain.value = (overlayHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0;
      } else {
        overlayGain.gain.value = 0;
        overlayReplaceGain.gain.value = 0;
      }

      drawCompositionFrame(ctx, {
        timeline,
        mainEl: mainHit ? mainVideoEl : null,
        overlayEl: overlayHit ? (overlayIsImage ? overlayImageEl : overlayVideoEl) : null,
        rounded: true,
        border: true,
      });

      onProgress?.(Math.min(1, t / totalDuration) * 0.7);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  await stopped;
  mainVideoEl.pause();
  overlayVideoEl.pause();
  mainReplaceAudioEl.pause();
  overlayReplaceAudioEl.pause();
  if (mainVideoEl.src) URL.revokeObjectURL(mainVideoEl.src);
  if (overlayVideoEl.src) URL.revokeObjectURL(overlayVideoEl.src);
  if (overlayImageEl.src) URL.revokeObjectURL(overlayImageEl.src);
  if (mainReplaceAudioEl.src) URL.revokeObjectURL(mainReplaceAudioEl.src);
  if (overlayReplaceAudioEl.src) URL.revokeObjectURL(overlayReplaceAudioEl.src);
  await audioCtx.close();

  const webmBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (!webmBlob.size) throw new TimelineRenderError('Recording produced no video data. Please try again.');

  onStatus?.('finalizing');
  const { remuxToMp4 } = await import('./ffmpegClient');
  const mp4Blob = await remuxToMp4(webmBlob, { onProgress: (p) => onProgress?.(0.7 + p * 0.3) });
  onStatus?.('done');
  return mp4Blob;
}

// Picks the right strategy — never silently substitutes one for the other.
export async function renderTimeline(timeline, callbacks) {
  const hasOverlay = timeline.compositionMode !== 'single' && getTrackClips(timeline, OVERLAY_TRACK).length > 0;
  return hasOverlay ? renderComposedTimeline(timeline, callbacks) : renderSimpleTimeline(timeline, callbacks);
}
