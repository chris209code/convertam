'use client';

import { useState } from 'react';
import Script from 'next/script';
import { buildPptxFromOutline, PPTX_THEMES } from '@/lib/buildPptxFromOutline';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

const TONES = ['Professional', 'Academic', 'Educational', 'Sales/Pitch', 'Simple'];
const LENGTHS = [
  { key: 'short', label: 'Short (5-7 slides)' },
  { key: 'standard', label: 'Standard (8-12 slides)' },
  { key: 'detailed', label: 'Detailed (13-20 slides)' },
  { key: 'custom', label: 'Custom' },
];

const THEMES = PPTX_THEMES;

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
function fileToText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}

async function extractPdfText(file) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

async function extractDocxText(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || '').trim();
}

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 };
const chipBtn = (active) => ({ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: active ? '2px solid #2563EB' : '1px solid #E2E8F0', background: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#475569' });

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PresentationGeneratorWorkspace() {
  const [phase, setPhase] = useState('upload');
  const [files, setFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');

  const [settings, setSettings] = useState({
    presentationTitle: '', audience: '', purpose: '', tone: 'Professional',
    length: 'standard', customLength: 10, theme: 'modern',
    includeNotes: false, includeSources: false,
  });

  const [outline, setOutline] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [slideBusy, setSlideBusy] = useState({});
  const [retoning, setRetoning] = useState(false);
  const [newTone, setNewTone] = useState('Professional');
  const [downloading, setDownloading] = useState(false);

  function handleFiles(e) {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;
    setUploadError('');

    const currentTotal = files.reduce((s, f) => s + f.size, 0);
    const combined = [...files];
    let runningTotal = currentTotal;

    for (const file of incoming) {
      if (combined.length >= MAX_FILES) { setUploadError(`Maximum ${MAX_FILES} files.`); break; }
      if (file.size > MAX_FILE_SIZE) { setUploadError(`"${file.name}" is over the 25 MB per-file limit — skipped.`); continue; }
      if (runningTotal + file.size > MAX_TOTAL_SIZE) { setUploadError('Adding this file would exceed the 50 MB total upload limit — skipped.'); continue; }
      combined.push({ file, name: file.name, type: file.type, size: file.size, status: 'pending', errorMsg: '', extractedText: '', imageData: null });
      runningTotal += file.size;
    }
    setFiles(combined);
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveFile(i, dir) {
    setFiles((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  async function extractAll() {
    setLoadingStage('reading');
    const updated = [...files];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      setLoadingStage('extracting');
      try {
        const isImage = item.type.startsWith('image/');
        if (isImage) {
          const dataUrl = await fileToDataUrl(item.file);
          updated[i] = { ...item, status: 'ok', imageData: { mimeType: item.type, data: dataUrl.split(',')[1] } };
        } else if (item.type === 'application/pdf') {
          const text = await extractPdfText(item.file);
          updated[i] = { ...item, status: text ? 'ok' : 'error', extractedText: text, errorMsg: text ? '' : 'No extractable text found (may be a scanned PDF).' };
        } else if (item.type.includes('word') || item.name.toLowerCase().endsWith('.docx')) {
          const text = await extractDocxText(item.file);
          updated[i] = { ...item, status: text ? 'ok' : 'error', extractedText: text, errorMsg: text ? '' : 'No extractable text found in this document.' };
        } else if (item.type === 'text/plain' || item.name.toLowerCase().endsWith('.txt')) {
          const text = await fileToText(item.file);
          updated[i] = { ...item, status: 'ok', extractedText: text };
        } else {
          updated[i] = { ...item, status: 'error', errorMsg: 'Unsupported file type.' };
        }
      } catch (err) {
        console.error(err);
        updated[i] = { ...item, status: 'error', errorMsg: 'Could not read this file.' };
      }
      setFiles([...updated]);
    }
    return updated;
  }

  async function handleGenerateOutline() {
    setError('');
    const hasPdf = files.some((f) => f.type === 'application/pdf');
    if (hasPdf && !window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    const extracted = await extractAll();
    return runOutline(extracted);
  }

  async function runOutline(fileList) {
    const okFiles = fileList.filter((f) => f.status === 'ok');
    if (!okFiles.length) {
      setError('None of the uploaded files could be read. Please check them and try again.');
      setLoadingStage('');
      return;
    }
    setLoadingStage('organizing');
    const combinedText = okFiles.filter((f) => f.extractedText).map((f) => `--- ${f.name} ---\n${f.extractedText}`).join('\n\n');
    const images = okFiles.filter((f) => f.imageData).map((f) => f.imageData);
    const fileNames = okFiles.map((f) => f.name);

    try {
      setLoadingStage('outline');
      const res = await fetch('/api/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline', text: combinedText, images, fileNames, ...settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate an outline.');
      setOutline(data);
      setPhase('outline');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStage('');
    }
  }

  function updateSlide(i, patch) {
    setOutline((o) => ({ ...o, slides: o.slides.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  }
  function deleteSlide(i) {
    setOutline((o) => ({ ...o, slides: o.slides.filter((_, idx) => idx !== i) }));
  }
  function addSlide(afterIndex) {
    setOutline((o) => {
      const blank = { type: 'content', title: 'New Slide', bullets: ['Add your point here'], speakerNotes: '', sourceFiles: [] };
      const slides = [...o.slides];
      slides.splice(afterIndex + 1, 0, blank);
      return { ...o, slides };
    });
  }
  function moveSlide(i, dir) {
    setOutline((o) => {
      const slides = [...o.slides];
      const j = i + dir;
      if (j < 0 || j >= slides.length) return o;
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...o, slides };
    });
  }

  async function refineSlide(i, modifier) {
    setSlideBusy((b) => ({ ...b, [i]: true }));
    try {
      const res = await fetch('/api/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refineSlide', slide: outline.slides[i], modifier, deckTone: settings.tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update this slide.');
      updateSlide(i, data.slide);
    } catch (err) {
      setError(err.message);
    } finally {
      setSlideBusy((b) => ({ ...b, [i]: false }));
    }
  }

  async function retoneWholeDeck() {
    setRetoning(true);
    setError('');
    try {
      const res = await fetch('/api/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retoneAll', outline, newTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update the tone.');
      setOutline(data);
      setSettings((s) => ({ ...s, tone: newTone }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRetoning(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setLoadingStage('building');
    try {
      const pptx = await buildPptxFromOutline(outline, { themeKey: settings.theme, includeSources: settings.includeSources });
      const fileName = `${(outline.title || 'presentation').trim().replace(/\s+/g, '-').toLowerCase()}.pptx`;
      await pptx.writeFile({ fileName });
    } catch (err) {
      console.error(err);
      setError('Could not build the PowerPoint file. Please try again.');
    } finally {
      setDownloading(false);
      setLoadingStage('');
    }
  }

  function startOver() {
    setPhase('upload');
    setFiles([]);
    setOutline(null);
    setError('');
    setUploadError('');
  }

  const loadingLabels = {
    reading: 'Reading files…',
    extracting: 'Extracting content…',
    organizing: 'Organizing ideas…',
    outline: 'Creating slide outline…',
    building: 'Building presentation…',
  };

  if (phase === 'upload') {
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    return (
      <div className="panel">
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '32px 20px', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload documents to turn into a presentation</p>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 14 }}>PDF, Word (.docx), TXT, or photos of documents. Up to {MAX_FILES} files, 25 MB each.</p>
          <input type="file" multiple accept=".pdf,.docx,.doc,.txt,image/*" onChange={handleFiles} />
          {uploadError && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: 10 }}>{uploadError}</p>}
        </div>

        {files.length > 0 && (
          <>
            <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', width: 18 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{f.type || 'unknown'} · {formatBytes(f.size)}</div>
                  </div>
                  <button onClick={() => moveFile(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === 0 ? '#CBD5E1' : '#475569' }}>↑</button>
                  <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === files.length - 1 ? '#CBD5E1' : '#475569' }}>↓</button>
                  <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.78rem' }}>Remove</button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 20 }}>Total: {formatBytes(totalSize)} / 50 MB — order affects content order in the deck.</p>

            <button className="btn btn-primary" onClick={() => setPhase('settings')}>Next: Presentation Settings →</button>
          </>
        )}
      </div>
    );
  }

  if (phase === 'settings') {
    return (
      <div className="panel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Presentation Title (optional)</label>
            <input style={inputStyle} value={settings.presentationTitle} onChange={(e) => setSettings((s) => ({ ...s, presentationTitle: e.target.value }))} placeholder="Leave blank to let AI suggest one" />
          </div>
          <div>
            <label style={labelStyle}>Audience</label>
            <input style={inputStyle} value={settings.audience} onChange={(e) => setSettings((s) => ({ ...s, audience: e.target.value }))} placeholder="e.g. Executive team, students, investors" />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Purpose</label>
          <input style={inputStyle} value={settings.purpose} onChange={(e) => setSettings((s) => ({ ...s, purpose: e.target.value }))} placeholder="e.g. Report on Q2 performance, pitch a new product" />
        </div>

        <label style={labelStyle}>Tone</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {TONES.map((t) => <button key={t} style={chipBtn(settings.tone === t)} onClick={() => setSettings((s) => ({ ...s, tone: t }))}>{t}</button>)}
        </div>

        <label style={labelStyle}>Length</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {LENGTHS.map((l) => <button key={l.key} style={chipBtn(settings.length === l.key)} onClick={() => setSettings((s) => ({ ...s, length: l.key }))}>{l.label}</button>)}
        </div>
        {settings.length === 'custom' && (
          <div style={{ marginBottom: 14, maxWidth: 200 }}>
            <input type="number" min={3} max={30} style={inputStyle} value={settings.customLength} onChange={(e) => setSettings((s) => ({ ...s, customLength: Number(e.target.value) }))} />
          </div>
        )}

        <label style={{ ...labelStyle, marginTop: 8 }}>Theme</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {Object.entries(THEMES).map(([key, t]) => <button key={key} style={chipBtn(settings.theme === key)} onClick={() => setSettings((s) => ({ ...s, theme: key }))}>{t.label}</button>)}
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.includeNotes} onChange={(e) => setSettings((s) => ({ ...s, includeNotes: e.target.checked }))} /> Include speaker notes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.includeSources} onChange={(e) => setSettings((s) => ({ ...s, includeSources: e.target.checked }))} /> Include source references
          </label>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPhase('upload')}>← Back</button>
          <button className="btn btn-primary" disabled={!!loadingStage} onClick={handleGenerateOutline}>
            {loadingStage ? loadingLabels[loadingStage] : '✨ Generate Outline'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'outline' && outline) {
    return (
      <div className="panel">
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Presentation Title</label>
          <input style={{ ...inputStyle, fontWeight: 700, fontSize: '1rem' }} value={outline.title} onChange={(e) => setOutline((o) => ({ ...o, title: e.target.value }))} />
          <label style={{ ...labelStyle, marginTop: 8 }}>Subtitle</label>
          <input style={inputStyle} value={outline.subtitle || ''} onChange={(e) => setOutline((o) => ({ ...o, subtitle: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: 12, background: '#F5F3FF', borderRadius: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Change tone for the whole deck:</span>
          <select value={newTone} onChange={(e) => setNewTone(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
            {TONES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={retoneWholeDeck} disabled={retoning} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
            {retoning ? 'Rewriting…' : 'Apply'}
          </button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          {outline.slides.map((slide, i) => (
            <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Slide {i + 1} · {slide.type}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => moveSlide(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === 0 ? '#CBD5E1' : '#475569' }}>↑</button>
                  <button onClick={() => moveSlide(i, 1)} disabled={i === outline.slides.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === outline.slides.length - 1 ? '#CBD5E1' : '#475569' }}>↓</button>
                  <button onClick={() => deleteSlide(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.75rem' }}>Delete</button>
                </div>
              </div>

              <input style={{ ...inputStyle, fontWeight: 700, marginBottom: 8 }} value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} />

              {(slide.type === 'title' || slide.type === 'closing' || slide.type === 'section') && (
                <input style={inputStyle} value={slide.subtitle || ''} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} placeholder="Subtitle (optional)" />
              )}

              {slide.type === 'content' && (
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={(slide.bullets || []).join('\n')}
                  onChange={(e) => updateSlide(i, { bullets: e.target.value.split('\n') })}
                />
              )}

              {settings.includeNotes && slide.type === 'content' && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Speaker notes</label>
                  <textarea style={{ ...inputStyle, minHeight: 50 }} value={slide.speakerNotes || ''} onChange={(e) => updateSlide(i, { speakerNotes: e.target.value })} />
                </div>
              )}

              {settings.includeSources && slide.sourceFiles?.length > 0 && (
                <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 6 }}>Source: {slide.sourceFiles.join(', ')}</p>
              )}

              {slide.type === 'content' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button disabled={slideBusy[i]} onClick={() => refineSlide(i, 'regenerate')} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>↻ Regenerate</button>
                  <button disabled={slideBusy[i]} onClick={() => refineSlide(i, 'shorten')} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Shorten</button>
                  <button disabled={slideBusy[i]} onClick={() => refineSlide(i, 'expand')} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Expand</button>
                  {slideBusy[i] && <span style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600 }}>Working…</span>}
                </div>
              )}
              <button onClick={() => addSlide(i)} style={{ marginTop: 10, fontSize: '0.72rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add slide after this one</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={startOver}>Start Over</button>
          <button className="btn btn-ghost" onClick={() => setPhase('settings')}>← Edit Settings</button>
          <button className="btn btn-primary" disabled={downloading} onClick={handleDownload}>
            {downloading ? (loadingLabels[loadingStage] || 'Building…') : '⬇️ Download PowerPoint (.pptx)'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
