// Non-destructive editing data model — extends the Media Workspace engine
// (lib/media/*) with a timeline of clips referencing trim points into
// uploaded sources, never mutating the original file. Every operation here
// is a pure function returning a new timeline object, so the calling
// component can keep its own undo/redo history as a stack of snapshots
// (the same past/future array pattern already used by
// components/tools/data-tools/TextCleanerStudio.js) without this module
// needing to know anything about React.
//
// V1 scope (per the spec's explicit priority order): trim, split, delete,
// join/reorder, and up to two video tracks — one main track plus one
// optional overlay track for split-screen/picture-in-picture composition.
// This is deliberately not a full multi-track NLE; it covers exactly the
// "two-video split screen" / "main + overlay" use cases asked for, not an
// open-ended number of tracks.

let idCounter = 0;
function nextId(prefix) { idCounter += 1; return `${prefix}-${Date.now().toString(36)}-${idCounter}`; }

export const MAIN_TRACK = 0;
export const OVERLAY_TRACK = 1;

export function createTimeline() {
  return {
    sources: [], // [{ id, file, kind, duration, width, height, hasAudio }]
    clips: [], // [{ id, sourceId, track, sourceStart, sourceEnd, order, audioMode, position, scale }]
    compositionMode: 'single', // 'single' | 'split-lr' | 'split-tb' | 'pip'
    dividerRatio: 0.5, // for split-lr/split-tb
    pipCorner: 'bottom-right', // for pip — quick-position preset buttons
    pipPosition: { x: 1, y: 1 }, // for pip — continuous 0..1 fraction of the valid drag range, source of truth for both preview and export
    pipSizeRatio: 0.3, // for pip, fraction of canvas width
  };
}

// `kind` is passed explicitly by the caller rather than inferred from
// metadata shape, since both video and image metadata carry width/height —
// there's no reliable way to tell them apart after the fact.
export function addSource(timeline, file, metadata, kind = 'video') {
  const isImage = kind === 'image';
  const source = {
    id: nextId('src'),
    file,
    kind,
    duration: isImage ? null : metadata.duration,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    hasAudio: isImage ? false : (metadata.hasAudio ?? true),
  };
  return { timeline: { ...timeline, sources: [...timeline.sources, source] }, source };
}

// Adds a clip spanning the source's full duration onto `track`, placed
// after any existing clips on that track. An image source has no time
// dimension of its own — it's treated as a static visual that fills
// whatever span it's given (see findActiveClipAt), so sourceEnd is a
// placeholder rather than a real duration.
export function addClip(timeline, sourceId, track = MAIN_TRACK) {
  const source = timeline.sources.find((s) => s.id === sourceId);
  if (!source) return timeline;
  const isImage = source.kind === 'image';
  const trackClips = getTrackClips(timeline, track);
  const order = trackClips.length ? trackClips[trackClips.length - 1].order + 1 : 0;
  const clip = {
    id: nextId('clip'),
    sourceId,
    track,
    sourceStart: 0,
    sourceEnd: isImage ? 0 : source.duration,
    order,
    audioMode: source.hasAudio ? 'keep' : 'mute', // 'keep' | 'mute' | 'replace' — see setClipAudioMode
    audioSourceId: null, // an 'audio'-kind source id, only meaningful when audioMode === 'replace'
    position: track === OVERLAY_TRACK ? { x: 0.68, y: 0.68 } : { x: 0, y: 0 },
    scale: track === OVERLAY_TRACK ? 0.3 : 1,
  };
  return { ...timeline, clips: [...timeline.clips, clip] };
}

export function getTrackClips(timeline, track) {
  return timeline.clips.filter((c) => c.track === track).sort((a, b) => a.order - b.order);
}

function clipDuration(clip) {
  return Math.max(0, clip.sourceEnd - clip.sourceStart);
}

// Total length of the main track — this defines the overall timeline
// duration; overlay-track clips are time-aligned against it, not summed
// separately, since they play concurrently rather than sequentially.
export function getTotalDuration(timeline) {
  return getTrackClips(timeline, MAIN_TRACK).reduce((sum, c) => sum + clipDuration(c), 0);
}

// Trim = adjust a clip's in/out points within its source. Never touches
// the source file itself, only the clip's reference into it.
export function trimClip(timeline, clipId, { sourceStart, sourceEnd }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id !== clipId) return c;
      const source = timeline.sources.find((s) => s.id === c.sourceId);
      const maxEnd = source ? source.duration : sourceEnd;
      const newStart = Math.max(0, Math.min(sourceStart, maxEnd));
      const newEnd = Math.max(newStart + 0.05, Math.min(sourceEnd, maxEnd));
      return { ...c, sourceStart: newStart, sourceEnd: newEnd };
    }),
  };
}

// Split = cut one clip into two adjacent clips at `atSourceTime` (a point
// within the clip's own source range, not timeline-relative). Splitting
// then deleting the unwanted half is how "cut" is expressed — there is no
// separate destructive delete-from-source operation, consistent with the
// non-destructive editing principle.
export function splitClip(timeline, clipId, atSourceTime) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  if (atSourceTime <= clip.sourceStart + 0.05 || atSourceTime >= clip.sourceEnd - 0.05) return timeline;

  const first = { ...clip, sourceEnd: atSourceTime };
  const second = { ...clip, id: nextId('clip'), sourceStart: atSourceTime, order: clip.order + 0.5 };
  const clips = timeline.clips
    .filter((c) => c.id !== clipId)
    .concat([first, second])
    .map((c, i, arr) => c) // order values may be fractional after a split; renormalize below
  return { ...timeline, clips: renormalizeOrder(clips, clip.track) };
}

function renormalizeOrder(clips, track) {
  const onTrack = clips.filter((c) => c.track === track).sort((a, b) => a.order - b.order);
  const others = clips.filter((c) => c.track !== track);
  const renumbered = onTrack.map((c, i) => ({ ...c, order: i }));
  return [...others, ...renumbered];
}

export function deleteClip(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const remaining = timeline.clips.filter((c) => c.id !== clipId);
  return { ...timeline, clips: renormalizeOrder(remaining, clip.track) };
}

// Join/merge = when two adjacent clips reference the same source with
// contiguous sourceStart/sourceEnd (e.g. the two halves of a split that
// was never actually edited apart), collapse them back into one clip.
// This mirrors transcript.js's mergeSegments for the same "undo an
// unnecessary split" use case.
export function joinClips(timeline, clipIdA, clipIdB) {
  const a = timeline.clips.find((c) => c.id === clipIdA);
  const b = timeline.clips.find((c) => c.id === clipIdB);
  if (!a || !b || a.track !== b.track) return timeline;
  const [first, second] = a.order < b.order ? [a, b] : [b, a];
  const merged = { ...first, sourceEnd: Math.max(first.sourceEnd, second.sourceEnd) };
  const remaining = timeline.clips.filter((c) => c.id !== clipIdA && c.id !== clipIdB).concat([merged]);
  return { ...timeline, clips: renormalizeOrder(remaining, a.track) };
}

// Reorder = move a clip to a new position within its track's sequence.
export function reorderClip(timeline, clipId, newIndex) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const trackClips = getTrackClips(timeline, clip.track).filter((c) => c.id !== clipId);
  const clamped = Math.max(0, Math.min(newIndex, trackClips.length));
  trackClips.splice(clamped, 0, clip);
  const others = timeline.clips.filter((c) => c.track !== clip.track);
  return { ...timeline, clips: [...others, ...trackClips.map((c, i) => ({ ...c, order: i }))] };
}

// audioMode: 'keep' (the clip's own audio, unchanged) | 'mute' (silent) |
// 'replace' (swap the clip's own audio out entirely for audioSourceId's
// file) | 'mix' (play the clip's own audio together with audioSourceId's
// file, e.g. background music under original dialogue). audioSourceId
// references an 'audio'-kind source (see addSource) and is only read for
// 'replace'/'mix' — passing it for 'keep'/'mute' is harmless but ignored by
// the render pipeline, and omitting it (undefined) leaves the clip's
// existing audioSourceId untouched rather than clearing it, so switching
// away from and back to 'replace' doesn't lose a previously chosen file.
export function setClipAudioMode(timeline, clipId, audioMode, audioSourceId) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, audioMode, audioSourceId: audioSourceId !== undefined ? audioSourceId : c.audioSourceId }
      : c)),
  };
}

export function setClipPosition(timeline, clipId, position, scale) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, position: position ?? c.position, scale: scale ?? c.scale } : c)),
  };
}

export function setCompositionMode(timeline, compositionMode) {
  return { ...timeline, compositionMode };
}

export function setDividerRatio(timeline, dividerRatio) {
  return { ...timeline, dividerRatio: Math.max(0.1, Math.min(0.9, dividerRatio)) };
}

// Corner presets remain as quick-jump buttons alongside free dragging —
// picking one also snaps the continuous pipPosition to that corner, so a
// drag started right after stays consistent with what's on screen.
const CORNER_POSITIONS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
};

export function setPipCorner(timeline, pipCorner) {
  return { ...timeline, pipCorner, pipPosition: CORNER_POSITIONS[pipCorner] || timeline.pipPosition };
}

// position is { x, y }, each a 0..1 fraction of the valid drag range —
// clamped here so a clip can never be dragged (or restored from a stale
// state) completely outside the composition bounds.
export function setPipPosition(timeline, position) {
  return {
    ...timeline,
    pipPosition: { x: Math.max(0, Math.min(1, position.x)), y: Math.max(0, Math.min(1, position.y)) },
  };
}

export function setPipSizeRatio(timeline, pipSizeRatio) {
  return { ...timeline, pipSizeRatio: Math.max(0.15, Math.min(0.6, pipSizeRatio)) };
}

export function removeSource(timeline, sourceId) {
  return {
    ...timeline,
    sources: timeline.sources.filter((s) => s.id !== sourceId),
    clips: timeline.clips.filter((c) => c.sourceId !== sourceId),
  };
}

// Finds which clip on `track` is active at a given timeline-relative time
// (0..getTotalDuration), and the corresponding source-relative time within
// that clip — used to drive playback/preview and to know what to draw.
export function findActiveClipAt(timeline, track, timelineSeconds) {
  const trackClips = getTrackClips(timeline, track);
  let elapsed = 0;
  for (const clip of trackClips) {
    const source = timeline.sources.find((s) => s.id === clip.sourceId);
    const isStatic = source && source.kind === 'image';
    // A static image has no time dimension — once reached, it fills the
    // rest of the track's timeline rather than being bounded by a duration.
    const dur = isStatic ? Infinity : clipDuration(clip);
    if (timelineSeconds >= elapsed && timelineSeconds < elapsed + dur) {
      return { clip, sourceTime: isStatic ? 0 : clip.sourceStart + (timelineSeconds - elapsed) };
    }
    elapsed += dur;
  }
  return null;
}

export { clipDuration };
