'use client';

import { useState } from 'react';
import Script from 'next/script';
import { fileToDataUrl, fileToText, extractPdfText, extractDocxText, formatBytes } from './extractSource';
import { inputStyle, labelStyle, chipBtn, errorBox } from './uiStyles';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

const METHODS = [
  { key: 'topic', label: 'Type a topic', hint: 'Give AI a topic and let it build the presentation from its own knowledge.' },
  { key: 'paste', label: 'Paste text', hint: 'Paste notes, an article, or any text you already have.' },
  { key: 'upload', label: 'Upload documents', hint: 'PDF, Word (.docx), TXT, or photos of documents.' },
  { key: 'scratch', label: 'Start from scratch', hint: 'Skip AI content generation and build a blank presentation yourself.' },
];

export default function InputStep({ onNext, initial }) {
  const [sourceType, setSourceType] = useState(initial?.sourceType || 'topic');
  const [topic, setTopic] = useState(initial?.topic || '');
  const [pastedText, setPastedText] = useState(initial?.pastedText || '');
  const [files, setFiles] = useState(initial?.files || []);
  const [uploadError, setUploadError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

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
      combined.push({ file, name: file.name, type: file.type, size: file.size });
      runningTotal += file.size;
    }
    setFiles(combined);
  }
  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function extractAllFiles() {
    setExtracting(true);
    const results = { text: '', images: [], fileNames: [] };
    try {
      for (const item of files) {
        const isImage = item.type.startsWith('image/');
        if (isImage) {
          const dataUrl = await fileToDataUrl(item.file);
          results.images.push({ mimeType: item.type, data: dataUrl.split(',')[1] });
        } else if (item.type === 'application/pdf') {
          const text = await extractPdfText(item.file);
          if (text) results.text += `--- ${item.name} ---\n${text}\n\n`;
        } else if (item.type.includes('word') || item.name.toLowerCase().endsWith('.docx')) {
          const text = await extractDocxText(item.file);
          if (text) results.text += `--- ${item.name} ---\n${text}\n\n`;
        } else if (item.type === 'text/plain' || item.name.toLowerCase().endsWith('.txt')) {
          const text = await fileToText(item.file);
          if (text) results.text += `--- ${item.name} ---\n${text}\n\n`;
        }
        results.fileNames.push(item.name);
      }
    } finally {
      setExtracting(false);
    }
    return results;
  }

  async function handleNext() {
    setError('');
    if (sourceType === 'topic') {
      if (!topic.trim()) { setError('Please enter a topic.'); return; }
      onNext({ sourceType, topic: topic.trim(), text: '', images: [], fileNames: [] });
      return;
    }
    if (sourceType === 'paste') {
      if (!pastedText.trim()) { setError('Please paste some text.'); return; }
      onNext({ sourceType, topic: '', text: pastedText.trim(), images: [], fileNames: [] });
      return;
    }
    if (sourceType === 'upload') {
      if (!files.length) { setError('Please upload at least one file.'); return; }
      const hasPdf = files.some((f) => f.type === 'application/pdf');
      if (hasPdf && !window.pdfjsLib) { setError('Still loading — please wait a moment and try again.'); return; }
      const extracted = await extractAllFiles();
      if (!extracted.text.trim() && !extracted.images.length) { setError('None of the uploaded files could be read. Please check them and try again.'); return; }
      onNext({ sourceType, topic: '', ...extracted });
      return;
    }
    if (sourceType === 'scratch') {
      onNext({ sourceType, topic: '', text: '', images: [], fileNames: [] });
    }
  }

  return (
    <div className="panel">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>How do you want to start?</p>
      <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 16 }}>Choose an input method for your presentation.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSourceType(m.key)}
            style={{
              textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer',
              border: sourceType === m.key ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: sourceType === m.key ? '#EFF6FF' : 'white',
            }}
          >
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: sourceType === m.key ? '#2563EB' : '#0F172A', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{m.hint}</div>
          </button>
        ))}
      </div>

      {sourceType === 'topic' && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Topic</label>
          <input style={inputStyle} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The impact of renewable energy on rural economies" />
        </div>
      )}

      {sourceType === 'paste' && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Paste your text</label>
          <textarea style={{ ...inputStyle, minHeight: 220, resize: 'vertical' }} value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste notes, an article, a report, or any source text here…" />
        </div>
      )}

      {sourceType === 'upload' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '28px 20px', textAlign: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Upload documents to turn into a presentation</p>
            <input type="file" multiple accept=".pdf,.docx,.doc,.txt,image/*" onChange={handleFiles} />
            {uploadError && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: 10 }}>{uploadError}</p>}
          </div>
          {files.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{f.type || 'unknown'} · {formatBytes(f.size)}</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.78rem' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sourceType === 'scratch' && (
        <div style={{ padding: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 20, fontSize: '0.8rem', color: '#475569' }}>
          You'll get a blank presentation with a title slide to build on yourself — no AI content generation.
        </div>
      )}

      {error && <div style={errorBox}>{error}</div>}

      <button className="btn btn-primary" disabled={extracting} onClick={handleNext}>
        {extracting ? 'Reading files…' : 'Next: Presentation Settings →'}
      </button>
    </div>
  );
}
