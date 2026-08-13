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

export class RenderError extends Error {
  constructor(message) {
    super(message || 'Could not create the video. Please try again.');
  }
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

// { file, peaks, transcript, onStatus('preparing'|'rendering'|'finalizing'|'done'), onProgress(0-1) }
export async function renderCaptionedVideo({ file, peaks, transcript, onStatus, onProgress }) {
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

  const canvas = document.createElement('canvas');
  canvas.width = COMPOSE_WIDTH;
  canvas.height = COMPOSE_HEIGHT;
  const ctx = canvas.getContext('2d');
  drawComposeFrame(ctx, { peaks, progress: 0, captionText: '' });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);

  const canvasStream = canvas.captureStream(30);
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

  await new Promise((resolve) => {
    function frame() {
      const elapsed = audioCtx.currentTime - startTime;
      const progress = Math.min(1, duration ? elapsed / duration : 1);
      const activeSeg = transcript ? findActiveSegment(transcript, elapsed) : null;
      drawComposeFrame(ctx, { peaks, progress, captionText: activeSeg?.text || '' });
      onProgress?.(progress * 0.7); // rendering is roughly 70% of the total wait; finalizing is the rest
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  await stopped;
  try { source.stop(); } catch { /* already stopped */ }
  await audioCtx.close();

  const webmBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (!webmBlob.size) {
    throw new RenderError('Recording produced no video data. Please try again.');
  }

  onStatus?.('finalizing');
  let mp4Blob;
  try {
    mp4Blob = await remuxToMp4(webmBlob, { onProgress: (p) => onProgress?.(0.7 + p * 0.3) });
  } catch (err) {
    if (err instanceof FfmpegLoadError || err instanceof FfmpegRenderError) throw new RenderError(err.message);
    throw new RenderError();
  }

  onStatus?.('done');
  return mp4Blob;
}
