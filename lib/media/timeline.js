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
    clips: [], // [{ id, sourceId, track, sourceStart, sourceEnd, start, audioMode, position, scale }] — `start` is this clip's own ABSOLUTE position on its track's timeline (seconds); tracks are independently free-form (gaps allowed, overlaps on the SAME track are not — see moveClip/moveClips), not strictly sequential the way earlier versions were
    overlayTracks: [], // [{ id, mode: 'pip'|'split-lr'|'split-tb', pipCorner, pipPosition, pipSizeRatio, dividerRatio }] — ordered bottom-to-top compositing order; split-lr/split-tb only take effect when this is the ONLY overlay track (see computeLayoutRects)
    fitMode: 'cover', // 'cover' (crop to fill, never distorts, never shows a gap) | 'contain' (show the whole frame, letterboxed with backgroundFill in the gaps)
    backgroundFill: '#0F172A', // fills any letterbox gap left by 'contain', and the composition's own background before either track is drawn — the 'solid' backgroundType's own color
    backgroundType: 'solid', // 'solid' | 'gradient' | 'blur' | 'image' — what fills behind/around the main video when it doesn't cover the whole frame (letterbox gaps in 'contain' fit always use the solid backgroundFill color regardless, to keep gap-filling cheap)
    backgroundGradient: { from: '#0F172A', to: '#334155', angle: 135 }, // only read when backgroundType === 'gradient'
    backgroundImageSourceId: null, // an 'image'-kind source id; only read when backgroundType === 'image'
    frameAspect: 'landscape', // 'landscape' (16:9) | 'square' (1:1) | 'vertical' (9:16) — the exported/composed canvas shape, see compositionLayouts.js's FRAME_ASPECTS
    textOverlays: [], // [{ id, text, preset, font, size, bold, italic, align, color, background, backgroundColor, opacity, x, y, start, end }] — always-on-top text layers, independent of clips/tracks
    imageOverlays: [], // [{ id, sourceId, x, y, scale, opacity, start, end }] — logo/watermark layers; sourceId points at a normal 'image' source, never added as a track clip
    shapeOverlays: [], // [{ id, type: 'rectangle'|'circle'|'line'|'arrow', x, y, width, height, x2, y2, color, filled, strokeWidth, opacity, start, end }] — same "always-on-top layer, independent of clips" idea as text/image overlays
    exportResolution: '1080p', // '480p' | '720p' | '1080p' — scales the frameAspect's base canvas size at export time
    exportQuality: 'balanced', // 'small' | 'balanced' | 'high' — ffmpeg CRF/bitrate tier
    exportFps: 'original', // 'original' | 24 | 30 | 60 — 'original' means "don't force a rate": the simple/ffmpeg path passes no -r flag at all (ffmpeg preserves the source's own rate natively), the composed/canvas path falls back to its long-standing 30fps capture rate, since a canvas capture has no source rate of its own to preserve
    masterVolume: 1, // linear multiplier applied on top of every clip's own gain — see getMasterGain()
    masterMuted: false,
    masterFadeIn: 0, // seconds — fades the WHOLE mix up from silence at the very start of the timeline
    masterFadeOut: 0, // seconds — same, down to silence at the very end
    markers: [], // [{ id, time, label }] — organizational only, no render/export effect
    // A single, clip-independent audio bed that plays continuously from
    // t=0 for its own natural length, regardless of how many clips exist
    // on the main track or how they're trimmed/split/reordered — distinct
    // from a clip's own audioMode/audioSourceId ('replace'/'mix'), which is
    // scoped to exactly one clip's own timeline span. Built for Replace
    // Video/Sync Audio (an already-recorded or edited audio track paired
    // with a separately-chosen visual source of a different length) and
    // reusable as a plain "add background music" track for any timeline,
    // including a multi-image slideshow. `sourceId` is an 'audio'-kind
    // source id, or null when no project audio is set.
    projectAudio: { sourceId: null, gain: 1, muted: false },
    // Any number of independent sound clips (music, sound effects, extra
    // narration) placed anywhere along the timeline — unlike projectAudio
    // (one continuous bed from t=0), each of these is its own track with
    // its own single clip, positioned/trimmed the same free-form way a
    // main-track or overlay-track clip is. One track per sound clip (not
    // one shared track with many clips) so clips can freely overlap without
    // needing same-track collision handling — mirrors how each video/image
    // overlay upload already gets its own overlay track. [{ id, muted, volume }]
    soundTracks: [],
    // The id of one reserved entry in soundTracks (lazily created by
    // ensureMainAudioTrack the first time a main-track video with its own
    // audio is added) that holds a mirrored audio-only clip for every
    // MAIN_TRACK video clip that still has its audio "linked" — see
    // linkVideoClipAudio/getLinkedAudioClip below. null until the first such
    // clip exists. Kept in its own field (rather than re-finding it by
    // scanning clips) because a track can briefly have zero clips — e.g. the
    // instant after its one linked clip is deleted — and still needs to be
    // recognized as "the" main audio track rather than an ordinary,
    // independently-added sound track.
    mainAudioTrackId: null,
    // Whether captions are currently shown in the live preview AND included
    // in every export — off by default so generating/reviewing a transcript
    // (or uploading a subtitle file) never changes what a plain "Export
    // MP4" produces until the user deliberately turns this on, at which
    // point it's just another thing the SAME export already draws (see
    // compositionLayouts.js's drawCaptions), not a separate "burn" action.
    captionsEnabled: false,
    // Unified caption/subtitle styling — whichever caption source is
    // active (an Auto Captions transcript, or an uploaded Burn Subtitles
    // .srt/.vtt file — see lib/media/captions.js's getCaptionEvents, which
    // normalizes either into the same shape this style is drawn against),
    // this ONE object controls its look, position, and text-box width, live
    // in the preview canvas and burned into the export via the exact same
    // draw call — see compositionLayouts.js's drawCaptions. Replaces having
    // one hardcoded style for Auto Captions and a separate, only partly
    // stylable one for Burn Subtitles.
    captionStyle: {
      preset: 'classic', // one of CAPTION_PRESETS' keys, or 'custom' once any style field is hand-edited after picking one
      fontFamily: 'Liberation Sans',
      fontSize: 34,
      bold: true,
      color: '#FFFFFF',
      highlightColor: '#FFD400', // the active word's color in 'word'/'karaoke' highlightMode
      background: 'none', // 'none' | 'box'
      backgroundColor: '#000000',
      backgroundOpacity: 0.6,
      outline: true,
      outlineColor: '#000000',
      shadow: false,
      opacity: 1,
      lineHeight: 1.25,
      letterSpacing: 0,
      align: 'center', // 'left' | 'center' | 'right' — also how multiple wrapped lines stack as one block
      animation: 'none', // 'none' | 'fade' | 'pop' | 'rise' — a short entrance beat each time a new caption event appears, same idea as a text overlay's own animation field
      highlightMode: 'none', // 'none' | 'word' | 'karaoke' — word-by-word color swap, or the same swap with a sweeping fill, driven by each caption event's own (real or approximated) per-word timestamps
      x: 0.5, y: 0.85, // fraction of canvas, center-anchored — same convention as textOverlays' own x/y
      boxWidth: 0.82, // fraction of canvas width the caption text wraps within
    },
  };
}

// Seven starting points a user can further customize — applying one sets
// every field it lists (see setCaptionPreset) but leaves position/box width
// untouched, since where a user has already placed their captions on THIS
// video is unrelated to which look they want.
export const CAPTION_PRESETS = {
  classic: { fontSize: 32, bold: false, color: '#FFFFFF', highlightColor: '#FFD400', background: 'none', outline: true, outlineColor: '#000000', shadow: false, highlightMode: 'none', animation: 'none', align: 'center' },
  bold: { fontSize: 42, bold: true, color: '#FFFFFF', highlightColor: '#FFD400', background: 'none', outline: true, outlineColor: '#000000', shadow: true, highlightMode: 'none', animation: 'none', align: 'center' },
  minimal: { fontSize: 30, bold: false, color: '#FFFFFF', highlightColor: '#FFD400', background: 'none', outline: false, outlineColor: '#000000', shadow: true, highlightMode: 'none', animation: 'none', align: 'center' },
  social: { fontSize: 38, bold: true, color: '#FFFFFF', highlightColor: '#FFD400', background: 'box', backgroundColor: '#000000', backgroundOpacity: 0.65, outline: false, shadow: false, highlightMode: 'none', animation: 'fade', align: 'center' },
  highlight: { fontSize: 36, bold: true, color: '#FFFFFF', highlightColor: '#FFD400', background: 'none', outline: true, outlineColor: '#000000', shadow: false, highlightMode: 'word', animation: 'none', align: 'center' },
  karaoke: { fontSize: 36, bold: true, color: '#FFFFFF', highlightColor: '#22D3EE', background: 'box', backgroundColor: '#000000', backgroundOpacity: 0.5, outline: false, shadow: false, highlightMode: 'karaoke', animation: 'none', align: 'center' },
  pop: { fontSize: 40, bold: true, color: '#FFFFFF', highlightColor: '#F472B6', background: 'none', outline: true, outlineColor: '#000000', shadow: false, highlightMode: 'none', animation: 'pop', align: 'center' },
};

export function setCaptionsEnabled(timeline, captionsEnabled) {
  return { ...timeline, captionsEnabled: !!captionsEnabled };
}

// Any subset of captionStyle's own style fields (NOT x/y/boxWidth — see
// setCaptionPosition/setCaptionBoxWidth for those). Marks the style
// 'custom' since a hand-edit no longer exactly matches whichever preset
// (if any) it started from.
export function setCaptionStyle(timeline, patch) {
  return { ...timeline, captionStyle: { ...timeline.captionStyle, ...patch, preset: 'custom' } };
}

export function setCaptionPreset(timeline, presetId) {
  const preset = CAPTION_PRESETS[presetId];
  if (!preset) return timeline;
  return { ...timeline, captionStyle: { ...timeline.captionStyle, ...preset, preset: presetId } };
}

// x/y are fractions of the canvas (0..1), center-anchored — identical
// convention to a text overlay's own x/y — set by dragging the caption
// directly on the preview.
export function setCaptionPosition(timeline, { x, y }) {
  return {
    ...timeline,
    captionStyle: {
      ...timeline.captionStyle,
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    },
  };
}

// Fraction of canvas width the caption text wraps within — set by dragging
// the resize handles on either side of the caption box on the preview, or
// numerically in the styling panel.
export function setCaptionBoxWidth(timeline, boxWidth) {
  return { ...timeline, captionStyle: { ...timeline.captionStyle, boxWidth: Math.max(0.2, Math.min(1, boxWidth)) } };
}

// Project-level audio envelope: mute-all, master volume, and a fade at the
// very start/end of the whole timeline (distinct from any individual
// clip's own fadeIn/fadeOut). Pure function of timeline + an absolute
// timeline-relative time — both the preview and export audio graphs
// multiply this into their own final gain stage, on top of (not instead
// of) every clip's own gain/fade/duck math.
export function getMasterGain(timeline, timeSeconds) {
  if (timeline.masterMuted) return 0;
  let gain = timeline.masterVolume ?? 1;
  const totalDuration = getTotalDuration(timeline);
  const fadeIn = timeline.masterFadeIn || 0;
  const fadeOut = timeline.masterFadeOut || 0;
  if (fadeIn > 0 && timeSeconds < fadeIn) gain *= Math.max(0, timeSeconds / fadeIn);
  if (fadeOut > 0 && timeSeconds > totalDuration - fadeOut) gain *= Math.max(0, (totalDuration - timeSeconds) / fadeOut);
  return gain;
}

// Sets the project's independent audio bed to an already-added 'audio'-kind
// source (see addSource). Replaces whatever was set before, if anything —
// there is only ever one project audio source at a time, matching how a
// single main track exists.
export function setProjectAudioSource(timeline, sourceId) {
  return { ...timeline, projectAudio: { ...timeline.projectAudio, sourceId } };
}
export function clearProjectAudioSource(timeline) {
  return { ...timeline, projectAudio: { ...timeline.projectAudio, sourceId: null } };
}
export function setProjectAudioGain(timeline, gain) {
  return { ...timeline, projectAudio: { ...timeline.projectAudio, gain: Math.max(0, Math.min(2, gain)) } };
}
export function setProjectAudioMuted(timeline, muted) {
  return { ...timeline, projectAudio: { ...timeline.projectAudio, muted } };
}
export function getProjectAudioSource(timeline) {
  if (!timeline.projectAudio?.sourceId) return null;
  return timeline.sources.find((s) => s.id === timeline.projectAudio.sourceId) || null;
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
// after any existing clips on that track (appended at the end, same
// default UX as before free-form positioning existed — dragging is how a
// user moves it elsewhere afterward). An image source has no time
// dimension of its own — it's treated as a static visual that fills
// whatever span it's given (see findActiveClipAt), so sourceEnd is a
// placeholder rather than a real duration.
export function addClip(timeline, sourceId, track = MAIN_TRACK) {
  const source = timeline.sources.find((s) => s.id === sourceId);
  if (!source) return timeline;
  const isImage = source.kind === 'image';
  const isOverlay = track !== MAIN_TRACK;
  const trackClips = getTrackClips(timeline, track);
  const start = trackClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0);
  const clip = {
    id: nextId('clip'),
    sourceId,
    track,
    sourceStart: 0,
    sourceEnd: isImage ? 0 : source.duration,
    start,
    audioMode: source.hasAudio ? 'keep' : 'mute', // 'keep' | 'mute' | 'replace' — see setClipAudioMode
    audioSourceId: null, // an 'audio'-kind source id, only meaningful when audioMode === 'replace'
    position: isOverlay ? { x: 0.68, y: 0.68 } : { x: 0, y: 0 },
    scale: isOverlay ? 0.3 : 1,
    speed: 1, // playback speed multiplier — see clipDuration()/findActiveClipAt() for how this maps timeline time to source time
    fadeIn: 0, // seconds, video dissolve from black + audio gain ramp at this clip's own start
    fadeOut: 0, // seconds, same but into black/silence at this clip's own end
    filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0 }, // 1 = neutral; grayscale 0..1 = intensity
    cropFocus: { x: 0.5, y: 0.5 }, // 0..1 — where drawCover centers its crop window when this clip's aspect doesn't match the frame's (doubles as "pan" once cropZoom > 1)
    cropZoom: 1, // 1..3 — crops in tighter than the minimum needed to fill the frame, combined with cropFocus for manual "pan and zoom" crop control
    transitionOut: { type: 'cut', duration: 0.5 }, // how this clip hands off to the next one on the same track — 'cut' | 'fade' | 'dip-black' | 'dip-white'; meaningless on a track's last clip. Implemented by the workspace UI reusing fadeIn/fadeOut + backgroundFill, not by this module.
    gain: 1, // linear audio volume multiplier, 1 = unchanged — manual or set from lib/media/normalizeAudio.js's analysis; multiplied into this clip's own audio, on top of fade-derived gain
    reversed: false, // plays this clip's video+audio backwards — see timelineRender.js's composed path for how (native <video> elements can't reverse-play, so this pre-renders a reversed copy via ffmpeg before capture)
    duckBackground: false, // only meaningful when audioMode === 'mix' — automatically lowers the mixed-in background/replacement track's volume while this clip's OWN audio has signal (e.g. voice over music); see lib/media/ducking.js
    rotation: 0, // 0 | 90 | 180 | 270 degrees clockwise
    flipH: false, // mirror left-right
    flipV: false, // mirror top-bottom
  };
  return { ...timeline, clips: [...timeline.clips, clip] };
}

// Whether two [start,end) spans overlap — the one collision check every
// free-form positioning operation below shares (duplicate placement,
// moveClip, moveClips), so "two clips can never occupy the same moment on
// the same track" can never drift into three slightly different
// implementations.
function spansOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

// Inserts a copy of `clipId` immediately after it (in time) on the same
// track — everything (trim points, audio mode, speed, fades, filters)
// carries over unchanged, matching how most editors treat "duplicate." If
// that position would overlap another clip already there (the track isn't
// empty right after the original), the copy is placed at the end of the
// track instead, so a duplicate can never silently create an overlap.
export function duplicateClip(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const dur = clipDuration(clip);
  const trackClips = getTrackClips(timeline, clip.track);
  const desiredStart = clip.start + dur;
  const desiredSpan = { start: desiredStart, end: desiredStart + dur };
  const collides = trackClips.some((c) => c.id !== clip.id && spansOverlap(desiredSpan, { start: c.start, end: c.start + clipDuration(c) }));
  const start = collides ? trackClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0) : desiredStart;
  const copy = { ...clip, id: nextId('clip'), start };
  return { ...timeline, clips: [...timeline.clips, copy] };
}

export function getTrackClips(timeline, track) {
  return timeline.clips.filter((c) => c.track === track).sort((a, b) => a.start - b.start);
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
// separately, since they play concurrently rather than sequentially. The
// MAX of every clip's own end (not a sum) — clips are free-form positioned
// now, so the track's length is however far its last clip reaches,
// trailing gaps included, not the sum of durations.
export function getTotalDuration(timeline) {
  let max = getTrackClips(timeline, MAIN_TRACK).reduce((m, c) => Math.max(m, c.start + clipDuration(c)), 0);
  // The project should run until whichever is longer — the video, or any
  // independent audio (the linked main-audio track and/or extra sound
  // clips, all stored as soundTracks) — not stop dead the instant the main
  // track's own video runs out while a longer audio bed keeps going.
  for (const track of timeline.soundTracks) {
    for (const c of getTrackClips(timeline, track.id)) {
      max = Math.max(max, c.start + clipDuration(c));
    }
  }
  const projectAudioSource = getProjectAudioSource(timeline);
  if (projectAudioSource?.duration) max = Math.max(max, projectAudioSource.duration);
  return max;
}

// Trim = adjust a clip's in/out points within its source. Never touches
// the source file itself, only the clip's reference into it.
export function trimClip(timeline, clipId, { sourceStart, sourceEnd }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => {
      if (c.id !== clipId) return c;
      const source = timeline.sources.find((s) => s.id === c.sourceId);
      // An image source's own `duration` is null (it has no fixed length of
      // its own — see addSource) — falling straight through to Math.min
      // would coerce that null to 0 and collapse every trim on an image
      // clip to ~0.05s regardless of the values passed in. Infinity means
      // "no ceiling from the source itself," which is correct for an image:
      // any positive duration the user sets is a valid trim.
      const maxEnd = source ? (source.duration ?? Infinity) : sourceEnd;
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
// non-destructive editing principle. The first half keeps the original's
// own start; the second's start is offset by exactly how far into the
// clip (in TIMELINE time, speed already folded in) the split point was, so
// the two halves sit immediately adjacent with no gap introduced by the
// split itself.
export function splitClip(timeline, clipId, atSourceTime) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  if (atSourceTime <= clip.sourceStart + 0.05 || atSourceTime >= clip.sourceEnd - 0.05) return timeline;

  const splitOffset = (atSourceTime - clip.sourceStart) / (clip.speed || 1);
  const first = { ...clip, sourceEnd: atSourceTime };
  const second = { ...clip, id: nextId('clip'), sourceStart: atSourceTime, start: clip.start + splitOffset };
  const clips = timeline.clips.filter((c) => c.id !== clipId).concat([first, second]);
  return { ...timeline, clips };
}

// Delete = ripple: removes the clip and shifts every LATER clip on the
// same track left by exactly the deleted clip's own duration, closing the
// gap it leaves — same "sequential editing" behavior this always had,
// preserved as the default even though free-form positioning (via
// moveClip/moveClips) now also exists. Any gap that already existed AFTER
// the deleted clip keeps its own size, just shifted earlier along with
// everything else — only OTHER tracks are left untouched (each track
// ripples independently, consistent with overlay tracks never having been
// summed into the main track's own timing).
export function deleteClip(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const dur = clipDuration(clip);
  const deletedEnd = clip.start + dur;
  return {
    ...timeline,
    clips: timeline.clips
      .filter((c) => c.id !== clipId)
      .map((c) => (c.track === clip.track && c.start >= deletedEnd - 0.001 ? { ...c, start: c.start - dur } : c)),
  };
}

// Bulk delete for multi-select — same ripple behavior as deleteClip, just
// summing every deleted clip's own contribution to how far a surviving
// clip shifts left (only counting deleted clips that end at or before that
// survivor's own start), so it's a single atomic pass rather than deleting
// one at a time and re-deriving shifts in between.
export function deleteClips(timeline, clipIds) {
  const idSet = new Set(clipIds);
  const toDelete = timeline.clips.filter((c) => idSet.has(c.id));
  if (!toDelete.length) return timeline;
  const byTrack = new Map();
  for (const c of toDelete) {
    if (!byTrack.has(c.track)) byTrack.set(c.track, []);
    byTrack.get(c.track).push(c);
  }
  let clips = timeline.clips.filter((c) => !idSet.has(c.id));
  for (const [track, deleted] of byTrack) {
    clips = clips.map((c) => {
      if (c.track !== track) return c;
      const shift = deleted.reduce((sum, d) => (d.start + clipDuration(d) <= c.start + 0.001 ? sum + clipDuration(d) : sum), 0);
      return shift > 0 ? { ...c, start: c.start - shift } : c;
    });
  }
  return { ...timeline, clips };
}

// Bulk duplicate for multi-select — inserts copies of every selected clip
// as ONE contiguous block immediately after the LAST selected clip in
// track order, preserving the selected clips' own relative sequence and
// spacing within that block. Falls back to appending the whole block at
// the end of the track if that position would overlap something already
// there (same reasoning as duplicateClip's single-clip fallback). clipIds
// must all belong to the same track (the UI only ever builds a
// multi-selection within one track — see VideoEditorWorkspace's click
// handlers); clips from any other track are ignored rather than erroring.
export function duplicateClips(timeline, clipIds) {
  const idSet = new Set(clipIds);
  const anyClip = timeline.clips.find((c) => idSet.has(c.id));
  if (!anyClip) return timeline;
  const track = anyClip.track;
  const trackClips = getTrackClips(timeline, track);
  const selected = trackClips.filter((c) => idSet.has(c.id));
  if (!selected.length) return timeline;
  const blockStart = selected[0].start;
  const blockEnd = Math.max(...selected.map((c) => c.start + clipDuration(c)));
  const desiredOffset = blockEnd - blockStart;
  const desiredSpans = selected.map((c) => ({ start: c.start + desiredOffset, end: c.start + desiredOffset + clipDuration(c) }));
  const collides = desiredSpans.some((span) => trackClips.some((c) => !idSet.has(c.id) && spansOverlap(span, { start: c.start, end: c.start + clipDuration(c) })));
  const offset = collides
    ? trackClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0) - blockStart
    : desiredOffset;
  const copies = selected.map((c) => ({ ...c, id: nextId('clip'), start: c.start + offset }));
  return { ...timeline, clips: [...timeline.clips, ...copies] };
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
  const [first, second] = a.start < b.start ? [a, b] : [b, a];
  const merged = { ...first, sourceEnd: Math.max(first.sourceEnd, second.sourceEnd) };
  const remaining = timeline.clips.filter((c) => c.id !== clipIdA && c.id !== clipIdB).concat([merged]);
  return { ...timeline, clips: remaining };
}

// Moves a clip to a new absolute timeline position, staying on the SAME
// track — the core operation free-form positioning adds. Rejects (returns
// the timeline unchanged) if the new position would overlap another clip
// already on that track: gaps are fine (nothing plays during them — see
// findActiveClipAt), overlaps are not (there'd be no way to decide which
// clip's frame to show). Negative positions are clamped to 0.
export function moveClip(timeline, clipId, newStart) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return timeline;
  const clampedStart = Math.max(0, newStart);
  const dur = clipDuration(clip);
  const span = { start: clampedStart, end: clampedStart + dur };
  const collides = timeline.clips.some((c) => c.id !== clipId && c.track === clip.track && spansOverlap(span, { start: c.start, end: c.start + clipDuration(c) }));
  if (collides) return timeline;
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, start: clampedStart } : c)) };
}

// Moves several clips together by the same delta, preserving their
// relative positions exactly — used when dragging a multi-selected group.
// The delta is clamped just enough to keep the group's earliest clip at 0
// if it would otherwise go negative (never distorting the group's shape),
// then the WHOLE move is rejected if any moved clip would overlap a clip
// NOT in the moving set — so a group drag can never partially succeed or
// have clips pass through each other.
export function moveClips(timeline, clipIds, deltaSeconds) {
  const idSet = new Set(clipIds);
  const moving = timeline.clips.filter((c) => idSet.has(c.id));
  if (!moving.length) return timeline;
  const minStart = Math.min(...moving.map((c) => c.start));
  const clampedDelta = minStart + deltaSeconds < 0 ? -minStart : deltaSeconds;
  const others = timeline.clips.filter((c) => !idSet.has(c.id));
  const collides = moving.some((c) => {
    const dur = clipDuration(c);
    const span = { start: c.start + clampedDelta, end: c.start + clampedDelta + dur };
    return others.some((o) => o.track === c.track && spansOverlap(span, { start: o.start, end: o.start + clipDuration(o) }));
  });
  if (collides) return timeline;
  return { ...timeline, clips: timeline.clips.map((c) => (idSet.has(c.id) ? { ...c, start: c.start + clampedDelta } : c)) };
}

// Reorders a clip to a new position in its track's own sequence (0 =
// first, length-1 = last) — the explicit "move to start/earlier/later/end"
// buttons' one primitive, as an alternative to dragging a clip to a free
// spot on the timeline. Unlike moveClip (which rejects a move that would
// overlap another clip), reordering always succeeds: it repacks every
// clip on the track back-to-back, in the new order, starting from where
// the track's own first clip began — a gap that only made sense for the
// OLD adjacency is meaningless once the sequence itself has changed.
export function moveClipToIndex(timeline, track, clipId, newIndex) {
  const trackClips = getTrackClips(timeline, track);
  const idx = trackClips.findIndex((c) => c.id === clipId);
  if (idx === -1) return timeline;
  const clampedIndex = Math.max(0, Math.min(newIndex, trackClips.length - 1));
  if (clampedIndex === idx) return timeline;
  const reordered = [...trackClips];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(clampedIndex, 0, moved);
  let cursor = trackClips[0].start;
  const startById = new Map();
  for (const c of reordered) {
    startById.set(c.id, cursor);
    cursor += clipDuration(c);
  }
  return { ...timeline, clips: timeline.clips.map((c) => (startById.has(c.id) ? { ...c, start: startById.get(c.id) } : c)) };
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

const VALID_ROTATIONS = [0, 90, 180, 270];
export function setClipRotation(timeline, clipId, rotation) {
  const normalized = VALID_ROTATIONS.includes(rotation) ? rotation : 0;
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, rotation: normalized } : c)) };
}

// Rotates the CURRENT rotation 90 degrees clockwise (wrapping 270 -> 0) —
// the "Rotate" button's action, so repeated clicks cycle through all 4
// orientations rather than needing 4 separate buttons.
export function rotateClip90(timeline, clipId) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c)),
  };
}

export function setClipFlip(timeline, clipId, { flipH, flipV }) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, flipH: flipH !== undefined ? !!flipH : c.flipH, flipV: flipV !== undefined ? !!flipV : c.flipV }
      : c)),
  };
}

export function setMasterVolume(timeline, masterVolume) {
  return { ...timeline, masterVolume: Math.max(0, Math.min(2, masterVolume)) };
}

export function setMasterMuted(timeline, masterMuted) {
  return { ...timeline, masterMuted: !!masterMuted };
}

export function setMasterFade(timeline, { masterFadeIn, masterFadeOut }) {
  return {
    ...timeline,
    masterFadeIn: masterFadeIn !== undefined ? Math.max(0, masterFadeIn) : timeline.masterFadeIn,
    masterFadeOut: masterFadeOut !== undefined ? Math.max(0, masterFadeOut) : timeline.masterFadeOut,
  };
}

// ---- Timeline markers — organizational only, no render/export effect ----
export function addMarker(timeline, time, label = 'Marker') {
  const marker = { id: nextId('marker'), time: Math.max(0, time), label };
  return { ...timeline, markers: [...timeline.markers, marker].sort((a, b) => a.time - b.time) };
}

export function updateMarker(timeline, id, patch) {
  return { ...timeline, markers: timeline.markers.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

export function deleteMarker(timeline, id) {
  return { ...timeline, markers: timeline.markers.filter((m) => m.id !== id) };
}

export function setClipCropFocus(timeline, clipId, cropFocus) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, cropFocus: { x: Math.max(0, Math.min(1, cropFocus.x)), y: Math.max(0, Math.min(1, cropFocus.y)) } }
      : c)),
  };
}

export function setClipCropZoom(timeline, clipId, cropZoom) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId ? { ...c, cropZoom: Math.max(1, Math.min(3, cropZoom)) } : c)),
  };
}

// 'Blend' transitions (as opposed to fade/dip, which just fade through a
// color via the existing per-clip fade engine) need a genuine simultaneous
// video blend — a frozen lookahead frame of the next clip drawn on top of
// the outgoing one — implemented by drawCompositionFrame's transitionType
// branches in compositionLayouts.js. Exported so the preview loop and the
// composed export path both trigger that same lookahead mechanism for
// exactly this set of types, instead of duplicating the list.
export const BLEND_TRANSITION_TYPES = ['crossfade', 'slide', 'push', 'wipe', 'zoom', 'blur', 'iris'];
const VALID_TRANSITIONS = ['cut', 'fade', 'dip-black', 'dip-white', ...BLEND_TRANSITION_TYPES];
export function setClipTransitionOut(timeline, clipId, transitionOut) {
  return {
    ...timeline,
    clips: timeline.clips.map((c) => (c.id === clipId
      ? { ...c, transitionOut: {
          type: VALID_TRANSITIONS.includes(transitionOut.type) ? transitionOut.type : c.transitionOut.type,
          duration: transitionOut.duration !== undefined ? Math.max(0.1, Math.min(10, transitionOut.duration)) : c.transitionOut.duration,
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
    background: 'none', backgroundColor: '#000000', backgroundOpacity: 0.6, opacity: 1,
    outline: false, outlineColor: '#000000',
    shadow: false,
    animation: 'none', // 'none' | 'fade' | 'slide' | 'pop' — a short fixed-length entrance beat, see compositionLayouts.js's ANIMATION_DURATION
    letterSpacing: 0, lineHeight: 1.2,
    x: 0.5, y: 0.85, start: 0, end: null, // end: null = through the end of the timeline
    ...overlay,
  };
  return { ...timeline, textOverlays: [...timeline.textOverlays, o] };
}

// Copies every setting except position (nudged slightly so the duplicate is
// visibly a separate layer, not hidden exactly behind the original) and
// timing (left as-is — a caption-style duplicate is usually meant to appear
// at a different moment, easiest to set after seeing it in the list).
export function duplicateTextOverlay(timeline, id) {
  const source = timeline.textOverlays.find((o) => o.id === id);
  if (!source) return timeline;
  const copy = { ...source, id: nextId('text'), x: Math.min(1, source.x + 0.03), y: Math.min(1, source.y + 0.03) };
  return { ...timeline, textOverlays: [...timeline.textOverlays, copy] };
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

const VALID_FPS = ['original', 24, 30, 60];
export function setExportFps(timeline, exportFps) {
  return { ...timeline, exportFps: VALID_FPS.includes(exportFps) ? exportFps : timeline.exportFps };
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
    muted: false,
    solo: false,
    hidden: false,
    locked: false,
    // Person cutout: automatic background removal on this track's own
    // clips (via lib/media/segmentation.js), drawn at the SAME pip
    // rect/position/size this track already has — only meaningful while
    // mode === 'pip' (a split-screen half has no "shape" for a cutout to
    // sit inside). What fills in behind the cut-out person is simply
    // whatever's on the main track underneath, same as any other pip
    // overlay — pick a different main-track video/image to change it.
    cutoutEnabled: false,
    cutoutFeather: 0.3, // 0..1 — edge softness; blurs the segmentation mask before it's applied as alpha
    cutoutShadow: false,
    cutoutOutline: false,
    cutoutOutlineColor: '#FFFFFF',
  };
  return { timeline: { ...timeline, overlayTracks: [...timeline.overlayTracks, track] }, trackId: id };
}

// { muted?, solo?, hidden?, locked? } — any subset. muted silences this
// track's audio outright; solo silences every OTHER overlay track's audio
// (main track and this track are unaffected by other tracks' solo); hidden
// skips this track in the composed picture (video only, audio unaffected —
// independent from muted, same as a professional NLE); locked disables
// trim/drag/delete/split/join and canvas position-dragging for this track's
// clips. Scoped to overlay tracks only — the main track has no equivalent,
// since it's the base timeline rather than one of several parallel layers.
export function setOverlayTrackFlags(timeline, trackId, patch) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

// { cutoutEnabled?, cutoutFeather?, cutoutShadow?, cutoutOutline?,
// cutoutOutlineColor? } — any subset; see addOverlayTrack's own comment on
// the cutoutEnabled field for what this mode actually does.
export function setOverlayTrackCutout(timeline, trackId, patch) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.map((t) => (t.id === trackId
      ? { ...t, ...patch, cutoutFeather: patch.cutoutFeather !== undefined ? Math.max(0, Math.min(1, patch.cutoutFeather)) : t.cutoutFeather }
      : t)),
  };
}

// Whether trackId's own audio should actually be heard right now — mute
// always wins; otherwise, if ANY overlay track is soloed, only soloed
// tracks are audible. Shared by the live preview graph and the composed
// export's gain routing so they can never disagree.
export function isOverlayTrackAudible(timeline, trackId) {
  const track = timeline.overlayTracks.find((t) => t.id === trackId);
  if (!track) return true;
  if (track.muted) return false;
  const anySolo = timeline.overlayTracks.some((t) => t.solo);
  return anySolo ? !!track.solo : true;
}

export function removeOverlayTrack(timeline, trackId) {
  return {
    ...timeline,
    overlayTracks: timeline.overlayTracks.filter((t) => t.id !== trackId),
    clips: timeline.clips.filter((c) => c.track !== trackId),
  };
}

// Sound tracks live in their own id namespace (negative integers) so they
// can never collide with MAIN_TRACK (0) or an overlay track's id (positive,
// handed out by addOverlayTrack above) — findActiveClipAt/getTrackClips/
// trimClip/moveClip/etc. are already fully generic over any track id, so a
// sound track needs no changes there, only its own metadata (mute/volume)
// and the addClip/addSource wiring below.
export function addSoundTrack(timeline) {
  const existingIds = timeline.soundTracks.map((t) => t.id);
  const id = existingIds.length ? Math.min(...existingIds) - 1 : -1;
  const track = { id, muted: false, volume: 1 };
  return { timeline: { ...timeline, soundTracks: [...timeline.soundTracks, track] }, trackId: id };
}

// { muted?, volume? } — either or both. No solo concept (unlike overlay
// tracks) — sound clips are meant to layer together (music + multiple sound
// effects), not isolate one at a time while auditioning.
export function setSoundTrackFlags(timeline, trackId, patch) {
  return {
    ...timeline,
    soundTracks: timeline.soundTracks.map((t) => (t.id === trackId
      ? { ...t, ...patch, volume: patch.volume !== undefined ? Math.max(0, Math.min(2, patch.volume)) : t.volume }
      : t)),
  };
}

export function isSoundTrackAudible(timeline, trackId) {
  const track = timeline.soundTracks.find((t) => t.id === trackId);
  return !track || !track.muted;
}

export function removeSoundTrack(timeline, trackId) {
  return {
    ...timeline,
    soundTracks: timeline.soundTracks.filter((t) => t.id !== trackId),
    clips: timeline.clips.filter((c) => c.track !== trackId),
    mainAudioTrackId: timeline.mainAudioTrackId === trackId ? null : timeline.mainAudioTrackId,
  };
}

// ---- Linked main-audio track: gives every MAIN_TRACK video clip's own
// audio a separate, independently editable clip on its own reserved sound
// track (see timeline.mainAudioTrackId's own comment in createTimeline),
// while keeping the two in sync by default. The video clip's own audioMode
// is set to 'mute' the moment it's linked, so its audio is heard exactly
// once (via the linked clip) rather than doubled. A linked audio clip is
// identified purely by its own `linkedVideoClipId` field pointing at the
// video clip it mirrors — clearing that field (see unlinkAudioClip) is all
// "unlinking" means; the clip itself is never moved or deleted by that.

// Returns { timeline, trackId } (same convention as addSoundTrack/
// addOverlayTrack) — creates the reserved track via the ordinary
// addSoundTrack allocator the first time it's needed, then reuses it.
export function ensureMainAudioTrack(timeline) {
  if (timeline.mainAudioTrackId != null && timeline.soundTracks.some((t) => t.id === timeline.mainAudioTrackId)) {
    return { timeline, trackId: timeline.mainAudioTrackId };
  }
  const { timeline: withTrack, trackId } = addSoundTrack(timeline);
  return { timeline: { ...withTrack, mainAudioTrackId: trackId }, trackId };
}

export function getLinkedAudioClip(timeline, videoClipId) {
  return timeline.clips.find((c) => c.linkedVideoClipId === videoClipId) || null;
}

// Creates (or reuses) the reserved main-audio track, adds a clip on it that
// exactly mirrors `videoClipId`'s current position/trim/speed, and mutes the
// video clip's own audio. A no-op if the clip doesn't exist, isn't on
// MAIN_TRACK, its source has no audio track of its own, or it's already
// linked — so callers can invoke this unconditionally after adding a clip
// rather than checking eligibility themselves.
export function linkVideoClipAudio(timeline, videoClipId) {
  const videoClip = timeline.clips.find((c) => c.id === videoClipId);
  if (!videoClip || videoClip.track !== MAIN_TRACK) return timeline;
  const source = timeline.sources.find((s) => s.id === videoClip.sourceId);
  if (!source || !source.hasAudio) return timeline;
  if (getLinkedAudioClip(timeline, videoClipId)) return timeline;
  const { timeline: withTrack, trackId } = ensureMainAudioTrack(timeline);
  const audioClip = {
    id: nextId('clip'),
    sourceId: videoClip.sourceId,
    track: trackId,
    sourceStart: videoClip.sourceStart,
    sourceEnd: videoClip.sourceEnd,
    start: videoClip.start,
    audioMode: 'keep',
    audioSourceId: null,
    position: { x: 0, y: 0 },
    scale: 1,
    speed: videoClip.speed,
    fadeIn: 0,
    fadeOut: 0,
    filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0 },
    cropFocus: { x: 0.5, y: 0.5 },
    cropZoom: 1,
    transitionOut: { type: 'cut', duration: 0.5 },
    gain: 1,
    reversed: false,
    duckBackground: false,
    rotation: 0,
    flipH: false,
    flipV: false,
    linkedVideoClipId: videoClipId,
  };
  return {
    ...withTrack,
    clips: withTrack.clips.map((c) => (c.id === videoClipId ? { ...c, audioMode: 'mute' } : c)).concat([audioClip]),
  };
}

// Detaches an audio clip from the video clip it was mirroring, without
// moving or deleting it — from this point on it's an ordinary independent
// sound-track clip and no longer receives the video clip's trim/split/move/
// delete/duplicate edits. Does NOT restore the paired video clip's own
// audioMode (leaving it muted — the linked audio clip is still the only
// place that audio is heard; unmuting would double it up).
export function unlinkAudioClip(timeline, audioClipId) {
  return { ...timeline, clips: timeline.clips.map((c) => (c.id === audioClipId ? { ...c, linkedVideoClipId: null } : c)) };
}

// Removes a clip outright with NO ripple on its track — deleteClip's
// "shift every later clip left to close the gap" behavior assumes a
// sequential, back-to-back track, which the main audio track deliberately
// isn't: each of its clips sits at whatever absolute position its own
// paired video clip occupies (possibly with real gaps between them,
// matching that video clip's own arrangement). Ripple-deleting one would
// drag every LATER linked audio clip out of alignment with video clips that
// never moved. Used when a video clip's audioMode is set manually (see
// setClipAudioMode's own call sites in the workspace UI) — that's a
// deliberate takeover of this clip's audio, so its now-redundant linked
// clip is removed entirely, in place, leaving every other clip untouched.
export function removeClipInPlace(timeline, clipId) {
  return { ...timeline, clips: timeline.clips.filter((c) => c.id !== clipId) };
}

// Below: one mirroring wrapper per edit primitive that a MAIN_TRACK video
// clip can go through, each applying the same edit to the linked audio clip
// (if any, and still linked) in the same pass. Callers use these in place of
// the plain timeline.js primitive whenever the clip being edited might carry
// a linked audio clip — they behave identically to the plain primitive when
// there is none.

export function trimLinkedClip(timeline, videoClipId, trim) {
  const linked = getLinkedAudioClip(timeline, videoClipId);
  let next = trimClip(timeline, videoClipId, trim);
  if (linked) next = trimClip(next, linked.id, trim);
  return next;
}

// splitClip always appends the new second half as the LAST entry of the
// returned clips array (see its own implementation above), so it can be
// recovered by position rather than needing a geometry re-match.
export function splitLinkedClip(timeline, videoClipId, atSourceTime) {
  const before = timeline.clips.find((c) => c.id === videoClipId);
  if (!before) return timeline;
  const linked = getLinkedAudioClip(timeline, videoClipId);
  let next = splitClip(timeline, videoClipId, atSourceTime);
  if (next === timeline || !linked) return next;
  const newVideoClip = next.clips[next.clips.length - 1];
  // While linked, the audio clip's sourceStart always equals the video
  // clip's own — true because every mirrored edit keeps them in exact sync —
  // so the same atSourceTime applies unchanged to the audio clip's split.
  const afterAudioSplit = splitClip(next, linked.id, atSourceTime);
  if (afterAudioSplit === next) return next;
  next = afterAudioSplit;
  const newAudioClip = next.clips[next.clips.length - 1];
  return { ...next, clips: next.clips.map((c) => (c.id === newAudioClip.id ? { ...c, linkedVideoClipId: newVideoClip.id } : c)) };
}

export function moveLinkedClip(timeline, videoClipId, newStart) {
  const before = timeline.clips.find((c) => c.id === videoClipId);
  if (!before) return timeline;
  const linked = getLinkedAudioClip(timeline, videoClipId);
  const next = moveClip(timeline, videoClipId, newStart);
  if (next === timeline || !linked) return next;
  // If the audio track's own copy can't move by the same delta (something
  // else happens to be in its way there), leave the video move in place and
  // simply skip the audio move rather than rejecting the whole edit — a rare
  // edge case since this track normally only ever holds mirrored clips.
  return moveClip(next, linked.id, linked.start + (newStart - before.start));
}

export function moveLinkedClipToIndex(timeline, track, videoClipId, newIndex) {
  const linked = getLinkedAudioClip(timeline, videoClipId);
  let next = moveClipToIndex(timeline, track, videoClipId, newIndex);
  if (linked) next = moveClipToIndex(next, linked.track, linked.id, newIndex);
  return next;
}

export function deleteLinkedClip(timeline, videoClipId) {
  const linked = getLinkedAudioClip(timeline, videoClipId);
  // One combined deleteClips call (rather than two sequential deleteClip
  // calls) so both tracks ripple against the SAME before-delete snapshot —
  // sequential calls would be equivalent here since the two clips are on
  // different tracks and ripple independently, but this reads as the one
  // atomic edit it conceptually is.
  return deleteClips(timeline, linked ? [videoClipId, linked.id] : [videoClipId]);
}

export function deleteLinkedClips(timeline, videoClipIds) {
  const linkedIds = videoClipIds.map((id) => getLinkedAudioClip(timeline, id)?.id).filter(Boolean);
  return deleteClips(timeline, [...videoClipIds, ...linkedIds]);
}

// duplicateClip always appends its copy as the LAST entry of the returned
// clips array (see its own implementation above), so — like splitLinkedClip
// above — the new clip is recovered by position, not by re-matching geometry.
export function duplicateLinkedClip(timeline, videoClipId) {
  const linked = getLinkedAudioClip(timeline, videoClipId);
  let next = duplicateClip(timeline, videoClipId);
  if (next === timeline) return next;
  const newVideoClip = next.clips[next.clips.length - 1];
  if (!linked) return next;
  const afterAudioDup = duplicateClip(next, linked.id);
  if (afterAudioDup === next) return next;
  next = afterAudioDup;
  const newAudioClip = next.clips[next.clips.length - 1];
  return { ...next, clips: next.clips.map((c) => (c.id === newAudioClip.id ? { ...c, linkedVideoClipId: newVideoClip.id } : c)) };
}

// Bulk multi-select duplicate. Unlike duplicateClips (the plain multi-select
// primitive), this places each duplicated clip one at a time rather than as
// one contiguous block — a small placement-polish regression accepted here
// in exchange for being able to correctly re-pair every duplicate with its
// own linked audio copy.
export function duplicateLinkedClips(timeline, videoClipIds) {
  let next = timeline;
  for (const id of videoClipIds) next = duplicateLinkedClip(next, id);
  return next;
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

const VALID_BACKGROUND_TYPES = ['solid', 'gradient', 'blur', 'image'];
export function setBackgroundType(timeline, backgroundType) {
  return { ...timeline, backgroundType: VALID_BACKGROUND_TYPES.includes(backgroundType) ? backgroundType : timeline.backgroundType };
}

export function setBackgroundGradient(timeline, patch) {
  return { ...timeline, backgroundGradient: { ...timeline.backgroundGradient, ...patch } };
}

export function setBackgroundImageSource(timeline, sourceId) {
  return { ...timeline, backgroundImageSourceId: sourceId };
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
    soundTracks: timeline.soundTracks.filter((t) => liveOverlayTrackIds.has(t.id)),
    imageOverlays: timeline.imageOverlays.filter((o) => o.sourceId !== sourceId),
    mainAudioTrackId: liveOverlayTrackIds.has(timeline.mainAudioTrackId) ? timeline.mainAudioTrackId : null,
  };
}

// Finds which clip on `track` is active at a given timeline-relative time
// (0..getTotalDuration), and the corresponding source-relative time within
// that clip — used to drive playback/preview and to know what to draw.
export function findActiveClipAt(timeline, track, timelineSeconds) {
  const trackClips = getTrackClips(timeline, track);
  const lastClip = trackClips[trackClips.length - 1];
  for (const clip of trackClips) {
    const source = timeline.sources.find((s) => s.id === clip.sourceId);
    const isStatic = source && source.kind === 'image';
    // A static image has no time dimension of its own. Only the LAST clip
    // on a track gets the "fills the rest of the timeline" treatment
    // (Infinity) — the single-trailing-image case (e.g. a freeze-frame
    // ending) this always meant. Any image clip that ISN'T the last one —
    // a middle clip in a multi-image slideshow, say — must be bounded by
    // its own real clip duration, or every later clip on the track would
    // be permanently unreachable (this same `for...of` returns on first
    // match, so an earlier Infinity-duration clip would always win).
    const dur = isStatic && clip === lastClip ? Infinity : clipDuration(clip);
    if (timelineSeconds >= clip.start && timelineSeconds < clip.start + dur) {
      // Inverse of clipDuration()'s /speed — timeline seconds elapsed
      // within this clip map back to *speed as many* source seconds.
      return { clip, sourceTime: isStatic ? 0 : clip.sourceStart + (timelineSeconds - clip.start) * (clip.speed || 1) };
    }
  }
  return null;
}

// This clip's own footprint in ABSOLUTE timeline time (not its source
// range) — now that `start` is an explicit stored field, this is a direct
// lookup rather than a cumulative walk. A static image has no bounded end
// (it fills the rest of its track), so `end` is Infinity for those. Used
// by the trim-handle snapping UI to know a clip's fixed timeline-start
// (unaffected by trimming that same clip — see VideoEditorWorkspace's own
// comment on handleTrimHandleMove for why).
export function getClipTimelineBounds(timeline, clipId) {
  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip) return null;
  const source = timeline.sources.find((s) => s.id === clip.sourceId);
  const isStatic = source && source.kind === 'image';
  const trackClips = getTrackClips(timeline, clip.track);
  const isLastOnTrack = trackClips[trackClips.length - 1]?.id === clip.id;
  const dur = isStatic && isLastOnTrack ? Infinity : clipDuration(clip);
  return { start: clip.start, end: clip.start + dur };
}

// Every clip's start AND end timestamp, in absolute timeline time, across
// every track (main plus every overlay track) — the snap-target candidate
// set for trim-handle snapping. Not deduplicated; a handful of snap
// targets a few milliseconds apart is harmless for that purpose.
export function getAllClipBoundaryTimes(timeline) {
  const times = [];
  const lastByTrack = new Map();
  for (const c of timeline.clips) {
    if (!lastByTrack.has(c.track) || c.start > lastByTrack.get(c.track).start) lastByTrack.set(c.track, c);
  }
  for (const c of timeline.clips) {
    const source = timeline.sources.find((s) => s.id === c.sourceId);
    const isStatic = source && source.kind === 'image';
    const isLastOnTrack = lastByTrack.get(c.track)?.id === c.id;
    const dur = isStatic && isLastOnTrack ? Infinity : clipDuration(c);
    times.push(c.start);
    if (Number.isFinite(dur)) times.push(c.start + dur);
  }
  return times;
}

export { clipDuration };
