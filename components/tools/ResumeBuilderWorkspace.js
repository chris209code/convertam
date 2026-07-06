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

async function callAI(action, payload) {
  const res = await fetch('/api/resume-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data;
}

const CAREER_LEVELS = ['Student', 'Fresh graduate', 'NYSC member', 'Entry-level job seeker', 'Experienced professional', 'Career changer', 'Freelancer', 'Returning to work'];
const ROLE_SUGGESTIONS = ['Customer Service', 'Laboratory Technician', 'Administrative Assistant', 'Teacher', 'Sales Representative', 'Accountant', 'Software Developer', 'General CV / Not sure yet'];
const EXP_TYPES = ['Work Experience', 'NYSC', 'Internship', 'Volunteer Work', 'Teaching', 'Project'];

const EMPTY_EXP = {
  type: 'Work Experience', role: '', company: '', period: '',
  whatYouDid: '', toolsUsed: '', problemsSolved: '', whoYouWorkedWith: '', improvements: '', numbers: '', supervised: '',
  bullets: [], description: '', generating: false,
};
const EMPTY_EDU = { institution: '', degree: '', year: '' };

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const aiBtnStyle = { fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' };
const refineBtnStyle = { fontSize: '0.72rem', color: '#475569', background: 'white', border: '1px solid #E2E8F0', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' };

function RefineBar({ onAction, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('regenerate')}>↻ Regenerate</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('shorten')}>Shorten</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('strengthen')}>Strengthen</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('formal')}>More Formal</button>
    </div>
  );
}

export default function ResumeBuilderWorkspace() {
  const [step, setStep] = useState(0);
  const [careerLevel, setCareerLevel] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [customRole, setCustomRole] = useState('');

  const [form, setForm] = useState({ fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedin: '', summary: '' });
  const [experience, setExperience] = useState([{ ...EMPTY_EXP }]);
  const [education, setEducation] = useState([{ ...EMPTY_EDU }]);
  const [skills, setSkills] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState(null);
  const [suggestingSkills, setSuggestingSkills] = useState(false);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [refiningSummary, setRefiningSummary] = useState(false);

  const [polishResult, setPolishResult] = useState(null);
  const [polishing, setPolishing] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const role = targetRole === 'General CV / Not sure yet' ? '' : (targetRole || customRole);

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateExp = (i, key, val) => setExperience(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  const updateEdu = (i, key, val) => setEducation(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  function experienceContextText() {
    return experience
      .filter(e => e.role || e.company || e.bullets.length)
      .map(e => `${e.type}: ${e.role} at ${e.company}\n${e.bullets.join('\n')}`)
      .join('\n\n');
  }
  function educationContextText() {
    return education.filter(e => e.institution || e.degree).map(e => `${e.degree}, ${e.institution} (${e.year})`).join('\n');
  }

  async function handleGenerateBullets(i) {
    const exp = experience[i];
    setError('');
    updateExp(i, 'generating', true);
    try {
      const { bullets } = await callAI('bullets', {
        careerLevel, targetRole: role,
        jobTitle: exp.role, employer: exp.company,
        whatYouDid: exp.whatYouDid, toolsUsed: exp.toolsUsed, problemsSolved: exp.problemsSolved,
        whoYouWorkedWith: exp.whoYouWorkedWith, improvements: exp.improvements, numbers: exp.numbers, supervised: exp.supervised,
      });
      updateExp(i, 'bullets', bullets);
    } catch (err) {
      setError(err.message);
    } finally {
      updateExp(i, 'generating', false);
    }
  }

  async function handleRefineBullets(i, action) {
    const exp = experience[i];
    if (!exp.bullets.length) return;
    updateExp(i, 'generating', true);
    try {
      const { text } = await callAI('refine', { text: exp.bullets.join('\n'), action, context: `${exp.type} — ${exp.role} — targeting ${role || 'general role'}` });
      updateExp(i, 'bullets', text.split('\n').map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean));
    } catch (err) {
      setError(err.message);
    } finally {
      updateExp(i, 'generating', false);
    }
  }

  async function handleGenerateSummary() {
    setError('');
    setGeneratingSummary(true);
    try {
      const { summary } = await callAI('summary', {
        careerLevel, targetRole: role,
        experienceText: experienceContextText(),
        educationText: educationContextText(),
        skillsText: skills,
      });
      updateForm('summary', summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleRefineSummary(action) {
    if (!form.summary) return;
    setRefiningSummary(true);
    try {
      const { text } = await callAI('refine', { text: form.summary, action, context: `${careerLevel || ''} targeting ${role || 'general role'}` });
      updateForm('summary', text);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefiningSummary(false);
    }
  }

  async function handleSuggestSkills() {
    setError('');
    setSuggestingSkills(true);
    try {
      const result = await callAI('skills', { targetRole: role, experienceText: experienceContextText(), educationText: educationContextText() });
      setSkillSuggestions(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSuggestingSkills(false);
    }
  }

  function addSkill(skill) {
    const current = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (current.includes(skill)) return;
    setSkills([...current, skill].join(', '));
  }

  function buildResumeText() {
    const lines = [
      `Name: ${form.fullName}`, `Target role: ${role || 'General'}`, `Headline: ${form.jobTitle}`,
      `Summary: ${form.summary}`, '', 'Experience:', experienceContextText(), '',
      'Education:', educationContextText(), '', `Skills: ${skills}`,
    ];
    return lines.join('\n');
  }

  async function handlePolish() {
    setError('');
    setPolishing(true);
    try {
      const result = await callAI('polish', { resumeText: buildResumeText() });
      setPolishResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setPolishing(false);
    }
  }

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

      if (form.summary) {
        drawSection('Professional Summary');
        drawText(form.summary, 40, 9, font, gray, width - 80);
        y -= 4;
      }

      if (experience.some(e => e.company || e.role)) {
        drawSection('Experience');
        experience.forEach(exp => {
          if (!exp.company && !exp.role) return;
          drawText(`${exp.role}${exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}`, 40, 10, bold, dark);
          y += 4;
          page.drawText(exp.company, { x: 40, y, size: 9, font, color: gray });
          if (exp.period) page.drawText(exp.period, { x: width - 150, y, size: 9, font, color: gray });
          y -= 13;
          const bulletText = exp.bullets.length ? exp.bullets.map(b => `• ${b}`).join('\n') : exp.description;
          if (bulletText) {
            bulletText.split('\n').forEach(line => drawText(line, 44, 9, font, gray, width - 90));
          }
          y -= 4;
        });
      }

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

      const bytes = await pdfDoc.save();
      const resumeName = form.fullName ? form.fullName.replace(/\s+/g, '_') : 'Resume';
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${resumeName}_Resume.pdf`);
      setStatus('✅ Resume downloaded successfully!');
    } catch (err) {
      console.error(err);
      setStatus('❌ Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const STEPS = ['You', 'Personal Info', 'Experience', 'Education', 'Skills', 'Summary & Download'];

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, background: step > i ? '#10B981' : step === i ? '#2563EB' : '#E2E8F0', color: step >= i ? 'white' : '#94A3B8', flexShrink: 0 }}>
                {step > i ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: step === i ? 700 : 400, color: step === i ? '#2563EB' : '#94A3B8', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ height: 2, width: 20, background: step > i ? '#10B981' : '#E2E8F0', margin: '0 6px' }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

      {/* Step 0 — Who are you + target role */}
      {step === 0 && (
        <div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What best describes you?</p>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 12 }}>This helps us ask the right questions and write in the right tone for your situation.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
            {CAREER_LEVELS.map(level => (
              <button key={level} onClick={() => setCareerLevel(level)} style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', border: careerLevel === level ? '2px solid #2563EB' : '1px solid #E2E8F0', background: careerLevel === level ? '#EFF6FF' : 'white', color: careerLevel === level ? '#2563EB' : '#475569' }}>
                {level}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What kind of role are you targeting?</p>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 12 }}>We'll tailor suggestions to this — you can always change it later.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            {ROLE_SUGGESTIONS.map(r => (
              <button key={r} onClick={() => { setTargetRole(r); setCustomRole(''); }} style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', border: targetRole === r ? '2px solid #2563EB' : '1px solid #E2E8F0', background: targetRole === r ? '#EFF6FF' : 'white', color: targetRole === r ? '#2563EB' : '#475569' }}>
                {r}
              </button>
            ))}
          </div>
          <input style={inputStyle} placeholder="Or type your own target role…" value={customRole} onChange={e => { setCustomRole(e.target.value); setTargetRole(''); }} />

          <button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!careerLevel} onClick={() => setStep(1)}>
            Continue →
          </button>
        </div>
      )}

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
          <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: 16 }}>Your professional summary comes later — once we know about your experience, skills, and target role, AI can write a much stronger one than starting from a blank box.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Next: Experience →</button>
          </div>
        </div>
      )}

      {/* Step 2 — Experience (guided interview) */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Experience</p>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 16 }}>Include work experience, NYSC, internships, volunteer work, or teaching — whatever you actually have. Answer a few simple questions and let AI turn them into strong CV bullet points.</p>

          {experience.map((exp, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select style={inputStyle} value={exp.type} onChange={e => updateExp(i, 'type', e.target.value)}>
                    {EXP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Role / Position</label>
                  <input style={inputStyle} value={exp.role} onChange={e => updateExp(i, 'role', e.target.value)} placeholder="e.g. Sales Associate" />
                </div>
                <div>
                  <label style={labelStyle}>Organization</label>
                  <input style={inputStyle} value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="Where" />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Period (e.g. 2022 - 2024)</label>
                <input style={inputStyle} value={exp.period} onChange={e => updateExp(i, 'period', e.target.value)} />
              </div>

              <details style={{ marginBottom: 10 }} open={exp.bullets.length === 0}>
                <summary style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7C3AED', cursor: 'pointer', marginBottom: 8 }}>Answer a few questions so AI can write this for you</summary>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <div><label style={labelStyle}>What did you usually do there?</label><textarea style={{ ...inputStyle, minHeight: 50 }} value={exp.whatYouDid} onChange={e => updateExp(i, 'whatYouDid', e.target.value)} /></div>
                  <div><label style={labelStyle}>Equipment, software, or tools you used</label><input style={inputStyle} value={exp.toolsUsed} onChange={e => updateExp(i, 'toolsUsed', e.target.value)} /></div>
                  <div><label style={labelStyle}>Any problems you solved?</label><input style={inputStyle} value={exp.problemsSolved} onChange={e => updateExp(i, 'problemsSolved', e.target.value)} /></div>
                  <div><label style={labelStyle}>Who/what did you work with? (customers, students, machines, documents, teams)</label><input style={inputStyle} value={exp.whoYouWorkedWith} onChange={e => updateExp(i, 'whoYouWorkedWith', e.target.value)} /></div>
                  <div><label style={labelStyle}>Did you improve anything?</label><input style={inputStyle} value={exp.improvements} onChange={e => updateExp(i, 'improvements', e.target.value)} /></div>
                  <div><label style={labelStyle}>Any numbers, targets, percentages, or quantities you remember?</label><input style={inputStyle} value={exp.numbers} onChange={e => updateExp(i, 'numbers', e.target.value)} /></div>
                  <div><label style={labelStyle}>Did you supervise or train anyone?</label><input style={inputStyle} value={exp.supervised} onChange={e => updateExp(i, 'supervised', e.target.value)} /></div>
                </div>
              </details>

              <button style={aiBtnStyle} disabled={exp.generating} onClick={() => handleGenerateBullets(i)}>
                {exp.generating ? 'Writing…' : '✨ Help me write this'}
              </button>

              {exp.bullets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Result — edit freely if you want</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                    value={exp.bullets.join('\n')}
                    onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))}
                  />
                  <RefineBar disabled={exp.generating} onAction={(action) => handleRefineBullets(i, action)} />
                </div>
              )}

              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: '0.75rem', color: '#94A3B8', cursor: 'pointer' }}>Or just write it yourself instead</summary>
                <textarea style={{ ...inputStyle, minHeight: 60, marginTop: 8 }} value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)} placeholder="Type your own description instead of using AI" />
              </details>

              {experience.length > 1 && (
                <button onClick={() => setExperience(prev => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 10, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove this entry</button>
              )}
            </div>
          ))}
          <button onClick={() => setExperience(prev => [...prev, { ...EMPTY_EXP }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>+ Add Another Entry</button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Education →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Education */}
      {step === 3 && (
        <div>
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
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Next: Skills →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Skills */}
      {step === 4 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Skills (comma separated)</label>
            <button style={aiBtnStyle} disabled={suggestingSkills} onClick={handleSuggestSkills}>{suggestingSkills ? 'Thinking…' : '✨ Suggest Skills'}</button>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', marginBottom: 12 }} value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Microsoft Office, Project Management, Communication, Python, Leadership..." />

          {skillSuggestions && (
            <div style={{ marginBottom: 20 }}>
              {[['technical', 'Technical Skills'], ['tools', 'Tools / Software'], ['professional', 'Professional Skills']].map(([key, label]) => (
                skillSuggestions[key]?.length > 0 && (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{label} — click to add</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {skillSuggestions[key].map(s => (
                        <button key={s} onClick={() => addSkill(s)} style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: 999, border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}>+ {s}</button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(5)}>Next: Summary & Download →</button>
          </div>
        </div>
      )}

      {/* Step 5 — Summary, Polish, Download */}
      {step === 5 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Professional Summary</label>
            <button style={aiBtnStyle} disabled={generatingSummary} onClick={handleGenerateSummary}>{generatingSummary ? 'Writing…' : '✨ Generate Summary'}</button>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.summary} onChange={e => updateForm('summary', e.target.value)} placeholder="Click 'Generate Summary' above, or write your own." />
          {form.summary && <RefineBar disabled={refiningSummary} onAction={handleRefineSummary} />}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Final Review</p>
              <button style={aiBtnStyle} disabled={polishing} onClick={handlePolish}>{polishing ? 'Reviewing…' : '✨ Polish My CV'}</button>
            </div>

            {polishResult && (
              <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
                  {Object.entries(polishResult.score || {}).map(([key, val]) => (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: val >= 70 ? '#059669' : val >= 40 ? '#D97706' : '#DC2626' }}>{val}</div>
                      <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.68rem', color: '#94A3B8', marginBottom: 12 }}>These scores reflect what's actually written so far, not a guarantee of how any specific employer's system will read it.</p>
                {(polishResult.issues || []).map((iss, idx) => (
                  <div key={idx} style={{ padding: '8px 0', borderTop: idx > 0 ? '1px solid #E2E8F0' : 'none' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{iss.section}</p>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '2px 0' }}>{iss.issue}</p>
                    <p style={{ fontSize: '0.76rem', color: '#059669', margin: 0 }}>→ {iss.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status && <div className={`status ${status.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: 16 }}>{status}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(4)}>← Back</button>
            <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
              {busy ? 'Generating…' : '⬇️ Download Resume PDF'}
            </button>
          </div>
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — your resume file is never uploaded anywhere. AI suggestions are sent securely for generation only, never stored.</p>
    </div>
  );
}
