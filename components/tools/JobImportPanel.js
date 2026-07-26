'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCareerSession, saveCareerSession, clearCareerSession } from '@/lib/careerSession';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const helperStyle = { fontSize: '0.72rem', color: '#64748B', marginTop: 4, lineHeight: 1.5 };

const QUICK_LAUNCH_TOOLS = [
  { slug: 'cv-improver', label: 'CV Improver', icon: '📄' },
  { slug: 'cover-letter', label: 'Cover Letter Writer', icon: '✉️' },
  { slug: 'linkedin-optimizer', label: 'LinkedIn Optimizer', icon: '💼' },
];

const EMPTY_JOB = { title: '', company: '', location: '', employmentType: '', industry: '', experienceLevel: '', description: '' };

export default function JobImportPanel() {
  // idle -> importing -> reviewing -> active, with 'failed' branching off
  // importing back into reviewing (blank, for manual entry) rather than a
  // dead end — the whole point of the failover is the workflow never stops.
  const [phase, setPhase] = useState('idle');
  const [jobUrl, setJobUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [reviewJob, setReviewJob] = useState(EMPTY_JOB);
  const [providerName, setProviderName] = useState('');
  const [importError, setImportError] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    const session = getCareerSession();
    if (session?.jobTitle) {
      setReviewJob({
        title: session.jobTitle || '', company: session.companyName || '', location: session.location || '',
        employmentType: session.employmentType || '', industry: session.industry || '', experienceLevel: session.experienceLevel || '',
        description: session.jobDescription || '',
      });
      setPhase('active');
    }
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

  function confirmSession() {
    if (!reviewJob.title.trim()) {
      setReviewError('Please enter the job title before continuing.');
      return;
    }
    setReviewError('');
    saveCareerSession({
      sourceTool: 'job-import',
      jobTitle: reviewJob.title.trim(),
      targetRole: reviewJob.title.trim(),
      companyName: reviewJob.company.trim(),
      location: reviewJob.location.trim(),
      employmentType: reviewJob.employmentType.trim(),
      industry: reviewJob.industry.trim(),
      experienceLevel: reviewJob.experienceLevel.trim(),
      jobDescription: reviewJob.description.trim(),
    });
    setPhase('active');
  }

  function editSession() {
    setPhase('reviewing');
  }

  function clearSession() {
    clearCareerSession();
    setReviewJob(EMPTY_JOB);
    setJobUrl('');
    setManualDescription('');
    setProviderName('');
    setPhase('idle');
  }

  return (
    <section style={{ background: '#F0F5FF', borderBottom: '1px solid #DCE7FB', padding: '28px 0' }}>
      {/* dangerouslySetInnerHTML, not a JSX text child: react-dom/server HTML-escapes
          text children (e.g. ' -> &#x27;) but <style> is a raw-text element per the
          HTML spec, so the browser never decodes that entity back — a guaranteed
          hydration mismatch for any rule here with a quote character (content: ''). */}
      <style dangerouslySetInnerHTML={{ __html: `
        .jip-inner { max-width: 900px; margin: 0 auto; padding: 0 4%; }
        .jip-card { background: white; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; }
        .jip-import-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .jip-import-row input { flex: 1 1 260px; }
        .jip-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #94A3B8; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; }
        .jip-divider::before, .jip-divider::after { content: ''; flex: 1; height: 1px; background: #E2E8F0; }
        .jip-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 640px) { .jip-review-grid { grid-template-columns: 1fr; } }
      ` }} />
      <div className="jip-inner">
        <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563EB', margin: '0 0 6px' }}>Import Job Posting</p>

        {phase === 'idle' && (
          <div className="jip-card">
            <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 14px' }}>
              Skip the copy-paste — import a job posting directly from its listing page, or paste the description yourself. Either way, every Career Studio tool automatically reuses it — no repeated data entry.
            </p>
            <label style={labelStyle}>Paste Job URL</label>
            <div className="jip-import-row">
              <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/..." style={inputStyle} />
              <button className="btn btn-primary" disabled={!jobUrl.trim()} onClick={handleImportUrl}>Import Job →</button>
            </div>
            <p style={helperStyle}>Works with LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, Ashby, SmartRecruiters, BambooHR, Wellfound, and most company career pages.</p>

            <div className="jip-divider">OR</div>

            <label style={labelStyle}>Paste Job Description</label>
            <textarea value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="Paste the job description here..." style={{ ...inputStyle, minHeight: 100, resize: 'vertical', marginBottom: 10 }} />
            <button className="btn btn-ghost" disabled={!manualDescription.trim()} onClick={startManualEntry}>Continue →</button>
          </div>
        )}

        {phase === 'importing' && (
          <div className="jip-card" style={{ textAlign: 'center', color: '#475569', fontSize: '0.88rem' }}>✦ Reading the job posting…</div>
        )}

        {phase === 'failed' && (
          <div className="jip-card">
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>{importError}</p>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 14px' }}>No problem — just paste the job description instead and you're good to go.</p>
            <button className="btn btn-primary" onClick={() => setPhase('reviewing')}>Paste Job Description</button>
          </div>
        )}

        {phase === 'reviewing' && (
          <div className="jip-card">
            {providerName && (
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16A34A', margin: '0 0 12px' }}>✓ Detected: {providerName} — review the details below before continuing.</p>
            )}
            <div className="jip-review-grid">
              <div>
                <label style={labelStyle}>Job Title</label>
                <input type="text" value={reviewJob.title} onChange={(e) => updateReviewField('title', e.target.value)} placeholder="e.g. Quality Assurance Manager" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input type="text" value={reviewJob.company} onChange={(e) => updateReviewField('company', e.target.value)} placeholder="e.g. Acme Manufacturing Ltd" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={reviewJob.location} onChange={(e) => updateReviewField('location', e.target.value)} placeholder="e.g. Lagos, Nigeria (optional)" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Employment Type</label>
                <input type="text" value={reviewJob.employmentType} onChange={(e) => updateReviewField('employmentType', e.target.value)} placeholder="e.g. Full-time (optional)" style={inputStyle} />
              </div>
            </div>
            <label style={labelStyle}>Job Description</label>
            <textarea value={reviewJob.description} onChange={(e) => updateReviewField('description', e.target.value)} style={{ ...inputStyle, minHeight: 140, resize: 'vertical', marginBottom: 10 }} />
            {reviewError && <p style={{ fontSize: '0.78rem', color: '#DC2626', margin: '0 0 10px' }}>{reviewError}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={confirmSession}>Confirm & Continue →</button>
              <button className="btn btn-ghost" onClick={() => setPhase('idle')}>Cancel</button>
            </div>
          </div>
        )}

        {phase === 'active' && (
          <div className="jip-card">
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              ✓ Career Session active: {reviewJob.title}{reviewJob.company ? ` at ${reviewJob.company}` : ''}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 14px' }}>Every tool below automatically uses these details — no need to re-enter anything.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {QUICK_LAUNCH_TOOLS.map((t) => (
                <Link key={t.slug} href={`/${t.slug}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  {t.icon} {t.label}
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <button onClick={editSession} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Edit details</button>
              <button onClick={clearSession} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Clear session</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
