'use client';

// P1: non-destructive editing + composition, built as a new workspace on
// top of the same lib/media engine P0 already shipped — reuses
// extractVideoMetadata, ffmpegClient's lazy-loaded ffmpeg.wasm singleton,
// UploadBox, downloadBlob, and the T theme tokens rather than introducing
// any parallel infrastructure. lib/media/timeline.js, compositionLayouts.js
// and timelineRender.js are the only new engine modules.

import { useEffect, useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { extractVideoMetadata, extractImageMetadata, extractAudioMetadata, formatDuration } from '@/lib/media/metadata';
import { validateUploadSize, MAX_UPLOAD_VIDEO_BYTES, MAX_UPLOAD_IMAGE_BYTES, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import {
  createTimeline, addSource, addClip, trimClip, splitClip, deleteClip, joinClips, reorderClip, duplicateClip,
  setClipAudioMode, setCompositionMode, setDividerRatio, setPipCorner, setPipPosition, setPipSizeRatio,
  setFitMode, setBackgroundFill, setFrameAspect,
  setClipSpeed, setClipFade, setClipFilters, setClipCropFocus, setClipTransitionOut,
  addTextOverlay, updateTextOverlay, deleteTextOverlay,
  addImageOverlay, updateImageOverlay, deleteImageOverlay,
  setExportResolution, setExportQuality,
  getTrackClips, getTotalDuration, findActiveClipAt, clipDuration, MAIN_TRACK, OVERLAY_TRACK,
} from '@/lib/media/timeline';
import { drawCompositionFrame, drawTextOverlays, drawImageOverlays, computeLayoutRects, pipPositionFromPoint, getComposeSize, getFadeOpacity } from '@/lib/media/compositionLayouts';
import { renderTimeline, isTimelineExportSupported } from '@/lib/media/timelineRender';
import { extractThumbnails, thumbnailsForRange } from '@/lib/media/thumbnails';
import { extractWaveformPeaks, drawWaveform } from '@/lib/media/waveform';
import { detectSilence } from '@/lib/media/silenceDetect';

const RENDER_STATUS_LABEL = {
  preparing: 'Preparing…',
  rendering: 'Rendering…',
  finalizing: 'Finalizing MP4…',
};

const COMPOSITION_MODES = [
  { id: 'single', label: 'Single video' },
  { id: 'split-lr', label: 'Split screen (side by side)' },
  { id: 'split-tb', label: 'Split screen (top/bottom)' },
  { id: 'pip', label: 'Picture-in-picture / video call' },
];

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

// 'crossfade' (blending two clips' video simultaneously) deliberately isn't
// offered here — it needs a second, always-decoding video element in both
// preview and export that this pass doesn't build. Fade/dip-to-color are
// real, implemented by reusing the existing per-clip fade engine (this
// clip's fadeOut + the next clip's fadeIn, plus the background color for
// the dip variants) rather than new rendering machinery — see
// handleSetTransition.
const TRANSITION_OPTIONS = [
  { id: 'cut', label: 'Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'dip-black', label: 'Dip to black' },
  { id: 'dip-white', label: 'Dip to white' },
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
  const [renderStatus, setRenderStatus] = useState('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState(null);
  const [thumbnailsBySource, setThumbnailsBySource] = useState({}); // sourceId -> { thumbs, duration } | 'loading' | 'error'
  const [waveformBySource, setWaveformBySource] = useState({}); // sourceId -> peaks[] | 'loading' | 'error'
  const [silenceRanges, setSilenceRanges] = useState(null); // null = not run yet; [] = ran, found none; [{ start, end, selected }] = ran, found some — never applied until the user confirms
  const [silenceScanning, setSilenceScanning] = useState(false);

  const canvasRef = useRef(null);
  const mainVideoRef = useRef(null);
  const overlayVideoRef = useRef(null);
  const overlayImageRef = useRef(null);
  const rafRef = useRef(null);
  const lastMainClipRef = useRef(null);
  const lastOverlayClipRef = useRef(null);
  const lastOverlayImageRef = useRef(null);
  // Logo/watermark <img> elements, one per imageOverlay's sourceId — plain
  // Image() objects (not part of the DOM tree, same as the text overlays
  // needing no element at all) since drawImageOverlays only ever reads
  // pixels off them via canvas drawImage, never displays them directly.
  const imageOverlayElsRef = useRef(new Map());

  // Live-preview audio graph — separate from (but modeled on) the Web Audio
  // routing timelineRender.js's composed export already uses. Built lazily,
  // on the first Play press (a real user gesture, required for browsers to
  // let audio start), rather than up front — most users open the tool,
  // trim, and only later press Play.
  const audioCtxRef = useRef(null);
  const mainGainRef = useRef(null);
  const overlayGainRef = useRef(null);
  const mainReplaceGainRef = useRef(null);
  const overlayReplaceGainRef = useRef(null);
  const mainSrcNodeRef = useRef(null);
  const overlaySrcNodeRef = useRef(null);
  const mainTappedElRef = useRef(null); // which <video> DOM node mainSrcNodeRef taps — re-tapped if it changes (see ensureAudioGraph)
  const overlayTappedElRef = useRef(null);
  const mainReplaceAudioElRef = useRef(null); // hidden <audio> for a clip's 'replace'/'mix' audioSourceId
  const overlayReplaceAudioElRef = useRef(null);
  const mainReplaceSrcNodeRef = useRef(null);
  const overlayReplaceSrcNodeRef = useRef(null);
  const mainReplaceLastClipRef = useRef(null);
  const overlayReplaceLastClipRef = useRef(null);
  // Wall-clock anchor set when Play starts: { atWall, atPlayhead }. The
  // playhead advances from real elapsed time rather than a fixed per-frame
  // step, so it never drifts away from the audio actually playing.
  const playStartRef = useRef(null);

  // Free-drag PiP repositioning: while a drag is in progress, the live
  // position lives here (not in timeline state) so every pointermove
  // doesn't spam the undo history — commit() only fires once, on release.
  const dragStateRef = useRef(null); // { dx, dy } grab offset within the overlay box, while dragging
  const livePipPositionRef = useRef(null); // { x, y } during an active drag, else null
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);

  const totalDuration = getTotalDuration(timeline);
  const mainClips = getTrackClips(timeline, MAIN_TRACK);
  const overlayClips = getTrackClips(timeline, OVERLAY_TRACK);
  const isComposed = timeline.compositionMode !== 'single';
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
  const possibleDuplicateAudio = timeline.compositionMode === 'pip'
    && mainClips.some((c) => c.audioMode === 'keep')
    && overlayClips.some((c) => c.audioMode === 'keep');

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
      const overlayGain = ctx.createGain();
      const mainReplaceGain = ctx.createGain();
      const overlayReplaceGain = ctx.createGain();
      mainGain.connect(ctx.destination);
      overlayGain.connect(ctx.destination);
      mainReplaceGain.connect(ctx.destination);
      overlayReplaceGain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      mainGainRef.current = mainGain;
      overlayGainRef.current = overlayGain;
      mainReplaceGainRef.current = mainReplaceGain;
      overlayReplaceGainRef.current = overlayReplaceGain;
      mainReplaceAudioElRef.current = new Audio();
      overlayReplaceAudioElRef.current = new Audio();
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
    if (overlayVideoRef.current && overlayTappedElRef.current !== overlayVideoRef.current) {
      overlaySrcNodeRef.current = ctx.createMediaElementSource(overlayVideoRef.current);
      overlaySrcNodeRef.current.connect(overlayGainRef.current);
      overlayVideoRef.current.muted = false;
      overlayTappedElRef.current = overlayVideoRef.current;
    }
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

  async function handleOverlayFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'video');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractVideoMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'video');
      let next = addClip(withSource, source.id, OVERLAY_TRACK);
      if (next.compositionMode === 'single') next = setCompositionMode(next, 'pip');
      const newClipId = getTrackClips(next, OVERLAY_TRACK).at(-1)?.id || null;
      commit(next);
      if (newClipId) setSelectedClipId(newClipId);
    } catch (err) {
      setUploadError(err.message || 'Could not read this video file.');
    }
  }

  // A static image overlay reuses the exact same OVERLAY_TRACK/addClip path
  // as a video overlay — only the source kind differs — so composition
  // mode, PiP positioning, split-screen, etc. all work identically.
  async function handleOverlayImageFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'image');
    if (sizeError) { setUploadError(sizeError); return; }
    setUploadError('');
    try {
      const meta = await extractImageMetadata(f);
      const { timeline: withSource, source } = addSource(timeline, f, meta, 'image');
      let next = addClip(withSource, source.id, OVERLAY_TRACK);
      if (next.compositionMode === 'single') next = setCompositionMode(next, 'pip');
      const newClipId = getTrackClips(next, OVERLAY_TRACK).at(-1)?.id || null;
      commit(next);
      if (newClipId) setSelectedClipId(newClipId);
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
    commit((tl) => deleteClip(tl, selectedClip.id));
    setSelectedClipId(null);
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
      } else {
        next = setClipFade(next, clip.id, { fadeOut: dur });
        if (nextClip) next = setClipFade(next, nextClip.id, { fadeIn: dur });
        if (type === 'dip-white') next = setBackgroundFill(next, '#FFFFFF');
        else next = setBackgroundFill(next, '#000000');
      }
      return next;
    });
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
        if (nextClip) next = setClipFade(next, nextClip.id, { fadeIn: duration });
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
    async function applyReplacementAudioLive(clip, elapsedInClip, audioEl, gainNode, srcNodeRef, lastClipIdRef) {
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
      gainNode.gain.value = 1;
      if (playing) { if (audioEl.paused) audioEl.play().catch(() => {}); } else if (!audioEl.paused) audioEl.pause();
      return clip.audioMode === 'mix';
    }

    async function tick() {
      if (cancelled) return;
      if (playing && !playStartRef.current) playStartRef.current = { atWall: performance.now(), atPlayhead: playhead };

      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, playhead);
      const overlayHit = isComposed ? findActiveClipAt(timeline, OVERLAY_TRACK, playhead) : null;
      const overlaySource = overlayHit ? timeline.sources.find((s) => s.id === overlayHit.clip.sourceId) : null;
      const overlayIsImage = overlaySource?.kind === 'image';

      if (mainHit) {
        await loadClip(mainVideoRef.current, mainHit.clip, lastMainClipRef);
        // Matching native playback rate to the clip's speed keeps native
        // playback (needed for audio) from drifting away from the
        // seek-corrected position below — at 2x speed, sourceTime advances
        // twice as fast as unscaled native playback would.
        mainVideoRef.current.playbackRate = mainHit.clip.speed || 1;
        if (Math.abs(mainVideoRef.current.currentTime - mainHit.sourceTime) > 0.15) {
          mainVideoRef.current.currentTime = mainHit.sourceTime;
        }
        syncTrackPlayback(mainVideoRef.current, true);
      } else {
        syncTrackPlayback(mainVideoRef.current, false);
      }
      if (overlayHit && overlayIsImage) {
        await loadImage(overlayImageRef.current, overlayHit.clip, lastOverlayImageRef);
        syncTrackPlayback(overlayVideoRef.current, false);
      } else if (overlayHit) {
        await loadClip(overlayVideoRef.current, overlayHit.clip, lastOverlayClipRef);
        overlayVideoRef.current.playbackRate = overlayHit.clip.speed || 1;
        if (Math.abs(overlayVideoRef.current.currentTime - overlayHit.sourceTime) > 0.15) {
          overlayVideoRef.current.currentTime = overlayHit.sourceTime;
        }
        syncTrackPlayback(overlayVideoRef.current, true);
      } else {
        syncTrackPlayback(overlayVideoRef.current, false);
      }

      const mainOpacity = mainHit ? getFadeOpacity(mainHit.clip, mainHit.sourceTime - mainHit.clip.sourceStart) : 1;
      const overlayOpacity = overlayHit && !overlayIsImage ? getFadeOpacity(overlayHit.clip, overlayHit.sourceTime - overlayHit.clip.sourceStart) : 1;

      // Audio routing only matters once the graph exists (first Play press)
      // — before that, both preview <video> elements stay muted and silent.
      // Fades apply to audio too (not just the visual), so a fading-out
      // clip doesn't cut abruptly to silence at full volume.
      if (audioCtxRef.current) {
        if (mainHit) {
          const elapsedInClip = mainHit.sourceTime - mainHit.clip.sourceStart;
          const mixKeepsOwnAudio = await applyReplacementAudioLive(mainHit.clip, elapsedInClip, mainReplaceAudioElRef.current, mainReplaceGainRef.current, mainReplaceSrcNodeRef, mainReplaceLastClipRef);
          mainGainRef.current.gain.value = ((mainHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * mainOpacity;
        } else {
          mainGainRef.current.gain.value = 0;
          mainReplaceGainRef.current.gain.value = 0;
        }
        if (overlayHit && overlayIsImage) {
          // An image has no video audio track of its own, but can still
          // carry replace/mix audio (e.g. narration under a title card).
          await applyReplacementAudioLive(overlayHit.clip, 0, overlayReplaceAudioElRef.current, overlayReplaceGainRef.current, overlayReplaceSrcNodeRef, overlayReplaceLastClipRef);
          overlayGainRef.current.gain.value = 0;
        } else if (overlayHit) {
          const elapsedInClip = overlayHit.sourceTime - overlayHit.clip.sourceStart;
          const mixKeepsOwnAudio = await applyReplacementAudioLive(overlayHit.clip, elapsedInClip, overlayReplaceAudioElRef.current, overlayReplaceGainRef.current, overlayReplaceSrcNodeRef, overlayReplaceLastClipRef);
          overlayGainRef.current.gain.value = ((overlayHit.clip.audioMode === 'keep' || mixKeepsOwnAudio) ? 1 : 0) * overlayOpacity;
        } else {
          overlayGainRef.current.gain.value = 0;
          overlayReplaceGainRef.current.gain.value = 0;
        }
      }

      // A live drag overrides the timeline's committed pipPosition for this
      // frame only — nothing is written to state until pointerup, so the
      // preview stays live without spamming undo history.
      const drawTimeline = livePipPositionRef.current
        ? { ...timeline, pipPosition: livePipPositionRef.current }
        : timeline;

      drawCompositionFrame(ctx, {
        timeline: drawTimeline,
        mainEl: mainHit ? mainVideoRef.current : null,
        overlayEl: overlayHit ? (overlayIsImage ? overlayImageRef.current : overlayVideoRef.current) : null,
        mainClip: mainHit?.clip || null,
        overlayClip: overlayHit?.clip || null,
        mainOpacity, overlayOpacity,
        rounded: true,
        border: true,
      });

      // Logo/watermark + text layers draw last, on top of everything else —
      // same shared functions the composed export uses per frame, so what
      // the preview shows is exactly what gets exported.
      timeline.imageOverlays.forEach((o) => { if (o.sourceId) ensureImageOverlayElement(o.sourceId); });
      drawImageOverlays(ctx, { timeline: drawTimeline, timelineSeconds: playhead, imageElements: imageOverlayElsRef.current });
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
  }, [timeline, playhead, playing, isComposed]);

  // ---- Free-drag PiP repositioning (mouse + touch via Pointer Events) ----
  function canvasPointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = composeW / rect.width;
    const scaleY = composeH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleOverlayPointerDown(e) {
    if (timeline.compositionMode !== 'pip' || !overlayClips.length) return;
    const point = canvasPointFromEvent(e);
    const rects = computeLayoutRects(timeline, composeW, composeH);
    if (!rects.overlay) return;
    const r = rects.overlay;
    if (point.x < r.x || point.x > r.x + r.w || point.y < r.y || point.y > r.y + r.h) return;
    e.target.setPointerCapture(e.pointerId);
    dragStateRef.current = { dx: point.x - r.x, dy: point.y - r.y };
    livePipPositionRef.current = timeline.pipPosition || { x: 1, y: 1 };
    setIsDraggingOverlay(true);
  }

  function handleOverlayPointerMove(e) {
    if (!dragStateRef.current) return;
    const point = canvasPointFromEvent(e);
    livePipPositionRef.current = pipPositionFromPoint(composeW, composeH, timeline.pipSizeRatio, point.x, point.y, dragStateRef.current);
  }

  function handleOverlayPointerUp() {
    if (!dragStateRef.current) return;
    const finalPosition = livePipPositionRef.current;
    dragStateRef.current = null;
    setIsDraggingOverlay(false);
    if (finalPosition) commit((tl) => setPipPosition(tl, finalPosition));
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
    } catch (err) {
      setRenderStatus('error');
      setRenderError(err.message || 'Could not export this video. Please try again.');
    }
  }

  const isExporting = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';
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
        {uploadError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {uploadError}</div>}
        <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
          Trim, cut, and reorder clips — or add a second video or image overlay for split-screen or picture-in-picture composition.
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
                touchAction: timeline.compositionMode === 'pip' && overlayClips.length ? 'none' : 'auto',
                cursor: timeline.compositionMode === 'pip' && overlayClips.length ? (isDraggingOverlay ? 'grabbing' : 'grab') : 'default',
              }}
            />
            <video ref={mainVideoRef} muted playsInline style={{ display: 'none' }} />
            <video ref={overlayVideoRef} muted playsInline style={{ display: 'none' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={overlayImageRef} alt="" style={{ display: 'none' }} />
          </div>
          {timeline.compositionMode === 'pip' && overlayClips.length > 0 && (
            <p style={{ fontSize: '0.68rem', color: T.muted, margin: '0 0 8px', textAlign: 'center' }}>
              Drag the overlay directly on the preview to reposition it.
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

          {overlayClips.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 5px', fontSize: '0.78rem', color: T.ink }}>Overlay track</h3>
              <div style={{ display: 'flex', gap: 3, minHeight: 32 }}>
                {overlayClips.map((clip) => {
                  const clipSource = timeline.sources.find((s) => s.id === clip.sourceId);
                  const isImage = clipSource?.kind === 'image';
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedClipId(clip.id)}
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
          )}
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
                  <button onClick={handleDuplicateSelected} style={smallBtn}>⧉ Duplicate</button>
                  <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete clip</button>
                </div>

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
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Second video (split-screen / video call)</div>
                <UploadBox accept="video/*" onFiles={handleOverlayFiles} maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)} compact compactLabel={overlayClips.some((c) => timeline.sources.find((s) => s.id === c.sourceId)?.kind === 'video') ? '↻ Replace second video' : '+ Add second video'} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Image overlay</div>
                <UploadBox accept="image/png,image/jpeg,image/webp" onFiles={handleOverlayImageFiles} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel={overlayClips.some((c) => timeline.sources.find((s) => s.id === c.sourceId)?.kind === 'image') ? '↻ Replace image overlay' : '+ Add image overlay'} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: T.mutedDark, marginBottom: 2 }}>Logo / watermark</div>
                <UploadBox accept="image/png,image/jpeg,image/webp" onFiles={handleWatermarkFile} maxSizeMB={MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} compact compactLabel={timeline.imageOverlays.length ? '+ Add another logo' : '+ Add logo/watermark'} />
              </div>
            </div>
            {uploadError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {uploadError}</div>}
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

            {overlayClips.length === 0 && (
              <p style={{ fontSize: '0.7rem', color: T.muted, margin: '0 0 8px' }}>Add a second video or image overlay above to enable split-screen or picture-in-picture.</p>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {COMPOSITION_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => commit((tl) => setCompositionMode(tl, m.id))}
                  style={{ ...smallBtn, background: timeline.compositionMode === m.id ? T.accentGradient : 'white', color: timeline.compositionMode === m.id ? 'white' : T.inkSecondary, border: timeline.compositionMode === m.id ? 'none' : `1px solid ${T.border}` }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {possibleDuplicateAudio && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', color: '#92400E' }}>
                  ⚠️ Main and overlay both keep their own audio — may sound duplicated if this is one conversation captured twice.
                </span>
                <button
                  onClick={() => commit((tl) => ({ ...tl, clips: tl.clips.map((c) => (c.track === OVERLAY_TRACK && c.audioMode === 'keep' ? { ...c, audioMode: 'mute' } : c)) }))}
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
            {(timeline.compositionMode === 'split-lr' || timeline.compositionMode === 'split-tb') && (
              <label style={fieldLabel}>Divider position
                <input type="range" min={0.2} max={0.8} step={0.02} value={timeline.dividerRatio}
                  onChange={(e) => commit((tl) => setDividerRatio(tl, parseFloat(e.target.value)))} style={{ width: '100%', maxWidth: 220 }} />
              </label>
            )}
            {timeline.compositionMode === 'pip' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 4 }}>Quick position</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {PIP_CORNER_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => commit((tl) => setPipCorner(tl, c.id))}
                        title={c.label}
                        style={{
                          ...smallBtn, padding: '6px 9px',
                          background: timeline.pipCorner === c.id ? T.accentGradient : 'white',
                          color: timeline.pipCorner === c.id ? 'white' : T.inkSecondary,
                          border: timeline.pipCorner === c.id ? 'none' : `1px solid ${T.border}`,
                        }}
                      >
                        {c.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={fieldLabel}>Size
                  <input type="range" min={0.15} max={0.5} step={0.02} value={timeline.pipSizeRatio}
                    onChange={(e) => commit((tl) => setPipSizeRatio(tl, parseFloat(e.target.value)))} style={{ width: 120 }} />
                </label>
              </div>
            )}
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
          <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
            Your videos are processed entirely in your browser and are never uploaded.
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
