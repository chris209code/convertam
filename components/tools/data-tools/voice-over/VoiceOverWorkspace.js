'use client';

// Voice Over — a standalone, purpose-built "narrate a video" tool, kept
// deliberately simple and separate from Video Editor's full timeline
// workspace (see the file header comment there). One video, one or more
// microphone takes recorded against it, a simple two-slider audio mix, and
// a real MP4 export — no tracks, no clips, no multi-track timeline.
//
// Reuses the same infrastructure Recording Studio and Screen Recorder
// already established rather than duplicating it: audioEngine.js's mic
// capture + level metering, audioCleanup.js's noise-reduction engine,
// audioEncode.js's decode/slice/stereo-WAV helpers, waveform.js's peak
// extraction/drawing, and blobHandoff.js for the Video Editor handoff.
// The one genuinely new piece is ffmpegClient.js's addAudioTrackToVideo —
// muxing a pre-mixed WAV onto the original video with -c:v copy (no
// video re-encode, so picture quality is never touched).

import { useEffect, useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { sendBlobToTool, receiveBlobHandoff } from '@/lib/media/blobHandoff';
import { extractVideoMetadata, formatDuration } from '@/lib/media/metadata';
import { validateUploadSize, MAX_UPLOAD_VIDEO_BYTES } from '@/lib/media/limits';
import { decodeAudioFile, sliceAudioBuffer, audioBufferToWavBlob } from '@/lib/media/audioEncode';
import { peaksFromAudioBuffer, drawWaveform } from '@/lib/media/waveform';
import { cleanAudioBuffer } from '@/lib/media/audioCleanup';
import { createAudioContext, startMicCapture, stopMicCapture, describeMicError } from '@/lib/media/audioEngine';
import { addAudioTrackToVideo, terminateFFmpeg, isFfmpegSupported, FfmpegLoadError, FfmpegRenderError, FfmpegCancelledError } from '@/lib/media/ffmpegClient';
import LevelMeter from '../shared/LevelMeter';

let idCounter = 0;
function nextId() { idCounter += 1; return `take-${Date.now().toString(36)}-${idCounter}`; }

const smallBtn = { padding: '8px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.8rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const primaryBtn = (disabled) => ({ padding: '11px 22px', borderRadius: 10, border: 'none', background: disabled ? '#94A3B8' : T.accentGradient, color: 'white', fontSize: '0.86rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: T.font });
const statusBox = { padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const sectionCard = { background: 'white', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16 };
const sectionTitle = { margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 800, color: T.ink };

function TakeCard({ take, active, busy, onSelect, onDelete, onTrimChange, onClean }) {
  const canvasRef = useRef(null);
  const barRef = useRef(null);
  const dur = take.buffer.duration;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = 52 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, 52);
    drawWaveform(ctx, take.peaks, { x: 0, y: 2, width, height: 48, color: active ? T.accentDark : T.accent });
  }, [take.peaks, active]);

  function startDrag(edge) {
    return (e) => {
      e.stopPropagation();
      const rect = barRef.current.getBoundingClientRect();
      function onMove(ev) {
        const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const t = frac * dur;
        if (edge === 'left') onTrimChange(take.id, { trimStart: Math.min(t, take.trimEnd - 0.15) });
        else onTrimChange(take.id, { trimEnd: Math.max(t, take.trimStart + 0.15) });
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  const leftPct = dur > 0 ? (take.trimStart / dur) * 100 : 0;
  const rightPct = dur > 0 ? (take.trimEnd / dur) * 100 : 100;

  return (
    <div
      onClick={() => onSelect(take.id)}
      title="Click to make this the active take"
      style={{
        border: active ? `2px solid ${T.accent}` : `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 10,
        cursor: 'pointer', background: active ? T.accentTint : 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.ink }}>
          {active ? '✓ ' : ''}{take.name}{take.cleaned ? ' · cleaned' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onClean(take.id); }} disabled={busy} style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.72rem' }}>🧹 Clean</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(take.id); }} style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.72rem', color: T.danger }}>🗑</button>
        </div>
      </div>
      {/* The waveform+dimming layer is clipped to rounded corners; the trim
          handles live OUTSIDE that clip in `barRef` itself (still the
          coordinate frame startDrag measures against) — a handle centered
          exactly on the 0%/100% boundary is half outside the waveform's own
          box, and a clipped ancestor doesn't just hide that half visually,
          it removes it from real pointer hit-testing too, silently making
          roughly half the handle unclickable even though it still looks
          present. */}
      <div ref={barRef} style={{ position: 'relative', height: 52 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 52, display: 'block' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${leftPct}%`, background: 'rgba(255,255,255,0.65)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${100 - rightPct}%`, background: 'rgba(255,255,255,0.65)', pointerEvents: 'none' }} />
        </div>
        <div onPointerDown={startDrag('left')} title="Drag to trim the start" style={{ position: 'absolute', left: `calc(${leftPct}% - 5px)`, top: 0, bottom: 0, width: 10, background: T.accentDark, cursor: 'ew-resize', borderRadius: 3 }} />
        <div onPointerDown={startDrag('right')} title="Drag to trim the end" style={{ position: 'absolute', left: `calc(${rightPct}% - 5px)`, top: 0, bottom: 0, width: 10, background: T.accentDark, cursor: 'ew-resize', borderRadius: 3 }} />
      </div>
      <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: T.mutedDark }}>
        Uses {formatDuration(take.trimStart)}–{formatDuration(take.trimEnd)} of {formatDuration(dur)} · starts at {formatDuration(take.offset)} in the video
      </p>
    </div>
  );
}

export default function VoiceOverWorkspace() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [metaError, setMetaError] = useState('');

  const [takes, setTakes] = useState([]);
  const [activeTakeId, setActiveTakeId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveCleanup, setLiveCleanup] = useState(true);
  const [micError, setMicError] = useState('');
  const [status, setStatus] = useState('');

  const [voiceVolume, setVoiceVolume] = useState(1);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportStage, setExportStage] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [sentToEditor, setSentToEditor] = useState(false);

  // isFfmpegSupported() reads MediaRecorder/WebAssembly, which don't exist
  // during server-side rendering — checking it directly at render time (the
  // server always sees them as undefined) renders a warning banner
  // server-side that a real browser then omits, a genuine SSR/client
  // markup mismatch, not just a cosmetic flicker. Starting from `true` (the
  // common case) and only flipping to false once mounted, client-side,
  // keeps the server and the client's FIRST render identical.
  const [ffmpegSupported, setFfmpegSupported] = useState(true);
  useEffect(() => { setFfmpegSupported(isFfmpegSupported()); }, []);

  const videoRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recordingRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordOffsetRef = useRef(0);
  const recordingLevelAnalyserRef = useRef(null);
  const cancelExportRef = useRef(null);

  const activeTake = takes.find((t) => t.id === activeTakeId) || null;

  useEffect(() => {
    (async () => {
      const handoff = await receiveBlobHandoff('voice-over');
      if (handoff) {
        const file = new File([handoff.blob], handoff.filename || 'video.mp4', { type: handoff.mimeType || 'video/mp4' });
        await handleVideoFile(file);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate the preview <audio>'s WAV source only when the active take
  // actually changes identity or gets a new buffer (Clean Audio) — NOT on
  // every trim-handle drag, which only changes in/out points, not the
  // underlying audio, and would otherwise interrupt playback constantly.
  useEffect(() => {
    if (!activeTake) { setPreviewAudioUrl(null); return undefined; }
    const blob = audioBufferToWavBlob(activeTake.buffer);
    const url = URL.createObjectURL(blob);
    setPreviewAudioUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTakeId, activeTake?.buffer]);

  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = videoVolume; videoRef.current.muted = videoMuted; }
  }, [videoVolume, videoMuted]);
  useEffect(() => {
    if (audioPreviewRef.current) audioPreviewRef.current.volume = voiceVolume;
  }, [voiceVolume]);

  async function handleVideoFile(file) {
    const sizeError = validateUploadSize(file, 'video');
    if (sizeError) { setMetaError(sizeError); return; }
    reset();
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    try {
      const meta = await extractVideoMetadata(file);
      setVideoMeta(meta);
    } catch (err) {
      setMetaError(err.message || 'Could not read this video file.');
    }
  }
  function handleFiles(files) {
    if (files[0]) handleVideoFile(files[0]);
  }

  function reset() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMeta(null);
    setMetaError('');
    setTakes([]);
    setActiveTakeId(null);
    setMicError('');
    setVoiceVolume(1);
    setVideoVolume(1);
    setVideoMuted(false);
    setExportBusy(false);
    setExportError('');
    setExportResult(null);
    setSentToEditor(false);
  }

  // ---- Recording ----
  async function handleStartRecording() {
    if (!videoRef.current) return;
    setMicError('');
    try {
      const ctx = audioCtxRef.current || (audioCtxRef.current = createAudioContext());
      if (ctx.state === 'suspended') ctx.resume();
      const { mediaRecorder, micStream, cleanupNodes } = await startMicCapture({ ctx, liveCleanup, cleanupIntensity: 'medium' });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(micStream).connect(analyser);
      recordingLevelAnalyserRef.current = analyser;

      recordChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stopMicCapture({ micStream, cleanupNodes });
        recordingLevelAnalyserRef.current = null;
        const blob = new Blob(recordChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await finalizeTake(blob, recordOffsetRef.current);
      };

      recordingRef.current = { mediaRecorder, micStream, cleanupNodes };
      recordOffsetRef.current = videoRef.current.currentTime || 0;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      videoRef.current.muted = videoMuted;
      videoRef.current.play();
    } catch (err) {
      setMicError(describeMicError(err));
    }
  }

  function handlePauseResumeRecording() {
    const rec = recordingRef.current;
    if (!rec) return;
    if (isPaused) {
      rec.mediaRecorder.resume();
      videoRef.current?.play();
      setIsPaused(false);
    } else {
      rec.mediaRecorder.pause();
      videoRef.current?.pause();
      setIsPaused(true);
    }
  }

  function handleStopRecording() {
    const rec = recordingRef.current;
    if (!rec) return;
    rec.mediaRecorder.stop();
    recordingRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    videoRef.current?.pause();
  }

  async function finalizeTake(blob, offset) {
    setStatus('Processing your recording…');
    try {
      const file = new File([blob], 'take', { type: blob.type });
      const buffer = await decodeAudioFile(file);
      const peaks = peaksFromAudioBuffer(buffer, 300);
      const take = { id: nextId(), buffer, peaks, trimStart: 0, trimEnd: buffer.duration, offset, cleaned: false };
      setTakes((prev) => [...prev, { ...take, name: `Take ${prev.length + 1}` }]);
      setActiveTakeId(take.id);
    } catch {
      setMicError('Could not process the recording. Please try again.');
    } finally {
      setStatus('');
    }
  }

  // ---- Takes ----
  function handleSelectTake(id) { setActiveTakeId(id); }
  function handleDeleteTake(id) {
    setTakes((prev) => prev.filter((t) => t.id !== id));
    setActiveTakeId((cur) => (cur === id ? null : cur));
  }
  function handleTrimChange(id, patch) {
    setTakes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  async function handleCleanTake(id) {
    const take = takes.find((t) => t.id === id);
    if (!take) return;
    setStatus('Cleaning audio…');
    try {
      const cleaned = await cleanAudioBuffer(take.buffer, { intensity: 'medium', normalize: false });
      const peaks = peaksFromAudioBuffer(cleaned, 300);
      setTakes((prev) => prev.map((t) => (t.id === id ? { ...t, buffer: cleaned, peaks, cleaned: true } : t)));
    } catch {
      setMicError('Could not clean this take. Please try again.');
    } finally {
      setStatus('');
    }
  }

  // ---- Preview ----
  function handleTogglePreview() {
    const video = videoRef.current;
    const audio = audioPreviewRef.current;
    if (!video || !audio || !activeTake) return;
    if (previewPlaying) {
      video.pause();
      audio.pause();
      setPreviewPlaying(false);
      return;
    }
    video.currentTime = activeTake.offset;
    video.volume = videoMuted ? 0 : videoVolume;
    video.muted = videoMuted;
    audio.currentTime = activeTake.trimStart;
    audio.volume = voiceVolume;
    video.play();
    audio.play();
    setPreviewPlaying(true);
  }
  function handlePreviewAudioTimeUpdate() {
    if (activeTake && audioPreviewRef.current && audioPreviewRef.current.currentTime >= activeTake.trimEnd) {
      audioPreviewRef.current.pause();
    }
  }
  function handlePreviewEnded() {
    setPreviewPlaying(false);
  }

  // ---- Export ----
  async function handleExport() {
    if (!activeTake || !videoFile || !videoMeta?.duration) return;
    setExportBusy(true);
    setExportError('');
    setExportResult(null);
    setSentToEditor(false);
    setExportStage('mixing');
    setExportProgress(0);
    if (previewPlaying) handleTogglePreview();

    try {
      const sampleRate = activeTake.buffer.sampleRate;
      const totalDuration = videoMeta.duration;
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
      const ctx = new OfflineCtx(2, length, sampleRate);

      // Best-effort decode of the video's own audio track — some containers/
      // codecs genuinely can't be decoded this way; treated as "no original
      // audio to mix in" rather than failing the whole export, the same
      // honesty policy lib/media/metadata.js already applies to hasAudio.
      let originalBuffer = null;
      if (!videoMuted && videoVolume > 0 && videoMeta.hasAudio !== false) {
        try { originalBuffer = await decodeAudioFile(videoFile); } catch { originalBuffer = null; }
      }
      if (originalBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = originalBuffer;
        const gain = ctx.createGain();
        gain.gain.value = videoVolume;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
      }

      const trimmed = sliceAudioBuffer(activeTake.buffer, activeTake.trimStart, activeTake.trimEnd);
      const voiceSrc = ctx.createBufferSource();
      voiceSrc.buffer = trimmed;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voiceVolume;
      voiceSrc.connect(voiceGain);
      voiceGain.connect(ctx.destination);
      voiceSrc.start(Math.max(0, activeTake.offset));

      const mixed = await ctx.startRendering();
      const wavBlob = audioBufferToWavBlob(mixed);

      setExportStage('combining');
      const cancelToken = { cancelled: false };
      cancelExportRef.current = cancelToken;
      const finalBlob = await addAudioTrackToVideo({ videoFile, audioBlob: wavBlob, onProgress: setExportProgress, cancelToken });
      const url = URL.createObjectURL(finalBlob);
      setExportResult({ blob: finalBlob, url });
    } catch (err) {
      if (!(err instanceof FfmpegCancelledError)) {
        setExportError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError ? err.message : (err?.message || 'Could not export this video. Please try again.'));
      }
    } finally {
      setExportBusy(false);
      setExportStage('');
    }
  }
  function handleCancelExport() {
    if (cancelExportRef.current) cancelExportRef.current.cancelled = true;
    terminateFFmpeg();
    setExportBusy(false);
    setExportStage('');
  }
  function handleDownloadExport() {
    if (!exportResult || !videoFile) return;
    downloadBlob(exportResult.blob, 'video/mp4', `${videoFile.name.replace(/\.[^.]+$/, '')}-narrated.mp4`);
  }
  async function handleSendToEditor() {
    if (!exportResult || !videoFile) return;
    const filename = `${videoFile.name.replace(/\.[^.]+$/, '')}-narrated.mp4`;
    const sent = await sendBlobToTool('video-editor', exportResult.blob, filename);
    if (!sent) { handleDownloadExport(); return; }
    setSentToEditor(true);
    window.location.href = '/video-editor';
  }

  const exportStageLabel = exportStage === 'mixing' ? 'Mixing audio…' : exportStage === 'combining' ? `Combining with video… ${Math.round(exportProgress * 100)}%` : '';

  return (
    <div className="panel" style={{ fontFamily: T.font }}>
      {!videoFile ? (
        <div>
          <UploadBox
            accept="video/*"
            onFiles={handleFiles}
            maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
            label="Upload a video to add a voice-over — click to choose, or drag it here"
          />
          <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>MP4, WebM, MOV, and other browser-playable video formats are supported.</p>
          {metaError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {metaError}</div>}
          {!ffmpegSupported && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ Your browser doesn&apos;t support the technology this tool needs to export video (WebAssembly / MediaRecorder). Try a recent version of Chrome, Edge, or Firefox.</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Left: video preview */}
          <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 480, position: 'sticky', top: 12 }}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              onPlay={() => { if (!isRecording) setPreviewPlaying(true); }}
              onPause={() => { if (!isRecording) setPreviewPlaying(false); }}
              style={{ width: '100%', borderRadius: 12, background: '#000', display: 'block' }}
            />
            <p style={{ fontSize: '0.76rem', color: T.mutedDark, margin: '8px 0 0' }}>
              {videoFile.name} · {formatDuration(videoMeta?.duration)}{videoMeta?.hasAudio === false ? ' · no audio track detected' : ''}
            </p>
            <button onClick={() => { reset(); }} style={{ ...smallBtn, marginTop: 10 }}>⇄ Replace video</button>
          </div>

          {/* Right: workflow panels */}
          <div style={{ flex: '1 1 380px', minWidth: 320 }}>
            <div style={sectionCard}>
              <h3 style={sectionTitle}>1. Record Voice Over</h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: T.mutedDark }}>
                Press record, then narrate along with the video — it plays automatically while you talk.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {!isRecording ? (
                  <button onClick={handleStartRecording} style={{ ...primaryBtn(false), display: 'flex', alignItems: 'center', gap: 8 }}>● Record</button>
                ) : (
                  <>
                    <button onClick={handlePauseResumeRecording} style={smallBtn}>{isPaused ? '▶ Resume' : '⏸ Pause'}</button>
                    <button onClick={handleStopRecording} style={{ ...smallBtn, background: T.danger, color: 'white', border: 'none' }}>■ Stop</button>
                    <div style={{ flex: '1 1 100px', minWidth: 80 }}>
                      <LevelMeter analyserRef={recordingLevelAnalyserRef} trackColor="#E2E8F0" />
                    </div>
                  </>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: T.mutedDark, marginTop: 12 }}>
                <input type="checkbox" checked={liveCleanup} onChange={(e) => setLiveCleanup(e.target.checked)} disabled={isRecording} />
                Reduce noise while recording
              </label>
              {micError && <div style={{ ...statusBox, marginTop: 10 }}>⚠️ {micError}</div>}
            </div>

            {takes.length > 0 && (
              <div style={sectionCard}>
                <h3 style={sectionTitle}>2. Choose &amp; Trim Your Take</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: T.mutedDark }}>
                  Record as many takes as you like — nothing is overwritten. Pick the one you want and drag its edges to trim.
                </p>
                {takes.map((take) => (
                  <TakeCard
                    key={take.id}
                    take={take}
                    active={take.id === activeTakeId}
                    busy={!!status}
                    onSelect={handleSelectTake}
                    onDelete={handleDeleteTake}
                    onTrimChange={handleTrimChange}
                    onClean={handleCleanTake}
                  />
                ))}
                {status && <p style={{ fontSize: '0.76rem', color: T.mutedDark }}>{status}</p>}
              </div>
            )}

            {activeTake && (
              <div style={sectionCard}>
                <h3 style={sectionTitle}>3. Adjust &amp; Preview</h3>
                <label style={{ display: 'block', fontSize: '0.78rem', color: T.mutedDark, marginBottom: 10 }}>
                  Voice-over volume
                  <input type="range" min={0} max={1} step={0.05} value={voiceVolume} onChange={(e) => setVoiceVolume(parseFloat(e.target.value))} style={{ display: 'block', width: '100%', marginTop: 4 }} />
                </label>
                <label style={{ display: 'block', fontSize: '0.78rem', color: T.mutedDark, marginBottom: 10 }}>
                  Original video volume
                  <input type="range" min={0} max={1} step={0.05} value={videoVolume} onChange={(e) => setVideoVolume(parseFloat(e.target.value))} disabled={videoMuted} style={{ display: 'block', width: '100%', marginTop: 4 }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: T.mutedDark, marginBottom: 12 }}>
                  <input type="checkbox" checked={videoMuted} onChange={(e) => setVideoMuted(e.target.checked)} />
                  Mute original video audio
                </label>
                <button onClick={handleTogglePreview} style={smallBtn}>{previewPlaying ? '⏸ Stop Preview' : '▶ Preview Mix'}</button>
              </div>
            )}

            {activeTake && (
              <div style={sectionCard}>
                <h3 style={sectionTitle}>4. Export Video</h3>
                {!exportResult ? (
                  <>
                    <button onClick={handleExport} disabled={exportBusy} style={primaryBtn(exportBusy)}>
                      {exportBusy ? exportStageLabel || 'Working…' : '⬇ Export MP4'}
                    </button>
                    {exportBusy && <button onClick={handleCancelExport} style={{ ...smallBtn, marginLeft: 8 }}>Cancel</button>}
                    {exportError && <div style={{ ...statusBox, marginTop: 10 }}>⚠️ {exportError}</div>}
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={handleDownloadExport} style={primaryBtn(false)}>⬇ Download MP4</button>
                    <button onClick={handleSendToEditor} style={smallBtn}>{sentToEditor ? '✓ Sent' : '🎬 Open in Video Editor'}</button>
                    <button onClick={() => { if (exportResult?.url) URL.revokeObjectURL(exportResult.url); setExportResult(null); }} style={smallBtn}>Export again</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <audio
            ref={audioPreviewRef}
            src={previewAudioUrl}
            onTimeUpdate={handlePreviewAudioTimeUpdate}
            onEnded={handlePreviewEnded}
            style={{ display: 'none' }}
          />
        </div>
      )}

      <p className="privacy-note">Your video and recordings are processed securely in your browser and never stored.</p>
    </div>
  );
}
