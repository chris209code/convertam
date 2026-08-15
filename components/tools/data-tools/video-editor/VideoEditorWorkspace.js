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
  createTimeline, addSource, addClip, trimClip, splitClip, deleteClip, joinClips, reorderClip,
  setClipAudioMode, setCompositionMode, setDividerRatio, setPipCorner, setPipPosition, setPipSizeRatio,
  setFitMode, setBackgroundFill, setFrameAspect,
  getTrackClips, getTotalDuration, findActiveClipAt, clipDuration, MAIN_TRACK, OVERLAY_TRACK,
} from '@/lib/media/timeline';
import { drawCompositionFrame, computeLayoutRects, pipPositionFromPoint, getComposeSize } from '@/lib/media/compositionLayouts';
import { renderTimeline, isTimelineExportSupported } from '@/lib/media/timelineRender';

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

  const canvasRef = useRef(null);
  const mainVideoRef = useRef(null);
  const overlayVideoRef = useRef(null);
  const overlayImageRef = useRef(null);
  const rafRef = useRef(null);
  const lastMainClipRef = useRef(null);
  const lastOverlayClipRef = useRef(null);
  const lastOverlayImageRef = useRef(null);

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

  const dragIndexRef = useRef(null);
  function handleDragStart(index) { dragIndexRef.current = index; }
  function handleDrop(track, index) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;
    const clip = getTrackClips(timeline, track)[from];
    commit((tl) => reorderClip(tl, clip.id, index));
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

    async function tick() {
      if (cancelled) return;
      const mainHit = findActiveClipAt(timeline, MAIN_TRACK, playhead);
      const overlayHit = isComposed ? findActiveClipAt(timeline, OVERLAY_TRACK, playhead) : null;
      const overlaySource = overlayHit ? timeline.sources.find((s) => s.id === overlayHit.clip.sourceId) : null;
      const overlayIsImage = overlaySource?.kind === 'image';

      if (mainHit) {
        await loadClip(mainVideoRef.current, mainHit.clip, lastMainClipRef);
        if (Math.abs(mainVideoRef.current.currentTime - mainHit.sourceTime) > 0.15) {
          mainVideoRef.current.currentTime = mainHit.sourceTime;
        }
      }
      if (overlayHit && overlayIsImage) {
        await loadImage(overlayImageRef.current, overlayHit.clip, lastOverlayImageRef);
      } else if (overlayHit) {
        await loadClip(overlayVideoRef.current, overlayHit.clip, lastOverlayClipRef);
        if (Math.abs(overlayVideoRef.current.currentTime - overlayHit.sourceTime) > 0.15) {
          overlayVideoRef.current.currentTime = overlayHit.sourceTime;
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
        rounded: true,
        border: true,
      });

      if (playing) {
        setPlayhead((t) => {
          const next = t + 1 / 30;
          if (next >= totalDuration) { setPlaying(false); return totalDuration; }
          return next;
        });
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
          <div style={{ background: '#0F172A', borderRadius: 10, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={composeW}
              height={composeH}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              onPointerCancel={handleOverlayPointerUp}
              style={{
                width: '100%', height: 'auto', display: 'block',
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
            <button onClick={() => setPlaying((p) => !p)} style={playBtn}>{playing ? '⏸' : '▶'}</button>
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
            <div style={{ display: 'flex', gap: 3, minHeight: 38 }}>
              {mainClips.map((clip, i) => (
                <div
                  key={clip.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(MAIN_TRACK, i)}
                  onClick={() => setSelectedClipId(clip.id)}
                  style={{
                    flex: clipDuration(clip) || 1, minWidth: 40, height: 38, borderRadius: 7, cursor: 'grab',
                    background: clip.id === selectedClipId ? T.accentGradient : T.accentTint,
                    border: clip.id === selectedClipId ? `2px solid ${T.accentDark}` : `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.66rem', fontWeight: 700, color: clip.id === selectedClipId ? 'white' : T.inkSecondary,
                    padding: '0 4px', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                  title={`${formatDuration(clipDuration(clip))} — click to edit, drag to reorder`}
                >
                  {formatDuration(clipDuration(clip))}
                </div>
              ))}
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
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedSource.kind !== 'image' && <button onClick={handleSplitAtPlayhead} style={smallBtn}>✂ Split at playhead</button>}
                  {selectedSource.kind !== 'image' && <button onClick={() => handleJoinWithNext(selectedClip.track)} style={smallBtn}>⤵ Join with next</button>}
                  <button onClick={handleDeleteSelected} style={{ ...smallBtn, color: '#DC2626', borderColor: '#FCA5A5' }}>✕ Delete clip</button>
                </div>
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
            </div>
            {uploadError && <div style={{ ...statusBox, marginTop: 8 }}>⚠️ {uploadError}</div>}
          </div>

          {/* Composition — always visible, not just after an overlay exists */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Composition</div>

            <div style={{ marginBottom: 10 }}>
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
