// Offline mixdown for Recording Studio's export — renders the ENTIRE
// timeline (every audible track's clips, gains, pans, per-track effects,
// fades, and the master bus) in one OfflineAudioContext.startRendering()
// pass, then hands the resulting stereo AudioBuffer to audioEncode.js's
// WAV/MP3 encoders. Reuses buildTrackChain from audioEngine.js so the
// exported mix uses exactly the same effect graph as live preview — an
// export can never sound different from what the user heard while editing.
//
// Deliberately NOT built on the real-time AudioContext + MediaRecorder
// approach lib/media/timelineRender.js's video export uses (that exists
// there because it's compositing live <video> elements frame-by-frame onto
// a canvas). An audio-only mixdown has no such live-element constraint, so
// a plain offline render is simpler, deterministic, and far faster than
// real-time capture — always ~sample-accurate, never affected by preview
// playback speed (which never reaches this render path at all: every
// bufferSource here plays at the clip's own real `speed`, never previewRate).

import { buildTrackChain } from './audioEngine';
import { clipDuration, getTotalDuration, isTrackAudible, buildDuckGainCurve } from './audioTimeline';
import { audioBufferToWavBlob, encodeMp3FromAudioBuffer } from './audioEncode';

export async function renderTimelineToBuffer(timeline) {
  const totalDuration = getTotalDuration(timeline);
  if (totalDuration <= 0) return null;

  const sampleRate = timeline.sources[0]?.buffer?.sampleRate || 44100;
  // A little tail room past the last clip's end so a reverb/echo/fade-out
  // still ringing out at the very end of the timeline isn't cut off.
  const length = Math.ceil((totalDuration + 1.5) * sampleRate);
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OfflineCtx(2, length, sampleRate);

  const masterGain = ctx.createGain();
  masterGain.gain.value = timeline.masterMuted ? 0 : timeline.masterVolume;
  let masterOut = masterGain;
  if (timeline.masterLimiter) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.ratio.value = 20;
    limiter.knee.value = 0;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    masterGain.connect(limiter);
    masterOut = limiter;
  }
  masterOut.connect(ctx.destination);

  timeline.tracks.forEach((track) => {
    if (!isTrackAudible(timeline, track.id)) return;
    const chain = buildTrackChain(ctx, track, masterGain);

    timeline.clips
      .filter((c) => c.trackId === track.id)
      .forEach((clip) => {
        const source = timeline.sources.find((s) => s.id === clip.sourceId);
        if (!source?.buffer) return;
        const dur = clipDuration(clip);
        if (dur <= 0) return;
        const speed = clip.speed || 1;

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = source.buffer;
        bufferSource.playbackRate.value = speed;

        const clipGain = ctx.createGain();
        bufferSource.connect(clipGain);
        clipGain.connect(chain.input);

        const target = clip.gain ?? 1;
        const fadeIn = clip.fadeIn || 0;
        const fadeOut = clip.fadeOut || 0;
        function fadeValueAt(timelineTime) {
          if (fadeIn > 0 && timelineTime < clip.start + fadeIn) return target * ((timelineTime - clip.start) / fadeIn);
          if (fadeOut > 0 && timelineTime > clip.start + dur - fadeOut) return target * ((clip.start + dur - timelineTime) / fadeOut);
          return target;
        }

        // Same duck-curve approach as the live scheduler in audioEngine.js
        // (see its own comment) — an export's mix must match exactly what
        // was previewed, so this uses the identical combined fade*duck
        // curve rather than a separately-tuned render-time approximation.
        const duckStepSeconds = 0.05;
        const duckCurve = track.duckAgainst ? buildDuckGainCurve(timeline, track.duckAgainst, clip.start, clip.start + dur, duckStepSeconds) : null;

        if (duckCurve && duckCurve.length > 0) {
          const combined = new Float32Array(duckCurve.length);
          for (let i = 0; i < duckCurve.length; i++) combined[i] = fadeValueAt(clip.start + i * duckStepSeconds) * duckCurve[i];
          clipGain.gain.setValueCurveAtTime(combined, clip.start, dur);
        } else {
          clipGain.gain.setValueAtTime(fadeIn > 0 ? 0 : target, clip.start);
          if (fadeIn > 0) clipGain.gain.linearRampToValueAtTime(target, clip.start + fadeIn);
          if (fadeOut > 0) {
            clipGain.gain.setValueAtTime(target, clip.start + dur - fadeOut);
            clipGain.gain.linearRampToValueAtTime(0.0001, clip.start + dur);
          }
        }

        // Same offset/duration timebase rule as the live scheduler in
        // audioEngine.js: both are in source-buffer time, so the clip's
        // TIMELINE duration (`dur`) is converted back via *speed.
        bufferSource.start(clip.start, clip.sourceStart, dur * speed + 0.05);
      });
  });

  return ctx.startRendering();
}

export async function renderTimelineToWav(timeline) {
  const buffer = await renderTimelineToBuffer(timeline);
  if (!buffer) return null;
  return audioBufferToWavBlob(buffer);
}

export async function renderTimelineToMp3(timeline, kbps = 128) {
  const buffer = await renderTimelineToBuffer(timeline);
  if (!buffer) return null;
  return encodeMp3FromAudioBuffer(buffer, kbps);
}
