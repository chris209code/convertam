'use client';

// Standalone Compress & Split Video — exists for one reason: every other
// video tool on Convertam (Video Editor, Video Studio) caps uploads at
// MAX_UPLOAD_VIDEO_BYTES (500MB) because their own processing genuinely
// can't handle more. This tool accepts up to MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR
// (2GB — see limits.js for why not literally unlimited) for the sole purpose
// of shrinking or cutting an oversized file down to something those tools'
// normal limit can handle, then hands the result straight to Video Editor via
// the same blob-handoff mechanism Screen Recorder already uses — no manual
// download-then-reupload round trip.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import UploadBox from '@/components/UploadBox';
import { T } from '../smart-parser/theme';
import { downloadBlob } from '@/lib/dataTools/shared';
import { sendBlobToTool } from '@/lib/media/blobHandoff';
import { extractVideoBasicMetadata, formatDuration } from '@/lib/media/metadata';
import { MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR } from '@/lib/media/limits';
import { compressVideo, splitVideoIntoChunks, terminateFFmpeg, FfmpegLoadError, FfmpegRenderError, FfmpegCancelledError } from '@/lib/media/ffmpegClient';

const RAIL_CATEGORIES = [
  { id: 'compress', icon: '🗜️', label: 'Compress' },
  { id: 'split', icon: '✂️', label: 'Split' },
];

const RESOLUTION_OPTIONS = [
  { id: 'original', label: 'Original' },
  { id: '1080p', label: '1080p' },
  { id: '720p', label: '720p' },
  { id: '480p', label: '480p' },
];
const QUALITY_OPTIONS = [
  { id: 'high', label: 'High' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'small', label: 'Small' },
];
const CHUNK_MINUTE_OPTIONS = [2, 5, 10, 15];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function baseName(name) {
  return (name || 'video').replace(/\.[^.]+$/, '');
}

export default function CompressVideoWorkspace() {
  const [activeCategory, setActiveCategory] = useState('compress');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [reading, setReading] = useState(false);

  // ---- Compress ----
  const [compressResolution, setCompressResolution] = useState('720p');
  const [compressQuality, setCompressQuality] = useState('balanced');
  const [compressStatus, setCompressStatus] = useState('idle'); // idle | working | error
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressError, setCompressError] = useState('');
  const [compressEta, setCompressEta] = useState('');
  const [compressResult, setCompressResult] = useState(null); // { blob, url, sizeBytes }
  const compressCancelRef = useRef(null);
  const compressStartRef = useRef(0);

  // ---- Split ----
  const [splitChunkMinutes, setSplitChunkMinutes] = useState(5);
  const [splitStatus, setSplitStatus] = useState('idle'); // idle | working | error
  const [splitProgress, setSplitProgress] = useState(0);
  const [splitError, setSplitError] = useState('');
  const [splitChunks, setSplitChunks] = useState(null); // [{ blob, ext, url, sizeBytes }]
  const splitCancelRef = useRef(null);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (compressResult?.url) URL.revokeObjectURL(compressResult.url);
    (splitChunks || []).forEach((c) => URL.revokeObjectURL(c.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files) {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR) {
      setUploadError(`This file is larger than the current ${Math.round(MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR / (1024 * 1024 * 1024))}GB limit for this tool.`);
      return;
    }
    reset();
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setUploadError('');
    setReading(true);
    try {
      const meta = await extractVideoBasicMetadata(f);
      setMetadata(meta);
    } catch (err) {
      setMetaError(err.message || 'Could not read this video file.');
    } finally {
      setReading(false);
    }
  }

  function reset() {
    if (compressCancelRef.current) compressCancelRef.current.cancelled = true;
    if (splitCancelRef.current) splitCancelRef.current.cancelled = true;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (compressResult?.url) URL.revokeObjectURL(compressResult.url);
    (splitChunks || []).forEach((c) => URL.revokeObjectURL(c.url));
    setActiveCategory('compress');
    setFile(null);
    setFileUrl(null);
    setMetadata(null);
    setMetaError('');
    setUploadError('');
    setCompressStatus('idle');
    setCompressProgress(0);
    setCompressError('');
    setCompressEta('');
    setCompressResult(null);
    setSplitStatus('idle');
    setSplitProgress(0);
    setSplitError('');
    setSplitChunks(null);
  }

  async function handleCompress() {
    if (!file) return;
    setCompressStatus('working');
    setCompressError('');
    setCompressProgress(0);
    setCompressEta('');
    if (compressResult?.url) URL.revokeObjectURL(compressResult.url);
    setCompressResult(null);
    const cancelToken = { cancelled: false };
    compressCancelRef.current = cancelToken;
    compressStartRef.current = Date.now();
    try {
      const blob = await compressVideo({
        videoFile: file,
        resolution: compressResolution,
        quality: compressQuality,
        onProgress: (p) => {
          setCompressProgress(p);
          const elapsedSec = (Date.now() - compressStartRef.current) / 1000;
          setCompressEta(p > 0.03 ? `~${formatDuration(Math.max(0, elapsedSec / p - elapsedSec))} remaining` : '');
        },
        cancelToken,
      });
      setCompressResult({ blob, url: URL.createObjectURL(blob), sizeBytes: blob.size });
      setCompressStatus('idle');
      setCompressEta('');
    } catch (err) {
      if (err instanceof FfmpegCancelledError || cancelToken.cancelled) {
        setCompressStatus('idle');
        setCompressProgress(0);
        setCompressEta('');
      } else {
        setCompressStatus('error');
        setCompressError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError ? err.message : 'Could not compress this video. Please try again.');
      }
    } finally {
      compressCancelRef.current = null;
    }
  }
  function handleCancelCompress() {
    if (compressCancelRef.current) compressCancelRef.current.cancelled = true;
    terminateFFmpeg();
  }
  function handleDownloadCompressed() {
    if (!compressResult || !file) return;
    downloadBlob(compressResult.blob, 'video/mp4', `${baseName(file.name)}-compressed.mp4`);
  }
  async function handleOpenCompressedInEditor() {
    if (!compressResult || !file) return;
    const filename = `${baseName(file.name)}-compressed.mp4`;
    const sent = await sendBlobToTool('video-editor', compressResult.blob, filename);
    if (!sent) { handleDownloadCompressed(); return; }
    window.location.href = '/video-editor';
  }

  async function handleSplit() {
    if (!file || !metadata?.duration) return;
    setSplitStatus('working');
    setSplitError('');
    setSplitProgress(0);
    (splitChunks || []).forEach((c) => URL.revokeObjectURL(c.url));
    setSplitChunks(null);
    const cancelToken = { cancelled: false };
    splitCancelRef.current = cancelToken;
    try {
      const parts = await splitVideoIntoChunks({
        videoFile: file,
        chunkSeconds: splitChunkMinutes * 60,
        totalDurationSeconds: metadata.duration,
        onProgress: setSplitProgress,
        cancelToken,
      });
      setSplitChunks(parts.map(({ blob, ext }) => ({ blob, ext, url: URL.createObjectURL(blob), sizeBytes: blob.size })));
      setSplitStatus('idle');
    } catch (err) {
      if (err instanceof FfmpegCancelledError || cancelToken.cancelled) {
        setSplitStatus('idle');
        setSplitProgress(0);
      } else {
        setSplitStatus('error');
        setSplitError(err instanceof FfmpegLoadError || err instanceof FfmpegRenderError ? err.message : 'Could not split this video. Please try again.');
      }
    } finally {
      splitCancelRef.current = null;
    }
  }
  function handleCancelSplit() {
    if (splitCancelRef.current) splitCancelRef.current.cancelled = true;
    terminateFFmpeg();
  }
  function handleDownloadChunk(i) {
    if (!splitChunks?.[i] || !file) return;
    const c = splitChunks[i];
    downloadBlob(c.blob, c.blob.type || 'video/mp4', `${baseName(file.name)}-part${i + 1}.${c.ext}`);
  }
  async function handleDownloadAllChunksZip() {
    if (!splitChunks?.length || !file) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    splitChunks.forEach((c, i) => zip.file(`${baseName(file.name)}-part${i + 1}.${c.ext}`, c.blob));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'application/zip', `${baseName(file.name)}-split.zip`);
  }
  async function handleOpenChunkInEditor(i) {
    if (!splitChunks?.[i] || !file) return;
    const c = splitChunks[i];
    const filename = `${baseName(file.name)}-part${i + 1}.${c.ext}`;
    const sent = await sendBlobToTool('video-editor', c.blob, filename);
    if (!sent) { handleDownloadChunk(i); return; }
    window.location.href = '/video-editor';
  }

  const isCompressing = compressStatus === 'working';
  const isSplitting = splitStatus === 'working';
  const isBusy = isCompressing || isSplitting;
  const estimatedChunkCount = metadata?.duration ? Math.max(1, Math.ceil(metadata.duration / (splitChunkMinutes * 60))) : null;

  return (
    <div className="cs-shell" style={{ fontFamily: T.font, background: '#0B1120', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', flexShrink: 0 }}>🗜️ Compress & Split Video</span>
          {file && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {file.name}
            </span>
          )}
        </div>
        {file && (
          <button onClick={reset} disabled={isBusy} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: isBusy ? '#94A3B8' : 'white', color: isBusy ? 'white' : T.accentDark, fontSize: '0.78rem', fontWeight: 800, cursor: isBusy ? 'default' : 'pointer', fontFamily: T.font, flexShrink: 0 }}>
            ⇄ Replace file
          </button>
        )}
      </div>

      <div className="cs-body">
        <div className="cs-rail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#0F172A', borderRight: '1px solid #1E293B', flexShrink: 0, overflowX: 'auto' }}>
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
                  {reading && <div style={{ fontSize: '0.76rem', color: T.muted, marginBottom: 8 }}>Reading video details…</div>}
                  {metadata && (
                    <div style={{ fontSize: '0.76rem', color: T.mutedDark, marginBottom: 8 }}>
                      {metadata.duration ? formatDuration(metadata.duration) : '—'} · {formatBytes(metadata.sizeBytes)}
                      {metadata.width && metadata.height ? ` · ${metadata.width}×${metadata.height}` : ''}
                      {metadata.format ? ` · ${metadata.format.toUpperCase()}` : ''}
                    </div>
                  )}
                  <video src={fileUrl} controls style={{ width: '100%', maxHeight: 360, borderRadius: 12, background: '#000', display: 'block' }} />
                </>
              ) : (
                <>
                  <UploadBox
                    accept="video/*"
                    onFiles={handleFiles}
                    maxSizeMB={MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR / (1024 * 1024)}
                    label="Click to choose a video to compress or split, or drag it here"
                  />
                  <p style={{ fontSize: '0.76rem', color: T.muted, marginTop: 10, textAlign: 'center' }}>
                    Up to {Math.round(MAX_UPLOAD_VIDEO_BYTES_COMPRESSOR / (1024 * 1024 * 1024))}GB — much larger than{' '}
                    <Link href="/video-editor" style={{ color: T.accentDark, fontWeight: 700, textDecoration: 'none' }}>Video Editor</Link>
                    {' '}and{' '}
                    <Link href="/video-studio" style={{ color: T.accentDark, fontWeight: 700, textDecoration: 'none' }}>Video Studio</Link>
                    {"'"}s normal 500MB limit, for exactly this: shrinking or cutting an oversized file down to size first.
                  </p>
                </>
              )}
              {(uploadError || metaError) && <div style={{ padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, marginTop: 12 }}>⚠️ {uploadError || metaError}</div>}
            </div>

            {/* Right: the selected rail category's panel */}
            <div style={{ flex: '1 1 380px', minWidth: 320 }}>
              {activeCategory === 'compress' && (
                !file ? (
                  <EmptyPanel icon="🗜️" label="Compress">Upload a video on the left to shrink its file size — pick a lower resolution and/or quality, then download or send it straight to Video Editor.</EmptyPanel>
                ) : (
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 }}>Compress</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Resolution</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {RESOLUTION_OPTIONS.map((r) => (
                            <button key={r.id} onClick={() => setCompressResolution(r.id)} disabled={isBusy}
                              style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.72rem', background: compressResolution === r.id ? T.accentGradient : 'white', color: compressResolution === r.id ? 'white' : T.inkSecondary, border: compressResolution === r.id ? 'none' : `1px solid ${T.border}` }}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Quality</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {QUALITY_OPTIONS.map((q) => (
                            <button key={q.id} onClick={() => setCompressQuality(q.id)} disabled={isBusy}
                              style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.72rem', background: compressQuality === q.id ? T.accentGradient : 'white', color: compressQuality === q.id ? 'white' : T.inkSecondary, border: compressQuality === q.id ? 'none' : `1px solid ${T.border}` }}>
                              {q.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: T.muted, margin: '0 0 12px' }}>
                      Lower resolution and smaller quality both reduce file size — a smaller resolution helps the most for a large file. Re-encoding runs entirely in your browser and takes real time proportional to the video{"'"}s length.
                    </p>
                    <button onClick={handleCompress} disabled={isCompressing || isSplitting} style={{ ...smallBtn, background: isCompressing ? '#94A3B8' : T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>
                      {isCompressing ? `Compressing… ${Math.round(compressProgress * 100)}%` : '🗜️ Compress Video'}
                    </button>
                    {isCompressing && (
                      <>
                        <button onClick={handleCancelCompress} style={{ ...ghostBtn, marginLeft: 8 }}>Cancel</button>
                        {compressEta && <p style={{ fontSize: '0.72rem', color: T.muted, margin: '8px 0 0' }}>Keep this tab open — {compressEta}.</p>}
                      </>
                    )}
                    {compressStatus === 'error' && <div style={{ padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, marginTop: 10 }}>⚠️ {compressError}</div>}
                    {compressResult && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A', margin: '0 0 10px' }}>
                          {formatBytes(file.size)} → {formatBytes(compressResult.sizeBytes)} ({Math.max(0, Math.round((1 - compressResult.sizeBytes / file.size) * 100))}% smaller)
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={handleDownloadCompressed} style={smallBtn}>⬇ Download</button>
                          <button onClick={handleOpenCompressedInEditor} style={{ ...smallBtn, background: T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>Open in Video Editor →</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeCategory === 'split' && (
                !file ? (
                  <EmptyPanel icon="✂️" label="Split">Upload a video on the left to cut it into consecutive, similarly-sized pieces you can download individually or send to Video Editor.</EmptyPanel>
                ) : (
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.ink, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 }}>Split</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>Split into chunks of</div>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                      {CHUNK_MINUTE_OPTIONS.map((m) => (
                        <button key={m} onClick={() => setSplitChunkMinutes(m)} disabled={isBusy}
                          style={{ ...smallBtn, padding: '5px 10px', fontSize: '0.72rem', background: splitChunkMinutes === m ? T.accentGradient : 'white', color: splitChunkMinutes === m ? 'white' : T.inkSecondary, border: splitChunkMinutes === m ? 'none' : `1px solid ${T.border}` }}>
                          {m} min
                        </button>
                      ))}
                    </div>
                    {estimatedChunkCount && (
                      <p style={{ fontSize: '0.76rem', color: T.mutedDark, margin: '0 0 10px' }}>
                        This will produce about {estimatedChunkCount} part{estimatedChunkCount === 1 ? '' : 's'}.
                      </p>
                    )}
                    <p style={{ fontSize: '0.72rem', color: T.muted, margin: '0 0 12px' }}>
                      Splitting copies the video without re-encoding — fast and lossless, but each cut lands on the nearest keyframe rather than an exact frame, so a part{"'"}s length can be off by a couple of seconds. For frame-accurate trimming, use Video Editor afterward.
                    </p>
                    <button onClick={handleSplit} disabled={isCompressing || isSplitting || !metadata?.duration} style={{ ...smallBtn, background: isSplitting ? '#94A3B8' : T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>
                      {isSplitting ? `Splitting… ${Math.round(splitProgress * 100)}%` : '✂️ Split Video'}
                    </button>
                    {isSplitting && <button onClick={handleCancelSplit} style={{ ...ghostBtn, marginLeft: 8 }}>Cancel</button>}
                    {splitStatus === 'error' && <div style={{ padding: '10px 14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, marginTop: 10 }}>⚠️ {splitError}</div>}
                    {splitChunks && splitChunks.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A', margin: 0 }}>{splitChunks.length} part{splitChunks.length === 1 ? '' : 's'} ready</p>
                          {splitChunks.length > 1 && <button onClick={handleDownloadAllChunksZip} style={smallBtn}>⬇ Download All (ZIP)</button>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {splitChunks.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                              <span style={{ fontSize: '0.78rem', color: T.inkSecondary }}>Part {i + 1} · {formatBytes(c.sizeBytes)}</span>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => handleDownloadChunk(i)} style={{ ...smallBtn, padding: '4px 10px', fontSize: '0.7rem' }}>⬇</button>
                                <button onClick={() => handleOpenChunkInEditor(i)} style={{ ...smallBtn, padding: '4px 10px', fontSize: '0.7rem', background: T.accentGradient, color: 'white', border: 'none', fontWeight: 700 }}>Open in Editor →</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 20, textAlign: 'center' }}>
            Everything happens in your browser — your video is never uploaded to a server, at any size.
          </p>
        </div>
      </div>

      <style jsx>{`
        .cs-body { display: flex; }
        @media (max-width: 720px) {
          .cs-body { flex-direction: column; }
          .cs-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #1E293B; }
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

const smallBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 700, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const ghostBtn = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
