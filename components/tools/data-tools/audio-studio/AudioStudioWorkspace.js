'use client';

import { useEffect, useRef, useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob, sendToTool } from '@/lib/dataTools/shared';
import { receiveBlobHandoff, sendBlobToTool } from '@/lib/media/blobHandoff';
import { extractAudioMetadata, extractVideoMetadata, formatDuration } from '@/lib/media/metadata';
import { extractWaveformPeaks } from '@/lib/media/waveform';
import { validateUploadSize, MAX_UPLOAD_AUDIO_BYTES } from '@/lib/media/limits';
import { transcribeMedia, TranscriptionError } from '@/lib/media/providers/geminiTranscription';
import { transcriptToSrt, transcriptToVtt } from '@/lib/media/captions';
import { transcriptToPlainText } from '@/lib/media/transcript';
import { renderCaptionedVideo, isCaptionedVideoSupported, RenderCancelledError } from '@/lib/media/renderCaptionedVideo';
import { terminateFFmpeg } from '@/lib/media/ffmpegClient';
import { cleanAudioFile, CLEANUP_INTENSITIES } from '@/lib/media/audioCleanup';
import { DEFAULT_BACKGROUND } from '@/lib/media/videoCompose';
import WaveformPlayer from '../shared/WaveformPlayer';
import TranscriptEditor from '../shared/TranscriptEditor';
import BackgroundPicker from './BackgroundPicker';

const STATUS_LABEL = {
  preparing: 'Preparing your audio…',
  transcribing: 'Transcribing speech…',
  merging: 'Combining transcript…',
};

const RENDER_STATUS_LABEL = {
  preparing: 'Preparing your audio…',
  rendering: 'Rendering video…',
  finalizing: 'Finalizing MP4…',
};

const RAIL_CATEGORIES = [
  { id: 'transcribe', icon: '🎙️', label: 'Transcribe' },
  { id: 'cleanup', icon: '🧹', label: 'Cleanup' },
  { id: 'video', icon: '🎬', label: 'Video' },
];

export default function AudioStudioWorkspace() {
  const [activeCategory, setActiveCategory] = useState('transcribe');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [peaks, setPeaks] = useState(null);
  const [metaError, setMetaError] = useState('');

  const [transcript, setTranscript] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState('idle'); // idle | preparing | transcribing | merging | error
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeProgress, setTranscribeProgress] = useState(null); // { chunkIndex, totalChunks } | null — only set once a file needs more than one chunk
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);

  const [renderStatus, setRenderStatus] = useState('idle'); // idle | preparing | rendering | finalizing | error
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [renderEta, setRenderEta] = useState('');
  const cancelTokenRef = useRef(null);
  const renderStartRef = useRef(0);
  const [videoOptions, setVideoOptions] = useState({ background: DEFAULT_BACKGROUND, showWaveform: true });

  // ---- Audio Cleanup: pure client-side Web Audio DSP (see
  // lib/media/audioCleanup.js) — reduces hum/rumble/hiss and can level
  // out volume, entirely separate from transcription/captioning above. ----
  const [cleanupIntensity, setCleanupIntensity] = useState('medium');
  const [cleanupReduceHum, setCleanupReduceHum] = useState(true);
  const [cleanupVoiceEnhance, setCleanupVoiceEnhance] = useState(false);
  const [cleanupNormalize, setCleanupNormalize] = useState(true);
  const [cleanupCompress, setCleanupCompress] = useState(false);
  const [cleanupEq, setCleanupEq] = useState({ bass: 0, mid: 0, treble: 0 });
  const [cleanupStatus, setCleanupStatus] = useState('idle'); // idle | processing | error
  const [cleanupError, setCleanupError] = useState('');
  const [cleanedResult, setCleanedResult] = useState(null); // { blob, url } | null
  const [replaceVideoStatus, setReplaceVideoStatus] = useState('idle'); // idle | sending
  const [replaceVideoError, setReplaceVideoError] = useState('');
  const [replaceAudioChoice, setReplaceAudioChoice] = useState('cleaned'); // 'cleaned' | 'original' — only matters once cleanedResult exists

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
    if (cancelTokenRef.current) cancelTokenRef.current.cancelled = true;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (cleanedResult?.url) URL.revokeObjectURL(cleanedResult.url);
    setActiveCategory('transcribe');
    setFile(null);
    setFileUrl(null);
    setMetadata(null);
    setPeaks(null);
    setTranscript(null);
    setTranscribeStatus('idle');
    setTranscribeError('');
    setTranscribeProgress(null);
    setRenderStatus('idle');
    setRenderProgress(0);
    setRenderError('');
    setRenderEta('');
    setVideoOptions({ background: DEFAULT_BACKGROUND, showWaveform: true });
    setCleanupStatus('idle');
    setCleanupError('');
    setCleanedResult(null);
  }

  async function handleCleanAudio() {
    if (!file) return;
    setCleanupStatus('processing');
    setCleanupError('');
    try {
      const { blob } = await cleanAudioFile(file, {
        intensity: cleanupIntensity,
        reduceHum: cleanupReduceHum,
        voiceEnhance: cleanupVoiceEnhance,
        normalize: cleanupNormalize,
        compress: cleanupCompress,
        eq: cleanupEq,
      });
      if (cleanedResult?.url) URL.revokeObjectURL(cleanedResult.url);
      setCleanedResult({ blob, url: URL.createObjectURL(blob) });
      setCleanupStatus('idle');
    } catch (err) {
      setCleanupStatus('error');
      setCleanupError(err.message || 'Could not clean this audio. Please try again.');
    }
  }
  function handleDownloadCleaned() {
    if (!cleanedResult || !file) return;
    downloadBlob(cleanedResult.blob, 'audio/wav', `${baseName(file.name)}-cleaned.wav`);
  }

  async function handleTranscribe() {
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
    } catch (err) {
      setTranscribeStatus('error');
      setTranscribeError(err instanceof TranscriptionError ? err.message : 'Transcription failed. Please try again.');
      setTranscribeProgress(null);
    }
  }

  // Real progress ("part 2 of 5"), not an indefinite spinner, once a file
  // is long enough to need more than one chunk — see STATUS_LABEL for the
  // single-chunk / non-transcribing fallback text.
  function transcribeStatusLabel() {
    if (transcribeStatus === 'transcribing' && transcribeProgress) {
      return `Transcribing part ${transcribeProgress.chunkIndex + 1} of ${transcribeProgress.totalChunks}…`;
    }
    return STATUS_LABEL[transcribeStatus] || 'Working…';
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
    setRenderEta('');
    const cancelToken = { cancelled: false };
    cancelTokenRef.current = cancelToken;
    renderStartRef.current = Date.now();
    try {
      const mp4Blob = await renderCaptionedVideo({
        file, peaks, transcript,
        background: videoOptions.background,
        showWaveform: videoOptions.showWaveform,
        onStatus: (s) => setRenderStatus(s === 'done' ? 'idle' : s),
        onProgress: (p) => {
          setRenderProgress(p);
          // A live ETA computed from this render's own measured pace so
          // far — never a canned number, and it self-corrects if a
          // device's real ffmpeg.wasm throughput turns out slower or
          // faster than the finalizing step's early frames suggested.
          const elapsedSec = (Date.now() - renderStartRef.current) / 1000;
          setRenderEta(p > 0.03 ? `~${formatDuration(Math.max(0, elapsedSec / p - elapsedSec))} remaining` : '');
        },
        cancelToken,
      });
      downloadBlob(mp4Blob, 'video/mp4', `${baseName(file.name)}-captioned.mp4`);
      setRenderStatus('idle');
      setRenderEta('');
    } catch (err) {
      if (err instanceof RenderCancelledError) {
        setRenderStatus('idle');
        setRenderProgress(0);
        setRenderEta('');
      } else {
        setRenderStatus('error');
        setRenderError(err.message || 'Could not create the video. Please try again.');
      }
    } finally {
      cancelTokenRef.current = null;
    }
  }

  function handleCancelRender() {
    if (cancelTokenRef.current) cancelTokenRef.current.cancelled = true;
    terminateFFmpeg(); // the only way to interrupt an in-flight ffmpeg.wasm exec() — see ffmpegClient.js
  }

  // Replace Video/Sync Audio's entry point — hands this audio (never
  // re-transcribed, re-generated, or otherwise modified; whatever the user
  // is currently looking at, cleaned or original) off to Video Editor as
  // its independent project audio track, optionally alongside a freshly
  // chosen replacement video as the main track. videoFile is omitted for
  // "Add Images"/"Create Slideshow", which land on Video Editor's normal
  // empty timeline with just the audio already attached — the user picks
  // images once there. Two real blobs, one navigation, no download/
  // re-upload round trip (see blobHandoff.js's `role` param).
  async function handleSendAudioToVideoEditor({ videoFile } = {}) {
    if (!file) return;
    setReplaceVideoError('');
    setReplaceVideoStatus('sending');
    try {
      if (videoFile) {
        const sizeError = validateUploadSize(videoFile, 'video');
        if (sizeError) { setReplaceVideoStatus('idle'); setReplaceVideoError(sizeError); return; }
        await extractVideoMetadata(videoFile); // best-effort decode check — surfaces a corrupt/unsupported file now rather than after navigating away
      }
      const useCleaned = replaceAudioChoice === 'cleaned' && cleanedResult;
      const audioBlob = useCleaned ? cleanedResult.blob : file;
      const audioFilename = useCleaned ? `${baseName(file.name)}-cleaned.wav` : file.name;
      const sentAudio = await sendBlobToTool('video-editor', audioBlob, audioFilename, 'project-audio');
      const sentVideo = videoFile ? await sendBlobToTool('video-editor', videoFile, videoFile.name) : true;
      if (!sentAudio || !sentVideo) {
        setReplaceVideoStatus('idle');
        setReplaceVideoError('Could not hand off to Video Editor. Please try again.');
        return;
      }
      window.location.href = '/video-editor';
    } catch (err) {
      setReplaceVideoStatus('idle');
      setReplaceVideoError(err?.message || (videoFile ? 'Could not read this video file — it may be an unsupported or corrupted format.' : 'Could not hand off this audio. Please try again.'));
    }
  }

  const isBusy = transcribeStatus === 'preparing' || transcribeStatus === 'transcribing' || transcribeStatus === 'merging';
  const isRendering = renderStatus === 'preparing' || renderStatus === 'rendering' || renderStatus === 'finalizing';

  // Editor-shell chrome (header + tool rail) always renders, matching Video
  // Editor's pattern — only the preview slot (waveform vs. drop box) and
  // each rail category's panel content change based on whether a file is
  // loaded yet, so the tool doesn't visually "jump" once one lands.
  return (
    <div className="as-shell" style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', flexShrink: 0 }}>🎙️ Audio Studio</span>
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

      <div className="as-body">
        <div className="as-rail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#0F172A', borderRight: '1px solid #1E293B', flexShrink: 0, overflowX: 'auto' }}>
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
            {/* Left: preview — waveform once a file exists, drop box in the same slot until then */}
            <div style={{ flex: '1 1 340px', minWidth: 300, maxWidth: 420 }}>
              {file ? (
                <>
                  {metadata && (
                    <div style={{ fontSize: '0.76rem', color: T.mutedDark, marginBottom: 8 }}>
                      {formatDuration(metadata.duration)} · {(metadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      {metadata.format ? ` · ${metadata.format.toUpperCase()}` : ''}
                      {metadata.sampleRate ? ` · ${(metadata.sampleRate / 1000).toFixed(1)}kHz` : ''}
                      {metadata.channels ? ` · ${metadata.channels === 1 ? 'Mono' : metadata.channels === 2 ? 'Stereo' : `${metadata.channels}ch`}` : ''}
                    </div>
                  )}
                  {peaks && (
                    <WaveformPlayer ref={playerRef} src={fileUrl} peaks={peaks} duration={metadata?.duration} onTimeUpdate={setCurrentTime} />
                  )}
                </>
              ) : (
                <>
                  <UploadBox
                    accept="audio/*"
                    onFiles={handleFiles}
                    maxSizeMB={MAX_UPLOAD_AUDIO_BYTES / (1024 * 1024)}
                    label="Click to choose an audio file, or drag it here"
                  />
                  <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
                    MP3, WAV, M4A, AAC, OGG, and WebM audio are supported.
                  </p>
                </>
              )}
              {metaError && <div style={{ ...statusBox, marginTop: 12 }}>⚠️ {metaError}</div>}
            </div>

            {/* Right: the selected rail category's panel */}
            <div style={{ flex: '1 1 380px', minWidth: 320 }}>
              {activeCategory === 'transcribe' && (
                !file ? (
                  <EmptyPanel icon="🎙️" label="Transcribe">Upload an audio file on the left to transcribe it, edit the transcript, and download SRT/VTT/TXT captions.</EmptyPanel>
                ) : !transcript ? (
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <button onClick={handleTranscribe} disabled={isBusy} style={primaryBtn(isBusy)}>
                      {isBusy ? transcribeStatusLabel() : '🎙️ Transcribe'}
                    </button>
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

              {activeCategory === 'cleanup' && (
                !file ? (
                  <EmptyPanel icon="🧹" label="Cleanup">Upload an audio file on the left to reduce background hum, rumble, and hiss, with optional voice clarity and volume normalization.</EmptyPanel>
                ) : (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'white', border: `1px solid ${T.border}` }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: T.ink }}>Audio Cleanup</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.76rem', color: T.mutedDark }}>
                      Reduces background hum, low-end rumble, and quiet hiss between speech, with optional voice clarity and volume leveling — plain signal processing, not AI. It genuinely helps a noisy recording sound cleaner, but won&apos;t remove every kind of noise perfectly.
                    </p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Intensity</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {CLEANUP_INTENSITIES.map((level) => (
                            <button key={level} onClick={() => setCleanupIntensity(level)}
                              style={{ ...smallBtn, padding: '5px 12px', fontSize: '0.72rem', textTransform: 'capitalize', background: cleanupIntensity === level ? T.accentGradient : 'white', color: cleanupIntensity === level ? 'white' : T.inkSecondary, border: cleanupIntensity === level ? 'none' : `1px solid ${T.border}` }}>
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: T.inkSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={cleanupReduceHum} onChange={(e) => setCleanupReduceHum(e.target.checked)} />
                        Reduce hum/buzz
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: T.inkSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={cleanupVoiceEnhance} onChange={(e) => setCleanupVoiceEnhance(e.target.checked)} />
                        Voice enhancement
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: T.inkSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={cleanupNormalize} onChange={(e) => setCleanupNormalize(e.target.checked)} />
                        Normalize volume
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: T.inkSecondary, cursor: 'pointer' }} title="Evens out loud/quiet moments as they happen, rather than one flat volume change">
                        <input type="checkbox" checked={cleanupCompress} onChange={(e) => setCleanupCompress(e.target.checked)} />
                        Compression
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark }}>EQ</div>
                      {[['bass', 'Bass'], ['mid', 'Mid'], ['treble', 'Treble']].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: T.inkSecondary }}>
                          {label} {cleanupEq[key] > 0 ? '+' : ''}{cleanupEq[key]}dB
                          <input type="range" min={-12} max={12} step={1} value={cleanupEq[key]}
                            onChange={(e) => setCleanupEq((eq) => ({ ...eq, [key]: parseInt(e.target.value, 10) }))} style={{ width: 90 }} />
                        </label>
                      ))}
                    </div>
                    <button onClick={handleCleanAudio} disabled={cleanupStatus === 'processing'} style={{ ...smallBtn, background: cleanupStatus === 'processing' ? '#94A3B8' : T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>
                      {cleanupStatus === 'processing' ? 'Cleaning…' : '🧹 Clean Audio'}
                    </button>
                    {cleanupStatus === 'error' && <div style={{ ...statusBox, marginTop: 10 }}>⚠️ {cleanupError}</div>}
                    {cleanedResult && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Original</div>
                            <audio controls src={fileUrl} style={{ width: '100%', height: 32 }} />
                          </div>
                          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Cleaned</div>
                            <audio controls src={cleanedResult.url} style={{ width: '100%', height: 32 }} />
                          </div>
                        </div>
                        <button onClick={handleDownloadCleaned} style={{ ...smallBtn, marginTop: 10 }}>⬇ Download cleaned audio (WAV)</button>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeCategory === 'video' && (
                !file ? (
                  <EmptyPanel icon="🎬" label="Video">Upload an audio file on the left, transcribe it, then turn it into a downloadable captioned video here.</EmptyPanel>
                ) : (<>
                <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>🎥 Continue with a video</div>
                  <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: T.mutedDark }}>
                    Choose what becomes the visual side of your video — this audio goes straight into Video Editor with it, no download or re-upload. If your audio and the visual source are different lengths, Video Editor shows both durations clearly so you can trim, split, or extend to match them up.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ ...smallBtn, display: 'inline-block', cursor: 'pointer' }}>
                      🎥 Add Video
                      <input type="file" accept="video/*" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleSendAudioToVideoEditor({ videoFile: f }); }} />
                    </label>
                    <button onClick={() => handleSendAudioToVideoEditor()} style={smallBtn}>🖼️ Add Images</button>
                    <button onClick={() => handleSendAudioToVideoEditor()} style={smallBtn}>🎞️ Create Slideshow</button>
                  </div>
                  {cleanedResult && (
                    <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '0.76rem', color: T.mutedDark }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                        <input type="radio" checked={replaceAudioChoice === 'cleaned'} onChange={() => setReplaceAudioChoice('cleaned')} /> Use cleaned audio
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                        <input type="radio" checked={replaceAudioChoice === 'original'} onChange={() => setReplaceAudioChoice('original')} /> Use original audio
                      </label>
                    </div>
                  )}
                  {replaceVideoStatus === 'sending' && <p style={{ margin: '10px 0 0', fontSize: '0.76rem', color: T.mutedDark }}>Sending to Video Editor…</p>}
                  {replaceVideoError && <div style={{ ...statusBox, marginTop: 10 }}>⚠️ {replaceVideoError}</div>}
                </div>
                {!transcript ? (
                  <EmptyPanel icon="🎬" label="Captioned Video">Transcribe this audio first (in the Transcribe tab) to unlock creating a captioned video.</EmptyPanel>
                ) : isCaptionedVideoSupported() ? (
                  <div style={{ padding: '16px', borderRadius: 12, background: T.accentTint, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: T.inkSecondary }}>
                      Turn this audio into a downloadable video with your captions burned in — pick a background image or color, plus a waveform, and your transcript's captions.
                    </p>
                    <BackgroundPicker peaks={peaks} value={videoOptions} onChange={setVideoOptions} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={handleCreateVideo} disabled={isRendering} style={primaryBtn(isRendering)}>
                        {isRendering ? `${RENDER_STATUS_LABEL[renderStatus] || 'Working…'} ${Math.round(renderProgress * 100)}%` : '🎬 Create Captioned Video'}
                      </button>
                      {isRendering && (
                        <button onClick={handleCancelRender} style={ghostBtn}>Cancel</button>
                      )}
                    </div>
                    {isRendering && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: T.muted }}>
                        Keep this tab open while your video renders{renderEta ? ` — ${renderEta}` : ''}. Rendering happens entirely in this browser tab and can take longer than the audio itself, especially during the final MP4 step.
                      </p>
                    )}
                    {renderStatus === 'error' && <div style={{ ...statusBox, marginTop: 12, display: 'inline-block' }}>⚠️ {renderError}</div>}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: T.muted, textAlign: 'center' }}>
                    Creating a captioned video isn&apos;t supported in this browser. Try a recent version of Chrome, Edge, or Firefox.
                  </p>
                )}
                </>)
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 20, textAlign: 'center' }}>
            Your audio is processed in your browser. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript — it is not stored afterward.
          </p>
        </div>
      </div>

      <style jsx>{`
        .as-body { display: flex; }
        @media (max-width: 720px) {
          .as-body { flex-direction: column; }
          .as-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #1E293B; }
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
