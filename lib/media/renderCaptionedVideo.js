// The "Create Captioned Video" render pipeline: audio + a branded
// background + waveform + live captions -> a real, downloadable MP4.
// Two real steps, both genuinely tracked (never a fake percentage):
//   1. RENDERING — plays the decoded audio through Web Audio at normal
//      speed while drawing videoCompose.js's drawComposeFrame on every
//      animation frame, captured live via canvas.captureStream() +
//      MediaRecorder into a WebM blob. Progress here is real elapsed
//      audio time / total duration.
//   2. FINALIZING — ffmpegClient.js's remuxToMp4() turns that WebM into a
//      genuine MP4 container. Progress here is ffmpeg.wasm's own reported
//      progress, not a guess.
//
// This can only run roughly in real time (a 3-minute clip takes about 3
// minutes to render) because MediaRecorder captures the canvas live — that
// is disclosed to the user via the staged status labels, not hidden.

import { drawComposeFrame, COMPOSE_WIDTH, COMPOSE_HEIGHT } from './videoCompose';
import { decodeAudioFile } from './audioEncode';
import { findActiveSegment } from './transcript';
import { remuxToMp4, FfmpegLoadError, FfmpegRenderError } from './ffmpegClient';
import { validateRenderDuration } from './limits';

// 24fps rather than 30 — a mostly-static waveform+caption scene doesn't need
// 30, and every frame not recorded is one less frame the slow single-
// threaded ffmpeg.wasm encode has to process in the Finalizing MP4 step.
const CAPTURE_FPS = 24;

export class RenderError extends Error {
  constructor(message) {
    super(message || 'Could not create the video. Please try again.');
  }
}

// Thrown when the user clicks Cancel mid-render — distinct from RenderError
// so callers can treat it as an intentional stop, not a failure to report.
export class RenderCancelledError extends Error {
  constructor() {
    super('Rendering was cancelled.');
  }
}

function checkCancelled(cancelToken) {
  if (cancelToken?.cancelled) throw new RenderCancelledError();
}

export function isCaptionedVideoSupported() {
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

// { file, peaks, transcript, onStatus('preparing'|'rendering'|'finalizing'|'done'),
//   onProgress(0-1), cancelToken: { cancelled: bool } } — cancelToken is a
// plain mutable object the caller creates and flips to true from a Cancel
// button; checked at every natural stopping point in this function, and
// (for the ffmpeg.wasm step, which can't be interrupted mid-call any other
// way) the caller must also call ffmpegClient.js's terminateFFmpeg() to
// actually break the in-flight exec().
export async function renderCaptionedVideo({ file, peaks, transcript, onStatus, onProgress, cancelToken, background, showWaveform }) {
  if (!isCaptionedVideoSupported()) {
    throw new RenderError('Video creation isn\'t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.');
  }

  onStatus?.('preparing');
  let audioBuffer;
  try {
    audioBuffer = await decodeAudioFile(file);
  } catch {
    throw new RenderError('Could not read this file\'s audio.');
  }

  const durationError = validateRenderDuration(audioBuffer.duration);
  if (durationError) throw new RenderError(durationError);

  checkCancelled(cancelToken);

  const canvas = document.createElement('canvas');
  canvas.width = COMPOSE_WIDTH;
  canvas.height = COMPOSE_HEIGHT;
  const ctx = canvas.getContext('2d');
  drawComposeFrame(ctx, { peaks, progress: 0, captionText: '', background, showWaveform });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);

  const canvasStream = canvas.captureStream(CAPTURE_FPS);
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

  const mimeType = pickMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
  } catch {
    await audioCtx.close();
    throw new RenderError('This browser can\'t record video. Try a recent version of Chrome, Edge, or Firefox.');
  }
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new RenderError('Recording failed while creating the video.'));
  });

  onStatus?.('rendering');
  const duration = audioBuffer.duration;
  recorder.start();
  const startTime = audioCtx.currentTime;
  source.start(0);

  const wasCancelledDuringRecording = await new Promise((resolve) => {
    function frame() {
      if (cancelToken?.cancelled) { resolve(true); return; }
      const elapsed = audioCtx.currentTime - startTime;
      const progress = Math.min(1, duration ? elapsed / duration : 1);
      const activeSeg = transcript ? findActiveSegment(transcript, elapsed) : null;
      drawComposeFrame(ctx, { peaks, progress, captionText: activeSeg?.text || '', background, showWaveform });
      onProgress?.(progress * 0.7); // rendering is roughly 70% of the total wait; finalizing is the rest
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        resolve(false);
      }
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  await stopped.catch(() => {}); // cancellation can leave the recorder in a state where onerror fires; the cancellation itself already takes priority below
  try { source.stop(); } catch { /* already stopped */ }
  await audioCtx.close();

  if (wasCancelledDuringRecording) throw new RenderCancelledError();

  const webmBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (!webmBlob.size) {
    throw new RenderError('Recording produced no video data. Please try again.');
  }

  checkCancelled(cancelToken);

  onStatus?.('finalizing');
  let mp4Blob;
  try {
    mp4Blob = await remuxToMp4(webmBlob, { onProgress: (p) => onProgress?.(0.7 + p * 0.3), fps: CAPTURE_FPS });
  } catch (err) {
    // A Cancel click during Finalizing calls ffmpegClient.js's terminateFFmpeg(),
    // which is the only way to interrupt an in-flight exec() — that rejects
    // this call with whatever error ffmpeg.wasm's worker teardown produces,
    // so cancelToken (set by the same Cancel handler) is the reliable signal
    // for "this failure was intentional," not the rejection's own message.
    if (cancelToken?.cancelled) throw new RenderCancelledError();
    if (err instanceof FfmpegLoadError || err instanceof FfmpegRenderError) throw new RenderError(err.message);
    throw new RenderError();
  }

  onStatus?.('done');
  return mp4Blob;
}
