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
import { burnAssSubtitles, terminateFFmpeg, FfmpegLoadError, FfmpegRenderError, FfmpegCancelledError } from '@/lib/media/ffmpegClient';
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

const RAIL_CATEGORIES = [
  { id: 'audio', icon: '🎧', label: 'Audio' },
  { id: 'transcribe', icon: '📝', label: 'Transcribe' },
  { id: 'captions', icon: '🔥', label: 'Captions' },
];

export default function VideoStudioWorkspace() {
  const [activeCategory, setActiveCategory] = useState('transcribe');
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
  const [burnEta, setBurnEta] = useState('');
  const burnCancelRef = useRef(null);
  const burnStartRef = useRef(0);

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
    setActiveCategory('transcribe');
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
      window.location.href = '/audio-studio';
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
    setBurnEta('');
    const cancelToken = { cancelled: false };
    burnCancelRef.current = cancelToken;
    burnStartRef.current = Date.now();
    try {
      const assText = transcriptToAss(transcript, DEFAULT_CAPTION_STYLE);
      setBurnStatus('burning');
      const mp4Blob = await burnAssSubtitles({
        videoFile: file,
        assText,
        onProgress: (p) => {
          setBurnProgress(p);
          const elapsedSec = (Date.now() - burnStartRef.current) / 1000;
          setBurnEta(p > 0.03 ? `~${formatDuration(Math.max(0, elapsedSec / p - elapsedSec))} remaining` : '');
        },
        cancelToken,
      });
      downloadBlob(mp4Blob, 'video/mp4', `${baseName(file.name)}-captioned.mp4`);
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

  function handleCancelBurn() {
    if (burnCancelRef.current) burnCancelRef.current.cancelled = true;
    terminateFFmpeg(); // the only way to interrupt an in-flight ffmpeg.wasm exec() — see ffmpegClient.js
  }

  const isTranscribing = transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const isBurning = burnStatus === 'loading' || burnStatus === 'burning';
  const hasNoAudio = metadata && metadata.hasAudio === false;

  // Editor-shell chrome (header + tool rail) always renders, matching Video
  // Editor's pattern — only the preview slot (video player vs. drop box)
  // and each rail category's panel content change based on whether a file
  // is loaded yet.
  return (
    <div className="vs-shell" style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', flexShrink: 0 }}>🎬 Video Studio</span>
          {file && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {file.name}
            </span>
          )}
        </div>
        {file && (
          <button onClick={reset} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'white', color: T.accentDark, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', fontFamily: T.font, flexShrink: 0 }}>
            ⇄ Replace file
          </button>
        )}
      </div>

      <div className="vs-body">
        <div className="vs-rail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#0F172A', borderRight: '1px solid #1E293B', flexShrink: 0, overflowX: 'auto' }}>
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
            {/* Left: preview — video player once a file exists, drop box in the same slot until then */}
            <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 440 }}>
              {file ? (
                <>
                  {metadata && (
                    <div style={{ fontSize: '0.76rem', color: T.mutedDark, marginBottom: 8 }}>
                      {formatDuration(metadata.duration)} · {(metadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      {metadata.width && metadata.height ? ` · ${metadata.width}×${metadata.height}` : ''}
                      {metadata.format ? ` · ${metadata.format.toUpperCase()}` : ''}
                      {metadata.hasAudio === false ? ' · No audio detected' : ''}
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    src={fileUrl}
                    controls
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    style={{ width: '100%', maxHeight: 360, borderRadius: 12, background: '#000', display: 'block' }}
                  />
                  {hasNoAudio && (
                    <div style={{ ...statusBox, marginTop: 12, background: T.accentTint, border: `1px solid ${T.accentBorder}`, color: T.accentDark }}>
                      This video has no detected audio track — transcription and audio extraction aren&apos;t available for it.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <UploadBox
                    accept="video/*"
                    onFiles={handleFiles}
                    maxSizeMB={MAX_UPLOAD_VIDEO_BYTES / (1024 * 1024)}
                    label="Click to choose a video file, or drag it here"
                  />
                  <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
                    MP4, WebM, MOV, and other formats your browser can play are supported.
                  </p>
                </>
              )}
              {metaError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {metaError}</div>}
            </div>

            {/* Right: the selected rail category's panel */}
            <div style={{ flex: '1 1 380px', minWidth: 320 }}>
              {activeCategory === 'audio' && (
                !file ? (
                  <EmptyPanel icon="🎧" label="Audio">Upload a video on the left to pull out its audio track as a WAV file, or send it straight to Audio Studio.</EmptyPanel>
                ) : hasNoAudio ? (
                  <EmptyPanel icon="🎧" label="Audio">This video has no detected audio track, so there&apos;s nothing to extract.</EmptyPanel>
                ) : (
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 }}>Extract audio</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={handleExtractAudio} disabled={extractStatus === 'extracting'} style={smallBtn}>
                        {extractStatus === 'extracting' ? 'Extracting…' : '🎧 Extract Audio (WAV)'}
                      </button>
                      <button onClick={handleExtractToAudioStudio} disabled={extractStatus === 'extracting'} style={smallBtn}>
                        🎙️ Extract &amp; Open in Audio Studio →
                      </button>
                    </div>
                    {extractError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {extractError}</div>}
                  </div>
                )
              )}

              {activeCategory === 'transcribe' && (
                !file ? (
                  <EmptyPanel icon="📝" label="Transcribe">Upload a video on the left to transcribe its spoken audio, edit the transcript, and download SRT/VTT/TXT captions.</EmptyPanel>
                ) : hasNoAudio ? (
                  <EmptyPanel icon="📝" label="Transcribe">This video has no detected audio track, so there&apos;s nothing to transcribe.</EmptyPanel>
                ) : !transcript ? (
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button onClick={() => handleTranscribe(false)} disabled={isTranscribing} style={primaryBtn(isTranscribing)}>
                        {isTranscribing ? transcribeStatusLabel() : '📝 Transcribe & Edit'}
                      </button>
                      <button onClick={() => handleTranscribe(true)} disabled={isTranscribing} style={smallBtn}>
                        ⚡ Quick Subtitle (SRT)
                      </button>
                    </div>
                    {transcribeStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {transcribeError}</div>}
                  </div>
                ) : (
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
                  </div>
                )
              )}

              {activeCategory === 'captions' && (
                !file ? (
                  <EmptyPanel icon="🔥" label="Captions">Upload a video, transcribe it, then burn real, styled captions into the exported MP4 here.</EmptyPanel>
                ) : hasNoAudio ? (
                  <EmptyPanel icon="🔥" label="Captions">This video has no detected audio track, so there&apos;s nothing to transcribe or caption.</EmptyPanel>
                ) : !transcript ? (
                  <EmptyPanel icon="🔥" label="Captions">Transcribe this video first (in the Transcribe tab) to unlock burning captions into it.</EmptyPanel>
                ) : (
                  <div style={{ padding: '16px', borderRadius: 12, background: T.accentTint, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: T.inkSecondary }}>
                      Burn these captions directly into the video&apos;s pixels — a real MP4 with visible, styled subtitles, playable anywhere, not just an overlay in this preview.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={handleBurnCaptions} disabled={isBurning} style={primaryBtn(isBurning)}>
                        {isBurning ? `${BURN_STATUS_LABEL[burnStatus] || 'Working…'}${burnStatus === 'burning' ? ` ${Math.round(burnProgress * 100)}%` : ''}` : '🔥 Burn Captions into Video'}
                      </button>
                      {isBurning && (
                        <button onClick={handleCancelBurn} style={ghostBtn}>Cancel</button>
                      )}
                    </div>
                    {isBurning && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: T.muted }}>
                        Keep this tab open while your video renders{burnEta ? ` — ${burnEta}` : ''}. This runs entirely in this browser tab and can take longer than the video itself, especially at higher resolutions.
                      </p>
                    )}
                    {burnStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {burnError}</div>}
                  </div>
                )
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 20, textAlign: 'center' }}>
            Your video is processed in your browser. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript — it is not stored afterward.
          </p>
        </div>
      </div>

      <style jsx>{`
        .vs-body { display: flex; }
        @media (max-width: 720px) {
          .vs-body { flex-direction: column; }
          .vs-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #1E293B; }
        }
      `}</style>
    </div>
  );
}

function EmptyPanel({ icon, label, children }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>{icon} {label}</div>
      <p style={{ fontSize: '0.76rem', color: T.muted, textAlign: 'center', padding: '20px 8px', margin: 0 }}>{children}</p>
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
