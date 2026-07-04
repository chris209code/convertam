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

const EMPTY_EXP = { company: '', role: '', period: '', description: '' };
const EMPTY_EDU = { institution: '', degree: '', year: '' };

export default function ResumeBuilderWorkspace() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedin: '',
    summary: '',
  });
  const [experience, setExperience] = useState([{ ...EMPTY_EXP }]);
  const [education, setEducation] = useState([{ ...EMPTY_EDU }]);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateExp = (i, key, val) => setExperience(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  const updateEdu = (i, key, val) => setEducation(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  async function handleGenerate() {
    setBusy(true); setStatus('');
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { width, height } = page.getSize();
      const blue = rgb(0.145, 0.396, 0.918);
      const dark = rgb(0.059, 0.09, 0.157);
      const gray = rgb(0.4, 0.44, 0.52);
      let y = height - 40;

      // Header
      page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: blue });
      page.drawText(form.fullName || 'Your Name', { x: 40, y: height - 35, size: 20, font: bold, color: rgb(1,1,1) });
      page.drawText(form.jobTitle || '', { x: 40, y: height - 55, size: 11, font, color: rgb(1,1,1,0.85) });

      const contactParts = [form.email, form.phone, form.location, form.linkedin].filter(Boolean);
      page.drawText(contactParts.join('  |  '), { x: 40, y: height - 75, size: 8, font, color: rgb(1,1,1,0.75), maxWidth: width - 80 });

      y = height - 120;

      function drawSection(title) {
        y -= 16;
        page.drawText(title.toUpperCase(), { x: 40, y, size: 9, font: bold, color: blue });
        y -= 6;
        page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: blue });
        y -= 12;
      }

      function drawText(text, x, size, f, color, maxW) {
        if (!text) return;
        page.drawText(text, { x, y, size: size || 10, font: f || font, color: color || dark, maxWidth: maxW || width - 80 });
        y -= (size || 10) + 4;
      }

      // Summary
      if (form.summary) {
        drawSection('Professional Summary');
        drawText(form.summary, 40, 9, font, gray, width - 80);
        y -= 4;
      }

      // Experience
      if (experience.some(e => e.company || e.role)) {
        drawSection('Work Experience');
        experience.forEach(exp => {
          if (!exp.company && !exp.role) return;
          drawText(exp.role, 40, 10, bold, dark);
          y += 4;
          page.drawText(exp.company, { x: 40, y, size: 9, font, color: gray });
          if (exp.period) page.drawText(exp.period, { x: width - 150, y, size: 9, font, color: gray });
          y -= 13;
          if (exp.description) { drawText(exp.description, 44, 9, font, gray, width - 90); }
          y -= 4;
        });
      }

      // Education
      if (education.some(e => e.institution || e.degree)) {
        drawSection('Education');
        education.forEach(edu => {
          if (!edu.institution && !edu.degree) return;
          drawText(edu.degree, 40, 10, bold, dark);
          y += 4;
          page.drawText(edu.institution, { x: 40, y, size: 9, font, color: gray });
          if (edu.year) page.drawText(edu.year, { x: width - 100, y, size: 9, font, color: gray });
          y -= 16;
        });
      }

      // Skills
      if (skills.trim()) {
        drawSection('Skills');
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        let sx = 40;
        skillList.forEach(skill => {
          const w = skill.length * 6 + 16;
          if (sx + w > width - 40) { sx = 40; y -= 22; }
          page.drawRectangle({ x: sx, y: y - 4, width: w, height: 18, color: rgb(0.94, 0.96, 1) });
          page.drawText(skill, { x: sx + 8, y: y + 2, size: 8, font, color: blue });
          sx += w + 6;
        });
        y -= 24;
      }

      // Footer
      page.drawRectangle({ x: 0, y: 0, width, height: 25, color: blue });
      page.drawText('Generated by Convertam · convertam.app', { x: width/2 - 90, y: 8, size: 7, font, color: rgb(1,1,1,0.6) });

      const bytes = await pdfDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${form.fullName || 'Resume'}.pdf`);
      setStatus('✅ Resume downloaded successfully!');
      setStep(3);
    } catch (err) {
      console.error(err);
      setStatus('❌ Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      {/* Progress steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {['Personal Info', 'Experience & Education', 'Skills & Download'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: step > i+1 ? '#10B981' : step === i+1 ? '#2563EB' : '#E2E8F0', color: step >= i+1 ? 'white' : '#94A3B8', flexShrink: 0 }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: step === i+1 ? 700 : 400, color: step === i+1 ? '#2563EB' : '#94A3B8', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < 2 && <div style={{ height: 2, flex: 1, background: step > i+1 ? '#10B981' : '#E2E8F0', margin: '0 8px' }} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Personal Info */}
      {step === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[['fullName','Full Name'],['jobTitle','Job Title / Headline'],['email','Email'],['phone','Phone'],['location','Location'],['linkedin','LinkedIn (optional)']].map(([key, label]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Professional Summary</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={form.summary} onChange={e => updateForm('summary', e.target.value)} placeholder="Write a brief professional summary about yourself..." />
          </div>
          <button className="btn btn-primary" onClick={() => setStep(2)}>Next: Experience & Education →</button>
        </div>
      )}

      {/* Step 2 — Experience & Education */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Work Experience</p>
          {experience.map((exp, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {[['role','Job Title / Role'],['company','Company'],['period','Period (e.g. 2022 - 2024)']].map(([key, label]) => (
                  <div key={key} style={{ gridColumn: key === 'period' ? 'span 1' : 'span 1' }}>
                    <label style={labelStyle}>{label}</label>
                    <input style={inputStyle} value={exp[key]} onChange={e => updateExp(i, key, e.target.value)} placeholder={label} />
                  </div>
                ))}
              </div>
              <label style={labelStyle}>Key Achievements / Description</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)} placeholder="Describe your responsibilities and achievements..." />
              {experience.length > 1 && (
                <button onClick={() => setExperience(prev => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 8, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
              )}
            </div>
          ))}
          <button onClick={() => setExperience(prev => [...prev, { ...EMPTY_EXP }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>+ Add Experience</button>

          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Education</p>
          {education.map((edu, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
                {[['degree','Degree / Certificate'],['institution','Institution'],['year','Year']].map(([key, label]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input style={inputStyle} value={edu[key]} onChange={e => updateEdu(i, key, e.target.value)} placeholder={label} />
                  </div>
                ))}
              </div>
              {education.length > 1 && (
                <button onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 8, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
              )}
            </div>
          ))}
          <button onClick={() => setEducation(prev => [...prev, { ...EMPTY_EDU }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>+ Add Education</button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Skills & Download →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Skills & Download */}
      {step === 3 && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Skills (comma separated)</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Microsoft Office, Project Management, Communication, Python, Leadership..." />
          </div>

          {status && <div className={`status ${status.startsWith('✅') ? 'success' : 'error'}`}>{status}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
              {busy ? 'Generating…' : '⬇️ Download Resume PDF'}
            </button>
          </div>
          {status.startsWith('✅') && (
            <button className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => { setStep(1); setForm({ fullName:'',jobTitle:'',email:'',phone:'',location:'',linkedin:'',summary:'' }); setExperience([{...EMPTY_EXP}]); setEducation([{...EMPTY_EDU}]); setSkills(''); setStatus(''); }}>
              Build Another Resume
            </button>
          )}
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — nothing is uploaded anywhere.</p>
    </div>
  );
}
