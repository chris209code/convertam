'use client';

import { useState } from 'react';
import Script from 'next/script';

const MODES = [
  {
    id: 'summary',
    label: 'Quick Summary',
    icon: '📋',
    desc: 'Overview + key points + conclusions',
  },
  {
    id: 'keypoints',
    label: 'Key Points Only',
    icon: '🎯',
    desc: 'Just the important facts and figures',
  },
  {
    id: 'simplify',
    label: 'Simplify Language',
    icon: '✏️',
    desc: 'Rewrite in plain, easy English',
  },
];

export default function SummarizePdfWorkspace() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('summary');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleFile(e) {
    setFile(e.target.files[0] || null);
    setResult('');
    setError('');
    setStatus('');
  }

  async function extractText(file) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text.trim();
  }

  async function handleSummarize() {
    if (!file) return;
    if (!window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    setBusy(true);
    setError('');
    setResult('');

    try {
      setStatus('Reading PDF…');
      const text = await extractText(file);

      if (!text || text.length < 50) {
        setError('Could not extract text from this PDF. It may be a scanned image — try the Smart AI Converter instead.');
        setStatus('');
        setBusy(false);
        return;
      }

      setStatus('AI is analysing your document…');
      const res = await fetch('/api/summarize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not summarize.');

      setResult(data.result);
      setStatus('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace('.pdf', '') || 'document'}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(null);
    setResult('');
    setStatus('');
    setError('');
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      {!result && (
        <>
          {/* Mode selector */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">What would you like?</p>
            <div className="flex flex-col gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors"
                  style={{
                    background: mode === m.id ? '#f0f5ff' : '#fffefb',
                    borderColor: mode === m.id ? '#3a63b8' : '#e2dcc9',
                    borderWidth: mode === m.id ? 2 : 1,
                  }}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <div className="font-semibold text-ink text-sm">{m.label}</div>
                    <div className="text-xs text-ink-soft">{m.desc}</div>
                  </div>
                  {mode === m.id && (
                    <span className="ml-auto text-xs font-bold" style={{ color: '#3a63b8' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* File upload */}
          <label className="dropzone block cursor-pointer mb-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              disabled={!pdfjsReady}
              hidden
            />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">
              {file ? file.name : 'Click to choose a PDF, or drag it here'}
            </div>
            <div className="dz-sub">Works best with text-based PDFs. Max 100MB.</div>
          </label>

          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={!file || busy || !pdfjsReady}
              onClick={handleSummarize}
            >
              {busy ? status || 'Working…' : `${MODES.find(m => m.id === mode)?.icon} ${MODES.find(m => m.id === mode)?.label}`}
            </button>
            {file && <button className="btn btn-ghost" onClick={reset}>Clear</button>}
          </div>

          {error && <div className="status error mt-3">{error}</div>}
        </>
      )}

      {/* Result */}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-ink">{MODES.find(m => m.id === mode)?.label}</p>
              <p className="text-xs text-ink-soft">{file?.name}</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Try another</button>
          </div>

          {/* Result text */}
          <div
            className="rounded-xl p-4 mb-4 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: '#f7f4ec', border: '1px solid #e2dcc9', color: '#1c2333', maxHeight: '420px', overflowY: 'auto' }}
          >
            {result}
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
            </button>
            <button className="btn btn-ghost" onClick={handleDownload}>
              📥 Download as .txt
            </button>
          </div>
        </div>
      )}

      <p className="privacy-note mt-4">
        Your PDF is read locally in your browser. Only the extracted text is sent to our AI — your file is never uploaded.
      </p>
    </div>
  );
}
