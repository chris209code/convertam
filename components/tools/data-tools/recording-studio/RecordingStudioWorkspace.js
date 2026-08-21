'use client';

import { useEffect, useRef, useState } from 'react';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { receiveBlobHandoff } from '@/lib/media/blobHandoff';
import { validateUploadSize } from '@/lib/media/limits';
import { formatDuration } from '@/lib/media/metadata';
import { decodeAudioFile, sliceAudioBuffer } from '@/lib/media/audioEncode';
import { peaksFromAudioBuffer, drawWaveform } from '@/lib/media/waveform';
import { cleanAudioBuffer } from '@/lib/media/audioCleanup';
import { detectSilenceInBuffer, SILENCE_AGGRESSIVENESS } from '@/lib/media/silenceDetect';
import {
  createAudioTimeline, addTrack, removeTrack, renameTrack, setTrackGain, setTrackPan, setTrackMuted, setTrackSolo,
  setTrackArmed, setTrackEffect, setTrackDuck, isTrackAudible, addSource, addClip, getTrackClips, clipDuration, getTotalDuration,
  trimClip, splitClip, deleteClip, duplicateClip, moveClip, setClipGain, setClipFade, setClipSpeed,
  setMasterVolume, setMasterMuted, setMasterLimiter, clipsOverlapRange, crossfadeClips, removeSilenceFromClip,
} from '@/lib/media/audioTimeline';
import {
  createAudioContext, buildTrackChain, applyTrackChainParams, buildMasterChain, applyMasterChainParams,
  scheduleTimelinePlayback, stopAllScheduled, startMicCapture, stopMicCapture, describeMicError,
} from '@/lib/media/audioEngine';
import { renderTimelineToWav, renderTimelineToMp3 } from '@/lib/media/audioTimelineRender';
import LevelMeter from '../shared/LevelMeter';

const PREVIEW_SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const ZOOM_LEVELS = [15, 25, 40, 65, 100, 150, 220];
const TRACK_HEIGHT = 76;
const RULER_HEIGHT = 28;
const HEADER_WIDTH = 190;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function ClipBlock({ clip, source, pxPerSec, selected, preview, onSelect, onMoveStart, onTrimLeft, onTrimRight }) {
  const canvasRef = useRef(null);
  const effectiveStart = preview?.type === 'move' ? preview.start : clip.start;
  const dur = clipDuration(clip);
  const width = Math.max(6, dur * pxPerSec);
  const left = effectiveStart * pxPerSec;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source?.buffer) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = TRACK_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, TRACK_HEIGHT);
    const allPeaks = peaksFromAudioBuffer(source.buffer, 600);
    const startIdx = Math.floor((clip.sourceStart / source.duration) * allPeaks.length);
    const endIdx = Math.max(startIdx + 1, Math.ceil((clip.sourceEnd / source.duration) * allPeaks.length));
    const peaks = allPeaks.slice(startIdx, endIdx);
    drawWaveform(ctx, peaks, { x: 0, y: 4, width, height: TRACK_HEIGHT - 8, color: selected ? '#0F172A' : '#0891B2' });
  }, [source, clip.sourceStart, clip.sourceEnd, width, selected]);

  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onSelect(clip.id); onMoveStart(e, clip); }}
      title="Click to select · drag to move · drag the edges to trim"
      style={{
        position: 'absolute', left, top: 3, width, height: TRACK_HEIGHT - 6,
        background: selected ? '#FEF3C7' : '#ECFEFF',
        border: `2px solid ${selected ? '#F59E0B' : '#67E8F9'}`,
        borderRadius: 6, overflow: 'hidden', cursor: 'grab', boxSizing: 'border-box',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 4, top: 2, fontSize: '0.6rem', fontWeight: 700, color: '#0E7490', pointerEvents: 'none', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
        {source?.name || 'Clip'}
      </div>
      <div
        onPointerDown={(e) => { e.stopPropagation(); onSelect(clip.id); onTrimLeft(e, clip); }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(15,23,42,0.15)' }}
      />
      <div
        onPointerDown={(e) => { e.stopPropagation(); onSelect(clip.id); onTrimRight(e, clip); }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(15,23,42,0.15)' }}
      />
    </div>
  );
}

const smallBtn = { padding: '6px 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.74rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const iconBtn = (active) => ({ width: 26, height: 26, borderRadius: 6, border: `1px solid ${active ? 'transparent' : '#334155'}`, background: active ? T.accentGradient : 'transparent', color: active ? 'white' : '#94A3B8', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });

export default function RecordingStudioWorkspace() {
  const [timeline, setTimeline] = useState(() => createAudioTimeline());
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewRate, setPreviewRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [expandedEffectsTrackId, setExpandedEffectsTrackId] = useState(null);
  const [silenceAggr, setSilenceAggr] = useState('medium');
  const [pendingSilence, setPendingSilence] = useState(null); // { clipId, ranges, totalSeconds }
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(0.5);

  useEffect(() => { setPendingSilence(null); }, [selectedClipId]);

  const [isRecording, setIsRecording] = useState(false);
  const [liveCleanup, setLiveCleanup] = useState(true);
  const [monitorWhileRecording, setMonitorWhileRecording] = useState(true);
  const [micError, setMicError] = useState('');
  const [status, setStatus] = useState('');

  const [exportFormat, setExportFormat] = useState('wav');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportResult, setExportResult] = useState(null); // { url, blob, filename }

  const audioCtxRef = useRef(null);
  const masterNodesRef = useRef(null);
  const trackChainsRef = useRef({});
  const scheduledRef = useRef([]);
  const playStartRef = useRef({ atWall: 0, atPlayhead: 0 });
  const rafRef = useRef(null);
  const recordingRef = useRef(null);
  const recordStartPlayheadRef = useRef(0);
  const recordingLevelAnalyserRef = useRef(null);

  const timelineRef = useRef(timeline);
  const playingRef = useRef(playing);
  const playheadRef = useRef(playhead);
  const previewRateRef = useRef(previewRate);
  const loopRef = useRef(loop);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => { previewRateRef.current = previewRate; }, [previewRate]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const totalDuration = getTotalDuration(timeline);
  const selectedClip = timeline.clips.find((c) => c.id === selectedClipId) || null;
  const selectedTrack = selectedClip ? timeline.tracks.find((t) => t.id === selectedClip.trackId) : null;

  const [dragPreview, setDragPreview] = useState(null); // { type: 'move', clipId, start, trackId }
  const trackRowRefs = useRef({});

  function commit(fn) {
    const next = fn(timelineRef.current);
    if (next === timelineRef.current) return;
    setPast((p) => [...p, timelineRef.current]);
    setFuture([]);
    setTimeline(next);
  }

  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      setFuture((f) => [timelineRef.current, ...f]);
      setTimeline(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }
  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      setPast((p) => [...p, timelineRef.current]);
      setTimeline(f[0]);
      return f.slice(1);
    });
  }

  // ---- Audio graph lifecycle ----
  function ensureAudioGraph() {
    if (!audioCtxRef.current) {
      const ctx = createAudioContext();
      audioCtxRef.current = ctx;
      masterNodesRef.current = buildMasterChain(ctx, timelineRef.current);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    // Build a chain for any track that doesn't have one yet.
    timelineRef.current.tracks.forEach((t) => {
      if (!trackChainsRef.current[t.id]) {
        trackChainsRef.current[t.id] = buildTrackChain(audioCtxRef.current, t, masterNodesRef.current.gainNode);
      }
    });
    // Drop chains for tracks that no longer exist.
    Object.keys(trackChainsRef.current).forEach((id) => {
      if (!timelineRef.current.tracks.some((t) => t.id === id)) delete trackChainsRef.current[id];
    });
    return audioCtxRef.current;
  }

  function startOrRestartPlayback(fromTime) {
    const ctx = ensureAudioGraph();
    stopAllScheduled(scheduledRef.current);
    playStartRef.current = { atWall: performance.now(), atPlayhead: fromTime };
    scheduledRef.current = scheduleTimelinePlayback({
      ctx, timeline: timelineRef.current, trackChains: trackChainsRef.current, fromPlayhead: fromTime, rate: previewRateRef.current,
    });
  }

  function stopPlayback() {
    stopAllScheduled(scheduledRef.current);
    scheduledRef.current = [];
  }

  // Live params (volume/mute/solo/pan/effects/master) update the already-
  // built graph in place — no rebuild, no click. When something structural
  // changes (a track/clip edit) while actively playing, re-schedule from the
  // current position so what's audible matches the data model immediately.
  useEffect(() => {
    if (!audioCtxRef.current) return;
    timeline.tracks.forEach((t) => {
      const chain = trackChainsRef.current[t.id];
      if (chain) applyTrackChainParams(chain, t);
    });
    if (masterNodesRef.current) applyMasterChainParams(masterNodesRef.current, timeline, audioCtxRef.current);
    if (playingRef.current) startOrRestartPlayback(playheadRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  useEffect(() => {
    if (playingRef.current) startOrRestartPlayback(playheadRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRate]);

  // Cheap continuous playhead advance — no audio graph work here at all, so
  // it can tick every animation frame without ever touching live sources.
  useEffect(() => {
    if (!playing) return undefined;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      const elapsed = (performance.now() - playStartRef.current.atWall) / 1000;
      const next = playStartRef.current.atPlayhead + elapsed * previewRateRef.current;
      const total = getTotalDuration(timelineRef.current);
      if (total > 0 && next >= total) {
        if (loopRef.current) {
          startOrRestartPlayback(0);
          setPlayhead(0);
        } else {
          stopPlayback();
          setPlaying(false);
          setPlayhead(total);
          return;
        }
      } else {
        setPlayhead(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  useEffect(() => () => { stopPlayback(); if (audioCtxRef.current) audioCtxRef.current.close(); }, []);

  useEffect(() => {
    (async () => {
      const handoff = await receiveBlobHandoff('recording-studio');
      if (handoff) await importBlob(handoff.blob, handoff.filename || 'Imported audio');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Transport ----
  function handleTogglePlay() {
    if (playing) {
      stopPlayback();
      setPlaying(false);
      return;
    }
    ensureAudioGraph();
    startOrRestartPlayback(playhead);
    setPlaying(true);
  }
  function handleStop() {
    stopPlayback();
    setPlaying(false);
    setPlayhead(0);
  }
  function handleSeek(newTime) {
    const clamped = clamp(newTime, 0, Math.max(totalDuration, newTime));
    setPlayhead(clamped);
    if (playing) startOrRestartPlayback(clamped);
  }

  // ---- Tracks ----
  function handleAddTrack() {
    commit((tl) => addTrack(tl, `Track ${tl.tracks.length + 1}`).timeline);
  }
  function handleArmTrack(trackId) {
    commit((tl) => ({ ...tl, tracks: tl.tracks.map((t) => ({ ...t, armed: t.id === trackId })) }));
  }

  // ---- Import ----
  async function importBlob(blob, name) {
    setStatus('Reading audio…');
    try {
      const file = blob instanceof File ? blob : new File([blob], name, { type: blob.type || 'audio/webm' });
      const sizeError = validateUploadSize(file, 'audio');
      if (sizeError) { setMicError(sizeError); setStatus(''); return; }
      const buffer = await decodeAudioFile(file);
      commit((tl) => {
        const { timeline: tl2, track } = addTrack(tl, name.replace(/\.[^.]+$/, '') || `Track ${tl.tracks.length + 1}`);
        const { timeline: tl3, source } = addSource(tl2, { name, buffer });
        return addClip(tl3, track.id, source.id, {}).timeline;
      });
    } catch {
      setMicError('Could not read this audio file — it may be an unsupported or corrupted format.');
    } finally {
      setStatus('');
    }
  }
  function handleImportFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => importBlob(f, f.name));
  }

  // ---- Recording ----
  async function handleToggleRecord() {
    if (isRecording) {
      const rec = recordingRef.current;
      if (rec) rec.mediaRecorder.stop();
      return;
    }
    setMicError('');
    const armedTrack = timeline.tracks.find((t) => t.armed) || timeline.tracks[0];
    try {
      const ctx = ensureAudioGraph();
      let tl = timeline;
      let targetTrack = armedTrack;
      if (!targetTrack) {
        const { timeline: tl2, track } = addTrack(tl, 'Track 1');
        tl = tl2; targetTrack = track;
        commit(() => tl);
      }
      const { mediaRecorder, micStream, cleanupNodes } = await startMicCapture({ ctx, liveCleanup, cleanupIntensity: 'medium' });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(micStream).connect(analyser);
      recordingLevelAnalyserRef.current = analyser;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        stopMicCapture({ micStream, cleanupNodes });
        recordingRef.current = null;
        setIsRecording(false);
        recordingLevelAnalyserRef.current = null;
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const startTime = recordStartPlayheadRef.current;
        await finalizeRecording(blob, targetTrack.id, startTime);
        if (playingRef.current) { stopPlayback(); setPlaying(false); }
        // Land the playhead back where recording began — with nothing
        // playing back before, the monitor loop below (when it ran at all)
        // had no total duration to bound itself against and free-runs past
        // "now," so leaving it wherever that drifted to would strand it
        // past the very clip that was just recorded.
        setPlayhead(startTime);
      };

      recordingRef.current = { mediaRecorder, micStream, cleanupNodes };
      recordStartPlayheadRef.current = playhead;
      mediaRecorder.start();
      setIsRecording(true);
      // Only start the monitor playback if there's actually something to
      // overdub against — on an empty timeline (recording the first-ever
      // clip) there's nothing to hear yet, and starting it anyway would run
      // the transport against a zero total duration with nothing to stop it.
      if (monitorWhileRecording && !playing && tl.clips.length > 0) {
        startOrRestartPlayback(playhead);
        setPlaying(true);
      }
    } catch (err) {
      setMicError(describeMicError(err));
    }
  }

  async function finalizeRecording(blob, trackId, startTime) {
    setStatus('Processing your recording…');
    try {
      const file = new File([blob], 'recording', { type: blob.type });
      const buffer = await decodeAudioFile(file);
      commit((tl) => {
        const overlaps = clipsOverlapRange(tl, trackId, startTime, buffer.duration);
        let workingTl = tl;
        let finalTrackId = trackId;
        if (overlaps) {
          const original = tl.tracks.find((t) => t.id === trackId);
          const takeNumber = tl.tracks.filter((t) => t.name.startsWith(`${original?.name} (Take`)).length + 2;
          const { timeline: tl2, track } = addTrack(workingTl, `${original?.name || 'Track'} (Take ${takeNumber})`);
          workingTl = tl2;
          finalTrackId = track.id;
        }
        const { timeline: tl3, source } = addSource(workingTl, { name: `Recording ${new Date().toLocaleTimeString()}`, buffer });
        return addClip(tl3, finalTrackId, source.id, { start: startTime }).timeline;
      });
    } catch {
      setMicError('Could not process the recording. Please try again.');
    } finally {
      setStatus('');
    }
  }

  // ---- Clip editing ----
  function handleSplitAtPlayhead() {
    if (!selectedClip) return;
    commit((tl) => splitClip(tl, selectedClip.id, playhead));
  }
  function handleDeleteClip() {
    if (!selectedClip) return;
    commit((tl) => deleteClip(tl, selectedClip.id));
    setSelectedClipId(null);
  }
  function handleDuplicateClip() {
    if (!selectedClip) return;
    commit((tl) => duplicateClip(tl, selectedClip.id));
  }
  async function handleCleanClip() {
    if (!selectedClip) return;
    const source = timeline.sources.find((s) => s.id === selectedClip.sourceId);
    if (!source) return;
    setStatus('Cleaning audio…');
    try {
      const slice = sliceAudioBuffer(source.buffer, selectedClip.sourceStart, selectedClip.sourceEnd);
      const cleaned = await cleanAudioBuffer(slice, { intensity: 'medium', normalize: false });
      commit((tl) => {
        const { timeline: tl2, source: newSource } = addSource(tl, { name: `${source.name} (cleaned)`, buffer: cleaned });
        return {
          ...tl2,
          clips: tl2.clips.map((c) => (c.id === selectedClip.id ? { ...c, sourceId: newSource.id, sourceStart: 0, sourceEnd: cleaned.duration } : c)),
        };
      });
    } catch {
      setMicError('Could not clean this clip\'s audio. Please try again.');
    } finally {
      setStatus('');
    }
  }
  async function handleNormalizeClip() {
    if (!selectedClip) return;
    const source = timeline.sources.find((s) => s.id === selectedClip.sourceId);
    if (!source) return;
    setStatus('Normalizing…');
    try {
      const slice = sliceAudioBuffer(source.buffer, selectedClip.sourceStart, selectedClip.sourceEnd);
      const normalized = await cleanAudioBuffer(slice, { intensity: 'light', reduceHum: false, normalize: true });
      commit((tl) => {
        const { timeline: tl2, source: newSource } = addSource(tl, { name: `${source.name} (normalized)`, buffer: normalized });
        return {
          ...tl2,
          clips: tl2.clips.map((c) => (c.id === selectedClip.id ? { ...c, sourceId: newSource.id, sourceStart: 0, sourceEnd: normalized.duration } : c)),
        };
      });
    } catch {
      setMicError('Could not normalize this clip. Please try again.');
    } finally {
      setStatus('');
    }
  }
  // A single one-click preset combining noise reduction, a voice-presence
  // EQ boost, and loudness normalization — the common "just make my voice
  // sound good" case that would otherwise take three separate actions
  // (Clean, then manually reasoning about EQ, then Normalize).
  async function handleEnhanceVoiceClip() {
    if (!selectedClip) return;
    const source = timeline.sources.find((s) => s.id === selectedClip.sourceId);
    if (!source) return;
    setStatus('Enhancing voice…');
    try {
      const slice = sliceAudioBuffer(source.buffer, selectedClip.sourceStart, selectedClip.sourceEnd);
      const enhanced = await cleanAudioBuffer(slice, { intensity: 'medium', reduceHum: true, voiceEnhance: true, normalize: true });
      commit((tl) => {
        const { timeline: tl2, source: newSource } = addSource(tl, { name: `${source.name} (enhanced)`, buffer: enhanced });
        return {
          ...tl2,
          clips: tl2.clips.map((c) => (c.id === selectedClip.id ? { ...c, sourceId: newSource.id, sourceStart: 0, sourceEnd: enhanced.duration } : c)),
        };
      });
    } catch {
      setMicError('Could not enhance this clip\'s audio. Please try again.');
    } finally {
      setStatus('');
    }
  }
  // Detects pauses first and shows them for confirmation rather than
  // cutting immediately — same "never silently act" posture as Video
  // Editor's own silence detection, since what counts as "dead air worth
  // cutting" is ultimately the user's own call.
  function handleFindPauses() {
    if (!selectedClip) return;
    const source = timeline.sources.find((s) => s.id === selectedClip.sourceId);
    if (!source) return;
    const ranges = detectSilenceInBuffer(source.buffer, selectedClip.sourceStart, selectedClip.sourceEnd, SILENCE_AGGRESSIVENESS[silenceAggr]);
    if (!ranges.length) {
      setStatus('No pauses found in this clip.');
      setTimeout(() => setStatus(''), 2500);
      return;
    }
    const totalSeconds = ranges.reduce((sum, r) => sum + (r.end - r.start), 0);
    setPendingSilence({ clipId: selectedClip.id, ranges, totalSeconds });
  }
  function handleApplyRemoveSilence() {
    if (!pendingSilence) return;
    commit((tl) => removeSilenceFromClip(tl, pendingSilence.clipId, pendingSilence.ranges));
    setPendingSilence(null);
    setSelectedClipId(null);
  }
  function handleCrossfadeWithNext(nextClipId) {
    if (!selectedClip) return;
    commit((tl) => crossfadeClips(tl, selectedClip.id, nextClipId, crossfadeSeconds));
  }

  // ---- Drag: move / trim ----
  function handleClipMoveStart(e, clip) {
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const originStart = clip.start;
    let currentTrackId = clip.trackId;
    let currentStart = originStart;
    function onMove(ev) {
      const deltaSeconds = (ev.clientX - startClientX) / zoom;
      currentStart = Math.max(0, originStart + deltaSeconds);
      let targetTrackId = currentTrackId;
      Object.entries(trackRowRefs.current).forEach(([trackId, el]) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) targetTrackId = trackId;
      });
      currentTrackId = targetTrackId;
      setDragPreview({ type: 'move', clipId: clip.id, start: currentStart, trackId: targetTrackId });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragPreview(null);
      commit((tl) => moveClip(tl, clip.id, currentStart, currentTrackId));
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleTrimLeft(e, clip) {
    const startClientX = e.clientX;
    const originSourceStart = clip.sourceStart;
    const originStart = clip.start;
    function onMove(ev) {
      const deltaSeconds = (ev.clientX - startClientX) / zoom;
      commit((tl) => trimClip(tl, clip.id, { start: originStart + deltaSeconds, sourceStart: originSourceStart + deltaSeconds, sourceEnd: clip.sourceEnd }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  function handleTrimRight(e, clip) {
    const startClientX = e.clientX;
    const originSourceEnd = clip.sourceEnd;
    function onMove(ev) {
      const deltaSeconds = (ev.clientX - startClientX) / zoom;
      commit((tl) => trimClip(tl, clip.id, { sourceEnd: originSourceEnd + deltaSeconds }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- Export ----
  async function handleExport() {
    setExportBusy(true);
    setExportError('');
    setExportResult(null);
    try {
      const blob = exportFormat === 'mp3' ? await renderTimelineToMp3(timeline) : await renderTimelineToWav(timeline);
      if (!blob) { setExportError('Add at least one recording or imported clip before exporting.'); return; }
      const url = URL.createObjectURL(blob);
      const filename = `recording-studio-mix.${exportFormat}`;
      setExportResult({ url, blob, filename });
    } catch {
      setExportError('Could not export the mix. Please try again.');
    } finally {
      setExportBusy(false);
    }
  }
  function handleDownloadExport() {
    if (!exportResult) return;
    downloadBlob(exportResult.blob, exportFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav', exportResult.filename);
  }

  const contentWidth = Math.max(zoom * Math.max(totalDuration + 10, 40), 600);
  const anySolo = timeline.tracks.some((t) => t.solo);

  return (
    <div style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem' }}>🎛️ Recording Studio</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ ...smallBtn, background: '#1E293B', color: 'white', border: 'none' }}>
            📥 Import audio
            <input type="file" accept="audio/*" multiple onChange={handleImportFiles} style={{ display: 'none' }} />
          </label>
          <button onClick={handleAddTrack} style={{ ...smallBtn, background: '#1E293B', color: 'white', border: 'none' }}>+ Track</button>
          <button onClick={undo} disabled={past.length === 0} style={{ ...smallBtn, background: '#1E293B', color: past.length ? 'white' : '#475569', border: 'none' }}>↶ Undo</button>
          <button onClick={redo} disabled={future.length === 0} style={{ ...smallBtn, background: '#1E293B', color: future.length ? 'white' : '#475569', border: 'none' }}>↷ Redo</button>
        </div>
      </div>

      {(micError || status) && (
        <div style={{ padding: '8px 16px', background: micError ? '#7F1D1D' : '#0F172A', color: micError ? '#FECACA' : '#94A3B8', fontSize: '0.78rem' }}>
          {micError ? `⚠ ${micError}` : status}
        </div>
      )}

      {/* Transport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B', flexWrap: 'wrap' }}>
        <button onClick={handleTogglePlay} title={playing ? 'Pause' : 'Play'} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: T.accentGradient, color: 'white', fontSize: '0.95rem', cursor: 'pointer' }}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={handleStop} title="Stop" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#1E293B', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>⏹</button>
        <button
          onClick={handleToggleRecord}
          title={isRecording ? 'Stop recording' : 'Record onto the armed track'}
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: isRecording ? '#DC2626' : '#334155', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {isRecording ? '■' : '●'}
        </button>
        {isRecording && <LevelMeter analyserRef={recordingLevelAnalyserRef} width={70} />}

        <span style={{ color: 'white', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums', minWidth: 90 }}>
          {formatDuration(playhead)} / {formatDuration(totalDuration)}
        </span>

        <button onClick={() => setLoop((l) => !l)} title="Loop playback" style={iconBtn(loop)}>⟲</button>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700 }}>Speed</span>
          {PREVIEW_SPEEDS.map((r) => (
            <button key={r} onClick={() => setPreviewRate(r)} style={{ ...smallBtn, padding: '4px 8px', fontSize: '0.66rem', background: previewRate === r ? T.accentGradient : '#1E293B', color: previewRate === r ? 'white' : '#94A3B8', border: 'none' }}>{r}×</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700 }}>Zoom</span>
          <button onClick={() => setZoomIndex((z) => clamp(z - 1, 0, ZOOM_LEVELS.length - 1))} style={iconBtn(false)}>−</button>
          <button onClick={() => setZoomIndex((z) => clamp(z + 1, 0, ZOOM_LEVELS.length - 1))} style={iconBtn(false)}>+</button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#94A3B8' }}>
          <input type="checkbox" checked={liveCleanup} onChange={(e) => setLiveCleanup(e.target.checked)} />
          Reduce noise while recording
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#94A3B8' }}>
          <input type="checkbox" checked={monitorWhileRecording} onChange={(e) => setMonitorWhileRecording(e.target.checked)} />
          Listen to other tracks while recording
        </label>
        {monitorWhileRecording && (
          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>🎧 Headphones recommended — without them the mic can pick up other tracks and cause feedback.</span>
        )}
      </div>

      {/* Timeline */}
      {timeline.tracks.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', background: '#F8FAFC' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: T.ink, marginBottom: 8 }}>Add a track to get started</p>
          <p style={{ fontSize: '0.82rem', color: T.mutedDark, marginBottom: 16 }}>Record from your microphone, or import an audio file — either creates its own track.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleAddTrack} style={{ ...smallBtn, padding: '10px 20px' }}>+ Add Track</button>
            <label style={{ ...smallBtn, padding: '10px 20px', background: T.accentGradient, color: 'white', border: 'none' }}>
              📥 Import Audio
              <input type="file" accept="audio/*" multiple onChange={handleImportFiles} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', background: '#F8FAFC' }}>
          {/* Fixed track-header column */}
          <div style={{ width: HEADER_WIDTH, flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
            <div style={{ height: RULER_HEIGHT, borderBottom: `1px solid ${T.border}`, background: 'white' }} />
            {timeline.tracks.map((track) => {
              const audible = isTrackAudible(timeline, track.id);
              return (
                <div key={track.id} style={{ height: TRACK_HEIGHT, borderBottom: `1px solid ${T.border}`, padding: '6px 8px', background: audible ? 'white' : '#F1F5F9', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => handleArmTrack(track.id)} title="Arm for recording" style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${track.armed ? '#DC2626' : T.border}`, background: track.armed ? '#DC2626' : 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0 }} />
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) => commit((tl) => renameTrack(tl, track.id, e.target.value))}
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: '0.76rem', fontWeight: 700, color: T.ink, fontFamily: T.font }}
                    />
                    <button onClick={() => commit((tl) => removeTrack(tl, track.id))} title="Remove track" style={{ border: 'none', background: 'none', color: T.danger, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => commit((tl) => setTrackMuted(tl, track.id, !track.muted))} style={{ ...smallBtn, padding: '2px 7px', fontSize: '0.62rem', background: track.muted ? T.danger : 'white', color: track.muted ? 'white' : T.inkSecondary }}>M</button>
                    <button onClick={() => commit((tl) => setTrackSolo(tl, track.id, !track.solo))} style={{ ...smallBtn, padding: '2px 7px', fontSize: '0.62rem', background: track.solo ? '#F59E0B' : 'white', color: track.solo ? 'white' : T.inkSecondary }}>S</button>
                    <button onClick={() => setExpandedEffectsTrackId((id) => (id === track.id ? null : track.id))} style={{ ...smallBtn, padding: '2px 7px', fontSize: '0.62rem', background: expandedEffectsTrackId === track.id ? T.accentGradient : 'white', color: expandedEffectsTrackId === track.id ? 'white' : T.inkSecondary }}>FX</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.58rem', color: T.muted, width: 12 }}>L</span>
                    <input type="range" min={-1} max={1} step={0.05} value={track.pan} onChange={(e) => commit((tl) => setTrackPan(tl, track.id, parseFloat(e.target.value)))} style={{ flex: 1, height: 10 }} />
                    <span style={{ fontSize: '0.58rem', color: T.muted, width: 12 }}>R</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.6rem' }}>🔊</span>
                    <input type="range" min={0} max={2} step={0.05} value={track.gain} onChange={(e) => commit((tl) => setTrackGain(tl, track.id, parseFloat(e.target.value)))} style={{ flex: 1, height: 10 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable ruler + lanes */}
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ width: contentWidth, position: 'relative' }}>
              <div
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSeek((e.clientX - rect.left) / zoom);
                }}
                title="Click to seek"
                style={{ height: RULER_HEIGHT, borderBottom: `1px solid ${T.border}`, background: 'white', position: 'relative', cursor: 'pointer' }}
              >
                {Array.from({ length: Math.ceil(contentWidth / zoom / 5) + 1 }, (_, i) => i * 5).map((sec) => (
                  <div key={sec} style={{ position: 'absolute', left: sec * zoom, top: 0, bottom: 0, borderLeft: '1px solid #E2E8F0', paddingLeft: 3 }}>
                    <span style={{ fontSize: '0.6rem', color: T.mutedDark }}>{formatDuration(sec)}</span>
                  </div>
                ))}
              </div>

              {timeline.tracks.map((track) => {
                const audible = isTrackAudible(timeline, track.id);
                return (
                  <div
                    key={track.id}
                    ref={(el) => { trackRowRefs.current[track.id] = el; }}
                    onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedClipId(null); }}
                    style={{ height: TRACK_HEIGHT, borderBottom: `1px solid ${T.border}`, background: audible ? '#FDFEFF' : '#F1F5F9', position: 'relative' }}
                  >
                    {getTrackClips(timeline, track.id).map((clip) => {
                      const preview = dragPreview?.clipId === clip.id && dragPreview.trackId === track.id ? dragPreview : null;
                      if (dragPreview?.clipId === clip.id && dragPreview.trackId !== track.id) return null;
                      return (
                        <ClipBlock
                          key={clip.id}
                          clip={clip}
                          source={timeline.sources.find((s) => s.id === clip.sourceId)}
                          pxPerSec={zoom}
                          selected={selectedClipId === clip.id}
                          preview={preview}
                          onSelect={setSelectedClipId}
                          onMoveStart={handleClipMoveStart}
                          onTrimLeft={handleTrimLeft}
                          onTrimRight={handleTrimRight}
                        />
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ position: 'absolute', left: playhead * zoom, top: 0, bottom: 0, width: 2, background: '#DC2626', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      )}

      {/* Per-track effects panel */}
      {expandedEffectsTrackId && timeline.tracks.find((t) => t.id === expandedEffectsTrackId) && (
        <TrackEffectsPanel
          track={timeline.tracks.find((t) => t.id === expandedEffectsTrackId)}
          allTracks={timeline.tracks}
          onChange={(patch) => commit((tl) => setTrackEffect(tl, expandedEffectsTrackId, patch))}
          onDuckChange={(duckAgainst) => commit((tl) => setTrackDuck(tl, expandedEffectsTrackId, duckAgainst))}
          onClose={() => setExpandedEffectsTrackId(null)}
        />
      )}

      {/* Selected clip inspector */}
      {selectedClip && (
        <div style={{ padding: '12px 16px', background: 'white', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: T.ink }}>Clip · {selectedTrack?.name}</span>
          <button onClick={handleSplitAtPlayhead} style={smallBtn}>✂ Split at playhead</button>
          <button onClick={handleDuplicateClip} style={smallBtn}>⧉ Duplicate</button>
          <button onClick={handleDeleteClip} style={{ ...smallBtn, color: T.danger }}>🗑 Delete</button>
          <button onClick={handleCleanClip} style={smallBtn}>🧹 Clean Audio</button>
          <button onClick={handleNormalizeClip} style={smallBtn}>📶 Normalize</button>
          <button onClick={handleEnhanceVoiceClip} style={smallBtn}>🎙️ Enhance Voice</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select value={silenceAggr} onChange={(e) => setSilenceAggr(e.target.value)} style={{ ...smallBtn, padding: '6px 8px' }}>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <button onClick={handleFindPauses} style={smallBtn}>🔇 Find Pauses</button>
          </div>
          {selectedTrack && (() => {
            const trackClips = getTrackClips(timeline, selectedTrack.id);
            const idx = trackClips.findIndex((c) => c.id === selectedClip.id);
            const nextClip = trackClips[idx + 1];
            if (!nextClip) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleCrossfadeWithNext(nextClip.id)} style={smallBtn} title="Overlaps this clip's end with the next clip's start, fading between them">🔀 Crossfade next</button>
                <input
                  type="number" min={0.1} max={5} step={0.1} value={crossfadeSeconds}
                  onChange={(e) => setCrossfadeSeconds(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
                  style={{ width: 46, padding: '4px 6px', borderRadius: 6, border: `1px solid ${T.border}` }}
                />
                <span style={{ fontSize: '0.7rem', color: T.mutedDark }}>sec</span>
              </div>
            );
          })()}
          {pendingSilence && pendingSilence.clipId === selectedClip.id && (
            <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0 0' }}>
              <span style={{ fontSize: '0.74rem', color: T.mutedDark }}>
                Found {pendingSilence.ranges.length} pause{pendingSilence.ranges.length === 1 ? '' : 's'} totaling {pendingSilence.totalSeconds.toFixed(1)}s
              </span>
              <button onClick={handleApplyRemoveSilence} style={{ ...smallBtn, background: T.accentGradient, color: 'white', border: 'none' }}>Remove them</button>
              <button onClick={() => setPendingSilence(null)} style={smallBtn}>Cancel</button>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
            Gain
            <input type="range" min={0} max={2} step={0.05} value={selectedClip.gain} onChange={(e) => commit((tl) => setClipGain(tl, selectedClip.id, parseFloat(e.target.value)))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
            Fade in
            <input type="range" min={0} max={Math.max(0.1, clipDuration(selectedClip) / 2)} step={0.05} value={selectedClip.fadeIn} onChange={(e) => commit((tl) => setClipFade(tl, selectedClip.id, { fadeIn: parseFloat(e.target.value) }))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
            Fade out
            <input type="range" min={0} max={Math.max(0.1, clipDuration(selectedClip) / 2)} step={0.05} value={selectedClip.fadeOut} onChange={(e) => commit((tl) => setClipFade(tl, selectedClip.id, { fadeOut: parseFloat(e.target.value) }))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }} title="Also changes pitch, like a tape-speed change — this is an actual export-affecting effect, not the transport's preview-only speed above.">
            Speed (changes pitch)
            <input type="range" min={0.5} max={2} step={0.05} value={selectedClip.speed} onChange={(e) => commit((tl) => setClipSpeed(tl, selectedClip.id, parseFloat(e.target.value)))} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedClip.speed.toFixed(2)}×</span>
          </label>
        </div>
      )}

      {/* Master + export */}
      <div style={{ padding: '12px 16px', background: '#0F172A', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white' }}>Master</span>
          <button onClick={() => commit((tl) => setMasterMuted(tl, !tl.masterMuted))} style={{ ...smallBtn, padding: '4px 9px', fontSize: '0.66rem', background: timeline.masterMuted ? T.danger : '#1E293B', color: 'white', border: 'none' }}>{timeline.masterMuted ? 'Muted' : 'Mute'}</button>
          <input type="range" min={0} max={2} step={0.05} value={timeline.masterVolume} onChange={(e) => commit((tl) => setMasterVolume(tl, parseFloat(e.target.value)))} />
          <LevelMeter analyserRef={{ current: masterNodesRef.current?.analyserNode }} width={90} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: '#94A3B8' }}>
            <input type="checkbox" checked={timeline.masterLimiter} onChange={(e) => commit((tl) => setMasterLimiter(tl, e.target.checked))} />
            Safety limiter
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['wav', 'mp3'].map((fmt) => (
              <button key={fmt} onClick={() => setExportFormat(fmt)} style={{ ...smallBtn, padding: '5px 12px', textTransform: 'uppercase', background: exportFormat === fmt ? T.accentGradient : '#1E293B', color: exportFormat === fmt ? 'white' : '#94A3B8', border: 'none' }}>{fmt}</button>
            ))}
          </div>
          <button onClick={handleExport} disabled={exportBusy || timeline.clips.length === 0} style={{ ...smallBtn, padding: '8px 18px', background: exportBusy ? '#475569' : T.accentGradient, color: 'white', border: 'none' }}>
            {exportBusy ? 'Mixing down…' : '⬇ Export Mix'}
          </button>
          {exportResult && (
            <button onClick={handleDownloadExport} style={{ ...smallBtn, padding: '8px 18px', background: T.success, color: 'white', border: 'none' }}>Download {exportResult.filename}</button>
          )}
        </div>
        {exportError && <span style={{ fontSize: '0.74rem', color: '#FCA5A5' }}>{exportError}</span>}
      </div>

      <p style={{ margin: 0, padding: '8px 16px', fontSize: '0.68rem', color: '#64748B', background: '#0B1120' }}>
        Everything here — recording, editing, effects, and export — runs locally in your browser. Nothing is uploaded to a server.
      </p>
    </div>
  );
}

function TrackEffectsPanel({ track, allTracks, onChange, onDuckChange, onClose }) {
  const e = track.effects;
  return (
    <div style={{ padding: '12px 16px', background: '#EFF6FF', borderTop: `1px solid ${T.accentBorder}`, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: T.ink }}>Effects · {track.name}</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }} title="Automatically lowers this track's volume whenever the chosen track has signal — e.g. duck background music under a vocal track">
        Duck under
        <select
          value={track.duckAgainst || ''}
          onChange={(ev) => onDuckChange(ev.target.value || null)}
          style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: '0.72rem' }}
        >
          <option value="">None</option>
          {allTracks.filter((t) => t.id !== track.id).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
        Bass
        <input type="range" min={-12} max={12} step={1} value={e.bassDb} onChange={(ev) => onChange({ bassDb: parseFloat(ev.target.value) })} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
        Treble
        <input type="range" min={-12} max={12} step={1} value={e.trebleDb} onChange={(ev) => onChange({ trebleDb: parseFloat(ev.target.value) })} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
        Compressor
        <input type="range" min={0} max={100} step={5} value={e.compressorAmount} onChange={(ev) => onChange({ compressorAmount: parseFloat(ev.target.value) })} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
        Reverb
        <input type="range" min={0} max={100} step={5} value={e.reverbAmount} onChange={(ev) => onChange({ reverbAmount: parseFloat(ev.target.value) })} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: T.mutedDark }}>
        Echo
        <input type="range" min={0} max={100} step={5} value={e.echoAmount} onChange={(ev) => onChange({ echoAmount: parseFloat(ev.target.value) })} />
      </label>
      <button onClick={onClose} style={{ ...smallBtn, marginLeft: 'auto' }}>Close</button>
    </div>
  );
}
