'use client';

import { useState } from 'react';

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
const EMPTY_EDU = { degree: '', course: '', institution: '', location: '', startYear: '', endYear: '', current: false, grade: '', notes: '' };
const EMPTY_CERT = { name: '', issuer: '', dateIssued: '', expiryDate: '', doesNotExpire: false, credentialId: '', credentialUrl: '' };

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
const aiBtnStyle = { fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' };
const refineBtnStyle = { fontSize: '0.72rem', color: '#475569', background: 'white', border: '1px solid #E2E8F0', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' };

function RefineBar({ onAction, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('regenerate')}>↻ Regenerate</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('shorten')}>Shorten</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('strengthen')}>Strengthen</button>
      <button style={refineBtnStyle} disabled={disabled} onClick={() => onAction('formal')}>More Formal</button>
      {disabled && <span style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600 }}>Working…</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons — small inline SVGs, no new dependency
// ---------------------------------------------------------------------------
const Icon = {
  person: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>,
  grad: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M2 9l10-5 10 5-10 5-10-5z" /><path d="M6 11.5v4c0 1.4 2.7 3 6 3s6-1.6 6-3v-4" /></svg>,
  briefcase: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  doc: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></svg>,
  gear: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M4.2 4.2l2.2 2.2M17.6 17.6l2.2 2.2M2 12h3M19 12h3M4.2 19.8L6.4 17.6M17.6 6.4l2.2-2.2" /></svg>,
  star: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.7 7.1-.7z" /></svg>,
  phone: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" /></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7 10-7" /></svg>,
  pin: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.3" /></svg>,
  link: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M7 10h4M7 13h7M7 16h5" /></svg>,
};

// ---------------------------------------------------------------------------
// Shared data shape passed into every template — build once, render 3 ways
// ---------------------------------------------------------------------------
function useResumeData({ form, targetRole, experience, education, certifications, skills }) {
  const contact = [form.phone, form.email, form.location, form.linkedin].filter(Boolean);
  return {
    form, targetRole,
    experience: experience.filter(e => e.role || e.company),
    education: education.filter(e => e.institution || e.degree),
    certifications: certifications.filter(c => c.name),
    skills: skills.split(',').map(s => s.trim()).filter(Boolean),
    contact,
  };
}

// Combines Qualification + Course + Institution + Location + Dates + Grade into
// the display lines each template needs, so templates don't each re-derive this.
function eduDisplayLines(edu) {
  const titleLine = edu.course ? `${edu.degree} in ${edu.course}` : edu.degree;
  const subLine = [edu.institution, edu.location].filter(Boolean).join(', ');
  const dateLine = edu.startYear || edu.endYear
    ? `${edu.startYear || ''}${edu.current ? ' - Present' : (edu.endYear ? ` - ${edu.endYear}` : '')}`
    : '';
  return { titleLine, subLine, dateLine, gradeLine: edu.grade || '' };
}
function certDisplayLines(cert) {
  const dateLine = cert.doesNotExpire
    ? (cert.dateIssued ? `Issued ${cert.dateIssued} — Does not expire` : 'Does not expire')
    : [cert.dateIssued && `Issued ${cert.dateIssued}`, cert.expiryDate && `Expires ${cert.expiryDate}`].filter(Boolean).join(' · ');
  return { titleLine: cert.name, subLine: cert.issuer, dateLine };
}

function ExpBullets({ exp }) {
  const lines = exp.bullets.length
    ? exp.bullets
    : (exp.description ? exp.description.split('\n').filter(Boolean)
      : (exp.whatYouDid ? exp.whatYouDid.split('\n').filter(Boolean) : []));
  if (!lines.length) return null;
  return (
    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
      {lines.map((l, i) => <li key={i} style={{ marginBottom: 3 }}>{l}</li>)}
    </ul>
  );
}

// Only the small header (title + company + dates) is kept together across a
// page break — the bullet list itself flows freely, so a long job's content
// can continue onto the next page without dragging the whole entry with it
// or leaving a blank gap behind it on the current page.

// ---------------------------------------------------------------------------
// TEMPLATE 1 — Classic Professional
// ---------------------------------------------------------------------------
function ClassicProfessional({ data }) {
  const { form, experience, education, certifications, skills, contact } = data;
  const S = {
    page: { fontFamily: 'Georgia, "Times New Roman", serif', color: '#1A1A1A', padding: '18mm 16mm' },
    name: { fontSize: 28, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: 0 },
    title: { fontSize: 12, fontWeight: 600, letterSpacing: 3, textAlign: 'center', color: '#374151', margin: '4px 0 10px', textTransform: 'uppercase' },
    contactRow: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 18px', fontSize: 11, color: '#374151', marginBottom: 10 },
    contactItem: { display: 'flex', alignItems: 'center', gap: 5, overflowWrap: 'anywhere' },
    hr: { border: 'none', borderTop: '2px solid #111', margin: '0 0 18px' },
    sectionHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, margin: '0 0 8px', textTransform: 'uppercase' },
    sectionRule: { border: 'none', borderTop: '1px solid #CBD5E1', margin: '10px 0 16px' },
    body: { fontSize: 11.5, lineHeight: 1.6, color: '#374151' },
    entryTitle: { fontSize: 12, fontWeight: 700, margin: 0, overflowWrap: 'anywhere' },
    entrySub: { fontSize: 11, color: '#4B5563', margin: '1px 0 4px', overflowWrap: 'anywhere' },
    dateRight: { float: 'right', fontSize: 11, color: '#4B5563' },
  };
  return (
    <div style={S.page}>
      <h1 style={S.name}>{form.fullName || 'Your Name'}</h1>
      {form.jobTitle && <p style={S.title}>{form.jobTitle}</p>}
      {contact.length > 0 && (
        <div style={S.contactRow}>
          {form.phone && <span style={S.contactItem}><Icon.phone />{form.phone}</span>}
          {form.email && <span style={S.contactItem}><Icon.mail />{form.email}</span>}
          {form.location && <span style={S.contactItem}><Icon.pin />{form.location}</span>}
          {form.linkedin && <span style={S.contactItem}><Icon.link />{form.linkedin}</span>}
        </div>
      )}
      <hr style={S.hr} />

      {form.summary && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.person /> Professional Summary</p>
          <p style={S.body}>{form.summary}</p>
          <hr style={S.sectionRule} />
        </section>
      )}

      {education.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.grad /> Education</p>
          {education.map((edu, i) => {
            const { titleLine, subLine, dateLine, gradeLine } = eduDisplayLines(edu);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                <p style={S.entrySub}>{subLine}{gradeLine ? ` — ${gradeLine}` : ''}</p>
              </div>
            );
          })}
          <hr style={S.sectionRule} />
        </section>
      )}

      {certifications.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.doc /> Certifications</p>
          {certifications.map((cert, i) => {
            const { titleLine, subLine, dateLine } = certDisplayLines(cert);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                {subLine && <p style={S.entrySub}>{subLine}</p>}
              </div>
            );
          })}
          <hr style={S.sectionRule} />
        </section>
      )}

      {experience.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.briefcase /> Professional Experience</p>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ breakInside: 'avoid' }}>
                <p style={S.entryTitle}>{exp.role}{exp.period && <span style={S.dateRight}>{exp.period}</span>}</p>
                <p style={S.entrySub}>{exp.company}{exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
              </div>
              <div style={S.body}><ExpBullets exp={exp} /></div>
            </div>
          ))}
          <hr style={S.sectionRule} />
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <p style={S.sectionHead}><Icon.gear /> Core Skills</p>
          <div style={{ columns: 3, fontSize: 11.5, color: '#374151' }}>
            {skills.map((s, i) => <div key={i} style={{ marginBottom: 4, breakInside: 'avoid' }}>• {s}</div>)}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TEMPLATE 2 — Modern Sidebar
// ---------------------------------------------------------------------------
function ModernSidebar({ data }) {
  const { form, experience, education, certifications, skills } = data;
  const initials = (form.fullName || 'U N').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const S = {
    page: { display: 'flex', fontFamily: "'Segoe UI', Arial, sans-serif" },
    sidebar: { width: '34%', background: '#16233D', color: 'white', padding: '20mm 8mm', boxSizing: 'border-box' },
    avatar: { width: 70, height: 70, borderRadius: '50%', border: '3px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, margin: '0 auto 14px' },
    sideName: { fontSize: 17, fontWeight: 800, textAlign: 'center', margin: '0 0 2px', lineHeight: 1.2, overflowWrap: 'anywhere' },
    sideTitle: { fontSize: 11, letterSpacing: 2, textAlign: 'center', color: '#93C5FD', textTransform: 'uppercase', marginBottom: 20 },
    sideHead: { fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: '#93C5FD', textTransform: 'uppercase', margin: '18px 0 8px' },
    sideItem: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 10.5, color: '#E2E8F0', marginBottom: 6, wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 },
    skillItem: { fontSize: 10.5, color: '#E2E8F0', marginBottom: 5 },
    main: { flex: 1, minWidth: 0, padding: '20mm 12mm', boxSizing: 'border-box', color: '#1E293B' },
    sectionHead: { fontSize: 13, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' },
    sectionRule: { border: 'none', borderTop: '2px solid #1D4ED8', margin: '0 0 14px', width: 60 },
    body: { fontSize: 11.5, lineHeight: 1.6, color: '#374151' },
    entryTitle: { fontSize: 12, fontWeight: 700, margin: 0, overflowWrap: 'anywhere' },
    entrySub: { fontSize: 11, color: '#4B5563', margin: '1px 0 4px', overflowWrap: 'anywhere' },
    dateRight: { float: 'right', fontSize: 11, color: '#4B5563' },
  };
  return (
    <div style={S.page}>
      <aside style={S.sidebar}>
        <div style={S.avatar}>{initials}</div>
        <p style={S.sideName}>{form.fullName || 'Your Name'}</p>
        {form.jobTitle && <p style={S.sideTitle}>{form.jobTitle}</p>}

        <p style={S.sideHead}>Contact</p>
        {form.phone && <div style={S.sideItem}><Icon.phone />{form.phone}</div>}
        {form.email && <div style={S.sideItem}><Icon.mail />{form.email}</div>}
        {form.location && <div style={S.sideItem}><Icon.pin />{form.location}</div>}
        {form.linkedin && <div style={S.sideItem}><Icon.link />{form.linkedin}</div>}

        {skills.length > 0 && (
          <>
            <p style={S.sideHead}>Skills</p>
            {skills.map((s, i) => <div key={i} style={S.skillItem}>• {s}</div>)}
          </>
        )}
      </aside>

      <main style={S.main}>
        {form.summary && (
          <section style={{ marginBottom: 18 }}>
            <p style={S.sectionHead}>Professional Summary</p>
            <hr style={S.sectionRule} />
            <p style={S.body}>{form.summary}</p>
          </section>
        )}

        {education.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <p style={S.sectionHead}>Education</p>
            <hr style={S.sectionRule} />
            {education.map((edu, i) => {
              const { titleLine, subLine, dateLine, gradeLine } = eduDisplayLines(edu);
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                  <p style={S.entrySub}>{subLine}{gradeLine ? ` — ${gradeLine}` : ''}</p>
                </div>
              );
            })}
          </section>
        )}

        {certifications.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <p style={S.sectionHead}>Certifications</p>
            <hr style={S.sectionRule} />
            {certifications.map((cert, i) => {
              const { titleLine, subLine, dateLine } = certDisplayLines(cert);
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                  {subLine && <p style={S.entrySub}>{subLine}</p>}
                </div>
              );
            })}
          </section>
        )}

        {experience.length > 0 && (
          <section>
            <p style={S.sectionHead}>Professional Experience</p>
            <hr style={S.sectionRule} />
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ breakInside: 'avoid' }}>
                  <p style={S.entryTitle}>{exp.role}{exp.period && <span style={S.dateRight}>{exp.period}</span>}</p>
                  <p style={S.entrySub}>{exp.company}{exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
                </div>
                <div style={S.body}><ExpBullets exp={exp} /></div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TEMPLATE 3 — Executive Minimal
// ---------------------------------------------------------------------------
function ExecutiveMinimal({ data }) {
  const { form, experience, education, certifications, skills, contact } = data;
  const green = '#2F5D4F';
  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1E293B', padding: '18mm 16mm' },
    name: { fontSize: 24, fontWeight: 700, letterSpacing: 6, textAlign: 'center', margin: 0, textTransform: 'uppercase' },
    titleWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '6px 0 10px' },
    titleLine: { flex: '0 0 40px', height: 1, background: '#CBD5E1' },
    title: { fontSize: 11, letterSpacing: 3, color: green, textTransform: 'uppercase', fontWeight: 700 },
    contactRow: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 18px', fontSize: 10.5, color: '#475569', marginBottom: 12 },
    contactItem: { display: 'flex', alignItems: 'center', gap: 5, overflowWrap: 'anywhere' },
    hr: { border: 'none', borderTop: '1px solid #E2E8F0', margin: '0 0 16px' },
    sectionHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: green, margin: '0 0 8px', textTransform: 'uppercase' },
    sectionRule: { border: 'none', borderTop: '1px solid #E2E8F0', margin: '10px 0 16px' },
    body: { fontSize: 11.5, lineHeight: 1.6, color: '#374151' },
    entryTitle: { fontSize: 12, fontWeight: 700, margin: 0, overflowWrap: 'anywhere' },
    entrySub: { fontSize: 11, color: '#4B5563', margin: '1px 0 4px', overflowWrap: 'anywhere' },
    dateRight: { float: 'right', fontSize: 11, color: '#4B5563' },
  };
  return (
    <div style={S.page}>
      <h1 style={S.name}>{form.fullName || 'Your Name'}</h1>
      {form.jobTitle && (
        <div style={S.titleWrap}><span style={S.titleLine} /><span style={S.title}>{form.jobTitle}</span><span style={S.titleLine} /></div>
      )}
      {contact.length > 0 && (
        <div style={S.contactRow}>
          {form.phone && <span style={S.contactItem}><Icon.phone />{form.phone}</span>}
          {form.email && <span style={S.contactItem}><Icon.mail />{form.email}</span>}
          {form.location && <span style={S.contactItem}><Icon.pin />{form.location}</span>}
          {form.linkedin && <span style={S.contactItem}><Icon.link />{form.linkedin}</span>}
        </div>
      )}
      <hr style={S.hr} />

      {form.summary && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.person style={{ color: green }} /> Professional Summary</p>
          <p style={S.body}>{form.summary}</p>
          <hr style={S.sectionRule} />
        </section>
      )}

      {education.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.grad style={{ color: green }} /> Education</p>
          {education.map((edu, i) => {
            const { titleLine, subLine, dateLine, gradeLine } = eduDisplayLines(edu);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                <p style={S.entrySub}>{subLine}{gradeLine ? ` — ${gradeLine}` : ''}</p>
              </div>
            );
          })}
          <hr style={S.sectionRule} />
        </section>
      )}

      {certifications.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.doc style={{ color: green }} /> Certifications</p>
          {certifications.map((cert, i) => {
            const { titleLine, subLine, dateLine } = certDisplayLines(cert);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={S.entryTitle}>{titleLine}{dateLine && <span style={S.dateRight}>{dateLine}</span>}</p>
                {subLine && <p style={S.entrySub}>{subLine}</p>}
              </div>
            );
          })}
          <hr style={S.sectionRule} />
        </section>
      )}

      {experience.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.briefcase style={{ color: green }} /> Professional Experience</p>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ breakInside: 'avoid' }}>
                <p style={S.entryTitle}>{exp.role}{exp.period && <span style={S.dateRight}>{exp.period}</span>}</p>
                <p style={S.entrySub}>{exp.company}{exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
              </div>
              <div style={S.body}><ExpBullets exp={exp} /></div>
            </div>
          ))}
          <hr style={S.sectionRule} />
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <p style={S.sectionHead}><Icon.star style={{ color: green }} /> Core Skills</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px', fontSize: 11, color: '#374151' }}>
            {skills.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </section>
      )}
    </div>
  );
}

const TEMPLATES = { classic: ClassicProfessional, sidebar: ModernSidebar, executive: ExecutiveMinimal };
const TEMPLATE_LABELS = { classic: 'Classic Professional', sidebar: 'Modern Sidebar', executive: 'Executive Minimal' };

export default function ResumeBuilderWorkspace() {
  const [step, setStep] = useState(0);
  const [careerLevel, setCareerLevel] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [template, setTemplate] = useState('classic');

  const [form, setForm] = useState({ fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedin: '', summary: '' });
  const [experience, setExperience] = useState([{ ...EMPTY_EXP }]);
  const [education, setEducation] = useState([{ ...EMPTY_EDU }]);
  const [certifications, setCertifications] = useState([]);
  const [skills, setSkills] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState(null);
  const [suggestingSkills, setSuggestingSkills] = useState(false);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [refiningSummary, setRefiningSummary] = useState(false);
  const [previousSummary, setPreviousSummary] = useState(null);

  const [polishResult, setPolishResult] = useState(null);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState('');

  const role = targetRole === 'General CV / Not sure yet' ? '' : (targetRole || customRole);

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateExp = (i, key, val) => setExperience(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  const updateEdu = (i, key, val) => setEducation(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  const updateCert = (i, key, val) => setCertifications(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  function moveCert(i, dir) {
    setCertifications(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function experienceContextText() {
    return experience.filter(e => e.role || e.company || e.bullets.length).map(e => `${e.type}: ${e.role} at ${e.company}\n${e.bullets.join('\n')}`).join('\n\n');
  }
  function educationContextText() {
    return education.filter(e => e.institution || e.degree).map(e => {
      const dates = e.startYear || e.endYear ? ` (${e.startYear || ''}${e.current ? ' - Present' : (e.endYear ? ` - ${e.endYear}` : '')})` : '';
      return `${e.degree}${e.course ? ` in ${e.course}` : ''}, ${e.institution}${e.location ? `, ${e.location}` : ''}${dates}${e.grade ? ` — ${e.grade}` : ''}`;
    }).join('\n');
  }
  function certificationsContextText() {
    return certifications.filter(c => c.name).map(c => `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.dateIssued ? ` (${c.dateIssued})` : ''}`).join('\n');
  }

  async function handleGenerateBullets(i) {
    const exp = experience[i];
    setError('');
    updateExp(i, 'generating', true);
    try {
      const { bullets } = await callAI('bullets', {
        careerLevel, targetRole: role, jobTitle: exp.role, employer: exp.company,
        whatYouDid: exp.whatYouDid, toolsUsed: exp.toolsUsed, problemsSolved: exp.problemsSolved,
        whoYouWorkedWith: exp.whoYouWorkedWith, improvements: exp.improvements, numbers: exp.numbers, supervised: exp.supervised,
      });
      updateExp(i, 'bullets', bullets);
    } catch (err) { setError(err.message); } finally { updateExp(i, 'generating', false); }
  }

  async function handleRefineBullets(i, action) {
    const exp = experience[i];
    if (!exp.bullets.length) return;
    updateExp(i, 'generating', true);
    try {
      const { text } = await callAI('refine', { text: exp.bullets.join('\n'), modifier: action, context: `${exp.type} — ${exp.role} — targeting ${role || 'general role'}` });
      updateExp(i, 'bullets', text.split('\n').map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean));
    } catch (err) { setError(err.message); } finally { updateExp(i, 'generating', false); }
  }

  async function handleGenerateSummary() {
    setError(''); setGeneratingSummary(true);
    try {
      const { summary } = await callAI('summary', { careerLevel, targetRole: role, experienceText: experienceContextText(), educationText: educationContextText(), skillsText: skills });
      updateForm('summary', summary);
    } catch (err) { setError(err.message); } finally { setGeneratingSummary(false); }
  }

  async function handleRefineSummary(action) {
    if (!form.summary) return;
    setRefiningSummary(true);
    const previous = form.summary;
    try {
      const { text } = await callAI('refine', { text: form.summary, modifier: action, context: `${careerLevel || ''} targeting ${role || 'general role'}` });
      setPreviousSummary(previous);
      updateForm('summary', text);
    } catch (err) { setError(err.message); } finally { setRefiningSummary(false); }
  }
  function undoSummary() {
    if (previousSummary == null) return;
    updateForm('summary', previousSummary);
    setPreviousSummary(null);
  }

  async function handleSuggestSkills() {
    setError(''); setSuggestingSkills(true);
    try {
      const result = await callAI('skills', { targetRole: role, experienceText: experienceContextText(), educationText: educationContextText() });
      setSkillSuggestions(result);
    } catch (err) { setError(err.message); } finally { setSuggestingSkills(false); }
  }

  function addSkill(skill) {
    const current = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (current.includes(skill)) return;
    setSkills([...current, skill].join(', '));
  }

  function buildResumeText() {
    return [
      `Name: ${form.fullName}`, `Target role: ${role || 'General'}`, `Headline: ${form.jobTitle}`,
      `Summary: ${form.summary}`, '', 'Experience:', experienceContextText(), '',
      'Education:', educationContextText(), '', 'Certifications:', certificationsContextText(), '', `Skills: ${skills}`,
    ].join('\n');
  }

  async function handlePolish() {
    setError(''); setPolishing(true);
    try {
      const result = await callAI('polish', { resumeText: buildResumeText() });
      setPolishResult(result);
    } catch (err) { setError(err.message); } finally { setPolishing(false); }
  }

  const resumeData = useResumeData({ form, targetRole: role, experience, education, certifications, skills });
  const TemplateComponent = TEMPLATES[template];

  const STEPS = ['You', 'Personal Info', 'Experience', 'Education', 'Skills', 'Summary', 'Preview & Download'];

  return (
    <div className="panel">
      {/* Print isolation: only the resume itself is visible when printing, regardless of what else is on the page */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .resume-print-root, .resume-print-root * { visibility: visible; }
          .resume-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          .resume-print-root, .resume-print-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          .resume-page-frame { min-height: 0 !important; box-shadow: none !important; }
          @page { size: A4; margin: 6mm; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, flexWrap: 'wrap' }} className="no-print">
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, background: step > i ? '#10B981' : step === i ? '#2563EB' : '#E2E8F0', color: step >= i ? 'white' : '#94A3B8', flexShrink: 0 }}>
                {step > i ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: step === i ? 700 : 400, color: step === i ? '#2563EB' : '#94A3B8', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ height: 2, width: 14, background: step > i ? '#10B981' : '#E2E8F0', margin: '0 5px' }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }} className="no-print">{error}</div>}

      {step === 0 && (
        <div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What best describes you?</p>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 12 }}>This helps us ask the right questions and write in the right tone for your situation.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
            {CAREER_LEVELS.map(level => (
              <button key={level} onClick={() => setCareerLevel(level)} style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', border: careerLevel === level ? '2px solid #2563EB' : '1px solid #E2E8F0', background: careerLevel === level ? '#EFF6FF' : 'white', color: careerLevel === level ? '#2563EB' : '#475569' }}>{level}</button>
            ))}
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What kind of role are you targeting?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            {ROLE_SUGGESTIONS.map(r => (
              <button key={r} onClick={() => { setTargetRole(r); setCustomRole(''); }} style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', border: targetRole === r ? '2px solid #2563EB' : '1px solid #E2E8F0', background: targetRole === r ? '#EFF6FF' : 'white', color: targetRole === r ? '#2563EB' : '#475569' }}>{r}</button>
            ))}
          </div>
          <input style={inputStyle} placeholder="Or type your own target role…" value={customRole} onChange={e => { setCustomRole(e.target.value); setTargetRole(''); }} />
          <button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!careerLevel} onClick={() => setStep(1)}>Continue →</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[['fullName','Full Name'],['jobTitle','Job Title / Headline'],['email','Email'],['phone','Phone'],['location','Location'],['linkedin','LinkedIn (optional)']].map(([key, label]) => (
              <div key={key}><label style={labelStyle}>{label}</label><input style={inputStyle} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} /></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Next: Experience →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Experience</p>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 16 }}>Include work experience, NYSC, internships, volunteer work, or teaching. Answer a few simple questions and let AI turn them into strong CV bullet points.</p>
          {experience.map((exp, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Type</label><select style={inputStyle} value={exp.type} onChange={e => updateExp(i, 'type', e.target.value)}>{EXP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Role / Position</label><input style={inputStyle} value={exp.role} onChange={e => updateExp(i, 'role', e.target.value)} /></div>
                <div><label style={labelStyle}>Organization</label><input style={inputStyle} value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} /></div>
              </div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>Period (e.g. 2022 - 2024)</label><input style={inputStyle} value={exp.period} onChange={e => updateExp(i, 'period', e.target.value)} /></div>
              <details style={{ marginBottom: 10 }} open={exp.bullets.length === 0}>
                <summary style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7C3AED', cursor: 'pointer', marginBottom: 8 }}>Answer a few questions so AI can write this for you</summary>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <div><label style={labelStyle}>Job Description</label><textarea style={{ ...inputStyle, minHeight: 50 }} value={exp.whatYouDid} onChange={e => updateExp(i, 'whatYouDid', e.target.value)} placeholder="What did you do in this role? This will appear on your CV as-is unless you use AI to turn it into polished bullet points below." /></div>
                  <div><label style={labelStyle}>Equipment, software, or tools you used</label><input style={inputStyle} value={exp.toolsUsed} onChange={e => updateExp(i, 'toolsUsed', e.target.value)} /></div>
                  <div><label style={labelStyle}>Any problems you solved?</label><input style={inputStyle} value={exp.problemsSolved} onChange={e => updateExp(i, 'problemsSolved', e.target.value)} /></div>
                  <div><label style={labelStyle}>Who/what did you work with?</label><input style={inputStyle} value={exp.whoYouWorkedWith} onChange={e => updateExp(i, 'whoYouWorkedWith', e.target.value)} /></div>
                  <div><label style={labelStyle}>Did you improve anything?</label><input style={inputStyle} value={exp.improvements} onChange={e => updateExp(i, 'improvements', e.target.value)} /></div>
                  <div><label style={labelStyle}>Any numbers, targets, percentages, or quantities?</label><input style={inputStyle} value={exp.numbers} onChange={e => updateExp(i, 'numbers', e.target.value)} /></div>
                  <div><label style={labelStyle}>Did you supervise or train anyone?</label><input style={inputStyle} value={exp.supervised} onChange={e => updateExp(i, 'supervised', e.target.value)} /></div>
                </div>
              </details>
              <button style={aiBtnStyle} disabled={exp.generating} onClick={() => handleGenerateBullets(i)}>{exp.generating ? 'Writing…' : '✨ Help me write this'}</button>
              {exp.bullets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Result — edit freely if you want</label>
                  <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={exp.bullets.join('\n')} onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))} />
                  <RefineBar disabled={exp.generating} onAction={(action) => handleRefineBullets(i, action)} />
                </div>
              )}
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: '0.75rem', color: '#94A3B8', cursor: 'pointer' }}>Or just write it yourself instead</summary>
                <textarea style={{ ...inputStyle, minHeight: 60, marginTop: 8 }} value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)} />
              </details>
              {experience.length > 1 && <button onClick={() => setExperience(prev => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 10, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove this entry</button>}
            </div>
          ))}
          <button onClick={() => setExperience(prev => [...prev, { ...EMPTY_EXP }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>+ Add Another Entry</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Education →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Education</p>
          {education.map((edu, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Qualification / Degree</label><input style={inputStyle} value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="e.g. Bachelor of Science (B.Sc.)" /></div>
                <div><label style={labelStyle}>Course of Study</label><input style={inputStyle} value={edu.course} onChange={e => updateEdu(i, 'course', e.target.value)} placeholder="e.g. Industrial Chemistry" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Institution</label><input style={inputStyle} value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} /></div>
                <div><label style={labelStyle}>Location</label><input style={inputStyle} value={edu.location} onChange={e => updateEdu(i, 'location', e.target.value)} placeholder="e.g. Abraka, Delta State" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                <div><label style={labelStyle}>Start Year</label><input style={inputStyle} value={edu.startYear} onChange={e => updateEdu(i, 'startYear', e.target.value)} /></div>
                <div>
                  <label style={labelStyle}>End Year</label>
                  <input style={inputStyle} value={edu.endYear} disabled={edu.current} onChange={e => updateEdu(i, 'endYear', e.target.value)} />
                </div>
                <label style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
                  <input type="checkbox" checked={edu.current} onChange={e => updateEdu(i, 'current', e.target.checked)} /> Currently studying
                </label>
              </div>
              <details>
                <summary style={{ fontSize: '0.75rem', color: '#94A3B8', cursor: 'pointer', marginBottom: 8 }}>Optional: grade & additional notes</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 8 }}>
                  <div><label style={labelStyle}>Grade / Class of Degree</label><input style={inputStyle} value={edu.grade} onChange={e => updateEdu(i, 'grade', e.target.value)} placeholder="e.g. Second Class Upper" /></div>
                  <div><label style={labelStyle}>Additional Details</label><input style={inputStyle} value={edu.notes} onChange={e => updateEdu(i, 'notes', e.target.value)} /></div>
                </div>
              </details>
              {education.length > 1 && <button onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 10, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
            </div>
          ))}
          <button onClick={() => setEducation(prev => [...prev, { ...EMPTY_EDU }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 28 }}>+ Add Education</button>

          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Certifications <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></p>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>Professional certifications, licenses, or courses completed.</p>
          {certifications.map((cert, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Certification Name</label><input style={inputStyle} value={cert.name} onChange={e => updateCert(i, 'name', e.target.value)} placeholder="e.g. Lean Six Sigma Green Belt" /></div>
                <div><label style={labelStyle}>Issuing Organization</label><input style={inputStyle} value={cert.issuer} onChange={e => updateCert(i, 'issuer', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                <div><label style={labelStyle}>Date Issued</label><input style={inputStyle} value={cert.dateIssued} onChange={e => updateCert(i, 'dateIssued', e.target.value)} placeholder="e.g. March 2023" /></div>
                <div><label style={labelStyle}>Expiry Date</label><input style={inputStyle} disabled={cert.doesNotExpire} value={cert.expiryDate} onChange={e => updateCert(i, 'expiryDate', e.target.value)} /></div>
                <label style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={cert.doesNotExpire} onChange={e => updateCert(i, 'doesNotExpire', e.target.checked)} /> Does not expire
                </label>
              </div>
              <details>
                <summary style={{ fontSize: '0.75rem', color: '#94A3B8', cursor: 'pointer', marginBottom: 8 }}>Optional: credential ID & link</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <div><label style={labelStyle}>Credential ID</label><input style={inputStyle} value={cert.credentialId} onChange={e => updateCert(i, 'credentialId', e.target.value)} /></div>
                  <div><label style={labelStyle}>Credential URL</label><input style={inputStyle} value={cert.credentialUrl} onChange={e => updateCert(i, 'credentialUrl', e.target.value)} /></div>
                </div>
              </details>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={() => moveCert(i, -1)} disabled={i === 0} style={{ fontSize: '0.75rem', color: i === 0 ? '#CBD5E1' : '#475569', background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>↑ Move up</button>
                <button onClick={() => moveCert(i, 1)} disabled={i === certifications.length - 1} style={{ fontSize: '0.75rem', color: i === certifications.length - 1 ? '#CBD5E1' : '#475569', background: 'none', border: 'none', cursor: i === certifications.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>↓ Move down</button>
                <button onClick={() => setCertifications(prev => prev.filter((_, idx) => idx !== i))} style={{ fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
              </div>
            </div>
          ))}
          <button onClick={() => setCertifications(prev => [...prev, { ...EMPTY_CERT }])} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>+ Add Certification</button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Next: Skills →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Skills (comma separated)</label>
            <button style={aiBtnStyle} disabled={suggestingSkills} onClick={handleSuggestSkills}>{suggestingSkills ? 'Thinking…' : '✨ Suggest Skills'}</button>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', marginBottom: 12 }} value={skills} onChange={e => setSkills(e.target.value)} />
          {skillSuggestions && (
            <div style={{ marginBottom: 20 }}>
              {[['technical', 'Technical Skills'], ['tools', 'Tools / Software'], ['professional', 'Professional Skills']].map(([key, label]) => (
                skillSuggestions[key]?.length > 0 && (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{label} — click to add</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {skillSuggestions[key].map(s => <button key={s} onClick={() => addSkill(s)} style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: 999, border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}>+ {s}</button>)}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(5)}>Next: Summary →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Professional Summary</label>
            <button style={aiBtnStyle} disabled={generatingSummary} onClick={handleGenerateSummary}>{generatingSummary ? 'Writing…' : '✨ Generate Summary'}</button>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.summary} onChange={e => updateForm('summary', e.target.value)} placeholder="Click 'Generate Summary' above, or write your own." />
          {form.summary && (
            <>
              <RefineBar disabled={refiningSummary} onAction={handleRefineSummary} />
              {previousSummary != null && (
                <button onClick={undoSummary} style={{ ...refineBtnStyle, marginTop: 8, color: '#DC2626' }}>↩ Undo last change</button>
              )}
            </>
          )}

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

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(4)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(6)}>Next: Preview & Download →</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.keys(TEMPLATES).map(key => (
                <button key={key} onClick={() => setTemplate(key)} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: template === key ? '2px solid #2563EB' : '1px solid #E2E8F0', background: template === key ? '#EFF6FF' : 'white', color: template === key ? '#2563EB' : '#475569' }}>
                  {TEMPLATE_LABELS[key]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setStep(5)}>← Back</button>
              <button className="btn btn-primary" onClick={() => window.print()}>⬇️ Download PDF</button>
              <a href="/pdf-to-word" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#2563EB', textDecoration: 'none', padding: '10px 14px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                <Icon.doc /> Convert to MS Word
              </a>
            </div>
          </div>
          <p className="no-print" style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
            Need an editable copy? Convert your downloaded PDF to Word.
          </p>

          <div style={{ background: '#E2E8F0', padding: '20px 0', borderRadius: 12, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
            <div className="resume-print-root">
              <div className="resume-page-frame" style={{ width: '210mm', minHeight: '297mm', background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <TemplateComponent data={resumeData} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', marginTop: 10 }} className="no-print">
            Long CVs automatically continue onto additional pages when you download — nothing gets cut off.
          </p>
        </div>
      )}

      <p className="privacy-note no-print">Processed entirely in your browser. AI suggestions are sent securely for generation only, never stored.</p>
    </div>
  );
}
