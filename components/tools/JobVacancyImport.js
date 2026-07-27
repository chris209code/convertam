'use client';

import { useState, useEffect, useRef } from 'react';
import { getCareerSession, saveCareerSession, clearCareerSession } from '@/lib/careerSession';

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const helperStyle = { fontSize: '0.7rem', color: '#64748B', marginTop: 6, lineHeight: 1.5 };
const linkBtnStyle = { fontSize: '0.74rem', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 };
const smallBtnStyle = { fontSize: '0.78rem', fontWeight: 700, padding: '7px 12px', borderRadius: 7, border: '1px solid #CBD5E1', background: 'white', color: '#334155', cursor: 'pointer', fontFamily: 'inherit' };

const EMPTY_JOB = { title: '', company: '', location: '', employmentType: '', industry: '', experienceLevel: '', description: '' };

function jobFromSession(session) {
  if (!session || !(session.jobTitle || session.jobDescription)) return null;
  return {
    title: session.jobTitle || session.targetRole || '',
    company: session.companyName || '',
    location: session.location || '',
    employmentType: session.employmentType || '',
    industry: session.industry || '',
    experienceLevel: session.experienceLevel || '',
    description: session.jobDescription || '',
  };
}

// Shared "have a vacancy link?" block, embedded directly below each Career
// Studio tool's own Target Job field (CV Improver, CV Builder, Cover Letter
// Writer). One implementation and one Career Session — no tool gets its own
// copy of the import/paste/review flow. Entirely optional: a tool works
// exactly as it always has if this block is never touched.
//
// onJobChange(job | null) fires once on mount if an existing Career Session
// already has job info (so the tool can prefill without asking again), and
// again whenever the candidate confirms an import/paste or clears it. Each
// tool decides how to merge the job into its own fields — see the comment
// in CVImproverWorkspace.js's handleJobChange for the merge policy.
export default function JobVacancyImport({ sourceTool, onJobChange }) {
  const [phase, setPhase] = useState('idle'); // idle | importing | reviewing | active | failed
  const [jobUrl, setJobUrl] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [reviewJob, setReviewJob] = useState(EMPTY_JOB);
  const [providerName, setProviderName] = useState('');
  const [importError, setImportError] = useState('');

  // Avoids re-subscribing the mount effect if the parent passes a fresh
  // inline function every render — this should only ever run once.
  const onJobChangeRef = useRef(onJobChange);
  onJobChangeRef.current = onJobChange;

  useEffect(() => {
    const job = jobFromSession(getCareerSession());
    if (job) {
      setReviewJob(job);
      setPhase('active');
      onJobChangeRef.current?.(job);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleImportUrl() {
    if (!jobUrl.trim()) return;
    setPhase('importing');
    setImportError('');
    try {
      const res = await fetch('/api/job-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setImportError(data.error || "We couldn't automatically read this job posting.");
        setPhase('failed');
        return;
      }
      setProviderName(data.providerName || '');
      setReviewJob({
        title: data.job.title || '', company: data.job.company || '', location: data.job.location || '',
        employmentType: data.job.employmentType || '', industry: data.job.industry || '', experienceLevel: data.job.experienceLevel || '',
        description: data.job.description || '',
      });
      setPhase('reviewing');
    } catch {
      setImportError("We couldn't automatically read this job posting.");
      setPhase('failed');
    }
  }

  function startManualEntry() {
    setProviderName('');
    setReviewJob({ ...EMPTY_JOB, description: manualDescription.trim() });
    setPhase('reviewing');
  }

  function updateReviewField(field, value) {
    setReviewJob((prev) => ({ ...prev, [field]: value }));
  }

  function resetToIdle() {
    setPhase('idle');
    setJobUrl(''); setManualDescription(''); setShowManual(false); setProviderName(''); setImportError('');
    setReviewJob(EMPTY_JOB);
  }

  function confirmJob() {
    const job = { ...reviewJob, title: reviewJob.title.trim(), company: reviewJob.company.trim(), description: reviewJob.description.trim() };
    saveCareerSession({
      sourceTool,
      jobTitle: job.title,
      targetRole: job.title,
      companyName: job.company,
      location: job.location.trim(),
      employmentType: job.employmentType.trim(),
      industry: job.industry.trim(),
      experienceLevel: job.experienceLevel.trim(),
      jobDescription: job.description,
    });
    setReviewJob(job);
    setPhase('active');
    onJobChangeRef.current?.(job);
  }

  function clearJob() {
    clearCareerSession();
    resetToIdle();
    onJobChangeRef.current?.(null);
  }

  return (
    <div className="no-print" style={{ marginTop: 8, marginBottom: 18, padding: '12px 14px', borderRadius: 10, border: '1px dashed #CBD5E1', background: '#F8FAFC' }}>
      {phase === 'active' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#0F172A' }}>
            ✓ Using vacancy: <strong>{reviewJob.title || '(untitled)'}</strong>{reviewJob.company ? ` at ${reviewJob.company}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <button type="button" onClick={() => setPhase('reviewing')} style={linkBtnStyle}>Edit</button>
            <button type="button" onClick={clearJob} style={{ ...linkBtnStyle, color: '#DC2626' }}>Clear</button>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <>
          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Have a vacancy link?</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="Paste job posting URL…" style={{ ...inputStyle, flex: '1 1 220px' }} />
            <button type="button" disabled={!jobUrl.trim()} onClick={handleImportUrl} style={{ ...smallBtnStyle, opacity: jobUrl.trim() ? 1 : 0.6 }}>Import Job</button>
          </div>
          {!showManual ? (
            <button type="button" onClick={() => setShowManual(true)} style={{ ...linkBtnStyle, marginTop: 8, display: 'block' }}>Or paste the job description manually</button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <textarea value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="Paste the job description here…" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              <button type="button" disabled={!manualDescription.trim()} onClick={startManualEntry} style={{ ...smallBtnStyle, marginTop: 6, opacity: manualDescription.trim() ? 1 : 0.6 }}>Continue →</button>
            </div>
          )}
          <p style={helperStyle}>Optional — paste a vacancy link or description to tailor this result to a specific job. Leave it blank and we'll work from what you've entered above.</p>
        </>
      )}

      {phase === 'importing' && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>✦ Reading the job posting…</p>
      )}

      {phase === 'failed' && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.8rem', fontWeight: 700, color: '#92400E' }}>{importError}</p>
          <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: '#64748B' }}>No problem — just paste the job description instead, or skip this entirely.</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button type="button" onClick={() => setPhase('reviewing')} style={smallBtnStyle}>Paste Job Description</button>
            <button type="button" onClick={resetToIdle} style={linkBtnStyle}>Skip</button>
          </div>
        </div>
      )}

      {phase === 'reviewing' && (
        <div>
          {providerName && <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#16A34A' }}>✓ Detected: {providerName} — review the details below before continuing.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Job Title</label>
              <input type="text" value={reviewJob.title} onChange={(e) => updateReviewField('title', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input type="text" value={reviewJob.company} onChange={(e) => updateReviewField('company', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Location (Optional)</label>
              <input type="text" value={reviewJob.location} onChange={(e) => updateReviewField('location', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Employment Type (Optional)</label>
              <input type="text" value={reviewJob.employmentType} onChange={(e) => updateReviewField('employmentType', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <label style={labelStyle}>Job Description</label>
          <textarea value={reviewJob.description} onChange={(e) => updateReviewField('description', e.target.value)} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
            <button type="button" onClick={confirmJob} style={{ ...smallBtnStyle, background: '#2563EB', borderColor: '#2563EB', color: 'white' }}>Use This Job →</button>
            <button type="button" onClick={resetToIdle} style={linkBtnStyle}>Skip</button>
          </div>
        </div>
      )}
    </div>
  );
}
