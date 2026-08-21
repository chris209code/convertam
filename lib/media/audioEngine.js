// Web Audio scheduling/live-graph engine for Recording Studio — everything
// here deals in real AudioContext/AudioNode objects and wall-clock
// scheduling, as opposed to lib/media/audioTimeline.js's plain data model.
//
// Scheduling approach: rather than continuously re-evaluating "what should
// be playing right now" every animation frame, every clip that will play
// during this run is scheduled ONCE, up front, using AudioBufferSourceNode's
// own sample-accurate start(when, offset, duration) — the standard Web
// Audio pattern for gapless, drift-free multitrack playback. A seek/edit/
// pause simply stops everything and re-schedules from the new position.

import { clipDuration, isTrackAudible, buildDuckGainCurve } from './audioTimeline';

export function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass();
}

// A synthetic reverb impulse response — exponentially-decaying white noise,
// the standard dependency-free way to get a plausible-sounding ConvolverNode
// reverb without shipping or recording an actual impulse-response sample
// file. `decay` shapes how quickly it dies away (higher = shorter/tighter).
function generateReverbImpulse(ctx, durationSeconds = 2.2, decay = 2.5) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// Maps compressorAmount (0..100, "how much") to real DynamicsCompressorNode
// parameters — a normal user is never shown threshold/ratio/knee directly,
// per the product requirement to keep this understandable.
function applyCompressorAmount(node, amount) {
  const t = Math.max(0, Math.min(100, amount)) / 100;
  node.threshold.value = -6 - t * 30; // 0% = -6dB (barely engages), 100% = -36dB (heavily squashed)
  node.ratio.value = 2 + t * 10; // 2:1 .. 12:1
  node.knee.value = 6;
  node.attack.value = 0.003;
  node.release.value = 0.25;
}

// Builds one track's full processing chain and connects it to `destination`.
// Returns the chain's input node (what a clip's own per-clip gain node
// should connect into) plus every live-adjustable node so the caller can
// push new slider values in without rebuilding the graph — rebuilding a
// live audio graph on every slider tick would click/pop.
export function buildTrackChain(ctx, track, destination) {
  const input = ctx.createGain(); // per-track volume/mute
  const bass = ctx.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 200;
  const treble = ctx.createBiquadFilter();
  treble.type = 'highshelf';
  treble.frequency.value = 3500;
  const compressor = ctx.createDynamicsCompressor();

  // Reverb and echo are both wet/dry parallel sends: input splits into a
  // dry path and an effect path, each through its own gain, recombined
  // before the panner — the standard way to make an effect's "amount"
  // slider behave like a mix knob rather than an on/off switch.
  const dryForReverb = ctx.createGain();
  const reverbSend = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = generateReverbImpulse(ctx);
  const reverbMix = ctx.createGain();

  const dryForEcho = ctx.createGain();
  const echoSend = ctx.createGain();
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = 0.32;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.32;
  const echoMix = ctx.createGain();

  const panner = ctx.createStereoPanner();

  input.connect(bass);
  bass.connect(treble);
  treble.connect(compressor);

  compressor.connect(dryForReverb);
  compressor.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(reverbMix);
  dryForReverb.connect(echoMix); // dry reverb path feeds straight into the echo stage's own dry side
  reverbMix.connect(echoMix);

  echoMix.connect(dryForEcho);
  echoMix.connect(echoSend);
  echoSend.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay); // feedback loop
  delay.connect(panner);
  dryForEcho.connect(panner);

  panner.connect(destination);

  const nodes = { input, bass, treble, compressor, dryForReverb, reverbSend, reverbMix, dryForEcho, echoSend, delay, delayFeedback, echoMix, panner };
  applyTrackChainParams(nodes, track);
  return nodes;
}

// Pushes a track's current gain/pan/effects values into an already-built
// live chain — called on build and whenever the user moves a slider, using
// setTargetAtTime for anything audibly steppy (volume/pan) so changes ramp
// smoothly instead of clicking.
export function applyTrackChainParams(nodes, track, when) {
  const t = when ?? (nodes.input.context.currentTime);
  const volume = track.muted ? 0 : track.gain;
  nodes.input.gain.setTargetAtTime(volume, t, 0.015);
  nodes.panner.pan.setTargetAtTime(track.pan, t, 0.015);
  nodes.bass.gain.setTargetAtTime(track.effects.bassDb, t, 0.02);
  nodes.treble.gain.setTargetAtTime(track.effects.trebleDb, t, 0.02);
  applyCompressorAmount(nodes.compressor, track.effects.compressorAmount);

  const reverbWet = Math.max(0, Math.min(100, track.effects.reverbAmount)) / 100;
  nodes.reverbSend.gain.setTargetAtTime(reverbWet, t, 0.02);
  nodes.dryForReverb.gain.setTargetAtTime(1, t, 0.02); // dry path always fully present; only the wet send scales with amount

  const echoWet = Math.max(0, Math.min(100, track.effects.echoAmount)) / 100;
  nodes.echoSend.gain.setTargetAtTime(echoWet, t, 0.02);
  nodes.dryForEcho.gain.setTargetAtTime(1, t, 0.02);
}

// Master bus: gain -> optional gentle limiter (a fast, high-ratio
// DynamicsCompressorNode; there's no dedicated "limiter" Web Audio node, but
// aggressive compressor settings are the standard way to approximate one) ->
// analyser (for the master level meter) -> destination.
export function buildMasterChain(ctx, timeline) {
  const gainNode = ctx.createGain();
  gainNode.gain.value = timeline.masterMuted ? 0 : timeline.masterVolume;
  const limiterNode = ctx.createDynamicsCompressor();
  limiterNode.threshold.value = -1;
  limiterNode.ratio.value = 20;
  limiterNode.knee.value = 0;
  limiterNode.attack.value = 0.002;
  limiterNode.release.value = 0.1;
  const analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 256;

  gainNode.connect(limiterNode);
  if (timeline.masterLimiter) {
    limiterNode.connect(analyserNode);
  } else {
    // Bypass: connect gain straight to the analyser/destination, skip the
    // limiter node's processing entirely rather than just zeroing it out.
    gainNode.disconnect();
    gainNode.connect(analyserNode);
  }
  analyserNode.connect(ctx.destination);
  return { gainNode, limiterNode, analyserNode };
}

export function applyMasterChainParams(nodes, timeline, ctx) {
  const t = ctx.currentTime;
  nodes.gainNode.gain.setTargetAtTime(timeline.masterMuted ? 0 : timeline.masterVolume, t, 0.015);
}

// 0..1 current peak amplitude from an AnalyserNode's time-domain data — the
// same lightweight metering technique Video Editor's own peak meter already
// uses (fftSize 256, read on every animation frame from the UI side).
export function getPeakLevel(analyser) {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i] - 128) / 128;
    if (v > peak) peak = v;
  }
  return peak;
}

// Schedules every clip that will sound between `fromPlayhead` and the end
// of the timeline, across every audible track, starting "now" on `ctx`.
// Returns the list of live nodes created so the caller can stop them later
// (on pause/seek/stop/edit) — nothing here is ever left playing past what
// this function itself started.
export function scheduleTimelinePlayback({ ctx, timeline, trackChains, fromPlayhead, rate = 1 }) {
  const scheduled = [];
  const startWall = ctx.currentTime + 0.05; // tiny lead time so scheduling math is never in the past by the time it's applied

  timeline.tracks.forEach((track) => {
    if (!isTrackAudible(timeline, track.id)) return;
    const chain = trackChains[track.id];
    if (!chain) return;

    timeline.clips
      .filter((c) => c.trackId === track.id)
      .forEach((clip) => {
        const source = timeline.sources.find((s) => s.id === clip.sourceId);
        if (!source?.buffer) return;
        const dur = clipDuration(clip);
        const clipEnd = clip.start + dur;
        if (clipEnd <= fromPlayhead + 0.01) return; // fully in the past, nothing to schedule

        const speed = clip.speed || 1;
        const intoClip = Math.max(0, fromPlayhead - clip.start); // timeline seconds already elapsed into this clip
        const whenWall = clip.start >= fromPlayhead ? startWall + (clip.start - fromPlayhead) / rate : startWall;
        const sourceOffset = clip.sourceStart + intoClip * speed;
        const remainingDur = dur - intoClip;
        if (remainingDur <= 0.01) return;

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = source.buffer;
        bufferSource.playbackRate.value = speed * rate;

        const clipGain = ctx.createGain();
        bufferSource.connect(clipGain);
        clipGain.connect(chain.input);

        // Fade automation as one ordered keyframe curve (timeline-time,
        // gain), built from the clip's own fadeIn/fadeOut window, then
        // interpolated at `fromPlayhead` and converted to wall-clock time —
        // avoids ever scheduling two automation events out of chronological
        // order, which Web Audio rejects, on a short clip where fadeIn and
        // fadeOut nearly meet.
        const fadeIn = clip.fadeIn || 0;
        const fadeOut = clip.fadeOut || 0;
        const target = clip.gain ?? 1;
        const keyframes = [{ t: clip.start, v: fadeIn > 0 ? 0 : target }];
        if (fadeIn > 0) keyframes.push({ t: clip.start + fadeIn, v: target });
        if (fadeOut > 0) keyframes.push({ t: clip.start + dur - fadeOut, v: target });
        keyframes.push({ t: clip.start + dur, v: fadeOut > 0 ? 0.0001 : target });

        function valueAt(timelineTime) {
          for (let i = 0; i < keyframes.length - 1; i++) {
            const a = keyframes[i], b = keyframes[i + 1];
            if (timelineTime >= a.t && timelineTime <= b.t) {
              const span = b.t - a.t;
              return span > 0 ? a.v + (b.v - a.v) * ((timelineTime - a.t) / span) : b.v;
            }
          }
          return target;
        }
        const toWall = (timelineTime) => startWall + (timelineTime - fromPlayhead) / rate;

        // Ducking replaces the plain fade-keyframe automation with one
        // combined fade*duck curve for the audible remainder of this clip —
        // skipped entirely (falling back to the lightweight keyframe path
        // below) whenever the track isn't ducking against anything, so a
        // timeline with no ducking configured never pays this cost or
        // changes behavior at all.
        const duckStepSeconds = 0.05;
        const duckSpanStart = Math.max(clip.start, fromPlayhead);
        const duckCurve = track.duckAgainst
          ? buildDuckGainCurve(timeline, track.duckAgainst, duckSpanStart, clip.start + dur, duckStepSeconds)
          : null;

        if (duckCurve && duckCurve.length > 0) {
          const combined = new Float32Array(duckCurve.length);
          for (let i = 0; i < duckCurve.length; i++) {
            combined[i] = valueAt(duckSpanStart + i * duckStepSeconds) * duckCurve[i];
          }
          const curveWallDuration = (clip.start + dur - duckSpanStart) / rate;
          if (curveWallDuration > 0) clipGain.gain.setValueCurveAtTime(combined, toWall(duckSpanStart), curveWallDuration);
        } else {
          clipGain.gain.setValueAtTime(valueAt(fromPlayhead), whenWall);
          keyframes
            .filter((k) => k.t > fromPlayhead + 0.001)
            .forEach((k) => clipGain.gain.linearRampToValueAtTime(k.v, toWall(k.t)));
        }

        // `duration` is expressed in the BUFFER's own time units (unaffected
        // by playbackRate — only offset/duration share that timebase), so
        // the remaining TIMELINE duration must be converted back to source
        // time by multiplying by speed, not dividing.
        bufferSource.start(whenWall, sourceOffset, remainingDur * speed + 0.05);
        scheduled.push(bufferSource);
      });
  });

  return scheduled;
}

export function stopAllScheduled(nodes) {
  nodes.forEach((n) => {
    try { n.stop(); } catch { /* already stopped/ended — fine to ignore */ }
    try { n.disconnect(); } catch { /* no-op */ }
  });
}

