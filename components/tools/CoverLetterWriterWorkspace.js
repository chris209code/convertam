'use client';

import { useState, useEffect } from 'react';
import { getCareerSession, saveCareerSession, clearCareerSession } from '@/lib/careerSession';

const TONES = ['Professional', 'Friendly', 'Enthusiastic', 'Formal'];

export default function CoverLetterWriterWorkspace() {
  const [yourName, setYourName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [background, setBackground] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('Professional');

  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Inherits an active Career Session (from CV Improver, or any future
  // Career Studio tool) so the candidate never has to retype the job
  // title, company, job description, or their own background/CV — this is
  // the entire point of "Continue to Cover Letter" and "Generate Cover
  // Letter" both landing here. Runs once on mount; if no session exists
  // (someone opened this tool directly), every field just stays blank and
  // the tool works exactly as it always has.
  const [inheritedFromSession, setInheritedFromSession] = useState(false);
  useEffect(() => {
    const session = getCareerSession();
    if (!session) return;
    if (session.applicantName) setYourName(session.applicantName);
    if (session.jobTitle || session.targetRole) setJobTitle(session.jobTitle || session.targetRole);
    if (session.companyName) setCompanyName(session.companyName);
    if (session.cvPlainText) setBackground(session.cvPlainText);
    setJobDescription(session.industry ? `Industry: ${session.industry}${session.jobDescription ? `\n\n${session.jobDescription}` : ''}` : (session.jobDescription || ''));
    setInheritedFromSession(true);
  }, []);

  function clearInheritedSession() {
    clearCareerSession();
    setInheritedFromSession(false);
    setYourName(''); setJobTitle(''); setCompanyName(''); setBackground(''); setJobDescription('');
  }

  async function handleGenerate() {
    if (!jobTitle || !companyName || !background) {
      setError('Please fill in the job title, company name, and your background at minimum.');
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
      {inheritedFromSession && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #C9F1DE' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#065F46' }}>
            ✓ Continuing from CV Improver — your job details and CV are already filled in below.
          </p>
          <button onClick={clearInheritedSession} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            Not this job? Start fresh
          </button>
        </div>
      )}
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
              <label style={labelStyle}>Job title you're applying for</label>
              <input style={inputStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Marketing Manager" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Company name</label>
              <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Your background — experience, skills, what makes you a fit</label>
            <textarea rows={6} style={{ ...inputStyle, resize: 'vertical' }} value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Paste from your CV, or just describe your relevant experience and strengths in a few sentences." />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Job description (optional, but improves the result)</label>
            <textarea rows={4} style={{ ...inputStyle, resize: 'vertical' }} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job posting here so the letter can speak directly to what they're looking for." />
          </div>

          <button
            onClick={handleGenerate}
            disabled={busy}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}
          >
            {busy ? 'Writing your cover letter…' : '✨ Write Cover Letter'}
          </button>
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 10 }}>{error}</p>}
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
