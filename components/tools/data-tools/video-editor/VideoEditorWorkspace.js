'use client';

// P1: non-destructive editing + composition, built as a new workspace on
// top of the same lib/media engine P0 already shipped — reuses
// extractVideoMetadata, ffmpegClient's lazy-loaded ffmpeg.wasm singleton,
// UploadBox, downloadBlob, and the T theme tokens rather than introducing
// any parallel infrastructure. lib/media/timeline.js, compositionLayouts.js
// and timelineRender.js are the only new engine modules.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { receiveBlobHandoff } from '@/lib/media/blobHandoff';
import { extractVideoMetadata, extractImageMetadata, extractAudioMetadata, formatDuration, formatDurationPrecise } from '@/lib/media/metadata';
import { validateUploadSize, MAX_UPLOAD_VIDEO_BYTES, MAX_UPLOAD_IMAGE_BYTES, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import {
  createTimeline, addSource, addClip, trimClip, splitClip, deleteClip, deleteClips, joinClips, moveClip, moveClipToIndex, duplicateClip, duplicateClips,
  setClipAudioMode,
  addOverlayTrack, removeOverlayTrack, setOverlayTrackMode, setOverlayTrackDividerRatio,
  setOverlayTrackPipCorner, setOverlayTrackPipPosition, setOverlayTrackPipSizeRatio, setOverlayTrackFlags, setOverlayTrackCutout, isOverlayTrackAudible,
  setFitMode, setBackgroundFill, setBackgroundType, setBackgroundGradient, setBackgroundImageSource, setFrameAspect,
  setClipSpeedRipple, setImageClipDuration, setClipFade, setClipFilters, setClipCropFocus, setClipCropZoom, setClipTransitionOut, setClipGain, setClipReversed, setClipDucking,
  rotateClip90, setClipFlip,
  addTextOverlay, updateTextOverlay, deleteTextOverlay, duplicateTextOverlay,
  addImageOverlay, updateImageOverlay, deleteImageOverlay,
  addShapeOverlay, updateShapeOverlay, deleteShapeOverlay,
  setExportResolution, setExportQuality, setExportFps,
  getTrackClips, getTotalDuration, findActiveClipAt, clipDuration, MAIN_TRACK, BLEND_TRANSITION_TYPES,
  getClipTimelineBounds, getAllClipBoundaryTimes,
  getMasterGain, setMasterVolume, setMasterMuted, setMasterFade,
  addMarker, updateMarker, deleteMarker,
  ensureProjectAudioTrack,
  addSoundTrack, removeSoundTrack, setSoundTrackFlags, isSoundTrackAudible,
  linkVideoClipAudio, getLinkedAudioClip, unlinkAudioClip, removeClipInPlace,
  trimLinkedClip, splitLinkedClip, moveLinkedClip, moveLinkedClipToIndex, deleteLinkedClip, deleteLinkedClips, duplicateLinkedClip, duplicateLinkedClips,
  CAPTION_PRESETS, setCaptionsEnabled, setCaptionStyle, setCaptionPreset, setCaptionPosition, setCaptionBoxWidth,
} from '@/lib/media/timeline';
import { drawCompositionFrame, drawTextOverlays, drawImageOverlays, drawShapeOverlays, drawCaptions, drawMasterFade, computeLayoutRects, pipPositionFromPoint, getComposeSize, getFadeOpacity, getTextOverlayBounds, getImageOverlayBounds, getCaptionBounds, buildCutoutCanvas } from '@/lib/media/compositionLayouts';
import { ensureSegmenterLoaded, getPersonMaskCanvas } from '@/lib/media/segmentation';
import { renderTimeline, renderTimelineAudio, isTimelineExportSupported, TimelineRenderCancelledError, TimelineRenderError } from '@/lib/media/timelineRender';
import { extractThumbnails, thumbnailsForRange } from '@/lib/media/thumbnails';
import { extractWaveformPeaks, drawWaveform } from '@/lib/media/waveform';
import { detectSilence } from '@/lib/media/silenceDetect';
import { computeNormalizationGain } from '@/lib/media/normalizeAudio';
import { cleanAudioFile } from '@/lib/media/audioCleanup';
import { duckGainAtTime } from '@/lib/media/ducking';
import { saveProject, loadProject, clearProject, isWorthSaving } from '@/lib/media/projectPersistence';
import { TARGET_VIDEO_KBPS } from '@/lib/media/exportQuality';
// Auto Captions reuses the exact same transcription/caption engine as
// Audio Studio and Video Studio — no separate implementation. It runs on
// a LOCAL, audio-only render of the edited timeline's actual mix
// (renderTimelineAudio, in timelineRender.js — the same audio graph the
// composed video export uses, minus the canvas/video-encoding work), not
// on an already-exported video file — so generating captions never
// requires exporting a video first. Because that render plays the timeline
// back on its own real time axis, the resulting transcript's timestamps
// are already the EDITED timeline's timestamps, not the original source
// clips' — no separate remapping step needed. Burning captions in then
// renders the actual final video (once) and burns the captions into that
// same pass, rather than reusing a separate, possibly-stale earlier export.
import { transcribeMedia, TranscriptionError } from '@/lib/media/providers/geminiTranscription';
import { transcriptToSrt, transcriptToVtt, getCaptionEvents, findActiveCaptionEvent } from '@/lib/media/captions';
import { parseSubtitleFile } from '@/lib/media/subtitleParse';
import { transcriptToPlainText } from '@/lib/media/transcript';
import TranscriptEditor from '../shared/TranscriptEditor';

const TRANSCRIBE_STATUS_LABEL = {
  'preparing-audio': 'Preparing audio…',
  'rendering-audio': 'Rendering timeline audio…',
  preparing: 'Preparing for transcription…',
  transcribing: 'Transcribing speech…',
  merging: 'Combining transcript…',
};

// Seven quick-start caption looks, shown as swatch buttons — see
// CAPTION_PRESETS in timeline.js for what each one actually sets.
const CAPTION_PRESET_OPTIONS = [
  { id: 'classic', label: 'Classic' },
  { id: 'bold', label: 'Bold' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'social', label: 'Social' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'pop', label: 'Pop' },
];

const CAPTION_ALIGN_OPTIONS = [
  { id: 'left', label: 'Align Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Align Right' },
];

const CAPTION_HIGHLIGHT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'word', label: 'Word-by-word' },
  { id: 'karaoke', label: 'Karaoke' },
];

const CAPTION_ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'pop', label: 'Pop' },
  { id: 'rise', label: 'Rise' },
];

const RENDER_STATUS_LABEL = {
  preparing: 'Preparing…',
  rendering: 'Rendering…',
  finalizing: 'Finalizing MP4…',
};

// Per-overlay-track mode — split-lr/split-tb only actually apply when the
// track being edited is the ONLY overlay track (see timeline.js's
// computeLayoutRects); offered anyway and silently ignored with 2+ tracks
// rather than hidden, so choosing 'pip' after removing a second track falls
// back predictably instead of the option just vanishing.
const TRACK_MODE_OPTIONS = [
  { id: 'pip', label: 'Picture-in-picture' },
  { id: 'split-lr', label: 'Split screen (side by side)' },
  { id: 'split-tb', label: 'Split screen (top/bottom)' },
];

// Left-rail categories — each one docks its own distinct panel (see the
// return JSX): Edit (trim/split/join/freeze/silence/duplicate/delete),
// Audio (per-clip audio mode/fades/volume/normalize, plus the project-
// wide Master audio section), Effects (speed/filters/transitions/crop/
// rotate/flip/reverse), Composition (mode selector, PIP, person cutout),
// and Canvas (frame aspect, fit mode, background) — Composition and
// Canvas both concern the overall frame but are genuinely different
// concerns (layout vs. output shape), so they're separate panels, not a
// shared one. A small always-visible "Clip" summary above all of these
// just identifies what's selected.
const RAIL_CATEGORIES = [
  { id: 'media', icon: '🗂️', label: 'Media' },
  { id: 'edit', icon: '✂️', label: 'Edit' },
  { id: 'audio', icon: '🔊', label: 'Audio' },
  { id: 'text', icon: '🔤', label: 'Text' },
  { id: 'captions', icon: '💬', label: 'Captions' },
  { id: 'composition', icon: '🎛️', label: 'Composition' },
  { id: 'canvas', icon: '🖼️', label: 'Canvas' },
  { id: 'effects', icon: '🎨', label: 'Effects' },
];

// What each rail category's right-hand panel shows before a main video
// exists — a one-line preview of what unlocks once a video is uploaded,
// shown while the panel itself has nothing real to operate on yet.
const EMPTY_CATEGORY_COPY = {
  media: 'Upload your main video on the left. Once it\'s in, add a second video or image overlay here for split-screen, picture-in-picture, or a logo/watermark.',
  edit: 'Once your video is on the timeline, select a clip here to trim, split, duplicate, speed up/slow down, or add fades.',
  audio: 'Select a clip here to replace, mute, or mix its audio, adjust volume and ducking, or clean up background noise.',
  text: 'Add titles, captions-style text, or lower-thirds here once your video is loaded, with presets for size, color, and animation.',
  captions: 'Auto Captions transcribes your edited timeline once a video is loaded, or burn in your own .srt/.vtt file here — no transcription required.',
  composition: 'Add a second video overlay to unlock split-screen, picture-in-picture, and video-call layouts here.',
  canvas: 'Choose a landscape, square, or vertical frame and a background fill here — works the moment your video is uploaded.',
  effects: 'Select a clip here to apply color filters, crop, rotate, or flip it.',
};

// Named "video call" layouts: batch-apply pip position/size across however
// many overlay tracks currently exist (up to the template's own slot
// count), so a 2-4 participant call can be arranged in one click instead of
// positioning each track by hand. Main track stays full-canvas underneath —
// these place overlay tiles AROUND it (bottom/side strip, or one per
// corner), not an equal-size grid that would also need to resize main
// itself (a bigger rendering change, out of scope here).
const VIDEO_CALL_TEMPLATES = {
  'bottom-strip': {
    label: 'Bottom strip',
    slots: [{ x: 0.08, y: 1 }, { x: 0.38, y: 1 }, { x: 0.68, y: 1 }],
    pipSizeRatio: 0.22,
  },
  'side-strip': {
    label: 'Side strip',
    slots: [{ x: 1, y: 0.06 }, { x: 1, y: 0.36 }, { x: 1, y: 0.66 }],
    pipSizeRatio: 0.22,
  },
  corners: {
    label: 'Corners',
    slots: [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0 }],
    pipSizeRatio: 0.26,
  },
};

// Assigns each overlay track (in track order) the template's next slot
// position/size, switching every track to 'pip' mode in the process — a
// split-mode track wouldn't have a meaningful pip position to place.
// Cycles slots (% tpl.slots.length) rather than truncating past the
// template's own participant count, so a 5th track still gets *a*
// reasonable position instead of being silently skipped.
function applyVideoCallTemplate(timeline, templateId) {
  const tpl = VIDEO_CALL_TEMPLATES[templateId];
  if (!tpl) return timeline;
  let next = timeline;
  timeline.overlayTracks.forEach((track, i) => {
    const slot = tpl.slots[i % tpl.slots.length];
    next = setOverlayTrackMode(next, track.id, 'pip');
    next = setOverlayTrackPipPosition(next, track.id, slot);
    next = setOverlayTrackPipSizeRatio(next, track.id, tpl.pipSizeRatio);
  });
  return next;
}

// Output frame shape — independent of composition mode. Works with a
// single video too: picking a non-landscape shape reframes (crops/fits)
// the whole export into it, the same "TikTok/Reels/Shorts vs. YouTube vs.
// IG feed" choice most editing apps expose.
const FRAME_ASPECT_OPTIONS = [
  { id: 'landscape', label: 'Landscape', sub: '16:9 · YouTube', icon: '▭' },
  { id: 'square', label: 'Square', sub: '1:1 · Feed', icon: '▢' },
  { id: 'vertical', label: 'Vertical', sub: '9:16 · TikTok/Reels', icon: '▯' },
];

// Quick-jump presets alongside free dragging — not a replacement for it.
const PIP_CORNER_OPTIONS = [
  { id: 'top-left', label: 'Top left', icon: '↖' },
  { id: 'top-right', label: 'Top right', icon: '↗' },
  { id: 'bottom-left', label: 'Bottom left', icon: '↙' },
  { id: 'bottom-right', label: 'Bottom right', icon: '↘' },
];

// Named platform shortcuts on top of the same 3 underlying frame shapes —
// picking one just calls setFrameAspect() with its mapped aspect, so this
// is purely a friendlier label layer, not new engine behavior.
const SOCIAL_PRESETS = [
  { id: 'youtube', label: 'YouTube', aspect: 'landscape', icon: '▭' },
  { id: 'youtube-shorts', label: 'YouTube Shorts', aspect: 'vertical', icon: '▯' },
  { id: 'tiktok', label: 'TikTok', aspect: 'vertical', icon: '▯' },
  { id: 'ig-reel', label: 'Instagram Reel', aspect: 'vertical', icon: '▯' },
  { id: 'ig-square', label: 'Instagram Feed', aspect: 'square', icon: '▢' },
  { id: 'linkedin', label: 'LinkedIn', aspect: 'landscape', icon: '▭' },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

// A DIFFERENT control from SPEED_OPTIONS above — that one is a per-clip
// property (Effects panel, setClipSpeed) that changes actual duration and
// export output; this is purely how fast the editor plays the timeline
// back for review (see the previewRate state and render effect).
const PREVIEW_SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2];

const FILTER_PRESETS = {
  none: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0 },
  grayscale: { brightness: 1, contrast: 1.05, saturation: 1, grayscale: 1 },
  warm: { brightness: 1.05, contrast: 1.05, saturation: 1.25, grayscale: 0 },
  cool: { brightness: 1, contrast: 1.05, saturation: 0.85, grayscale: 0 },
  vintage: { brightness: 1.05, contrast: 0.9, saturation: 0.7, grayscale: 0 },
  cinematic: { brightness: 0.95, contrast: 1.2, saturation: 0.9, grayscale: 0 },
};

// Fade/dip-to-color reuse the existing per-clip fade engine (this clip's
// fadeOut + the next clip's fadeIn, plus the background color for the dip
// variants) — see handleSetTransition. Crossfade reuses that exact same
// audio fade behavior, adding a genuine simultaneous VIDEO blend on top: a
// second, always-decoding lookahead element (main*CrossfadeVideoRef in the
// preview loop, its export-path equivalent in timelineRender.js) draws the
// next clip's own first frame with rising opacity over the outgoing clip's
// tail, rather than fading through the background color. The incoming clip
// is held on that first frame (not advancing) during the blend, so there's
// no jump/repeat when its own official slot begins right after.
const TRANSITION_OPTIONS = [
  { id: 'cut', label: 'Cut' },
  { id: 'crossfade', label: 'Crossfade / Dissolve' },
  { id: 'dip-black', label: 'Fade to Black' },
  { id: 'dip-white', label: 'Fade to White' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'slide', label: 'Slide' },
  { id: 'push', label: 'Push' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'blur', label: 'Blur Dissolve' },
  { id: 'iris', label: 'Circle/Iris Reveal' },
];

// Discrete duration presets (seconds) for the transition duration picker —
// a fixed set reads as a professional, deliberate choice rather than an
// open-ended number field encouraging odd values like 1.37s.
const TRANSITION_DURATION_PRESETS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

// Quick-pick durations for an image clip's own on-screen length — a rapid
// slideshow lives in this range (fractions of a second up to a couple),
// same "fixed set reads as deliberate" reasoning as the transition presets
// above. The numeric input next to these still takes any custom value.
const IMAGE_DURATION_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2];

// The between-clip TRANSITION_OPTIONS above (slide/wipe/zoom/crossfade/etc.)
// all need a NEXT clip to blend into — meaningless at the very start or end
// of the whole timeline, where there's no adjacent clip to blend with. Only
// a plain fade (to/from a solid color) makes sense there, so opening/closing
// transitions get their own, smaller option set — see
// handleSetOpeningTransition/handleSetClosingTransition.
const EDGE_TRANSITION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade-black', label: 'Fade to/from black' },
  { id: 'fade-white', label: 'Fade to/from white' },
];

const MARKER_LABEL_OPTIONS = ['Marker', 'Intro', 'Important moment', 'Cut here', 'Caption', 'Music change', 'Outro'];

const TEXT_ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'pop', label: 'Pop' },
];

const BACKGROUND_TYPE_OPTIONS = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'blur', label: 'Blurred video' },
  { id: 'image', label: 'Image' },
];

const SHAPE_TYPE_OPTIONS = [
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Circle', icon: '◯' },
  { id: 'line', label: 'Line', icon: '╱' },
  { id: 'arrow', label: 'Arrow', icon: '➜' },
];

const TEXT_PRESET_OPTIONS = [
  { id: 'heading', label: 'Heading', size: 64, y: 0.15, bold: true },
  { id: 'subtitle', label: 'Subtitle', size: 36, y: 0.24, bold: false },
  { id: 'lower-third', label: 'Lower third', size: 40, y: 0.82, bold: true, background: 'bar' },
  { id: 'simple', label: 'Simple text', size: 44, y: 0.5, bold: false },
  { id: 'watermark', label: 'Watermark', size: 24, y: 0.95, bold: false, opacity: 0.6 },
  { id: 'quote', label: 'Quote', size: 40, y: 0.5, italic: true },
  { id: 'callout', label: 'Callout', size: 36, y: 0.5, background: 'solid' },
];

const RESOLUTION_OPTIONS = [
  { id: '480p', label: '480p', sub: 'Small' },
  { id: '720p', label: '720p', sub: 'Balanced' },
  { id: '1080p', label: '1080p', sub: 'High quality' },
];

const QUALITY_OPTIONS = [
  { id: 'small', label: 'Small file' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high', label: 'High quality' },
];

const FPS_OPTIONS = [
  { id: 'original', label: 'Original', sub: 'Match source' },
  { id: 24, label: '24', sub: 'Cinematic' },
  { id: 30, label: '30', sub: 'Standard' },
  { id: 60, label: '60', sub: 'Smooth' },
];

// Same table timelineRender.js uses as the encoder's actual -maxrate
// ceiling (see exportQuality.js) — kept as ONE source of truth so this
// "estimated size" readout can never promise a number the encoder isn't
// also held to. Video kbps only; a flat allowance for audio (~128kbps) is
// added on top in estimatedExportMB below.
const ESTIMATED_VIDEO_KBPS = TARGET_VIDEO_KBPS;

// Every direct clip-edit handler below routes trim/split/move/duplicate
// through one of these instead of calling timeline.js's plain primitive
// straight on `clip.id` — pure functions, so they live at module scope
// rather than inside the component. A MAIN_TRACK video clip always goes
// through the matching Linked* wrapper (see lib/media/timeline.js's own
// "Linked main-audio track" section), which mirrors the edit onto its
// linked audio clip if one exists and is a no-op passthrough if not. Editing
// a still-linked audio clip directly (selecting it on the audio track itself
// rather than editing it via its paired video clip) instead unlinks it
// first — from that point on it's an ordinary independent sound clip and
// stops receiving the video clip's own mirrored edits, per the "video/audio
// stay synced by default, but are always independently editable" brief.
// Deleting doesn't need this: a clip that's about to be removed has no
// "going forward" for the link to matter to.
function trimClipRespectingLink(tl, clip, trim) {
  if (clip.track === MAIN_TRACK) return trimLinkedClip(tl, clip.id, trim);
  return trimClip(clip.linkedVideoClipId ? unlinkAudioClip(tl, clip.id) : tl, clip.id, trim);
}
function splitClipRespectingLink(tl, clip, atSourceTime) {
  if (clip.track === MAIN_TRACK) return splitLinkedClip(tl, clip.id, atSourceTime);
  return splitClip(clip.linkedVideoClipId ? unlinkAudioClip(tl, clip.id) : tl, clip.id, atSourceTime);
}
function moveClipRespectingLink(tl, clip, newStart) {
  if (clip.track === MAIN_TRACK) return moveLinkedClip(tl, clip.id, newStart);
  return moveClip(clip.linkedVideoClipId ? unlinkAudioClip(tl, clip.id) : tl, clip.id, newStart);
}
function moveClipToIndexRespectingLink(tl, track, clipId, newIndex) {
  if (track === MAIN_TRACK) return moveLinkedClipToIndex(tl, track, clipId, newIndex);
  const clip = tl.clips.find((c) => c.id === clipId);
  return moveClipToIndex(clip?.linkedVideoClipId ? unlinkAudioClip(tl, clipId) : tl, track, clipId, newIndex);
}
// Fallback used when there's no "apply to video/audio/both" choice to make:
// a MAIN_TRACK clip with no linked audio clip (mirrors the change nowhere,
// same as plain setClipSpeed), or a clip being edited directly on the Audio
// track itself (see trimClipRespectingLink's own comment on why a direct
// edit there unlinks first). The Effects panel's own Speed control picks
// between this and its explicit video/audio/both target buttons — see its
// JSX for the linked, MAIN_TRACK case this intentionally doesn't handle.
function setClipSpeedRespectingLink(tl, clip, speed) {
  const linked = clip.track === MAIN_TRACK ? getLinkedAudioClip(tl, clip.id) : null;
  let next = setClipSpeedRipple(tl, clip.id, speed);
  if (linked) next = setClipSpeedRipple(next, linked.id, speed);
  return next;
}
// Manually setting a MAIN_TRACK clip's own audioMode (the Keep/Mute/Replace/
// Mix dropdown, or the separate Replace/Clean-audio actions that call this
// with mode='replace') is a deliberate takeover of that clip's audio — if
// it still has a linked clip on the main audio track, that clip is now
// redundant (both would otherwise try to be "the" audio for this span at
// once) and is removed outright, in place, rather than merely unlinked.
function setClipAudioModeRespectingLink(tl, clip, audioMode, audioSourceId) {
  const linked = clip.track === MAIN_TRACK ? getLinkedAudioClip(tl, clip.id) : null;
  const base = linked ? removeClipInPlace(tl, linked.id) : tl;
  return setClipAudioMode(base, clip.id, audioMode, audioSourceId);
}
function duplicateClipRespectingLink(tl, clip) {
  if (clip.track === MAIN_TRACK) return duplicateLinkedClip(tl, clip.id);
  const next = duplicateClip(tl, clip.id);
  if (next === tl || !clip.linkedVideoClipId) return next;
  // The ORIGINAL keeps mirroring its video clip if edited from there — only
  // the brand-new copy (a deliberate "duplicate just the audio" action) is
  // born already independent.
  const newClip = next.clips[next.clips.length - 1];
  return { ...next, clips: next.clips.map((c) => (c.id === newClip.id ? { ...c, linkedVideoClipId: null } : c)) };
}

export default function VideoEditorWorkspace() {
  const [timeline, setTimeline] = useState(createTimeline());
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  // Multi-select — purely additive on top of the existing single
  // selectedClipId (which keeps driving the single-clip Clip panel exactly
  // as before): extraSelectedClipIds holds any OTHER clips added via
  // Ctrl/Cmd-click or Shift-click range-select, always within the same
  // track as selectedClipId (see handleClipClick). The "current selection"
  // for bulk actions is the union of the two — see selectionIds below.
  const [extraSelectedClipIds, setExtraSelectedClipIds] = useState([]);
  const [playhead, setPlayhead] = useState(0); // timeline-relative seconds
  const [playing, setPlaying] = useState(false);
  // Preview-only playback speed — how fast the EDITOR plays the timeline
  // back for review, entirely separate from a clip's own Speed (Effects
  // panel, setClipSpeed) which changes actual duration/export. This never
  // touches the timeline data model at all, just how fast wall-clock time
  // is translated into playhead advancement below (see the render effect).
  const [previewRate, setPreviewRate] = useState(1);
  const [uploadError, setUploadError] = useState('');
  const [renderStatus, setRenderStatus] = useState('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [exportFilename, setExportFilename] = useState('edited-video');
  const exportFilenameTouchedRef = useRef(false);
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState(null);
  const [selectedShapeOverlayId, setSelectedShapeOverlayId] = useState(null);
  const [thumbnailsBySource, setThumbnailsBySource] = useState({}); // sourceId -> { thumbs, duration } | 'loading' | 'error'
  const [waveformBySource, setWaveformBySource] = useState({}); // sourceId -> peaks[] | 'loading' | 'error'
  const [silenceRanges, setSilenceRanges] = useState(null); // null = not run yet; [] = ran, found none; [{ start, end, selected }] = ran, found some — never applied until the user confirms
  // Which clip(s) a speed change from a MAIN_TRACK clip's own Speed control
  // applies to when it has a linked audio clip — 'both' (the historical,
  // still-synced default) | 'video' | 'audio'. A plain UI choice, not part
  // of the timeline itself — irrelevant once a clip has no linked partner.
  const [speedApplyTarget, setSpeedApplyTarget] = useState('both');
  const [silenceScanning, setSilenceScanning] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [cleaningClipAudio, setCleaningClipAudio] = useState(false);
  const [clipCleanupError, setClipCleanupError] = useState('');
  // Timeline zoom — a multiplier on the track strips' own width (they're
  // flex-proportional to clip duration already, see mainTrackRef's comment
  // below) rather than a fixed px-per-second, so 1x still exactly fits the
  // panel width like before this existed. Wrapped in a horizontally
  // scrollable container once zoomed in past 1x.
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [fontUploadError, setFontUploadError] = useState('');
  // Left-rail active category — purely a UI-organization concern (which
  // existing panel is docked/visible), reusing every panel's existing
  // state/handlers untouched; 'clip' isn't one of the rail buttons since
  // that panel is now the ALWAYS-visible right inspector instead (see the
  // return JSX), matching how a selected clip's own properties work in
  // most real editors.
  const [activeCategory, setActiveCategory] = useState('media');
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  // Preview-only aspect-ratio-safe guides (action-safe/title-safe boxes) —
  // drawn directly on the canvas in the live preview loop, deliberately
  // OUTSIDE drawCompositionFrame (the function export also calls), so they
  // can never accidentally end up burned into an exported video.
  const [showSafeGuides, setShowSafeGuides] = useState(false);
  // Whether the trim handle currently being dragged is snapped this frame
  // — { clipId, edge } or null, used only for the subtle visual highlight
  // on that one handle. Set sparingly (only on actual on/off transitions,
  // see handleTrimHandleMove) so a drag doesn't re-render on every pixel.
  const [snappedHandle, setSnappedHandle] = useState(null);
  // Project auto-save/restore (IndexedDB) — see lib/media/projectPersistence.js.
  // restorePrompt holds a previously-saved { timeline, savedAt } offered to
  // the user right after mount; null once dismissed either way (or if there
  // was nothing to restore). restoreCheckDone gates the autosave effect
  // below so it can never fire — and overwrite a real save with the initial
  // empty timeline — before the one-time mount check has actually run.
  const [restorePrompt, setRestorePrompt] = useState(null);
  const restoreCheckDoneRef = useRef(false);

  // ---- Auto Captions state — operates on a local audio-only render of
  // the current timeline (see the import comment above for why). ----
  const [transcript, setTranscript] = useState(null);
  // The exact timeline object transcript was generated from — since every
  // commit() produces a new object, `timeline !== transcriptTimelineRef`
  // is a cheap, reliable "has anything changed since?" check, used only to
  // show a non-blocking staleness hint (never auto-deletes the transcript).
  const [transcriptTimelineRef, setTranscriptTimelineRef] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState('idle'); // idle | preparing-audio | rendering-audio | preparing | transcribing | merging | error
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeProgress, setTranscribeProgress] = useState(null); // { chunkIndex, totalChunks } | { audioRenderProgress } | null
  const audioRenderCancelRef = useRef(null);
  const exportCancelRef = useRef(null);

  // ---- Burn Subtitles: user supplies an existing .srt/.vtt file instead
  // of generating one with Auto Captions — no transcription, no AI. Once
  // parsed, it becomes just another caption SOURCE for the exact same
  // canvas renderer/style/toggle Auto Captions uses (see captionEvents and
  // timeline.captionsEnabled below) — there is no separate "burn" pipeline
  // or style for it anymore; whichever source exists (this, or a
  // transcript) is drawn live and included in the regular Export MP4
  // export the moment captionsEnabled is turned on. ----
  const [uploadedSubtitle, setUploadedSubtitle] = useState(null); // { segments: [{start,end,text}] } | null
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const [subtitleParseError, setSubtitleParseError] = useState('');
  // Whichever caption source exists becomes the active one for the unified
  // renderer/style/toggle below — an uploaded subtitle file is a deliberate,
  // one-off action, so it takes priority over a transcript if somehow both
  // are present at once. Memoized (not just a plain const) because the live
  // preview's render-loop effect depends on it — see its own dependency
  // array — and getCaptionEvents builds a fresh array every call, which
  // would otherwise look "changed" on every render and restart that loop
  // needlessly.
  const captionEvents = useMemo(() => getCaptionEvents(uploadedSubtitle || transcript), [uploadedSubtitle, transcript]);

  const canvasRef = useRef(null);
  const previewWrapRef = useRef(null);
  const mainVideoRef = useRef(null);
  // A static image on the MAIN track (slideshow) has no video to decode —
  // one plain Image() per source (see ensureMainImageElement below), drawn
  // instead of mainVideoRef whenever the active main clip's source is an
  // image. Not a single shared/reused element with an awaited onload the
  // way mainVideoRef's loadClip works — with several images in a row during
  // real playback, that pattern raced against this effect's own teardown
  // (a still-pending await from a superseded tick() generation could finish
  // after a newer one had already moved the shared element on to a later
  // image, leaving the draw call painting nothing) and could stall the loop
  // entirely if one image failed to decode. One persistent element per
  // source, created once and never reassigned, has nothing to race on.
  const mainImageElsRef = useRef(new Map());
  const rafRef = useRef(null);
  const lastMainClipRef = useRef(null);
  // A second, always-available main-track video element used only during a
  // 'crossfade' transition's tail — holds the NEXT clip frozen on its own
  // first frame while it dissolves in over the outgoing clip. See
  // TRANSITION_OPTIONS' own comment for why it's frozen rather than
  // playing.
  const mainCrossfadeVideoRef = useRef(null);
  const mainCrossfadeLoadedClipRef = useRef(null);
  // Logo/watermark <img> elements, one per imageOverlay's sourceId — plain
  // Image() objects (not part of the DOM tree, same as the text overlays
  // needing no element at all) since drawImageOverlays only ever reads
  // pixels off them via canvas drawImage, never displays them directly.
  const imageOverlayElsRef = useRef(new Map());
  // Uniquely names each uploaded custom font's FontFace family (see
  // handleTextFontFile) so two different uploads never collide in
  // document.fonts, even if the user replaces a font on one overlay after
  // already uploading one for another.
  const nextFontIdRef = useRef(1);

  // One full state bundle per overlay track (DOM elements + Web Audio nodes
  // + "last loaded clip" refs) — a fixed pair of refs only ever covered
  // exactly one overlay; a multi-track timeline needs one of everything per
  // track. Built lazily via getOverlayLayerState() rather than a fixed-size
  // useRef, since the number of overlay tracks is dynamic.
  const overlayLayersRef = useRef(new Map());
  function getOverlayLayerState(trackId) {
    if (!overlayLayersRef.current.has(trackId)) {
      overlayLayersRef.current.set(trackId, {
        videoEl: null, imageEl: null,
        gain: null, replaceGain: null,
        srcNode: null, tappedEl: null,
        replaceAudioEl: null,
        lastClipIdRef: { current: null },
        lastImageSourceIdRef: { current: null },
        replaceSrcNodeRef: { current: null },
        replaceLastClipIdRef: { current: null },
        lastCutoutCanvas: null, // cached masked-person canvas — see the cutout block in the tick loop below
        lastCutoutAt: 0,
      });
    }
    return overlayLayersRef.current.get(trackId);
  }

  // One audio element/gain-node pair per sound track — same lazy-map idea
  // as getOverlayLayerState above, just without any visual element or
  // per-clip lifecycle beyond the one clip a sound track normally holds.
  // The gain node is created lazily too, inside tick(), since it needs
  // audioCtxRef.current to exist (only true after the first Play press).
  const soundLayersRef = useRef(new Map());
  function getSoundLayerState(trackId) {
    if (!soundLayersRef.current.has(trackId)) {
      soundLayersRef.current.set(trackId, { audioEl: new Audio(), gain: null, srcNode: null });
    }
    return soundLayersRef.current.get(trackId);
  }

  // Live-preview audio graph — separate from (but modeled on) the Web Audio
  // routing timelineRender.js's composed export already uses. Built lazily,
  // on the first Play press (a real user gesture, required for browsers to
  // let audio start), rather than up front — most users open the tool,
  // trim, and only later press Play.
  const audioCtxRef = useRef(null);
  const mainGainRef = useRef(null);
  // Every other gain node (main, each overlay's, all replace/mix gains)
  // routes through this ONE master gain before reaching the speakers —
  // project-level volume/mute/fade-in/fade-out apply on top of everything
  // else without touching any of those individual gain computations.
  const masterGainRef = useRef(null);
  // Master audio meter — an AnalyserNode tapped off masterGain (after every
  // other gain stage, so it reads the actual final mix) feeding a peak
  // readout drawn directly onto a DOM bar each frame via meterBarRef,
  // bypassing React state entirely so a 60fps meter never triggers a
  // component re-render.
  const analyserRef = useRef(null);
  const meterDataRef = useRef(null);
  const meterBarRef = useRef(null);
  const mainReplaceGainRef = useRef(null);
  const mainSrcNodeRef = useRef(null);
  const mainTappedElRef = useRef(null); // which <video> DOM node mainSrcNodeRef taps — re-tapped if it changes (see ensureAudioGraph)
  const mainReplaceAudioElRef = useRef(null); // hidden <audio> for a clip's 'replace'/'mix' audioSourceId
  const mainReplaceSrcNodeRef = useRef(null);
  const mainReplaceLastClipRef = useRef(null);
  // Wall-clock anchor set when Play starts: { atWall, atPlayhead }. The
  // playhead advances from real elapsed time rather than a fixed per-frame
  // step, so it never drifts away from the audio actually playing.
  const playStartRef = useRef(null);

  // Free-drag PiP repositioning: while a drag is in progress, the live
  // position lives here (not in timeline state) so every pointermove
  // doesn't spam the undo history — commit() only fires once, on release.
  const dragStateRef = useRef(null); // { trackId, dx, dy } grab offset within the overlay box, while dragging
  const livePipPositionRef = useRef(null); // { trackId, position: { x, y } } during an active drag, else null
  // Same live-position-outside-state pattern, for dragging a text overlay
  // directly on the preview — a separate ref rather than generalizing
  // dragStateRef/livePipPositionRef, since text position is a plain 0..1
  // anchor point (no pipSizeRatio-derived range math) and keeping the two
  // completely separate avoids any risk to the already-verified PiP drag.
  const dragTextStateRef = useRef(null); // { id, grabDx, grabDy } grab offset (in canvas px) from the overlay's own anchor point, while dragging
  const liveTextPositionRef = useRef(null); // { id, x, y } during an active drag, else null
  // Same pattern again for a logo/watermark (timeline.imageOverlays) — a
  // real drag on the preview replaces the old corner-preset-only UI.
  const dragImageOverlayStateRef = useRef(null); // { id, grabDx, grabDy }
  const liveImageOverlayPositionRef = useRef(null); // { id, x, y } during an active drag, else null
  // Same pattern again for the caption box — there's only ever one caption
  // showing at a time (unlike N text overlays), so no id is needed, just
  // whether a drag/resize is in progress. dragCaptionStateRef distinguishes
  // a plain move (grabDx/grabDy, same as text) from a resize (which edge,
  // 'left' or 'right', plus the box's own committed width/anchor at grab
  // time so the OTHER edge stays fixed while dragging one side).
  const dragCaptionStateRef = useRef(null); // { mode: 'move', grabDx, grabDy } | { mode: 'resize', edge, startBoxWidth, startX, anchorX } | null
  const liveCaptionStateRef = useRef(null); // { x, y } | { x, boxWidth } during an active drag/resize, else null
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [selectedOverlayTrackId, setSelectedOverlayTrackId] = useState(null); // which overlay track's Composition controls are shown

  const totalDuration = getTotalDuration(timeline);
  const videoKbps = ESTIMATED_VIDEO_KBPS[timeline.exportResolution]?.[timeline.exportQuality] ?? ESTIMATED_VIDEO_KBPS['720p'].balanced;
  const estimatedExportMB = Math.max(0.1, Math.round(((videoKbps + 128) * totalDuration) / 8 / 1024 * 10) / 10);
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  // Suggests a filename from the first clip actually on the timeline rather
  // than leaving a generic "edited-video" — but only until the user types
  // their own, so it doesn't clobber a name they already chose once more
  // clips get added.
  useEffect(() => {
    if (exportFilenameTouchedRef.current || !mainClips.length) return;
    const firstSource = timeline.sources.find((s) => s.id === mainClips[0].sourceId);
    if (firstSource?.file?.name) setExportFilename(firstSource.file.name.replace(/\.[^.]+$/, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainClips[0]?.sourceId]);
  // Which main clip the playhead is currently inside, and where that lands
  // in ITS OWN source file — surfaced next to the project-time readout so a
  // user splitting a merged multi-video timeline can see exactly which
  // frame of the original file they're looking at, not just how far into
  // the combined timeline they are. Recomputed on every render (cheap pure
  // lookup) rather than only inside tick()'s own closure, since the
  // transport display needs it too.
  const playheadMainHit = findActiveClipAt(timeline, MAIN_TRACK, playhead);
  const overlayTracks = timeline.overlayTracks;
  // The independent "Audio Track" bed — e.g. audio used to replace a
  // video's original sound via Replace Video/Sync Audio, or a plain
  // background-music track. Just an ordinary sound track (full split/trim/
  // move/delete support) flagged via projectAudioTrackId so the UI can
  // find and label it specifically.
  const projectAudioTrack = timeline.projectAudioTrackId != null ? timeline.soundTracks.find((t) => t.id === timeline.projectAudioTrackId) : null;
  const projectAudioClips = projectAudioTrack ? getTrackClips(timeline, projectAudioTrack.id) : [];
  const audioTrack = timeline.mainAudioTrackId != null ? timeline.soundTracks.find((t) => t.id === timeline.mainAudioTrackId) : null;
  const audioTrackClips = audioTrack ? getTrackClips(timeline, audioTrack.id) : [];
  // Every other sound track (background music, sound effects, extra
  // narration) — anything added via "+ Add sound" in the Audio tab. Shown
  // as its own draggable timeline row right here, same as Audio track
  // above, instead of being visible only as numeric Start/Length fields
  // buried in the Audio tab with no picture of where they actually sit.
  const extraSoundTracks = timeline.soundTracks.filter((t) => t.id !== timeline.mainAudioTrackId && t.id !== timeline.projectAudioTrackId);
  const allOverlayClips = overlayTracks.flatMap((t) => getTrackClips(timeline, t.id));
  const isComposed = overlayTracks.length > 0;
  // Canvas pixel size for the chosen output frame shape — the single
  // source of truth the preview canvas, drag math, and export (via
  // drawCompositionFrame reading the same timeline.frameAspect) all agree
  // on, so the preview never drifts from what actually gets exported.
  const { width: composeW, height: composeH } = getComposeSize(timeline.frameAspect);
  const needsReframe = timeline.frameAspect !== 'landscape';
  // A heuristic, not an exact timeline-alignment check: if any main clip
  // and any overlay clip both keep their own audio in video-call/PIP mode,
  // that's very often two mics on the same conversation (or the same
  // source used twice) about to sound duplicated/echoed on export. Flagged
  // rather than silently auto-muted, since two genuinely separate people
  // each captured with their own mic is the other common case, and that
  // one legitimately wants both tracks audible.
  const possibleDuplicateAudio = overlayTracks.some((t) => t.mode === 'pip')
    && mainClips.some((c) => c.audioMode === 'keep')
    && allOverlayClips.some((c) => c.audioMode === 'keep');

  function commit(updater) {
    setPast((p) => [...p, timeline]);
    setFuture([]);
    setTimeline((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }
  // One-time mount check: is there an auto-saved project from a previous
  // session/reload waiting in IndexedDB? Surfaced as a dismissable prompt
  // rather than silently restored, since silently overwriting whatever the
  // user is about to do (even a blank timeline) would be its own surprise.
  useEffect(() => {
    let cancelled = false;
    loadProject().then((record) => {
      if (cancelled) return;
      if (record && isWorthSaving(record.timeline)) setRestorePrompt(record);
      restoreCheckDoneRef.current = true;
    }).catch(() => {
      restoreCheckDoneRef.current = true;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save: any time the timeline actually changes, persist it
  // a beat later (so a burst of edits — e.g. dragging a trim handle — only
  // triggers one write, not one per intermediate frame). Gated on the mount
  // check above having finished so this can never race ahead of it and save
  // the empty starting timeline over a real, not-yet-loaded save; further
  // gated on isWorthSaving so an intentionally-cleared project doesn't
  // instantly get re-saved as an empty shell. Runs unconditionally once
  // eligible — there's no explicit "save" action in this editor, so this is
  // the only thing standing between a reload and losing the whole project.
  useEffect(() => {
    if (!restoreCheckDoneRef.current || restorePrompt) return;
    if (!isWorthSaving(timeline)) {
      // The user deleted every clip/source down to nothing — that's a
      // deliberate "start over," so drop the stale save rather than let a
      // later reload offer to restore a project that no longer exists here.
      clearProject().catch(() => {});
      return;
    }
    const handle = setTimeout(() => {
      saveProject(timeline).catch(() => {});
    }, 1200);
    return () => clearTimeout(handle);
  }, [timeline, restorePrompt]);

  function handleRestoreProject() {
    if (!restorePrompt) return;
    setTimeline(restorePrompt.timeline);
    setPast([]);
    setFuture([]);
    setRestorePrompt(null);
  }
  function handleDiscardRestoredProject() {
    setRestorePrompt(null);
    clearProject().catch(() => {});
  }

  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [timeline, ...f]);
    setPast((p) => p.slice(0, -1));
    setTimeline(prev);
  }
  function redo() {
    if (!future.length) return;
    const next = future[0];
    setPast((p) => [...p, timeline]);
    setFuture((f) => f.slice(1));
    setTimeline(next);
  }

  // Builds the live-preview audio graph on first use and (re-)connects it
  // to whichever <video> DOM nodes currently exist. Safe to call every time
  // Play is pressed — cheap no-ops once already set up. Re-tapping (rather
  // than tapping once and assuming forever) matters because the preview
  // <video> elements get unmounted if every clip is deleted and the empty-
  // upload view returns, then remounted fresh if a video is uploaded again.
  function ensureAudioGraph() {
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) return;
    if (!audioCtxRef.current) {
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
      const mainGain = ctx.createGain();
      const mainReplaceGain = ctx.createGain();
      mainGain.connect(masterGain);
      mainReplaceGain.connect(masterGain);
      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
      analyserRef.current = analyser;
      meterDataRef.current = new Uint8Array(analyser.fftSize);
      mainGainRef.current = mainGain;
      mainReplaceGainRef.current = mainReplaceGain;
      mainReplaceAudioElRef.current = new Audio();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    const ctx = audioCtxRef.current;
    // Tapping a media element into the Web Audio graph redirects its audio
    // output away from direct hardware playback and can only be done once
    // per element, ever — and un-muting must happen only once tapped, since
    // some browsers skip decoding a muted video's audio track entirely,
    // leaving nothing for the tap to capture even after gain is raised.
    if (mainVideoRef.current && mainTappedElRef.current !== mainVideoRef.current) {
      mainSrcNodeRef.current = ctx.createMediaElementSource(mainVideoRef.current);
      mainSrcNodeRef.current.connect(mainGainRef.current);
      mainVideoRef.current.muted = false;
      mainTappedElRef.current = mainVideoRef.current;
    }
    timeline.overlayTracks.forEach((track) => {
      const s = getOverlayLayerState(track.id);
      if (!s.gain) {
        s.gain = ctx.createGain();
        s.replaceGain = ctx.createGain();
        s.gain.connect(masterGainRef.current);
        s.replaceGain.connect(masterGainRef.current);
        s.replaceAudioEl = new Audio();
      }
      if (s.videoEl && s.tappedEl !== s.videoEl) {
        s.srcNode = ctx.createMediaElementSource(s.videoEl);
        s.srcNode.connect(s.gain);
        s.videoEl.muted = false;
        s.tappedEl = s.videoEl;
      }
    });
  }

  function handleTogglePlay() {
    const next = !playing;
    if (next) {
      ensureAudioGraph();
      // playhead is already wherever the edit cursor last put it (see
      // handleClipClick/handleEditCursorPointerDown), so playback resumes
      // from exactly that point — never jumps back to 0:00. The cursor
      // itself stays put (not cleared) — its position is read straight
      // off playhead everywhere it's drawn, so it keeps tracking forward
      // right along with playback instead of disappearing.
      playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };
    }
    setPlaying(next);
  }

  // Changing preview speed mid-playback needs the same re-anchor
  // handleEditCursorPointerDown uses for the same reason: elapsedWall keeps
  // accumulating from playStartRef's OLD snapshot, so retroactively
  // applying a new rate to time that already elapsed under the old one
  // would jump the playhead instead of smoothly changing pace from here.
  function handlePreviewSpeed(rate) {
    setPreviewRate(rate);
    if (playing) playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };
  }

  // Releases the AudioContext when the workspace unmounts — nothing to do
  // per-clip, since the graph and its gain nodes are reused across clips.
  useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); }, []);

  // Extracts a filmstrip + waveform once per VIDEO source (not per clip —
  // trimming/splitting a clip re-slices the same cached arrays instead of
  // re-decoding), so dragging trim handles stays instant. Guarded by the
  // `=== undefined` check so this only ever fires once per source id.
  useEffect(() => {
    timeline.sources.forEach((s) => {
      if (s.kind === 'video' && thumbnailsBySource[s.id] === undefined) {
        setThumbnailsBySource((prev) => ({ ...prev, [s.id]: 'loading' }));
        extractThumbnails(s.file, 10, 100)
          .then((result) => setThumbnailsBySource((prev) => ({ ...prev, [s.id]: result })))
          .catch(() => setThumbnailsBySource((prev) => ({ ...prev, [s.id]: 'error' })));
      }
      // Waveforms apply to any source that actually has audio — video
      // clips (as before) and now also a plain 'audio'-kind source, e.g.
      // Replace Video/Sync Audio's or a slideshow's project audio track.
      if (waveformBySource[s.id] === undefined && s.hasAudio) {
        setWaveformBySource((prev) => ({ ...prev, [s.id]: 'loading' }));
        extractWaveformPeaks(s.file, 100)
          .then((peaks) => setWaveformBySource((prev) => ({ ...prev, [s.id]: peaks })))
          .catch(() => setWaveformBySource((prev) => ({ ...prev, [s.id]: 'error' })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.sources]);

  function ensureImageOverlayElement(sourceId) {
    if (imageOverlayElsRef.current.has(sourceId)) return imageOverlayElsRef.current.get(sourceId);
    const source = timeline.sources.find((s) => s.id === sourceId);
    if (!source) return null;
    const img = new Image();
    img.src = URL.createObjectURL(source.file);
    imageOverlayElsRef.current.set(sourceId, img);
    return img;
  }

  // Same lazy-map-of-plain-Image()-objects pattern as ensureImageOverlayElement
  // above, for a main-track image clip (slideshow) instead of a logo — one
  // persistent element per source, created once and never reassigned, so
  // there's nothing for two overlapping tick() generations to race on and
  // no per-frame await to stall the render loop on a slow-to-decode photo.
  function ensureMainImageElement(sourceId) {
    if (mainImageElsRef.current.has(sourceId)) return mainImageElsRef.current.get(sourceId);
    const source = timeline.sources.find((s) => s.id === sourceId);
    if (!source) return null;
    const img = new Image();
    img.src = URL.createObjectURL(source.file);
    mainImageElsRef.current.set(sourceId, img);
    return img;
  }

  // Accepts one or many files in a single selection — each is appended to
  // the end of the main track in the order given (addClip's own start
  // computation always lands a new clip right after the current last one),
  // so a multi-file pick becomes one clean sequence and one undo step
  // instead of requiring N separate "+ Add another video" uploads.
  async function handleMainFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploadError('');
    let next = timeline;
    let firstNewClipId = null;
    for (const f of list) {
      const sizeError = validateUploadSize(f, 'video');
      if (sizeError) { setUploadError(sizeError); break; }
      try {
        const meta = await extractVideoMetadata(f);
        const { timeline: withSource, source } = addSource(next, f, meta, 'video');
        const withClip = addClip(withSource, source.id, MAIN_TRACK);
        const newClipId = getTrackClips(withClip, MAIN_TRACK).at(-1)?.id || null;
        // Give this clip's own audio (if it has any) an independent, linked
        // track/clip of its own right away — see linkVideoClipAudio's own
        // comment for why this is a no-op for a silent/image source.
        next = newClipId ? linkVideoClipAudio(withClip, newClipId) : withClip;
        if (!firstNewClipId) firstNewClipId = newClipId;
      } catch (err) {
        setUploadError(err.message || 'Could not read one of these video files.');
        break;
      }
    }
    if (next !== timeline) {
      commit(next);
      // Selecting the first newly added clip — not just adding it — is
      // what makes the trim/audio/split panel actually show up without the
      // user needing to know to click the timeline strip first.
      if (firstNewClipId) { setSelectedClipId(firstNewClipId); setExtraSelectedClipIds([]); }
    }
  }

  const DEFAULT_IMAGE_CLIP_DURATION = 3;

  // Adds one or more images to the END of the main track, each becoming its
  // own image clip placed back-to-back — a lightweight slideshow. Reuses the
  // exact addSource → addClip → trimClip sequence handleFreezeFrame already
  // relies on (a fresh image clip starts at sourceEnd 0 and needs an explicit
  // trimClip to get a real, non-zero duration). Accumulates every file into a
  // single `next` timeline and commits once, so a multi-file selection is one
  // undo step instead of N.
  async function handleMainImageFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploadError('');
    let next = timeline;
    let firstNewClipId = null;
    for (const f of list) {
      const sizeError = validateUploadSize(f, 'image');
      if (sizeError) { setUploadError(sizeError); break; }
      try {
        const meta = await extractImageMetadata(f);
        const { timeline: withSource, source } = addSource(next, f, meta, 'image');
        const withClip = addClip(withSource, source.id, MAIN_TRACK);
        const newClips = getTrackClips(withClip, MAIN_TRACK);
        const newClip = newClips[newClips.length - 1];
        next = trimClip(withClip, newClip.id, { sourceStart: 0, sourceEnd: DEFAULT_IMAGE_CLIP_DURATION });
        if (!firstNewClipId) firstNewClipId = newClip.id;
      } catch (err) {
        setUploadError(err.message || 'Could not read one of these image files.');
        break;
      }
    }
    if (next !== timeline) {
      commit(next);
      if (firstNewClipId) { setSelectedClipId(firstNewClipId); setExtraSelectedClipIds([]); }
    }
  }

  // Retrims every image clip on the main track to the same duration in one
  // commit — the "set all image durations" bulk control shown once 2+ image
  // clips exist. Non-image clips are left untouched.
  function handleSetAllImageDurations(seconds) {
    const dur = Math.max(0.1, Number(seconds) || DEFAULT_IMAGE_CLIP_DURATION);
    commit((prev) => {
      const imageClips = getTrackClips(prev, MAIN_TRACK)
        .filter((c) => prev.sources.find((s) => s.id === c.sourceId)?.kind === 'image')
        .sort((a, b) => a.start - b.start);
      if (!imageClips.length) return prev;
      // Retrimming alone only changes a clip's own in/out points, not its
      // position — without repositioning what follows, shrinking durations
      // opens gaps and growing them creates overlaps. Processing in start
      // order and moving each clip to right after the previous one keeps
      // the slideshow back-to-back exactly like a fresh multi-image upload.
      let cursor = imageClips[0].start;
      return imageClips.reduce((tl, c) => {
        const trimmed = trimClip(tl, c.id, { sourceStart: 0, sourceEnd: dur });
        const moved = moveClip(trimmed, c.id, cursor);
        cursor += dur;
        return moved;
      }, prev);
    });
  }

  // Per-clip duration for a single selected image — the individual-control
  // counterpart to handleSetAllImageDurations' bulk "set them all the same"
  // button, so one slide can run half a second and the next run for 7.
  function handleSetImageClipDuration(seconds) {
    const dur = Math.max(0.1, Number(seconds) || DEFAULT_IMAGE_CLIP_DURATION);
    commit((tl) => setImageClipDuration(tl, selectedClip.id, dur));
  }

  // Group version for a multi-selection (e.g. "make these 5 rapid-fire
  // slides all 0.5s") — applies setImageClipDuration to each selected image
  // clip in start order within one commit/undo step. Each call already
  // ripples every later main-track clip on its own (selected or not), so
  // chaining them in order composes correctly without any separate
  // reposition pass, unlike handleSetAllImageDurations' explicit cursor.
  function handleSetSelectedImageDurations(seconds) {
    const dur = Math.max(0.1, Number(seconds) || DEFAULT_IMAGE_CLIP_DURATION);
    commit((tl) => {
      const targets = selectionIds
        .map((id) => tl.clips.find((c) => c.id === id))
        .filter((c) => c && c.track === MAIN_TRACK && tl.sources.find((s) => s.id === c.sourceId)?.kind === 'image')
        .sort((a, b) => a.start - b.start);
      return targets.reduce((acc, c) => setImageClipDuration(acc, c.id, dur), tl);
    });
  }

  // Picks up a recording handed off from the standalone Screen Recorder
  // tool's "Open in Video Editor" button (lib/media/blobHandoff.js) — same
  // client-side, same-tab, one-shot mechanism Video Studio's "Extract Audio
  // → Open in Audio Studio" already uses. Runs once on mount; since the
  // handoff always lands via a full navigation to this fresh page, the
  // timeline is guaranteed empty at this point, so it always becomes the
  // main video, never an overlay.
  useEffect(() => {
    (async () => {
      const handoff = await receiveBlobHandoff('video-editor');
      if (handoff) {
        const file = new File([handoff.blob], handoff.filename || 'screen-recording.webm', { type: handoff.mimeType || 'video/webm' });
        await handleMainFiles([file]);
      }
      // A second, independent handoff slot (see blobHandoff.js's `role`) —
      // Replace Video/Sync Audio sends the replacement video above (the
      // normal, default-role handoff every other 'video-editor' sender
      // already uses) alongside the audio it should be synced with, in the
      // SAME navigation. Received after the video so it lands on the
      // now-populated timeline rather than racing it.
      const audioHandoff = await receiveBlobHandoff('video-editor', 'project-audio');
      if (audioHandoff) {
        const audioFile = new File([audioHandoff.blob], audioHandoff.filename || 'audio.wav', { type: audioHandoff.mimeType || 'audio/wav' });
        await handleAddProjectAudioFile(audioFile);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adds/replaces the project's independent Audio Track
  // — used by the handoff above and by the Audio Track panel's own
  // Add/Replace Music upload. Uses the functional commit() form throughout
  // (operating on `prev`, not the outer closure's `timeline`) since this can
  // run immediately after handleMainFiles's own commit in the same tick,
  // before this component has re-rendered with the updated timeline.
  // Adding or replacing the Audio Track always starts it fresh with one
  // clip spanning the new file's full length — matching what "Add Music /
  // Audio Track" and "Replace audio" have always meant — but from there
  // it's an ordinary sound track: split it, delete a piece, drag it,
  // exactly like Sound clips or the linked Audio track already support.
  async function handleAddProjectAudioFile(file) {
    if (!file) return;
    const sizeError = validateUploadSize(file, 'audio');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractAudioMetadata(file);
      commit((prev) => {
        const { timeline: withSource, source } = addSource(prev, file, meta, 'audio');
        const { timeline: withTrack, trackId } = ensureProjectAudioTrack(withSource);
        const cleared = { ...withTrack, clips: withTrack.clips.filter((c) => c.track !== trackId) };
        return addClip(cleared, source.id, trackId);
      });
    } catch (err) {
      setUploadError(err.message || 'Could not read this audio file — it may be an unsupported or corrupted format.');
    }
  }
  function handleRemoveProjectAudio() {
    commit((prev) => (prev.projectAudioTrackId != null ? removeSoundTrack(prev, prev.projectAudioTrackId) : prev));
  }

  // Any number of independent sound clips (music, sound effects, extra
  // narration) — each upload gets its OWN sound track (mirroring
  // handleOverlayFiles' one-track-per-upload pattern below), so multiple
  // sounds can freely overlap in time without needing same-track collision
  // handling. A multi-file selection adds them all in one commit, placed
  // back-to-back starting at the playhead rather than all stacked at 0, so
  // dropping in several sound effects at once doesn't require manually
  // repositioning every one of them afterward.
  async function handleSoundFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploadError('');
    let next = timeline;
    let cursor = playhead;
    let firstTrackId = null;
    for (const f of list) {
      const sizeError = validateUploadSize(f, 'audio');
      if (sizeError) { setUploadError(sizeError); break; }
      try {
        const meta = await extractAudioMetadata(f);
        const { timeline: withSource, source } = addSource(next, f, meta, 'audio');
        const { timeline: withTrack, trackId } = addSoundTrack(withSource);
        const withClip = addClip(withTrack, source.id, trackId);
        const newClip = getTrackClips(withClip, trackId)[0];
        next = moveClip(withClip, newClip.id, cursor);
        cursor += clipDuration(newClip);
        if (!firstTrackId) firstTrackId = trackId;
      } catch (err) {
        setUploadError(err.message || 'Could not read one of these audio files.');
        break;
      }
    }
    if (next !== timeline) commit(next);
  }
  function handleRemoveSoundTrack(trackId) {
    commit((tl) => removeSoundTrack(tl, trackId));
  }

  // Each video overlay upload creates a NEW overlay track (rather than
  // replacing a fixed single slot) — this is what lets 2, 3, or more
  // participants/overlays stack up for a multi-track composition or a
  // video-call layout, while a single upload reproduces the old "one
  // overlay" behavior exactly.
  async function handleOverlayFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'video');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractVideoMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'video');
      const { timeline: withTrack, trackId } = addOverlayTrack(withSource);
      const next = addClip(withTrack, source.id, trackId);
      const newClipId = getTrackClips(next, trackId).at(-1)?.id || null;
      commit(next);
      setSelectedOverlayTrackId(trackId);
      if (newClipId) { setSelectedClipId(newClipId); setExtraSelectedClipIds([]); }
    } catch (err) {
      setUploadError(err.message || 'Could not read this video file.');
    }
  }

  // A static image overlay reuses the exact same addOverlayTrack/addClip
  // path as a video overlay — only the source kind differs — so PiP
  // positioning, split-screen, video-call templates, etc. all work
  // identically for either.
  async function handleOverlayImageFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'image');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractImageMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'image');
      const { timeline: withTrack, trackId } = addOverlayTrack(withSource);
      const next = addClip(withTrack, source.id, trackId);
      const newClipId = getTrackClips(next, trackId).at(-1)?.id || null;
      commit(next);
      setSelectedOverlayTrackId(trackId);
      if (newClipId) { setSelectedClipId(newClipId); setExtraSelectedClipIds([]); }
    } catch (err) {
      setUploadError(err.message || 'Could not read this image file.');
    }
  }

  // A clip's 'replace'/'mix' audio comes from its own standalone 'audio'-
  // kind source (see timeline.js's addSource) rather than reusing a video
  // source — chosen fresh per clip via this file input, not shared across
  // clips, so swapping one clip's music never silently changes another's.
  async function handleReplaceAudioFile(files, mode) {
    const f = files[0];
    if (!f || !selectedClip) return;
    const sizeError = validateUploadSize(f, 'audio');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractAudioMetadata(f);
      commit((tl) => {
        const { timeline: withSource, source } = addSource(tl, f, meta, 'audio');
        return setClipAudioModeRespectingLink(withSource, selectedClip, mode, source.id);
      });
    } catch (err) {
      setUploadError(err.message || 'Could not read this audio file.');
    }
  }

  const selectedClip = timeline.clips.find((c) => c.id === selectedClipId) || null;
  const selectedSource = selectedClip ? timeline.sources.find((s) => s.id === selectedClip.sourceId) : null;
  const selectedClipAudioSource = selectedClip?.audioSourceId ? timeline.sources.find((s) => s.id === selectedClip.audioSourceId) : null;
  const selectedClipTrack = selectedClip && selectedClip.track !== MAIN_TRACK ? overlayTracks.find((t) => t.id === selectedClip.track) : null;
  const isLockedSelected = !!selectedClipTrack?.locked;
  // Union of the primary selection and any extra multi-selected clips —
  // the single source of truth every bulk action (delete/duplicate) and
  // every "is this clip highlighted" check reads from.
  const selectionIds = selectedClipId ? [selectedClipId, ...extraSelectedClipIds.filter((id) => id !== selectedClipId)] : [];
  const selectionIdSet = new Set(selectionIds);

  // Click handling for multi-select on the timeline: plain click selects
  // only this clip (existing single-select behavior, unchanged); Ctrl/Cmd
  // toggles this clip in/out of the selection; Shift selects the
  // contiguous range between the current primary and this clip, but only
  // within the SAME track — multi-select never spans tracks, matching the
  // sequential-per-track model everything else here assumes. overlayTrackId
  // is passed through only for overlay-track clips, to keep the existing
  // "select an overlay clip also selects its track's Composition panel"
  // behavior working on a plain click.
  function handleClipClick(e, clip, overlayTrackId) {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    const clickedId = clip.id;
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      const primaryClip = selectedClipId ? timeline.clips.find((c) => c.id === selectedClipId) : null;
      if (clickedId === selectedClipId) {
        if (extraSelectedClipIds.length) {
          const [newPrimary, ...rest] = extraSelectedClipIds;
          setSelectedClipId(newPrimary);
          setExtraSelectedClipIds(rest);
        } else {
          setSelectedClipId(null);
          setExtraSelectedClipIds([]);
        }
      } else if (extraSelectedClipIds.includes(clickedId)) {
        setExtraSelectedClipIds((prev) => prev.filter((id) => id !== clickedId));
      } else if (!primaryClip || primaryClip.track === clip.track) {
        if (!selectedClipId) setSelectedClipId(clickedId);
        else setExtraSelectedClipIds((prev) => [...prev, clickedId]);
      } else {
        // Ctrl-clicking a clip on a DIFFERENT track than the current
        // selection starts a fresh single selection there rather than
        // silently no-op'ing or mixing tracks.
        setSelectedClipId(clickedId);
        setExtraSelectedClipIds([]);
      }
      return;
    }
    if (e.shiftKey && selectedClipId) {
      const primaryClip = timeline.clips.find((c) => c.id === selectedClipId);
      if (primaryClip && primaryClip.track === clip.track) {
        e.stopPropagation();
        const trackClips = getTrackClips(timeline, clip.track);
        const i1 = trackClips.findIndex((c) => c.id === selectedClipId);
        const i2 = trackClips.findIndex((c) => c.id === clickedId);
        if (i1 !== -1 && i2 !== -1) {
          const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
          setExtraSelectedClipIds(trackClips.slice(lo, hi + 1).map((c) => c.id).filter((id) => id !== selectedClipId));
          return;
        }
      }
    }
    // Plain click selects AND drops the edit cursor exactly where clicked
    // — "click a clip, a cursor appears at that point" — using the clip's
    // OWN bounding box, not the whole track (this is a per-clip cursor,
    // works identically for a main-track or an overlay-track clip). Also
    // moves the actual playhead there (not just a visual overlay) so the
    // preview jumps immediately AND, if Play is pressed afterward, playback
    // resumes from this exact point instead of wherever it last was.
    setSelectedClipId(clickedId);
    setExtraSelectedClipIds([]);
    if (overlayTrackId !== undefined) setSelectedOverlayTrackId(overlayTrackId);
    // A main-track image clip has a real clipDuration (see
    // setImageClipDuration) just like a video clip, so it gets a cursor
    // too — only a genuinely zero-length clip (a not-yet-trimmed
    // freshly-added one) has none to drop.
    if (clipDuration(clip) > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
      const time = clip.start + frac * clipDuration(clip);
      setEditCursorClipId(clickedId);
      setPlaying(false);
      setPlayhead(time);
    }
  }
  function clearSelectionIfEmptyClick(e) {
    if (e.target !== e.currentTarget) return;
    setSelectedClipId(null);
    setExtraSelectedClipIds([]);
  }

  function handleTrimChange(field, value) {
    if (!selectedClip) return;
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    const trim = {
      sourceStart: field === 'start' ? num : selectedClip.sourceStart,
      sourceEnd: field === 'end' ? num : selectedClip.sourceEnd,
    };
    commit((tl) => trimClipRespectingLink(tl, selectedClip, trim));
  }

  // Splits whatever clip currently sits at the playhead on the selected
  // clip's own track — NOT only the exact clip that was selected before
  // this call. A prior split leaves the playhead inside a brand-new clip
  // (the split's second half), so requiring an exact id match here made a
  // second split silently no-op unless the user re-clicked the timeline in
  // between; auto-following the playhead instead lets "move playhead, hit
  // Split, repeat" work as one continuous motion, same as it visually reads.
  function handleSplitAtCursor() {
    if (!selectedClip || editCursorClipId !== selectedClip.id) return;
    // playhead is timeline-absolute (like clip.start); splitClip wants a
    // point in the SOURCE file's own timeline, so undo the same
    // start-offset + speed math findActiveClipAt uses elsewhere.
    const sourceTime = selectedClip.sourceStart + (playhead - selectedClip.start) * (selectedClip.speed || 1);
    commit((tl) => splitClipRespectingLink(tl, selectedClip, sourceTime));
    // The cursor stays visible — splitClip keeps the FIRST piece's id, so
    // it's still pointing at a valid clip, now sitting right at that
    // piece's own end (the exact spot the cut just happened).
  }

  // Handles both the single-clip "Delete clip" button and a multi-select
  // bulk delete — selectionIds is just [selectedClipId] in the ordinary
  // single-clip case, so this is a strict generalization, not a second
  // code path. One commit() call either way, so undo/redo treats a
  // multi-delete as one history entry regardless of how many clips it removed.
  function handleDeleteSelected() {
    if (!selectionIds.length) return;
    const track = selectedClip?.track ?? timeline.clips.find((c) => c.id === selectionIds[0])?.track;
    if (track === undefined) return;
    commit((tl) => {
      const next = track === MAIN_TRACK
        ? (selectionIds.length > 1 ? deleteLinkedClips(tl, selectionIds) : deleteLinkedClip(tl, selectionIds[0]))
        : (selectionIds.length > 1 ? deleteClips(tl, selectionIds) : deleteClip(tl, selectionIds[0]));
      // An overlay track left with zero clips is dead weight in the track
      // list/UI — same "clean up after yourself" removeSource already does
      // for a deleted source's now-empty tracks.
      const stillHasClips = track !== MAIN_TRACK && getTrackClips(next, track).length > 0;
      return track !== MAIN_TRACK && !stillHasClips ? removeOverlayTrack(next, track) : next;
    });
    setSelectedClipId(null);
    setExtraSelectedClipIds([]);
    setEditCursorClipId(null);
    if (track !== MAIN_TRACK && selectedOverlayTrackId === track) setSelectedOverlayTrackId(null);
  }

  function handleJoinWithNext(track) {
    const clips = getTrackClips(timeline, track);
    const idx = clips.findIndex((c) => c.id === selectedClipId);
    if (idx === -1 || idx >= clips.length - 1) return;
    commit((tl) => joinClips(tl, clips[idx].id, clips[idx + 1].id));
  }

  function handleDuplicateSelected() {
    if (!selectedClip) return;
    commit((tl) => duplicateClipRespectingLink(tl, selectedClip));
  }
  // Bulk duplicate for 2+ selected clips — a separate function (rather than
  // folding into handleDuplicateSelected) so the existing single-clip
  // Duplicate button's behavior/tests are completely untouched; this one is
  // only ever wired to a button that's itself only shown when multi-select
  // is active. Inserts all copies as one contiguous block (see
  // duplicateClips' own comment) in a single commit — one undo/redo entry.
  function handleDuplicateMultiSelected() {
    if (selectionIds.length < 2) return;
    const track = selectedClip?.track ?? timeline.clips.find((c) => c.id === selectionIds[0])?.track;
    commit((tl) => (track === MAIN_TRACK ? duplicateLinkedClips(tl, selectionIds) : duplicateClips(tl, selectionIds)));
    setExtraSelectedClipIds([]);
  }

  // Transitions reuse the existing per-clip fade engine rather than new
  // rendering machinery: Fade/Dip-to-black/white = this clip's fadeOut +
  // the next clip's fadeIn, both set to the transition's duration, plus
  // (for the dip variants) the timeline's background color — since fading
  // to transparent always reveals whatever backgroundFill currently is.
  // Crossfade only sets THIS clip's fadeOut (which the render loops read to
  // drive the video-blend progress — see TRANSITION_OPTIONS' comment) and
  // deliberately leaves the next clip's fadeIn untouched: the blend already
  // brings the next clip up to full opacity by the moment its own official
  // slot begins, so also fading it in from black there would dip it back
  // down and repeat the transition on top of itself.
  function handleSetTransition(clip, type) {
    const mainList = getTrackClips(timeline, MAIN_TRACK);
    const idx = mainList.findIndex((c) => c.id === clip.id);
    const nextClip = idx >= 0 ? mainList[idx + 1] : null;
    const dur = clip.transitionOut.duration || 0.5;
    commit((tl) => {
      let next = setClipTransitionOut(tl, clip.id, { type });
      if (type === 'cut') {
        next = setClipFade(next, clip.id, { fadeOut: 0 });
        if (nextClip) next = setClipFade(next, nextClip.id, { fadeIn: 0 });
      } else if (BLEND_TRANSITION_TYPES.includes(type)) {
        next = setClipFade(next, clip.id, { fadeOut: dur });
        if (nextClip) next = setClipFade(next, nextClip.id, { fadeIn: 0 });
      } else {
        next = setClipFade(next, clip.id, { fadeOut: dur });
        if (nextClip) next = setClipFade(next, nextClip.id, { fadeIn: dur });
        // Only the dip variants actually reveal backgroundFill (fading to
        // transparent shows whatever's behind) — fade and crossfade don't
        // touch it, so an earlier dip choice on another clip isn't silently
        // overwritten by picking Fade/Crossfade on this one.
        if (type === 'dip-white') next = setBackgroundFill(next, '#FFFFFF');
        else if (type === 'dip-black') next = setBackgroundFill(next, '#000000');
      }
      return next;
    });
  }

  const EDGE_TRANSITION_DURATION = 0.75;

  // Opening/closing transitions reuse the exact same fadeIn/fadeOut +
  // backgroundFill mechanism as the dip-black/dip-white between-clip
  // transitions above — they're the same visual effect, just applied to the
  // main track's very first/last clip (whose fadeIn/fadeOut are otherwise
  // unused for a between-clip handoff: transitionOut is meaningless on the
  // last clip, and a first clip's own fadeIn is never touched by any
  // between-clip transition). Sharing timeline.backgroundFill means an
  // opening fade and a between-clip dip elsewhere can't both keep their own
  // color at once — the same known limitation the dip transitions already
  // have with each other.
  function handleSetOpeningTransition(type) {
    const first = mainClips[0];
    if (!first) return;
    commit((tl) => {
      let next = setClipFade(tl, first.id, { fadeIn: type === 'none' ? 0 : EDGE_TRANSITION_DURATION });
      if (type === 'fade-white') next = setBackgroundFill(next, '#FFFFFF');
      else if (type === 'fade-black') next = setBackgroundFill(next, '#000000');
      return next;
    });
  }
  function handleSetClosingTransition(type) {
    const last = mainClips[mainClips.length - 1];
    if (!last) return;
    commit((tl) => {
      let next = setClipFade(tl, last.id, { fadeOut: type === 'none' ? 0 : EDGE_TRANSITION_DURATION });
      if (type === 'fade-white') next = setBackgroundFill(next, '#FFFFFF');
      else if (type === 'fade-black') next = setBackgroundFill(next, '#000000');
      return next;
    });
  }
  const openingTransitionType = mainClips[0]?.fadeIn > 0 ? (timeline.backgroundFill === '#FFFFFF' ? 'fade-white' : 'fade-black') : 'none';
  const closingTransitionType = mainClips[mainClips.length - 1]?.fadeOut > 0 ? (timeline.backgroundFill === '#FFFFFF' ? 'fade-white' : 'fade-black') : 'none';

  // ---- Audio normalization: plain RMS-level analysis (see
  // normalizeAudio.js), no AI — computes a gain multiplier once and stores
  // it on the clip via setClipGain, same as any other manual clip setting.
  async function handleNormalizeAudio() {
    if (!selectedClip || !selectedSource || selectedSource.kind === 'image') return;
    setNormalizing(true);
    try {
      const gain = await computeNormalizationGain(selectedSource.file, selectedClip.sourceStart, selectedClip.sourceEnd);
      commit((tl) => setClipGain(tl, selectedClip.id, gain));
    } catch {
      setUploadError('Could not analyze this clip\'s audio.');
    } finally {
      setNormalizing(false);
    }
  }

  // ---- Audio Cleanup: reduces hum/rumble/hiss, no AI (see
  // lib/media/audioCleanup.js — the same engine Audio Studio and Screen
  // Recorder use). If the clip is already set to Replace/Mix, cleans that
  // audio source; otherwise cleans the clip's own video/audio source
  // within its trim range, then routes the result through the existing
  // Replace-audio mechanism — reusing that infrastructure end to end
  // (export, live preview) rather than adding a parallel audio path. ----
  async function handleCleanClipAudio() {
    if (!selectedClip || !selectedSource) return;
    setCleaningClipAudio(true);
    setClipCleanupError('');
    try {
      const usingReplacement = (selectedClip.audioMode === 'replace' || selectedClip.audioMode === 'mix') && selectedClipAudioSource;
      const sourceFile = usingReplacement ? selectedClipAudioSource.file : selectedSource.file;
      const range = usingReplacement ? {} : { startSeconds: selectedClip.sourceStart, endSeconds: selectedClip.sourceEnd };
      const { blob } = await cleanAudioFile(sourceFile, { intensity: 'medium', reduceHum: true, voiceEnhance: false, normalize: false, ...range });
      const file = new File([blob], 'cleaned-audio.wav', { type: 'audio/wav' });
      await handleReplaceAudioFile([file], 'replace');
    } catch (err) {
      setClipCleanupError(err.message || 'Could not clean this clip\'s audio. Please try again.');
    } finally {
      setCleaningClipAudio(false);
    }
  }

  // ---- Silence removal: detect, let the user review/uncheck, only then
  // apply as ordinary split+delete operations — never a silent auto-cut. ----
  async function handleFindSilence() {
    if (!selectedClip || selectedClip.track !== MAIN_TRACK || !selectedSource) return;
    setSilenceScanning(true);
    setSilenceRanges(null);
    try {
      const ranges = await detectSilence(selectedSource.file, selectedClip.sourceStart, selectedClip.sourceEnd);
      setSilenceRanges(ranges.map((r) => ({ ...r, selected: true })));
    } catch {
      setSilenceRanges([]);
    } finally {
      setSilenceScanning(false);
    }
  }
  function toggleSilenceRange(index) {
    setSilenceRanges((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  }
  // Ranges are independent (non-overlapping, expressed in the original
  // source file's own absolute time), so they can be applied in any order —
  // each is found fresh by which current clip fragment still contains it,
  // since an earlier cut elsewhere never changes another fragment's own
  // sourceStart/sourceEnd.
  function handleApplySilenceRemoval() {
    if (!silenceRanges?.length || !selectedClip) return;
    const originalSourceId = selectedClip.sourceId;
    // A linked audio clip shares this same sourceId and (while still linked)
    // the exact same sourceStart/sourceEnd — without also matching on track,
    // every lookup below could just as easily land on that audio clip
    // instead of the video clip actually being edited.
    const originalTrack = selectedClip.track;
    const selected = silenceRanges.filter((r) => r.selected);
    if (!selected.length) return;
    commit((tl) => {
      // This reshapes the video with a series of splits+deletes that are
      // impractical to mirror onto a linked audio clip step for step —
      // unlink it first so it keeps playing exactly as before rather than
      // silently drifting out of sync while still claiming to be in sync.
      const linked = getLinkedAudioClip(tl, selectedClip.id);
      let next = linked ? unlinkAudioClip(tl, linked.id) : tl;
      for (const range of selected) {
        const target = next.clips.find((c) => c.track === originalTrack && c.sourceId === originalSourceId && c.sourceStart <= range.start + 0.02 && c.sourceEnd >= range.end - 0.02);
        if (!target) continue;
        const afterFirstSplit = splitClip(next, target.id, range.start);
        const midCandidate = afterFirstSplit.clips.find((c) => c.track === originalTrack && c.sourceId === originalSourceId && Math.abs(c.sourceStart - range.start) < 0.06 && c.sourceEnd > range.start);
        if (!midCandidate) { next = afterFirstSplit; continue; }
        const afterSecondSplit = splitClip(afterFirstSplit, midCandidate.id, range.end);
        const toDelete = afterSecondSplit.clips.find((c) => c.track === originalTrack && c.sourceId === originalSourceId && Math.abs(c.sourceStart - range.start) < 0.06 && Math.abs(c.sourceEnd - range.end) < 0.06);
        next = toDelete ? deleteClip(afterSecondSplit, toDelete.id) : afterSecondSplit;
      }
      return next;
    });
    setSilenceRanges(null);
    setSelectedClipId(null);
    setExtraSelectedClipIds([]);
  }

  // A gap before the selected clip (from a deleted neighbor that didn't
  // ripple onto a different track, or a reorder that left one) means
  // playback stops dead on empty space before resuming — findActiveClipAt
  // renders nothing during a gap. "Close gap" snaps the clip flush against
  // whatever's immediately before it on its own track (or 0 if it's first).
  function gapBeforeClip(clip) {
    if (!clip) return 0;
    const trackClips = getTrackClips(timeline, clip.track);
    const idx = trackClips.findIndex((c) => c.id === clip.id);
    const prevEnd = idx > 0 ? trackClips[idx - 1].start + clipDuration(trackClips[idx - 1]) : 0;
    return Math.max(0, clip.start - prevEnd);
  }
  function handleCloseGapBeforeSelected() {
    if (!selectedClip) return;
    const trackClips = getTrackClips(timeline, selectedClip.track);
    const idx = trackClips.findIndex((c) => c.id === selectedClip.id);
    const prevEnd = idx > 0 ? trackClips[idx - 1].start + clipDuration(trackClips[idx - 1]) : 0;
    commit((tl) => moveClipRespectingLink(tl, selectedClip, prevEnd));
  }

  // Explicit reordering — click-based, not a drag gesture, so moving a
  // clip to the very start, the very end, or anywhere in between never
  // requires pixel-precise positioning. Repacks the whole track in the
  // new order (see moveClipToIndex's own comment).
  function selectedClipTrackIndex() {
    if (!selectedClip) return -1;
    return getTrackClips(timeline, selectedClip.track).findIndex((c) => c.id === selectedClip.id);
  }
  function handleMoveClipToStart() {
    if (!selectedClip) return;
    commit((tl) => moveClipToIndexRespectingLink(tl, selectedClip.track, selectedClip.id, 0));
  }
  function handleMoveClipEarlier() {
    if (!selectedClip) return;
    commit((tl) => moveClipToIndexRespectingLink(tl, selectedClip.track, selectedClip.id, selectedClipTrackIndex() - 1));
  }
  function handleMoveClipLater() {
    if (!selectedClip) return;
    commit((tl) => moveClipToIndexRespectingLink(tl, selectedClip.track, selectedClip.id, selectedClipTrackIndex() + 1));
  }
  function handleMoveClipToEnd() {
    if (!selectedClip) return;
    commit((tl) => moveClipToIndexRespectingLink(tl, selectedClip.track, selectedClip.id, getTrackClips(timeline, selectedClip.track).length - 1));
  }

  function toggleFullscreenPreview() {
    const el = previewWrapRef.current;
    if (!el) return;
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  }

  function handleTransitionDuration(clip, duration) {
    const mainList = getTrackClips(timeline, MAIN_TRACK);
    const idx = mainList.findIndex((c) => c.id === clip.id);
    const nextClip = idx >= 0 ? mainList[idx + 1] : null;
    commit((tl) => {
      let next = setClipTransitionOut(tl, clip.id, { duration });
      if (clip.transitionOut.type !== 'cut') {
        next = setClipFade(next, clip.id, { fadeOut: duration });
        // See handleSetTransition's own comment — every blend transition
        // deliberately never sets the next clip's fadeIn.
        if (nextClip && !BLEND_TRANSITION_TYPES.includes(clip.transitionOut.type)) next = setClipFade(next, nextClip.id, { fadeIn: duration });
      }
      return next;
    });
  }

  // Captures whatever the canvas is showing right now, turns it into a new
  // 'image' source (the exact same source kind a real image upload would
  // produce), and splits the active clip at the playhead to insert it — a
  // freeze frame is just a still image clip dropped into the sequence, so
  // it reuses splitClip/addSource/addClip rather than needing new engine
  // primitives of its own.
  async function handleFreezeFrame() {
    if (!selectedClip || selectedClip.track !== MAIN_TRACK) return;
    const hit = findActiveClipAt(timeline, MAIN_TRACK, playhead);
    if (!hit || hit.clip.id !== selectedClip.id) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;
    const file = new File([blob], 'freeze-frame.jpg', { type: 'image/jpeg' });
    const freezeDuration = 2;
    commit((tl) => {
      // A freeze frame only affects the video timeline — a still image has
      // no audio of its own to insert into the gap. If this clip's audio is
      // still linked, unlink it first rather than leaving it claiming to
      // mirror a video clip whose timing is about to change out from under
      // it: the audio keeps playing through the freeze exactly as before,
      // and the user can re-trim/reposition it independently afterward if
      // they want the pause reflected there too.
      const linked = getLinkedAudioClip(tl, hit.clip.id);
      const base = linked ? unlinkAudioClip(tl, linked.id) : tl;
      const split = splitClip(base, hit.clip.id, hit.sourceTime);
      // If the playhead landed too close to an edge, splitClip is a no-op
      // (see its own 0.05s guard) — the freeze frame still gets inserted,
      // just without an actual split on that side.
      const mainNow = getTrackClips(split, MAIN_TRACK);
      const insertAfter = mainNow.find((c) => c.sourceId === hit.clip.sourceId && Math.abs(c.sourceEnd - hit.sourceTime) < 0.1)
        || mainNow.find((c) => c.id === hit.clip.id)
        || mainNow[0];
      // Ripple-insert: make a freezeDuration-wide gap right after
      // insertAfter by shifting every later main-track clip right, then
      // drop the freeze clip (appended at the end by addClip) into it via
      // moveClip — mirrors deleteClip's ripple, just opening a gap instead
      // of closing one.
      const insertAt = insertAfter ? insertAfter.start + clipDuration(insertAfter) : 0;
      const rippled = {
        ...split,
        clips: split.clips.map((c) => (c.track === MAIN_TRACK && c.start >= insertAt - 0.001 ? { ...c, start: c.start + freezeDuration } : c)),
      };
      const { timeline: withSource, source } = addSource(rippled, file, { width: composeW, height: composeH }, 'image');
      const withClip = addClip(withSource, source.id, MAIN_TRACK);
      const newClips = getTrackClips(withClip, MAIN_TRACK);
      const freezeClip = newClips[newClips.length - 1];
      const moved = moveClip(withClip, freezeClip.id, insertAt);
      return trimClip(moved, freezeClip.id, { sourceStart: 0, sourceEnd: freezeDuration });
    });
  }

  // ---- Keyboard shortcuts — ignored while typing in a text input/textarea
  // so trim/overlay text fields keep working normally. ----
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
        else if (e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); handleTogglePlay(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedClipId) { e.preventDefault(); handleDeleteSelected(); } }
      else if (e.key.toLowerCase() === 's') { handleSplitAtCursor(); }
      else if (e.key.toLowerCase() === 'd') { handleDuplicateSelected(); }
      else if (e.key.toLowerCase() === 'm') { commit((tl) => addMarker(tl, playhead)); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClipId, extraSelectedClipIds, playing, playhead, timeline, past, future]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreenPreview(!!(document.fullscreenElement || document.webkitFullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ---- Drag-to-trim: pixel delta on the main track's own rendered width
  // converts to seconds via a single px-per-second ratio (the track's
  // width divided by the timeline's total duration) — clip strips are
  // flex-proportional to duration, so this ratio holds for every clip.
  // Live-updates timeline state directly (bypassing commit()) while
  // dragging so the undo stack doesn't get one entry per pixel moved; a
  // single entry for the whole drag is pushed on release instead. ----
  const mainTrackRef = useRef(null);
  const trimDragRef = useRef(null);

  // Fixed on-screen snap distance (not seconds) so it feels the same
  // regardless of timeline zoom — converted to a timeline-seconds
  // threshold per-drag using that drag's own pxPerSecond.
  const SNAP_PX = 10;

  function handleTrimHandleDown(e, clip, edge) {
    e.stopPropagation();
    e.preventDefault();
    const trackRect = mainTrackRef.current.getBoundingClientRect();
    const pxPerSecond = trackRect.width / (totalDuration || 1);
    // clipTimelineStart is this clip's own ABSOLUTE-timeline start — fixed
    // for the whole drag, since trimming a clip never moves anything
    // BEFORE it (only its own duration changes, rippling everything
    // after). Both handles therefore actually move the same point in
    // absolute timeline time — this clip's END boundary (see the
    // handleTrimHandleMove comment below for why the 'start' handle is no
    // exception) — which is what snapping compares against candidates for.
    const clipTimelineStart = getClipTimelineBounds(timeline, clip.id)?.start ?? 0;
    // Snapshot of every "interesting" timeline position, taken once at
    // drag-start since nothing else moves during this drag: the playhead,
    // timeline start, every marker, and every clip boundary on every
    // track (including this clip's own pre-drag boundaries, which is
    // harmless — snapping back to where you started is a reasonable
    // outcome, not a bug).
    const snapTargets = [
      0,
      playhead,
      ...timeline.markers.map((m) => m.time),
      ...getAllClipBoundaryTimes(timeline),
    ];
    trimDragRef.current = {
      clipId: clip.id,
      edge,
      startClientX: e.clientX,
      startValue: edge === 'start' ? clip.sourceStart : clip.sourceEnd,
      // Both endpoints are snapshotted (not just the one being dragged) so
      // the snap math below never needs to read back into React state —
      // the OTHER endpoint never changes mid-drag, only the dragged one.
      clipSourceStart: clip.sourceStart,
      clipSourceEnd: clip.sourceEnd,
      pxPerSecond,
      speed: clip.speed || 1,
      preDragTimeline: timeline,
      clipTimelineStart,
      snapTargets,
    };
    window.addEventListener('pointermove', handleTrimHandleMove);
    window.addEventListener('pointerup', handleTrimHandleUp);
  }
  function handleTrimHandleMove(e) {
    const drag = trimDragRef.current;
    if (!drag) return;
    const dSeconds = ((e.clientX - drag.startClientX) / drag.pxPerSecond) * drag.speed;
    let newValue = drag.startValue + dSeconds;
    let didSnap = false;
    if (!e.altKey) {
      // Both the 'end' handle and the 'start' handle ultimately move this
      // clip's absolute-timeline END boundary — trimming the start just
      // shortens the clip from a FIXED timeline-start point, so its own
      // end (and everything after it) is what actually shifts (see
      // handleTrimHandleDown's own comment). Converting the raw dragged
      // value into that one shared "moving edge" position lets both
      // handles snap against the exact same candidate set with the same math.
      const rawTimelineEdge = drag.edge === 'end'
        ? drag.clipTimelineStart + (newValue - drag.clipSourceStart) / drag.speed
        : drag.clipTimelineStart + (drag.clipSourceEnd - newValue) / drag.speed;
      const thresholdSeconds = SNAP_PX / drag.pxPerSecond;
      let nearest = null;
      let nearestDist = thresholdSeconds;
      for (const target of drag.snapTargets) {
        const dist = Math.abs(target - rawTimelineEdge);
        if (dist <= nearestDist) { nearest = target; nearestDist = dist; }
      }
      if (nearest !== null) {
        didSnap = true;
        newValue = drag.edge === 'end'
          ? drag.clipSourceStart + (nearest - drag.clipTimelineStart) * drag.speed
          : drag.clipSourceEnd - (nearest - drag.clipTimelineStart) * drag.speed;
      }
    }
    setTimeline((prev) => {
      const clip = prev.clips.find((c) => c.id === drag.clipId);
      if (!clip) return prev;
      const trim = drag.edge === 'start'
        ? { sourceStart: newValue, sourceEnd: clip.sourceEnd }
        : { sourceStart: clip.sourceStart, sourceEnd: newValue };
      return trimClipRespectingLink(prev, clip, trim);
    });
    setSnappedHandle((prev) => {
      const next = didSnap ? { clipId: drag.clipId, edge: drag.edge } : null;
      return (prev?.clipId === next?.clipId && prev?.edge === next?.edge) ? prev : next;
    });
  }
  function handleTrimHandleUp() {
    const drag = trimDragRef.current;
    trimDragRef.current = null;
    window.removeEventListener('pointermove', handleTrimHandleMove);
    window.removeEventListener('pointerup', handleTrimHandleUp);
    setSnappedHandle(null);
    if (drag) {
      setPast((p) => [...p, drag.preDragTimeline]);
      setFuture([]);
    }
  }

  // ---- Edit cursor: a thin red line that lives ON the currently selected
  // clip and marks the exact point Split will cut. It's just WHICH clip
  // currently owns it (editCursorClipId) — its actual position is always
  // read straight off the real playhead (see the JSX below), so it's
  // permanently synced with wherever the preview/playback position is,
  // including while playing: the playhead keeps advancing every frame
  // regardless of this, so the cursor visibly moves right along with it
  // rather than freezing or disappearing when Play is pressed. Clicking a
  // clip sets both the cursor and the playhead to the point clicked;
  // dragging the handle (rendered only on the selected clip) moves both
  // together, clamped to that clip's own span. Split is disabled with no
  // cursor set — there is no other fallback position. ----
  const [editCursorClipId, setEditCursorClipId] = useState(null);
  const editCursorDragRef = useRef(null);

  function handleEditCursorPointerDown(e, clip) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    // The handle is rendered as a direct child of the clip's own div, so
    // its immediate parent IS the clip's bounding box — exactly the
    // frame of reference "drag left/right across the selected clip" needs.
    const clipRect = e.currentTarget.parentElement.getBoundingClientRect();
    const dur = clipDuration(clip);
    const seekToClientX = (clientX) => {
      const frac = clipRect.width > 0 ? Math.min(1, Math.max(0, (clientX - clipRect.left) / clipRect.width)) : 0;
      const time = clip.start + frac * dur;
      setEditCursorClipId(clip.id);
      setPlayhead(time);
      // If playback was already running, dragging the cursor shouldn't
      // stop it — "the video jumps there and playback continues from the
      // new position." The RAF loop in the render effect advances from
      // playStartRef's own snapshot each frame, so that snapshot has to
      // be re-anchored to the dragged position too, or the very next
      // frame would fight the drag and snap back to the old advancing value.
      if (playing) playStartRef.current = { atWall: performance.now(), atPlayhead: time };
    };
    editCursorDragRef.current = true;
    function onMove(ev) { seekToClientX(ev.clientX); }
    function onUp() {
      editCursorDragRef.current = null;
      // The browser still fires a plain 'click' on this handle's PARENT
      // (the clip div) right after pointerup, regardless of how far the
      // drag moved — left unswallowed, that click would re-run
      // handleClipClick and force-pause playback, undoing "playback
      // continues from the new position" the instant the drag ends.
      suppressClickRef.current = true;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- Drag-to-reorder: grabbing a clip's body and dragging it left/right
  // swaps it into a new position in its track's sequence — this is the
  // "drag either clip left/right to reorder the sequence" gesture;
  // positioning the CUT point is the playhead's own separate drag above.
  // Deliberately NOT a free-pixel-position drag (that would either reject
  // the move outright when it overlaps a packed neighbor — clips almost
  // always ARE packed with no gap — or leave a stray gap behind): while
  // dragging, only a CSS transform on the one grabbed clip moves (no data
  // mutation, so nothing can visually collide or reject mid-drag); on
  // release, the clip's dragged CENTER position decides its new index
  // (compared against every other clip's own center) and the whole track
  // is repacked via moveClipToIndex in one commit — always a clean
  // gapless reorder, never a rejected drag or a leftover gap. ----
  const clipMoveDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const MOVE_THRESHOLD_PX = 4;
  const [clipDragVisual, setClipDragVisual] = useState(null); // { clipId, offsetPx } — purely visual until drop

  function handleClipBodyPointerDown(e, clip) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.stopPropagation();
    const trackRect = mainTrackRef.current.getBoundingClientRect();
    const pxPerSecond = trackRect.width / (totalDuration || 1);
    clipMoveDragRef.current = { clipId: clip.id, startClientX: e.clientX, startStart: clip.start, pxPerSecond, moved: false, lastDxPx: 0 };
    window.addEventListener('pointermove', handleClipBodyPointerMove);
    window.addEventListener('pointerup', handleClipBodyPointerUp);
  }
  function handleClipBodyPointerMove(e) {
    const drag = clipMoveDragRef.current;
    if (!drag) return;
    const dxPx = e.clientX - drag.startClientX;
    if (!drag.moved && Math.abs(dxPx) < MOVE_THRESHOLD_PX) return;
    drag.moved = true;
    drag.lastDxPx = dxPx;
    setClipDragVisual({ clipId: drag.clipId, offsetPx: dxPx });
  }
  function handleClipBodyPointerUp() {
    const drag = clipMoveDragRef.current;
    clipMoveDragRef.current = null;
    window.removeEventListener('pointermove', handleClipBodyPointerMove);
    window.removeEventListener('pointerup', handleClipBodyPointerUp);
    setClipDragVisual(null);
    if (!drag?.moved) return;
    suppressClickRef.current = true;
    const clip = timeline.clips.find((c) => c.id === drag.clipId);
    if (!clip) return;
    const deltaSeconds = drag.lastDxPx / drag.pxPerSecond;
    if (clip.track === MAIN_TRACK) {
      const newCenter = drag.startStart + deltaSeconds + clipDuration(clip) / 2;
      const others = getTrackClips(timeline, clip.track).filter((c) => c.id !== clip.id);
      const targetIndex = others.filter((o) => o.start + clipDuration(o) / 2 < newCenter).length;
      commit((tl) => moveClipToIndexRespectingLink(tl, clip.track, clip.id, targetIndex));
      return;
    }
    // Every other track (overlay, Sound clips, the linked Audio track, the
    // Audio Track) is free-form and manually positioned — drop the clip at
    // exactly the position it was dragged to. moveClipToIndex above snaps a
    // clip into a re-sorted back-to-back sequence instead, which is a no-op
    // whenever there's only one clip on the track (nowhere else to be
    // "reordered" to) — exactly why dragging a lone Sound clip or Audio
    // Track piece did nothing no matter where you dropped it.
    const newStart = Math.max(0, drag.startStart + deltaSeconds);
    commit((tl) => moveClipRespectingLink(tl, clip, newStart));
  }

  // ---- Text overlays ----
  function handleAddTextOverlay(presetId) {
    const preset = TEXT_PRESET_OPTIONS.find((p) => p.id === presetId) || TEXT_PRESET_OPTIONS[3];
    const next = addTextOverlay(timeline, {
      preset: preset.id, text: preset.label, size: preset.size, y: preset.y,
      bold: !!preset.bold, italic: !!preset.italic, background: preset.background || 'none',
      opacity: preset.opacity ?? 1, start: 0, end: null,
    });
    const newId = next.textOverlays[next.textOverlays.length - 1].id;
    commit(next);
    setSelectedTextOverlayId(newId);
  }
  function handleUpdateTextOverlay(id, patch) { commit((tl) => updateTextOverlay(tl, id, patch)); }
  // ---- Custom font upload: registers a FontFace under a family name
  // unique to this upload, then points the overlay's existing `font` field
  // at that family — reuses the same field the built-in fonts already use
  // rather than adding a parallel "custom font" concept. document.fonts is
  // a page-global registry, so once loaded it stays available to both the
  // live preview and export (same tab, same document) for the rest of this
  // session. ----
  async function handleTextFontFile(files, overlayId) {
    const f = files[0];
    if (!f) return;
    setFontUploadError('');
    try {
      const buffer = await f.arrayBuffer();
      const family = `customfont-${nextFontIdRef.current++}`;
      const fontFace = new FontFace(family, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      commit((tl) => updateTextOverlay(tl, overlayId, { font: family }));
    } catch {
      setFontUploadError('Could not load this font file — try a .ttf, .otf, or .woff file.');
    }
  }
  function handleDeleteTextOverlay(id) {
    commit((tl) => deleteTextOverlay(tl, id));
    if (selectedTextOverlayId === id) setSelectedTextOverlayId(null);
  }
  const selectedTextOverlay = timeline.textOverlays.find((o) => o.id === selectedTextOverlayId) || null;

  // ---- Watermark / logo (image overlay) ----
  async function handleWatermarkFile(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'image');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractImageMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'image');
      commit(addImageOverlay(withSource, { sourceId: source.id }));
    } catch (err) {
      setUploadError(err.message || 'Could not read this image file.');
    }
  }
  function handleUpdateImageOverlay(id, patch) { commit((tl) => updateImageOverlay(tl, id, patch)); }
  function handleDeleteImageOverlay(id) { commit((tl) => deleteImageOverlay(tl, id)); }

  // ---- Custom background image (backgroundType 'image') — a normal image
  // source, referenced by id rather than added as an overlay/clip. ----
  async function handleBackgroundImageFile(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'image');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractImageMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'image');
      commit(setBackgroundImageSource(withSource, source.id));
    } catch (err) {
      setUploadError(err.message || 'Could not read this image file.');
    }
  }

  // ---- Shape overlays (rectangle/circle/line/arrow annotations) ----
  function handleAddShapeOverlay(type) {
    const next = addShapeOverlay(timeline, { type });
    const newId = next.shapeOverlays[next.shapeOverlays.length - 1].id;
    commit(next);
    setSelectedShapeOverlayId(newId);
  }
  function handleUpdateShapeOverlay(id, patch) { commit((tl) => updateShapeOverlay(tl, id, patch)); }
  function handleDeleteShapeOverlay(id) {
    commit((tl) => deleteShapeOverlay(tl, id));
    if (selectedShapeOverlayId === id) setSelectedShapeOverlayId(null);
  }
  const selectedShapeOverlay = timeline.shapeOverlays.find((o) => o.id === selectedShapeOverlayId) || null;

  // ---- Crop focus (which part of an oversized frame survives Crop to
  // fill) — a small draggable pad in the Clip panel rather than dragging
  // directly on the preview, so it never conflicts with PIP's existing
  // drag-on-preview gesture. ----
  function handleCropFocusPointer(e) {
    if (!selectedClip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    commit((tl) => setClipCropFocus(tl, selectedClip.id, { x, y }));
  }

  // ---- Live preview loop: same drawCompositionFrame function export uses ----
  useEffect(() => {
    if (!mainClips.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cancelled = false;

    async function loadClip(videoEl, clip, ref) {
      if (!clip) return;
      const source = timeline.sources.find((s) => s.id === clip.sourceId);
      if (!source) return;
      if (ref.current !== clip.sourceId) {
        videoEl.src = URL.createObjectURL(source.file);
        ref.current = clip.sourceId;
        // A bounded wait, not just `onloadedmetadata` — some browsers
        // (mobile Safari in particular) can fail to ever fire that event
        // for a reused <video> element's reassigned blob src. Without a
        // fallback, this whole await — and therefore this entire tick()
        // call, since the rAF loop only reschedules itself after tick()
        // returns — would hang forever: the visual freezes on whatever
        // frame was last drawn while anything already natively playing
        // (e.g. an independent project audio track) keeps going on its
        // own clock, unaware the preview loop has stalled.
        await new Promise((resolve) => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          videoEl.onloadedmetadata = finish;
          videoEl.onerror = finish;
          setTimeout(finish, 4000);
        });
        // Loaded metadata (readyState 4) does not guarantee a decoded,
        // paintable frame exists yet — a paused video whose currentTime
        // never changes from its default 0 can sit with nothing for
        // drawImage to draw. Briefly playing and immediately pausing
        // forces a real decode without any visible playback.
        try { await videoEl.play(); videoEl.pause(); } catch {}
      }
    }

    async function loadImage(imgEl, clip, ref) {
      if (!clip) return;
      const source = timeline.sources.find((s) => s.id === clip.sourceId);
      if (!source) return;
      if (ref.current !== clip.sourceId) {
        imgEl.src = URL.createObjectURL(source.file);
        ref.current = clip.sourceId;
        // Resolve rather than reject on error/timeout — a photo that fails
        // to decode should just not draw that frame, not throw out of
        // tickBody() (which would otherwise skip the rest of this frame's
        // audio routing and drawing every single tick, not just this one).
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 8000);
          imgEl.onload = () => { clearTimeout(timer); resolve(); };
          imgEl.onerror = () => { clearTimeout(timer); resolve(); };
        });
      }
    }

    // Plays a track's own video audio (respecting Play/pause) once the
    // audio graph exists; a no-op before the user's first Play press, since
    // nothing is tapped into the graph yet and the elements stay muted.
    function syncTrackPlayback(videoEl, active) {
      if (active && playing) {
        if (videoEl.paused) videoEl.play().catch(() => {});
      } else if (!videoEl.paused) {
        videoEl.pause();
      }
    }

    // Mirrors timelineRender.js's applyReplacementAudio, adapted for live
    // playback instead of recording: routes a clip's 'replace'/'mix'
    // audioSourceId into its own gain node, keeping it seeked to the same
    // offset into the clip as the video (so pressing Play mid-clip doesn't
    // start the replacement audio from 0). Returns whether the clip's own
    // video audio should stay audible too ('mix') or not ('replace'/other).
    async function applyReplacementAudioLive(clip, elapsedInClip, audioEl, gainNode, srcNodeRef, lastClipIdRef, duckGain = 1) {
      const isReplaceOrMix = clip && (clip.audioMode === 'replace' || clip.audioMode === 'mix') && clip.audioSourceId;
      if (!isReplaceOrMix) {
        gainNode.gain.value = 0;
        if (!audioEl.paused) audioEl.pause();
        lastClipIdRef.current = null;
        return false;
      }
      if (clip.id !== lastClipIdRef.current) {
        const audioSource = timeline.sources.find((s) => s.id === clip.audioSourceId);
        if (audioSource) {
          if (audioEl.dataset.sourceId !== audioSource.id) {
            audioEl.src = URL.createObjectURL(audioSource.file);
            audioEl.dataset.sourceId = audioSource.id;
            // Same bounded-wait reasoning as loadClip() above — a metadata
            // event that never fires must not hang tick() forever.
            await new Promise((resolve) => {
              let done = false;
              const finish = () => { if (!done) { done = true; resolve(); } };
              audioEl.onloadedmetadata = finish;
              audioEl.onerror = finish;
              setTimeout(finish, 4000);
            });
          }
          if (!srcNodeRef.current) {
            srcNodeRef.current = audioCtxRef.current.createMediaElementSource(audioEl);
            srcNodeRef.current.connect(gainNode);
          }
          audioEl.currentTime = Math.max(0, Math.min(elapsedInClip, audioEl.duration || elapsedInClip));
        }
        lastClipIdRef.current = clip.id;
      } else if (Math.abs(audioEl.currentTime - elapsedInClip) > 0.15) {
        audioEl.currentTime = Math.max(0, Math.min(elapsedInClip, audioEl.duration || elapsedInClip));
      }
      // A short ramp (not an instant jump) so a duck threshold crossing
      // doesn't click — same reasoning as the export path's own setTargetAtTime.
      gainNode.gain.setTargetAtTime(duckGain, audioCtxRef.current.currentTime, 0.15);
      if (playing) { if (audioEl.paused) audioEl.play().catch(() => {}); } else if (!audioEl.paused) audioEl.pause();
      return clip.audioMode === 'mix';
    }

    // Any number of independent sound clips (timeline.js's soundTracks,
    // which also holds the linked main-audio track and the Audio Track
    // bed) — each has its own clip lifecycle (trim points, an actual start
    // position on the timeline), so this is keyed off findActiveClipAt per
    // track rather than just following `playhead` directly.
    function syncSoundTracksLive() {
      for (const track of timeline.soundTracks) {
        const s = getSoundLayerState(track.id);
        if (!s.gain) {
          s.gain = audioCtxRef.current.createGain();
          s.gain.connect(masterGainRef.current);
        }
        const hit = findActiveClipAt(timeline, track.id, playhead);
        if (!hit || !isSoundTrackAudible(timeline, track.id)) {
          s.gain.gain.value = 0;
          if (!s.audioEl.paused) s.audioEl.pause();
          continue;
        }
        const source = timeline.sources.find((so) => so.id === hit.clip.sourceId);
        if (source && s.audioEl.dataset.sourceId !== source.id) {
          s.audioEl.src = URL.createObjectURL(source.file);
          s.audioEl.dataset.sourceId = source.id;
        }
        if (!s.srcNode) {
          s.srcNode = audioCtxRef.current.createMediaElementSource(s.audioEl);
          s.srcNode.connect(s.gain);
          s.audioEl.muted = false;
        }
        // Without this, a sound clip's own speed (e.g. the linked audio
        // clip when "Apply speed to Audio/Both" is used) was silently
        // ignored in live preview — it always played back at native 1x and
        // only got nudged via the currentTime correction below, which
        // masked the mismatch as jitter instead of an actual speed change.
        // previewRate is folded in too, same as the main/overlay video
        // elements — otherwise "Preview speed" only ever sped up/slowed
        // down what you could see, leaving every imported audio track
        // playing at native speed and just getting yanked around by that
        // same currentTime correction to chase a playhead now moving at a
        // different rate, which sounds like skipping, not a speed change.
        s.audioEl.playbackRate = (hit.clip.speed || 1) * previewRate;
        if (Math.abs(s.audioEl.currentTime - hit.sourceTime) > 0.15) {
          s.audioEl.currentTime = Math.max(0, Math.min(hit.sourceTime, s.audioEl.duration || hit.sourceTime));
        }
        const opacity = getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart);
        s.gain.gain.value = opacity * (hit.clip.gain ?? 1) * (track.volume ?? 1);
        if (playing) { if (s.audioEl.paused) s.audioEl.play().catch(() => {}); } else if (!s.audioEl.paused) s.audioEl.pause();
      }
    }

    async function tick() {
      if (cancelled) return;
      // Belt-and-suspenders alongside loadClip/applyReplacementAudioLive's
      // own timeouts above: whatever throws inside this large per-frame
      // body, the rAF loop must still get rescheduled — an uncaught
      // exception here would otherwise silently and permanently stop the
      // whole preview (visual, audio sync, playhead advance) with no error
      // shown to the user.
      try {
        await tickBody();
      } catch {
        // swallow — one bad frame shouldn't end playback for good.
      } finally {
        if (!cancelled) rafRef.current = requestAnimationFrame(tick);
      }
    }

    async function tickBody() {
      if (playing && !playStartRef.current) playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, playhead);
      const mainSource = mainHit ? timeline.sources.find((s) => s.id === mainHit.clip.sourceId) : null;
      const mainIsImage = mainSource?.kind === 'image';

      if (mainHit && mainIsImage) {
        // A static image has no <video> to decode — loading it into
        // mainVideoRef (as every other branch here does) silently fails,
        // leaving the canvas with no frame to draw and the preview blank.
        // ensureMainImageElement is synchronous (no per-frame await), so
        // there's nothing here for a slow-to-decode photo to stall.
        ensureMainImageElement(mainHit.clip.sourceId);
        syncTrackPlayback(mainVideoRef.current, false);
      } else if (mainHit) {
        await loadClip(mainVideoRef.current, mainHit.clip, lastMainClipRef);
        mainVideoRef.current.playbackRate = (mainHit.clip.speed || 1) * previewRate;
        if (mainHit.clip.reversed) {
          // Native <video> has no reverse-playback mode — approximated here
          // by scrubbing currentTime backward every frame instead of letting
          // native forward playback run. Audio can't be scrubbed backward
          // live either, so it's silenced below; the export renders a real
          // reversed copy (with correctly reversed audio) via ffmpeg before
          // capture — see timelineRender.js's prerenderReversedClips. This
          // preview is a best-effort visual, not the authoritative output.
          if (!mainVideoRef.current.paused) mainVideoRef.current.pause();
          const mirroredTime = mainHit.clip.sourceEnd - (mainHit.sourceTime - mainHit.clip.sourceStart);
          mainVideoRef.current.currentTime = Math.max(0, mirroredTime);
        } else {
          // Matching native playback rate to the clip's speed keeps native
          // playback (needed for audio) from drifting away from the
          // seek-corrected position below — at 2x speed, sourceTime advances
          // twice as fast as unscaled native playback would.
          if (Math.abs(mainVideoRef.current.currentTime - mainHit.sourceTime) > 0.15) {
            mainVideoRef.current.currentTime = mainHit.sourceTime;
          }
          syncTrackPlayback(mainVideoRef.current, true);
        }
      } else {
        syncTrackPlayback(mainVideoRef.current, false);
      }

      const mainOpacity = mainHit ? getFadeOpacity(mainHit.clip, mainHit.sourceTime - mainHit.clip.sourceStart) : 1;

      // Audio routing only matters once the graph exists (first Play press)
      // — before that, every preview <video> element stays muted and silent.
      // Fades apply to audio too (not just the visual), so a fading-out
      // clip doesn't cut abruptly to silence at full volume.
      if (audioCtxRef.current) {
        if (masterGainRef.current) masterGainRef.current.gain.value = getMasterGain(timeline, playhead);
        syncSoundTracksLive();
        if (analyserRef.current && meterDataRef.current && meterBarRef.current) {
          analyserRef.current.getByteTimeDomainData(meterDataRef.current);
          let peak = 0;
          for (let i = 0; i < meterDataRef.current.length; i++) {
            const v = Math.abs(meterDataRef.current[i] - 128) / 128;
            if (v > peak) peak = v;
          }
          // A small boost since real-world peaks rarely swing the full
          // buffer range — reads more like a usable meter, less like it's
          // permanently sitting near empty.
          const level = Math.min(1, peak * 1.3);
          meterBarRef.current.style.width = `${level * 100}%`;
          meterBarRef.current.style.background = level > 0.85 ? '#DC2626' : level > 0.6 ? '#F59E0B' : '#10B981';
        }
        if (mainHit && (mainHit.clip.reversed || mainIsImage)) {
          // An image has no video audio track of its own, but can still
          // carry replace/mix audio (e.g. narration under a title card) —
          // same as the overlay-track isImage branch above.
          if (mainIsImage) await applyReplacementAudioLive(mainHit.clip, 0, mainReplaceAudioElRef.current, mainReplaceGainRef.current, mainReplaceSrcNodeRef, mainReplaceLastClipRef, 1);
          mainGainRef.current.gain.value = 0;
          if (!mainIsImage) mainReplaceGainRef.current.gain.value = 0;
        } else if (mainHit) {
          const elapsedInClip = mainHit.sourceTime - mainHit.clip.sourceStart;
          const mainDuckGain = mainHit.clip.duckBackground && mainHit.clip.audioMode === 'mix'
            ? duckGainAtTime(waveformBySource[mainHit.clip.sourceId], timeline.sources.find((s) => s.id === mainHit.clip.sourceId)?.duration, mainHit.sourceTime)
            : 1;
          const mixKeepsOwnAudio = await applyReplacementAudioLive(mainHit.clip, elapsedInClip, mainReplaceAudioElRef.current, mainReplaceGainRef.current, mainReplaceSrcNodeRef, mainReplaceLastClipRef, mainDuckGain);
          mainGainRef.current.gain.value = ((mainHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * mainOpacity * (mainHit.clip.gain ?? 1);
        } else {
          mainGainRef.current.gain.value = 0;
          mainReplaceGainRef.current.gain.value = 0;
        }
      }

      const drawnOverlayLayers = [];
      for (const track of timeline.overlayTracks) {
        const s = getOverlayLayerState(track.id);
        const hit = findActiveClipAt(timeline, track.id, playhead);
        const source = hit ? timeline.sources.find((so) => so.id === hit.clip.sourceId) : null;
        const isImage = source?.kind === 'image';

        if (hit && isImage) {
          if (s.imageEl) await loadImage(s.imageEl, hit.clip, s.lastImageSourceIdRef);
          if (s.videoEl) syncTrackPlayback(s.videoEl, false);
        } else if (hit && s.videoEl && hit.clip.reversed) {
          // Best-effort scrub-backward preview — see the main track's
          // identical handling above for why native playback can't do this.
          await loadClip(s.videoEl, hit.clip, s.lastClipIdRef);
          s.videoEl.playbackRate = (hit.clip.speed || 1) * previewRate;
          if (!s.videoEl.paused) s.videoEl.pause();
          const mirroredTime = hit.clip.sourceEnd - (hit.sourceTime - hit.clip.sourceStart);
          s.videoEl.currentTime = Math.max(0, mirroredTime);
        } else if (hit && s.videoEl) {
          await loadClip(s.videoEl, hit.clip, s.lastClipIdRef);
          s.videoEl.playbackRate = (hit.clip.speed || 1) * previewRate;
          if (Math.abs(s.videoEl.currentTime - hit.sourceTime) > 0.15) {
            s.videoEl.currentTime = hit.sourceTime;
          }
          syncTrackPlayback(s.videoEl, true);
        } else if (s.videoEl) {
          syncTrackPlayback(s.videoEl, false);
        }

        const opacity = hit ? getFadeOpacity(hit.clip, hit.sourceTime - hit.clip.sourceStart) : 1;
        const trackAudible = isOverlayTrackAudible(timeline, track.id);

        if (audioCtxRef.current && s.gain && s.replaceGain) {
          if (hit && (isImage || hit.clip.reversed)) {
            // An image has no video audio track of its own, but can still
            // carry replace/mix audio (e.g. narration under a title card).
            // A reversed clip's own audio can't be scrubbed backward live —
            // silenced here, correctly reversed in the actual export.
            if (isImage) await applyReplacementAudioLive(hit.clip, 0, s.replaceAudioEl, s.replaceGain, s.replaceSrcNodeRef, s.replaceLastClipIdRef, trackAudible ? 1 : 0);
            s.gain.gain.value = 0;
          } else if (hit) {
            const elapsedInClip = hit.sourceTime - hit.clip.sourceStart;
            const layerDuckGain = (hit.clip.duckBackground && hit.clip.audioMode === 'mix'
              ? duckGainAtTime(waveformBySource[hit.clip.sourceId], timeline.sources.find((s2) => s2.id === hit.clip.sourceId)?.duration, hit.sourceTime)
              : 1) * (trackAudible ? 1 : 0);
            const mixKeepsOwnAudio = await applyReplacementAudioLive(hit.clip, elapsedInClip, s.replaceAudioEl, s.replaceGain, s.replaceSrcNodeRef, s.replaceLastClipIdRef, layerDuckGain);
            s.gain.gain.value = ((hit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * opacity * (hit.clip.gain ?? 1) * (trackAudible ? 1 : 0);
          } else {
            s.gain.gain.value = 0;
            s.replaceGain.gain.value = 0;
          }
        }

        // Person cutout: re-run segmentation at most ~10x/sec (not every
        // tick — inference is too slow for that to stay smooth) and reuse
        // the last successful mask in between, so the preview never flashes
        // back to an un-cut-out frame while a fresh one is still computing.
        let cutoutCanvas = null;
        if (hit && !track.hidden && !isImage && track.cutoutEnabled && (track.mode || 'pip') === 'pip' && s.videoEl) {
          const now = performance.now();
          if (now - s.lastCutoutAt > 100) {
            ensureSegmenterLoaded();
            const mask = getPersonMaskCanvas(s.videoEl);
            if (mask) {
              s.lastCutoutCanvas = buildCutoutCanvas(s.videoEl, mask, track.cutoutFeather ?? 0.3);
              s.lastCutoutAt = now;
            }
          }
          cutoutCanvas = s.lastCutoutCanvas;
        }

        if (hit && !track.hidden) drawnOverlayLayers.push({ trackId: track.id, el: isImage ? s.imageEl : s.videoEl, clip: hit.clip, opacity, cutoutCanvas });
      }

      // 'crossfade' transition tail: draw the NEXT main-track clip, frozen
      // on its own first frame, dissolving in over the outgoing clip's last
      // fadeOut seconds — see TRANSITION_OPTIONS' comment for why it's held
      // frozen rather than played.
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
            // draw path drawCompositionFrame already uses for video (see
            // getMediaSize/drawCover, which handle either media type).
            const img = ensureMainImageElement(nextClip.sourceId);
            if (img) crossfadeLayer = { el: img, clip: nextClip, opacity: progress };
          } else if (nextClip && nextSource && mainCrossfadeVideoRef.current) {
            await loadClip(mainCrossfadeVideoRef.current, nextClip, mainCrossfadeLoadedClipRef);
            if (Math.abs(mainCrossfadeVideoRef.current.currentTime - nextClip.sourceStart) > 0.05) {
              mainCrossfadeVideoRef.current.currentTime = nextClip.sourceStart;
            }
            crossfadeLayer = { el: mainCrossfadeVideoRef.current, clip: nextClip, opacity: progress };
          }
        }
      }

      // A live drag overrides the dragged track's committed pipPosition (or
      // a dragged text overlay's committed x/y) for this frame only —
      // nothing is written to state until pointerup, so the preview stays
      // live without spamming undo history.
      let drawTimeline = livePipPositionRef.current
        ? { ...timeline, overlayTracks: timeline.overlayTracks.map((t) => (t.id === livePipPositionRef.current.trackId ? { ...t, pipPosition: livePipPositionRef.current.position } : t)) }
        : timeline;
      if (liveTextPositionRef.current) {
        drawTimeline = {
          ...drawTimeline,
          textOverlays: drawTimeline.textOverlays.map((o) => (o.id === liveTextPositionRef.current.id ? { ...o, x: liveTextPositionRef.current.x, y: liveTextPositionRef.current.y } : o)),
        };
      }
      if (liveImageOverlayPositionRef.current) {
        drawTimeline = {
          ...drawTimeline,
          imageOverlays: drawTimeline.imageOverlays.map((o) => (o.id === liveImageOverlayPositionRef.current.id ? { ...o, x: liveImageOverlayPositionRef.current.x, y: liveImageOverlayPositionRef.current.y } : o)),
        };
      }
      if (liveCaptionStateRef.current) {
        drawTimeline = { ...drawTimeline, captionStyle: { ...drawTimeline.captionStyle, ...liveCaptionStateRef.current } };
      }

      drawCompositionFrame(ctx, {
        timeline: drawTimeline,
        mainEl: mainHit ? (mainIsImage ? ensureMainImageElement(mainHit.clip.sourceId) : mainVideoRef.current) : null,
        mainClip: mainHit?.clip || null,
        mainOpacity,
        crossfadeEl: crossfadeLayer?.el || null,
        crossfadeClip: crossfadeLayer?.clip || null,
        crossfadeOpacity: crossfadeLayer?.opacity || 0,
        transitionType: mainHit?.clip.transitionOut?.type,
        overlayLayers: drawnOverlayLayers,
        backgroundImageEl: timeline.backgroundImageSourceId ? ensureImageOverlayElement(timeline.backgroundImageSourceId) : null,
        rounded: true,
        border: true,
      });

      // Logo/watermark + text layers draw last, on top of everything else —
      // same shared functions the composed export uses per frame, so what
      // the preview shows is exactly what gets exported.
      timeline.imageOverlays.forEach((o) => { if (o.sourceId) ensureImageOverlayElement(o.sourceId); });
      drawImageOverlays(ctx, { timeline: drawTimeline, timelineSeconds: playhead, imageElements: imageOverlayElsRef.current });
      drawShapeOverlays(ctx, { timeline: drawTimeline, timelineSeconds: playhead });
      drawTextOverlays(ctx, { timeline: drawTimeline, timelineSeconds: playhead });
      if (drawTimeline.captionsEnabled && captionEvents.length) {
        const activeCaptionEvent = findActiveCaptionEvent(captionEvents, playhead);
        if (activeCaptionEvent) {
          drawCaptions(ctx, { style: drawTimeline.captionStyle, event: activeCaptionEvent, timelineSeconds: playhead, timeline: drawTimeline });
          // The box outline + side resize handles are editing chrome, shown
          // only while the Captions panel is open (same idea as the safe-
          // zone guides below) — never part of the actual export, drawn
          // straight onto this preview-only canvas pass after drawCaptions
          // rather than through drawCompositionFrame/timelineRender.js.
          if (activeCategory === 'captions') {
            const b = getCaptionBounds(ctx, drawTimeline.captionStyle, activeCaptionEvent, composeW, composeH);
            if (b) {
              ctx.save();
              ctx.strokeStyle = 'rgba(124,58,237,0.9)';
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 4]);
              ctx.strokeRect(b.x, b.y, b.w, b.h);
              ctx.setLineDash([]);
              ctx.fillStyle = 'rgba(124,58,237,0.9)';
              const handleW = 10, handleH = Math.min(40, b.h * 0.6);
              const handleY = b.y + b.h / 2 - handleH / 2;
              ctx.fillRect(b.x - handleW / 2, handleY, handleW, handleH);
              ctx.fillRect(b.x + b.w - handleW / 2, handleY, handleW, handleH);
              ctx.restore();
            }
          }
        }
      }

      drawMasterFade(ctx, { timeline: drawTimeline, timelineSeconds: playhead, totalDuration, canvasWidth: composeW, canvasHeight: composeH });

      // Safe-zone guides — preview only, drawn after everything else so
      // they're always visible on top, and never passed through
      // drawCompositionFrame/timelineRender.js so they can't end up in an
      // actual export. 90%/80% is the standard action-safe/title-safe pair.
      if (showSafeGuides) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(composeW * 0.05, composeH * 0.05, composeW * 0.9, composeH * 0.9);
        ctx.strokeStyle = 'rgba(250,204,21,0.6)';
        ctx.strokeRect(composeW * 0.1, composeH * 0.1, composeW * 0.8, composeH * 0.8);
        ctx.restore();
      }

      if (playing && playStartRef.current) {
        const elapsedWall = (performance.now() - playStartRef.current.atWall) / 1000;
        // previewRate here is what actually makes 0.25×/2×/etc. slow or
        // speed up the EDIT view: real seconds elapsed are scaled before
        // being added to the timeline position, so at 0.25× the playhead
        // (and the edit cursor riding on it) crawls through the SAME
        // timeline four times slower than the wall clock — no change to
        // any clip's own duration or export speed, just how fast this
        // preview walks across it.
        const next = playStartRef.current.atPlayhead + elapsedWall * previewRate;
        if (next >= totalDuration) {
          setPlaying(false);
          setPlayhead(totalDuration);
        } else {
          setPlayhead(next);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, playhead, playing, previewRate, captionEvents, activeCategory]);

  // ---- Free-drag PiP repositioning (mouse + touch via Pointer Events) ----
  function canvasPointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = composeW / rect.width;
    const scaleY = composeH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  // Hit-tests the caption box first (it draws last of all = visually
  // topmost — see the render loop's drawCaptions call), then text overlays
  // (drawn just before it), then overlay tracks top-most first (last in
  // overlayTracks = drawn last among those = visually on top) — so a drag
  // anywhere grabs whichever element is actually visible at that point.
  function handleOverlayPointerDown(e) {
    const point = canvasPointFromEvent(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && timeline.captionsEnabled && captionEvents.length) {
      const activeCaptionEvent = findActiveCaptionEvent(captionEvents, playhead);
      const b = activeCaptionEvent ? getCaptionBounds(ctx, timeline.captionStyle, activeCaptionEvent, composeW, composeH) : null;
      if (b) {
        // A grab band around each side edge (rather than requiring a pixel-
        // perfect hit on the 1px edge itself) so resizing is actually
        // reachable on a touch screen, not just with a mouse.
        const grabPx = Math.max(14, composeW * 0.015);
        const withinY = point.y >= b.y - 12 && point.y <= b.y + b.h + 12;
        const nearLeft = withinY && Math.abs(point.x - b.x) <= grabPx;
        const nearRight = withinY && Math.abs(point.x - (b.x + b.w)) <= grabPx;
        const insideBox = point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h;
        if (nearLeft || nearRight) {
          e.target.setPointerCapture(e.pointerId);
          dragCaptionStateRef.current = { mode: 'resize', edge: nearLeft ? 'left' : 'right', anchorX: nearLeft ? b.x + b.w : b.x };
          liveCaptionStateRef.current = { x: timeline.captionStyle.x, boxWidth: timeline.captionStyle.boxWidth };
          setIsDraggingCaption(true);
          return;
        }
        if (insideBox) {
          e.target.setPointerCapture(e.pointerId);
          dragCaptionStateRef.current = { mode: 'move', grabDx: point.x - (timeline.captionStyle.x ?? 0.5) * composeW, grabDy: point.y - (timeline.captionStyle.y ?? 0.85) * composeH };
          liveCaptionStateRef.current = { x: timeline.captionStyle.x, y: timeline.captionStyle.y };
          setIsDraggingCaption(true);
          return;
        }
      }
    }
    if (ctx) {
      const activeTextOverlays = timeline.textOverlays.filter((o) => playhead >= o.start && (o.end == null || playhead < o.end));
      for (let i = activeTextOverlays.length - 1; i >= 0; i--) {
        const o = activeTextOverlays[i];
        const b = getTextOverlayBounds(ctx, o, composeW, composeH);
        if (!b || point.x < b.x || point.x > b.x + b.w || point.y < b.y || point.y > b.y + b.h) continue;
        e.target.setPointerCapture(e.pointerId);
        dragTextStateRef.current = { id: o.id, grabDx: point.x - (o.x ?? 0.5) * composeW, grabDy: point.y - (o.y ?? 0.85) * composeH };
        liveTextPositionRef.current = { id: o.id, x: o.x ?? 0.5, y: o.y ?? 0.85 };
        setIsDraggingOverlay(true);
        setSelectedTextOverlayId(o.id);
        return;
      }
    }
    // Image overlays (logos/watermarks) draw just under text/shapes (see
    // the render loop's drawImageOverlays call, before drawTextOverlays) —
    // hit-tested here, after text, before PIP overlay tracks, to match.
    {
      const activeImageOverlays = timeline.imageOverlays.filter((o) => playhead >= o.start && (o.end == null || playhead < o.end));
      for (let i = activeImageOverlays.length - 1; i >= 0; i--) {
        const o = activeImageOverlays[i];
        const img = imageOverlayElsRef.current.get(o.sourceId);
        const b = getImageOverlayBounds(o, img, composeW, composeH);
        if (!b || point.x < b.x || point.x > b.x + b.w || point.y < b.y || point.y > b.y + b.h) continue;
        e.target.setPointerCapture(e.pointerId);
        dragImageOverlayStateRef.current = { id: o.id, grabDx: point.x - o.x * composeW, grabDy: point.y - o.y * composeH };
        liveImageOverlayPositionRef.current = { id: o.id, x: o.x, y: o.y };
        setIsDraggingOverlay(true);
        return;
      }
    }
    const rects = computeLayoutRects(timeline, composeW, composeH);
    for (let i = timeline.overlayTracks.length - 1; i >= 0; i--) {
      const track = timeline.overlayTracks[i];
      if (track.mode !== 'pip' || track.locked) continue;
      const r = rects.overlays[track.id];
      if (!r || point.x < r.x || point.x > r.x + r.w || point.y < r.y || point.y > r.y + r.h) continue;
      e.target.setPointerCapture(e.pointerId);
      dragStateRef.current = { trackId: track.id, dx: point.x - r.x, dy: point.y - r.y };
      livePipPositionRef.current = { trackId: track.id, position: track.pipPosition || { x: 1, y: 1 } };
      setIsDraggingOverlay(true);
      setSelectedOverlayTrackId(track.id);
      return;
    }
  }

  function handleOverlayPointerMove(e) {
    if (dragCaptionStateRef.current) {
      const point = canvasPointFromEvent(e);
      if (dragCaptionStateRef.current.mode === 'resize') {
        const anchorX = dragCaptionStateRef.current.anchorX;
        const newWidthPx = Math.max(60, Math.abs(point.x - anchorX));
        const newCenterX = (anchorX + point.x) / 2;
        liveCaptionStateRef.current = {
          x: Math.max(0, Math.min(1, newCenterX / composeW)),
          boxWidth: Math.max(0.2, Math.min(1, newWidthPx / composeW)),
        };
      } else {
        const x = Math.max(0, Math.min(1, (point.x - dragCaptionStateRef.current.grabDx) / composeW));
        const y = Math.max(0, Math.min(1, (point.y - dragCaptionStateRef.current.grabDy) / composeH));
        liveCaptionStateRef.current = { x, y };
      }
      return;
    }
    if (dragTextStateRef.current) {
      const point = canvasPointFromEvent(e);
      const x = Math.max(0, Math.min(1, (point.x - dragTextStateRef.current.grabDx) / composeW));
      const y = Math.max(0, Math.min(1, (point.y - dragTextStateRef.current.grabDy) / composeH));
      liveTextPositionRef.current = { id: dragTextStateRef.current.id, x, y };
      return;
    }
    if (dragImageOverlayStateRef.current) {
      const point = canvasPointFromEvent(e);
      const x = Math.max(0, Math.min(1, (point.x - dragImageOverlayStateRef.current.grabDx) / composeW));
      const y = Math.max(0, Math.min(1, (point.y - dragImageOverlayStateRef.current.grabDy) / composeH));
      liveImageOverlayPositionRef.current = { id: dragImageOverlayStateRef.current.id, x, y };
      return;
    }
    if (!dragStateRef.current) return;
    const track = timeline.overlayTracks.find((t) => t.id === dragStateRef.current.trackId);
    if (!track) return;
    const point = canvasPointFromEvent(e);
    const position = pipPositionFromPoint(composeW, composeH, track.pipSizeRatio, point.x, point.y, dragStateRef.current);
    livePipPositionRef.current = { trackId: track.id, position };
  }

  function handleOverlayPointerUp() {
    if (dragCaptionStateRef.current) {
      const mode = dragCaptionStateRef.current.mode;
      const finalState = liveCaptionStateRef.current;
      dragCaptionStateRef.current = null;
      setIsDraggingCaption(false);
      if (finalState) {
        commit((tl) => {
          let next = mode === 'resize' ? setCaptionBoxWidth(tl, finalState.boxWidth) : tl;
          next = setCaptionPosition(next, mode === 'resize' ? { x: finalState.x, y: next.captionStyle.y } : { x: finalState.x, y: finalState.y });
          return next;
        });
      }
      liveCaptionStateRef.current = null;
      return;
    }
    if (dragTextStateRef.current) {
      const { id } = dragTextStateRef.current;
      const finalPosition = liveTextPositionRef.current;
      dragTextStateRef.current = null;
      setIsDraggingOverlay(false);
      if (finalPosition) commit((tl) => updateTextOverlay(tl, id, { x: finalPosition.x, y: finalPosition.y }));
      liveTextPositionRef.current = null;
      return;
    }
    if (dragImageOverlayStateRef.current) {
      const { id } = dragImageOverlayStateRef.current;
      const finalPosition = liveImageOverlayPositionRef.current;
      dragImageOverlayStateRef.current = null;
      setIsDraggingOverlay(false);
      if (finalPosition) commit((tl) => updateImageOverlay(tl, id, { x: finalPosition.x, y: finalPosition.y }));
      liveImageOverlayPositionRef.current = null;
      return;
    }
    if (!dragStateRef.current) return;
    const { trackId } = dragStateRef.current;
    const finalPosition = livePipPositionRef.current?.position;
    dragStateRef.current = null;
    setIsDraggingOverlay(false);
    if (finalPosition) commit((tl) => setOverlayTrackPipPosition(tl, trackId, finalPosition));
    livePipPositionRef.current = null;
  }

  async function handleExport() {
    if (!mainClips.length) return;
    setRenderStatus('preparing');
    setRenderError('');
    setRenderProgress(0);
    const cancelToken = { cancelled: false };
    exportCancelRef.current = cancelToken;
    try {
      const blob = await renderTimeline(timeline, {
        onStatus: (s) => setRenderStatus(s === 'done' ? 'idle' : s),
        onProgress: setRenderProgress,
        cancelToken,
        captionEvents,
      });
      downloadBlob(blob, 'video/mp4', `${exportBaseName()}.mp4`);
      setRenderStatus('idle');
    } catch (err) {
      if (err instanceof TimelineRenderCancelledError || cancelToken.cancelled) {
        setRenderStatus('idle');
      } else {
        setRenderStatus('error');
        setRenderError(err.message || 'Could not export this video. Please try again.');
      }
    } finally {
      exportCancelRef.current = null;
    }
  }
  function handleCancelExport() {
    if (exportCancelRef.current) exportCancelRef.current.cancelled = true;
  }


  // ---- Auto Captions — the one operation in this tool that leaves the
  // browser, and only for the transcription step: renderTimelineAudio()
  // renders the CURRENT edited timeline's actual audio mix locally first
  // (see its own comment in timelineRender.js), and only that rendered
  // audio — never the video — is sent to Convertam's transcription
  // provider. Everything else here (transcript editing, SRT/VTT/TXT
  // export, caption burn-in) is the same local engine already used by
  // Audio Studio and Video Studio. ----
  async function handleAutoCaptions() {
    if (!mainClips.length) return;
    setTranscribeStatus('preparing-audio');
    setTranscribeError('');
    setTranscribeProgress(null);
    const cancelToken = { cancelled: false };
    audioRenderCancelRef.current = cancelToken;
    const timelineAtStart = timeline;
    try {
      const audioBlob = await renderTimelineAudio(timelineAtStart, {
        onStatus: (s) => { if (s === 'preparing') setTranscribeStatus('preparing-audio'); else if (s === 'rendering') setTranscribeStatus('rendering-audio'); },
        onProgress: (p) => setTranscribeProgress({ audioRenderProgress: p }),
        cancelToken,
      });
      audioRenderCancelRef.current = null;
      if (cancelToken.cancelled) throw new TimelineRenderCancelledError();
      setTranscribeProgress(null);
      const file = new File([audioBlob], 'timeline-audio.webm', { type: audioBlob.type || 'audio/webm' });
      const result = await transcribeMedia({
        file,
        onStatus: (s, detail) => {
          setTranscribeProgress(detail?.totalChunks > 1 ? detail : null);
          setTranscribeStatus(s === 'done' ? 'idle' : s);
        },
      });
      setTranscript(result);
      setTranscriptTimelineRef(timelineAtStart);
      setTranscribeStatus('idle');
      setTranscribeProgress(null);
    } catch (err) {
      if (err instanceof TimelineRenderCancelledError || cancelToken.cancelled) {
        setTranscribeStatus('idle');
        setTranscribeProgress(null);
      } else {
        setTranscribeStatus('error');
        setTranscribeError(err instanceof TranscriptionError || err instanceof TimelineRenderError ? err.message : 'Could not generate captions. Please try again.');
        setTranscribeProgress(null);
      }
    } finally {
      audioRenderCancelRef.current = null;
    }
  }
  function handleCancelAutoCaptions() {
    if (audioRenderCancelRef.current) audioRenderCancelRef.current.cancelled = true;
  }
  function transcribeStatusLabel() {
    if (transcribeStatus === 'rendering-audio' && transcribeProgress?.audioRenderProgress != null) {
      return `Rendering timeline audio… ${Math.round(transcribeProgress.audioRenderProgress * 100)}%`;
    }
    if (transcribeStatus === 'transcribing' && transcribeProgress?.totalChunks) {
      return `Transcribing part ${transcribeProgress.chunkIndex + 1} of ${transcribeProgress.totalChunks}…`;
    }
    return TRANSCRIBE_STATUS_LABEL[transcribeStatus] || 'Working…';
  }
  // Reuses the live editing preview's own playhead/scrub rather than a
  // second video element — the export is a rendering of this same
  // timeline, so seeking a caption segment here moves the same preview.
  function handleCaptionsSeek(time) {
    setPlaying(false);
    setPlayhead(time);
  }
  function exportBaseName() { return exportFilename.trim().replace(/[\\/:*?"<>|]/g, '-') || 'edited-video'; }
  function handleDownloadSrt() { downloadBlob(transcriptToSrt(transcript), 'text/plain', `${exportBaseName()}.srt`); }
  function handleDownloadVtt() { downloadBlob(transcriptToVtt(transcript), 'text/vtt', `${exportBaseName()}.vtt`); }
  function handleDownloadTxt() { downloadBlob(transcriptToPlainText(transcript), 'text/plain', `${exportBaseName()}-transcript.txt`); }

  // Burn Subtitles: no transcription, no AI — the user already has an
  // .srt/.vtt file. Parsing it is all this does now; becoming visible in
  // the preview/export is the same captionsEnabled toggle Auto Captions
  // uses (see the Captions panel JSX), not a separate burn action.
  async function handleSubtitleFile(files) {
    const f = files[0];
    if (!f) return;
    setSubtitleParseError('');
    try {
      const text = await f.text();
      const parsed = parseSubtitleFile(text, f.name);
      if (!parsed.segments.length) {
        setSubtitleParseError('No subtitle cues were found in this file. Confirm it\'s a valid .srt or .vtt file.');
        return;
      }
      setUploadedSubtitle(parsed);
      setSubtitleFileName(f.name);
    } catch {
      setSubtitleParseError('Could not read this file. Confirm it\'s a valid .srt or .vtt file.');
    }
  }
  function handleRemoveSubtitle() {
    setUploadedSubtitle(null);
    setSubtitleFileName('');
    setSubtitleParseError('');
  }

  const isExporting = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';
  const isTranscribing = transcribeStatus === 'preparing-audio' || transcribeStatus === 'rendering-audio' || transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const supported = isTimelineExportSupported();

  // Empty state shows the SAME editor chrome (header + tool rail) as the
  // loaded state below, rather than a bare upload box, so the tool doesn't
  // visually "jump" once a video lands — only the preview/panel content
  // swaps in. The canvas, playback loop, and every panel that reads
  // selectedClip/selectedSource stay gated behind mainClips.length (via the
  // early return this replaces used to be) because those still assume a
  // real clip exists; the rail is clickable here purely to preview each
  // category's empty-state copy, not to operate on anything yet.
  if (!mainClips.length) {
    const activeCategoryMeta = RAIL_CATEGORIES.find((c) => c.id === activeCategory);
    return (
      <div className="ve-shell" style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', flexShrink: 0 }}>🎬 Video Editor</span>
          </div>
        </div>

        {restorePrompt && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 16px', background: '#1E293B', borderBottom: '1px solid #334155' }}>
            <div style={{ color: '#E2E8F0', fontSize: '0.78rem' }}>
              <strong>We found a previous project</strong> that wasn't finished — auto-saved {formatRelativeSavedAt(restorePrompt.savedAt)}. Restore it?
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={handleRestoreProject} style={{ ...smallBtn, background: T.accentGradient, color: 'white', border: 'none' }}>Restore project</button>
              <button onClick={handleDiscardRestoredProject} style={{ ...smallBtn, background: 'transparent', color: '#94A3B8', border: '1px solid #475569' }}>Discard</button>
            </div>
          </div>
        )}

        <div className="ve-body">
          <div className="ve-rail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#0F172A', borderRight: '1px solid #1E293B', flexShrink: 0, overflowX: 'auto' }}>
            {RAIL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                title={c.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56, padding: '7px 2px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: T.font,
                  background: activeCategory === c.id ? T.accentGradient : 'transparent',
                  color: activeCategory === c.id ? 'white' : '#94A3B8',
                }}
              >
                <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{c.icon}</span>
                <span style={{ fontSize: '0.56rem', fontWeight: 700 }}>{c.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: 16, background: '#F8FAFC' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Left: preview area — the drop box stands in for the canvas until a video exists */}
              <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 440 }}>
                <UploadBox
                  accept="video/*"
                  multiple
                  onFiles={handleMainFiles}
                  maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
                  label="Click to choose one or more videos to start editing, or drag them here"
                  oversizedHint={<>Use <Link href="/compress-video" style={{ color: T.accentDark, fontWeight: 700 }}>Compress &amp; Split Video</Link> to shrink or cut it down first.</>}
                />
                {uploadError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {uploadError}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                </div>
                <UploadBox
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onFiles={handleMainImageFiles}
                  maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)}
                  compact
                  compactLabel="🖼️ Rapid Slideshow — Add Images"
                />
                <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
                  Trim, cut, and reorder clips — or add a second video or image overlay for split-screen or picture-in-picture composition.{' '}
                  Need to record your screen first? Use{' '}
                  <Link href="/screen-recorder" style={{ color: T.accentDark, fontWeight: 700, textDecoration: 'none' }}>Screen Recorder</Link>
                  {' '}— your finished recording opens straight back here.
                </p>
              </div>

              {/* Right: preview of the selected rail category, before it has anything to operate on */}
              <div style={{ flex: '1 1 260px', minWidth: 260 }}>
                <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {activeCategoryMeta?.icon} {activeCategoryMeta?.label}
                  </div>
                  <p style={{ fontSize: '0.76rem', color: T.muted, textAlign: 'center', padding: '20px 8px', margin: 0 }}>
                    {EMPTY_CATEGORY_COPY[activeCategory] || 'Upload a video on the left to get started.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .ve-body { display: flex; }
          @media (max-width: 720px) {
            .ve-body { flex-direction: column; }
            .ve-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #1E293B; }
          }
        `}</style>
      </div>
    );
  }

  const activeMainSource = mainClips[0] ? timeline.sources.find((s) => s.id === mainClips[0].sourceId) : null;

  return (
    <div className="ve-shell" style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
      {/* ---- Header: dark editor chrome, wraps the whole tool ---- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', flexShrink: 0 }}>🎬 Video Editor</span>
          {activeMainSource && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {activeMainSource.file.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setExportPanelOpen((v) => !v)}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: exportPanelOpen ? 'white' : T.accentGradient, color: exportPanelOpen ? T.accentDark : 'white', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', fontFamily: T.font }}
          >
            ⬇ Export
          </button>
        </div>
      </div>

      <div className="ve-body">
        {/* ---- Left icon rail: switches which tool panel is docked on the right.
            Vertical sidebar on desktop; a horizontally-scrollable strip ABOVE
            the content on narrow viewports (see the .ve-rail media query
            below) rather than trying to squeeze a sidebar into 390px. ---- */}
        <div className="ve-rail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#0F172A', borderRight: '1px solid #1E293B', flexShrink: 0, overflowX: 'auto' }}>
          {RAIL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              title={c.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56, padding: '7px 2px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: T.font,
                background: activeCategory === c.id ? T.accentGradient : 'transparent',
                color: activeCategory === c.id ? 'white' : '#94A3B8',
              }}
            >
              <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{c.icon}</span>
              <span style={{ fontSize: '0.56rem', fontWeight: 700 }}>{c.label}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: 16, background: '#F8FAFC' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: preview, playback, timeline strips */}
        <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 440 }}>
          {/* maxHeight (not just maxWidth) keeps a Vertical (9:16) frame from
              blowing up the whole layout's height — the canvas scales down
              to whichever of width/height is more restrictive, the same way
              object-fit: contain would, so Landscape/Square/Vertical all fit
              the same on-screen budget instead of Vertical alone towering
              over everything else. */}
          <div
            ref={previewWrapRef}
            style={{
              background: '#0F172A', borderRadius: isFullscreenPreview ? 0 : 10, overflow: 'hidden', marginBottom: 8, position: 'relative',
              maxHeight: isFullscreenPreview ? '100vh' : 'clamp(220px, 46vh, 460px)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}
          >
            <button
              onClick={toggleFullscreenPreview}
              title={isFullscreenPreview ? 'Exit fullscreen' : 'Fullscreen preview — see exactly what your export will look like'}
              style={{
                position: 'absolute', top: 8, right: 8, zIndex: 5, padding: '6px 9px', borderRadius: 6, border: 'none',
                background: 'rgba(15,23,42,0.7)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, fontFamily: T.font,
              }}
            >
              {isFullscreenPreview ? '⤢ Exit' : '⛶ Fullscreen'}
            </button>
            <canvas
              ref={canvasRef}
              width={composeW}
              height={composeH}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              onPointerCancel={handleOverlayPointerUp}
              style={{
                maxWidth: '100%', maxHeight: isFullscreenPreview ? '100vh' : 'clamp(220px, 46vh, 460px)', width: 'auto', height: 'auto', display: 'block',
                touchAction: (overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0 || timeline.imageOverlays.length > 0 || (timeline.captionsEnabled && captionEvents.length > 0)) ? 'none' : 'auto',
                cursor: (overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0 || timeline.imageOverlays.length > 0 || (timeline.captionsEnabled && captionEvents.length > 0)) ? (isDraggingOverlay ? 'grabbing' : 'grab') : 'default',
              }}
            />
            <video ref={mainVideoRef} muted playsInline style={{ display: 'none' }} />
            <video ref={mainCrossfadeVideoRef} muted playsInline style={{ display: 'none' }} />
            {overlayTracks.map((track) => (
              <Fragment key={track.id}>
                <video ref={(el) => { getOverlayLayerState(track.id).videoEl = el; }} muted playsInline style={{ display: 'none' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={(el) => { getOverlayLayerState(track.id).imageEl = el; }} alt="" style={{ display: 'none' }} />
              </Fragment>
            ))}
          </div>
          {(overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0 || timeline.imageOverlays.length > 0 || (timeline.captionsEnabled && captionEvents.length > 0)) && (
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '0 0 8px', textAlign: 'center' }}>
              Drag an overlay, logo, text layer, or caption directly on the preview to reposition it — drag a caption&apos;s side handles to resize its text box.
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={handleTogglePlay} style={playBtn}>{playing ? '⏸' : '▶'}</button>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="range" min={0} max={totalDuration || 0.01} step={0.05} value={playhead}
                onChange={(e) => { setPlaying(false); setPlayhead(parseFloat(e.target.value)); }}
                style={{ width: '100%' }}
              />
              {timeline.markers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => { setPlaying(false); setPlayhead(m.time); }}
                  title={`${m.label} — ${formatDuration(m.time)}`}
                  style={{
                    position: 'absolute', top: -2, left: `${totalDuration ? (m.time / totalDuration) * 100 : 0}%`,
                    width: 2, height: 8, background: T.accentDark, cursor: 'pointer', pointerEvents: 'auto',
                  }}
                />
              ))}
            </div>
            <button onClick={() => commit((tl) => addMarker(tl, playhead))} style={{ ...smallBtn, padding: '6px 9px', flexShrink: 0 }} title="Add marker at playhead (M)">
              🚩
            </button>
            <span style={{ fontSize: '0.72rem', color: T.mutedDark, minWidth: 92, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatDurationPrecise(playhead)} / {formatDuration(totalDuration)}
            </span>
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.mutedDark }} title="Speeds up or slows down scrubbing/playback here in the editor only — every clip and every audio track together, temporarily. It is NOT saved and does NOT change what gets exported.">Scrub preview speed (not exported)</span>
            {PREVIEW_SPEED_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => handlePreviewSpeed(r)}
                style={{
                  ...smallBtn, padding: '4px 9px', fontSize: '0.7rem',
                  background: previewRate === r ? T.accentGradient : 'white',
                  color: previewRate === r ? 'white' : T.inkSecondary,
                  border: previewRate === r ? 'none' : `1px solid ${T.border}`,
                }}
                title={`Play the editor's preview at ${r}× — for reviewing footage while you find a split point. Applies to every clip and audio track at once, temporarily, and doesn't change any clip's actual duration or export speed.`}
              >
                {r}×
              </button>
            ))}
          </div>
          {selectedClip && selectedClip.track === MAIN_TRACK && selectedSource?.kind !== 'image' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.66rem', color: T.mutedDark }}>
                Want THIS clip to actually play faster or slower in the exported video (independent of the others)?
              </span>
              <button
                onClick={() => setActiveCategory('effects')}
                style={{ ...smallBtn, padding: '4px 9px', fontSize: '0.68rem', background: activeCategory === 'effects' ? T.accentGradient : 'white', color: activeCategory === 'effects' ? 'white' : T.inkSecondary, border: activeCategory === 'effects' ? 'none' : `1px solid ${T.border}` }}
              >
                ⚡ Set this clip's speed ({selectedClip.speed}×)
              </button>
            </div>
          )}

          {timeline.markers.length > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {timeline.markers.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => { setPlaying(false); setPlayhead(m.time); }} style={{ ...smallBtn, padding: '4px 8px', fontSize: '0.68rem', flexShrink: 0 }}>
                    {formatDuration(m.time)}
                  </button>
                  <select value={m.label} onChange={(e) => commit((tl) => updateMarker(tl, m.id, { label: e.target.value }))} style={{ ...numInput, flex: 1, width: 'auto' }}>
                    {MARKER_LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    {!MARKER_LABEL_OPTIONS.includes(m.label) && <option value={m.label}>{m.label}</option>}
                  </select>
                  <button onClick={() => commit((tl) => deleteMarker(tl, m.id))} style={{ ...smallBtn, padding: '4px 8px', color: '#DC2626', borderColor: '#FCA5A5', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Main track timeline */}
          <div style={{ marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink }}>Main track</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTimelineZoom((z) => Math.max(1, z - 0.5))} disabled={timelineZoom <= 1} style={{ ...smallBtn, padding: '5px 8px' }} title="Zoom out">−</button>
              <span style={{ fontSize: '0.64rem', color: T.mutedDark, alignSelf: 'center', minWidth: 30, textAlign: 'center' }}>{Math.round(timelineZoom * 100)}%</span>
              <button onClick={() => setTimelineZoom((z) => Math.min(5, z + 0.5))} disabled={timelineZoom >= 5} style={{ ...smallBtn, padding: '5px 8px' }} title="Zoom in">+</button>
              <button onClick={undo} disabled={!past.length} style={smallBtn}>↶ Undo</button>
              <button onClick={redo} disabled={!future.length} style={smallBtn}>↷ Redo</button>
            </div>
          </div>
          {/* Main + overlay track strips share one scroll container so they
              stay horizontally aligned with each other while zoomed/scrolled
              — zoom is a width multiplier on this inner div, not a fixed
              px-per-second, so 100% still exactly fits the panel like before
              this existed (see mainTrackRef's own comment above). */}
          <div style={{ overflowX: timelineZoom > 1 ? 'auto' : 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${timelineZoom * 100}%`, minWidth: '100%', position: 'relative' }}>
              <div ref={mainTrackRef} onClick={clearSelectionIfEmptyClick} style={{ position: 'relative', height: 46 }}>
              {mainClips.map((clip) => {
                const source = timeline.sources.find((s) => s.id === clip.sourceId);
                const isPrimary = clip.id === selectedClipId;
                const isSelected = selectionIdSet.has(clip.id);
                const isDragging = clipDragVisual?.clipId === clip.id;
                const leftPct = totalDuration ? (clip.start / totalDuration) * 100 : 0;
                const widthPct = totalDuration ? (clipDuration(clip) / totalDuration) * 100 : 100;
                return (
                  <div
                    key={clip.id}
                    onPointerDown={(e) => handleClipBodyPointerDown(e, clip)}
                    onClick={(e) => handleClipClick(e, clip)}
                    style={{
                      position: 'absolute', top: 0, left: `calc(${leftPct}% + 1px)`, width: `calc(max(24px, ${widthPct}%) - 2px)`,
                      height: 46, borderRadius: 7, cursor: 'grab',
                      background: isSelected ? T.accentGradient : T.accentTint,
                      border: isPrimary ? `2px solid ${T.accentDark}` : isSelected ? `2px solid ${T.accentDark}90` : `1px solid ${T.border}`,
                      boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.35)' : isSelected && !isPrimary ? `inset 0 0 0 1px white` : 'none',
                      overflow: 'hidden',
                      transform: isDragging ? `translateX(${clipDragVisual.offsetPx}px)` : 'none',
                      zIndex: isDragging ? 20 : 1,
                    }}
                    title={`${source?.kind === 'image' ? formatDurationPrecise(clipDuration(clip)) : formatDuration(clipDuration(clip))} on the timeline — source ${formatDuration(clip.sourceStart)}–${formatDuration(clip.sourceEnd)} of ${source?.file.name || 'this file'}. Click to select and drop the edit cursor there, drag the clip's body to reorder it on the timeline (Ctrl/Cmd-click to multi-select, Shift-click for a range), drag the side handles to trim`}
                  >
                    <ClipThumbFilmstrip source={source} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} thumbnailsBySource={thumbnailsBySource} />
                    <ClipWaveform source={source} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} waveformBySource={waveformBySource} />
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.62rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                      padding: '2px 4px', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden',
                    }}>
                      {source?.kind === 'image' ? formatDurationPrecise(clipDuration(clip)) : formatDuration(clipDuration(clip))}{clip.speed !== 1 ? ` · ${clip.speed}×` : ''}
                      {source?.kind !== 'image' && (
                        <span style={{ fontWeight: 500, opacity: 0.85 }}> · src {formatDuration(clip.sourceStart)}–{formatDuration(clip.sourceEnd)}</span>
                      )}
                    </div>
                    {isSelected && !isPrimary && (
                      <div style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: 'white', color: T.accentDark, fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>✓</div>
                    )}
                    {isPrimary && (
                      <>
                        <div
                          onPointerDown={(e) => handleTrimHandleDown(e, clip, 'start')}
                          title="Drag to trim the start (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                          style={trimHandleStyle('left', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'start')}
                        />
                        <div
                          onPointerDown={(e) => handleTrimHandleDown(e, clip, 'end')}
                          title="Drag to trim the end (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                          style={trimHandleStyle('right', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'end')}
                        />
                        {editCursorClipId === clip.id && (
                          // The edit cursor — where Split actually cuts. Lives
                          // ON this clip specifically (positioned as a % of
                          // ITS OWN span, not the whole timeline), separate
                          // from the round Play button's own playhead/slider.
                          <div
                            onPointerDown={(e) => handleEditCursorPointerDown(e, clip)}
                            title="Drag to choose exactly where Split cuts this clip"
                            style={{
                              position: 'absolute', top: -6, bottom: -6,
                              left: `calc(${Math.min(100, Math.max(0, ((playhead - clip.start) / (clipDuration(clip) || 1)) * 100))}% - 7px)`,
                              width: 14, zIndex: 6, cursor: 'ew-resize',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', touchAction: 'none',
                            }}
                          >
                            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #DC2626', flexShrink: 0 }} />
                            <div style={{ width: 2, flex: 1, background: '#DC2626' }} />
                            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid #DC2626', flexShrink: 0 }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              </div>

              {audioTrackClips.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink }} title="Every main-track video clip's own audio, broken out onto its own track. Split, trim, move, and delete it independently of the video — editing it directly here (rather than through its video clip) makes it independent going forward.">🔊 Audio track</h3>
                    <button
                      onClick={() => commit((tl) => setSoundTrackFlags(tl, audioTrack.id, { muted: !audioTrack.muted }))}
                      title={audioTrack.muted ? 'Unmute this audio track' : 'Mute this audio track'}
                      style={{ ...trackFlagBtn, background: audioTrack.muted ? '#DC2626' : 'white', color: audioTrack.muted ? 'white' : T.inkSecondary, borderColor: audioTrack.muted ? '#DC2626' : T.border }}
                    >
                      {audioTrack.muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                  <div onClick={clearSelectionIfEmptyClick} style={{ position: 'relative', height: 40, opacity: audioTrack.muted ? 0.5 : 1 }}>
                    {audioTrackClips.map((clip) => {
                      const source = timeline.sources.find((s) => s.id === clip.sourceId);
                      const isPrimary = clip.id === selectedClipId;
                      const isSelected = selectionIdSet.has(clip.id);
                      const isDragging = clipDragVisual?.clipId === clip.id;
                      const leftPct = totalDuration ? (clip.start / totalDuration) * 100 : 0;
                      const widthPct = totalDuration ? (clipDuration(clip) / totalDuration) * 100 : 100;
                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => handleClipBodyPointerDown(e, clip)}
                          onClick={(e) => handleClipClick(e, clip)}
                          style={{
                            position: 'absolute', top: 0, left: `calc(${leftPct}% + 1px)`, width: `calc(max(24px, ${widthPct}%) - 2px)`,
                            height: 40, borderRadius: 7, cursor: 'grab',
                            background: isSelected ? '#7C3AED' : '#EDE9FE',
                            border: isPrimary ? '2px solid #6D28D9' : isSelected ? '2px solid #6D28D990' : `1px solid ${T.border}`,
                            boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.35)' : isSelected && !isPrimary ? 'inset 0 0 0 1px white' : 'none',
                            overflow: 'hidden',
                            transform: isDragging ? `translateX(${clipDragVisual.offsetPx}px)` : 'none',
                            zIndex: isDragging ? 20 : 1,
                          }}
                          title={`${formatDuration(clipDuration(clip))} of audio — source ${formatDuration(clip.sourceStart)}–${formatDuration(clip.sourceEnd)} of ${source?.file.name || 'this file'}. ${clip.linkedVideoClipId ? 'Linked to its video clip — trimming/splitting/moving/deleting the video does this too; edit it directly here to make it independent.' : 'Independent — no longer follows its original video clip.'} Click to select and drop the edit cursor, drag to reorder, drag the side handles (when selected) to trim.`}
                        >
                          <ClipWaveform source={source} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} waveformBySource={waveformBySource} />
                          <div style={{
                            position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                            padding: '2px 4px', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden',
                          }}>
                            {formatDuration(clipDuration(clip))}{clip.linkedVideoClipId ? ' 🔗' : ''}
                          </div>
                          {isSelected && !isPrimary && (
                            <div style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: 'white', color: '#6D28D9', fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>✓</div>
                          )}
                          {isPrimary && (
                            <>
                              <div
                                onPointerDown={(e) => handleTrimHandleDown(e, clip, 'start')}
                                title="Drag to trim the start (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                style={trimHandleStyle('left', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'start')}
                              />
                              <div
                                onPointerDown={(e) => handleTrimHandleDown(e, clip, 'end')}
                                title="Drag to trim the end (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                style={trimHandleStyle('right', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'end')}
                              />
                              {editCursorClipId === clip.id && (
                                <div
                                  onPointerDown={(e) => handleEditCursorPointerDown(e, clip)}
                                  title="Drag to choose exactly where Split cuts this clip"
                                  style={{
                                    position: 'absolute', top: -6, bottom: -6,
                                    left: `calc(${Math.min(100, Math.max(0, ((playhead - clip.start) / (clipDuration(clip) || 1)) * 100))}% - 7px)`,
                                    width: 14, zIndex: 6, cursor: 'ew-resize',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', touchAction: 'none',
                                  }}
                                >
                                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #DC2626', flexShrink: 0 }} />
                                  <div style={{ width: 2, flex: 1, background: '#DC2626' }} />
                                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid #DC2626', flexShrink: 0 }} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {projectAudioTrack && projectAudioClips.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="The independent Audio Track bed — e.g. audio used to replace this video's original sound, or a plain background-music track. Click a piece to select it, then Split/Delete/drag it exactly like any other clip.">
                      🎼 Audio Track
                    </h3>
                    <button
                      onClick={() => commit((tl) => setSoundTrackFlags(tl, projectAudioTrack.id, { muted: !projectAudioTrack.muted }))}
                      title={projectAudioTrack.muted ? 'Unmute the Audio Track' : 'Mute the Audio Track'}
                      style={{ ...trackFlagBtn, background: projectAudioTrack.muted ? '#DC2626' : 'white', color: projectAudioTrack.muted ? 'white' : T.inkSecondary, borderColor: projectAudioTrack.muted ? '#DC2626' : T.border }}
                    >
                      {projectAudioTrack.muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                  <div onClick={clearSelectionIfEmptyClick} style={{ position: 'relative', height: 40, opacity: projectAudioTrack.muted ? 0.5 : 1 }}>
                    {projectAudioClips.map((clip) => {
                      const clipSource = timeline.sources.find((s) => s.id === clip.sourceId);
                      const isPrimary = clip.id === selectedClipId;
                      const isSelected = selectionIdSet.has(clip.id);
                      const isDragging = clipDragVisual?.clipId === clip.id;
                      const leftPct = totalDuration ? (clip.start / totalDuration) * 100 : 0;
                      const widthPct = totalDuration ? (clipDuration(clip) / totalDuration) * 100 : 100;
                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => handleClipBodyPointerDown(e, clip)}
                          onClick={(e) => handleClipClick(e, clip)}
                          style={{
                            position: 'absolute', top: 0, left: `calc(${leftPct}% + 1px)`, width: `calc(max(24px, ${widthPct}%) - 2px)`,
                            height: 40, borderRadius: 7, cursor: 'grab',
                            background: isSelected ? '#F59E0B' : '#FEF3C7',
                            border: isPrimary ? '2px solid #B45309' : isSelected ? '2px solid #B4530990' : `1px solid ${T.border}`,
                            boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.35)' : isSelected && !isPrimary ? 'inset 0 0 0 1px white' : 'none',
                            overflow: 'hidden',
                            transform: isDragging ? `translateX(${clipDragVisual.offsetPx}px)` : 'none',
                            zIndex: isDragging ? 20 : 1,
                          }}
                          title={`${formatDuration(clipDuration(clip))} of audio — source ${formatDuration(clip.sourceStart)}–${formatDuration(clip.sourceEnd)} of ${clipSource?.file.name || 'this file'}. Click to select and drop the edit cursor, drag to reposition, drag the side handles (when selected) to trim.`}
                        >
                          <ClipWaveform source={clipSource} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} waveformBySource={waveformBySource} />
                          <div style={{
                            position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: T.ink, textShadow: '0 1px 2px rgba(255,255,255,0.7)',
                            padding: '2px 4px', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden',
                          }}>
                            {formatDuration(clipDuration(clip))}
                          </div>
                          {isSelected && !isPrimary && (
                            <div style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: 'white', color: '#B45309', fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>✓</div>
                          )}
                          {isPrimary && (
                            <>
                              <div
                                onPointerDown={(e) => handleTrimHandleDown(e, clip, 'start')}
                                title="Drag to trim the start (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                style={trimHandleStyle('left', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'start')}
                              />
                              <div
                                onPointerDown={(e) => handleTrimHandleDown(e, clip, 'end')}
                                title="Drag to trim the end (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                style={trimHandleStyle('right', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'end')}
                              />
                              {editCursorClipId === clip.id && (
                                <div
                                  onPointerDown={(e) => handleEditCursorPointerDown(e, clip)}
                                  title="Drag to choose exactly where Split cuts this clip"
                                  style={{
                                    position: 'absolute', top: -6, bottom: -6,
                                    left: `calc(${Math.min(100, Math.max(0, ((playhead - clip.start) / (clipDuration(clip) || 1)) * 100))}% - 7px)`,
                                    width: 14, zIndex: 6, cursor: 'ew-resize',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', touchAction: 'none',
                                  }}
                                >
                                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #DC2626', flexShrink: 0 }} />
                                  <div style={{ width: 2, flex: 1, background: '#DC2626' }} />
                                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid #DC2626', flexShrink: 0 }} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {extraSoundTracks.map((track, ti) => {
                const trackClips = getTrackClips(timeline, track.id);
                if (!trackClips.length) return null;
                const source = timeline.sources.find((s) => s.id === trackClips[0].sourceId);
                return (
                  <div key={track.id} style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="An independent sound clip (background music, sound effects, or extra narration) — drag to move it, drag its side handles to trim, or manage volume/mute/remove from the Audio tab.">
                        🎵 {source?.file.name || `Sound clip ${ti + 1}`}
                      </h3>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => commit((tl) => setSoundTrackFlags(tl, track.id, { muted: !track.muted }))}
                          title={track.muted ? 'Unmute this sound clip' : 'Mute this sound clip'}
                          style={{ ...trackFlagBtn, background: track.muted ? '#DC2626' : 'white', color: track.muted ? 'white' : T.inkSecondary, borderColor: track.muted ? '#DC2626' : T.border }}
                        >
                          {track.muted ? '🔇' : '🔊'}
                        </button>
                        <button onClick={() => handleRemoveSoundTrack(track.id)} style={{ ...trackFlagBtn, color: '#DC2626', borderColor: '#FCA5A5' }} title="Remove this sound clip">🗑</button>
                      </div>
                    </div>
                    <div onClick={clearSelectionIfEmptyClick} style={{ position: 'relative', height: 40, opacity: track.muted ? 0.5 : 1 }}>
                      {trackClips.map((clip) => {
                        const clipSource = timeline.sources.find((s) => s.id === clip.sourceId);
                        const isPrimary = clip.id === selectedClipId;
                        const isSelected = selectionIdSet.has(clip.id);
                        const isDragging = clipDragVisual?.clipId === clip.id;
                        const leftPct = totalDuration ? (clip.start / totalDuration) * 100 : 0;
                        const widthPct = totalDuration ? (clipDuration(clip) / totalDuration) * 100 : 100;
                        return (
                          <div
                            key={clip.id}
                            onPointerDown={(e) => handleClipBodyPointerDown(e, clip)}
                            onClick={(e) => handleClipClick(e, clip)}
                            style={{
                              position: 'absolute', top: 0, left: `calc(${leftPct}% + 1px)`, width: `calc(max(24px, ${widthPct}%) - 2px)`,
                              height: 40, borderRadius: 7, cursor: 'grab',
                              background: isSelected ? '#0891B2' : '#CFFAFE',
                              border: isPrimary ? '2px solid #0E7490' : isSelected ? '2px solid #0E749090' : `1px solid ${T.border}`,
                              boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.35)' : isSelected && !isPrimary ? 'inset 0 0 0 1px white' : 'none',
                              overflow: 'hidden',
                              transform: isDragging ? `translateX(${clipDragVisual.offsetPx}px)` : 'none',
                              zIndex: isDragging ? 20 : 1,
                            }}
                            title={`${formatDuration(clipDuration(clip))} of audio — source ${formatDuration(clip.sourceStart)}–${formatDuration(clip.sourceEnd)} of ${clipSource?.file.name || 'this file'}. Click to select and drop the edit cursor, drag to reposition, drag the side handles (when selected) to trim.`}
                          >
                            <ClipWaveform source={clipSource} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} waveformBySource={waveformBySource} />
                            <div style={{
                              position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                              padding: '2px 4px', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden',
                            }}>
                              {formatDuration(clipDuration(clip))}
                            </div>
                            {isSelected && !isPrimary && (
                              <div style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: 'white', color: '#0E7490', fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>✓</div>
                            )}
                            {isPrimary && (
                              <>
                                <div
                                  onPointerDown={(e) => handleTrimHandleDown(e, clip, 'start')}
                                  title="Drag to trim the start (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                  style={trimHandleStyle('left', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'start')}
                                />
                                <div
                                  onPointerDown={(e) => handleTrimHandleDown(e, clip, 'end')}
                                  title="Drag to trim the end (snaps to the playhead, other clip edges, and markers — hold Alt to bypass)"
                                  style={trimHandleStyle('right', snappedHandle?.clipId === clip.id && snappedHandle?.edge === 'end')}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {overlayTracks.map((track, ti) => {
                const trackClips = getTrackClips(timeline, track.id);
                if (!trackClips.length) return null;
                return (
                  <div key={track.id} style={{ marginTop: ti > 0 ? 8 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink }}>Overlay track {ti + 1}</h3>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => commit((tl) => setOverlayTrackFlags(tl, track.id, { muted: !track.muted }))} title={track.muted ? 'Unmute audio' : 'Mute audio'}
                          style={{ ...trackFlagBtn, background: track.muted ? '#DC2626' : 'white', color: track.muted ? 'white' : T.inkSecondary, borderColor: track.muted ? '#DC2626' : T.border }}>
                          {track.muted ? '🔇' : '🔊'}
                        </button>
                        <button onClick={() => commit((tl) => setOverlayTrackFlags(tl, track.id, { solo: !track.solo }))} title={track.solo ? 'Unsolo' : 'Solo this track\'s audio'}
                          style={{ ...trackFlagBtn, background: track.solo ? T.accentGradient : 'white', color: track.solo ? 'white' : T.inkSecondary, border: track.solo ? 'none' : `1px solid ${T.border}` }}>
                          S
                        </button>
                        <button onClick={() => commit((tl) => setOverlayTrackFlags(tl, track.id, { hidden: !track.hidden }))} title={track.hidden ? 'Show in preview/export' : 'Hide from preview/export'}
                          style={{ ...trackFlagBtn, background: track.hidden ? '#94A3B8' : 'white', color: track.hidden ? 'white' : T.inkSecondary, borderColor: track.hidden ? '#94A3B8' : T.border }}>
                          {track.hidden ? '🙈' : '👁'}
                        </button>
                        <button onClick={() => commit((tl) => setOverlayTrackFlags(tl, track.id, { locked: !track.locked }))} title={track.locked ? 'Unlock' : 'Lock (prevent edits)'}
                          style={{ ...trackFlagBtn, background: track.locked ? '#B45309' : 'white', color: track.locked ? 'white' : T.inkSecondary, borderColor: track.locked ? '#B45309' : T.border }}>
                          {track.locked ? '🔒' : '🔓'}
                        </button>
                      </div>
                    </div>
                    <div onClick={clearSelectionIfEmptyClick} style={{ display: 'flex', gap: 3, minHeight: 32, opacity: track.hidden ? 0.5 : 1 }}>
                      {trackClips.map((clip) => {
                        const clipSource = timeline.sources.find((s) => s.id === clip.sourceId);
                        const isImage = clipSource?.kind === 'image';
                        const isOverlayPrimary = clip.id === selectedClipId;
                        return (
                          <div
                            key={clip.id}
                            onClick={(e) => handleClipClick(e, clip, track.id)}
                            style={{
                              position: 'relative',
                              flex: isImage ? 1 : (clipDuration(clip) || 1), minWidth: 40, height: 32, borderRadius: 7, cursor: 'pointer',
                              background: clip.id === selectedClipId ? T.accentGradient : '#F1F5F9',
                              border: clip.id === selectedClipId ? `2px solid ${T.accentDark}` : `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.64rem', fontWeight: 700, color: clip.id === selectedClipId ? 'white' : T.inkSecondary,
                            }}
                            title="Click to select and drop the edit cursor there — the same click-to-position-then-Split workflow as the Main track above"
                          >
                            {isImage ? '🖼 Image' : formatDuration(clipDuration(clip))}
                            {isOverlayPrimary && !isImage && editCursorClipId === clip.id && (
                              <div
                                onPointerDown={(e) => handleEditCursorPointerDown(e, clip)}
                                title="Drag to choose exactly where Split cuts this clip"
                                style={{
                                  position: 'absolute', top: -4, bottom: -4,
                                  left: `calc(${Math.min(100, Math.max(0, ((playhead - clip.start) / (clipDuration(clip) || 1)) * 100))}% - 6px)`,
                                  width: 12, zIndex: 6, cursor: 'ew-resize', background: 'transparent',
                                }}
                              >
                                <div style={{ position: 'absolute', left: 5, top: 0, bottom: 0, width: 2, background: '#DC2626' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* The always-on playhead — tracks `playhead` directly (the same
                  value driving preview/export) so it moves continuously during
                  playback and dragging instead of only showing up once a clip
                  is selected, like the per-clip edit-cursor above does. The
                  time badge riding on it is what replaces the old "Project: X
                  | Source: Y" text that used to sit up by the play button,
                  disconnected from the actual timeline you split on. */}
              {totalDuration > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${Math.min(100, Math.max(0, (playhead / totalDuration) * 100))}%`,
                    zIndex: 15, pointerEvents: 'none',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: -1, width: 2, background: '#DC2626' }} />
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, transform: 'translateX(-50%)',
                      marginTop: 3, fontSize: '0.68rem', fontWeight: 700, color: T.ink, fontFamily: 'monospace',
                      background: 'white', border: `1px solid ${T.border}`, borderRadius: 5,
                      padding: '1px 6px', whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDurationPrecise(playhead)}{playheadMainHit && timeline.sources.find((s) => s.id === playheadMainHit.clip.sourceId)?.kind !== 'image' ? ` · src ${formatDurationPrecise(playheadMainHit.sourceTime)}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
          {selectedClip && !isLockedSelected && selectionIds.length <= 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={handleSplitAtCursor} disabled={editCursorClipId !== selectedClip.id} style={{ ...quickActionBtn, opacity: editCursorClipId !== selectedClip.id ? 0.5 : 1 }} title={editCursorClipId === selectedClip.id ? 'Cuts the selected clip in two at the edit cursor' : 'Click the clip to drop an edit cursor first'}>
                <span style={{ fontSize: '1.1rem' }}>✂</span> Split
              </button>
              <button onClick={handleDeleteSelected} style={{ ...quickActionBtn, color: '#DC2626', borderColor: '#FCA5A5' }} title="Removes the selected clip; everything after it slides over to close the gap">
                <span style={{ fontSize: '1.1rem' }}>🗑</span> Delete
              </button>
            </div>
          )}
        </div>

        {/* Right: persistent tool panel — always rendered, not hidden behind a click */}
        <div style={{ flex: '1 1 300px', minWidth: 280, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 2 }}>
          {/* Clip — identity/selection summary, always visible regardless of
              which rail category is active (multi-select and locked-track
              are states that block editing outright, so their own actions
              stay reachable no matter what's selected on the left rail;
              a single selected clip's actual editing controls live in the
              Edit/Audio/Effects category panels below instead). */}
          <div style={{ background: T.accentTint, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Clip</div>
            {selectionIds.length > 1 ? (
              <>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                  {selectionIds.length} clips selected
                </div>
                <p style={{ fontSize: '0.7rem', color: T.mutedDark, margin: '0 0 8px' }}>Ctrl/Cmd-click to add or remove a clip, Shift-click for a range, or click empty timeline space to clear.</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={handleDuplicateMultiSelected} style={smallBtn}>⧉ Duplicate selected</button>
                  <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete selected</button>
                  <button onClick={() => setExtraSelectedClipIds([])} style={smallBtn}>Clear selection</button>
                </div>
                {selectionIds.some((id) => {
                  const c = timeline.clips.find((cl) => cl.id === id);
                  return c?.track === MAIN_TRACK && timeline.sources.find((s) => s.id === c.sourceId)?.kind === 'image';
                }) && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: '0.64rem', color: T.muted, marginBottom: 4 }}>Set duration for the selected images:</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {IMAGE_DURATION_PRESETS.map((d) => (
                        <button key={d} onClick={() => handleSetSelectedImageDurations(d)} style={{ ...smallBtn, padding: '4px 9px', fontSize: '0.66rem' }}>{d}s</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedClip && selectedSource && isLockedSelected ? (
              <>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: T.ink, marginBottom: 8, wordBreak: 'break-word' }}>
                  {selectedSource.file.name} <span style={{ fontWeight: 500, color: T.mutedDark }}>(overlay)</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: T.mutedDark, margin: '0 0 8px' }}>🔒 This clip&apos;s track is locked — unlock it (on the timeline track header) to trim, delete, or otherwise edit it.</p>
                <button onClick={() => commit((tl) => setOverlayTrackFlags(tl, selectedClipTrack.id, { locked: false }))} style={smallBtn}>🔓 Unlock track</button>
              </>
            ) : selectedClip && selectedSource ? (
              <>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: T.ink, marginBottom: selectedSource.kind === 'image' ? 0 : 4, wordBreak: 'break-word' }}>
                  {selectedSource.file.name} <span style={{ fontWeight: 500, color: T.mutedDark }}>({selectedClip.track === MAIN_TRACK ? 'main' : selectedClip.track === audioTrack?.id ? 'audio track' : 'overlay'}{selectedSource.kind === 'image' ? ' · image' : ''})</span>
                </div>
                {selectedSource.kind === 'image' ? (
                  <p style={{ fontSize: '0.72rem', color: T.mutedDark, margin: '4px 0 0' }}>
                    {selectedClip.track === MAIN_TRACK
                      ? 'Static image — set exactly how long it shows for under Edit, below.'
                      : 'Static image — shown for the whole overlay duration. Drag it directly on the preview to reposition it.'}
                  </p>
                ) : (
                  <p style={{ fontSize: '0.66rem', color: T.muted, margin: 0 }}>Edit for trim/split/join, Audio for volume/replace, Effects for filters/crop/rotate.</p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Click a clip on the timeline to select it, then use Edit, Audio, or Effects on the left.</p>
            )}
          </div>

          {activeCategory === 'edit' && (selectedClip && selectedSource && !isLockedSelected && selectionIds.length <= 1 ? (
            <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Edit</div>
              {gapBeforeClip(selectedClip) > 0.05 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.7rem', color: '#92400E' }}>⚠ {gapBeforeClip(selectedClip).toFixed(1)}s gap before this clip — playback pauses here instead of flowing straight through.</span>
                  <button onClick={handleCloseGapBeforeSelected} style={{ ...smallBtn, padding: '5px 10px', flexShrink: 0 }}>⇤ Close gap</button>
                </div>
              )}
              {selectedSource.kind !== 'image' ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                  <label style={fieldLabel}>Trim start
                    <input type="number" step={0.1} min={0} max={selectedSource.duration}
                      value={selectedClip.sourceStart.toFixed(2)}
                      onChange={(e) => handleTrimChange('start', e.target.value)} style={numInput} />
                  </label>
                  <label style={fieldLabel}>Trim end
                    <input type="number" step={0.1} min={0} max={selectedSource.duration}
                      value={selectedClip.sourceEnd.toFixed(2)}
                      onChange={(e) => handleTrimChange('end', e.target.value)} style={numInput} />
                  </label>
                </div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={fieldLabel}>Duration
                      <input type="number" step={0.1} min={0.1} value={clipDuration(selectedClip).toFixed(2)}
                        onChange={(e) => handleSetImageClipDuration(e.target.value)} style={numInput} />
                    </label>
                    <span style={{ fontSize: '0.66rem', color: T.muted }}>sec — any length you want</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    {IMAGE_DURATION_PRESETS.map((d) => (
                      <button key={d} onClick={() => handleSetImageClipDuration(d)}
                        style={{ ...smallBtn, padding: '4px 9px', fontSize: '0.66rem', background: Math.abs(clipDuration(selectedClip) - d) < 0.005 ? T.accentGradient : 'white', color: Math.abs(clipDuration(selectedClip) - d) < 0.005 ? 'white' : T.inkSecondary, border: Math.abs(clipDuration(selectedClip) - d) < 0.005 ? 'none' : `1px solid ${T.border}` }}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={handleSplitAtCursor} disabled={editCursorClipId !== selectedClip.id} style={{ ...smallBtn, opacity: editCursorClipId !== selectedClip.id ? 0.5 : 1 }} title={editCursorClipId === selectedClip.id ? 'Cut at the edit cursor' : 'Click the clip to drop an edit cursor first'}>✂ Split</button>
                {selectedSource.kind !== 'image' && <button onClick={() => handleJoinWithNext(selectedClip.track)} style={smallBtn}>⤵ Join with next</button>}
                {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFreezeFrame} style={smallBtn}>❄ Freeze frame</button>}
                {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFindSilence} disabled={silenceScanning} style={smallBtn}>{silenceScanning ? 'Scanning…' : '🔇 Find silence'}</button>}
                <button onClick={handleDuplicateSelected} style={smallBtn}>⧉ Duplicate</button>
                <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete clip</button>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Reorder</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={handleMoveClipToStart} disabled={selectedClipTrackIndex() <= 0} style={smallBtn} title="Move to the very start of this track">⏮ Start</button>
                  <button onClick={handleMoveClipEarlier} disabled={selectedClipTrackIndex() <= 0} style={smallBtn} title="Swap with the clip before it">◀ Earlier</button>
                  <button onClick={handleMoveClipLater} disabled={selectedClipTrackIndex() < 0 || selectedClipTrackIndex() >= getTrackClips(timeline, selectedClip.track).length - 1} style={smallBtn} title="Swap with the clip after it">▶ Later</button>
                  <button onClick={handleMoveClipToEnd} disabled={selectedClipTrackIndex() < 0 || selectedClipTrackIndex() >= getTrackClips(timeline, selectedClip.track).length - 1} style={smallBtn} title="Move to the very end of this track">⏭ End</button>
                </div>
              </div>
              <p style={{ fontSize: '0.68rem', color: T.muted, margin: '8px 0 0' }}>
                Click a clip to select it — a red edit cursor drops exactly where you clicked, the preview jumps there immediately, and pressing Play afterward resumes from that exact point instead of the start. Drag the cursor left/right to fine-tune the exact frame (the preview follows it live), then click Split. To remove part of a clip: split at both edges of the part you don&apos;t want, select that middle piece, and Delete it — everything after closes the gap automatically. Drag a clip{"'"}s body left or right to reorder it, or use the Reorder buttons above for a precise move to either end. This all works the same way for overlay clips.
              </p>
              {silenceRanges !== null && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                  {silenceRanges.length === 0 ? (
                    <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>No silent stretches of 0.4s or longer found in this clip.</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.7rem', color: T.mutedDark, margin: '0 0 6px', fontWeight: 700 }}>{silenceRanges.length} silent stretch{silenceRanges.length === 1 ? '' : 'es'} found — review before removing:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, maxHeight: 140, overflowY: 'auto' }}>
                        {silenceRanges.map((r, i) => (
                          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: T.inkSecondary }}>
                            <input type="checkbox" checked={r.selected} onChange={() => toggleSilenceRange(i)} />
                            {formatDuration(r.start)} – {formatDuration(r.end)} <span style={{ color: T.muted }}>({(r.end - r.start).toFixed(1)}s)</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleApplySilenceRemoval} disabled={!silenceRanges.some((r) => r.selected)} style={{ ...smallBtn, background: T.accentGradient, color: 'white', border: 'none' }}>Remove selected</button>
                        <button onClick={() => setSilenceRanges(null)} style={smallBtn}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.72rem', color: T.muted, textAlign: 'center', padding: '16px 0' }}>Select a single clip on the timeline to trim, split, join, freeze a frame, or find silence.</p>
          ))}

          {activeCategory === 'audio' && (selectedClip && selectedSource && !isLockedSelected && selectionIds.length <= 1 && selectedSource.kind !== 'image' && (
            <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Clip audio</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <label style={fieldLabel}>Audio
                  <select value={selectedClip.audioMode} onChange={(e) => commit((tl) => setClipAudioModeRespectingLink(tl, selectedClip, e.target.value))} style={numInput}>
                    <option value="keep">Keep</option>
                    <option value="mute">Mute</option>
                    <option value="replace">Replace…</option>
                    <option value="mix">Mix with…</option>
                  </select>
                </label>
                {(selectedClip.audioMode === 'replace' || selectedClip.audioMode === 'mix') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.mutedDark }}>
                      {selectedClipAudioSource ? selectedClipAudioSource.file.name : (selectedClip.audioMode === 'replace' ? 'Replacement audio' : 'Audio to mix in')}
                    </span>
                    <input type="file" accept="audio/*" onChange={(e) => handleReplaceAudioFile(e.target.files, selectedClip.audioMode)} style={{ fontSize: '0.7rem', maxWidth: 200 }} />
                  </div>
                )}
                {selectedClip.audioMode === 'mix' && (
                  <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 5 }} title="Automatically lowers the mixed-in audio's volume while this clip's own audio has signal (e.g. voice over music)">
                    <input type="checkbox" checked={!!selectedClip.duckBackground} onChange={(e) => commit((tl) => setClipDucking(tl, selectedClip.id, e.target.checked))} />
                    Duck background
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={fieldLabel}>Fade in
                  <input type="number" step={0.1} min={0} max={(selectedClip.sourceEnd - selectedClip.sourceStart) / 2}
                    value={selectedClip.fadeIn.toFixed(1)}
                    onChange={(e) => commit((tl) => setClipFade(tl, selectedClip.id, { fadeIn: parseFloat(e.target.value) || 0 }))} style={numInput} />
                </label>
                <label style={fieldLabel}>Fade out
                  <input type="number" step={0.1} min={0} max={(selectedClip.sourceEnd - selectedClip.sourceStart) / 2}
                    value={selectedClip.fadeOut.toFixed(1)}
                    onChange={(e) => commit((tl) => setClipFade(tl, selectedClip.id, { fadeOut: parseFloat(e.target.value) || 0 }))} style={numInput} />
                </label>
                <label style={fieldLabel}>Volume {Math.round((selectedClip.gain ?? 1) * 100)}%
                  <input type="range" min={0.1} max={3} step={0.05} value={selectedClip.gain ?? 1}
                    onChange={(e) => commit((tl) => setClipGain(tl, selectedClip.id, parseFloat(e.target.value)))} style={{ width: 90 }} />
                </label>
                <button onClick={handleNormalizeAudio} disabled={normalizing} style={smallBtn}>{normalizing ? 'Analyzing…' : '🔊 Normalize audio'}</button>
                <button onClick={handleCleanClipAudio} disabled={cleaningClipAudio} style={smallBtn} title="Reduces hum, rumble, and background hiss in this clip's audio — plain signal processing, not AI">
                  {cleaningClipAudio ? 'Cleaning…' : '🧹 Clean audio'}
                </button>
              </div>
              {clipCleanupError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {clipCleanupError}</div>}
            </div>
          ))}

          {activeCategory === 'effects' && (selectedClip && selectedSource && !isLockedSelected && selectionIds.length <= 1 ? (
            <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Effects</div>
              {selectedSource.kind !== 'image' && (() => {
                const linkedAudioForSpeed = selectedClip.track === MAIN_TRACK ? getLinkedAudioClip(timeline, selectedClip.id) : null;
                const applySpeed = (speed) => {
                  if (!linkedAudioForSpeed) { commit((tl) => setClipSpeedRespectingLink(tl, selectedClip, speed)); return; }
                  commit((tl) => {
                    if (speedApplyTarget === 'audio') return setClipSpeedRipple(tl, linkedAudioForSpeed.id, speed);
                    let next = setClipSpeedRipple(tl, selectedClip.id, speed);
                    if (speedApplyTarget === 'both') next = setClipSpeedRipple(next, linkedAudioForSpeed.id, speed);
                    return next;
                  });
                };
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 6 }}>Selected clip</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.72rem', color: T.inkSecondary, marginBottom: 8 }}>
                      <span><strong style={{ color: T.ink }}>Duration:</strong> {formatDuration(clipDuration(selectedClip))}</span>
                      <span><strong style={{ color: T.ink }}>Audio:</strong> {linkedAudioForSpeed ? 'Linked to Audio track' : selectedClip.track === MAIN_TRACK ? 'Embedded in this clip' : '—'}</span>
                    </div>
                    <div style={{ ...fieldLabel, marginBottom: 4 }} title="Independent of Scrub preview speed above — this changes the clip's actual duration and is included in the export.">
                      Speed <span style={{ fontWeight: 500, color: T.muted }}>(this clip only — affects the export)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                      {SPEED_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => applySpeed(s)}
                          style={{
                            ...smallBtn, padding: '5px 10px', fontSize: '0.7rem',
                            background: selectedClip.speed === s ? T.accentGradient : 'white',
                            color: selectedClip.speed === s ? 'white' : T.inkSecondary,
                            border: selectedClip.speed === s ? 'none' : `1px solid ${T.border}`,
                          }}
                        >
                          {Math.round(s * 100)}%
                        </button>
                      ))}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: T.inkSecondary }}>
                        <input
                          type="number" min={25} max={400} step={5}
                          value={Math.round(selectedClip.speed * 100)}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value);
                            if (Number.isFinite(pct) && pct > 0) applySpeed(pct / 100);
                          }}
                          style={{ ...numInput, width: 60 }}
                        />
                        %
                      </label>
                    </div>
                    {linkedAudioForSpeed && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Apply speed change to</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                          {[['video', 'Video only'], ['audio', 'Audio only'], ['both', 'Both']].map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setSpeedApplyTarget(id)}
                              style={{
                                ...smallBtn, padding: '4px 9px', fontSize: '0.68rem',
                                background: speedApplyTarget === id ? T.accentGradient : 'white',
                                color: speedApplyTarget === id ? 'white' : T.inkSecondary,
                                border: speedApplyTarget === id ? 'none' : `1px solid ${T.border}`,
                              }}
                              title={id === 'both' ? "Change this clip's speed and its linked audio clip's speed together, keeping them synced" : id === 'video' ? "Change only this clip's own (now-muted) video speed — its linked audio clip keeps its current speed" : "Change only the linked audio clip's speed on the Audio track — this clip's own video speed is untouched"}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.66rem', color: T.mutedDark, margin: 0 }}>
                          🔗 This clip's audio lives on its own linked clip on the Audio track — Video: <strong>{Math.round(selectedClip.speed * 100)}%</strong> · Audio: <strong>{Math.round(linkedAudioForSpeed.speed * 100)}%</strong>
                          {selectedClip.speed !== linkedAudioForSpeed.speed ? ' (currently different, on purpose or otherwise — that\'s allowed).' : '.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Filters</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                  {Object.entries(FILTER_PRESETS).map(([id, values]) => (
                    <button key={id} onClick={() => commit((tl) => setClipFilters(tl, selectedClip.id, values))} style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem' }}>
                      {id === 'none' ? 'Reset' : id[0].toUpperCase() + id.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Brightness
                    <input type="range" min={0.5} max={1.5} step={0.02} value={selectedClip.filters.brightness}
                      onChange={(e) => commit((tl) => setClipFilters(tl, selectedClip.id, { brightness: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                  </label>
                  <label style={fieldLabel}>Contrast
                    <input type="range" min={0.5} max={1.5} step={0.02} value={selectedClip.filters.contrast}
                      onChange={(e) => commit((tl) => setClipFilters(tl, selectedClip.id, { contrast: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                  </label>
                  <label style={fieldLabel}>Saturation
                    <input type="range" min={0} max={2} step={0.02} value={selectedClip.filters.saturation}
                      onChange={(e) => commit((tl) => setClipFilters(tl, selectedClip.id, { saturation: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                  </label>
                </div>
              </div>

              {selectedClip.track === MAIN_TRACK && mainClips.length > 1 && mainClips[mainClips.length - 1].id !== selectedClip.id && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Transition to next clip</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {TRANSITION_OPTIONS.map((t) => (
                      <button key={t.id} onClick={() => handleSetTransition(selectedClip, t.id)}
                        style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: selectedClip.transitionOut.type === t.id ? T.accentGradient : 'white', color: selectedClip.transitionOut.type === t.id ? 'white' : T.inkSecondary, border: selectedClip.transitionOut.type === t.id ? 'none' : `1px solid ${T.border}` }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {selectedClip.transitionOut.type !== 'cut' && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: '0.64rem', color: T.muted }}>Duration</span>
                      {TRANSITION_DURATION_PRESETS.map((d) => (
                        <button key={d} onClick={() => handleTransitionDuration(selectedClip, d)}
                          style={{ ...smallBtn, padding: '4px 9px', fontSize: '0.66rem', background: Math.abs(selectedClip.transitionOut.duration - d) < 0.01 ? T.accentGradient : 'white', color: Math.abs(selectedClip.transitionOut.duration - d) < 0.01 ? 'white' : T.inkSecondary, border: Math.abs(selectedClip.transitionOut.duration - d) < 0.01 ? 'none' : `1px solid ${T.border}` }}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedClip.transitionOut.type !== 'cut' && !BLEND_TRANSITION_TYPES.includes(selectedClip.transitionOut.type) && (
                    <p style={{ fontSize: '0.64rem', color: T.muted, margin: '4px 0 0' }}>Sets this clip's fade-out and the next clip's fade-in to match{selectedClip.transitionOut.type !== 'fade' ? ', and the composition background color' : ''}.</p>
                  )}
                  {BLEND_TRANSITION_TYPES.includes(selectedClip.transitionOut.type) && (
                    <p style={{ fontSize: '0.64rem', color: T.muted, margin: '4px 0 0' }}>Blends this clip's video directly into the next one — no fade through a color.</p>
                  )}
                </div>
              )}

              {timeline.fitMode !== 'contain' && (
                <div style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: 4 }}>Crop / pan <span style={{ fontWeight: 500, opacity: 0.8 }}>— which part stays in frame</span></div>
                    <div
                      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleCropFocusPointer(e); }}
                      onPointerMove={(e) => { if (e.buttons === 1) handleCropFocusPointer(e); }}
                      style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, border: `1px solid ${T.border}`, background: '#0F172A', cursor: 'crosshair' }}
                    >
                      <div style={{
                        position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: T.accentGradient, border: '2px solid white',
                        left: `calc(${selectedClip.cropFocus.x * 100}% - 6px)`, top: `calc(${selectedClip.cropFocus.y * 100}% - 6px)`, pointerEvents: 'none',
                      }} />
                    </div>
                  </div>
                  <label style={fieldLabel}>Zoom {(selectedClip.cropZoom ?? 1).toFixed(1)}×
                    <input type="range" min={1} max={3} step={0.1} value={selectedClip.cropZoom ?? 1}
                      onChange={(e) => commit((tl) => setClipCropZoom(tl, selectedClip.id, parseFloat(e.target.value)))} style={{ width: 90 }} />
                    <span style={{ fontSize: '0.62rem', color: T.muted, fontWeight: 500 }}>Crops in tighter — drag the pad to pan the crop.</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSource.kind !== 'image' && (
                  <button
                    onClick={() => commit((tl) => setClipReversed(tl, selectedClip.id, !selectedClip.reversed))}
                    style={{ ...smallBtn, background: selectedClip.reversed ? T.accentGradient : 'white', color: selectedClip.reversed ? 'white' : T.inkSecondary }}
                  >
                    ⏪ {selectedClip.reversed ? 'Reversed' : 'Reverse'}
                  </button>
                )}
                <button onClick={() => commit((tl) => rotateClip90(tl, selectedClip.id))} style={smallBtn} title={`Rotate 90° (currently ${selectedClip.rotation || 0}°)`}>
                  ↻ Rotate{selectedClip.rotation ? ` ${selectedClip.rotation}°` : ''}
                </button>
                <button
                  onClick={() => commit((tl) => setClipFlip(tl, selectedClip.id, { flipH: !selectedClip.flipH }))}
                  style={{ ...smallBtn, background: selectedClip.flipH ? T.accentGradient : 'white', color: selectedClip.flipH ? 'white' : T.inkSecondary }}
                >
                  ⇋ Flip H
                </button>
                <button
                  onClick={() => commit((tl) => setClipFlip(tl, selectedClip.id, { flipV: !selectedClip.flipV }))}
                  style={{ ...smallBtn, background: selectedClip.flipV ? T.accentGradient : 'white', color: selectedClip.flipV ? 'white' : T.inkSecondary }}
                >
                  ⇵ Flip V
                </button>
              </div>
              {selectedClip.reversed && (
                <p style={{ fontSize: '0.66rem', color: T.muted, margin: '6px 0 0' }}>
                  Reversed clips preview silently as a best-effort scrub — the exported video plays this clip backwards with its audio correctly reversed too.
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.72rem', color: T.muted, textAlign: 'center', padding: '16px 0' }}>Select a single clip on the timeline to adjust speed, filters, transitions, crop, or rotation.</p>
          ))}

          {activeCategory === 'media' && (<>
          {/* Media */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Media</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Main video</div>
                <UploadBox accept="video/*" multiple onFiles={handleMainFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="+ Add video(s)" oversizedHint={<>Use <Link href="/compress-video" style={{ color: T.accentDark, fontWeight: 700 }}>Compress &amp; Split Video</Link> to shrink or cut it down first.</>} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Rapid Slideshow (images added to end of main track)</div>
                <UploadBox accept="image/png,image/jpeg,image/webp" multiple onFiles={handleMainImageFiles} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel="+ Add images" />
                {(() => {
                  const mainImageClips = mainClips.filter((c) => timeline.sources.find((s) => s.id === c.sourceId)?.kind === 'image');
                  if (mainImageClips.length < 2) return null;
                  return (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.64rem', color: T.muted }}>Set all image durations:</span>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          defaultValue={DEFAULT_IMAGE_CLIP_DURATION}
                          onBlur={(e) => handleSetAllImageDurations(e.target.value)}
                          style={{ width: 56, fontSize: '0.7rem', padding: '3px 5px', borderRadius: 6, border: `1px solid ${T.border}` }}
                        />
                        <span style={{ fontSize: '0.64rem', color: T.muted }}>sec</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                        {IMAGE_DURATION_PRESETS.map((d) => (
                          <button key={d} onClick={() => handleSetAllImageDurations(d)} style={{ ...smallBtn, padding: '3px 7px', fontSize: '0.64rem' }}>{d}s</button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Video overlay (split-screen / video call)</div>
                <UploadBox accept="video/*" onFiles={handleOverlayFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="+ Add video overlay" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Need a new recording?</div>
                <Link href="/screen-recorder" style={{ ...smallBtn, width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                  🎥 Open Screen Recorder
                </Link>
                <p style={{ fontSize: '0.64rem', color: T.muted, margin: '4px 0 0' }}>Record your screen, mic, and webcam in a separate tab — it opens straight back here when you&apos;re done.</p>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Image overlay</div>
                <UploadBox accept="image/png,image/jpeg,image/webp" onFiles={handleOverlayImageFiles} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel="+ Add image overlay" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Logo / watermark</div>
                <UploadBox accept="image/png,image/jpeg,image/webp" onFiles={handleWatermarkFile} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel={timeline.imageOverlays.length ? '+ Add another logo' : '+ Add logo/watermark'} />
              </div>
            </div>
            {uploadError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {uploadError}</div>}
            {overlayTracks.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overlayTracks.map((track, ti) => {
                  const clip = getTrackClips(timeline, track.id)[0];
                  const source = clip ? timeline.sources.find((s) => s.id === clip.sourceId) : null;
                  return (
                    <div key={track.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ti + 1}. {source?.file.name || 'Overlay'}
                      </span>
                      <button
                        onClick={() => {
                          commit((tl) => removeOverlayTrack(tl, track.id));
                          if (selectedOverlayTrackId === track.id) setSelectedOverlayTrackId(null);
                          if (clip && clip.id === selectedClipId) setSelectedClipId(null);
                        }}
                        style={{ ...smallBtn, padding: '4px 8px', color: '#DC2626', borderColor: '#FCA5A5', flexShrink: 0 }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {timeline.imageOverlays.length > 0 && (
            <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Logos & watermarks</div>
              {timeline.imageOverlays.map((o) => {
                const src = timeline.sources.find((s) => s.id === o.sourceId);
                return (
                  <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, wordBreak: 'break-word' }}>{src?.file.name || 'Logo'}</span>
                      <button onClick={() => handleDeleteImageOverlay(o.id)} style={{ ...smallBtn, padding: '4px 8px', color: '#DC2626', borderColor: '#FCA5A5' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={fieldLabel}>Size
                        <input type="range" min={0.05} max={0.4} step={0.01} value={o.scale} onChange={(e) => handleUpdateImageOverlay(o.id, { scale: parseFloat(e.target.value) })} style={{ width: 90 }} />
                      </label>
                      <label style={fieldLabel}>Opacity
                        <input type="range" min={0.1} max={1} step={0.02} value={o.opacity} onChange={(e) => handleUpdateImageOverlay(o.id, { opacity: parseFloat(e.target.value) })} style={{ width: 90 }} />
                      </label>
                    </div>
                    <p style={{ fontSize: '0.64rem', color: T.muted, margin: 0 }}>Drag it directly on the preview above to reposition it.</p>
                  </div>
                );
              })}
            </div>
          )}

          </>)}

          {activeCategory === 'text' && (<>
          {/* Text & titles — always visible */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Text & titles</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {TEXT_PRESET_OPTIONS.map((p) => (
                <button key={p.id} onClick={() => handleAddTextOverlay(p.id)} style={{ ...smallBtn, padding: '6px 10px', fontSize: '0.68rem' }}>+ {p.label}</button>
              ))}
            </div>
            {timeline.textOverlays.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: selectedTextOverlay ? 8 : 0 }}>
                {timeline.textOverlays.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedTextOverlayId(o.id === selectedTextOverlayId ? null : o.id)}
                    style={{
                      ...smallBtn, textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 6,
                      background: o.id === selectedTextOverlayId ? T.accentGradient : 'white',
                      color: o.id === selectedTextOverlayId ? 'white' : T.inkSecondary,
                      border: o.id === selectedTextOverlayId ? 'none' : `1px solid ${T.border}`,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.text || '(empty text)'}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedTextOverlay && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                <label style={fieldLabel}>Text <span style={{ fontWeight: 500, opacity: 0.8 }}>— multiple lines supported</span>
                  <textarea rows={2} value={selectedTextOverlay.text} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { text: e.target.value })} style={{ ...numInput, width: '100%', resize: 'vertical', fontFamily: T.font }} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Size
                    <input type="range" min={16} max={96} step={2} value={selectedTextOverlay.size} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { size: parseInt(e.target.value, 10) })} style={{ width: 90 }} />
                  </label>
                  <label style={fieldLabel}>Color
                    <input type="color" value={selectedTextOverlay.color} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { color: e.target.value })} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                  </label>
                  <label style={fieldLabel}>Opacity
                    <input type="range" min={0.1} max={1} step={0.02} value={selectedTextOverlay.opacity} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { opacity: parseFloat(e.target.value) })} style={{ width: 90 }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { bold: !selectedTextOverlay.bold })} style={{ ...smallBtn, fontWeight: selectedTextOverlay.bold ? 900 : 700, background: selectedTextOverlay.bold ? T.accentGradient : 'white', color: selectedTextOverlay.bold ? 'white' : T.inkSecondary }}>B</button>
                  <button onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { italic: !selectedTextOverlay.italic })} style={{ ...smallBtn, fontStyle: 'italic', background: selectedTextOverlay.italic ? T.accentGradient : 'white', color: selectedTextOverlay.italic ? 'white' : T.inkSecondary }}>I</button>
                  {['left', 'center', 'right'].map((a) => (
                    <button key={a} onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { align: a })} style={{ ...smallBtn, background: selectedTextOverlay.align === a ? T.accentGradient : 'white', color: selectedTextOverlay.align === a ? 'white' : T.inkSecondary }}>{a[0].toUpperCase()}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label style={fieldLabel}>Background
                    <select value={selectedTextOverlay.background} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { background: e.target.value })} style={numInput}>
                      <option value="none">None</option>
                      <option value="bar">Bar</option>
                      <option value="solid">Solid</option>
                    </select>
                  </label>
                  {selectedTextOverlay.background !== 'none' && (
                    <label style={fieldLabel}>Background opacity
                      <input type="range" min={0.1} max={1} step={0.02} value={selectedTextOverlay.backgroundOpacity ?? 0.6}
                        onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { backgroundOpacity: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { outline: !selectedTextOverlay.outline })} style={{ ...smallBtn, background: selectedTextOverlay.outline ? T.accentGradient : 'white', color: selectedTextOverlay.outline ? 'white' : T.inkSecondary }}>Outline</button>
                  {selectedTextOverlay.outline && (
                    <input type="color" value={selectedTextOverlay.outlineColor} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { outlineColor: e.target.value })} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                  )}
                  <button onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { shadow: !selectedTextOverlay.shadow })} style={{ ...smallBtn, background: selectedTextOverlay.shadow ? T.accentGradient : 'white', color: selectedTextOverlay.shadow ? 'white' : T.inkSecondary }}>Shadow</button>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Entrance animation</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {TEXT_ANIMATION_OPTIONS.map((a) => (
                      <button key={a.id} onClick={() => handleUpdateTextOverlay(selectedTextOverlay.id, { animation: a.id })}
                        style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: (selectedTextOverlay.animation || 'none') === a.id ? T.accentGradient : 'white', color: (selectedTextOverlay.animation || 'none') === a.id ? 'white' : T.inkSecondary, border: (selectedTextOverlay.animation || 'none') === a.id ? 'none' : `1px solid ${T.border}` }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Character spacing
                    <input type="range" min={-2} max={16} step={1} value={selectedTextOverlay.letterSpacing ?? 0}
                      onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { letterSpacing: parseInt(e.target.value, 10) })} style={{ width: 90 }} />
                  </label>
                  <label style={fieldLabel}>Line spacing
                    <input type="range" min={0.9} max={2.2} step={0.05} value={selectedTextOverlay.lineHeight ?? 1.2}
                      onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { lineHeight: parseFloat(e.target.value) })} style={{ width: 90 }} />
                  </label>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Custom font <span style={{ fontWeight: 500, opacity: 0.8 }}>— .ttf, .otf, or .woff</span></div>
                  <input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" onChange={(e) => handleTextFontFile(e.target.files, selectedTextOverlay.id)} style={{ fontSize: '0.7rem', maxWidth: 220 }} />
                  {fontUploadError && <p style={{ fontSize: '0.66rem', color: '#DC2626', margin: '4px 0 0' }}>{fontUploadError}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Show from
                    <input type="number" step={0.5} min={0} max={totalDuration} value={selectedTextOverlay.start.toFixed(1)}
                      onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { start: Math.max(0, parseFloat(e.target.value) || 0) })} style={numInput} />
                  </label>
                  <label style={fieldLabel}>Until
                    <input type="number" step={0.5} min={0} max={totalDuration} value={selectedTextOverlay.end ?? totalDuration}
                      onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { end: parseFloat(e.target.value) || null })} style={numInput} />
                  </label>
                </div>
                <p style={{ fontSize: '0.66rem', color: T.muted, margin: 0 }}>Drag this text directly on the preview to reposition it, or pick a starting spot from the templates above.</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { const next = duplicateTextOverlay(timeline, selectedTextOverlay.id); const newId = next.textOverlays[next.textOverlays.length - 1].id; commit(next); setSelectedTextOverlayId(newId); }} style={smallBtn}>⧉ Duplicate</button>
                  <button onClick={() => handleDeleteTextOverlay(selectedTextOverlay.id)} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete text</button>
                </div>
              </div>
            )}
          </div>

          {/* Shapes — rectangle/circle/line/arrow annotations, same always-on-top-layer pattern as Text & titles */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Shapes</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {SHAPE_TYPE_OPTIONS.map((s) => (
                <button key={s.id} onClick={() => handleAddShapeOverlay(s.id)} style={{ ...smallBtn, padding: '6px 10px', fontSize: '0.68rem' }}>{s.icon} {s.label}</button>
              ))}
            </div>
            {timeline.shapeOverlays.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: selectedShapeOverlay ? 8 : 0 }}>
                {timeline.shapeOverlays.map((o) => {
                  const opt = SHAPE_TYPE_OPTIONS.find((s) => s.id === o.type);
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedShapeOverlayId(o.id === selectedShapeOverlayId ? null : o.id)}
                      style={{
                        ...smallBtn, textAlign: 'left',
                        background: o.id === selectedShapeOverlayId ? T.accentGradient : 'white',
                        color: o.id === selectedShapeOverlayId ? 'white' : T.inkSecondary,
                        border: o.id === selectedShapeOverlayId ? 'none' : `1px solid ${T.border}`,
                      }}
                    >
                      {opt?.icon} {opt?.label}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedShapeOverlay && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Color
                    <input type="color" value={selectedShapeOverlay.color} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { color: e.target.value })} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                  </label>
                  {(selectedShapeOverlay.type === 'rectangle' || selectedShapeOverlay.type === 'circle') && (
                    <button
                      onClick={() => handleUpdateShapeOverlay(selectedShapeOverlay.id, { filled: !selectedShapeOverlay.filled })}
                      style={{ ...smallBtn, background: selectedShapeOverlay.filled ? T.accentGradient : 'white', color: selectedShapeOverlay.filled ? 'white' : T.inkSecondary }}
                    >
                      {selectedShapeOverlay.filled ? 'Filled' : 'Outline'}
                    </button>
                  )}
                  <label style={fieldLabel}>Stroke width
                    <input type="range" min={1} max={16} step={1} value={selectedShapeOverlay.strokeWidth} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { strokeWidth: parseInt(e.target.value, 10) })} style={{ width: 90 }} />
                  </label>
                  <label style={fieldLabel}>Opacity
                    <input type="range" min={0.1} max={1} step={0.02} value={selectedShapeOverlay.opacity} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { opacity: parseFloat(e.target.value) })} style={{ width: 90 }} />
                  </label>
                </div>
                {(selectedShapeOverlay.type === 'rectangle' || selectedShapeOverlay.type === 'circle') ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={fieldLabel}>Position X
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.x} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { x: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>Position Y
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.y} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { y: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>Width
                      <input type="range" min={0.05} max={0.9} step={0.02} value={selectedShapeOverlay.width} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { width: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>Height
                      <input type="range" min={0.05} max={0.9} step={0.02} value={selectedShapeOverlay.height} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { height: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={fieldLabel}>Start X
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.x} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { x: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>Start Y
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.y} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { y: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>End X
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.x2} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { x2: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                    <label style={fieldLabel}>End Y
                      <input type="range" min={0} max={1} step={0.02} value={selectedShapeOverlay.y2} onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { y2: parseFloat(e.target.value) })} style={{ width: 90 }} />
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={fieldLabel}>Show from
                    <input type="number" step={0.5} min={0} max={totalDuration} value={selectedShapeOverlay.start.toFixed(1)}
                      onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { start: Math.max(0, parseFloat(e.target.value) || 0) })} style={numInput} />
                  </label>
                  <label style={fieldLabel}>Until
                    <input type="number" step={0.5} min={0} max={totalDuration} value={selectedShapeOverlay.end ?? totalDuration}
                      onChange={(e) => handleUpdateShapeOverlay(selectedShapeOverlay.id, { end: parseFloat(e.target.value) || null })} style={numInput} />
                  </label>
                </div>
                <button onClick={() => handleDeleteShapeOverlay(selectedShapeOverlay.id)} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5', alignSelf: 'flex-start' }}>✕ Delete shape</button>
              </div>
            )}
          </div>

          </>)}

          {activeCategory === 'canvas' && (<>
          {/* Canvas — output frame shape, fit, and background; a separate
              concern from Composition's overlay LAYOUT (split/PIP/cutout)
              below, even though both affect the final frame. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: 0.3 }}>Canvas</div>
              <button onClick={() => setShowSafeGuides((v) => !v)} title="Preview-only guides — never appear in the exported video"
                style={{ ...smallBtn, padding: '4px 8px', fontSize: '0.64rem', background: showSafeGuides ? T.accentGradient : 'white', color: showSafeGuides ? 'white' : T.inkSecondary, border: showSafeGuides ? 'none' : `1px solid ${T.border}` }}>
                ⛶ Safe guides
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ ...fieldLabel, marginBottom: 4 }}>Quick presets</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                {SOCIAL_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => commit((tl) => setFrameAspect(tl, p.aspect))}
                    style={{
                      ...smallBtn, padding: '5px 9px', fontSize: '0.68rem',
                      background: timeline.frameAspect === p.aspect ? T.accentTint : 'white',
                      border: timeline.frameAspect === p.aspect ? `1px solid ${T.accentDark}` : `1px solid ${T.border}`,
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              <div style={{ ...fieldLabel, marginBottom: 4 }}>Frame</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FRAME_ASPECT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => commit((tl) => setFrameAspect(tl, f.id))}
                    title={f.sub}
                    style={{
                      ...smallBtn, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, lineHeight: 1.2,
                      background: timeline.frameAspect === f.id ? T.accentGradient : 'white',
                      color: timeline.frameAspect === f.id ? 'white' : T.inkSecondary,
                      border: timeline.frameAspect === f.id ? 'none' : `1px solid ${T.border}`,
                    }}
                  >
                    <span>{f.icon} {f.label}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.85 }}>{f.sub}</span>
                  </button>
                ))}
              </div>
              {needsReframe && (
                <p style={{ fontSize: '0.66rem', color: T.muted, margin: '6px 0 0' }}>
                  Reframing re-encodes the whole video (crops to fill by default) — export takes longer than a straight trim.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Fit</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => commit((tl) => setFitMode(tl, 'cover'))} style={{ ...smallBtn, background: timeline.fitMode !== 'contain' ? T.accentGradient : 'white', color: timeline.fitMode !== 'contain' ? 'white' : T.inkSecondary, border: timeline.fitMode !== 'contain' ? 'none' : `1px solid ${T.border}` }}>Crop to fill</button>
                  <button onClick={() => commit((tl) => setFitMode(tl, 'contain'))} style={{ ...smallBtn, background: timeline.fitMode === 'contain' ? T.accentGradient : 'white', color: timeline.fitMode === 'contain' ? 'white' : T.inkSecondary, border: timeline.fitMode === 'contain' ? 'none' : `1px solid ${T.border}` }}>Fit whole frame</button>
                </div>
              </div>
              {timeline.fitMode === 'contain' && (
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Background</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {BACKGROUND_TYPE_OPTIONS.map((b) => (
                      <button key={b.id} onClick={() => commit((tl) => setBackgroundType(tl, b.id))}
                        style={{ ...smallBtn, padding: '6px 9px', background: (timeline.backgroundType || 'solid') === b.id ? T.accentGradient : 'white', color: (timeline.backgroundType || 'solid') === b.id ? 'white' : T.inkSecondary, border: (timeline.backgroundType || 'solid') === b.id ? 'none' : `1px solid ${T.border}` }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {timeline.fitMode === 'contain' && (timeline.backgroundType || 'solid') === 'solid' && (
              <label style={{ ...fieldLabel, marginBottom: 8 }}>Color
                <input type="color" value={timeline.backgroundFill} onChange={(e) => commit((tl) => setBackgroundFill(tl, e.target.value))} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
              </label>
            )}
            {timeline.fitMode === 'contain' && timeline.backgroundType === 'gradient' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                <label style={fieldLabel}>From
                  <input type="color" value={timeline.backgroundGradient?.from || '#0F172A'} onChange={(e) => commit((tl) => setBackgroundGradient(tl, { from: e.target.value }))} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                </label>
                <label style={fieldLabel}>To
                  <input type="color" value={timeline.backgroundGradient?.to || '#334155'} onChange={(e) => commit((tl) => setBackgroundGradient(tl, { to: e.target.value }))} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                </label>
                <label style={fieldLabel}>Angle
                  <input type="range" min={0} max={360} step={5} value={timeline.backgroundGradient?.angle ?? 135} onChange={(e) => commit((tl) => setBackgroundGradient(tl, { angle: parseInt(e.target.value, 10) }))} style={{ width: 90 }} />
                </label>
              </div>
            )}
            {timeline.fitMode === 'contain' && timeline.backgroundType === 'image' && (
              <div style={{ marginBottom: 8 }}>
                <UploadBox accept="image/png,image/jpeg,image/webp" onFiles={handleBackgroundImageFile} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel={timeline.backgroundImageSourceId ? '↻ Replace background image' : '+ Add background image'} />
              </div>
            )}
          </div>
          </>)}

          {activeCategory === 'composition' && (<>
          {/* Opening/closing transitions — the start and end of the WHOLE
              timeline, not any one clip's handoff to the next (that's the
              per-clip "Transition to next clip" picker in the Edit panel).
              Always visible, no clip selection required. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Opening &amp; closing transitions</div>
            {mainClips.length ? (<>
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Opening (start of video)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EDGE_TRANSITION_OPTIONS.map((t) => (
                    <button key={t.id} onClick={() => handleSetOpeningTransition(t.id)}
                      style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: openingTransitionType === t.id ? T.accentGradient : 'white', color: openingTransitionType === t.id ? 'white' : T.inkSecondary, border: openingTransitionType === t.id ? 'none' : `1px solid ${T.border}` }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Closing (end of video)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EDGE_TRANSITION_OPTIONS.map((t) => (
                    <button key={t.id} onClick={() => handleSetClosingTransition(t.id)}
                      style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: closingTransitionType === t.id ? T.accentGradient : 'white', color: closingTransitionType === t.id ? 'white' : T.inkSecondary, border: closingTransitionType === t.id ? 'none' : `1px solid ${T.border}` }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {(openingTransitionType !== 'none' || closingTransitionType !== 'none') && (
                <p style={{ fontSize: '0.64rem', color: T.muted, margin: '8px 0 0' }}>Fade-to-black and fade-to-white share the same background color as dip transitions between clips — picking one here can change the color an existing between-clip dip fades through too.</p>
              )}
            </>) : (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Add a video to the main track to set an opening or closing fade.</p>
            )}
          </div>

          {/* Composition — overlay LAYOUT: split-screen/PIP/video-call/
              person cutout. Always visible, not just after an overlay
              exists (see the empty-state uploader below). */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Composition</div>

            {possibleDuplicateAudio && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 10 }}>
                <span style={{ fontSize: '0.7rem', color: '#92400E' }}>
                  ⚠️ Main and an overlay both keep their own audio — may sound duplicated if this is one conversation captured twice.
                </span>
                <button
                  onClick={() => commit((tl) => ({ ...tl, clips: tl.clips.map((c) => (c.track !== MAIN_TRACK && c.audioMode === 'keep' ? { ...c, audioMode: 'mute' } : c)) }))}
                  style={{ ...smallBtn, flexShrink: 0 }}
                >
                  Mute overlay audio
                </button>
              </div>
            )}

            {overlayTracks.length > 1 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Video-call templates <span style={{ fontWeight: 500, opacity: 0.8 }}>— arrange all overlay tiles at once</span></div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {Object.entries(VIDEO_CALL_TEMPLATES).map(([id, tpl]) => (
                    <button key={id} onClick={() => commit((tl) => applyVideoCallTemplate(tl, id))} style={{ ...smallBtn, padding: '6px 10px', fontSize: '0.7rem' }}>
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {overlayTracks.length === 0 && (
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '0.76rem', color: T.inkSecondary, margin: '0 0 10px', lineHeight: 1.5 }}>
                  Split screen, picture-in-picture, and video-call layouts all need a <strong>second video</strong> composed over your main one — add one below to unlock them.
                </p>
                <UploadBox accept="video/*" onFiles={handleOverlayFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="+ Add video overlay" />
                <p style={{ fontSize: '0.68rem', color: T.muted, margin: '8px 0 0' }}>An image overlay works too — add one from the Media panel.</p>
              </div>
            )}
            {overlayTracks.length > 0 && (() => {
              const activeTrack = overlayTracks.find((t) => t.id === selectedOverlayTrackId) || overlayTracks[0];
              return (
                <div>
                  {overlayTracks.length > 1 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                      {overlayTracks.map((t, ti) => (
                        <button key={t.id} onClick={() => setSelectedOverlayTrackId(t.id)}
                          style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: activeTrack.id === t.id ? T.accentGradient : 'white', color: activeTrack.id === t.id ? 'white' : T.inkSecondary, border: activeTrack.id === t.id ? 'none' : `1px solid ${T.border}` }}>
                          Track {ti + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {TRACK_MODE_OPTIONS.filter((m) => m.id === 'pip' || overlayTracks.length === 1).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => commit((tl) => setOverlayTrackMode(tl, activeTrack.id, m.id))}
                        style={{ ...smallBtn, background: activeTrack.mode === m.id ? T.accentGradient : 'white', color: activeTrack.mode === m.id ? 'white' : T.inkSecondary, border: activeTrack.mode === m.id ? 'none' : `1px solid ${T.border}` }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {(activeTrack.mode === 'split-lr' || activeTrack.mode === 'split-tb') && (
                    <label style={fieldLabel}>Divider position
                      <input type="range" min={0.2} max={0.8} step={0.02} value={activeTrack.dividerRatio}
                        onChange={(e) => commit((tl) => setOverlayTrackDividerRatio(tl, activeTrack.id, parseFloat(e.target.value)))} style={{ width: '100%', maxWidth: 220 }} />
                    </label>
                  )}
                  {activeTrack.mode === 'pip' && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: 4 }}>Quick position</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {PIP_CORNER_OPTIONS.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => commit((tl) => setOverlayTrackPipCorner(tl, activeTrack.id, c.id))}
                              title={c.label}
                              style={{
                                ...smallBtn, padding: '6px 9px',
                                background: activeTrack.pipCorner === c.id ? T.accentGradient : 'white',
                                color: activeTrack.pipCorner === c.id ? 'white' : T.inkSecondary,
                                border: activeTrack.pipCorner === c.id ? 'none' : `1px solid ${T.border}`,
                              }}
                            >
                              {c.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label style={fieldLabel}>Size
                        <input type="range" min={0.15} max={0.5} step={0.02} value={activeTrack.pipSizeRatio}
                          onChange={(e) => commit((tl) => setOverlayTrackPipSizeRatio(tl, activeTrack.id, parseFloat(e.target.value)))} style={{ width: 120 }} />
                      </label>
                    </div>
                  )}
                  {activeTrack.mode === 'pip' && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                      <button
                        onClick={() => { if (!activeTrack.cutoutEnabled) ensureSegmenterLoaded(); commit((tl) => setOverlayTrackCutout(tl, activeTrack.id, { cutoutEnabled: !activeTrack.cutoutEnabled })); }}
                        style={{ ...smallBtn, background: activeTrack.cutoutEnabled ? T.accentGradient : 'white', color: activeTrack.cutoutEnabled ? 'white' : T.inkSecondary, border: activeTrack.cutoutEnabled ? 'none' : `1px solid ${T.border}` }}
                      >
                        🎭 {activeTrack.cutoutEnabled ? 'Person cutout on' : 'Person cutout (remove background)'}
                      </button>
                      {activeTrack.cutoutEnabled && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <label style={fieldLabel}>Edge softness
                            <input type="range" min={0} max={1} step={0.05} value={activeTrack.cutoutFeather ?? 0.3}
                              onChange={(e) => commit((tl) => setOverlayTrackCutout(tl, activeTrack.id, { cutoutFeather: parseFloat(e.target.value) }))} style={{ width: 100 }} />
                          </label>
                          <button
                            onClick={() => commit((tl) => setOverlayTrackCutout(tl, activeTrack.id, { cutoutShadow: !activeTrack.cutoutShadow }))}
                            style={{ ...smallBtn, background: activeTrack.cutoutShadow ? T.accentGradient : 'white', color: activeTrack.cutoutShadow ? 'white' : T.inkSecondary, border: activeTrack.cutoutShadow ? 'none' : `1px solid ${T.border}` }}
                          >
                            Shadow
                          </button>
                          <button
                            onClick={() => commit((tl) => setOverlayTrackCutout(tl, activeTrack.id, { cutoutOutline: !activeTrack.cutoutOutline }))}
                            style={{ ...smallBtn, background: activeTrack.cutoutOutline ? T.accentGradient : 'white', color: activeTrack.cutoutOutline ? 'white' : T.inkSecondary, border: activeTrack.cutoutOutline ? 'none' : `1px solid ${T.border}` }}
                          >
                            Outline
                          </button>
                          {activeTrack.cutoutOutline && (
                            <input type="color" value={activeTrack.cutoutOutlineColor} title="Outline color"
                              onChange={(e) => commit((tl) => setOverlayTrackCutout(tl, activeTrack.id, { cutoutOutlineColor: e.target.value }))}
                              style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                          )}
                          <span style={{ fontSize: '0.62rem', color: T.muted, fontWeight: 500, width: '100%' }}>
                            Removes this overlay's background automatically, live in the preview and in the export — no green screen needed. Resize/move it like any other overlay above, and flip it from the Clip panel. To change what shows behind the person, replace the Main track's own video or image.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          </>)}

          {activeCategory === 'audio' && (<>
          {/* Master audio — applies on top of every clip's own volume/fades, across the whole timeline */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Master audio</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
              <label style={fieldLabel}>Volume {Math.round((timeline.masterVolume ?? 1) * 100)}%
                <input type="range" min={0} max={2} step={0.05} value={timeline.masterVolume ?? 1}
                  onChange={(e) => commit((tl) => setMasterVolume(tl, parseFloat(e.target.value)))} style={{ width: 100 }} />
              </label>
              <button
                onClick={() => commit((tl) => setMasterMuted(tl, !tl.masterMuted))}
                style={{ ...smallBtn, background: timeline.masterMuted ? '#DC2626' : 'white', color: timeline.masterMuted ? 'white' : T.inkSecondary, borderColor: timeline.masterMuted ? '#DC2626' : T.border }}
              >
                {timeline.masterMuted ? '🔇 Muted' : '🔊 Mute all'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={fieldLabel}>Fade in (from black)
                <input type="number" step={0.5} min={0} max={totalDuration / 2} value={(timeline.masterFadeIn || 0).toFixed(1)}
                  onChange={(e) => commit((tl) => setMasterFade(tl, { masterFadeIn: parseFloat(e.target.value) || 0 }))} style={numInput} />
              </label>
              <label style={fieldLabel}>Fade out (to black)
                <input type="number" step={0.5} min={0} max={totalDuration / 2} value={(timeline.masterFadeOut || 0).toFixed(1)}
                  onChange={(e) => commit((tl) => setMasterFade(tl, { masterFadeOut: parseFloat(e.target.value) || 0 }))} style={numInput} />
              </label>
              {(timeline.masterFadeOut || 0) === 0 && (
                <button onClick={() => commit((tl) => setMasterFade(tl, { masterFadeOut: 1.5 }))} style={smallBtn}>+ Fade to black at the end</button>
              )}
            </div>
            <p style={{ fontSize: '0.66rem', color: T.muted, margin: '6px 0 0' }}>Fades both the picture (to/from black) and the whole mix&apos;s volume together, on top of every clip&apos;s own volume and fades.</p>
            <div style={{ marginTop: 8 }}>
              <div style={{ ...fieldLabel, marginBottom: 4 }}>Level meter <span style={{ fontWeight: 500, opacity: 0.8 }}>— live during playback</span></div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden' }}>
                <div ref={meterBarRef} style={{ height: '100%', width: '0%', background: '#10B981', transition: 'width 0.05s linear' }} />
              </div>
            </div>
          </div>

          {/* Audio Track — an independent audio bed, distinct from any
              clip's own audio: Replace Video/Sync Audio's paired video +
              audio (with different durations) lands here, and it doubles
              as a plain "add music" track for any timeline (e.g. a
              slideshow). Plays from t=0 for its own length regardless of
              how the main track is trimmed/split/reordered. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Audio track</div>
            {(() => {
              if (!projectAudioTrack || !projectAudioClips.length) {
                return (
                  <>
                    <p style={{ fontSize: '0.74rem', color: T.mutedDark, margin: '0 0 8px' }}>
                      No independent audio track set. Add one to pair separately-sourced audio (e.g. from Audio Studio) with this video — it plays from the very start, independently of the main track&apos;s own clips.
                    </p>
                    <label style={{ ...smallBtn, display: 'inline-block', cursor: 'pointer' }}>
                      🎵 Add Music / Audio Track
                      <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleAddProjectAudioFile(f); }} />
                    </label>
                  </>
                );
              }
              const videoDuration = totalDuration;
              const audioEnd = projectAudioClips.reduce((max, c) => Math.max(max, c.start + clipDuration(c)), 0);
              const diff = videoDuration - audioEnd;
              const diffLabel = Math.abs(diff) < 0.3
                ? 'Video and audio are the same length.'
                : diff > 0
                  ? `Video is ${formatDuration(diff)} longer than the audio.`
                  : `Audio is ${formatDuration(-diff)} longer than the video.`;
              return (
                <>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8, fontSize: '0.76rem', color: T.ink }}>
                    <span><strong>Video:</strong> {formatDuration(videoDuration)}</span>
                    <span><strong>Audio:</strong> {formatDuration(audioEnd)}</span>
                    {projectAudioClips.length > 1 && <span>({projectAudioClips.length} pieces)</span>}
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 6, background: Math.abs(diff) < 0.3 ? '#F0FDF4' : '#FFFBEB', color: Math.abs(diff) < 0.3 ? '#15803D' : '#92400E', fontSize: '0.72rem', fontWeight: 600, marginBottom: 10 }}>
                    {diffLabel} {Math.abs(diff) >= 0.3 && 'Trim, split, or add clips on the main track (or trim this audio) to match them up.'}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: T.mutedDark, margin: '0 0 10px' }}>
                    Click a piece right on the timeline above to select it, then use Split (to cut it in two) or Delete (to remove that piece) — the same way you edit any other clip.
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', margin: '10px 0 8px' }}>
                    <label style={fieldLabel}>Volume {Math.round((projectAudioTrack.volume ?? 1) * 100)}%
                      <input type="range" min={0} max={2} step={0.05} value={projectAudioTrack.volume ?? 1}
                        onChange={(e) => commit((tl) => setSoundTrackFlags(tl, projectAudioTrack.id, { volume: parseFloat(e.target.value) }))} style={{ width: 100 }} />
                    </label>
                    <button
                      onClick={() => commit((tl) => setSoundTrackFlags(tl, projectAudioTrack.id, { muted: !projectAudioTrack.muted }))}
                      style={{ ...smallBtn, background: projectAudioTrack.muted ? '#DC2626' : 'white', color: projectAudioTrack.muted ? 'white' : T.inkSecondary, borderColor: projectAudioTrack.muted ? '#DC2626' : T.border }}
                    >
                      {projectAudioTrack.muted ? '🔇 Muted' : '🔊 Mute'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ ...smallBtn, display: 'inline-block', cursor: 'pointer' }} title="Starts the Audio Track over with this new file as one fresh piece — any splits you've made are discarded. To remove just one piece instead, select it on the timeline and click Delete.">
                      ⇄ Replace audio
                      <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleAddProjectAudioFile(f); }} />
                    </label>
                    <button onClick={handleRemoveProjectAudio} style={{ ...smallBtn, color: T.danger }} title="Removes the whole Audio Track and every piece on it">🗑 Remove</button>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Sound clips — any number of independent audio clips (music,
              sound effects, extra narration), each its own track so they can
              freely overlap. Distinct from the single Audio Track bed above
              (one continuous track from t=0) and from a clip's own
              replace/mix audio (scoped to that one clip's span). */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Sound clips</div>
            <p style={{ fontSize: '0.74rem', color: T.mutedDark, margin: '0 0 8px' }}>
              Add as many sound clips as you like — background music, sound effects, extra narration. Each one plays independently and can overlap with the others; position and trim them with the fields below.
            </p>
            <label style={{ ...smallBtn, display: 'inline-block', cursor: 'pointer', marginBottom: 10 }}>
              + Add sound{extraSoundTracks.length ? ' clip' : ''}
              <input type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={(e) => {
                // Array.from(...) copies the file references out BEFORE
                // clearing value — e.target.files is a live FileList tied to
                // the input, so resetting value first (as every other
                // single-file input in this file safely does with
                // e.target.files?.[0], a plain File reference) would empty
                // this multi-file FileList out from under handleSoundFiles.
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (files.length) handleSoundFiles(files);
              }} />
            </label>
            {extraSoundTracks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {extraSoundTracks.map((track, ti) => {
                  const clip = getTrackClips(timeline, track.id)[0];
                  if (!clip) return null;
                  const source = timeline.sources.find((s) => s.id === clip.sourceId);
                  const dur = clipDuration(clip);
                  return (
                    <div key={track.id} style={{ padding: '8px 10px', borderRadius: 8, background: '#F8FAFC', border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ti + 1}. {source?.file.name || 'Sound'}
                        </span>
                        <button onClick={() => handleRemoveSoundTrack(track.id)} style={{ ...smallBtn, padding: '4px 8px', color: '#DC2626', borderColor: '#FCA5A5', flexShrink: 0 }}>🗑 Remove</button>
                      </div>
                      <ProjectAudioWaveform source={source} waveformBySource={waveformBySource} />
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
                        <label style={fieldLabel}>Start (s)
                          <input type="number" step={0.1} min={0} value={clip.start.toFixed(1)}
                            onChange={(e) => commit((tl) => moveClip(tl, clip.id, Math.max(0, parseFloat(e.target.value) || 0)))} style={numInput} />
                        </label>
                        <label style={fieldLabel}>Length (s)
                          <input type="number" step={0.1} min={0.1} max={source?.duration || 999} value={dur.toFixed(1)}
                            onChange={(e) => commit((tl) => trimClip(tl, clip.id, { sourceStart: clip.sourceStart, sourceEnd: clip.sourceStart + (parseFloat(e.target.value) || 0.1) }))} style={numInput} />
                        </label>
                        <label style={fieldLabel}>Volume {Math.round((track.volume ?? 1) * 100)}%
                          <input type="range" min={0} max={2} step={0.05} value={track.volume ?? 1}
                            onChange={(e) => commit((tl) => setSoundTrackFlags(tl, track.id, { volume: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                        </label>
                        <button
                          onClick={() => commit((tl) => setSoundTrackFlags(tl, track.id, { muted: !track.muted }))}
                          style={{ ...smallBtn, background: track.muted ? '#DC2626' : 'white', color: track.muted ? 'white' : T.inkSecondary, borderColor: track.muted ? '#DC2626' : T.border }}
                        >
                          {track.muted ? '🔇 Muted' : '🔊 Mute'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </>)}

          {exportPanelOpen && (<>
          {/* Export */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Export settings</div>
            <label style={{ ...fieldLabel, display: 'block', marginBottom: 10 }}>File name
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => { exportFilenameTouchedRef.current = true; setExportFilename(e.target.value); }}
                  placeholder="edited-video"
                  style={{ ...numInput, flex: 1, minWidth: 0 }}
                />
                <span style={{ fontSize: '0.72rem', color: T.muted, flexShrink: 0 }}>.mp4</span>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Resolution</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {RESOLUTION_OPTIONS.map((r) => (
                    <button key={r.id} onClick={() => commit((tl) => setExportResolution(tl, r.id))} title={r.sub}
                      style={{ ...smallBtn, padding: '6px 10px', background: timeline.exportResolution === r.id ? T.accentGradient : 'white', color: timeline.exportResolution === r.id ? 'white' : T.inkSecondary, border: timeline.exportResolution === r.id ? 'none' : `1px solid ${T.border}` }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Quality</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {QUALITY_OPTIONS.map((q) => (
                    <button key={q.id} onClick={() => commit((tl) => setExportQuality(tl, q.id))}
                      style={{ ...smallBtn, padding: '6px 10px', background: timeline.exportQuality === q.id ? T.accentGradient : 'white', color: timeline.exportQuality === q.id ? 'white' : T.inkSecondary, border: timeline.exportQuality === q.id ? 'none' : `1px solid ${T.border}` }}>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>FPS</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {FPS_OPTIONS.map((f) => (
                    <button key={f.id} onClick={() => commit((tl) => setExportFps(tl, f.id))} title={f.sub}
                      style={{ ...smallBtn, padding: '6px 10px', background: (timeline.exportFps ?? 'original') === f.id ? T.accentGradient : 'white', color: (timeline.exportFps ?? 'original') === f.id ? 'white' : T.inkSecondary, border: (timeline.exportFps ?? 'original') === f.id ? 'none' : `1px solid ${T.border}` }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '8px 0 0' }}>Estimated size: ~{estimatedExportMB} MB (typical; the encoder is capped so it won't run far past this even for a busy composition)</p>
          </div>
          {supported ? (
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <button onClick={handleExport} disabled={isExporting} style={{ ...primaryBtn(isExporting), width: '100%' }}>
                {isExporting ? `${RENDER_STATUS_LABEL[renderStatus] || 'Working…'} ${Math.round(renderProgress * 100)}%` : '⬇ Export MP4'}
              </button>
              {isExporting && (
                <>
                  <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: T.muted }}>Keep this tab open while your video exports.</p>
                  <button onClick={handleCancelExport} style={{ ...smallBtn, marginTop: 6 }}>Cancel export</button>
                </>
              )}
              {renderStatus === 'error' && <div style={{ ...statusBox, marginTop: 8, display: 'inline-block' }}>⚠️ {renderError}</div>}
            </div>
          ) : (
            <p style={{ fontSize: '0.72rem', color: T.muted, textAlign: 'center' }}>
              Exporting isn&apos;t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.
            </p>
          )}

          </>)}

          {activeCategory === 'captions' && (<>
          {/* Captions — the one step in this tool that isn't purely local.
              Works straight off the current timeline (renders just its
              audio locally first — see the import comment above), so
              there's no need to export a video before captioning. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Auto Captions</div>
            {!mainClips.length ? (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Add a clip to the timeline, then generate captions here.</p>
            ) : !transcript ? (
              <>
                <button onClick={handleAutoCaptions} disabled={isTranscribing} style={{ ...primaryBtn(isTranscribing), width: '100%', padding: '10px 20px', fontSize: '0.85rem' }}>
                  {isTranscribing ? transcribeStatusLabel() : '📝 Auto Captions'}
                </button>
                {isTranscribing && (transcribeStatus === 'preparing-audio' || transcribeStatus === 'rendering-audio') && (
                  <>
                    <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: T.muted }}>Keep this tab open while the timeline's audio renders.</p>
                    <button onClick={handleCancelAutoCaptions} style={{ ...smallBtn, marginTop: 6 }}>Cancel</button>
                  </>
                )}
                {transcribeStatus === 'error' && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {transcribeError}</div>}
              </>
            ) : (
              <>
                {transcriptTimelineRef !== null && transcriptTimelineRef !== timeline && (
                  <p style={{ fontSize: '0.68rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 8px', margin: '0 0 8px' }}>
                    ⚠️ The timeline has changed since this transcript was generated — re-transcribe so captions line up with your latest edits.
                  </p>
                )}
                <TranscriptEditor transcript={transcript} onTranscriptChange={setTranscript} currentTime={playhead} onSeek={handleCaptionsSeek} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <button onClick={handleDownloadSrt} style={smallBtn}>⬇ SRT</button>
                  <button onClick={handleDownloadVtt} style={smallBtn}>⬇ VTT</button>
                  <button onClick={handleDownloadTxt} style={smallBtn}>⬇ TXT</button>
                  <button onClick={() => { setTranscript(null); setTranscribeStatus('idle'); }} style={smallBtn}>Re-transcribe</button>
                </div>
              </>
            )}
          </div>

          {/* Burn Subtitles — separate from Auto Captions above: no
              transcription, no AI, the user already has an .srt/.vtt file.
              Once parsed it becomes just another caption source for the
              SAME style/position/toggle below (see captionEvents), not a
              separate styled burn pipeline of its own. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Burn Subtitles</div>
            {!mainClips.length ? (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Add a clip to the timeline, then upload a subtitle file for it here.</p>
            ) : !uploadedSubtitle ? (
              <>
                <p style={{ fontSize: '0.7rem', color: T.muted, margin: '0 0 8px' }}>Already have captions? Upload an .srt or .vtt file — no transcription needed. Style, position, and export use the same controls as Auto Captions, below.</p>
                <UploadBox accept=".srt,.vtt,text/vtt,application/x-subrip" onFiles={handleSubtitleFile} maxSizeMB={5} compact compactLabel="+ Upload .srt or .vtt file" />
                {subtitleParseError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {subtitleParseError}</div>}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.72rem', color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📄 {subtitleFileName} · {uploadedSubtitle.segments.length} cue{uploadedSubtitle.segments.length === 1 ? '' : 's'}
                </span>
                <button onClick={handleRemoveSubtitle} style={{ ...smallBtn, padding: '5px 10px', flexShrink: 0 }}>Remove</button>
              </div>
            )}
          </div>

          {/* Unified style/position/export — whichever source above is
              active (an uploaded file takes priority over a transcript, see
              captionEvents), this is the ONE place to style and place it,
              live on the preview canvas and identically in the export the
              moment "Show captions" is on. Dragging the caption directly on
              the preview (position) and its side handles (text-box width)
              works while this panel is open — see the render loop's own
              box/handle drawing, gated on activeCategory === 'captions'. */}
          {captionEvents.length > 0 && (
            <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: 0.3 }}>Caption style &amp; position</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!timeline.captionsEnabled} onChange={(e) => commit((tl) => setCaptionsEnabled(tl, e.target.checked))} />
                  Show in preview &amp; export
                </label>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Presets</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {CAPTION_PRESET_OPTIONS.map((p) => (
                    <button key={p.id} onClick={() => commit((tl) => setCaptionPreset(tl, p.id))}
                      style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: timeline.captionStyle.preset === p.id ? T.accentGradient : 'white', color: timeline.captionStyle.preset === p.id ? 'white' : T.inkSecondary, border: timeline.captionStyle.preset === p.id ? 'none' : `1px solid ${T.border}` }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
                <label style={fieldLabel}>Font size {timeline.captionStyle.fontSize}px
                  <input type="range" min={16} max={72} step={2} value={timeline.captionStyle.fontSize}
                    onChange={(e) => commit((tl) => setCaptionStyle(tl, { fontSize: parseInt(e.target.value, 10) }))} style={{ width: 110 }} />
                </label>
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!timeline.captionStyle.bold} onChange={(e) => commit((tl) => setCaptionStyle(tl, { bold: e.target.checked }))} />
                  Bold
                </label>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Text box width {Math.round(timeline.captionStyle.boxWidth * 100)}%</div>
                  <input type="range" min={20} max={100} step={2} value={Math.round(timeline.captionStyle.boxWidth * 100)}
                    onChange={(e) => commit((tl) => setCaptionBoxWidth(tl, parseInt(e.target.value, 10) / 100))} style={{ width: 130 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>Text color
                  <input type="color" value={timeline.captionStyle.color} onChange={(e) => commit((tl) => setCaptionStyle(tl, { color: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                </label>
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>Highlight color
                  <input type="color" value={timeline.captionStyle.highlightColor} onChange={(e) => commit((tl) => setCaptionStyle(tl, { highlightColor: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                </label>
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={timeline.captionStyle.outline} onChange={(e) => commit((tl) => setCaptionStyle(tl, { outline: e.target.checked }))} />
                  Outline
                </label>
                {timeline.captionStyle.outline && (
                  <input type="color" value={timeline.captionStyle.outlineColor} onChange={(e) => commit((tl) => setCaptionStyle(tl, { outlineColor: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                )}
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={timeline.captionStyle.shadow} onChange={(e) => commit((tl) => setCaptionStyle(tl, { shadow: e.target.checked }))} />
                  Shadow
                </label>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={timeline.captionStyle.background === 'box'} onChange={(e) => commit((tl) => setCaptionStyle(tl, { background: e.target.checked ? 'box' : 'none' }))} />
                  Background box
                </label>
                {timeline.captionStyle.background === 'box' && (
                  <>
                    <input type="color" value={timeline.captionStyle.backgroundColor} onChange={(e) => commit((tl) => setCaptionStyle(tl, { backgroundColor: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                    <label style={fieldLabel}>Opacity {Math.round(timeline.captionStyle.backgroundOpacity * 100)}%
                      <input type="range" min={0.2} max={1} step={0.05} value={timeline.captionStyle.backgroundOpacity}
                        onChange={(e) => commit((tl) => setCaptionStyle(tl, { backgroundOpacity: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                    </label>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <label style={fieldLabel}>Opacity {Math.round(timeline.captionStyle.opacity * 100)}%
                  <input type="range" min={0.2} max={1} step={0.05} value={timeline.captionStyle.opacity}
                    onChange={(e) => commit((tl) => setCaptionStyle(tl, { opacity: parseFloat(e.target.value) }))} style={{ width: 100 }} />
                </label>
                <label style={fieldLabel}>Line spacing {timeline.captionStyle.lineHeight.toFixed(2)}×
                  <input type="range" min={1} max={2} step={0.05} value={timeline.captionStyle.lineHeight}
                    onChange={(e) => commit((tl) => setCaptionStyle(tl, { lineHeight: parseFloat(e.target.value) }))} style={{ width: 100 }} />
                </label>
                <label style={fieldLabel}>Letter spacing {timeline.captionStyle.letterSpacing}px
                  <input type="range" min={-2} max={10} step={0.5} value={timeline.captionStyle.letterSpacing}
                    onChange={(e) => commit((tl) => setCaptionStyle(tl, { letterSpacing: parseFloat(e.target.value) }))} style={{ width: 100 }} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Alignment</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {CAPTION_ALIGN_OPTIONS.map((a) => (
                      <button key={a.id} onClick={() => commit((tl) => setCaptionStyle(tl, { align: a.id }))}
                        style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: timeline.captionStyle.align === a.id ? T.accentGradient : 'white', color: timeline.captionStyle.align === a.id ? 'white' : T.inkSecondary, border: timeline.captionStyle.align === a.id ? 'none' : `1px solid ${T.border}` }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Word highlight</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {CAPTION_HIGHLIGHT_OPTIONS.map((h) => (
                      <button key={h.id} onClick={() => commit((tl) => setCaptionStyle(tl, { highlightMode: h.id }))}
                        style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: timeline.captionStyle.highlightMode === h.id ? T.accentGradient : 'white', color: timeline.captionStyle.highlightMode === h.id ? 'white' : T.inkSecondary, border: timeline.captionStyle.highlightMode === h.id ? 'none' : `1px solid ${T.border}` }}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Animation</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {CAPTION_ANIMATION_OPTIONS.map((a) => (
                      <button key={a.id} onClick={() => commit((tl) => setCaptionStyle(tl, { animation: a.id }))}
                        style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: timeline.captionStyle.animation === a.id ? T.accentGradient : 'white', color: timeline.captionStyle.animation === a.id ? 'white' : T.inkSecondary, border: timeline.captionStyle.animation === a.id ? 'none' : `1px solid ${T.border}` }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.66rem', color: T.muted, margin: 0 }}>
                Drag the caption directly on the preview above to reposition it, or its side handles to resize the text box — both update live and match the export exactly. Word highlight/karaoke timing is approximated evenly across each caption{uploadedSubtitle ? '' : ' (V1 has no real per-word transcription timestamps yet)'}, not tied to actual speech detection.
              </p>
            </div>
          )}
          </>)}

          <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
            Editing, composition, and export all happen locally in your browser — your video is never uploaded. Auto Captions is the one exception: it renders the edited timeline&apos;s audio locally, then sends a compressed copy of just that audio (never your video) to our transcription provider, processed for that request and not stored afterward. Burn Subtitles never sends anything anywhere — it works entirely from the file you upload.
          </p>
        </div>
      </div>
        </div>
      </div>
      <style jsx>{`
        .ve-body { display: flex; }
        @media (max-width: 720px) {
          .ve-body { flex-direction: column; }
          .ve-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #1E293B; }
        }
      `}</style>
    </div>
  );
}

// "3 minutes ago" style, for the restore-project banner's savedAt.
function formatRelativeSavedAt(savedAt) {
  const seconds = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const playBtn = { width: 40, height: 40, borderRadius: '50%', border: 'none', background: T.accentGradient, color: 'white', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 };
const smallBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
// The two essential cutting actions, right under the timeline itself
// rather than buried in the side panel — the same "icons directly below
// the strip" layout a CapCut-style editor uses, since that's the one
// place a first-time user is already looking right after they've clicked
// a clip.
const quickActionBtn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.82rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const trackFlagBtn = { width: 22, height: 22, borderRadius: 5, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.62rem', fontWeight: 800, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 };
const primaryBtn = (disabled) => ({ padding: '13px 32px', borderRadius: 12, border: 'none', background: disabled ? '#94A3B8' : T.accentGradient, color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: T.font });
const statusBox = { padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark };
const numInput = { padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: '0.78rem', fontFamily: T.font, width: 90 };

function trimHandleStyle(side, snapped) {
  return {
    position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 9, zIndex: 3,
    background: snapped ? '#F59E0B' : 'rgba(255,255,255,0.85)',
    boxShadow: snapped ? '0 0 0 2px rgba(245,158,11,0.5)' : 'none',
    cursor: 'ew-resize',
    borderRadius: side === 'left' ? '7px 0 0 7px' : '0 7px 7px 0',
  };
}

// Filmstrip background for a clip strip — the subset of that SOURCE's
// cached thumbnails (extracted once, see the workspace's thumbnail effect)
// falling within this clip's own trim range, so a re-trimmed clip shows
// the right slice without re-decoding anything.
function ClipThumbFilmstrip({ source, sourceStart, sourceEnd, thumbnailsBySource }) {
  // A static image has no filmstrip of its own to extract — thumbnailsBySource
  // only ever populates video sources (see the workspace's thumbnail effect)
  // — so every image clip rendered this way alike, indistinguishable from
  // each other until clicked. The image file itself IS its own thumbnail.
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (source?.kind !== 'image') { setImgSrc(null); return; }
    const url = URL.createObjectURL(source.file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [source?.id, source?.kind, source?.file]);
  if (source?.kind === 'image') {
    if (!imgSrc) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imgSrc} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, zIndex: 0 }} />;
  }
  const entry = thumbnailsBySource[source?.id];
  if (!entry || entry === 'loading' || entry === 'error') return null;
  const thumbs = thumbnailsForRange(entry.thumbs, entry.duration, sourceStart, sourceEnd);
  if (!thumbs.length) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0 }}>
      {thumbs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" draggable={false} style={{ flex: 1, minWidth: 0, height: '100%', objectFit: 'cover', opacity: 0.6 }} />
      ))}
    </div>
  );
}

// Waveform strip along the bottom of a clip — same "slice the cached
// per-source peaks to this clip's own trim range" idea as the thumbnails.
function ClipWaveform({ source, sourceStart, sourceEnd, waveformBySource }) {
  const peaks = waveformBySource[source?.id];
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !Array.isArray(peaks) || !source?.duration) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const n = peaks.length;
    const startIdx = Math.max(0, Math.floor((sourceStart / source.duration) * n));
    const endIdx = Math.min(n, Math.ceil((sourceEnd / source.duration) * n));
    const slice = peaks.slice(startIdx, endIdx);
    if (slice.length) drawWaveform(ctx, slice, { x: 0, y: 0, width: canvas.width, height: canvas.height, color: '#ffffff' });
  }, [peaks, sourceStart, sourceEnd, source?.duration]);
  if (!Array.isArray(peaks)) return null;
  return (
    <canvas
      ref={canvasRef} width={240} height={16}
      style={{ position: 'absolute', left: 2, right: 2, bottom: 2, width: 'calc(100% - 4px)', height: 14, opacity: 0.9, zIndex: 1, pointerEvents: 'none' }}
    />
  );
}

// Full-width waveform for the standalone Audio Track panel — same peaks
// cache as ClipWaveform, just laid out for a panel instead of overlaid on a
// timeline clip block.
function ProjectAudioWaveform({ source, waveformBySource }) {
  const peaks = waveformBySource[source?.id];
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !Array.isArray(peaks)) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWaveform(ctx, peaks, { x: 0, y: 0, width: canvas.width, height: canvas.height, color: '#0EA5E9' });
  }, [peaks]);
  if (peaks === 'loading' || peaks === undefined) {
    return <div style={{ width: '100%', height: 40, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#94A3B8' }}>Loading waveform…</div>;
  }
  if (!Array.isArray(peaks)) return null;
  return <canvas ref={canvasRef} width={600} height={40} style={{ width: '100%', height: 40, borderRadius: 6, background: '#F1F5F9', display: 'block' }} />;
}
