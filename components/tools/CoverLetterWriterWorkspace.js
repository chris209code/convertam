'use client';

import { useState, useEffect, useRef } from 'react';
import JobVacancyImport from './JobVacancyImport';
import { getCareerSession, saveCareerSession } from '@/lib/careerSession';

const TONES = ['Professional', 'Friendly', 'Enthusiastic', 'Formal'];
const BACKGROUND_REQUIRED_MESSAGE = 'Add your background, experience, and skills before continuing.';

export default function CoverLetterWriterWorkspace() {
  const [yourName, setYourName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [background, setBackground] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('Professional');
  const backgroundFieldRef = useRef(null);

  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Inherits the candidate's own name/background from an active Career
  // Session on mount — the job title/company/description side of that same
  // session is instead handled by <JobVacancyImport> below (shared with CV
  // Improver and CV Builder), which also fires on mount if a session is
  // already active. Runs once; if no session exists (someone opened this
  // tool directly), every field just stays blank and the tool works exactly
  // as it always has.
  useEffect(() => {
    const session = getCareerSession();
    if (!session) return;
    if (session.applicantName) setYourName(session.applicantName);
    if (session.cvPlainText) setBackground(session.cvPlainText);
  }, []);

  // Driven by <JobVacancyImport> — see the merge-policy comment in
  // CVImproverWorkspace.js's handleJobChange for why title/company only
  // overwrite when actually provided, while description is a full replace.
  function handleJobChange(job) {
    if (!job) {
      setJobTitle(''); setCompanyName(''); setJobDescription('');
      return;
    }
    if (job.title) setJobTitle(job.title);
    if (job.company) setCompanyName(job.company);
    setJobDescription(job.description || '');
  }

  async function handleGenerate() {
    // Job title and company are both optional — a candidate can generate a
    // general letter with just their background. Background is the one
    // essential input, same principle as CV Improver's CV text: missing it
    // must never just leave the button inert, so it gets a specific message
    // plus focus/scroll to the field instead.
    if (!background.trim()) {
      setError(BACKGROUND_REQUIRED_MESSAGE);
      backgroundFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      backgroundFieldRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    setLetter('');

    try {
      const res = await fetch('/api/cover-letter-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourName, jobTitle, companyName, background, jobDescription, tone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }

      setLetter(data.letter || '');
      // Refreshes the Career Session with whatever the candidate actually
      // used (including any edits made here) and extends its idle timeout —
      // so a future tool (e.g. an ATS Match checker) sees the latest values,
      // and the session stays alive while Career Studio work continues.
      saveCareerSession({ sourceTool: 'cover-letter', applicantName: yourName, jobTitle, targetRole: jobTitle, companyName, jobDescription, cvPlainText: background });
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function copyLetter() {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const margin = 56;
      const maxWidth = width - margin * 2;
      const fontSize = 11;
      const lineHeight = 16;
      let y = height - margin;

      function newPage() {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      function wrapAndDraw(text) {
        const paragraphs = text.split('\n');
        paragraphs.forEach((para) => {
          if (!para.trim()) { y -= lineHeight; return; }
          const words = para.split(' ');
          let line = '';
          words.forEach((word) => {
            const test = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
              if (y < margin) newPage();
              page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
              y -= lineHeight;
              line = word;
            } else {
              line = test;
            }
          });
          if (line) {
            if (y < margin) newPage();
            page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
            y -= lineHeight;
          }
        });
      }

      wrapAndDraw(letter);

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(yourName || 'cover-letter').trim().replace(/\s+/g, '-').toLowerCase()}-cover-letter.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const fieldWrap = { marginBottom: 14 };

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.1fr)', gap: 28 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Your name</label>
              <input style={inputStyle} value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Tone</label>
              <select style={inputStyle} value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Job title you're applying for (Optional)</label>
              <input style={inputStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Marketing Manager" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Company name (Optional)</label>
              <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
            </div>
          </div>

          <JobVacancyImport sourceTool="cover-letter" onJobChange={handleJobChange} />

          <div style={fieldWrap}>
            <label style={labelStyle}>Your background — experience, skills, what makes you a fit</label>
            <textarea ref={backgroundFieldRef} rows={6}
              style={{ ...inputStyle, resize: 'vertical', ...(error === BACKGROUND_REQUIRED_MESSAGE ? { border: '1px solid #DC2626', boxShadow: '0 0 0 1px #DC2626' } : {}) }}
              value={background} onChange={(e) => { setBackground(e.target.value); if (error === BACKGROUND_REQUIRED_MESSAGE) setError(''); }}
              placeholder="Paste from your CV, or just describe your relevant experience and strengths in a few sentences." />
          </div>

          <button
            onClick={handleGenerate}
            disabled={busy}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}
          >
            {busy ? 'Writing your cover letter…' : '✨ Write Cover Letter'}
          </button>
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 10, fontWeight: error === BACKGROUND_REQUIRED_MESSAGE ? 600 : 400 }}>{error === BACKGROUND_REQUIRED_MESSAGE ? `⚠ ${error}` : error}</p>}
        </div>

        <div>
          {letter ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Your Cover Letter</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copyLetter} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={20}
                style={{ width: '100%', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.88rem', lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical', color: '#1E293B' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '6px 0 12px' }}>Feel free to edit the text above before downloading.</p>
              <button
                onClick={downloadPdf}
                disabled={downloading}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', cursor: downloading ? 'default' : 'pointer', background: downloading ? '#94A3B8' : '#059669', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {downloading ? 'Preparing PDF…' : '⬇ Download as PDF'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300, background: '#F8FAFC', borderRadius: 12, color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: 24 }}>
              Fill in the details on the left and your cover letter will appear here, ready to edit and download.
            </div>
          )}
        </div>
      </div>

      <p className="privacy-note">Your information is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
