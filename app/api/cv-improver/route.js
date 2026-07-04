'use client';

import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function generateCVPdf(data) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const blue = rgb(0.145, 0.396, 0.918);
  const dark = rgb(0.059, 0.09, 0.157);
  const gray = rgb(0.4, 0.44, 0.52);
  const lightBlue = rgb(0.94, 0.96, 1);

  let y = height - 40;
  const margin = 40;
  const contentWidth = width - margin * 2;
  const minY = 40;

  function newPage() {
    page = pdfDoc.addPage([595, 842]);
    y = height - 40;
  }

  function checkY(needed) {
    if (y - needed < minY) newPage();
  }

  function drawWrappedText(text, x, maxWidth, size, f, color) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      const testWidth = f.widthOfTextAtSize(test, size);
      if (testWidth > maxWidth && line) {
        checkY(size + 4);
        page.drawText(line, { x, y, size, font: f, color: color || dark });
        y -= size + 3;
        line = word;
      } else {
        line = test;
      }
    });
    if (line) {
      checkY(size + 4);
      page.drawText(line, { x, y, size, font: f, color: color || dark });
      y -= size + 3;
    }
  }

  function drawSection(title) {
    checkY(30);
    y -= 10;
    page.drawText(title.toUpperCase(), { x: margin, y, size: 9, font: bold, color: blue });
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: blue });
    y -= 12;
  }

  // ── Header ──
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: blue });
  page.drawText(data.name || '', { x: margin, y: height - 30, size: 20, font: bold, color: rgb(1,1,1) });
  if (data.title) page.drawText(data.title, { x: margin, y: height - 50, size: 11, font, color: rgb(1,1,1,0.85) });
  const contacts = [data.email, data.phone, data.location, data.linkedin].filter(Boolean);
  if (contacts.length) {
    page.drawText(contacts.join('  |  '), { x: margin, y: height - 70, size: 8, font, color: rgb(1,1,1,0.75), maxWidth: contentWidth });
  }

  y = height - 110;

  // ── Summary ──
  if (data.summary) {
    drawSection('Professional Summary');
    drawWrappedText(data.summary, margin, contentWidth, 9, font, gray);
    y -= 4;
  }

  // ── Experience ──
  if (data.experience?.length) {
    drawSection('Work Experience');
    data.experience.forEach(exp => {
      checkY(40);
      page.drawText(exp.role || '', { x: margin, y, size: 10, font: bold, color: dark });
      if (exp.period) page.drawText(exp.period, { x: width - margin - 100, y, size: 9, font, color: gray });
      y -= 14;
      if (exp.company) {
        page.drawText(exp.company, { x: margin, y, size: 9, font, color: gray });
        y -= 14;
      }
      if (exp.bullets?.length) {
        exp.bullets.forEach(bullet => {
          checkY(14);
          page.drawText('•', { x: margin + 4, y, size: 9, font: bold, color: blue });
          drawWrappedText(bullet, margin + 16, contentWidth - 16, 9, font, gray);
        });
      }
      y -= 8;
    });
  }

  // ── Education ──
  if (data.education?.length) {
    drawSection('Education');
    data.education.forEach(edu => {
      checkY(30);
      page.drawText(edu.degree || '', { x: margin, y, size: 10, font: bold, color: dark });
      if (edu.year) page.drawText(edu.year, { x: width - margin - 60, y, size: 9, font, color: gray });
      y -= 14;
      if (edu.institution) {
        page.drawText(edu.institution, { x: margin, y, size: 9, font, color: gray });
        y -= 16;
      }
    });
  }

  // ── Skills ──
  if (data.skills?.length) {
    drawSection('Skills');
    let sx = margin;
    data.skills.forEach(skill => {
      const w = font.widthOfTextAtSize(skill, 8) + 16;
      if (sx + w > width - margin) { sx = margin; y -= 22; }
      checkY(20);
      page.drawRectangle({ x: sx, y: y - 4, width: w, height: 16, color: lightBlue });
      page.drawText(skill, { x: sx + 8, y: y + 2, size: 8, font, color: blue });
      sx += w + 6;
    });
    y -= 24;
  }

  // ── Certifications ──
  if (data.certifications?.length) {
    drawSection('Certifications');
    data.certifications.forEach(cert => {
      checkY(16);
      page.drawText('• ' + cert, { x: margin, y, size: 9, font, color: gray });
      y -= 14;
    });
  }

  // No footer — this is the user's personal document
  return await pdfDoc.save();
}

export default function CVImproverWorkspace() {
  const [cvText, setCvText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [structured, setStructured] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  async function handleImprove() {
    if (!cvText.trim()) { setError('Please paste your CV text first.'); return; }
    setBusy(true); setError(''); setStructured(null); setStatus(''); setDownloaded(false);
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
        setStatus('✅ CV improved! Preview below and download as PDF.');
      } else {
        setError('AI returned an unexpected format. Please try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPDF() {
    if (!structured) return;
    setDownloading(true);
    try {
      const bytes = await generateCVPdf(structured);
      // Use person's name for filename
      const name = structured.name ? structured.name.replace(/\s+/g, '_') : 'Resume';
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${name}_Resume.pdf`);
      setDownloaded(true);
    } catch (err) {
      setError('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };

  return (
    <div className="panel">
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
          Target Job Title (optional)
        </label>
        <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
          placeholder="e.g. Software Engineer, Marketing Manager, Accountant"
          style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
          Paste Your CV / Resume Text
        </label>
        <textarea value={cvText} onChange={e => setCvText(e.target.value)}
          placeholder="Paste your full CV or resume text here. Include your name, contact details, experience, education, skills..."
          style={{ ...inputStyle, minHeight: 250, resize: 'vertical', lineHeight: 1.6 }} />
        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>{cvText.length} characters — no limit</p>
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={busy || !cvText.trim()} onClick={handleImprove}>
          {busy ? '✦ AI is improving your CV…' : '✦ Improve My CV with AI'}
        </button>
      </div>

      {error && <div className="status error">{error}</div>}
      {status && !downloaded && <div className="status success">{status}</div>}

      {structured && (
        <div style={{ marginTop: 24 }}>
          {/* Preview */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: 12, padding: 20, marginBottom: 20, color: 'white' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>{structured.name}</div>
              {structured.title && <div style={{ fontSize: '0.88rem', opacity: 0.85, marginBottom: 8 }}>{structured.title}</div>}
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                {[structured.email, structured.phone, structured.location, structured.linkedin].filter(Boolean).join(' · ')}
              </div>
            </div>

            {structured.summary && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Professional Summary</div>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>{structured.summary}</p>
              </div>
            )}

            {structured.experience?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Work Experience</div>
                {structured.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '2px solid #BFDBFE' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{exp.role}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{exp.period}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 6 }}>{exp.company}</div>
                    {exp.bullets?.map((b, j) => (
                      <div key={j} style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 3, display: 'flex', gap: 6 }}>
                        <span style={{ color: '#2563EB', flexShrink: 0 }}>•</span>{b}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {structured.education?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Education</div>
                {structured.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{edu.degree}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{edu.year}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{edu.institution}</div>
                  </div>
                ))}
              </div>
            )}

            {structured.skills?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {structured.skills.map((skill, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {structured.certifications?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Certifications</div>
                {structured.certifications.map((cert, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 4 }}>• {cert}</div>
                ))}
              </div>
            )}
          </div>

          {/* Download */}
          <div className="actions">
            <button className="btn btn-primary" disabled={downloading} onClick={handleDownloadPDF}>
              {downloading ? 'Generating PDF…' : '⬇️ Download as PDF'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setStructured(null); setCvText(''); setStatus(''); setDownloaded(false); }}>
              Improve Another CV
            </button>
          </div>

          {/* Post-download message — no branding on the document */}
          {downloaded && (
            <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065F46', margin: '0 0 4px' }}>✅ Your resume is ready. Good luck with your application!</p>
              <p style={{ fontSize: '0.78rem', color: '#059669', margin: 0 }}>
                Love it? Share Convertam with a friend — <strong>convertam.app</strong>
              </p>
            </div>
          )}
        </div>
      )}

      <p className="privacy-note">Your CV is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
