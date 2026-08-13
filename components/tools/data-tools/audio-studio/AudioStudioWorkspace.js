'use client';

import { useEffect, useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob, sendToTool } from '@/lib/dataTools/shared';
import { receiveBlobHandoff } from '@/lib/media/blobHandoff';
import { extractAudioMetadata, formatDuration } from '@/lib/media/metadata';
import { extractWaveformPeaks } from '@/lib/media/waveform';
import { validateUploadSize, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import { transcribeMedia, TranscriptionError } from '@/lib/media/providers/geminiTranscription';
import { transcriptToSrt, transcriptToVtt } from '@/lib/media/captions';
import { transcriptToPlainText } from '@/lib/media/transcript';
import { renderCaptionedVideo, isCaptionedVideoSupported } from '@/lib/media/renderCaptionedVideo';
import WaveformPlayer from '../shared/WaveformPlayer';
import TranscriptEditor from '../shared/TranscriptEditor';

const STATUS_LABEL = {
  preparing: 'Preparing your audio…',
  transcribing: 'Transcribing speech…',
};

const RENDER_STATUS_LABEL = {
  preparing: 'Preparing your audio…',
  rendering: 'Rendering video…',
  finalizing: 'Finalizing MP4…',
};

export default function AudioStudioWorkspace() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [peaks, setPeaks] = useState(null);
  const [metaError, setMetaError] = useState('');

  const [transcript, setTranscript] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState('idle'); // idle | preparing | transcribing | error
  const [transcribeError, setTranscribeError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);

  const [renderStatus, setRenderStatus] = useState('idle'); // idle | preparing | rendering | finalizing | error
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    (async () => {
      const handoff = await receiveBlobHandoff('audio-studio');
      if (handoff) {
        const handoffFile = new File([handoff.blob], handoff.filename, { type: handoff.mimeType || 'audio/wav' });
        handleFiles([handoffFile]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'audio');
    if (sizeError) { setMetaError(sizeError); return; }

    reset();
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setMetaError('');

    try {
      const [meta, peakData] = await Promise.all([extractAudioMetadata(f), extractWaveformPeaks(f, 240)]);
      setMetadata(meta);
      setPeaks(peakData);
    } catch (err) {
      setMetaError(err.message || 'Could not read this audio file.');
    }
  }

  function reset() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setMetadata(null);
    setPeaks(null);
    setTranscript(null);
    setTranscribeStatus('idle');
    setTranscribeError('');
  }

  async function handleTranscribe() {
    if (!file) return;
    setTranscribeStatus('preparing');
    setTranscribeError('');
    try {
      const result = await transcribeMedia({ file, onStatus: (s) => setTranscribeStatus(s === 'done' ? 'idle' : s) });
      setTranscript(result);
      setTranscribeStatus('idle');
    } catch (err) {
      setTranscribeStatus('error');
      setTranscribeError(err instanceof TranscriptionError ? err.message : 'Transcription failed. Please try again.');
    }
  }

  function handleSeek(time) {
    playerRef.current?.seekTo(time);
  }

  function handleDownloadSrt() {
    downloadBlob(transcriptToSrt(transcript), 'text/plain', `${baseName(file.name)}.srt`);
  }
  function handleDownloadVtt() {
    downloadBlob(transcriptToVtt(transcript), 'text/vtt', `${baseName(file.name)}.vtt`);
  }
  function handleDownloadTxt() {
    downloadBlob(transcriptToPlainText(transcript), 'text/plain', `${baseName(file.name)}-transcript.txt`);
  }
  function handleOpenInTextCleaner() {
    sendToTool({ tool: 'text-cleaner', kind: 'text', content: transcriptToPlainText(transcript), sourceName: `${baseName(file.name)} transcript` });
    window.location.href = '/data-tools/text-cleaner';
  }

  async function handleCreateVideo() {
    if (!file || !transcript) return;
    setRenderStatus('preparing');
    setRenderError('');
    setRenderProgress(0);
    try {
      const mp4Blob = await renderCaptionedVideo({
        file, peaks, transcript,
        onStatus: (s) => setRenderStatus(s === 'done' ? 'idle' : s),
        onProgress: setRenderProgress,
      });
      downloadBlob(mp4Blob, 'video/mp4', `${baseName(file.name)}-captioned.mp4`);
      setRenderStatus('idle');
    } catch (err) {
      setRenderStatus('error');
      setRenderError(err.message || 'Could not create the video. Please try again.');
    }
  }

  const isBusy = transcribeStatus === 'preparing' || transcribeStatus === 'transcribing';
  const isRendering = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';

  if (!file) {
    return (
      <div style={{ fontFamily: T.font }}>
        <UploadBox
          accept="audio/*"
          onFiles={handleFiles}
          maxSizeMB={MAX_UPLOAD_AUDIO_BYTES / (1024 * 1024)}
          label="Click to choose an audio file, or drag it here"
        />
        {metaError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {metaError}</div>}
        <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
          MP3, WAV, M4A, AAC, OGG, and WebM audio are supported.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.ink, fontSize: '0.92rem', wordBreak: 'break-word' }}>{file.name}</div>
          {metadata && (
            <div style={{ fontSize: '0.76rem', color: T.mutedDark, marginTop: 2 }}>
              {formatDuration(metadata.duration)} · {(metadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB
              {metadata.format ? ` · ${metadata.format.toUpperCase()}` : ''}
              {metadata.sampleRate ? ` · ${(metadata.sampleRate / 1000).toFixed(1)}kHz` : ''}
              {metadata.channels ? ` · ${metadata.channels === 1 ? 'Mono' : metadata.channels === 2 ? 'Stereo' : `${metadata.channels}ch`}` : ''}
            </div>
          )}
        </div>
        <button onClick={reset} style={ghostBtn}>⇄ Replace file</button>
      </div>

      {metaError && <div style={{ ...statusBox, marginBottom: 16 }}>⚠️ {metaError}</div>}

      {peaks && (
        <div style={{ marginBottom: 18 }}>
          <WaveformPlayer ref={playerRef} src={fileUrl} peaks={peaks} duration={metadata?.duration} onTimeUpdate={setCurrentTime} />
        </div>
      )}

      {!transcript && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button onClick={handleTranscribe} disabled={isBusy} style={primaryBtn(isBusy)}>
            {isBusy ? STATUS_LABEL[transcribeStatus] || 'Working…' : '🎙️ Transcribe'}
          </button>
          {transcribeStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {transcribeError}</div>}
        </div>
      )}

      {transcript && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: T.ink }}>Transcript</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleDownloadSrt} style={smallBtn}>SRT</button>
              <button onClick={handleDownloadVtt} style={smallBtn}>VTT</button>
              <button onClick={handleDownloadTxt} style={smallBtn}>TXT</button>
              <button onClick={handleOpenInTextCleaner} style={{ ...smallBtn, background: T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>Open in Text Cleaner →</button>
            </div>
          </div>
          <TranscriptEditor transcript={transcript} onTranscriptChange={setTranscript} currentTime={currentTime} onSeek={handleSeek} />

          {isCaptionedVideoSupported() ? (
            <div style={{ marginTop: 20, padding: '16px', borderRadius: 12, background: T.accentTint, textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: T.inkSecondary }}>
                Turn this audio into a downloadable video with your captions burned in — a branded background, a waveform, and your transcript's captions.
              </p>
              <button onClick={handleCreateVideo} disabled={isRendering} style={primaryBtn(isRendering)}>
                {isRendering ? `${RENDER_STATUS_LABEL[renderStatus] || 'Working…'} ${Math.round(renderProgress * 100)}%` : '🎬 Create Captioned Video'}
              </button>
              {renderStatus === 'rendering' && (
                <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: T.muted }}>
                  Keep this tab open while your video renders.
                </p>
              )}
              {renderStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {renderError}</div>}
            </div>
          ) : (
            <p style={{ marginTop: 20, fontSize: '0.76rem', color: T.muted, textAlign: 'center' }}>
              Creating a captioned video isn&apos;t supported in this browser. Try a recent version of Chrome, Edge, or Firefox.
            </p>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 20, textAlign: 'center' }}>
        Your audio is processed in your browser. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript — it is not stored afterward.
      </p>
    </div>
  );
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, '');
}

const ghostBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font, flexShrink: 0 };
const smallBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const primaryBtn = (disabled) => ({ padding: '13px 32px', borderRadius: 12, border: 'none', background: disabled ? '#94A3B8' : T.accentGradient, color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: T.font });
const statusBox = { padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
