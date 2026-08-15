'use client';

// P1: non-destructive editing + composition, built as a new workspace on
// top of the same lib/media engine P0 already shipped — reuses
// extractVideoMetadata, ffmpegClient's lazy-loaded ffmpeg.wasm singleton,
// UploadBox, downloadBlob, and the T theme tokens rather than introducing
// any parallel infrastructure. lib/media/timeline.js, compositionLayouts.js
// and timelineRender.js are the only new engine modules.

import { Fragment, useEffect, useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { extractVideoMetadata, extractImageMetadata, extractAudioMetadata, formatDuration } from '@/lib/media/metadata';
import { validateUploadSize, MAX_UPLOAD_VIDEO_BYTES, MAX_UPLOAD_IMAGE_BYTES, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import {
  createTimeline, addSource, addClip, trimClip, splitClip, deleteClip, joinClips, reorderClip, duplicateClip,
  setClipAudioMode,
  addOverlayTrack, removeOverlayTrack, setOverlayTrackMode, setOverlayTrackDividerRatio,
  setOverlayTrackPipCorner, setOverlayTrackPipPosition, setOverlayTrackPipSizeRatio,
  setFitMode, setBackgroundFill, setFrameAspect,
  setClipSpeed, setClipFade, setClipFilters, setClipCropFocus, setClipTransitionOut, setClipGain, setClipReversed, setClipDucking,
  addTextOverlay, updateTextOverlay, deleteTextOverlay,
  addImageOverlay, updateImageOverlay, deleteImageOverlay,
  addShapeOverlay, updateShapeOverlay, deleteShapeOverlay,
  setExportResolution, setExportQuality,
  getTrackClips, getTotalDuration, findActiveClipAt, clipDuration, MAIN_TRACK,
} from '@/lib/media/timeline';
import { drawCompositionFrame, drawTextOverlays, drawImageOverlays, drawShapeOverlays, computeLayoutRects, pipPositionFromPoint, getComposeSize, getFadeOpacity } from '@/lib/media/compositionLayouts';
import { renderTimeline, isTimelineExportSupported } from '@/lib/media/timelineRender';
import { extractThumbnails, thumbnailsForRange } from '@/lib/media/thumbnails';
import { extractWaveformPeaks, drawWaveform } from '@/lib/media/waveform';
import { detectSilence } from '@/lib/media/silenceDetect';
import { computeNormalizationGain } from '@/lib/media/normalizeAudio';
import { duckGainAtTime } from '@/lib/media/ducking';
// Auto Captions reuses the exact same transcription/caption engine as
// Audio Studio and Video Studio — no separate implementation. It runs on
// the EXPORTED render (not the raw source clips), since that's the only
// point a multi-clip, trimmed, reordered timeline has one single, final
// audio timeline for a transcript to actually match.
import { transcribeMedia, TranscriptionError } from '@/lib/media/providers/geminiTranscription';
import { transcriptToSrt, transcriptToVtt, transcriptToAss, DEFAULT_CAPTION_STYLE } from '@/lib/media/captions';
import { transcriptToPlainText } from '@/lib/media/transcript';
import { burnAssSubtitles, FfmpegLoadError, FfmpegRenderError, FfmpegCancelledError } from '@/lib/media/ffmpegClient';
import TranscriptEditor from '../shared/TranscriptEditor';

const TRANSCRIBE_STATUS_LABEL = {
  preparing: 'Preparing audio…',
  transcribing: 'Transcribing speech…',
  merging: 'Combining transcript…',
};
const BURN_STATUS_LABEL = {
  loading: 'Loading video engine…',
  burning: 'Burning captions into video…',
};

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

export default function VideoEditorWorkspace() {
  const [timeline, setTimeline] = useState(createTimeline());
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [playhead, setPlayhead] = useState(0); // timeline-relative seconds
  const [playing, setPlaying] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const screenRecorderRef = useRef(null);
  const [renderStatus, setRenderStatus] = useState('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState(null);
  const [selectedShapeOverlayId, setSelectedShapeOverlayId] = useState(null);
  const [thumbnailsBySource, setThumbnailsBySource] = useState({}); // sourceId -> { thumbs, duration } | 'loading' | 'error'
  const [waveformBySource, setWaveformBySource] = useState({}); // sourceId -> peaks[] | 'loading' | 'error'
  const [silenceRanges, setSilenceRanges] = useState(null); // null = not run yet; [] = ran, found none; [{ start, end, selected }] = ran, found some — never applied until the user confirms
  const [silenceScanning, setSilenceScanning] = useState(false);
  const [normalizing, setNormalizing] = useState(false);

  // ---- Auto Captions state — operates on the exported render, not the
  // raw source clips (see the import comment above for why). ----
  const [exportedBlob, setExportedBlob] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState('idle'); // idle | preparing | transcribing | merging | error
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeProgress, setTranscribeProgress] = useState(null); // { chunkIndex, totalChunks } | null
  const [burnStatus, setBurnStatus] = useState('idle'); // idle | loading | burning | error
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnError, setBurnError] = useState('');
  const [burnEta, setBurnEta] = useState('');
  const burnCancelRef = useRef(null);
  const burnStartRef = useRef(0);

  const canvasRef = useRef(null);
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
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [selectedOverlayTrackId, setSelectedOverlayTrackId] = useState(null); // which overlay track's Composition controls are shown

  const totalDuration = getTotalDuration(timeline);
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
      const mainGain = ctx.createGain();
      const mainReplaceGain = ctx.createGain();
      mainGain.connect(ctx.destination);
      mainReplaceGain.connect(ctx.destination);
      audioCtxRef.current = ctx;
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
        s.gain.connect(ctx.destination);
        s.replaceGain.connect(ctx.destination);
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
      if (newClipId) setSelectedClipId(newClipId);
    } catch (err) {
      setUploadError(err.message || 'Could not read this video file.');
    }
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
      if (newClipId) setSelectedClipId(newClipId);
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
      if (newClipId) setSelectedClipId(newClipId);
    } catch (err) {
      setUploadError(err.message || 'Could not read this image file.');
    }
  }

  // ---- Screen recording: captures the user's own screen/window/tab via
  // getDisplayMedia, entirely client-side (no server ever sees the stream),
  // then feeds the finished recording through the exact same upload path a
  // real file would use — becoming the main video if the timeline is empty,
  // or a new overlay track (e.g. a webcam already in place) otherwise. ----
  async function handleStartScreenRecording() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setUploadError('Screen recording isn\'t supported in this browser. Try a recent version of Chrome or Edge.');
      return;
    }
    setUploadError('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const chunks = [];
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find((c) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingScreen(false);
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        if (!blob.size) return;
        const file = new File([blob], `screen-recording-${Date.now()}.webm`, { type: blob.type });
        if (mainClips.length) await handleOverlayFiles([file]);
        else await handleMainFiles([file]);
      };
      // Stops the recording if the user ends sharing via the browser's own
      // "Stop sharing" control, not just our in-app Stop button.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (recorder.state !== 'inactive') recorder.stop(); });
      screenRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingScreen(true);
    } catch (err) {
      // A denied/cancelled permission prompt rejects with a real DOMException
      // — not an error worth surfacing as if something broke.
      if (err?.name !== 'NotAllowedError') {
        setUploadError(err?.message || 'Could not start screen recording. Please try again.');
      }
    }
  }
  function handleStopScreenRecording() {
    screenRecorderRef.current?.stop();
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

  function handleTrimChange(field, value) {
    if (!selectedClip) return;
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    commit((tl) => trimClip(tl, selectedClip.id, {
      sourceStart: field === 'start' ? num : selectedClip.sourceStart,
      sourceEnd: field === 'end' ? num : selectedClip.sourceEnd,
    }));
  }

  function handleSplitAtPlayhead() {
    if (!selectedClip) return;
    const hit = findActiveClipAt(timeline, selectedClip.track, playhead);
    if (!hit || hit.clip.id !== selectedClip.id) return;
    commit((tl) => splitClip(tl, selectedClip.id, hit.sourceTime));
  }

  function handleDeleteSelected() {
    if (!selectedClip) return;
    const track = selectedClip.track;
    commit((tl) => {
      const next = deleteClip(tl, selectedClip.id);
      // An overlay track left with zero clips is dead weight in the track
      // list/UI — same "clean up after yourself" removeSource already does
      // for a deleted source's now-empty tracks.
      const stillHasClips = track !== MAIN_TRACK && getTrackClips(next, track).length > 0;
      return track !== MAIN_TRACK && !stillHasClips ? removeOverlayTrack(next, track) : next;
    });
    setSelectedClipId(null);
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
      } else if (type === 'crossfade') {
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
  }

  function handleTransitionDuration(clip, duration) {
    const mainList = getTrackClips(timeline, MAIN_TRACK);
    const idx = mainList.findIndex((c) => c.id === clip.id);
    const nextClip = idx >= 0 ? mainList[idx + 1] : null;
    commit((tl) => {
      let next = setClipTransitionOut(tl, clip.id, { duration });
      if (clip.transitionOut.type !== 'cut') {
        next = setClipFade(next, clip.id, { fadeOut: duration });
        // See handleSetTransition's own comment — crossfade deliberately
        // never sets the next clip's fadeIn.
        if (nextClip && clip.transitionOut.type !== 'crossfade') next = setClipFade(next, nextClip.id, { fadeIn: duration });
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
      const { timeline: withSource, source } = addSource(split, file, { width: composeW, height: composeH }, 'image');
      const withClip = addClip(withSource, source.id, MAIN_TRACK);
      const newClips = getTrackClips(withClip, MAIN_TRACK);
      const freezeClip = newClips[newClips.length - 1];
      const targetIndex = insertAfter ? newClips.findIndex((c) => c.id === insertAfter.id) + 1 : newClips.length - 1;
      const reordered = reorderClip(withClip, freezeClip.id, targetIndex);
      return trimClip(reordered, freezeClip.id, { sourceStart: 0, sourceEnd: freezeDuration });
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
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClipId, playing, playhead, timeline, past, future]);

  const dragIndexRef = useRef(null);
  function handleDragStart(index) { dragIndexRef.current = index; }
  function handleDrop(track, index) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;
    const clip = getTrackClips(timeline, track)[from];
    commit((tl) => reorderClip(tl, clip.id, index));
  }

  // ---- Drag-to-trim: pixel delta on the main track's own rendered width
  // converts to seconds via a single px-per-second ratio (the track's
  // width divided by the timeline's total duration) — clip strips are
  // flex-proportional to duration, so this ratio holds for every clip.
  // Live-updates timeline state directly (bypassing commit()) while
  // dragging so the undo stack doesn't get one entry per pixel moved; a
  // single entry for the whole drag is pushed on release instead. ----
  const mainTrackRef = useRef(null);
  const trimDragRef = useRef(null);

  function handleTrimHandleDown(e, clip, edge) {
    e.stopPropagation();
    e.preventDefault();
    const trackRect = mainTrackRef.current.getBoundingClientRect();
    trimDragRef.current = {
      clipId: clip.id,
      edge,
      startClientX: e.clientX,
      startValue: edge === 'start' ? clip.sourceStart : clip.sourceEnd,
      pxPerSecond: trackRect.width / (totalDuration || 1),
      speed: clip.speed || 1,
      preDragTimeline: timeline,
    };
    window.addEventListener('pointermove', handleTrimHandleMove);
    window.addEventListener('pointerup', handleTrimHandleUp);
  }
  function handleTrimHandleMove(e) {
    const drag = trimDragRef.current;
    if (!drag) return;
    const dSeconds = ((e.clientX - drag.startClientX) / drag.pxPerSecond) * drag.speed;
    const newValue = drag.startValue + dSeconds;
    setTimeline((prev) => {
      const clip = prev.clips.find((c) => c.id === drag.clipId);
      if (!clip) return prev;
      return drag.edge === 'start'
        ? trimClip(prev, drag.clipId, { sourceStart: newValue, sourceEnd: clip.sourceEnd })
        : trimClip(prev, drag.clipId, { sourceStart: clip.sourceStart, sourceEnd: newValue });
    });
  }
  function handleTrimHandleUp() {
    const drag = trimDragRef.current;
    trimDragRef.current = null;
    window.removeEventListener('pointermove', handleTrimHandleMove);
    window.removeEventListener('pointerup', handleTrimHandleUp);
    if (drag) {
      setPast((p) => [...p, drag.preDragTimeline]);
      setFuture([]);
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

        if (audioCtxRef.current && s.gain && s.replaceGain) {
          if (hit && (isImage || hit.clip.reversed)) {
            // An image has no video audio track of its own, but can still
            // carry replace/mix audio (e.g. narration under a title card).
            // A reversed clip's own audio can't be scrubbed backward live —
            // silenced here, correctly reversed in the actual export.
            if (isImage) await applyReplacementAudioLive(hit.clip, 0, s.replaceAudioEl, s.replaceGain, s.replaceSrcNodeRef, s.replaceLastClipIdRef);
            s.gain.gain.value = 0;
          } else if (hit) {
            const elapsedInClip = hit.sourceTime - hit.clip.sourceStart;
            const layerDuckGain = hit.clip.duckBackground && hit.clip.audioMode === 'mix'
              ? duckGainAtTime(waveformBySource[hit.clip.sourceId], timeline.sources.find((s2) => s2.id === hit.clip.sourceId)?.duration, hit.sourceTime)
              : 1;
            const mixKeepsOwnAudio = await applyReplacementAudioLive(hit.clip, elapsedInClip, s.replaceAudioEl, s.replaceGain, s.replaceSrcNodeRef, s.replaceLastClipIdRef, layerDuckGain);
            s.gain.gain.value = ((hit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * opacity * (hit.clip.gain ?? 1);
          } else {
            s.gain.gain.value = 0;
            s.replaceGain.gain.value = 0;
          }
        }

        if (hit) drawnOverlayLayers.push({ trackId: track.id, el: isImage ? s.imageEl : s.videoEl, clip: hit.clip, opacity });
      }

      // 'crossfade' transition tail: draw the NEXT main-track clip, frozen
      // on its own first frame, dissolving in over the outgoing clip's last
      // fadeOut seconds — see TRANSITION_OPTIONS' comment for why it's held
      // frozen rather than played.
      let crossfadeLayer = null;
      if (mainHit && mainHit.clip.transitionOut?.type === 'crossfade' && mainHit.clip.fadeOut > 0) {
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

      // A live drag overrides the dragged track's committed pipPosition for
      // this frame only — nothing is written to state until pointerup, so
      // the preview stays live without spamming undo history.
      const drawTimeline = livePipPositionRef.current
        ? { ...timeline, overlayTracks: timeline.overlayTracks.map((t) => (t.id === livePipPositionRef.current.trackId ? { ...t, pipPosition: livePipPositionRef.current.position } : t)) }
        : timeline;

      drawCompositionFrame(ctx, {
        timeline: drawTimeline,
        mainEl: mainHit ? mainVideoRef.current : null,
        mainClip: mainHit?.clip || null,
        mainOpacity,
        crossfadeEl: crossfadeLayer?.el || null,
        crossfadeClip: crossfadeLayer?.clip || null,
        crossfadeOpacity: crossfadeLayer?.opacity || 0,
        overlayLayers: drawnOverlayLayers,
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

  // Hit-tests overlay tracks top-most first (last in overlayTracks = drawn
  // last = visually on top), so a drag on overlapping tiles grabs whichever
  // one is actually visible at that point.
  function handleOverlayPointerDown(e) {
    const point = canvasPointFromEvent(e);
    const rects = computeLayoutRects(timeline, composeW, composeH);
    for (let i = timeline.overlayTracks.length - 1; i >= 0; i--) {
      const track = timeline.overlayTracks[i];
      if (track.mode !== 'pip') continue;
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
    if (!dragStateRef.current) return;
    const track = timeline.overlayTracks.find((t) => t.id === dragStateRef.current.trackId);
    if (!track) return;
    const point = canvasPointFromEvent(e);
    const position = pipPositionFromPoint(composeW, composeH, track.pipSizeRatio, point.x, point.y, dragStateRef.current);
    livePipPositionRef.current = { trackId: track.id, position };
  }

  function handleOverlayPointerUp() {
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
    try {
      const blob = await renderTimeline(timeline, {
        onStatus: (s) => setRenderStatus(s === 'done' ? 'idle' : s),
        onProgress: setRenderProgress,
      });
      downloadBlob(blob, 'video/mp4', 'edited-video.mp4');
      setRenderStatus('idle');
      // Kept for Auto Captions below — a fresh export invalidates any
      // transcript from a previous one (timing would no longer match), so
      // caption state is cleared here rather than left stale against a
      // render it no longer describes.
      setExportedBlob(blob);
      setTranscript(null);
      setTranscribeStatus('idle');
      setTranscribeError('');
      setBurnStatus('idle');
      setBurnError('');
    } catch (err) {
      setRenderStatus('error');
      setRenderError(err.message || 'Could not export this video. Please try again.');
    }
  }

  // ---- Auto Captions — the one operation in this tool that leaves the
  // browser: transcribeMedia() sends a compressed copy of the exported
  // video's audio to Convertam's transcription provider. Everything else
  // here (transcript editing, SRT/VTT/TXT export, caption burn-in) is the
  // same local engine already used by Audio Studio and Video Studio. ----
  async function handleTranscribeExport() {
    if (!exportedBlob) return;
    setTranscribeStatus('preparing');
    setTranscribeError('');
    setTranscribeProgress(null);
    try {
      const file = new File([exportedBlob], 'edited-video.mp4', { type: 'video/mp4' });
      const result = await transcribeMedia({
        file,
        onStatus: (s, detail) => {
          setTranscribeProgress(detail?.totalChunks > 1 ? detail : null);
          setTranscribeStatus(s === 'done' ? 'idle' : s);
        },
      });
      setTranscript(result);
      setTranscribeStatus('idle');
      setTranscribeProgress(null);
    } catch (err) {
      setTranscribeStatus('error');
      setTranscribeError(err instanceof TranscriptionError ? err.message : 'Transcription failed. Please try again.');
      setTranscribeProgress(null);
    }
  }
  function transcribeStatusLabel() {
    if (transcribeStatus === 'transcribing' && transcribeProgress) {
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

  async function handleBurnCaptions() {
    if (!exportedBlob || !transcript) return;
    setBurnError('');
    setBurnStatus('loading');
    setBurnProgress(0);
    setBurnEta('');
    const cancelToken = { cancelled: false };
    burnCancelRef.current = cancelToken;
    burnStartRef.current = Date.now();
    try {
      const videoFile = new File([exportedBlob], 'edited-video.mp4', { type: 'video/mp4' });
      const assText = transcriptToAss(transcript, DEFAULT_CAPTION_STYLE);
      setBurnStatus('burning');
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
      if (err instanceof FfmpegCancelledError || cancelToken.cancelled) {
        setBurnStatus('idle');
        setBurnProgress(0);
        setBurnEta('');
      } else {
        setBurnStatus('error');
        setBurnError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError ? err.message : 'Could not burn captions into this video. Please try again.');
      }
    } finally {
      burnCancelRef.current = null;
    }
  }

  const isExporting = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';
  const isTranscribing = transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const isBurning = burnStatus === 'loading' || burnStatus === 'burning';
  const supported = isTimelineExportSupported();

  if (!mainClips.length) {
    return (
      <div style={{ fontFamily: T.font }}>
        <UploadBox
          accept="video/*"
          onFiles={handleMainFiles}
          maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
          label="Click to choose a video to start editing, or drag it here"
        />
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button onClick={isRecordingScreen ? handleStopScreenRecording : handleStartScreenRecording} style={{ ...smallBtn, background: isRecordingScreen ? '#DC2626' : 'white', color: isRecordingScreen ? 'white' : T.inkSecondary, borderColor: isRecordingScreen ? '#DC2626' : T.border }}>
            {isRecordingScreen ? '⏹ Stop recording' : '⏺ Or record your screen'}
          </button>
        </div>
        {uploadError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {uploadError}</div>}
        <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
          Trim, cut, and reorder clips — or add a second video or image overlay for split-screen or picture-in-picture composition. Screen recording captures your screen locally in your browser and is never uploaded.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: preview, playback, timeline strips */}
        <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 440 }}>
          {/* maxHeight (not just maxWidth) keeps a Vertical (9:16) frame from
              blowing up the whole layout's height — the canvas scales down
              to whichever of width/height is more restrictive, the same way
              object-fit: contain would, so Landscape/Square/Vertical all fit
              the same on-screen budget instead of Vertical alone towering
              over everything else. */}
          <div style={{ background: '#0F172A', borderRadius: 10, overflow: 'hidden', marginBottom: 8, position: 'relative', maxHeight: 'clamp(220px, 46vh, 460px)', display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              width={composeW}
              height={composeH}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              onPointerCancel={handleOverlayPointerUp}
              style={{
                maxWidth: '100%', maxHeight: 'clamp(220px, 46vh, 460px)', width: 'auto', height: 'auto', display: 'block',
                touchAction: overlayTracks.some((t) => t.mode === 'pip') ? 'none' : 'auto',
                cursor: overlayTracks.some((t) => t.mode === 'pip') ? (isDraggingOverlay ? 'grabbing' : 'grab') : 'default',
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
          {overlayTracks.some((t) => t.mode === 'pip') && (
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '0 0 8px', textAlign: 'center' }}>
              Drag an overlay directly on the preview to reposition it.
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={handleTogglePlay} style={playBtn}>{playing ? '⏸' : '▶'}</button>
            <input
              type="range" min={0} max={totalDuration || 0.01} step={0.05} value={playhead}
              onChange={(e) => { setPlaying(false); setPlayhead(parseFloat(e.target.value)); }}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.72rem', color: T.mutedDark, minWidth: 76, textAlign: 'right' }}>
              {formatDuration(playhead)} / {formatDuration(totalDuration)}
            </span>
          </div>

          {/* Main track timeline */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <h3 style={{ margin: 0, fontSize: '0.78rem', color: T.ink }}>Main track</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={undo} disabled={!past.length} style={smallBtn}>↶ Undo</button>
                <button onClick={redo} disabled={!future.length} style={smallBtn}>↷ Redo</button>
              </div>
            </div>
            <div ref={mainTrackRef} style={{ display: 'flex', gap: 3, minHeight: 46 }}>
              {mainClips.map((clip, i) => {
                const source = timeline.sources.find((s) => s.id === clip.sourceId);
                const isSelected = clip.id === selectedClipId;
                return (
                  <div
                    key={clip.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(MAIN_TRACK, i)}
                    onClick={() => setSelectedClipId(clip.id)}
                    style={{
                      position: 'relative', flex: clipDuration(clip) || 1, minWidth: 44, height: 46, borderRadius: 7, cursor: 'grab',
                      background: isSelected ? T.accentGradient : T.accentTint,
                      border: isSelected ? `2px solid ${T.accentDark}` : `1px solid ${T.border}`,
                      overflow: 'hidden',
                    }}
                    title={`${formatDuration(clipDuration(clip))} — click to edit, drag to reorder, drag the side handles to trim`}
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
                    {isSelected && (
                      <>
                        <div
                          onPointerDown={(e) => handleTrimHandleDown(e, clip, 'start')}
                          title="Drag to trim the start"
                          style={trimHandleStyle('left')}
                        />
                        <div
                          onPointerDown={(e) => handleTrimHandleDown(e, clip, 'end')}
                          title="Drag to trim the end"
                          style={trimHandleStyle('right')}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {overlayTracks.map((track, ti) => {
            const trackClips = getTrackClips(timeline, track.id);
            if (!trackClips.length) return null;
            return (
              <div key={track.id} style={{ marginTop: ti > 0 ? 8 : 0 }}>
                <h3 style={{ margin: '0 0 5px', fontSize: '0.78rem', color: T.ink }}>Overlay track {ti + 1}</h3>
                <div style={{ display: 'flex', gap: 3, minHeight: 32 }}>
                  {trackClips.map((clip) => {
                    const clipSource = timeline.sources.find((s) => s.id === clip.sourceId);
                    const isImage = clipSource?.kind === 'image';
                    return (
                      <div
                        key={clip.id}
                        onClick={() => { setSelectedClipId(clip.id); setSelectedOverlayTrackId(track.id); }}
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

        {/* Right: persistent tool panel — always rendered, not hidden behind a click */}
        <div style={{ flex: '1 1 300px', minWidth: 280, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 2 }}>
          {/* Clip */}
          <div style={{ background: T.accentTint, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Clip</div>
            {selectedClip && selectedSource ? (
              <>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: T.ink, marginBottom: 8, wordBreak: 'break-word' }}>
                  {selectedSource.file.name} <span style={{ fontWeight: 500, color: T.mutedDark }}>({selectedClip.track === MAIN_TRACK ? 'main' : 'overlay'}{selectedSource.kind === 'image' ? ' · image' : ''})</span>
                </div>
                {selectedSource.kind === 'image' ? (
                  <p style={{ fontSize: '0.72rem', color: T.mutedDark, margin: '0 0 8px' }}>
                    Static image — shown for the whole overlay duration. Drag it directly on the preview to reposition it.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
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
                    <label style={fieldLabel}>Speed
                      <select value={selectedClip.speed} onChange={(e) => commit((tl) => setClipSpeed(tl, selectedClip.id, parseFloat(e.target.value)))} style={numInput}>
                        {SPEED_OPTIONS.map((s) => <option key={s} value={s}>{s}×</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {selectedSource.kind !== 'image' && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
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
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
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
                  <div style={{ marginBottom: 8 }}>
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
                    {selectedClip.transitionOut.type !== 'cut' && (
                      <p style={{ fontSize: '0.64rem', color: T.muted, margin: '4px 0 0' }}>Sets this clip's fade-out and the next clip's fade-in to match{selectedClip.transitionOut.type !== 'fade' ? ', and the composition background color' : ''}.</p>
                    )}
                  </div>
                )}

                {timeline.fitMode !== 'contain' && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ ...fieldLabel, marginBottom: 4 }}>Crop focus <span style={{ fontWeight: 500, opacity: 0.8 }}>— which part stays in frame</span></div>
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
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedSource.kind !== 'image' && <button onClick={handleSplitAtPlayhead} style={smallBtn}>✂ Split at playhead</button>}
                  {selectedSource.kind !== 'image' && <button onClick={() => handleJoinWithNext(selectedClip.track)} style={smallBtn}>⤵ Join with next</button>}
                  {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFreezeFrame} style={smallBtn}>❄ Freeze frame</button>}
                  {selectedClip.track === MAIN_TRACK && selectedSource.kind !== 'image' && <button onClick={handleFindSilence} disabled={silenceScanning} style={smallBtn}>{silenceScanning ? 'Scanning…' : '🔇 Find silence'}</button>}
                  {selectedSource.kind !== 'image' && (
                    <button
                      onClick={() => commit((tl) => setClipReversed(tl, selectedClip.id, !selectedClip.reversed))}
                      style={{ ...smallBtn, background: selectedClip.reversed ? T.accentGradient : 'white', color: selectedClip.reversed ? 'white' : T.inkSecondary }}
                    >
                      ⏪ {selectedClip.reversed ? 'Reversed' : 'Reverse'}
                    </button>
                  )}
                  <button onClick={handleDuplicateSelected} style={smallBtn}>⧉ Duplicate</button>
                  <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete clip</button>
                </div>

                {selectedClip.reversed && (
                  <p style={{ fontSize: '0.66rem', color: T.muted, margin: '6px 0 0' }}>
                    Reversed clips preview silently as a best-effort scrub — the exported video plays this clip backwards with its audio correctly reversed too.
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
              </>
            ) : (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Click a clip on the timeline to trim, split, join, delete it, or change its audio.</p>
            )}
          </div>

          {/* Media */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Media</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Main video</div>
                <UploadBox accept="video/*" onFiles={handleMainFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="↻ Replace this video" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Video overlay (split-screen / video call)</div>
                <UploadBox accept="video/*" onFiles={handleOverlayFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel="+ Add video overlay" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Screen recording</div>
                <button onClick={isRecordingScreen ? handleStopScreenRecording : handleStartScreenRecording} style={{ ...smallBtn, width: '100%', background: isRecordingScreen ? '#DC2626' : 'white', color: isRecordingScreen ? 'white' : T.inkSecondary, borderColor: isRecordingScreen ? '#DC2626' : T.border }}>
                  {isRecordingScreen ? '⏹ Stop recording' : '⏺ Record screen'}
                </button>
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
                <label style={fieldLabel}>Text
                  <input type="text" value={selectedTextOverlay.text} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { text: e.target.value })} style={{ ...numInput, width: '100%' }} />
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
                <label style={fieldLabel}>Background
                  <select value={selectedTextOverlay.background} onChange={(e) => handleUpdateTextOverlay(selectedTextOverlay.id, { background: e.target.value })} style={numInput}>
                    <option value="none">None</option>
                    <option value="bar">Bar</option>
                    <option value="solid">Solid</option>
                  </select>
                </label>
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
                <p style={{ fontSize: '0.66rem', color: T.muted, margin: 0 }}>Drag on the preview to reposition (coming soon) — for now, set position from templates above and fine-tune with Start/Until timing.</p>
                <button onClick={() => handleDeleteTextOverlay(selectedTextOverlay.id)} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5', alignSelf: 'flex-start' }}>✕ Delete text</button>
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

          {/* Composition — always visible, not just after an overlay exists */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Composition</div>

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

            {overlayTracks.length === 0 && (
              <p style={{ fontSize: '0.7rem', color: T.muted, margin: '0 0 8px' }}>Add a video or image overlay above to enable split-screen, picture-in-picture, or a video-call layout.</p>
            )}
            {possibleDuplicateAudio && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 8 }}>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ ...fieldLabel, marginBottom: 4 }}>Fit</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => commit((tl) => setFitMode(tl, 'cover'))} style={{ ...smallBtn, background: timeline.fitMode !== 'contain' ? T.accentGradient : 'white', color: timeline.fitMode !== 'contain' ? 'white' : T.inkSecondary, border: timeline.fitMode !== 'contain' ? 'none' : `1px solid ${T.border}` }}>Crop to fill</button>
                  <button onClick={() => commit((tl) => setFitMode(tl, 'contain'))} style={{ ...smallBtn, background: timeline.fitMode === 'contain' ? T.accentGradient : 'white', color: timeline.fitMode === 'contain' ? 'white' : T.inkSecondary, border: timeline.fitMode === 'contain' ? 'none' : `1px solid ${T.border}` }}>Fit whole frame</button>
                </div>
              </div>
              {timeline.fitMode === 'contain' && (
                <label style={fieldLabel}>Background
                  <input type="color" value={timeline.backgroundFill} onChange={(e) => commit((tl) => setBackgroundFill(tl, e.target.value))} style={{ width: 40, height: 28, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }} />
                </label>
              )}
            </div>

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
                </div>
              );
            })()}
          </div>

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
            </div>
          </div>
          {supported ? (
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <button onClick={handleExport} disabled={isExporting} style={{ ...primaryBtn(isExporting), width: '100%' }}>
                {isExporting ? `${RENDER_STATUS_LABEL[renderStatus] || 'Working…'} ${Math.round(renderProgress * 100)}%` : '⬇ Export MP4'}
              </button>
              {isExporting && <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: T.muted }}>Keep this tab open while your video exports.</p>}
              {renderStatus === 'error' && <div style={{ ...statusBox, marginTop: 8, display: 'inline-block' }}>⚠️ {renderError}</div>}
            </div>
          ) : (
            <p style={{ fontSize: '0.72rem', color: T.muted, textAlign: 'center' }}>
              Exporting isn&apos;t supported in this browser yet. Try a recent version of Chrome, Edge, or Firefox.
            </p>
          )}

          {/* Captions — the one step in this tool that isn't purely local;
              operates on the exported render (not the raw clips), since
              that's the only point a multi-clip, trimmed, reordered
              timeline has one final audio track for a transcript to match. */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Auto Captions</div>
            {!exportedBlob ? (
              <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>Export your video above, then transcribe it here to add captions.</p>
            ) : !transcript ? (
              <>
                <button onClick={handleTranscribeExport} disabled={isTranscribing} style={{ ...primaryBtn(isTranscribing), width: '100%', padding: '10px 20px', fontSize: '0.85rem' }}>
                  {isTranscribing ? transcribeStatusLabel() : '📝 Transcribe exported video'}
                </button>
                {transcribeStatus === 'error' && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {transcribeError}</div>}
              </>
            ) : (
              <>
                <TranscriptEditor transcript={transcript} onTranscriptChange={setTranscript} currentTime={playhead} onSeek={handleCaptionsSeek} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <button onClick={handleDownloadSrt} style={smallBtn}>⬇ SRT</button>
                  <button onClick={handleDownloadVtt} style={smallBtn}>⬇ VTT</button>
                  <button onClick={handleDownloadTxt} style={smallBtn}>⬇ TXT</button>
                  <button onClick={() => { setTranscript(null); setTranscribeStatus('idle'); }} style={smallBtn}>Re-transcribe</button>
                </div>
                <button onClick={handleBurnCaptions} disabled={isBurning} style={{ ...primaryBtn(isBurning), width: '100%', marginTop: 8, padding: '10px 20px', fontSize: '0.85rem' }}>
                  {isBurning ? `${BURN_STATUS_LABEL[burnStatus] || 'Working…'} ${Math.round(burnProgress * 100)}%${burnEta ? ` — ${burnEta}` : ''}` : '🔥 Burn captions into video'}
                </button>
                {burnStatus === 'error' && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {burnError}</div>}
              </>
            )}
          </div>

          <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
            Editing, composition, and export all happen locally in your browser — your video is never uploaded for those steps. Auto Captions is the one exception: a compressed copy of just the exported video&apos;s audio is sent to our transcription provider, processed for that request, and not stored afterward.
          </p>
        </div>
      </div>
    </div>
  );
}

const playBtn = { width: 40, height: 40, borderRadius: '50%', border: 'none', background: T.accentGradient, color: 'white', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 };
const smallBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const primaryBtn = (disabled) => ({ padding: '13px 32px', borderRadius: 12, border: 'none', background: disabled ? '#94A3B8' : T.accentGradient, color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: T.font });
const statusBox = { padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark };
const numInput = { padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: '0.78rem', fontFamily: T.font, width: 90 };

function trimHandleStyle(side) {
  return {
    position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 9, zIndex: 3,
    background: 'rgba(255,255,255,0.85)', cursor: 'ew-resize',
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
