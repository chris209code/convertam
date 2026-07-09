// Shared by Resume Builder and CV Improver, so there is exactly one set of
// CV templates on the whole site — both tools render the same components
// with their own data, rather than maintaining two separate copies that
// could quietly drift apart from each other over time.

// ---------------------------------------------------------------------------
// Icons — small inline SVGs, no new dependency
// ---------------------------------------------------------------------------
export const Icon = {
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
export function useResumeData({ form, targetRole, experience, education, certifications, skills }) {
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
export function eduDisplayLines(edu) {
  const titleLine = edu.course ? `${edu.degree} in ${edu.course}` : edu.degree;
  const subLine = [edu.institution, edu.location].filter(Boolean).join(', ');
  const dateLine = edu.startYear || edu.endYear
    ? `${edu.startYear || ''}${edu.current ? ' - Present' : (edu.endYear ? ` - ${edu.endYear}` : '')}`
    : '';
  return { titleLine, subLine, dateLine, gradeLine: edu.grade || '' };
}
export function certDisplayLines(cert) {
  const dateLine = cert.doesNotExpire
    ? (cert.dateIssued ? `Issued ${cert.dateIssued} — Does not expire` : 'Does not expire')
    : [cert.dateIssued && `Issued ${cert.dateIssued}`, cert.expiryDate && `Expires ${cert.expiryDate}`].filter(Boolean).join(' · ');
  return { titleLine: cert.name, subLine: cert.issuer, dateLine };
}

export function ExpBullets({ exp }) {
  const lines = exp.bullets?.length
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

// ---------------------------------------------------------------------------
// TEMPLATE 1 — Classic Professional
// ---------------------------------------------------------------------------
export function ClassicProfessional({ data }) {
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
                <p style={S.entrySub}>{exp.company}{exp.type && exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
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
export function ModernSidebar({ data }) {
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
                  <p style={S.entrySub}>{exp.company}{exp.type && exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
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
export function ExecutiveMinimal({ data }) {
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
                <p style={S.entrySub}>{exp.company}{exp.type && exp.type !== 'Work Experience' ? ` — ${exp.type}` : ''}</p>
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

export const TEMPLATES = { classic: ClassicProfessional, sidebar: ModernSidebar, executive: ExecutiveMinimal };
export const TEMPLATE_LABELS = { classic: 'Classic Professional', sidebar: 'Modern Sidebar', executive: 'Executive Minimal' };

// Shared print isolation CSS — only the resume itself is visible when printing,
// regardless of what else is on the page (sidebar controls, other UI, etc.)
export const RESUME_PRINT_STYLES = `
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
`;
