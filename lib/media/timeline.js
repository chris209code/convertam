// Non-destructive editing data model — extends the Media Workspace engine
// (lib/media/*) with a timeline of clips referencing trim points into
// uploaded sources, never mutating the original file. Every operation here
// is a pure function returning a new timeline object, so the calling
// component can keep its own undo/redo history as a stack of snapshots
// (the same past/future array pattern already used by
// components/tools/data-tools/TextCleanerStudio.js) without this module
// needing to know anything about React.
//
// V2 scope: trim, split, delete, join/reorder, and one main track plus an
// open-ended number of overlay tracks (timeline.overlayTracks), each independently
// composed as picture-in-picture (or, when it's the only overlay track,
// split-screen). This is what a multi-participant "video call" layout or a
// grid of several PIP tiles needs — earlier versions fixed the overlay slot
// count at exactly one (OVERLAY_TRACK); that constant is gone, replaced by
// per-track ids handed out by addOverlayTrack().

let idCounter = 0;
function nextId(prefix) { idCounter += 1; return `${prefix}-${Date.now().toString(36)}-${idCounter}`; }

export const MAIN_TRACK = 0;

export function createTimeline() {
  return {
    sources: [], // [{ id, file, kind, duration, width, height, hasAudio }]
    clips: [], // [{ id, sourceId, track, sourceStart, sourceEnd, order, audioMode, position, scale }]
    overlayTracks: [], // [{ id, mode: 'pip'|'split-lr'|'split-tb', pipCorner, pipPosition, pipSizeRatio, dividerRatio }] — ordered bottom-to-top compositing order; split-lr/split-tb only take effect when this is the ONLY overlay track (see computeLayoutRects)
    fitMode: 'cover', // 'cover' (crop to fill, never distorts, never shows a gap) | 'contain' (show the whole frame, letterboxed with backgroundFill in the gaps)
    backgroundFill: '#0F172A', // fills any letterbox gap left by 'contain', and the composition's own background before either track is drawn
    frameAspect: 'landscape', // 'landscape' (16:9) | 'square' (1:1) | 'vertical' (9:16) — the exported/composed canvas shape, see compositionLayouts.js's FRAME_ASPECTS
    textOverlays: [], // [{ id, text, preset, font, size, bold, italic, align, color, background, backgroundColor, opacity, x, y, start, end }] — always-on-top text layers, independent of clips/tracks
    imageOverlays: [], // [{ id, sourceId, x, y, scale, opacity, start, end }] — logo/watermark layers; sourceId points at a normal 'image' source, never added as a track clip
    shapeOverlays: [], // [{ id, type: 'rectangle'|'circle'|'line'|'arrow', x, y, width, height, x2, y2, color, filled, strokeWidth, opacity, start, end }] — same "always-on-top layer, independent of clips" idea as text/image overlays
    exportResolution: '1080p', // '480p' | '720p' | '1080p' — scales the frameAspect's base canvas size at export time
    exportQuality: 'balanced', // 'small' | 'balanced' | 'high' — ffmpeg CRF/bitrate tier
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
  const isOverlay = track !== MAIN_TRACK;
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
    position: isOverlay ? { x: 0.68, y: 0.68 } : { x: 0, y: 0 },
    scale: isOverlay ? 0.3 : 1,
    speed: 1, // playback speed multiplier — see clipDuration()/findActiveClipAt() for how this maps timeline time to source time
    fadeIn: 0, // seconds, video dissolve from black + audio gain ramp at this clip's own start
    fadeOut: 0, // seconds, same but into black/silence at this clip's own end
    filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0 }, // 1 = neutral; grayscale 0..1 = intensity
    cropFocus: { x: 0.5, y: 0.5 }, // 0..1 — where drawCover centers its crop window when this clip's aspect doesn't match the frame's
    transitionOut: { type: 'cut', duration: 0.5 }, // how this clip hands off to the next one on the same track — 'cut' | 'fade' | 'dip-black' | 'dip-white'; meaningless on a track's last clip. Implemented by the workspace UI reusing fadeIn/fadeOut + backgroundFill, not by this module.
    gain: 1, // linear audio volume multiplier, 1 = unchanged — manual or set from lib/media/normalizeAudio.js's analysis; multiplied into this clip's own audio, on top of fade-derived gain
    reversed: false, // plays this clip's video+audio backwards — see timelineRender.js's composed path for how (native <video> elements can't reverse-play, so this pre-renders a reversed copy via ffmpeg before capture)
    duckBackground: false, // only meaningful when audioMode === 'mix' — automatically lowers the mixed-in background/replacement track's volume while this clip's OWN audio has signal (e.g. voice over music); see lib/media/ducking.js
  };
  return { ...timeline, clips: [...timeline.clips, clip] };
}

// Inserts a copy of `clipId` immediately after it on the same track —
// everything (trim points, audio mode, speed, fades, filters) carries over
// unchanged, matching how most editors treat "duplicate."
export function duplicateClip(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const copy = { ...clip, id: nextId('clip'), order: clip.order + 0.5 };
  return { ...timeline, clips: renormalizeOrder([...timeline.clips, copy], clip.track) };
}

export function getTrackClips(timeline, track) {
  return timeline.clips.filter((c) => c.track === track).sort((a, b) => a.order - b.order);
}

// The clip's footprint on the TIMELINE, not in its source file — a clip
// played at 2x speed occupies half the timeline time its trimmed source
// range would otherwise take. findActiveClipAt()'s sourceTime math is the
// exact inverse of this, so the two can never drift apart.
function clipDuration(clip) {
  return Math.max(0, (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1));
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

// Clamped to a sane range on both ends — beyond ~4x/0.25x, ffmpeg's atempo
// filter needs to be chained multiple times to preserve pitch reasonably,
// which isn't worth the export-time complexity for a browser video editor.
export function setClipSpeed(timeline, clipId, speed) {
  const clamped = Math.max(0.25, Math.min(4, speed));
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, speed: clamped } : c)) };
}

// fadeIn/fadeOut are seconds within the clip's OWN source range (the same
// units as sourceStart/sourceEnd, not timeline seconds) — each clamped so
// the two can never together exceed the clip's own trimmed length, which
// would leave no fully-opaque/full-volume moment at all.
export function setClipFade(timeline, clipId, { fadeIn, fadeOut }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id !== clipId) return c;
      const dur = Math.max(0, c.sourceEnd - c.sourceStart);
      const nextIn = fadeIn !== undefined ? Math.max(0, fadeIn) : c.fadeIn;
      const nextOut = fadeOut !== undefined ? Math.max(0, fadeOut) : c.fadeOut;
      const total = nextIn + nextOut;
      const scale = total > dur && total > 0 ? dur / total : 1;
      return { ...c, fadeIn: nextIn * scale, fadeOut: nextOut * scale };
    }),
  };
}

export function setClipFilters(timeline, clipId, filters) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, filters: { ...c.filters, ...filters } } : c)),
  };
}

// Linear multiplier, clamped well past unity in both directions — 0.1
// (near-silent) to 4 (well past where clipping starts to matter for a
// browser-side re-encode) — same clamp shape as setClipSpeed.
export function setClipGain(timeline, clipId, gain) {
  const clamped = Math.max(0.1, Math.min(4, gain));
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, gain: clamped } : c)) };
}

export function setClipReversed(timeline, clipId, reversed) {
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, reversed: !!reversed } : c)) };
}

export function setClipDucking(timeline, clipId, duckBackground) {
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, duckBackground: !!duckBackground } : c)) };
}

export function setClipCropFocus(timeline, clipId, cropFocus) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, cropFocus: { x: Math.max(0, Math.min(1, cropFocus.x)), y: Math.max(0, Math.min(1, cropFocus.y)) } }
      : c)),
  };
}

const VALID_TRANSITIONS = ['cut', 'fade', 'dip-black', 'dip-white', 'crossfade'];
export function setClipTransitionOut(timeline, clipId, transitionOut) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, transitionOut: {
          type: VALID_TRANSITIONS.includes(transitionOut.type) ? transitionOut.type : c.transitionOut.type,
          duration: transitionOut.duration !== undefined ? Math.max(0.1, Math.min(2, transitionOut.duration)) : c.transitionOut.duration,
        } }
      : c)),
  };
}

// ---- Text overlays: always-on-top text layers, independent of clips ----

export function addTextOverlay(timeline, overlay = {}) {
  const o = {
    id: nextId('text'),
    text: 'Your text', preset: 'simple', font: 'sans-serif', size: 48,
    bold: false, italic: false, align: 'center', color: '#FFFFFF',
    background: 'none', backgroundColor: '#000000', opacity: 1,
    x: 0.5, y: 0.85, start: 0, end: null, // end: null = through the end of the timeline
    ...overlay,
  };
  return { ...timeline, textOverlays: [...timeline.textOverlays, o] };
}

export function updateTextOverlay(timeline, id, patch) {
  return { ...timeline, textOverlays: timeline.textOverlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

export function deleteTextOverlay(timeline, id) {
  return { ...timeline, textOverlays: timeline.textOverlays.filter((o) => o.id !== id) };
}

// ---- Image overlays (logo/watermark): same "always-on-top layer" idea as
// text, but for a static image. The referenced source is added via the
// normal addSource(kind: 'image') and never gets a track clip of its own —
// it exists only as this layer. ----

export function addImageOverlay(timeline, overlay = {}) {
  const o = {
    id: nextId('logo'), sourceId: null,
    x: 0.85, y: 0.85, scale: 0.15, opacity: 1, start: 0, end: null,
    ...overlay,
  };
  return { ...timeline, imageOverlays: [...timeline.imageOverlays, o] };
}

export function updateImageOverlay(timeline, id, patch) {
  return { ...timeline, imageOverlays: timeline.imageOverlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

export function deleteImageOverlay(timeline, id) {
  return { ...timeline, imageOverlays: timeline.imageOverlays.filter((o) => o.id !== id) };
}

// ---- Shape overlays (rectangle/circle/line/arrow annotations) — same
// "always-on-top layer, independent of clips/tracks" idea as text and
// image overlays, drawn by compositionLayouts.js's drawShapeOverlays. ----

const VALID_SHAPE_TYPES = ['rectangle', 'circle', 'line', 'arrow'];

// Every shape carries both field sets (x/y/width/height for
// rectangle/circle, x2/y2 for line/arrow) rather than a type-specific
// shape — drawShapeOverlays only reads the ones its own type needs, and
// switching a shape's type later (not currently exposed in the UI, but
// harmless) never loses the other fields' values.
export function addShapeOverlay(timeline, overlay = {}) {
  const type = VALID_SHAPE_TYPES.includes(overlay.type) ? overlay.type : 'rectangle';
  const o = {
    id: nextId('shape'),
    type,
    x: 0.3, y: 0.3, width: 0.3, height: 0.2, // rectangle/circle: center + size, all 0..1 fractions of canvas
    x2: 0.7, y2: 0.7, // line/arrow: end point (x,y is the start point)
    color: '#EF4444', filled: false, strokeWidth: 4, opacity: 1,
    start: 0, end: null, // end: null = through the end of the timeline
    ...overlay,
  };
  return { ...timeline, shapeOverlays: [...timeline.shapeOverlays, o] };
}

export function updateShapeOverlay(timeline, id, patch) {
  return { ...timeline, shapeOverlays: timeline.shapeOverlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

export function deleteShapeOverlay(timeline, id) {
  return { ...timeline, shapeOverlays: timeline.shapeOverlays.filter((o) => o.id !== id) };
}

const VALID_RESOLUTIONS = ['480p', '720p', '1080p'];
export function setExportResolution(timeline, exportResolution) {
  return { ...timeline, exportResolution: VALID_RESOLUTIONS.includes(exportResolution) ? exportResolution : timeline.exportResolution };
}

const VALID_QUALITIES = ['small', 'balanced', 'high'];
export function setExportQuality(timeline, exportQuality) {
  return { ...timeline, exportQuality: VALID_QUALITIES.includes(exportQuality) ? exportQuality : timeline.exportQuality };
}

// ---- Overlay tracks: an ordered list of independently-composed layers on
// top of the main track — one entry reproduces the old fixed "one overlay"
// behavior exactly; more than one is what a multi-participant video-call
// layout or a grid of PIP tiles needs. Each track carries its own mode/
// pip/split settings rather than the timeline having one global set, since
// two overlay tracks composed at once can't share a single pip position. ----

const VALID_TRACK_MODES = ['pip', 'split-lr', 'split-tb'];

// Returns { timeline, trackId } (same shape convention as addSource) so the
// caller can immediately addClip(timeline, sourceId, trackId).
export function addOverlayTrack(timeline) {
  const existingIds = timeline.overlayTracks.map((t) => t.id);
  const id = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  const track = {
    id,
    mode: 'pip',
    pipCorner: 'bottom-right',
    pipPosition: { x: 1, y: 1 },
    pipSizeRatio: 0.3,
    dividerRatio: 0.5,
  };
  return { timeline: { ...timeline, overlayTracks: [...timeline.overlayTracks, track] }, trackId: id };
}

export function removeOverlayTrack(timeline, trackId) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.filter((t) => t.id !== trackId),
    clips: timeline.clips.filter((c) => c.track !== trackId),
  };
}

// split-lr/split-tb only make visual sense when there is exactly one
// overlay track (computeLayoutRects only honors them in that case) — still
// stored even when a second track exists, since re-hiding a track back down
// to one shouldn't have lost the user's choice, but the UI should prefer
// offering split modes only when overlayTracks.length === 1.
export function setOverlayTrackMode(timeline, trackId, mode) {
  if (!VALID_TRACK_MODES.includes(mode)) return timeline;
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId ? { ...t, mode } : t)),
  };
}

export function setOverlayTrackDividerRatio(timeline, trackId, dividerRatio) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId ? { ...t, dividerRatio: Math.max(0.1, Math.min(0.9, dividerRatio)) } : t)),
  };
}

const OVERLAY_CORNER_POSITIONS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
};

export function setOverlayTrackPipCorner(timeline, trackId, pipCorner) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId
      ? { ...t, pipCorner, pipPosition: OVERLAY_CORNER_POSITIONS[pipCorner] || t.pipPosition }
      : t)),
  };
}

export function setOverlayTrackPipPosition(timeline, trackId, position) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId
      ? { ...t, pipPosition: { x: Math.max(0, Math.min(1, position.x)), y: Math.max(0, Math.min(1, position.y)) } }
      : t)),
  };
}

export function setOverlayTrackPipSizeRatio(timeline, trackId, pipSizeRatio) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId ? { ...t, pipSizeRatio: Math.max(0.15, Math.min(0.6, pipSizeRatio)) } : t)),
  };
}

export function getOverlayTrack(timeline, trackId) {
  return timeline.overlayTracks.find((t) => t.id === trackId) || null;
}

export function setFitMode(timeline, fitMode) {
  return { ...timeline, fitMode: fitMode === 'contain' ? 'contain' : 'cover' };
}

export function setBackgroundFill(timeline, backgroundFill) {
  return { ...timeline, backgroundFill };
}

const VALID_FRAME_ASPECTS = ['landscape', 'square', 'vertical'];
export function setFrameAspect(timeline, frameAspect) {
  return { ...timeline, frameAspect: VALID_FRAME_ASPECTS.includes(frameAspect) ? frameAspect : timeline.frameAspect };
}

export function removeSource(timeline, sourceId) {
  const clips = timeline.clips.filter((c) => c.sourceId !== sourceId);
  // An overlay track a removed source leaves with zero clips is dead weight
  // in the track list/UI — drop it, same as removeOverlayTrack would.
  const liveOverlayTrackIds = new Set(clips.filter((c) => c.track !== MAIN_TRACK).map((c) => c.track));
  return {
    ...timeline,
    sources: timeline.sources.filter((s) => s.id !== sourceId),
    clips,
    overlayTracks: timeline.overlayTracks.filter((t) => liveOverlayTrackIds.has(t.id)),
    imageOverlays: timeline.imageOverlays.filter((o) => o.sourceId !== sourceId),
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
      // Inverse of clipDuration()'s /speed — timeline seconds elapsed
      // within this clip map back to *speed as many* source seconds.
      return { clip, sourceTime: isStatic ? 0 : clip.sourceStart + (timelineSeconds - elapsed) * (clip.speed || 1) };
    }
    elapsed += dur;
  }
  return null;
}

export { clipDuration };
