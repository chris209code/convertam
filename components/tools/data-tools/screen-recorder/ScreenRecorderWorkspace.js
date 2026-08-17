'use client';

// Standalone Screen Recorder — captures the user's own screen/window/tab via
// getDisplayMedia, entirely client-side (no server ever sees the stream),
// with two independent optional add-ons: a microphone track (mixed with
// whatever system/tab audio exists via a small Web Audio graph) and a
// webcam picture-in-picture composited live onto a canvas so it survives
// into the single recorded file. This used to live inside Video Editor;
// it's a separate tool now so "create a new recording" and "edit existing
// media" are two clearly distinct entry points — the two stay connected via
// lib/media/blobHandoff.js's "Open in Video Editor" handoff below, the same
// client-side Cache Storage + sessionStorage mechanism Video Studio's
// "Extract Audio → Open in Audio Studio" already uses.
//
// getDisplayMedia's own `audio` option only ever captures SYSTEM/tab audio
// — never the microphone (a browser API limitation, not something this app
// controls) — so narrating over a recording needs a SEPARATE getUserMedia
// mic stream, mixed together with whatever system audio exists before
// either reaches MediaRecorder, since a recorder can only reliably capture
// one audio track per stream.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { T } from '../smart-parser/theme';
import { getPipRange, CORNER_PRESETS, drawCover } from '@/lib/media/compositionLayouts';
import { sendBlobToTool } from '@/lib/media/blobHandoff';

const PIP_CORNER_OPTIONS = [
  { id: 'top-left', label: 'Top left', icon: '↖' },
  { id: 'top-right', label: 'Top right', icon: '↗' },
  { id: 'bottom-left', label: 'Bottom left', icon: '↙' },
  { id: 'bottom-right', label: 'Bottom right', icon: '↘' },
];

function formatElapsed(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ScreenRecorderWorkspace() {
  const [recordMic, setRecordMic] = useState(true);
  const [recordCamera, setRecordCamera] = useState(false);
  const [cameraCorner, setCameraCorner] = useState('bottom-right');
  const [cameraSizeRatio, setCameraSizeRatio] = useState(0.22);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captureState, setCaptureState] = useState(null);
  const [audioWarning, setAudioWarning] = useState('');
  const [recordError, setRecordError] = useState('');
  const [finished, setFinished] = useState(null); // { blob, url, filename, mimeType, sizeBytes }
  const [sendingToEditor, setSendingToEditor] = useState(false);

  // Defaults to false (matches server render, since Node has no real
  // mediaDevices API) and is only set for real once mounted in an actual
  // browser — computing this directly in the render body would read
  // Node's own minimal built-in `navigator` global during SSR, which has
  // no `mediaDevices`, causing a client/server hydration mismatch on the
  // Start Recording button's `disabled` attribute.
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    setUnsupported(typeof navigator !== 'undefined' && !navigator.mediaDevices?.getDisplayMedia);
  }, []);

  const recorderRef = useRef(null);
  const cleanupRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      const startedAt = Date.now();
      elapsedTimerRef.current = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
    } else if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
      setElapsed(0);
    }
    return () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current); };
  }, [isRecording]);

  // Stop any in-progress recording and release every device if the user
  // navigates away mid-recording — otherwise the mic/camera stay "on" from
  // the OS's point of view even after the page is gone.
  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    cleanupRef.current?.();
    if (finished?.url) URL.revokeObjectURL(finished.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setRecordError('Screen recording isn\'t supported in this browser. Try a recent version of Chrome or Edge.');
      return;
    }
    setRecordError('');
    setAudioWarning('');
    setCaptureState(null);
    if (finished?.url) URL.revokeObjectURL(finished.url);
    setFinished(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const systemAudioTracks = displayStream.getAudioTracks();

      let micStream = null;
      let micDenied = false;
      if (recordMic && navigator.mediaDevices.getUserMedia) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          micDenied = true; // no mic, or permission denied — proceed with whatever system audio exists instead of failing the whole recording
        }
      }

      // Camera is a third, fully independent capture — a denial or absent
      // device here never blocks or degrades the screen/mic recording
      // already in progress, it just means no webcam PIP gets composited
      // in (see the checklist row below).
      let cameraStream = null;
      if (recordCamera && navigator.mediaDevices.getUserMedia) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
        } catch {
          // camera unavailable/denied — reflected in captureState below
        }
      }

      // Independent, per-source status — mic, system audio, and camera are
      // three unrelated capabilities; collapsing them into one combined
      // message would hide which ONE actually failed when only one did.
      setCaptureState({
        video: true,
        mic: !recordMic ? 'off' : micStream ? 'on' : 'denied',
        systemAudio: systemAudioTracks.length > 0 ? 'on' : 'unavailable',
        camera: !recordCamera ? 'off' : cameraStream ? 'on' : 'denied',
      });

      // ---- Video track: the raw display track, unless a webcam PIP was
      // requested and granted — then a <canvas>, redrawn every frame with
      // the camera composited over the screen share and captured back into
      // a track via canvas.captureStream(). Baking the PIP into the actual
      // pixels at capture time is the only way it survives into a single
      // recorded file. ----
      let videoTrack = displayStream.getVideoTracks()[0];
      let compositor = null;
      if (cameraStream) {
        const waitReady = (el) => new Promise((resolve) => {
          if (el.readyState >= 1) { el.play().then(resolve).catch(resolve); return; }
          el.onloadedmetadata = () => { el.play().then(resolve).catch(resolve); };
        });
        const displayVideoEl = document.createElement('video');
        displayVideoEl.muted = true;
        displayVideoEl.srcObject = displayStream;
        const cameraVideoEl = document.createElement('video');
        cameraVideoEl.muted = true;
        cameraVideoEl.srcObject = cameraStream;
        await Promise.all([waitReady(displayVideoEl), waitReady(cameraVideoEl)]);

        const canvas = document.createElement('canvas');
        canvas.width = displayVideoEl.videoWidth || 1280;
        canvas.height = displayVideoEl.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        let rafId = null;
        const draw = () => {
          ctx.drawImage(displayVideoEl, 0, 0, canvas.width, canvas.height);
          const { pipW, pipH, margin, rangeX, rangeY } = getPipRange(canvas.width, canvas.height, cameraSizeRatio);
          const pos = CORNER_PRESETS[cameraCorner] || CORNER_PRESETS['bottom-right'];
          const rect = { x: margin + pos.x * rangeX, y: margin + pos.y * rangeY, w: pipW, h: pipH };
          ctx.save();
          const radius = Math.min(rect.w, rect.h) * 0.06;
          ctx.beginPath();
          ctx.moveTo(rect.x + radius, rect.y);
          ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, radius);
          ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h, radius);
          ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y, radius);
          ctx.arcTo(rect.x, rect.y, rect.x + rect.w, rect.y, radius);
          ctx.closePath();
          ctx.clip();
          drawCover(ctx, cameraVideoEl, rect);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
          rafId = requestAnimationFrame(draw);
        };
        draw();
        const canvasStream = canvas.captureStream(30);
        videoTrack = canvasStream.getVideoTracks()[0];
        compositor = {
          stop: () => {
            if (rafId != null) cancelAnimationFrame(rafId);
            displayVideoEl.pause();
            cameraVideoEl.pause();
          },
        };
      }

      const recordedTracks = [videoTrack];
      let audioCtx = null;
      if (systemAudioTracks.length && micStream) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        audioCtx.createMediaStreamSource(new MediaStream(systemAudioTracks)).connect(dest);
        audioCtx.createMediaStreamSource(micStream).connect(dest);
        recordedTracks.push(...dest.stream.getAudioTracks());
      } else if (micStream) {
        recordedTracks.push(...micStream.getAudioTracks());
      } else if (systemAudioTracks.length) {
        recordedTracks.push(...systemAudioTracks);
      }

      if (!systemAudioTracks.length && !micStream) {
        setAudioWarning(
          recordMic && micDenied
            ? 'Recording started, but both system audio and your microphone were unavailable — this recording will be silent. Check your browser\'s microphone permission for this site, or share a source with system audio.'
            : 'Recording started, but no audio was shared — this recording will be silent. On macOS, Chrome can only capture a single browser TAB\'s audio this way (not your whole screen or system audio); on Windows, make sure "Share audio" is checked in the picker. Turn on "Include microphone" to narrate instead.'
        );
      } else if (recordMic && micDenied) {
        setAudioWarning('Recording started, but your microphone wasn\'t available (check this site\'s microphone permission) — only system/tab audio will be included, no narration.');
      }

      const combinedStream = new MediaStream(recordedTracks);
      const chunks = [];
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find((c) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) || '';
      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        displayStream.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
        cameraStream?.getTracks().forEach((t) => t.stop());
        compositor?.stop();
        audioCtx?.close();
        cleanupRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        if (!blob.size) return;
        const filename = `screen-recording-${Date.now()}.webm`;
        setFinished({ blob, url: URL.createObjectURL(blob), filename, mimeType: blob.type, sizeBytes: blob.size });
      };
      // Stops the recording if the user ends sharing via the browser's own
      // "Stop sharing" control, not just our in-app Stop button.
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => { if (recorder.state !== 'inactive') recorder.stop(); });
      recorderRef.current = recorder;
      cleanupRef.current = () => {
        micStream?.getTracks().forEach((t) => t.stop());
        cameraStream?.getTracks().forEach((t) => t.stop());
        compositor?.stop();
        audioCtx?.close();
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      // A denied/cancelled permission prompt rejects with a real DOMException
      // — not an error worth surfacing as if something broke.
      if (err?.name !== 'NotAllowedError') {
        setRecordError(err?.message || 'Could not start screen recording. Please try again.');
      }
    }
  }

  function handleStop() {
    recorderRef.current?.stop();
  }

  function handleRecordAgain() {
    if (finished?.url) URL.revokeObjectURL(finished.url);
    setFinished(null);
    setCaptureState(null);
    setAudioWarning('');
  }

  function handleDownload() {
    if (!finished) return;
    downloadBlob(finished.blob, finished.filename);
  }

  async function handleOpenInVideoEditor() {
    if (!finished) return;
    setSendingToEditor(true);
    const sent = await sendBlobToTool('video-editor', finished.blob, finished.filename);
    if (!sent) {
      // No client-side handoff available (very old browser) — fall back to
      // a plain download so the user still has their recording.
      downloadBlob(finished.blob, finished.filename);
      setSendingToEditor(false);
      return;
    }
    window.location.href = '/data-tools/video-editor';
  }

  function renderCaptureChecklist() {
    if (!captureState) return null;
    const s = captureState;
    const row = (ok, label) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: ok ? '#166534' : '#92400E' }}>
        <span>{ok ? '✓' : '⚠'}</span><span>{label}</span>
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: `1px solid ${T.border}` }}>
        {row(true, 'Screen video')}
        {row(s.mic === 'on', s.mic === 'on' ? 'Microphone' : s.mic === 'off' ? 'Microphone off (not requested)' : 'Microphone unavailable — check this site\'s mic permission')}
        {row(s.systemAudio === 'on', s.systemAudio === 'on' ? 'System/tab audio' : 'System/tab audio unavailable (browser/OS limitation)')}
        {row(s.camera === 'on', s.camera === 'on' ? 'Webcam (picture-in-picture)' : s.camera === 'off' ? 'Webcam off (not requested)' : 'Webcam unavailable — check this site\'s camera permission')}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {finished ? (
        <div>
          <video src={finished.url} controls style={{ width: '100%', borderRadius: 12, background: '#0B1120', display: 'block' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: '0.76rem', color: T.muted }}>{(finished.sizeBytes / (1024 * 1024)).toFixed(1)} MB · {finished.filename}</span>
            <button onClick={handleRecordAgain} style={ghostBtn}>⟲ Record again</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button onClick={handleOpenInVideoEditor} disabled={sendingToEditor} style={primaryBtn(sendingToEditor)}>
              {sendingToEditor ? 'Opening…' : '🎬 Open in Video Editor'}
            </button>
            <button onClick={handleDownload} style={secondaryBtn}>⬇ Download recording</button>
          </div>
          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
            Your recording stays on this device — downloading saves the .webm file directly, and opening it in Video Editor hands it over locally in this browser tab, without ever uploading it anywhere.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
              {isRecording && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626', animation: 'cvt-rec-pulse 1.2s infinite' }} />
                  REC {formatElapsed(elapsed)}
                </span>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={isRecording ? handleStop : handleStart} disabled={unsupported} style={{ ...primaryBtnRecord(isRecording), opacity: unsupported ? 0.5 : 1 }}>
                {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
              </button>
            </div>

            {!isRecording && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: T.inkSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={recordMic} onChange={(e) => setRecordMic(e.target.checked)} />
                  🎤 Include microphone
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: T.inkSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={recordCamera} onChange={(e) => setRecordCamera(e.target.checked)} />
                  📷 Include webcam (picture-in-picture)
                </label>
                {recordCamera && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                    {PIP_CORNER_OPTIONS.map((c) => (
                      <button key={c.id} type="button" onClick={() => setCameraCorner(c.id)} title={c.label}
                        style={{ ...ghostBtn, padding: '5px 10px', background: cameraCorner === c.id ? T.accentGradient : 'white', color: cameraCorner === c.id ? 'white' : T.inkSecondary, border: cameraCorner === c.id ? 'none' : `1px solid ${T.border}` }}>
                        {c.icon}
                      </button>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: T.mutedDark }}>Size
                      <input type="range" min={0.12} max={0.35} step={0.01} value={cameraSizeRatio}
                        onChange={(e) => setCameraSizeRatio(parseFloat(e.target.value))} style={{ width: 80 }} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {unsupported && (
              <p style={{ fontSize: '0.76rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px', marginTop: 12, textAlign: 'center' }}>
                ⚠️ Screen recording isn&apos;t supported in this browser. Try a recent version of Chrome or Edge.
              </p>
            )}
            {recordError && (
              <p style={{ fontSize: '0.76rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px', marginTop: 12, textAlign: 'center' }}>
                ⚠️ {recordError}
              </p>
            )}
            {audioWarning && (
              <p style={{ fontSize: '0.76rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px', marginTop: 12, textAlign: 'center' }}>
                ⚠️ {audioWarning}
              </p>
            )}
            {renderCaptureChecklist()}
          </div>

          <p style={{ fontSize: '0.78rem', color: T.muted, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            Recording happens entirely in your browser and is never uploaded. Already have a recording to edit?{' '}
            <Link href="/data-tools/video-editor" style={{ color: T.accentDark, fontWeight: 700, textDecoration: 'none' }}>Open Video Editor</Link>.
          </p>
        </div>
      )}
      <style jsx>{`
        @keyframes cvt-rec-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const primaryBtnRecord = (recording) => ({
  padding: '15px 40px', borderRadius: 14, border: 'none',
  background: recording ? '#DC2626' : T.accentGradient,
  color: 'white', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: T.font,
});
const primaryBtn = (disabled) => ({ padding: '12px 22px', borderRadius: 10, border: 'none', background: disabled ? '#94A3B8' : T.accentGradient, color: 'white', fontSize: '0.86rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: T.font });
const secondaryBtn = { padding: '12px 22px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'white', color: T.inkSecondary, fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font };
const ghostBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
