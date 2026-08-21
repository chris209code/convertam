// Non-destructive multitrack audio editing data model for Recording Studio.
// Pure functions returning new timeline snapshots — same past/future
// undo/redo pattern already used by lib/media/timeline.js (Video Editor),
// but audio-only and shaped differently on purpose: tracks here are
// independent free-form lanes (gaps allowed, no ripple/reflow on delete),
// each carrying its own mix state (gain/pan/mute/solo/effects), since
// that's how a real multitrack recorder behaves — there is no single
// "main track" the way Video Editor has one.
//
// `sources` hold already-decoded AudioBuffers (recording and importing both
// produce one via lib/media/audioEncode.js's decodeAudioFile, or directly
// from MediaRecorder's captured take) rather than raw File references, so
// playback/scheduling/rendering never has to re-decode mid-session.

import { rmsWindowAt, applyDuckHold, presenceToGain, RMS_PRESENCE_THRESHOLD } from './ducking';

let idCounter = 0;
function nextId(prefix) { idCounter += 1; return `${prefix}-${Date.now().toString(36)}-${idCounter}`; }

export function createAudioTimeline() {
  return {
    sources: [], // [{ id, name, buffer (AudioBuffer), duration }]
    tracks: [], // [{ id, name, gain, pan, muted, solo, armed, effects }]
    clips: [], // [{ id, sourceId, trackId, start, sourceStart, sourceEnd, gain, fadeIn, fadeOut, speed }]
    masterVolume: 1,
    masterMuted: false,
    masterLimiter: true, // a gentle safety limiter on the master bus — see audioEngine.js
  };
}

export function defaultTrackEffects() {
  return {
    bassDb: 0, // -12..+12, low-shelf around 200Hz
    trebleDb: 0, // -12..+12, high-shelf around 3.5kHz
    compressorAmount: 0, // 0..100 — 0 = bypassed
    reverbAmount: 0, // 0..100 — wet mix %, 0 = bypassed (no convolver work done)
    echoAmount: 0, // 0..100 — wet mix %, 0 = bypassed
  };
}

export function addTrack(timeline, name) {
  const track = {
    id: nextId('track'),
    name: name || `Track ${timeline.tracks.length + 1}`,
    gain: 1,
    pan: 0,
    muted: false,
    solo: false,
    effects: defaultTrackEffects(),
    duckAgainst: null, // another track's id — this track's clips duck (lower in volume) whenever THAT track has signal, e.g. music ducking under a vocal track
  };
  return { timeline: { ...timeline, tracks: [...timeline.tracks, track] }, track };
}

export function removeTrack(timeline, trackId) {
  return {
    ...timeline,
    // Any other track ducking against the one being removed reverts to no
    // ducking, rather than silently pointing at a track that no longer exists.
    tracks: timeline.tracks.filter((t) => t.id !== trackId).map((t) => (t.duckAgainst === trackId ? { ...t, duckAgainst: null } : t)),
    clips: timeline.clips.filter((c) => c.trackId !== trackId),
  };
}

export function renameTrack(timeline, trackId, name) {
  return { ...timeline, tracks: timeline.tracks.map((t) => (t.id === trackId ? { ...t, name } : t)) };
}

function patchTrack(timeline, trackId, patch) {
  return { ...timeline, tracks: timeline.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) };
}

export function setTrackGain(timeline, trackId, gain) { return patchTrack(timeline, trackId, { gain: Math.max(0, Math.min(2, gain)) }); }
export function setTrackPan(timeline, trackId, pan) { return patchTrack(timeline, trackId, { pan: Math.max(-1, Math.min(1, pan)) }); }
export function setTrackMuted(timeline, trackId, muted) { return patchTrack(timeline, trackId, { muted }); }
export function setTrackSolo(timeline, trackId, solo) { return patchTrack(timeline, trackId, { solo }); }
// duckAgainst: null clears ducking; also refuses to point a track at itself,
// which would be a meaningless self-reference.
export function setTrackDuck(timeline, trackId, duckAgainst) {
  return patchTrack(timeline, trackId, { duckAgainst: duckAgainst === trackId ? null : duckAgainst });
}

export function setTrackEffect(timeline, trackId, patch) {
  return {
    ...timeline,
    tracks: timeline.tracks.map((t) => (t.id === trackId ? { ...t, effects: { ...t.effects, ...patch } } : t)),
  };
}

// Standard mute/solo resolution: if ANY track is soloed, only soloed tracks
// (that aren't also muted) are audible; otherwise every non-muted track is —
// same rule lib/media/timeline.js's isOverlayTrackAudible() already applies
// to overlay tracks, just at the track level instead of clip level here.
export function isTrackAudible(timeline, trackId) {
  const track = timeline.tracks.find((t) => t.id === trackId);
  if (!track || track.muted) return false;
  const anySolo = timeline.tracks.some((t) => t.solo);
  return anySolo ? track.solo : true;
}

export function addSource(timeline, { name, buffer }) {
  const source = { id: nextId('src'), name: name || 'Untitled', buffer, duration: buffer.duration };
  return { timeline: { ...timeline, sources: [...timeline.sources, source] }, source };
}

export function removeSource(timeline, sourceId) {
  return {
    ...timeline,
    sources: timeline.sources.filter((s) => s.id !== sourceId),
    clips: timeline.clips.filter((c) => c.sourceId !== sourceId),
  };
}

export function getTrackClips(timeline, trackId) {
  return timeline.clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start);
}

// A clip's footprint on the TIMELINE, not in its source — a clip played at
// 2x speed occupies half the timeline time its trimmed source range would
// otherwise take. Mirrors lib/media/timeline.js's clipDuration exactly.
export function clipDuration(clip) {
  return Math.max(0, (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1));
}

// The longest reach of any clip on ANY track — there's no single sequential
// "main track" here to measure against the way Video Editor has one.
export function getTotalDuration(timeline) {
  return timeline.clips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0);
}

function spansOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

// Places a new clip spanning the source's full duration onto `trackId`. If
// `start` isn't given, it's appended right after that track's last clip (or
// at 0 if the track is empty) — the common case for a fresh recording or
// import landing on an otherwise-empty or already-arranged track.
export function addClip(timeline, trackId, sourceId, { start, sourceStart = 0, sourceEnd } = {}) {
  const source = timeline.sources.find((s) => s.id === sourceId);
  if (!source) return { timeline, clip: null };
  const end = sourceEnd ?? source.duration;
  const trackClips = getTrackClips(timeline, trackId);
  const defaultStart = trackClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0);
  const clip = {
    id: nextId('clip'),
    sourceId,
    trackId,
    start: start != null ? Math.max(0, start) : defaultStart,
    sourceStart,
    sourceEnd: end,
    gain: 1,
    fadeIn: 0,
    fadeOut: 0,
    speed: 1,
  };
  return { timeline: { ...timeline, clips: [...timeline.clips, clip] }, clip };
}

// Trim = adjust a clip's in/out points and/or timeline position together,
// atomically. The caller computes the paired values for whichever handle is
// being dragged (a left-handle drag moves `start` and `sourceStart` forward
// together so the clip's END stays put; a right-handle drag only changes
// `sourceEnd`) — this function just validates and clamps the result rather
// than guessing which handle was meant from a partial patch.
export function trimClip(timeline, clipId, { start, sourceStart, sourceEnd }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id !== clipId) return c;
      const source = timeline.sources.find((s) => s.id === c.sourceId);
      const maxEnd = source ? source.duration : c.sourceEnd;
      const nextSourceStart = Math.max(0, Math.min(sourceStart ?? c.sourceStart, maxEnd - 0.05));
      const nextSourceEnd = Math.max(nextSourceStart + 0.05, Math.min(sourceEnd ?? c.sourceEnd, maxEnd));
      const nextStart = Math.max(0, start ?? c.start);
      return { ...c, start: nextStart, sourceStart: nextSourceStart, sourceEnd: nextSourceEnd };
    }),
  };
}

// Split = cut one clip into two adjacent clips at a TIMELINE-relative point
// (unlike lib/media/timeline.js's splitClip, which takes a source-relative
// time — this one takes the playhead's own time directly since that's what
// every caller here actually has, converting to source time internally).
export function splitClip(timeline, clipId, atTimelineSeconds) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const dur = clipDuration(clip);
  if (atTimelineSeconds <= clip.start + 0.05 || atTimelineSeconds >= clip.start + dur - 0.05) return timeline;

  const speed = clip.speed || 1;
  const splitSourceTime = clip.sourceStart + (atTimelineSeconds - clip.start) * speed;
  const first = { ...clip, sourceEnd: splitSourceTime };
  const second = { ...clip, id: nextId('clip'), start: atTimelineSeconds, sourceStart: splitSourceTime };
  const clips = timeline.clips.filter((c) => c.id !== clipId).concat([first, second]);
  return { ...timeline, clips };
}

// Plain removal, no ripple — the clips after it on the same track (and every
// other track) stay exactly where they are, matching how deleting a clip
// works in a real DAW (leaves a gap behind, doesn't reflow anything).
export function deleteClip(timeline, clipId) {
  return { ...timeline, clips: timeline.clips.filter((c) => c.id !== clipId) };
}

export function deleteClips(timeline, clipIds) {
  const idSet = new Set(clipIds);
  return { ...timeline, clips: timeline.clips.filter((c) => !idSet.has(c.id)) };
}

// Inserts a copy immediately after the original (in time) on the same
// track — if that would overlap another clip already there, the copy is
// placed at the end of the track instead, so a duplicate can never silently
// create an overlap.
export function duplicateClip(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const dur = clipDuration(clip);
  const trackClips = getTrackClips(timeline, clip.trackId);
  const desiredStart = clip.start + dur;
  const desiredSpan = { start: desiredStart, end: desiredStart + dur };
  const collides = trackClips.some((c) => c.id !== clip.id && spansOverlap(desiredSpan, { start: c.start, end: c.start + clipDuration(c) }));
  const start = collides ? trackClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0) : desiredStart;
  const copy = { ...clip, id: nextId('clip'), start };
  return { ...timeline, clips: [...timeline.clips, copy] };
}

// Moves a clip to a new timeline position, optionally reassigning it to a
// different track (dragging a clip to another lane) — rejects the move
// entirely if it would overlap another clip already on the TARGET track, so
// a drag can never silently create an overlap or destroy another clip.
export function moveClip(timeline, clipId, newStart, newTrackId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const targetTrack = newTrackId || clip.trackId;
  const clampedStart = Math.max(0, newStart);
  const dur = clipDuration(clip);
  const span = { start: clampedStart, end: clampedStart + dur };
  const collides = timeline.clips.some((c) => c.id !== clipId && c.trackId === targetTrack && spansOverlap(span, { start: c.start, end: c.start + clipDuration(c) }));
  if (collides) return timeline;
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, start: clampedStart, trackId: targetTrack } : c)) };
}

export function setClipGain(timeline, clipId, gain) {
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, gain: Math.max(0, Math.min(4, gain)) } : c)) };
}

export function setClipFade(timeline, clipId, { fadeIn, fadeOut }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id !== clipId) return c;
      const dur = clipDuration(c);
      const maxFade = Math.max(0, dur / 2);
      return {
        ...c,
        fadeIn: fadeIn != null ? Math.max(0, Math.min(fadeIn, maxFade)) : c.fadeIn,
        fadeOut: fadeOut != null ? Math.max(0, Math.min(fadeOut, maxFade)) : c.fadeOut,
      };
    }),
  };
}

// The only property that changes a clip's EXPORTED duration/pitch — kept
// deliberately separate from the transport's preview-only playback speed
// (which never touches timeline data at all, see RecordingStudioWorkspace's
// previewRate). Changing this is a real, explicit "Speed" effect: it also
// shifts pitch, same tradeoff as any tape-speed change, since true
// pitch-independent time-stretching isn't reliably available client-side.
export function setClipSpeed(timeline, clipId, speed) {
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, speed: Math.max(0.5, Math.min(2, speed)) } : c)) };
}

// Crossfades two adjacent (or gapped) clips on the SAME track by pulling
// the right clip's start left into an overlap with the left clip's end and
// setting matching fadeOut/fadeIn lengths — a real crossfade, not just two
// back-to-back fades with silence between them, because the playback/
// render engines already sum whatever clips are live on a track
// simultaneously (there is no overlap check at the audio-graph level, only
// in the drag/duplicate gestures above, which this deliberately bypasses by
// writing clip.start directly rather than going through moveClip).
export function crossfadeClips(timeline, leftClipId, rightClipId, seconds) {
  const left = timeline.clips.find((c) => c.id === leftClipId);
  const right = timeline.clips.find((c) => c.id === rightClipId);
  if (!left || !right || left.trackId !== right.trackId || left.id === right.id) return timeline;
  const leftDur = clipDuration(left);
  const rightDur = clipDuration(right);
  const amount = Math.max(0.05, Math.min(seconds, leftDur / 2, rightDur / 2));
  const rightNewStart = Math.max(0, left.start + leftDur - amount);
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id === leftClipId) return { ...c, fadeOut: amount };
      if (c.id === rightClipId) return { ...c, start: rightNewStart, fadeIn: amount };
      return c;
    }),
  };
}

// Cuts detected silence ranges (source-relative, from silenceDetect.js —
// same coordinate space as clip.sourceStart/sourceEnd) out of one clip,
// replacing it with a run of new back-to-back clips covering only the
// "keep" segments, so the timeline gets shorter exactly where the pauses
// were rather than leaving silent gaps behind. A tiny fadeIn/fadeOut on
// every new segment avoids an audible click at each new cut point.
export function removeSilenceFromClip(timeline, clipId, silenceRanges) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip || !silenceRanges || !silenceRanges.length) return timeline;
  const speed = clip.speed || 1;
  const merged = silenceRanges
    .map((r) => ({ start: Math.max(clip.sourceStart, r.start), end: Math.min(clip.sourceEnd, r.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const keep = [];
  let cursor = clip.sourceStart;
  merged.forEach((r) => {
    if (r.start > cursor) keep.push({ start: cursor, end: r.start });
    cursor = Math.max(cursor, r.end);
  });
  if (cursor < clip.sourceEnd) keep.push({ start: cursor, end: clip.sourceEnd });
  if (keep.length === 0) return timeline;

  let t = clip.start;
  const newClips = keep.map((seg) => {
    const segClip = { ...clip, id: nextId('clip'), start: t, sourceStart: seg.start, sourceEnd: seg.end, fadeIn: 0.01, fadeOut: 0.01 };
    t += (seg.end - seg.start) / speed;
    return segClip;
  });
  return { ...timeline, clips: timeline.clips.filter((c) => c.id !== clipId).concat(newClips) };
}

// Builds the gain-multiplier curve (1 = full volume, DUCK_GAIN = ducked)
// that a clip on a duckAgainst-enabled track should be multiplied by across
// [fromT, toT) of TIMELINE time, based on whether the CONTROL track
// (duckAgainstTrackId) has an audible clip with actual signal at each
// step. Returns null when there's nothing to duck against (no such track,
// or it has no clips) so callers can cheaply skip the curve-automation
// path entirely for the common case of a track with ducking off.
export function buildDuckGainCurve(timeline, duckAgainstTrackId, fromT, toT, stepSeconds = 0.05) {
  if (!duckAgainstTrackId) return null;
  const controlClips = getTrackClips(timeline, duckAgainstTrackId);
  if (!controlClips.length) return null;
  const n = Math.max(1, Math.ceil((toT - fromT) / stepSeconds));
  const present = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const t = fromT + i * stepSeconds;
    const clip = controlClips.find((c) => t >= c.start && t < c.start + clipDuration(c));
    if (!clip) continue;
    const source = timeline.sources.find((s) => s.id === clip.sourceId);
    if (!source?.buffer) continue;
    const speed = clip.speed || 1;
    const sourceTime = clip.sourceStart + (t - clip.start) * speed;
    present[i] = rmsWindowAt(source.buffer.getChannelData(0), source.buffer.sampleRate, sourceTime) > RMS_PRESENCE_THRESHOLD;
  }
  return presenceToGain(applyDuckHold(present));
}

export function setMasterVolume(timeline, masterVolume) { return { ...timeline, masterVolume: Math.max(0, Math.min(2, masterVolume)) }; }
export function setMasterMuted(timeline, masterMuted) { return { ...timeline, masterMuted }; }
export function setMasterLimiter(timeline, masterLimiter) { return { ...timeline, masterLimiter }; }

// Every clip boundary (start and end) across every track, for the timeline
// UI's snap-while-dragging behavior.
export function getAllClipBoundaryTimes(timeline) {
  const times = new Set([0]);
  timeline.clips.forEach((c) => {
    times.add(c.start);
    times.add(c.start + clipDuration(c));
  });
  return Array.from(times).sort((a, b) => a - b);
}
