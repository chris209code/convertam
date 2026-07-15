'use client';

import { useState } from 'react';
import { Icon, TEMPLATES, TEMPLATE_LABELS, TemplatePicker, useResumeData, adaptToModernProfessionalData, RESUME_PRINT_STYLES } from './resumeTemplates';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

// Converts Gemini's simpler structured output into the same raw shape the
// shared templates expect. The AI only ever returns {degree, institution,
// year} for education and plain strings for certifications — richer fields
// like course, location, grade, or credential info just aren't something an
// improved-from-pasted-text CV can reliably contain, so those are left blank
// rather than guessed at.
function adaptStructuredToTemplateInput(structured) {
  const form = {
    fullName: structured.name || '',
    jobTitle: structured.title || '',
    email: structured.email || '',
    phone: structured.phone || '',
    location: structured.location || '',
    linkedin: structured.linkedin || '',
    summary: structured.summary || '',
  };
  const experience = (structured.experience || []).map((exp) => ({
    type: 'Work Experience',
    role: exp.role || '',
    company: exp.company || '',
    period: exp.period || '',
    bullets: exp.bullets || [],
    description: '',
  }));
  const education = (structured.education || []).map((edu) => ({
    degree: edu.degree || '',
    course: '',
    institution: edu.institution || '',
    location: '',
    startYear: '',
    endYear: edu.year || '',
    current: false,
    grade: '',
  }));
  const certifications = (structured.certifications || []).map((cert) => ({
    name: cert,
    issuer: '',
    dateIssued: '',
    expiryDate: '',
    doesNotExpire: false,
  }));
  const skills = (structured.skills || []).join(', ');
  return { form, experience, education, certifications, skills };
}

export default function CVImproverWorkspace() {
  const [cvText, setCvText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [structured, setStructured] = useState(null);

  // See ResumeBuilderWorkspace's identical handler for the full explanation:
  // the browser's native print header (when enabled in the person's print
  // settings) can't be suppressed via CSS, but it must never say
  // "Convertam" — the title is swapped to the CV owner's name for the
  // duration of printing only.
  function handlePrint() {
    const previousTitle = document.title;
    document.title = structured?.name?.trim() || 'CV';
    const restore = () => { document.title = previousTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  }
  const [template, setTemplate] = useState('mpSidebar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function handleImprove() {
    if (!cvText.trim()) { setError('Please paste your CV text first.'); return; }
    setBusy(true); setError(''); setStructured(null); setStatus('');
    try {
      const res = await fetch('/api/cv-improver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      if (data.structured) {
        setStructured(data.structured);
        setStatus('✅ CV improved! Preview below, pick a template, and download as PDF.');
      } else {
        setError('AI returned an unexpected format. Please try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const templateInput = structured ? adaptStructuredToTemplateInput(structured) : null;
  const resumeData = templateInput
    ? useResumeData({ form: templateInput.form, targetRole: jobTitle, experience: templateInput.experience, education: templateInput.education, certifications: templateInput.certifications, skills: templateInput.skills })
    : null;
  const isModernProfessional = template.startsWith('mp');
  const templateData = templateInput
    ? (isModernProfessional
        ? adaptToModernProfessionalData({ form: templateInput.form, experience: templateInput.experience, education: templateInput.education, certifications: templateInput.certifications, skills: templateInput.skills })
        : resumeData)
    : null;
  const TemplateComponent = TEMPLATES[template];

  return (
    <div className="panel">
      <style>{RESUME_PRINT_STYLES}</style>

      {!structured && (
        <>
          <div style={{ marginBottom: 16 }} className="no-print">
            <label style={labelStyle}>Target Job Title (optional)</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer, Marketing Manager" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }} className="no-print">
            <label style={labelStyle}>Paste Your CV / Resume Text</label>
            <textarea value={cvText} onChange={e => setCvText(e.target.value)}
              placeholder="Paste your full CV here. Include your name, contact details, experience, education, skills..."
              style={{ ...inputStyle, minHeight: 250, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{cvText.length} characters — no limit</p>
          </div>

          <div className="actions no-print">
            <button className="btn btn-primary" disabled={busy || !cvText.trim()} onClick={handleImprove}>
              {busy ? '✦ AI is improving your CV…' : '✦ Improve My CV with AI'}
            </button>
          </div>
        </>
      )}

      {error && <div className="status error no-print">{error}</div>}
      {status && <div className="status success no-print">{status}</div>}

      {structured && resumeData && (
        <div>
          <p className="no-print" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Choose a template</p>
          <div className="no-print" style={{ marginBottom: 18 }}>
            <TemplatePicker selected={template} onSelect={setTemplate} />
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => { setStructured(null); setCvText(''); setStatus(''); }}>Improve Another CV</button>
            <button className="btn btn-primary" onClick={handlePrint}>⬇️ Download PDF</button>
            <a href="/pdf-to-word" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#2563EB', textDecoration: 'none', padding: '10px 14px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
              <Icon.doc /> Convert to MS Word
            </a>
          </div>

          <div style={{ background: '#E2E8F0', padding: '20px 0', borderRadius: 12, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
            <div className="resume-print-root">
              <div className="resume-page-frame" style={{ width: '210mm', minHeight: '297mm', background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <TemplateComponent data={templateData} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', marginTop: 10 }} className="no-print">
            Long CVs automatically continue onto additional pages when you download — nothing gets cut off.
          </p>
        </div>
      )}

      <p className="privacy-note no-print">Your CV is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
