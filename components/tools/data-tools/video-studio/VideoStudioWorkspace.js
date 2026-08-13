'use client';

import { useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob, sendToTool } from '@/lib/dataTools/shared';
import { sendBlobToTool } from '@/lib/media/blobHandoff';
import { extractVideoMetadata, formatDuration } from '@/lib/media/metadata';
import { fileToQualityWav } from '@/lib/media/audioEncode';
import { validateUploadSize, validateRenderDuration, validateRenderDimensions, MAX_UPLOAD_VIDEO_BYTES } from '@/lib/media/limits';
import { transcribeMedia, TranscriptionError } from '@/lib/media/providers/geminiTranscription';
import { transcriptToSrt, transcriptToVtt, transcriptToAss, DEFAULT_CAPTION_STYLE } from '@/lib/media/captions';
import { transcriptToPlainText } from '@/lib/media/transcript';
import { burnAssSubtitles, FfmpegLoadError, FfmpegRenderError } from '@/lib/media/ffmpegClient';
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

export default function VideoStudioWorkspace() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metaError, setMetaError] = useState('');

  const [transcript, setTranscript] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState('idle'); // idle | preparing | transcribing | merging | error
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeProgress, setTranscribeProgress] = useState(null); // { chunkIndex, totalChunks } | null — only set once a file needs more than one chunk
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);

  const [extractStatus, setExtractStatus] = useState('idle'); // idle | extracting | error
  const [extractError, setExtractError] = useState('');

  const [burnStatus, setBurnStatus] = useState('idle'); // idle | loading | burning | error
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnError, setBurnError] = useState('');

  async function handleFiles(files) {
    const f = files[0];
    if (!f) return;
    const sizeError = validateUploadSize(f, 'video');
    if (sizeError) { setMetaError(sizeError); return; }

    reset();
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setMetaError('');

    try {
      const meta = await extractVideoMetadata(f);
      setMetadata(meta);
    } catch (err) {
      setMetaError(err.message || 'Could not read this video file.');
    }
  }

  function reset() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setMetadata(null);
    setMetaError('');
    setTranscript(null);
    setTranscribeStatus('idle');
    setTranscribeError('');
    setTranscribeProgress(null);
    setExtractStatus('idle');
    setExtractError('');
    setBurnStatus('idle');
    setBurnError('');
    setBurnProgress(0);
  }

  async function handleExtractAudio() {
    if (!file) return;
    setExtractStatus('extracting');
    setExtractError('');
    try {
      const { blob } = await fileToQualityWav(file);
      downloadBlob(blob, 'audio/wav', `${baseName(file.name)}.wav`);
      setExtractStatus('idle');
    } catch (err) {
      setExtractStatus('error');
      setExtractError(err.message || 'Could not extract audio from this video.');
    }
  }

  async function handleExtractToAudioStudio() {
    if (!file) return;
    setExtractStatus('extracting');
    setExtractError('');
    try {
      const { blob } = await fileToQualityWav(file);
      const filename = `${baseName(file.name)}.wav`;
      const sent = await sendBlobToTool('audio-studio', blob, filename);
      if (!sent) {
        // Handoff mechanism unavailable in this browser — fall back to a
        // real download rather than silently doing nothing.
        downloadBlob(blob, 'audio/wav', filename);
        setExtractStatus('idle');
        return;
      }
      window.location.href = '/data-tools/audio-studio';
    } catch (err) {
      setExtractStatus('error');
      setExtractError(err.message || 'Could not extract audio from this video.');
    }
  }

  async function handleTranscribe(quick) {
    if (!file) return;
    setTranscribeStatus('preparing');
    setTranscribeError('');
    setTranscribeProgress(null);
    try {
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
      if (quick) {
        downloadBlob(transcriptToSrt(result), 'text/plain', `${baseName(file.name)}.srt`);
      }
    } catch (err) {
      setTranscribeStatus('error');
      setTranscribeError(err instanceof TranscriptionError ? err.message : 'Transcription failed. Please try again.');
      setTranscribeProgress(null);
    }
  }

  // Real progress ("part 2 of 5"), not an indefinite spinner, once a file
  // is long enough to need more than one chunk.
  function transcribeStatusLabel() {
    if (transcribeStatus === 'transcribing' && transcribeProgress) {
      return `Transcribing part ${transcribeProgress.chunkIndex + 1} of ${transcribeProgress.totalChunks}…`;
    }
    return TRANSCRIBE_STATUS_LABEL[transcribeStatus] || 'Working…';
  }

  function handleSeek(time) {
    if (videoRef.current) videoRef.current.currentTime = time;
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

  async function handleBurnCaptions() {
    if (!file || !transcript) return;
    setBurnError('');

    const durationError = metadata?.duration != null ? validateRenderDuration(metadata.duration) : null;
    if (durationError) { setBurnStatus('error'); setBurnError(durationError); return; }
    const dimensionError = metadata?.width && metadata?.height ? validateRenderDimensions(metadata.width, metadata.height) : null;
    if (dimensionError) { setBurnStatus('error'); setBurnError(dimensionError); return; }

    setBurnStatus('loading');
    setBurnProgress(0);
    try {
      const assText = transcriptToAss(transcript, DEFAULT_CAPTION_STYLE);
      setBurnStatus('burning');
      const mp4Blob = await burnAssSubtitles({
        videoFile: file,
        assText,
        onProgress: setBurnProgress,
      });
      downloadBlob(mp4Blob, 'video/mp4', `${baseName(file.name)}-captioned.mp4`);
      setBurnStatus('idle');
    } catch (err) {
      setBurnStatus('error');
      setBurnError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError ? err.message : 'Could not burn captions into this video. Please try again.');
    }
  }

  const isTranscribing = transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const isBurning = burnStatus === 'loading' || burnStatus === 'burning';
  const hasNoAudio = metadata && metadata.hasAudio === false;

  if (!file) {
    return (
      <div style={{ fontFamily: T.font }}>
        <UploadBox
          accept="video/*"
          onFiles={handleFiles}
          maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
          label="Click to choose a video file, or drag it here"
        />
        {metaError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {metaError}</div>}
        <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
          MP4, WebM, MOV, and other formats your browser can play are supported.
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
              {metadata.width && metadata.height ? ` · ${metadata.width}×${metadata.height}` : ''}
              {metadata.format ? ` · ${metadata.format.toUpperCase()}` : ''}
              {metadata.hasAudio === false ? ' · No audio detected' : ''}
            </div>
          )}
        </div>
        <button onClick={reset} style={ghostBtn}>⇄ Replace file</button>
      </div>

      {metaError && <div style={{ ...statusBox, marginBottom: 16 }}>⚠️ {metaError}</div>}

      <video
        ref={videoRef}
        src={fileUrl}
        controls
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        style={{ width: '100%', maxHeight: 360, borderRadius: 12, background: '#000', marginBottom: 18, display: 'block' }}
      />

      {hasNoAudio && (
        <div style={{ ...statusBox, marginBottom: 16, background: T.accentTint, border: `1px solid ${T.accentBorder}`, color: T.accentDark }}>
          This video has no detected audio track — transcription and audio extraction aren&apos;t available for it.
        </div>
      )}

      {!hasNoAudio && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={handleExtractAudio} disabled={extractStatus === 'extracting'} style={smallBtn}>
            {extractStatus === 'extracting' ? 'Extracting…' : '🎧 Extract Audio (WAV)'}
          </button>
          <button onClick={handleExtractToAudioStudio} disabled={extractStatus === 'extracting'} style={smallBtn}>
            🎙️ Extract &amp; Open in Audio Studio →
          </button>
          {!transcript && (
            <>
              <button onClick={() => handleTranscribe(false)} disabled={isTranscribing} style={primaryBtn(isTranscribing)}>
                {isTranscribing ? transcribeStatusLabel() : '📝 Transcribe & Edit'}
              </button>
              <button onClick={() => handleTranscribe(true)} disabled={isTranscribing} style={smallBtn}>
                ⚡ Quick Subtitle (SRT)
              </button>
            </>
          )}
        </div>
      )}

      {extractError && <div style={{ ...statusBox, marginBottom: 16 }}>⚠️ {extractError}</div>}
      {transcribeStatus === 'error' && <div style={{ ...statusBox, marginBottom: 16 }}>⚠️ {transcribeError}</div>}

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

          <div style={{ marginTop: 20, padding: '16px', borderRadius: 12, background: T.accentTint, textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: T.inkSecondary }}>
              Burn these captions directly into the video&apos;s pixels — a real MP4 with visible, styled subtitles, playable anywhere, not just an overlay in this preview.
            </p>
            <button onClick={handleBurnCaptions} disabled={isBurning} style={primaryBtn(isBurning)}>
              {isBurning ? `${BURN_STATUS_LABEL[burnStatus] || 'Working…'}${burnStatus === 'burning' ? ` ${Math.round(burnProgress * 100)}%` : ''}` : '🔥 Burn Captions into Video'}
            </button>
            {burnStatus === 'burning' && (
              <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: T.muted }}>
                Keep this tab open while your video renders.
              </p>
            )}
            {burnStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {burnError}</div>}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 20, textAlign: 'center' }}>
        Your video is processed in your browser. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript — it is not stored afterward.
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
