'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { Icon, TEMPLATES, TEMPLATE_LABELS, TemplatePicker, useResumeData, adaptToModernProfessionalData, RESUME_PRINT_STYLES, downloadResumePdf, DOWNLOAD_STAGE_LABELS, downloadResumeDocx, DOCX_DOWNLOAD_STAGE_LABELS } from './resumeTemplates';
import { extractTextFromFile } from '@/lib/extractDocText';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import { getCareerSession, saveCareerSession, clearCareerSession } from '@/lib/careerSession';

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

const CV_REQUIRED_MESSAGE = 'Upload or paste your CV before continuing.';

export const RESUME_BUILDER_IMPORT_KEY = 'convertam_cv_builder_import';

// Converts the AI's structured CV output into the same raw shape the shared
// templates expect. The AI only ever returns {degree, institution, year}
// for education and plain strings for certifications — richer fields like
// course, location, grade, or credential info just aren't something an
// improved-from-pasted-text CV can reliably contain, so those are left
// blank rather than guessed at.
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
    isCurrent: !!exp.isCurrentRole,
    bullets: exp.responsibilities || [],
    achievements: exp.achievements || [],
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

function structuredToPlainText(structured) {
  const lines = [];
  if (structured.name) lines.push(structured.name);
  if (structured.title) lines.push(structured.title);
  const contact = [structured.email, structured.phone, structured.location, structured.linkedin].filter(Boolean).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');
  if (structured.summary) { lines.push('PROFESSIONAL SUMMARY'); lines.push(structured.summary); lines.push(''); }
  if (structured.experience?.length) {
    lines.push('EXPERIENCE');
    structured.experience.forEach((exp) => {
      const header = [exp.role, exp.company].filter(Boolean).join(' — ') + (exp.period ? ` (${exp.period})` : '');
      lines.push(header);
      const responsibilities = exp.responsibilities || [];
      const achievements = exp.achievements || [];
      if (achievements.length && responsibilities.length) {
        lines.push('Responsibilities:');
        responsibilities.forEach((b) => lines.push(`- ${b}`));
        lines.push('Key Achievements:');
        achievements.forEach((b) => lines.push(`- ${b}`));
      } else {
        responsibilities.forEach((b) => lines.push(`- ${b}`));
        achievements.forEach((b) => lines.push(`- ${b}`));
      }
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

// One bullet row inside the Classification Review panel — shows the text,
// with inline edit and a move/delete action. Kept as its own component
// (rather than inlined per bullet in the parent map) purely so its edit
// state is local to the bullet being edited, not the whole panel.
function ClassificationBulletRow({ text, moveLabel, onMove, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ ...inputStyle, minHeight: 54, flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => { onEdit(draft.trim()); setEditing(false); }} style={smallActionBtn('#16A34A')}>Save</button>
          <button onClick={() => { setDraft(text); setEditing(false); }} style={smallActionBtn('#94A3B8')}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
      <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0, flex: 1, lineHeight: 1.5 }}>{text}</p>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button onClick={onMove} style={smallActionBtn('#2563EB')}>{moveLabel}</button>
        <button onClick={() => setEditing(true)} style={smallActionBtn('#64748B')}>Edit</button>
        <button onClick={onDelete} style={smallActionBtn('#DC2626')}>Remove</button>
      </div>
    </div>
  );
}

export default function CVImproverWorkspace() {
  const { session, startSession, updateDocument } = useDocumentSession();

  const [cvText, setCvText] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [structured, setStructured] = useState(null);
  const cvFieldRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  const [template, setTemplate] = useState('mpSidebar');
  const [busy, setBusy] = useState(false);
  const [downloadStage, setDownloadStage] = useState(null); // null | 'preparing' | 'generating' | 'starting-download'
  const downloadingRef = useRef(false);
  const [docxDownloadStage, setDocxDownloadStage] = useState(null);
  const docxDownloadingRef = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [activeView, setActiveView] = useState('improved'); // 'improved' | 'original'
  const [suggestionState, setSuggestionState] = useState({}); // { [i]: { status: 'pending'|'applied'|'dismissed', editedText? } }
  const [editingSuggestionIndex, setEditingSuggestionIndex] = useState(null);
  const [copied, setCopied] = useState(false);

  // Once the candidate has reviewed the CV + feedback panels, "Skip to
  // Results" collapses this down to just the CV + downloads — a clean
  // finishing screen instead of leaving the feedback panels visible forever.
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Inherits an active Career Session — set either by importing a job
  // posting on the Career Studio hub, or by a previous CV Improver /
  // Cover Letter Writer / LinkedIn Optimizer run — so the target role,
  // company, industry, and job description never need retyping here.
  const [inheritedFromSession, setInheritedFromSession] = useState(false);
  useEffect(() => {
    const session = getCareerSession();
    if (!session) return;
    const hasContext = session.jobTitle || session.targetRole || session.companyName || session.industry || session.jobDescription;
    if (!hasContext) return;
    setTargetPosition(session.jobTitle || session.targetRole || '');
    setCompanyName(session.companyName || '');
    setIndustry(session.industry || '');
    setJobDescription(session.jobDescription || '');
    setInheritedFromSession(true);
  }, []);

  function clearInheritedSession() {
    clearCareerSession();
    setInheritedFromSession(false);
    setTargetPosition(''); setCompanyName(''); setIndustry(''); setJobDescription('');
  }

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

  // Builds the current CV as real PDF bytes via the same server-side
  // generator the Download button uses (/api/resume-pdf), without
  // triggering a browser download — used to push the improved CV into the
  // Document Workspace session so compatible tools (PDF to Word, Compress
  // PDF, OCR PDF, Merge PDF) can pick it up with no re-upload.
  async function pushCvToWorkspace(currentStructured, currentTemplate) {
    try {
      const input = adaptStructuredToTemplateInput(currentStructured);
      const isMp = currentTemplate.startsWith('mp');
      const data = isMp
        ? adaptToModernProfessionalData({ form: input.form, experience: input.experience, education: input.education, certifications: input.certifications, skills: input.skills })
        : useResumeData({ form: input.form, targetRole: targetPosition, experience: input.experience, education: input.education, certifications: input.certifications, skills: input.skills });

      const res = await fetch('/api/resume-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey: currentTemplate, templateData: data }),
      });
      if (!res.ok) return; // non-critical — silently skip, the user can still download manually
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const fileName = `${(currentStructured.name || 'CV').trim().replace(/\s+/g, '-')}.pdf`;
      if (session.status !== 'active') {
        const file = new File([bytes], fileName, { type: 'application/pdf' });
        await startSession(file, { toolSlug: 'cv-improver' });
      } else {
        await updateDocument(bytes, { toolSlug: 'cv-improver', label: 'Improved CV', mimeType: 'application/pdf', name: fileName });
      }
    } catch {
      // Workspace handoff is a convenience, not a required step — a failure
      // here should never block or error out the main CV-improvement flow.
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

  // Generates a real, editable .docx directly from templateData instead of
  // sending the user through the generic PDF-to-Word tool — that round-trip
  // through a rendered PDF is what silently lost the chosen template's
  // layout (see lib/resume/renderResumeDocxHtml.js).
  async function handleDownloadDocx() {
    if (docxDownloadingRef.current) return;
    docxDownloadingRef.current = true;
    setError('');
    try {
      await downloadResumeDocx({
        templateKey: template,
        templateData,
        fileName: `${(structured?.name || 'CV').trim().replace(/\s+/g, '-')}.docx`,
        onStage: setDocxDownloadStage,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      docxDownloadingRef.current = false;
      setDocxDownloadStage(null);
    }
  }

  async function handleImprove() {
    if (!cvText.trim()) {
      setError(CV_REQUIRED_MESSAGE);
      cvFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cvFieldRef.current?.focus();
      return;
    }
    // Target Position and Job Description are both optional — when neither
    // is given the API falls back to general CV improvement rather than
    // blocking the request or inventing a role.
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
        setSuggestionState({});
        setActiveView('improved');
        setShowFinalResults(false);
        setStatus('✅ Your CV has been improved — review the CV and the Professional Review below before downloading.');
        pushCvToWorkspace(data.structured, template);
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
    setSuggestionState({});
    setActiveView('improved');
    setShowFinalResults(false);
    setStatus('');
    setError('');
  }
  // "Start Over" is the explicit "I'm done with this application" action —
  // the one place in this tool that counts as starting a new application,
  // so it clears the Career Session too rather than leaving stale job
  // context around for whatever gets typed in next.
  function startOver() {
    setStructured(null); setCvText(''); setTargetPosition(''); setJobDescription('');
    setCompanyName(''); setIndustry('');
    setSuggestionState({}); setActiveView('improved'); setShowFinalResults(false); setStatus(''); setError(''); setUploadedName('');
    clearCareerSession();
  }

  function suggestionStatus(i) {
    return suggestionState[i]?.status || 'pending';
  }
  function suggestionEditedText(i) {
    return suggestionState[i]?.editedText ?? structured.suggestions[i].proposedRewrite;
  }
  function setSuggestionEditedText(i, text) {
    setSuggestionState((prev) => ({ ...prev, [i]: { ...prev[i], editedText: text } }));
  }

  // Applies a suggestion's rewrite directly into the CV field it targets —
  // never appends the raw suggestion/reason text anywhere. A rewrite
  // replaces its exact currentText where found (an experience bullet, or
  // the whole summary); a pure addition (empty currentText) is appended.
  function applySuggestion(i) {
    const suggestion = structured.suggestions[i];
    const finalText = (suggestionEditedText(i) || '').trim();
    if (!finalText) return;

    setStructured((prev) => {
      const next = { ...prev };
      if (suggestion.targetSection === 'summary') {
        next.summary = finalText;
      } else if (suggestion.targetSection === 'experience') {
        const idx = suggestion.targetIndex;
        if (idx == null || idx < 0 || !next.experience?.[idx]) return prev;
        const field = suggestion.targetField === 'achievements' ? 'achievements' : 'responsibilities';
        const experience = [...next.experience];
        const bullets = [...(experience[idx][field] || [])];
        const matchIdx = suggestion.currentText ? bullets.findIndex((b) => b === suggestion.currentText) : -1;
        if (matchIdx >= 0) bullets[matchIdx] = finalText;
        else bullets.push(finalText);
        experience[idx] = { ...experience[idx], [field]: bullets };
        next.experience = experience;
      } else if (suggestion.targetSection === 'skills') {
        const skills = [...(next.skills || [])];
        const matchIdx = suggestion.currentText ? skills.findIndex((s) => s === suggestion.currentText) : -1;
        if (matchIdx >= 0) skills[matchIdx] = finalText;
        else skills.push(finalText);
        next.skills = skills;
      }
      return next;
    });
    setSuggestionState((prev) => ({ ...prev, [i]: { ...prev[i], status: 'applied' } }));
    setEditingSuggestionIndex(null);
  }
  function dismissSuggestion(i) {
    setSuggestionState((prev) => ({ ...prev, [i]: { ...prev[i], status: 'dismissed' } }));
    setEditingSuggestionIndex(null);
  }
  function undoSuggestionDecision(i) {
    setSuggestionState((prev) => ({ ...prev, [i]: { ...prev[i], status: 'pending' } }));
  }

  // Re-syncs the Document Workspace session whenever a suggestion changes
  // the CV's actual content, so any tool the user continues to afterward
  // always has the latest version, not a stale snapshot from before the edit.
  function applySuggestionAndSync(i) {
    applySuggestion(i);
    setTimeout(() => { if (structured) pushCvToWorkspace(structured, template); }, 0);
  }

  // ==========================================================================
  // Classification review — lets the candidate see exactly how the AI split
  // each role into responsibilities vs. achievements and move/edit/delete a
  // bullet if it disagrees. Every change here mutates `structured` directly,
  // so it's reflected immediately in the rendered CV and every download —
  // there's no separate "pending" draft to lose track of.
  // ==========================================================================
  function moveExperienceBullet(expIdx, fromField, bulletIdx) {
    const toField = fromField === 'responsibilities' ? 'achievements' : 'responsibilities';
    setStructured((prev) => {
      const experience = [...prev.experience];
      const exp = { ...experience[expIdx] };
      const fromList = [...(exp[fromField] || [])];
      const [moved] = fromList.splice(bulletIdx, 1);
      if (moved == null) return prev;
      exp[fromField] = fromList;
      exp[toField] = [...(exp[toField] || []), moved];
      experience[expIdx] = exp;
      return { ...prev, experience };
    });
    syncStructuredToWorkspace();
  }
  function editExperienceBullet(expIdx, field, bulletIdx, text) {
    setStructured((prev) => {
      const experience = [...prev.experience];
      const exp = { ...experience[expIdx] };
      const list = [...(exp[field] || [])];
      list[bulletIdx] = text;
      exp[field] = list;
      experience[expIdx] = exp;
      return { ...prev, experience };
    });
    syncStructuredToWorkspace();
  }
  function deleteExperienceBullet(expIdx, field, bulletIdx) {
    setStructured((prev) => {
      const experience = [...prev.experience];
      const exp = { ...experience[expIdx] };
      const list = [...(exp[field] || [])];
      list.splice(bulletIdx, 1);
      exp[field] = list;
      experience[expIdx] = exp;
      return { ...prev, experience };
    });
    syncStructuredToWorkspace();
  }
  function syncStructuredToWorkspace() {
    setTimeout(() => { if (structured) pushCvToWorkspace(structured, template); }, 0);
  }

  const templateInput = structured ? adaptStructuredToTemplateInput(structured) : null;
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
    if (!structured) return;
    navigator.clipboard.writeText(structuredToPlainText(structured));
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

  // Saves everything Cover Letter Writer needs into the Career Session so
  // it never has to ask for job title, company, job description, industry,
  // or the CV content again — then hands off to the standalone tool, which
  // reads this same session on mount. Used both by "Continue to Cover
  // Letter →" and by the "Generate Cover Letter" action on the final
  // results screen, since both cases reuse the identical context.
  function continueToCoverLetter() {
    saveCareerSession({
      sourceTool: 'cv-improver',
      applicantName: structured.name,
      jobTitle: targetPosition,
      targetRole: targetPosition,
      companyName,
      industry,
      jobDescription,
      cvPlainText: structuredToPlainText(structured),
    });
    window.location.href = '/cover-letter';
  }

  function skipToResults() {
    setShowFinalResults(true);
  }

  const pendingSuggestions = structured?.suggestions?.filter((_, i) => suggestionStatus(i) !== 'dismissed') || [];
  const review = structured?.review;

  return (
    <div className="panel">
      <style>{RESUME_PRINT_STYLES}</style>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {!structured && (
        <>
          {inheritedFromSession && (
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #C9F1DE' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#065F46' }}>
                ✓ Continuing your Career Studio session — target role, company, industry, and job description are already filled in below.
              </p>
              <button onClick={clearInheritedSession} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                Not this job? Start fresh
              </button>
            </div>
          )}
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
            <textarea ref={cvFieldRef} value={cvText} onChange={(e) => { setCvText(e.target.value); if (error === CV_REQUIRED_MESSAGE) setError(''); }}
              placeholder="Paste your full CV here, or upload one above. Include your name, contact details, experience, education, skills..."
              style={{ ...inputStyle, minHeight: 220, resize: 'vertical', lineHeight: 1.6, ...(error === CV_REQUIRED_MESSAGE ? { border: '1px solid #DC2626', boxShadow: '0 0 0 1px #DC2626' } : {}) }} />
            {error === CV_REQUIRED_MESSAGE ? (
              <p style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: 4 }}>⚠ {CV_REQUIRED_MESSAGE}</p>
            ) : (
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{cvText.length} characters — no limit</p>
            )}
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <label style={labelStyle}>🎯 Target Position (Optional)</label>
            <input type="text" value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} placeholder="e.g. Quality Assurance Manager" style={inputStyle} />
            <p style={helperStyle}>Optional — add a target role to tailor your summary, skills and experience wording to a specific job. Leave this blank and we'll still improve your CV based on its own content — wording, structure, clarity, achievements and general ATS compatibility. Either way, your professional title stays based on your own career, not this role.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {POSITION_EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setTargetPosition(ex)} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>{ex}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Company Name (Optional)</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Manufacturing Ltd" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Industry (Optional)</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Manufacturing, Fintech, Healthcare" style={inputStyle} />
              </div>
            </div>
            <p style={helperStyle}>Add these now if you already know them — they'll carry over automatically if you continue to a cover letter afterward, so you won't be asked again.</p>
          </div>

          <div style={{ marginBottom: 20 }} className="no-print">
            <label style={labelStyle}>Job Description / Requirements (Optional)</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job advertisement, responsibilities or requirements..."
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={helperStyle}>Optional — paste the job advertisement to help tailor your CV and keywords even more precisely. If you skip Target Position too, we'll use this to infer the type of role. Leave both empty and we'll still improve your CV based on its own content.</p>
          </div>

          <div className="actions no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={handleImprove}>
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
              <button style={pillStyle(activeView === 'improved')} onClick={() => setActiveView('improved')}>Improved CV</button>
              <button style={pillStyle(activeView === 'original')} onClick={() => setActiveView('original')}>Original CV</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={restoreOriginal}>↺ Restore Original</button>
              <button className="btn btn-ghost" onClick={startOver}>Start Over</button>
            </div>
          </div>

          {activeView === 'original' && (
            <div className="no-print" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.7, color: '#334155', maxHeight: 600, overflow: 'auto' }}>
              {cvText}
            </div>
          )}

          {activeView === 'improved' && (
            <>
              <p className="no-print" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Choose a template</p>
              <div className="no-print" style={{ marginBottom: 18 }}>
                <TemplatePicker selected={template} onSelect={setTemplate} />
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <button className="btn btn-ghost" onClick={copyText}>{copied ? '✓ Copied' : 'Copy Text'}</button>
                <button className="btn btn-primary" onClick={handleDownload} disabled={!!downloadStage}>{downloadStage ? DOWNLOAD_STAGE_LABELS[downloadStage] : '⬇️ Download PDF'}</button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={!!docxDownloadStage}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px', borderRadius: 8, cursor: docxDownloadStage ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  <Icon.doc /> {docxDownloadStage ? DOCX_DOWNLOAD_STAGE_LABELS[docxDownloadStage] : 'Download as Word (.docx)'}
                </button>
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

              {session.status === 'active' && session.currentTool === 'cv-improver' && (
                <div className="no-print" style={{ marginTop: 24 }}>
                  <ContinueWorkingPanel
                    toolSlug="cv-improver"
                    documentName={`${structured.name || 'CV'}.pdf`}
                    onDownload={handleDownload}
                    downloading={!!downloadStage}
                  />
                </div>
              )}

              {!showFinalResults && (
              <>
              {/* ============================================================
                  OUTPUT B — Professional Review. Kept entirely separate from
                  the CV rendered above; nothing here is ever inserted into it.
                  ============================================================ */}
              {review && (
                <section className="no-print" style={{ marginTop: 34 }}>
                  <h3 style={sectionTitle}>📊 Professional Review</h3>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>ATS Compatibility</p>
                        <p style={{ fontSize: '1.6rem', fontWeight: 800, color: review.atsScore >= 70 ? '#16A34A' : review.atsScore >= 40 ? '#D97706' : '#DC2626', margin: 0 }}>{review.atsScore}<span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94A3B8' }}>/100</span></p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Recruiter Readiness</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{review.recruiterReadiness}</p>
                      </div>
                      {review.interviewReadiness && (
                        <div>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Interview Readiness</p>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: 0, maxWidth: 260 }}>{review.interviewReadiness}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {review.strengths?.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', margin: '0 0 6px' }}>Strengths</p>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>{review.strengths.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                      )}
                      {review.weaknesses?.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>Weaknesses</p>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>{review.weaknesses.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                      )}
                      {review.missingAchievements?.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9A3412', margin: '0 0 6px' }}>Missing Achievements</p>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>{review.missingAchievements.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                      )}
                      {review.topImprovements?.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px' }}>Top Improvements Made</p>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>{review.topImprovements.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                      )}
                    </div>

                    {(review.keywordsMatched?.length > 0 || review.keywordsMissing?.length > 0) && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', margin: '0 0 6px' }}>Keyword Match</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {review.keywordsMatched?.map((k, i) => <span key={`m${i}`} style={tagStyle('#DCFCE7', '#166534')}>✓ {k}</span>)}
                          {review.keywordsMissing?.map((k, i) => <span key={`x${i}`} style={tagStyle('#FEF3C7', '#92400E')}>missing: {k}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {structured.warnings?.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px' }}>
                      {structured.warnings.map((w, i) => <p key={i} style={{ margin: i > 0 ? '4px 0 0' : 0 }}>{w}</p>)}
                    </div>
                  )}
                </section>
              )}

              {/* ============================================================
                  Classification Review — shows exactly how each role was
                  split into Responsibilities vs. Key Achievements (and
                  whether it was treated as a current or previous role) so
                  nothing is silently restructured without the candidate
                  seeing and being able to correct it.
                  ============================================================ */}
              {structured.experience?.length > 0 && (
                <section className="no-print" style={{ marginTop: 30 }}>
                  <h3 style={sectionTitle}>🔍 Review Classification</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>
                    Here's how each role was classified and split. Move a bullet, edit its wording, or remove it — changes apply immediately to the CV above and to your downloads.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {structured.experience.map((exp, expIdx) => (
                      <div key={expIdx} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{exp.role} <span style={{ fontWeight: 500, color: '#64748B' }}>· {exp.company}</span></p>
                            {exp.period && <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '2px 0 0' }}>{exp.period}</p>}
                          </div>
                          <span style={tagStyle(exp.isCurrentRole ? '#DCFCE7' : '#EFF6FF', exp.isCurrentRole ? '#166534' : '#1D4ED8')}>
                            {exp.isCurrentRole ? 'Current role · present tense' : 'Previous role · past tense'}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 6px' }}>Responsibilities</p>
                        {!(exp.responsibilities || []).length && <p style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic', margin: '0 0 10px' }}>None</p>}
                        {(exp.responsibilities || []).map((b, bulletIdx) => (
                          <ClassificationBulletRow
                            key={`r${bulletIdx}`}
                            text={b}
                            moveLabel="Move to Achievements"
                            onMove={() => moveExperienceBullet(expIdx, 'responsibilities', bulletIdx)}
                            onEdit={(t) => editExperienceBullet(expIdx, 'responsibilities', bulletIdx, t)}
                            onDelete={() => deleteExperienceBullet(expIdx, 'responsibilities', bulletIdx)}
                          />
                        ))}

                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', margin: '14px 0 6px' }}>Key Achievements</p>
                        {!(exp.achievements || []).length && <p style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>None detected</p>}
                        {(exp.achievements || []).map((b, bulletIdx) => (
                          <ClassificationBulletRow
                            key={`a${bulletIdx}`}
                            text={b}
                            moveLabel="Move to Responsibilities"
                            onMove={() => moveExperienceBullet(expIdx, 'achievements', bulletIdx)}
                            onEdit={(t) => editExperienceBullet(expIdx, 'achievements', bulletIdx, t)}
                            onDelete={() => deleteExperienceBullet(expIdx, 'achievements', bulletIdx)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ============================================================
                  Suggestions — each is a ready-to-insert rewrite, never
                  applied until the candidate explicitly clicks Apply Rewrite.
                  ============================================================ */}
              {pendingSuggestions.length > 0 && (
                <section className="no-print" style={{ marginTop: 30 }}>
                  <h3 style={sectionTitle}>💡 Suggested Rewrites</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>Nothing here changes your CV until you click Apply Rewrite.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {structured.suggestions.map((s, i) => {
                      if (suggestionStatus(i) === 'dismissed') return null;
                      const st = suggestionStatus(i);
                      const isEditing = editingSuggestionIndex === i;
                      return (
                        <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, background: st === 'applied' ? '#F0FDF4' : 'white' }}>
                          {s.currentText && (
                            <>
                              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>Current Text</p>
                              <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: '0 0 10px', fontStyle: 'italic' }}>{s.currentText}</p>
                            </>
                          )}
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>AI Proposed Rewrite</p>
                          {isEditing ? (
                            <textarea value={suggestionEditedText(i)} onChange={(e) => setSuggestionEditedText(i, e.target.value)} style={{ ...inputStyle, minHeight: 72 }} />
                          ) : (
                            <p style={{ fontSize: '0.88rem', color: '#0F172A', margin: '0 0 8px', fontWeight: 600 }}>{suggestionEditedText(i)}</p>
                          )}
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '10px 0 4px' }}>Reason for Suggestion</p>
                          <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 10px' }}>{s.reason}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {isEditing ? (
                              <button onClick={() => applySuggestionAndSync(i)} style={smallActionBtn('#16A34A')}>Apply My Edit</button>
                            ) : (
                              <>
                                <button onClick={() => applySuggestionAndSync(i)} disabled={st === 'applied'} style={smallActionBtn('#16A34A', st === 'applied')}>{st === 'applied' ? '✓ Applied' : 'Apply Rewrite'}</button>
                                <button onClick={() => setEditingSuggestionIndex(i)} style={smallActionBtn('#2563EB')}>Edit Myself</button>
                                <button onClick={() => dismissSuggestion(i)} style={smallActionBtn('#94A3B8')}>Dismiss</button>
                                {st === 'applied' && <button onClick={() => undoSuggestionDecision(i)} style={smallActionBtn('#94A3B8')}>Undo</button>}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              </>
              )}

              {/* ============================================================
                  Post-review handoff — the moment the candidate decides
                  what's next. "Continue to Cover Letter" saves everything
                  Cover Letter Writer needs into the Career Session so it
                  never re-asks for job title, company, industry, or the CV
                  itself. "Skip to Results" just declutters this screen down
                  to the CV + downloads; a cover letter can still be
                  generated later from here, reusing the same session.
                  ============================================================ */}
              {!showFinalResults ? (
                <section className="no-print" style={{ marginTop: 34, padding: 20, borderRadius: 12, background: '#F0F5FF', border: '1px solid #D0DCF5', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>What's next?</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 auto 16px', maxWidth: 480 }}>
                    Write a matching cover letter now — it'll automatically reuse this CV and your job details, so you won't have to re-enter anything. Or wrap up here and generate one later.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={continueToCoverLetter}>Continue to Cover Letter →</button>
                    <button className="btn btn-ghost" onClick={skipToResults}>Skip to Results</button>
                  </div>
                </section>
              ) : (
                <section className="no-print" style={{ marginTop: 34, padding: 20, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>✓ Your CV is ready</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 16px' }}>
                    Download it above whenever you're ready, or generate a matching cover letter — it'll reuse everything from this session automatically.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={continueToCoverLetter}>✉️ Generate Cover Letter</button>
                    <button className="btn btn-ghost" onClick={() => setShowFinalResults(false)}>← Return to Edit</button>
                  </div>
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
