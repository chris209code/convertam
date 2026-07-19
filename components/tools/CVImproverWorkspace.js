'use client';

import { useState, useRef } from 'react';
import Script from 'next/script';
import { Icon, TEMPLATES, TEMPLATE_LABELS, TemplatePicker, useResumeData, adaptToModernProfessionalData, RESUME_PRINT_STYLES, downloadResumePdf, DOWNLOAD_STAGE_LABELS } from './resumeTemplates';
import { extractTextFromFile } from '@/lib/extractDocText';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const helperStyle = { fontSize: '0.72rem', color: '#64748B', marginTop: 4, lineHeight: 1.5 };
const sectionTitle = { fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' };

function pillStyle(active) {
  return { padding: '7px 14px', borderRadius: 8, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#475569', fontWeight: active ? 700 : 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' };
}
function smallActionBtn(color, disabled) {
  return { fontSize: '0.76rem', fontWeight: 700, color, background: 'white', border: `1px solid ${color}55`, padding: '6px 12px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.6 : 1 };
}
function tagStyle(bg, fg) {
  return { fontSize: '0.78rem', fontWeight: 600, color: fg, background: bg, padding: '4px 10px', borderRadius: 999 };
}

const POSITION_EXAMPLES = ['Quality Assurance Manager', 'Production Supervisor', 'Brewing Manager', 'Shift Manager', 'Operations Manager', 'Financial Analyst', 'Software Engineer'];

export const RESUME_BUILDER_IMPORT_KEY = 'convertam_cv_builder_import';

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

function structuredToPlainText(structured, summary) {
  const lines = [];
  if (structured.name) lines.push(structured.name);
  if (structured.title) lines.push(structured.title);
  const contact = [structured.email, structured.phone, structured.location, structured.linkedin].filter(Boolean).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');
  if (summary) { lines.push('PROFESSIONAL SUMMARY'); lines.push(summary); lines.push(''); }
  if (structured.experience?.length) {
    lines.push('EXPERIENCE');
    structured.experience.forEach((exp) => {
      const header = [exp.role, exp.company].filter(Boolean).join(' — ') + (exp.period ? ` (${exp.period})` : '');
      lines.push(header);
      (exp.bullets || []).forEach((b) => lines.push(`- ${b}`));
      lines.push('');
    });
  }
  if (structured.education?.length) {
    lines.push('EDUCATION');
    structured.education.forEach((edu) => {
      lines.push([edu.degree, edu.institution].filter(Boolean).join(', ') + (edu.year ? ` (${edu.year})` : ''));
    });
    lines.push('');
  }
  if (structured.skills?.length) { lines.push('SKILLS'); lines.push(structured.skills.join(', ')); lines.push(''); }
  if (structured.certifications?.length) {
    lines.push('CERTIFICATIONS');
    structured.certifications.forEach((c) => lines.push(`- ${c}`));
  }
  return lines.join('\n').trim();
}

export default function CVImproverWorkspace() {
  const [cvText, setCvText] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [structured, setStructured] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  const [template, setTemplate] = useState('mpSidebar');
  const [busy, setBusy] = useState(false);
  const [downloadStage, setDownloadStage] = useState(null); // null | 'preparing' | 'generating' | 'starting-download'
  const downloadingRef = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [viewOriginal, setViewOriginal] = useState(false);
  const [additionsState, setAdditionsState] = useState({}); // { [i]: { text, status: 'pending'|'confirmed'|'dismissed' } }
  const [editingAdditionIndex, setEditingAdditionIndex] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploadError('');
    if (file.size > 15 * 1024 * 1024) { setUploadError('File is too large — please upload a file under 15 MB, or paste your CV text manually instead.'); return; }
    setUploading(true);
    try {
      const { text, error: extractErr } = await extractTextFromFile(file);
      if (extractErr) { setUploadError(extractErr); return; }
      setCvText(text);
      setUploadedName(file.name);
      setStatus(`Extracted text from "${file.name}" — review and edit it below before continuing.`);
    } finally {
      setUploading(false);
    }
  }

  // Generates the PDF server-side (see resumeTemplates.js's
  // downloadResumePdf) instead of relying on the visitor's own
  // window.print() — that used to produce different pagination on
  // different PCs (client-dependent fonts/DPI/print-scale) and an
  // unsuppressable browser header/footer on machines with "Headers and
  // footers" enabled in their print settings.
  //
  // downloadingRef (not just downloadStage state) guards against duplicate
  // requests from rapid double-clicks: a ref updates synchronously the
  // instant this function runs, whereas the disabled= attribute on the
  // button can't take effect until React actually re-renders — a gap a
  // fast double-click could otherwise land in.
  async function handleDownload() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setError('');
    try {
      await downloadResumePdf({
        templateKey: template,
        templateData,
        fileName: `${(structured?.name || 'CV').trim().replace(/\s+/g, '-')}.pdf`,
        onStage: setDownloadStage,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      downloadingRef.current = false;
      setDownloadStage(null);
    }
  }

  async function handleImprove() {
    if (!cvText.trim()) { setError('Please paste or upload your CV first.'); return; }
    if (!targetPosition.trim()) { setError('Please enter the position you want your CV optimized for.'); return; }
    setBusy(true); setError(''); setStatus('');
    try {
      const res = await fetch('/api/cv-improver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, targetPosition, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      if (data.structured) {
        setStructured(data.structured);
        setAdditionsState({});
        setViewOriginal(false);
        setStatus('✅ Your CV has been improved — review everything below before downloading.');
      } else {
        setError('AI returned an unexpected format. Please try again.');
      }
    } catch (err) {
      // cvText / targetPosition / jobDescription are all untouched here —
      // nothing the user typed or uploaded is lost, so Retry just re-runs this.
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function restoreOriginal() {
    setStructured(null);
    setAdditionsState({});
    setViewOriginal(false);
    setStatus('');
    setError('');
  }
  function startOver() {
    setStructured(null); setCvText(''); setTargetPosition(''); setJobDescription('');
    setAdditionsState({}); setViewOriginal(false); setStatus(''); setError(''); setUploadedName('');
  }

  function additionText(i) {
    return additionsState[i]?.text ?? structured.suggestedAdditions[i].suggestion;
  }
  function additionStatus(i) {
    return additionsState[i]?.status || 'pending';
  }
  function setAdditionText(i, text) {
    setAdditionsState((prev) => ({ ...prev, [i]: { text, status: prev[i]?.status || 'pending' } }));
  }
  function confirmAddition(i) {
    setAdditionsState((prev) => ({ ...prev, [i]: { text: prev[i]?.text ?? structured.suggestedAdditions[i].suggestion, status: 'confirmed' } }));
    setEditingAdditionIndex(null);
  }
  function dismissAddition(i) {
    setAdditionsState((prev) => ({ ...prev, [i]: { text: prev[i]?.text ?? structured.suggestedAdditions[i].suggestion, status: 'dismissed' } }));
    setEditingAdditionIndex(null);
  }
  function undoAdditionDecision(i) {
    setAdditionsState((prev) => ({ ...prev, [i]: { text: prev[i]?.text ?? structured.suggestedAdditions[i].suggestion, status: 'pending' } }));
  }

  // Confirmed additions are appended as extra sentences onto the Professional
  // Summary — the one freeform text field every template renders — rather
  // than guessing which specific experience entry a suggestion belongs to.
  const confirmedAdditionTexts = structured
    ? (structured.suggestedAdditions || [])
        .map((_, i) => ({ status: additionStatus(i), text: additionText(i) }))
        .filter((a) => a.status === 'confirmed')
        .map((a) => a.text)
    : [];
  const effectiveSummary = structured ? [structured.summary, ...confirmedAdditionTexts].filter(Boolean).join(' ') : '';
  const effectiveStructured = structured ? { ...structured, summary: effectiveSummary } : null;

  const templateInput = effectiveStructured ? adaptStructuredToTemplateInput(effectiveStructured) : null;
  const resumeData = templateInput
    ? useResumeData({ form: templateInput.form, targetRole: targetPosition, experience: templateInput.experience, education: templateInput.education, certifications: templateInput.certifications, skills: templateInput.skills })
    : null;
  const isModernProfessional = template.startsWith('mp');
  const templateData = templateInput
    ? (isModernProfessional
        ? adaptToModernProfessionalData({ form: templateInput.form, experience: templateInput.experience, education: templateInput.education, certifications: templateInput.certifications, skills: templateInput.skills })
        : resumeData)
    : null;
  const TemplateComponent = TEMPLATES[template];

  function copyText() {
    if (!effectiveStructured) return;
    navigator.clipboard.writeText(structuredToPlainText(effectiveStructured, effectiveSummary));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendToBuilder() {
    if (!templateInput) return;
    try {
      localStorage.setItem(RESUME_BUILDER_IMPORT_KEY, JSON.stringify({ ...templateInput, targetPosition }));
    } catch { /* localStorage unavailable — handoff just won't pre-fill, not fatal */ }
    window.location.href = '/resume-builder';
  }

  return (
    <div className="panel">
      <style>{RESUME_PRINT_STYLES}</style>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {!structured && (
        <>
          <div className="no-print" style={{ marginBottom: 16, border: '2px dashed #CBD5E1', borderRadius: 12, padding: '18px 16px', textAlign: 'center', background: '#F8FAFC' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Upload your CV (optional)</p>
            <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 10 }}>PDF, DOCX, or TXT — we'll extract the text below so you can review and edit it before continuing.</p>
            <input type="file" accept=".pdf,.docx,.doc,.txt,application/pdf,text/plain" onChange={handleFileUpload} disabled={uploading} style={{ maxWidth: '100%' }} />
            {uploading && <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 8 }}>Reading your file…</p>}
            {uploadError && (
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 10px', textAlign: 'left' }}>
                {uploadError}
              </div>
            )}
            {uploadedName && !uploadError && <p style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: 8 }}>✓ Extracted from "{uploadedName}"</p>}
          </div>

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} /> or paste below <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <label style={labelStyle}>Paste Your CV / Resume Text</label>
            <textarea value={cvText} onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your full CV here, or upload one above. Include your name, contact details, experience, education, skills..."
              style={{ ...inputStyle, minHeight: 220, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{cvText.length} characters — no limit</p>
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <label style={labelStyle}>🎯 Target Position</label>
            <input type="text" value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} placeholder="e.g. Quality Assurance Manager" style={inputStyle} />
            <p style={helperStyle}>Enter the exact role you want your CV optimized for.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {POSITION_EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setTargetPosition(ex)} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>{ex}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <label style={labelStyle}>Job Description / Requirements (Optional)</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job advertisement, responsibilities or requirements..."
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={helperStyle}>Paste the job advertisement, responsibilities or requirements to help the AI tailor your CV even more accurately. Leave this empty and we'll still optimize using just your Target Position.</p>
          </div>

          <div className="actions no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy || !cvText.trim() || !targetPosition.trim()} onClick={handleImprove}>
              {busy ? '✦ AI is improving your CV…' : '✦ Improve My CV'}
            </button>
            {error && !busy && <button className="btn btn-ghost" onClick={handleImprove}>Retry</button>}
          </div>
        </>
      )}

      {error && <div className="status error no-print">{error}</div>}
      {status && <div className="status success no-print">{status}</div>}

      {structured && templateInput && (
        <div>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={pillStyle(!viewOriginal)} onClick={() => setViewOriginal(false)}>Improved CV</button>
              <button style={pillStyle(viewOriginal)} onClick={() => setViewOriginal(true)}>Original CV</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={restoreOriginal}>↺ Restore Original</button>
              <button className="btn btn-ghost" onClick={startOver}>Start Over</button>
            </div>
          </div>

          {viewOriginal ? (
            <div className="no-print" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.7, color: '#334155', maxHeight: 600, overflow: 'auto' }}>
              {cvText}
            </div>
          ) : (
            <>
              <p className="no-print" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Choose a template</p>
              <div className="no-print" style={{ marginBottom: 18 }}>
                <TemplatePicker selected={template} onSelect={setTemplate} />
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <button className="btn btn-ghost" onClick={copyText}>{copied ? '✓ Copied' : 'Copy Text'}</button>
                <button className="btn btn-primary" onClick={handleDownload} disabled={!!downloadStage}>{downloadStage ? DOWNLOAD_STAGE_LABELS[downloadStage] : '⬇️ Download PDF'}</button>
                <a href="/pdf-to-word" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#2563EB', textDecoration: 'none', padding: '10px 14px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                  <Icon.doc /> Convert to MS Word
                </a>
                <button onClick={sendToBuilder} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#7C3AED', textDecoration: 'none', padding: '10px 14px', borderRadius: 8, border: '1px solid #DDD6FE', background: '#F5F3FF', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🧩 Send to CV Builder
                </button>
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

              {structured.improvementsMade?.length > 0 && (
                <section className="no-print" style={{ marginTop: 30 }}>
                  <h3 style={sectionTitle}>✅ Key Improvements Made</h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {structured.improvementsMade.map((imp, i) => (
                      <li key={i} style={{ fontSize: '0.86rem', color: '#1E293B', marginBottom: 6, lineHeight: 1.5 }}>{imp}</li>
                    ))}
                  </ul>
                </section>
              )}

              {structured.suggestedAdditions?.length > 0 && (
                <section className="no-print" style={{ marginTop: 30 }}>
                  <h3 style={sectionTitle}>💡 Suggested Additions for You to Confirm</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>These could strengthen your CV — nothing here is added until you confirm it.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {structured.suggestedAdditions.map((s, i) => {
                      const st = additionStatus(i);
                      const isEditing = editingAdditionIndex === i;
                      return (
                        <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, background: st === 'confirmed' ? '#F0FDF4' : st === 'dismissed' ? '#F8FAFC' : 'white', opacity: st === 'dismissed' ? 0.65 : 1 }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Suggested Addition</p>
                          {isEditing ? (
                            <textarea value={additionText(i)} onChange={(e) => setAdditionText(i, e.target.value)} style={{ ...inputStyle, minHeight: 64 }} />
                          ) : (
                            <p style={{ fontSize: '0.88rem', color: '#0F172A', margin: '0 0 8px', fontWeight: 600 }}>{additionText(i)}</p>
                          )}
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '8px 0 4px' }}>Reason</p>
                          <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 10px' }}>{s.reason}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {isEditing ? (
                              <button onClick={() => confirmAddition(i)} style={smallActionBtn('#16A34A')}>Save &amp; Add to CV</button>
                            ) : (
                              <>
                                <button onClick={() => confirmAddition(i)} disabled={st === 'confirmed'} style={smallActionBtn('#16A34A', st === 'confirmed')}>{st === 'confirmed' ? '✓ Added' : 'Accept'}</button>
                                <button onClick={() => setEditingAdditionIndex(i)} style={smallActionBtn('#2563EB')}>Edit</button>
                                <button onClick={() => dismissAddition(i)} disabled={st === 'dismissed'} style={smallActionBtn('#94A3B8', st === 'dismissed')}>{st === 'dismissed' ? 'Ignored' : 'Ignore'}</button>
                                {st !== 'pending' && <button onClick={() => undoAdditionDecision(i)} style={smallActionBtn('#94A3B8')}>Undo</button>}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {structured.jobMatchSummary && (
                <section className="no-print" style={{ marginTop: 30, marginBottom: 10 }}>
                  <h3 style={sectionTitle}>📊 Job Match Summary</h3>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Target Position</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>{structured.jobMatchSummary.targetPosition || targetPosition}</p>

                    {structured.jobMatchSummary.strongMatches?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', margin: '0 0 6px' }}>Strong Matches</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {structured.jobMatchSummary.strongMatches.map((m, i) => <span key={i} style={tagStyle('#DCFCE7', '#166534')}>{m}</span>)}
                        </div>
                      </div>
                    )}
                    {structured.jobMatchSummary.gaps?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>Areas That Could Be Strengthened</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {structured.jobMatchSummary.gaps.map((m, i) => <span key={i} style={tagStyle('#FEF3C7', '#92400E')}>{m}</span>)}
                        </div>
                      </div>
                    )}
                    {structured.jobMatchSummary.recommendedAdditions?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px' }}>Recommended Additions</p>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {structured.jobMatchSummary.recommendedAdditions.map((r, i) => <li key={i} style={{ fontSize: '0.84rem', color: '#334155', marginBottom: 4 }}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {structured.keywordsUsed?.length > 0 && (
                    <p style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 10 }}>Optimized for stronger ATS compatibility using keywords: {structured.keywordsUsed.join(', ')}.</p>
                  )}
                  {structured.warnings?.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px' }}>
                      {structured.warnings.map((w, i) => <p key={i} style={{ margin: i > 0 ? '4px 0 0' : 0 }}>{w}</p>)}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}

      <p className="privacy-note no-print">Your CV is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
