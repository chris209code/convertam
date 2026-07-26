'use client';

import { useState, useEffect } from 'react';
import { extractTextFromFile } from '@/lib/extractDocText';
import { getCareerSession, saveCareerSession, clearCareerSession } from '@/lib/careerSession';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const helperStyle = { fontSize: '0.72rem', color: '#64748B', marginTop: 4, lineHeight: 1.5 };
const sectionTitle = { fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' };

const SECTIONS = [
  { key: 'headline', label: 'Headline', placeholder: 'e.g. Quality Assurance Manager at Acme Foods | Food Safety & Compliance', helper: "LinkedIn's short professional tagline shown under your name (220 characters max).", rows: 2 },
  { key: 'about', label: 'About', placeholder: 'Paste your current "About" section here...', helper: 'The longer narrative summary on your profile.', rows: 6 },
  { key: 'experience', label: 'Experience', placeholder: 'Paste one or more role descriptions here — keep company names and dates as they appear on your profile...', helper: 'Company names and dates are never changed — only the wording of what you did.', rows: 6 },
  { key: 'skills', label: 'Skills', placeholder: 'e.g. Quality Assurance, HACCP, Six Sigma, Team Leadership, Excel', helper: 'A comma-separated list of your current skills.', rows: 3 },
];

export default function LinkedInOptimizerWorkspace() {
  const [profile, setProfile] = useState({ headline: '', about: '', experience: '', skills: '' });
  const [targetRole, setTargetRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [inheritedFromSession, setInheritedFromSession] = useState(false);

  const [results, setResults] = useState({}); // { [sectionKey]: { improved, reasoning } }
  const [busyKey, setBusyKey] = useState(null); // null | 'all' | one of SECTIONS' keys
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const [uploadTarget, setUploadTarget] = useState('about');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Inherits Target Job / Industry / Job Description from an active Career
  // Session (set by CV Improver or Cover Letter Writer) so the candidate
  // optimizes their LinkedIn profile toward the same role without retyping
  // this context — but never pulls in CV text itself, since a LinkedIn
  // profile's sections don't map 1:1 onto CV fields.
  useEffect(() => {
    const session = getCareerSession();
    if (!session) return;
    const hasContext = session.jobTitle || session.targetRole || session.industry || session.jobDescription;
    if (!hasContext) return;
    setTargetRole(session.jobTitle || session.targetRole || '');
    setIndustry(session.industry || '');
    setJobDescription(session.jobDescription || '');
    setInheritedFromSession(true);
  }, []);

  function clearInheritedSession() {
    clearCareerSession();
    setInheritedFromSession(false);
    setTargetRole(''); setIndustry(''); setJobDescription('');
  }

  function setSectionText(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    if (file.size > 15 * 1024 * 1024) { setUploadError('File is too large — please upload a file under 15 MB, or paste your text manually instead.'); return; }
    setUploading(true);
    try {
      const { text, error: extractErr } = await extractTextFromFile(file);
      if (extractErr) { setUploadError(extractErr); return; }
      setSectionText(uploadTarget, text);
    } finally {
      setUploading(false);
    }
  }

  async function optimizeSections(keys) {
    const requested = keys.filter((k) => profile[k].trim());
    if (requested.length === 0) {
      setError('Please paste some text into at least one section before optimizing.');
      return;
    }
    setBusyKey(keys.length > 1 ? 'all' : keys[0]);
    setError('');
    try {
      const res = await fetch('/api/linkedin-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: requested, profile, targetRole, industry, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResults((prev) => ({ ...prev, ...data.results }));

      // Refreshes the shared Career Session with whatever job context this
      // run actually used, so a later tool (Cover Letter Writer, or a
      // future ATS Match checker) can continue from it too. Only writes
      // fields this tool actually has — never overwrites CV data from
      // another tool with a blank value.
      const contextUpdate = { sourceTool: 'linkedin-optimizer' };
      if (targetRole.trim()) { contextUpdate.jobTitle = targetRole.trim(); contextUpdate.targetRole = targetRole.trim(); }
      if (industry.trim()) contextUpdate.industry = industry.trim();
      if (jobDescription.trim()) contextUpdate.jobDescription = jobDescription.trim();
      if (Object.keys(contextUpdate).length > 1) saveCareerSession(contextUpdate);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  function copyText(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  function buildFullProfileText() {
    return SECTIONS
      .map((s) => ({ ...s, text: results[s.key]?.improved || profile[s.key] }))
      .filter((s) => s.text.trim())
      .map((s) => `${s.label.toUpperCase()}\n${s.text.trim()}`)
      .join('\n\n');
  }

  function copyEntireProfile() {
    copyText(buildFullProfileText(), 'entire');
  }

  function exportAsText() {
    const text = buildFullProfileText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'linkedin-profile-optimized.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasAnyResult = Object.keys(results).length > 0;
  const hasAnyText = Object.values(profile).some((v) => v.trim());

  return (
    <div className="panel">
      {inheritedFromSession && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #C9F1DE' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#065F46' }}>
            ✓ Continuing your Career Studio session — target role, industry, and job description are already filled in below.
          </p>
          <button onClick={clearInheritedSession} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            Not this job? Start fresh
          </button>
        </div>
      )}

      <p style={{ ...sectionTitle, marginBottom: 10 }}>Target Role (Optional)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Target Job Title</label>
          <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Quality Assurance Manager" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Industry</label>
          <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Manufacturing, Fintech, Healthcare" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Job Description (Optional)</label>
        <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste a job posting to tailor keyword optimization even more precisely..." style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
        <p style={helperStyle}>Optional — helps tailor keyword choices. Every section still works fine without it.</p>
      </div>

      <div className="no-print" style={{ marginBottom: 22, border: '1px dashed #CBD5E1', borderRadius: 12, padding: '14px 16px', background: '#F8FAFC' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a profile export (optional)</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={uploadTarget} onChange={(e) => setUploadTarget(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            {SECTIONS.map((s) => <option key={s.key} value={s.key}>Insert into {s.label}</option>)}
          </select>
          <input type="file" accept=".pdf,.docx,.doc,.txt,application/pdf,text/plain" onChange={handleUpload} disabled={uploading} />
          {uploading && <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Reading your file…</span>}
        </div>
        <p style={helperStyle}>Upload a PDF or Word export of your profile (e.g. LinkedIn's "Save to PDF"). LinkedIn's raw .zip data export isn't supported — paste the relevant text into each section below instead.</p>
        {uploadError && <div className="status error" style={{ marginTop: 8 }}>{uploadError}</div>}
      </div>

      {error && <div className="status error no-print">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {SECTIONS.map((s) => {
          const result = results[s.key];
          const isBusy = busyKey === s.key || busyKey === 'all';
          return (
            <div key={s.key} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div>
                  <h3 style={sectionTitle}>{s.label}</h3>
                  <p style={{ ...helperStyle, marginTop: 0 }}>{s.helper}</p>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={isBusy || !profile[s.key].trim()}
                  onClick={() => optimizeSections([s.key])}
                  style={{ flexShrink: 0 }}
                >
                  {busyKey === s.key ? '✦ Optimizing…' : `✦ Optimize ${s.label}`}
                </button>
              </div>

              <textarea
                value={profile[s.key]}
                onChange={(e) => setSectionText(s.key, e.target.value)}
                placeholder={s.placeholder}
                style={{ ...inputStyle, minHeight: s.rows * 24, resize: 'vertical', lineHeight: 1.6 }}
              />

              {result && (
                <div style={{ marginTop: 16 }}>
                  <div className="lo-compare-grid">
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', margin: '0 0 6px' }}>Original</p>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{profile[s.key]}</p>
                    </div>
                    <div className="lo-compare-arrow" aria-hidden="true">→</div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#16A34A', margin: '0 0 6px' }}>Improved</p>
                      <p style={{ fontSize: '0.85rem', color: '#0F172A', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 500 }}>{result.improved}</p>
                    </div>
                  </div>

                  {result.reasoning && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Why this is better</p>
                      <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.55 }}>{result.reasoning}</p>
                    </div>
                  )}

                  <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => copyText(result.improved, s.key)}>
                    {copiedKey === s.key ? '✓ Copied' : `Copy Improved ${s.label}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 24 }}>
        <button className="btn btn-primary" disabled={busyKey !== null || !hasAnyText} onClick={() => optimizeSections(SECTIONS.map((s) => s.key))}>
          {busyKey === 'all' ? '✦ Optimizing your profile…' : '✦ Optimize Entire Profile'}
        </button>
        {hasAnyResult && (
          <>
            <button className="btn btn-ghost" onClick={copyEntireProfile}>{copiedKey === 'entire' ? '✓ Copied' : 'Copy Entire Profile'}</button>
            <button className="btn btn-ghost" onClick={exportAsText}>⬇️ Export as Text</button>
          </>
        )}
      </div>

      <style>{`
        .lo-compare-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; }
        .lo-compare-arrow { font-size: 1.1rem; color: #CBD5E1; text-align: center; }
        @media (max-width: 720px) {
          .lo-compare-grid { grid-template-columns: 1fr; }
          .lo-compare-arrow { transform: rotate(90deg); }
        }
      `}</style>

      <p className="privacy-note no-print">Your profile text is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
