'use client';

import { useState } from 'react';

export default function CVImproverWorkspace() {
  const [cvText, setCvText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleImprove() {
    if (!cvText.trim()) { setError('Please paste your CV text first.'); return; }
    setBusy(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/cv-improver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data.improved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyResult() { navigator.clipboard.writeText(result); }

  function downloadResult() {
    const blob = new Blob([result], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'improved-cv.txt';
    a.click();
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
          Target Job Title (optional)
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          placeholder="e.g. Software Engineer, Marketing Manager, Accountant"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
          Paste Your CV / Resume Text
        </label>
        <textarea
          value={cvText}
          onChange={e => setCvText(e.target.value)}
          placeholder="Paste your full CV or resume text here. Include your experience, education, skills, and any other sections..."
          style={{ width: '100%', minHeight: 250, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
        />
        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{cvText.length} characters</p>
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={busy || !cvText.trim()} onClick={handleImprove}>
          {busy ? '✦ AI is improving your CV…' : '✦ Improve My CV with AI'}
        </button>
      </div>

      {error && <div className="status error">{error}</div>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>✅ Improved CV</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyResult} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>📋 Copy</button>
              <button onClick={downloadResult} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, border: 'none', background: '#7C3AED', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>⬇️ Download</button>
            </div>
          </div>
          <textarea
            value={result}
            onChange={e => setResult(e.target.value)}
            style={{ width: '100%', minHeight: 300, padding: '12px', borderRadius: 8, border: '1px solid #DDD6FE', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6, background: '#FAFAFA' }}
          />
        </div>
      )}

      <p className="privacy-note">Your CV is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
