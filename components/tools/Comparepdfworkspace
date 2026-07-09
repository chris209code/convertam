'use client';

import { useState } from 'react';
import Script from 'next/script';

async function extractText(file) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text;
}

// Simple word-level LCS diff — good enough to highlight what actually changed
// between two document versions without pulling in an external diff library.
function diffWords(a, b) {
  const wordsA = a.split(/(\s+)/);
  const wordsB = b.split(/(\s+)/);
  const n = wordsA.length, m = wordsB.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = wordsA[i] === wordsB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (wordsA[i] === wordsB[j]) { result.push({ type: 'same', text: wordsA[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { result.push({ type: 'removed', text: wordsA[i] }); i++; }
    else { result.push({ type: 'added', text: wordsB[j] }); j++; }
  }
  while (i < n) { result.push({ type: 'removed', text: wordsA[i] }); i++; }
  while (j < m) { result.push({ type: 'added', text: wordsB[j] }); j++; }
  return result;
}

export default function ComparePdfWorkspace() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!fileA || !fileB) return;
    if (!window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const [textA, textB] = await Promise.all([extractText(fileA), extractText(fileB)]);
      if (!textA.trim() && !textB.trim()) {
        setError('Neither PDF has extractable text — they may be scanned images. Try OCR PDF first.');
        setBusy(false);
        return;
      }
      setDiff(diffWords(textA, textB));
    } catch (err) {
      console.error(err);
      setError('Something went wrong comparing these files. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const addedCount = diff?.filter((d) => d.type === 'added').length || 0;
  const removedCount = diff?.filter((d) => d.type === 'removed').length || 0;

  return (
    <div className="panel">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {!diff && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Original version</p>
              <input type="file" accept="application/pdf" onChange={(e) => setFileA(e.target.files?.[0] || null)} />
              {fileA && <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>✓ {fileA.name}</p>}
            </div>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>New version</p>
              <input type="file" accept="application/pdf" onChange={(e) => setFileB(e.target.files?.[0] || null)} />
              {fileB && <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>✓ {fileB.name}</p>}
            </div>
          </div>
          <button onClick={handleCompare} disabled={!fileA || !fileB || busy} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (!fileA || !fileB || busy) ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (!fileA || !fileB) ? 'default' : 'pointer' }}>
            {busy ? 'Comparing…' : 'Compare PDFs'}
          </button>
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 12 }}>Compares the actual text content of both PDFs and highlights what was added or removed. Doesn't compare visual layout, images, or formatting.</p>
        </div>
      )}

      {diff && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              <span style={{ color: '#059669', fontWeight: 700 }}>+{addedCount} added</span>
              {'  '}
              <span style={{ color: '#DC2626', fontWeight: 700 }}>−{removedCount} removed</span>
            </p>
            <button onClick={() => { setDiff(null); setFileA(null); setFileB(null); }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Compare Different Files</button>
          </div>
          <div style={{ padding: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: '0.85rem', lineHeight: 1.8, maxHeight: 500, overflowY: 'auto' }}>
            {diff.map((d, i) => {
              if (d.type === 'same') return <span key={i}>{d.text}</span>;
              if (d.type === 'added') return <span key={i} style={{ background: '#DCFCE7', color: '#166534', textDecoration: 'none' }}>{d.text}</span>;
              return <span key={i} style={{ background: '#FEE2E2', color: '#991B1B', textDecoration: 'line-through' }}>{d.text}</span>;
            })}
          </div>
        </div>
      )}

      <p className="privacy-note">Both documents are processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
