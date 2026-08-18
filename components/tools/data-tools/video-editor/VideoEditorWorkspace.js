'use client';

// P1: non-destructive editing + composition, built as a new workspace on
// top of the same lib/media engine P0 already shipped — reuses
// extractVideoMetadata, ffmpegClient's lazy-loaded ffmpeg.wasm singleton,
// UploadBox, downloadBlob, and the T theme tokens rather than introducing
// any parallel infrastructure. lib/media/timeline.js, compositionLayouts.js
// and timelineRender.js are the only new engine modules.

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { receiveBlobHandoff } from '@/lib/media/blobHandoff';
import { extractVideoMetadata, extractImageMetadata, extractAudioMetadata, formatDuration } from '@/lib/media/metadata';
import { validateUploadSize, MAX_UPLOAD_VIDEO_BYTES, MAX_UPLOAD_IMAGE_BYTES, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import {
  createTimeline, addSource, addClip, trimClip, splitClip, deleteClip, deleteClips, joinClips, moveClip, moveClips, duplicateClip, duplicateClips,
  setClipAudioMode,
  addOverlayTrack, removeOverlayTrack, setOverlayTrackMode, setOverlayTrackDividerRatio,
  setOverlayTrackPipCorner, setOverlayTrackPipPosition, setOverlayTrackPipSizeRatio, setOverlayTrackFlags, setOverlayTrackCutout, isOverlayTrackAudible,
  setFitMode, setBackgroundFill, setBackgroundType, setBackgroundGradient, setBackgroundImageSource, setFrameAspect,
  setClipSpeed, setClipFade, setClipFilters, setClipCropFocus, setClipCropZoom, setClipTransitionOut, setClipGain, setClipReversed, setClipDucking,
  rotateClip90, setClipFlip,
  addTextOverlay, updateTextOverlay, deleteTextOverlay, duplicateTextOverlay,
  addImageOverlay, updateImageOverlay, deleteImageOverlay,
  addShapeOverlay, updateShapeOverlay, deleteShapeOverlay,
  setExportResolution, setExportQuality, setExportFps,
  getTrackClips, getTotalDuration, findActiveClipAt, clipDuration, MAIN_TRACK, BLEND_TRANSITION_TYPES,
  getClipTimelineBounds, getAllClipBoundaryTimes,
  getMasterGain, setMasterVolume, setMasterMuted, setMasterFade,
  addMarker, updateMarker, deleteMarker,
} from '@/lib/media/timeline';
import { drawCompositionFrame, drawTextOverlays, drawImageOverlays, drawShapeOverlays, computeLayoutRects, pipPositionFromPoint, getComposeSize, getFadeOpacity, getTextOverlayBounds, buildCutoutCanvas } from '@/lib/media/compositionLayouts';
import { ensureSegmenterLoaded, getPersonMaskCanvas } from '@/lib/media/segmentation';
import { renderTimeline, renderTimelineAudio, isTimelineExportSupported, TimelineRenderCancelledError, TimelineRenderError } from '@/lib/media/timelineRender';
import { extractThumbnails, thumbnailsForRange } from '@/lib/media/thumbnails';
import { extractWaveformPeaks, drawWaveform } from '@/lib/media/waveform';
import { detectSilence } from '@/lib/media/silenceDetect';
import { computeNormalizationGain } from '@/lib/media/normalizeAudio';
import { cleanAudioFile } from '@/lib/media/audioCleanup';
import { duckGainAtTime } from '@/lib/media/ducking';
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
import { transcriptToSrt, transcriptToVtt, transcriptToAss, transcriptToCaptionCues, DEFAULT_CAPTION_STYLE } from '@/lib/media/captions';
import { parseSubtitleFile } from '@/lib/media/subtitleParse';
import { transcriptToPlainText } from '@/lib/media/transcript';
import { burnAssSubtitles, FfmpegLoadError, FfmpegRenderError, FfmpegCancelledError } from '@/lib/media/ffmpegClient';
import TranscriptEditor from '../shared/TranscriptEditor';

const TRANSCRIBE_STATUS_LABEL = {
  'preparing-audio': 'Preparing audio…',
  'rendering-audio': 'Rendering timeline audio…',
  preparing: 'Preparing for transcription…',
  transcribing: 'Transcribing speech…',
  merging: 'Combining transcript…',
};
const BURN_STATUS_LABEL = {
  'rendering-video': 'Rendering final video…',
  loading: 'Loading video engine…',
  burning: 'Burning captions into video…',
};

const BURN_SUBTITLE_STATUS_LABEL = {
  'rendering-video': 'Rendering final video…',
  loading: 'Loading video engine…',
  burning: 'Burning subtitles into video…',
};

const SUBTITLE_POSITION_OPTIONS = [
  { id: 'bottom', label: 'Bottom' },
  { id: 'middle', label: 'Middle' },
  { id: 'top', label: 'Top' },
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
  { id: 'fade', label: 'Fade' },
  { id: 'dip-black', label: 'Dip to black' },
  { id: 'dip-white', label: 'Dip to white' },
  { id: 'crossfade', label: 'Crossfade' },
  { id: 'slide', label: 'Slide' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'blur', label: 'Blur' },
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

// Rough kbps-per-quality-tier lookup used only for the "estimated size"
// readout — not a promise of exact output size, ffmpeg's actual bitrate
// depends on content complexity too. Video kbps only; a flat allowance for
// audio (~128kbps) is added on top in estimatedExportMB below.
const ESTIMATED_VIDEO_KBPS = {
  '480p': { small: 800, balanced: 1200, high: 2000 },
  '720p': { small: 1500, balanced: 2500, high: 4000 },
  '1080p': { small: 3000, balanced: 5000, high: 8000 },
};

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
  const [uploadError, setUploadError] = useState('');
  const [renderStatus, setRenderStatus] = useState('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState(null);
  const [selectedShapeOverlayId, setSelectedShapeOverlayId] = useState(null);
  const [thumbnailsBySource, setThumbnailsBySource] = useState({}); // sourceId -> { thumbs, duration } | 'loading' | 'error'
  const [waveformBySource, setWaveformBySource] = useState({}); // sourceId -> peaks[] | 'loading' | 'error'
  const [silenceRanges, setSilenceRanges] = useState(null); // null = not run yet; [] = ran, found none; [{ start, end, selected }] = ran, found some — never applied until the user confirms
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
  const [burnStatus, setBurnStatus] = useState('idle'); // idle | rendering-video | loading | burning | error
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnError, setBurnError] = useState('');
  const [burnEta, setBurnEta] = useState('');
  const burnCancelRef = useRef(null);
  const audioRenderCancelRef = useRef(null);
  const exportCancelRef = useRef(null);
  const burnStartRef = useRef(0);

  // ---- Burn Subtitles: user supplies an existing .srt/.vtt file instead
  // of generating one with Auto Captions — no transcription, no AI, kept
  // as a fully separate state machine from transcript/burnStatus above so
  // the two features can't collide, even though the actual burn-in at the
  // end reuses the exact same transcriptToAss + burnAssSubtitles pipeline
  // Auto Captions already uses (see handleBurnSubtitles). ----
  const [uploadedSubtitle, setUploadedSubtitle] = useState(null); // { segments: [{start,end,text}] } | null
  const [subtitleFileName, setSubtitleFileName] = useState('');
  const [subtitleParseError, setSubtitleParseError] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState(DEFAULT_CAPTION_STYLE);
  const [burnSubtitleStatus, setBurnSubtitleStatus] = useState('idle'); // idle | rendering-video | loading | burning | error
  const [burnSubtitleProgress, setBurnSubtitleProgress] = useState(0);
  const [burnSubtitleError, setBurnSubtitleError] = useState('');
  const [burnSubtitleEta, setBurnSubtitleEta] = useState('');
  const burnSubtitleCancelRef = useRef(null);
  const burnSubtitleStartRef = useRef(0);

  const canvasRef = useRef(null);
  const previewWrapRef = useRef(null);
  const mainVideoRef = useRef(null);
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
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [selectedOverlayTrackId, setSelectedOverlayTrackId] = useState(null); // which overlay track's Composition controls are shown

  const totalDuration = getTotalDuration(timeline);
  const videoKbps = ESTIMATED_VIDEO_KBPS[timeline.exportResolution]?.[timeline.exportQuality] ?? ESTIMATED_VIDEO_KBPS['720p'].balanced;
  const estimatedExportMB = Math.max(0.1, Math.round(((videoKbps + 128) * totalDuration) / 8 / 1024 * 10) / 10);
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  const overlayTracks = timeline.overlayTracks;
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
      playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };
    }
    setPlaying(next);
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
      if (s.kind !== 'video') return;
      if (thumbnailsBySource[s.id] === undefined) {
        setThumbnailsBySource((prev) => ({ ...prev, [s.id]: 'loading' }));
        extractThumbnails(s.file, 10, 100)
          .then((result) => setThumbnailsBySource((prev) => ({ ...prev, [s.id]: result })))
          .catch(() => setThumbnailsBySource((prev) => ({ ...prev, [s.id]: 'error' })));
      }
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

  async function handleMainFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'video');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractVideoMetadata(f);
      // Computed synchronously from the current `timeline` (not via a
      // commit() functional updater) so newClipId is known immediately —
      // React doesn't invoke a setState updater function synchronously,
      // so a `let` mutated inside one can't be read right after commit().
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'video');
      const next = addClip(withSource, source.id, MAIN_TRACK);
      const newClipId = getTrackClips(next, MAIN_TRACK).at(-1)?.id || null;
      commit(next);
      // Selecting the clip immediately — not just adding it — is what
      // makes the trim/audio/split panel actually show up without the
      // user needing to know to click the timeline strip first.
      if (newClipId) { setSelectedClipId(newClipId); setExtraSelectedClipIds([]); }
    } catch (err) {
      setUploadError(err.message || 'Could not read this video file.');
    }
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        return setClipAudioMode(withSource, selectedClip.id, mode, source.id);
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
    setSelectedClipId(clickedId);
    setExtraSelectedClipIds([]);
    if (overlayTrackId !== undefined) setSelectedOverlayTrackId(overlayTrackId);
    // Clicking a clip moves the playhead to exactly the point clicked
    // within it — "click where you want to cut" should mean literally
    // that, not select-the-clip-then-separately-drag-a-thin-slider-to-
    // the-same-spot. Skipped for the ctrl/multi-select and successful
    // shift-range branches above (those return early), since those
    // clicks are about building a selection, not picking a cut point.
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
    setPlaying(false);
    setPlayhead(clip.start + frac * clipDuration(clip));
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
    commit((tl) => trimClip(tl, selectedClip.id, {
      sourceStart: field === 'start' ? num : selectedClip.sourceStart,
      sourceEnd: field === 'end' ? num : selectedClip.sourceEnd,
    }));
  }

  // Splits whatever clip currently sits at the playhead on the selected
  // clip's own track — NOT only the exact clip that was selected before
  // this call. A prior split leaves the playhead inside a brand-new clip
  // (the split's second half), so requiring an exact id match here made a
  // second split silently no-op unless the user re-clicked the timeline in
  // between; auto-following the playhead instead lets "move playhead, hit
  // Split, repeat" work as one continuous motion, same as it visually reads.
  function handleSplitAtPlayhead() {
    if (!selectedClip) return;
    const hit = findActiveClipAt(timeline, selectedClip.track, playhead);
    if (!hit) return;
    if (hit.clip.id !== selectedClip.id) {
      setSelectedClipId(hit.clip.id);
      setExtraSelectedClipIds([]);
    }
    commit((tl) => splitClip(tl, hit.clip.id, hit.sourceTime));
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
      const next = selectionIds.length > 1 ? deleteClips(tl, selectionIds) : deleteClip(tl, selectionIds[0]);
      // An overlay track left with zero clips is dead weight in the track
      // list/UI — same "clean up after yourself" removeSource already does
      // for a deleted source's now-empty tracks.
      const stillHasClips = track !== MAIN_TRACK && getTrackClips(next, track).length > 0;
      return track !== MAIN_TRACK && !stillHasClips ? removeOverlayTrack(next, track) : next;
    });
    setSelectedClipId(null);
    setExtraSelectedClipIds([]);
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
    commit((tl) => duplicateClip(tl, selectedClip.id));
  }
  // Bulk duplicate for 2+ selected clips — a separate function (rather than
  // folding into handleDuplicateSelected) so the existing single-clip
  // Duplicate button's behavior/tests are completely untouched; this one is
  // only ever wired to a button that's itself only shown when multi-select
  // is active. Inserts all copies as one contiguous block (see
  // duplicateClips' own comment) in a single commit — one undo/redo entry.
  function handleDuplicateMultiSelected() {
    if (selectionIds.length < 2) return;
    commit((tl) => duplicateClips(tl, selectionIds));
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
    const selected = silenceRanges.filter((r) => r.selected);
    if (!selected.length) return;
    commit((tl) => {
      let next = tl;
      for (const range of selected) {
        const target = next.clips.find((c) => c.sourceId === originalSourceId && c.sourceStart <= range.start + 0.02 && c.sourceEnd >= range.end - 0.02);
        if (!target) continue;
        const afterFirstSplit = splitClip(next, target.id, range.start);
        const midCandidate = afterFirstSplit.clips.find((c) => c.sourceId === originalSourceId && Math.abs(c.sourceStart - range.start) < 0.06 && c.sourceEnd > range.start);
        if (!midCandidate) { next = afterFirstSplit; continue; }
        const afterSecondSplit = splitClip(afterFirstSplit, midCandidate.id, range.end);
        const toDelete = afterSecondSplit.clips.find((c) => c.sourceId === originalSourceId && Math.abs(c.sourceStart - range.start) < 0.06 && Math.abs(c.sourceEnd - range.end) < 0.06);
        next = toDelete ? deleteClip(afterSecondSplit, toDelete.id) : afterSecondSplit;
      }
      return next;
    });
    setSilenceRanges(null);
    setSelectedClipId(null);
    setExtraSelectedClipIds([]);
  }

  // A gap before the selected clip (from a free-form drag, or a deleted
  // neighbor that didn't ripple onto a different track) means playback
  // stops dead on empty space before resuming — findActiveClipAt renders
  // nothing during a gap. "Close gap" snaps the clip flush against
  // whatever's immediately before it on its own track (or 0 if it's
  // first), the one-click version of dragging it there yourself (which
  // already snaps to the same boundary — see handleClipBodyPointerMove).
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
    commit((tl) => moveClip(tl, selectedClip.id, prevEnd));
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
      const split = splitClip(tl, hit.clip.id, hit.sourceTime);
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
      else if (e.key.toLowerCase() === 's') { handleSplitAtPlayhead(); }
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
      return drag.edge === 'start'
        ? trimClip(prev, drag.clipId, { sourceStart: newValue, sourceEnd: clip.sourceEnd })
        : trimClip(prev, drag.clipId, { sourceStart: clip.sourceStart, sourceEnd: newValue });
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

  // ---- Drag-to-move: free-form repositioning of a main-track clip along
  // its own track (Premiere-style — gaps allowed, overlaps rejected, see
  // moveClip/moveClips in timeline.js). A plain pointerdown-then-move past
  // MOVE_THRESHOLD_PX starts a drag; anything short of that threshold is
  // left alone so the existing onClick (single/Ctrl/Shift multi-select,
  // unchanged) still fires normally on a plain click. suppressClickRef
  // swallows the synthetic click the browser still dispatches after a real
  // drag's pointerup, so a drag never ALSO toggles selection. Dragging a
  // clip that's part of the current multi-selection moves the whole group
  // together via moveClips; dragging any other clip moves just that one. ----
  const clipMoveDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const MOVE_THRESHOLD_PX = 4;

  function handleClipBodyPointerDown(e, clip) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const trackRect = mainTrackRef.current.getBoundingClientRect();
    const pxPerSecond = trackRect.width / (totalDuration || 1);
    const groupIds = selectionIdSet.has(clip.id) && selectionIds.length > 1 ? selectionIds : [clip.id];
    const snapTargets = [
      0,
      playhead,
      ...timeline.markers.map((m) => m.time),
      ...getAllClipBoundaryTimes(timeline),
    ];
    clipMoveDragRef.current = {
      clipId: clip.id,
      groupIds,
      startClientX: e.clientX,
      startStart: clip.start,
      pxPerSecond,
      preDragTimeline: timeline,
      snapTargets,
      moved: false,
    };
    window.addEventListener('pointermove', handleClipBodyPointerMove);
    window.addEventListener('pointerup', handleClipBodyPointerUp);
  }
  function handleClipBodyPointerMove(e) {
    const drag = clipMoveDragRef.current;
    if (!drag) return;
    const dxPx = e.clientX - drag.startClientX;
    if (!drag.moved && Math.abs(dxPx) < MOVE_THRESHOLD_PX) return;
    drag.moved = true;
    let deltaSeconds = dxPx / drag.pxPerSecond;
    let didSnap = false;
    if (!e.altKey) {
      // Snaps the DRAGGED clip's own (would-be) start against the same
      // candidate set trim-handle snapping uses — for a group drag this
      // still anchors on the grabbed clip specifically, so the rest of the
      // group lines up relative to it exactly as it was before the drag.
      const rawStart = drag.startStart + deltaSeconds;
      const thresholdSeconds = SNAP_PX / drag.pxPerSecond;
      let nearest = null;
      let nearestDist = thresholdSeconds;
      for (const target of drag.snapTargets) {
        const dist = Math.abs(target - rawStart);
        if (dist <= nearestDist) { nearest = target; nearestDist = dist; }
      }
      if (nearest !== null) {
        didSnap = true;
        deltaSeconds = nearest - drag.startStart;
      }
    }
    setTimeline(() => {
      const result = drag.groupIds.length > 1
        ? moveClips(drag.preDragTimeline, drag.groupIds, deltaSeconds)
        : moveClip(drag.preDragTimeline, drag.clipId, Math.max(0, drag.startStart + deltaSeconds));
      // moveClip/moveClips return the SAME object reference (not a copy)
      // when the move is rejected (would overlap another clip) — cheap,
      // reliable way to tell "actually moved" from "rejected, no-op" so a
      // fully-rejected drag doesn't consume an undo step for nothing.
      drag.appliedChange = result !== drag.preDragTimeline;
      return result;
    });
    setSnappedHandle((prev) => {
      const next = didSnap ? { clipId: drag.clipId, edge: 'move' } : null;
      return (prev?.clipId === next?.clipId && prev?.edge === next?.edge) ? prev : next;
    });
  }
  function handleClipBodyPointerUp() {
    const drag = clipMoveDragRef.current;
    clipMoveDragRef.current = null;
    window.removeEventListener('pointermove', handleClipBodyPointerMove);
    window.removeEventListener('pointerup', handleClipBodyPointerUp);
    setSnappedHandle(null);
    if (drag?.moved) {
      suppressClickRef.current = true;
      if (drag.appliedChange) {
        setPast((p) => [...p, drag.preDragTimeline]);
        setFuture([]);
      }
    }
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
        await new Promise((resolve) => { videoEl.onloadedmetadata = resolve; });
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
        await new Promise((resolve, reject) => { imgEl.onload = resolve; imgEl.onerror = reject; });
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
            await new Promise((resolve) => { audioEl.onloadedmetadata = resolve; });
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

    async function tick() {
      if (cancelled) return;
      if (playing && !playStartRef.current) playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, playhead);

      if (mainHit) {
        await loadClip(mainVideoRef.current, mainHit.clip, lastMainClipRef);
        mainVideoRef.current.playbackRate = mainHit.clip.speed || 1;
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
        if (mainHit && mainHit.clip.reversed) {
          mainGainRef.current.gain.value = 0;
          mainReplaceGainRef.current.gain.value = 0;
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
          s.videoEl.playbackRate = hit.clip.speed || 1;
          if (!s.videoEl.paused) s.videoEl.pause();
          const mirroredTime = hit.clip.sourceEnd - (hit.sourceTime - hit.clip.sourceStart);
          s.videoEl.currentTime = Math.max(0, mirroredTime);
        } else if (hit && s.videoEl) {
          await loadClip(s.videoEl, hit.clip, s.lastClipIdRef);
          s.videoEl.playbackRate = hit.clip.speed || 1;
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
          if (nextClip && nextSource && nextSource.kind !== 'image' && mainCrossfadeVideoRef.current) {
            await loadClip(mainCrossfadeVideoRef.current, nextClip, mainCrossfadeLoadedClipRef);
            if (Math.abs(mainCrossfadeVideoRef.current.currentTime - nextClip.sourceStart) > 0.05) {
              mainCrossfadeVideoRef.current.currentTime = nextClip.sourceStart;
            }
            const progress = Math.max(0, Math.min(1, (elapsedInClip - (dur - mainHit.clip.fadeOut)) / mainHit.clip.fadeOut));
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

      drawCompositionFrame(ctx, {
        timeline: drawTimeline,
        mainEl: mainHit ? mainVideoRef.current : null,
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
        const next = playStartRef.current.atPlayhead + elapsedWall;
        if (next >= totalDuration) {
          setPlaying(false);
          setPlayhead(totalDuration);
        } else {
          setPlayhead(next);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, playhead, playing]);

  // ---- Free-drag PiP repositioning (mouse + touch via Pointer Events) ----
  function canvasPointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = composeW / rect.width;
    const scaleY = composeH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  // Hit-tests text overlays first (they draw last = visually topmost),
  // then overlay tracks top-most first (last in overlayTracks = drawn last
  // = visually on top) — so a drag anywhere grabs whichever element is
  // actually visible at that point.
  function handleOverlayPointerDown(e) {
    const point = canvasPointFromEvent(e);
    const ctx = canvasRef.current?.getContext('2d');
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
    if (dragTextStateRef.current) {
      const point = canvasPointFromEvent(e);
      const x = Math.max(0, Math.min(1, (point.x - dragTextStateRef.current.grabDx) / composeW));
      const y = Math.max(0, Math.min(1, (point.y - dragTextStateRef.current.grabDy) / composeH));
      liveTextPositionRef.current = { id: dragTextStateRef.current.id, x, y };
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
    if (dragTextStateRef.current) {
      const { id } = dragTextStateRef.current;
      const finalPosition = liveTextPositionRef.current;
      dragTextStateRef.current = null;
      setIsDraggingOverlay(false);
      if (finalPosition) commit((tl) => updateTextOverlay(tl, id, { x: finalPosition.x, y: finalPosition.y }));
      liveTextPositionRef.current = null;
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
      });
      downloadBlob(blob, 'video/mp4', 'edited-video.mp4');
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
  function handleDownloadSrt() { downloadBlob(transcriptToSrt(transcript), 'text/plain', 'edited-video.srt'); }
  function handleDownloadVtt() { downloadBlob(transcriptToVtt(transcript), 'text/vtt', 'edited-video.vtt'); }
  function handleDownloadTxt() { downloadBlob(transcriptToPlainText(transcript), 'text/plain', 'edited-video-transcript.txt'); }

  // Renders the actual final video (once, fresh — never reusing a
  // possibly-stale earlier export) and burns the captions into that same
  // pass, producing exactly one downloaded file — the "Final MP4" the
  // Auto Captions workflow ends at, rather than exporting once for
  // transcription and again for captions the way this used to work.
  async function handleBurnCaptions() {
    if (!transcript || !mainClips.length) return;
    setBurnError('');
    setBurnStatus('rendering-video');
    setBurnProgress(0);
    setBurnEta('');
    const cancelToken = { cancelled: false };
    burnCancelRef.current = cancelToken;
    burnStartRef.current = Date.now();
    try {
      const videoBlob = await renderTimeline(timeline, {
        onStatus: () => {},
        onProgress: setBurnProgress,
        cancelToken,
      });
      if (cancelToken.cancelled) throw new TimelineRenderCancelledError();
      setBurnProgress(0);
      setBurnStatus('loading');
      const videoFile = new File([videoBlob], 'edited-video.mp4', { type: 'video/mp4' });
      const assText = transcriptToAss(transcript, DEFAULT_CAPTION_STYLE);
      setBurnStatus('burning');
      burnStartRef.current = Date.now();
      const mp4Blob = await burnAssSubtitles({
        videoFile,
        assText,
        onProgress: (p) => {
          setBurnProgress(p);
          const elapsedSec = (Date.now() - burnStartRef.current) / 1000;
          setBurnEta(p > 0.03 ? `~${formatDuration(Math.max(0, elapsedSec / p - elapsedSec))} remaining` : '');
        },
        cancelToken,
      });
      downloadBlob(mp4Blob, 'video/mp4', 'edited-video-captioned.mp4');
      setBurnStatus('idle');
      setBurnEta('');
    } catch (err) {
      if (err instanceof FfmpegCancelledError || err instanceof TimelineRenderCancelledError || cancelToken.cancelled) {
        setBurnStatus('idle');
        setBurnProgress(0);
        setBurnEta('');
      } else {
        setBurnStatus('error');
        setBurnError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError || err instanceof TimelineRenderError ? err.message : 'Could not burn captions into this video. Please try again.');
      }
    } finally {
      burnCancelRef.current = null;
    }
  }
  function handleCancelBurnCaptions() {
    if (burnCancelRef.current) burnCancelRef.current.cancelled = true;
  }

  // Burn Subtitles: no transcription, no AI — the user already has an
  // .srt/.vtt file and just wants it hardcoded into the video's pixels.
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

  // Same render-then-burn pipeline as Auto Captions' handleBurnCaptions
  // (render the current edited timeline fresh, then burn styled subtitles
  // into that render) — only the source of the cues differs: an uploaded
  // file's segments here, transcript.segments there. transcriptToAss
  // doesn't care which produced them, since both are the same
  // { segments: [{start,end,text}] } shape.
  async function handleBurnSubtitles() {
    if (!uploadedSubtitle || !mainClips.length) return;
    setBurnSubtitleError('');
    setBurnSubtitleStatus('rendering-video');
    setBurnSubtitleProgress(0);
    setBurnSubtitleEta('');
    const cancelToken = { cancelled: false };
    burnSubtitleCancelRef.current = cancelToken;
    burnSubtitleStartRef.current = Date.now();
    try {
      const videoBlob = await renderTimeline(timeline, {
        onStatus: () => {},
        onProgress: setBurnSubtitleProgress,
        cancelToken,
      });
      if (cancelToken.cancelled) throw new TimelineRenderCancelledError();
      setBurnSubtitleProgress(0);
      setBurnSubtitleStatus('loading');
      const videoFile = new File([videoBlob], 'edited-video.mp4', { type: 'video/mp4' });
      const assText = transcriptToAss(uploadedSubtitle, subtitleStyle);
      setBurnSubtitleStatus('burning');
      burnSubtitleStartRef.current = Date.now();
      const mp4Blob = await burnAssSubtitles({
        videoFile,
        assText,
        onProgress: (p) => {
          setBurnSubtitleProgress(p);
          const elapsedSec = (Date.now() - burnSubtitleStartRef.current) / 1000;
          setBurnSubtitleEta(p > 0.03 ? `~${formatDuration(Math.max(0, elapsedSec / p - elapsedSec))} remaining` : '');
        },
        cancelToken,
      });
      downloadBlob(mp4Blob, 'video/mp4', 'edited-video-subtitled.mp4');
      setBurnSubtitleStatus('idle');
      setBurnSubtitleEta('');
    } catch (err) {
      if (err instanceof FfmpegCancelledError || err instanceof TimelineRenderCancelledError || cancelToken.cancelled) {
        setBurnSubtitleStatus('idle');
        setBurnSubtitleProgress(0);
        setBurnSubtitleEta('');
      } else {
        setBurnSubtitleStatus('error');
        setBurnSubtitleError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError || err instanceof TimelineRenderError ? err.message : 'Could not burn subtitles into this video. Please try again.');
      }
    } finally {
      burnSubtitleCancelRef.current = null;
    }
  }
  function handleCancelBurnSubtitles() {
    if (burnSubtitleCancelRef.current) burnSubtitleCancelRef.current.cancelled = true;
  }

  const isExporting = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';
  const isTranscribing = transcribeStatus === 'preparing-audio' || transcribeStatus === 'rendering-audio' || transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const isBurning = burnStatus === 'rendering-video' || burnStatus === 'loading' || burnStatus === 'burning';
  // ffmpeg.wasm is a single lazy-loaded singleton (see ffmpegClient.js) —
  // it can't run two exec() calls at once, so Auto Captions' burn and
  // Burn Subtitles' burn must never overlap even though they're otherwise
  // fully independent state machines.
  const isBurningSubtitles = burnSubtitleStatus === 'rendering-video' || burnSubtitleStatus === 'loading' || burnSubtitleStatus === 'burning';
  const isBurningAnything = isBurning || isBurningSubtitles;
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
                  onFiles={handleMainFiles}
                  maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
                  label="Click to choose a video to start editing, or drag it here"
                  oversizedHint={<>Use <Link href="/compress-video" style={{ color: T.accentDark, fontWeight: 700 }}>Compress &amp; Split Video</Link> to shrink or cut it down first.</>}
                />
                {uploadError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {uploadError}</div>}
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
        <button
          onClick={() => setExportPanelOpen((v) => !v)}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: exportPanelOpen ? 'white' : T.accentGradient, color: exportPanelOpen ? T.accentDark : 'white', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', fontFamily: T.font, flexShrink: 0 }}
        >
          ⬇ Export
        </button>
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
                touchAction: (overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0) ? 'none' : 'auto',
                cursor: (overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0) ? (isDraggingOverlay ? 'grabbing' : 'grab') : 'default',
              }}
            />
            {uploadedSubtitle && (() => {
              const cue = transcriptToCaptionCues(uploadedSubtitle).find((c) => playhead >= c.start && playhead < c.end);
              if (!cue) return null;
              const scale = subtitleStyle.fontSize / DEFAULT_CAPTION_STYLE.fontSize;
              const hasBackground = (subtitleStyle.backgroundOpacity ?? 0) > 0;
              return (
                <div
                  style={{
                    position: 'absolute', left: '6%', right: '6%', textAlign: 'center', pointerEvents: 'none', zIndex: 4,
                    top: subtitleStyle.position === 'top' ? '5%' : subtitleStyle.position === 'middle' ? '50%' : 'auto',
                    bottom: subtitleStyle.position === 'bottom' ? '6%' : 'auto',
                    transform: subtitleStyle.position === 'middle' ? 'translateY(-50%)' : 'none',
                  }}
                >
                  {cue.lines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'inline-block', color: subtitleStyle.color, fontWeight: 700, lineHeight: 1.3,
                        fontSize: `${1.05 * scale}rem`,
                        ...(hasBackground
                          ? { background: `rgba(0,0,0,${subtitleStyle.backgroundOpacity})`, padding: '2px 8px', borderRadius: 4 }
                          : { textShadow: `1px 1px 0 ${subtitleStyle.outlineColor}, -1px -1px 0 ${subtitleStyle.outlineColor}, 1px -1px 0 ${subtitleStyle.outlineColor}, -1px 1px 0 ${subtitleStyle.outlineColor}` }),
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              );
            })()}
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
          {(overlayTracks.some((t) => t.mode === 'pip') || timeline.textOverlays.length > 0) && (
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '0 0 8px', textAlign: 'center' }}>
              Drag an overlay or text layer directly on the preview to reposition it.
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
            <span style={{ fontSize: '0.72rem', color: T.mutedDark, minWidth: 76, textAlign: 'right' }}>
              {formatDuration(playhead)} / {formatDuration(totalDuration)}
            </span>
          </div>

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
            <div style={{ width: `${timelineZoom * 100}%`, minWidth: '100%' }}>
              <div ref={mainTrackRef} onClick={clearSelectionIfEmptyClick} style={{ position: 'relative', height: 46 }}>
              {mainClips.map((clip) => {
                const source = timeline.sources.find((s) => s.id === clip.sourceId);
                const isPrimary = clip.id === selectedClipId;
                const isSelected = selectionIdSet.has(clip.id);
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
                      boxShadow: isSelected && !isPrimary ? `inset 0 0 0 1px white` : 'none',
                      overflow: 'hidden',
                    }}
                    title={`${formatDuration(clipDuration(clip))} — click anywhere on the clip to select it and move the cut line there (Ctrl/Cmd-click to multi-select, Shift-click for a range), drag to reposition, drag the side handles to trim`}
                  >
                    <ClipThumbFilmstrip source={source} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} thumbnailsBySource={thumbnailsBySource} />
                    <ClipWaveform source={source} sourceStart={clip.sourceStart} sourceEnd={clip.sourceEnd} waveformBySource={waveformBySource} />
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.62rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                      padding: '2px 4px', pointerEvents: 'none', zIndex: 2,
                    }}>
                      {formatDuration(clipDuration(clip))}{clip.speed !== 1 ? ` · ${clip.speed}×` : ''}
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
                      </>
                    )}
                  </div>
                );
              })}
              </div>

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
                        return (
                          <div
                            key={clip.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); setExtraSelectedClipIds([]); setSelectedOverlayTrackId(track.id); }}
                            style={{
                              flex: isImage ? 1 : (clipDuration(clip) || 1), minWidth: 40, height: 32, borderRadius: 7, cursor: 'pointer',
                              background: clip.id === selectedClipId ? T.accentGradient : '#F1F5F9',
                              border: clip.id === selectedClipId ? `2px solid ${T.accentDark}` : `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.64rem', fontWeight: 700, color: clip.id === selectedClipId ? 'white' : T.inkSecondary,
                            }}
                            title="Click to edit"
                          >
                            {isImage ? '🖼 Image' : formatDuration(clipDuration(clip))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedClip && !isLockedSelected && selectionIds.length <= 1 && selectedSource?.kind !== 'image' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={handleSplitAtPlayhead} style={quickActionBtn} title="Cuts the selected clip in two at the white line above">
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
                  {selectedSource.file.name} <span style={{ fontWeight: 500, color: T.mutedDark }}>({selectedClip.track === MAIN_TRACK ? 'main' : 'overlay'}{selectedSource.kind === 'image' ? ' · image' : ''})</span>
                </div>
                {selectedSource.kind === 'image' ? (
                  <p style={{ fontSize: '0.72rem', color: T.mutedDark, margin: '4px 0 0' }}>
                    Static image — shown for the whole overlay duration. Drag it directly on the preview to reposition it.
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
              {selectedSource.kind !== 'image' && (
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
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSource.kind !== 'image' && <button onClick={handleSplitAtPlayhead} style={smallBtn}>✂ Split</button>}
                {selectedSource.kind !== 'image' && <button onClick={() => handleJoinWithNext(selectedClip.track)} style={smallBtn}>⤵ Join with next</button>}
                {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFreezeFrame} style={smallBtn}>❄ Freeze frame</button>}
                {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFindSilence} disabled={silenceScanning} style={smallBtn}>{silenceScanning ? 'Scanning…' : '🔇 Find silence'}</button>}
                <button onClick={handleDuplicateSelected} style={smallBtn}>⧉ Duplicate</button>
                <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete clip</button>
              </div>
              {selectedSource.kind !== 'image' && (
                <p style={{ fontSize: '0.68rem', color: T.muted, margin: '8px 0 0' }}>
                  To remove part of a clip: click on the clip exactly where you want to cut (that moves the white line there and selects it), click Split, do the same at the other end of the part you don&apos;t want, then click that middle piece and Delete it — everything after closes the gap automatically. The Split and Delete buttons are also right under the timeline for quick access.
                </p>
              )}
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
                  <select value={selectedClip.audioMode} onChange={(e) => commit((tl) => setClipAudioMode(tl, selectedClip.id, e.target.value))} style={numInput}>
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
              {selectedSource.kind !== 'image' && (
                <label style={{ ...fieldLabel, display: 'inline-flex', marginBottom: 10 }}>Speed
                  <select value={selectedClip.speed} onChange={(e) => commit((tl) => setClipSpeed(tl, selectedClip.id, parseFloat(e.target.value)))} style={numInput}>
                    {SPEED_OPTIONS.map((s) => <option key={s} value={s}>{s}×</option>)}
                  </select>
                </label>
              )}
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
                    {selectedClip.transitionOut.type !== 'cut' && (
                      <input type="number" step={0.1} min={0.1} max={2} value={selectedClip.transitionOut.duration.toFixed(1)}
                        onChange={(e) => handleTransitionDuration(selectedClip, parseFloat(e.target.value) || 0.5)}
                        style={{ ...numInput, width: 56 }} title="Transition duration (seconds)" />
                    )}
                  </div>
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
                <UploadBox accept="video/*" onFiles={handleMainFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="+ Add another video" oversizedHint={<>Use <Link href="/compress-video" style={{ color: T.accentDark, fontWeight: 700 }}>Compress &amp; Split Video</Link> to shrink or cut it down first.</>} />
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
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: 4 }}>Position</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {PIP_CORNER_OPTIONS.map((c) => (
                            <button key={c.id} onClick={() => handleUpdateImageOverlay(o.id, { x: c.id.includes('left') ? 0.12 : 0.88, y: c.id.includes('top') ? 0.12 : 0.88 })} style={{ ...smallBtn, padding: '5px 8px' }}>{c.icon}</button>
                          ))}
                        </div>
                      </div>
                    </div>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={fieldLabel}>Fade in
                <input type="number" step={0.5} min={0} max={totalDuration / 2} value={(timeline.masterFadeIn || 0).toFixed(1)}
                  onChange={(e) => commit((tl) => setMasterFade(tl, { masterFadeIn: parseFloat(e.target.value) || 0 }))} style={numInput} />
              </label>
              <label style={fieldLabel}>Fade out
                <input type="number" step={0.5} min={0} max={totalDuration / 2} value={(timeline.masterFadeOut || 0).toFixed(1)}
                  onChange={(e) => commit((tl) => setMasterFade(tl, { masterFadeOut: parseFloat(e.target.value) || 0 }))} style={numInput} />
              </label>
            </div>
            <p style={{ fontSize: '0.66rem', color: T.muted, margin: '6px 0 0' }}>Applies to the whole mix, on top of every clip&apos;s own volume and fades.</p>
            <div style={{ marginTop: 8 }}>
              <div style={{ ...fieldLabel, marginBottom: 4 }}>Level meter <span style={{ fontWeight: 500, opacity: 0.8 }}>— live during playback</span></div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden' }}>
                <div ref={meterBarRef} style={{ height: '100%', width: '0%', background: '#10B981', transition: 'width 0.05s linear' }} />
              </div>
            </div>
          </div>

          </>)}

          {exportPanelOpen && (<>
          {/* Export */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Export settings</div>
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
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '8px 0 0' }}>Estimated size: ~{estimatedExportMB} MB</p>
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
                <button onClick={handleBurnCaptions} disabled={isBurningAnything} style={{ ...primaryBtn(isBurningAnything), width: '100%', marginTop: 8, padding: '10px 20px', fontSize: '0.85rem' }}>
                  {isBurning ? `${BURN_STATUS_LABEL[burnStatus] || 'Working…'} ${Math.round(burnProgress * 100)}%${burnEta ? ` — ${burnEta}` : ''}` : '🔥 Burn captions & export final video'}
                </button>
                {isBurning && (
                  <>
                    <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: T.muted }}>Keep this tab open while the final video renders.</p>
                    <button onClick={handleCancelBurnCaptions} style={{ ...smallBtn, marginTop: 6 }}>Cancel</button>
                  </>
                )}
                {burnStatus === 'error' && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {burnError}</div>}
              </>
            )}
          </div>

          {/* Burn Subtitles — separate from Auto Captions above: no
              transcription, no AI, the user already has an .srt/.vtt file.
              Reuses the exact same styled ffmpeg burn-in engine (see
              handleBurnSubtitles), just with an uploaded file's cues
              instead of a generated transcript's. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Burn Subtitles</div>
            {!mainClips.length ? (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Add a clip to the timeline, then burn a subtitle file into it here.</p>
            ) : !uploadedSubtitle ? (
              <>
                <p style={{ fontSize: '0.7rem', color: T.muted, margin: '0 0 8px' }}>Already have captions? Upload an .srt or .vtt file to burn them directly into your video — no transcription needed.</p>
                <UploadBox accept=".srt,.vtt,text/vtt,application/x-subrip" onFiles={handleSubtitleFile} maxSizeMB={5} compact compactLabel="+ Upload .srt or .vtt file" />
                {subtitleParseError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {subtitleParseError}</div>}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: '0.72rem', color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {subtitleFileName} · {uploadedSubtitle.segments.length} cue{uploadedSubtitle.segments.length === 1 ? '' : 's'}
                  </span>
                  <button onClick={handleRemoveSubtitle} style={{ ...smallBtn, padding: '5px 10px', flexShrink: 0 }}>Remove</button>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <label style={fieldLabel}>Font size {subtitleStyle.fontSize}px
                    <input type="range" min={16} max={56} step={2} value={subtitleStyle.fontSize}
                      onChange={(e) => setSubtitleStyle((s) => ({ ...s, fontSize: parseInt(e.target.value, 10) }))} style={{ width: 110 }} />
                  </label>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: 4 }}>Position</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {SUBTITLE_POSITION_OPTIONS.map((p) => (
                        <button key={p.id} onClick={() => setSubtitleStyle((s) => ({ ...s, position: p.id }))}
                          style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.68rem', background: subtitleStyle.position === p.id ? T.accentGradient : 'white', color: subtitleStyle.position === p.id ? 'white' : T.inkSecondary, border: subtitleStyle.position === p.id ? 'none' : `1px solid ${T.border}` }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>Text color
                    <input type="color" value={subtitleStyle.color} onChange={(e) => setSubtitleStyle((s) => ({ ...s, color: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                  </label>
                  <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>Outline color
                    <input type="color" value={subtitleStyle.outlineColor} onChange={(e) => setSubtitleStyle((s) => ({ ...s, outlineColor: e.target.value }))} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                  </label>
                  <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={(subtitleStyle.backgroundOpacity ?? 0) > 0} onChange={(e) => setSubtitleStyle((s) => ({ ...s, backgroundOpacity: e.target.checked ? 0.6 : 0 }))} />
                    Background box
                  </label>
                  {(subtitleStyle.backgroundOpacity ?? 0) > 0 && (
                    <label style={fieldLabel}>Opacity {Math.round(subtitleStyle.backgroundOpacity * 100)}%
                      <input type="range" min={0.2} max={1} step={0.05} value={subtitleStyle.backgroundOpacity}
                        onChange={(e) => setSubtitleStyle((s) => ({ ...s, backgroundOpacity: parseFloat(e.target.value) }))} style={{ width: 90 }} />
                    </label>
                  )}
                </div>

                <button onClick={handleBurnSubtitles} disabled={isBurningAnything} style={{ ...primaryBtn(isBurningAnything), width: '100%', padding: '10px 20px', fontSize: '0.85rem' }}>
                  {isBurningSubtitles ? `${BURN_SUBTITLE_STATUS_LABEL[burnSubtitleStatus] || 'Working…'} ${Math.round(burnSubtitleProgress * 100)}%${burnSubtitleEta ? ` — ${burnSubtitleEta}` : ''}` : '🔥 Burn subtitles & export final video'}
                </button>
                {isBurningSubtitles && (
                  <>
                    <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: T.muted }}>Keep this tab open while the final video renders.</p>
                    <button onClick={handleCancelBurnSubtitles} style={{ ...smallBtn, marginTop: 6 }}>Cancel</button>
                  </>
                )}
                {burnSubtitleStatus === 'error' && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {burnSubtitleError}</div>}
                <p style={{ fontSize: '0.64rem', color: T.muted, margin: '8px 0 0' }}>
                  Burned into the video&apos;s actual pixels — permanent, and not something a viewer can turn off. Cue timestamps are relative to this timeline as it is right now; if you trim, retime, or otherwise change the timeline afterward, re-burn so they stay in sync.
                </p>
              </>
            )}
          </div>
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
