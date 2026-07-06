'use client';

import { useState } from 'react';
import Script from 'next/script';

export default function ContractSummarizerWorkspace() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function handleFile(e) {
    setFile(e.target.files[0] || null);
    setResult(null);
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
      text += content.items.map((item) => item.str).join(' ') + '\n';
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
    setResult(null);

    try {
      setStatus('Reading contract…');
      const text = await extractText(file);

      if (!text || text.length < 50) {
        setError('Could not extract text from this PDF. It may be a scanned image — try OCR PDF first, then summarize the result.');
        setBusy(false);
        return;
      }

      setStatus('Analyzing terms and clauses…');
      const res = await fetch('/api/contract-summarizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }

      setResult(data);
      setStatus('');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function copySummary() {
    if (!result) return;
    const lines = [
      `PARTIES: ${result.parties?.join(', ') || '—'}`,
      `EFFECTIVE DATE: ${result.effectiveDate || '—'}`,
      `TERM / DURATION: ${result.term || '—'}`,
      '',
      'KEY OBLIGATIONS:',
      ...(result.obligations || []).map((o) => `- ${o}`),
      '',
      `PAYMENT TERMS: ${result.paymentTerms || '—'}`,
      `TERMINATION: ${result.terminationClause || '—'}`,
      '',
      'POINTS WORTH REVIEWING:',
      ...(result.risks || []).map((r) => `- ${r}`),
      '',
      'PLAIN-LANGUAGE SUMMARY:',
      result.summary || '',
    ].join('\n');
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => {}}
      />

      {!result && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Upload a contract or agreement (PDF)
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            Get the key parties, dates, obligations, payment terms, and anything worth double-checking — in plain language.
          </p>
          <input type="file" accept="application/pdf" onChange={handleFile} />

          {file && (
            <button
              onClick={handleSummarize}
              disabled={busy}
              style={{ display: 'block', margin: '20px auto 0', padding: '12px 24px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}
            >
              {busy ? (status || 'Working…') : 'Summarize Contract'}
            </button>
          )}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Contract Summary</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copySummary} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                {copied ? '✓ Copied' : 'Copy Summary'}
              </button>
              <button onClick={() => { setResult(null); setFile(null); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Summarize Another
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Parties</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A' }}>{(result.parties || []).join(', ') || '—'}</p>
            </div>
            <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Effective Date / Term</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A' }}>{result.effectiveDate || '—'} {result.term ? `· ${result.term}` : ''}</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', margin: '0 0 8px', textTransform: 'uppercase' }}>Key Obligations</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(result.obligations || []).map((o, i) => (
                <li key={i} style={{ fontSize: '0.88rem', color: '#1E293B', marginBottom: 6 }}>{o}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Payment Terms</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A' }}>{result.paymentTerms || '—'}</p>
            </div>
            <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Termination</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A' }}>{result.terminationClause || '—'}</p>
            </div>
          </div>

          {result.risks && result.risks.length > 0 && (
            <div style={{ marginBottom: 16, padding: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', margin: '0 0 8px', textTransform: 'uppercase' }}>⚠ Worth Reviewing Closely</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.risks.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.86rem', color: '#78350F', marginBottom: 6 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ padding: 14, background: '#EFF6FF', borderRadius: 10 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px', textTransform: 'uppercase' }}>Plain-Language Summary</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.6 }}>{result.summary}</p>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 16 }}>
            This is an AI-generated summary for general understanding — it is not legal advice. For anything binding or high-stakes, have a qualified lawyer review the actual document.
          </p>
        </div>
      )}

      <p className="privacy-note">Your document is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
