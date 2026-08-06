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
  award: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="6" /><path d="M8.5 13.2L7 21l5-2.8L17 21l-1.5-7.8" /></svg>,
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

// Strips a leading bullet symbol (-, *, •) or numbered-list marker (1. / 1))
// from a pasted line, without touching the rest of the text.
const BULLET_PREFIX_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;

// Single source of truth for turning whatever shape a job's responsibilities
// happen to be stored in into a clean array of distinct bullet lines.
// Handles every input pattern this data can realistically arrive in:
//  - an already-split array of separate bullet strings (used as-is)
//  - a single-item array whose one entry actually contains multiple lines
//    (a common upstream shape when bullets weren't split before storage)
//  - a plain string (from `description` or `whatYouDid`) with real line breaks
//  - lines that still have a pasted "-", "*", "•", or "1." prefix
// Deliberately only splits on line breaks — never on sentence punctuation —
// so a single explicit bullet is never silently exploded into several.
export function normalizeBulletLines(exp) {
  let rawLines;
  if (Array.isArray(exp.bullets) && exp.bullets.length) {
    rawLines = exp.bullets.length > 1 ? exp.bullets : String(exp.bullets[0]).split('\n');
  } else if (exp.description) {
    rawLines = String(exp.description).split('\n');
  } else if (exp.whatYouDid) {
    rawLines = String(exp.whatYouDid).split('\n');
  } else {
    rawLines = [];
  }
  return rawLines
    .map((line) => String(line).replace(BULLET_PREFIX_RE, '').trim())
    .filter(Boolean);
}

// Deliberately NOT <ul><li> with CSS list-style — that depends on
// list-style-type/::marker actually surviving whatever global reset
// stylesheet and PDF/print engine the page runs through, which is exactly
// what silently swallowed the bullet glyph before. The bullet character
// here is real rendered text content in its own column, so it physically
// cannot be stripped by CSS the way a list-marker can.
function BulletList({ lines, keyPrefix, className, style, liStyle }) {
  if (!lines.length) return null;
  return (
    <div className={className || 'cv-job-bullets'} style={{ margin: '4px 0 0', ...style }}>
      {lines.map((l, i) => (
        <div key={`${keyPrefix}-${i}`} className="cv-bullet-row" style={{ display: 'grid', gridTemplateColumns: '12px 1fr', alignItems: 'start', columnGap: 4, marginBottom: 4, ...liStyle }}>
          <span className="cv-bullet-marker" style={{ lineHeight: 'inherit' }}>•</span>
          <span className="cv-bullet-text" style={{ minWidth: 0, lineHeight: 'inherit' }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

// exp.achievements is a Convertam CV Improver addition (a role's quantified
// results, kept separate from its day-to-day duties). Achievements are
// deliberately NOT rendered here, under the role they came from — they get
// their own standalone section (see groupAchievementsByRole below and each
// template's "Achievements" section), the same level as Skills, Education
// and Certifications, so this only ever renders the flat responsibilities
// list. No per-role achievement styling needed here any more.
export function ExpBullets({ exp, className, style, liStyle }) {
  const responsibilityLines = normalizeBulletLines(exp);
  return <BulletList lines={responsibilityLines} keyPrefix="b" className={className} style={style} liStyle={liStyle} />;
}

// Turns the per-role achievements every experience entry may carry into the
// data a standalone "Achievements" section needs: one group per role that
// actually has any, in the same order as the experience list, each with its
// own bullets — so achievements read as a single dedicated section grouped
// by job title (matching Skills/Education/Certifications) instead of being
// scattered under each individual role.
export function groupAchievementsByRole(experience) {
  return (experience || [])
    .map((exp) => ({
      role: exp.role || '',
      company: exp.company || '',
      items: (Array.isArray(exp.achievements) ? exp.achievements : []).map((a) => String(a).trim()).filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
}

// ---------------------------------------------------------------------------
// TEMPLATE 1 — Classic Professional
// ---------------------------------------------------------------------------
export function ClassicProfessional({ data }) {
  const { form, experience, education, certifications, skills, contact } = data;
  const achievementGroups = groupAchievementsByRole(experience);
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
        <section style={{ marginBottom: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
        <section style={{ marginBottom: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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

      {achievementGroups.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.award /> Achievements</p>
          {achievementGroups.map((group, i) => (
            <div key={i} style={{ marginBottom: 10, breakInside: 'avoid' }}>
              <p style={{ ...S.entrySub, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>{[group.role, group.company].filter(Boolean).join(' — ')}</p>
              <BulletList lines={group.items} keyPrefix={`ach${i}`} style={S.body} />
            </div>
          ))}
          <hr style={S.sectionRule} />
        </section>
      )}

      {skills.length > 0 && (
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
// TEMPLATE 3 — Executive Minimal
// ---------------------------------------------------------------------------
export function ExecutiveMinimal({ data }) {
  const { form, experience, education, certifications, skills, contact } = data;
  const achievementGroups = groupAchievementsByRole(experience);
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
        <section style={{ marginBottom: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
        <section style={{ marginBottom: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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

      {achievementGroups.length > 0 && (
        <section style={{ marginBottom: 6 }}>
          <p style={S.sectionHead}><Icon.award style={{ color: green }} /> Achievements</p>
          {achievementGroups.map((group, i) => (
            <div key={i} style={{ marginBottom: 10, breakInside: 'avoid' }}>
              <p style={{ ...S.entrySub, fontWeight: 700, color: '#1E293B', margin: '0 0 2px' }}>{[group.role, group.company].filter(Boolean).join(' — ')}</p>
              <BulletList lines={group.items} keyPrefix={`ach${i}`} style={S.body} />
            </div>
          ))}
          <hr style={S.sectionRule} />
        </section>
      )}

      {skills.length > 0 && (
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <p style={S.sectionHead}><Icon.star style={{ color: green }} /> Core Skills</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px', fontSize: 11, color: '#374151' }}>
            {skills.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODERN PROFESSIONAL — a category of its own with 3 layout variants
// (Sidebar / Centered / Header Band), built to the exact design handoff spec.
// Per explicit instruction, these NEVER render a photo — no image, no circle,
// no reserved gap for one — even though the original design spec allowed for
// an optional one. If photo support is ever wanted, it should be a separate
// template category, not a change to these three.
//
// These accept a richer data shape (adds projects, achievements, languages,
// and skill levels 1-5) than the original 3 templates use. adaptToModernProfessionalData()
// below maps the existing simpler resume data into this shape so these new
// templates work today without requiring wizard changes — skills default to
// a neutral level since the wizard doesn't collect explicit 1-5 ratings yet,
// and projects/achievements/languages come through empty until that's added.
// ---------------------------------------------------------------------------

const MPIcon = {
  phone: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="4" y="1.5" width="7" height="13" rx="1.5" /><line x1="6.5" y1="12" x2="9.5" y2="12" /></svg>,
  mail: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="1.5" y="3.5" width="13" height="9" rx="1" /><polyline points="1.5,4 8,9 14.5,4" /></svg>,
  pin: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="8" cy="6" r="3.2" /><polygon points="5.2,8.5 10.8,8.5 8,14" fill="currentColor" stroke="none" /></svg>,
  linkedin: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="5.5" cy="5.5" r="3" /><circle cx="10.5" cy="10.5" r="3" /></svg>,
  summary: (p) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="3" y="1.5" width="10" height="13" rx="1" /><line x1="5" y1="5.5" x2="11" y2="5.5" /><line x1="5" y1="8.5" x2="11" y2="8.5" /><line x1="5" y1="11.5" x2="9" y2="11.5" /></svg>,
  briefcase: (p) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="1.5" y="6" width="13" height="8.5" rx="1" /><rect x="6" y="2.5" width="4" height="3.5" rx="1" /></svg>,
  cap: (p) => <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><polygon points="8,2 15,5.5 8,9 1,5.5" /><rect x="4.5" y="7.5" width="7" height="1.6" /></svg>,
  folder: (p) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="1.5" y="3" width="6" height="2.5" rx="0.8" /><rect x="1.5" y="5" width="13" height="9" rx="1" /></svg>,
  diamond: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" stroke="none" {...p}><polygon points="8,1.5 14.5,8 8,14.5 1.5,8" /></svg>,
  badge: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="8" cy="6" r="4.2" /><polygon points="6,9.5 8,14.5 10,9.5" fill="currentColor" stroke="none" /></svg>,
  trophy: (p) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M5 2h6v4a3 3 0 01-6 0V2z" /><path d="M5 3H2.5a1 1 0 00-1 1.2A3.5 3.5 0 005 7" /><path d="M11 3h2.5a1 1 0 011 1.2A3.5 3.5 0 0111 7" /><line x1="8" y1="9" x2="8" y2="12" /><path d="M5.5 14.5h5" /></svg>,
  globe: (p) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="8" cy="8" r="6" /><ellipse cx="8" cy="8" rx="2.4" ry="6" /><line x1="2" y1="8" x2="14" y2="8" /></svg>,
};

export function adaptToModernProfessionalData({ form, experience, education, certifications, skills }) {
  const mappedExperience = (experience || []).filter(e => e.role || e.company).map(e => ({
    role: e.role, company: e.company, location: '', start: (e.period || '').split(/[-–]/)[0]?.trim() || '', end: (e.period || '').split(/[-–]/)[1]?.trim() || '',
    bullets: e.bullets?.length ? e.bullets : (e.description ? e.description.split('\n').filter(Boolean) : []),
    achievements: e.achievements || [],
    isCurrent: !!e.isCurrent,
  }));
  return {
    name: form.fullName || 'Your Name',
    title: form.jobTitle || '',
    contact: { phone: form.phone || '', email: form.email || '', location: form.location || '', linkedin: form.linkedin || '' },
    summary: form.summary || '',
    experience: mappedExperience,
    education: (education || []).filter(e => e.institution || e.degree).map(e => ({ degree: e.degree, school: e.institution, location: e.location || '', start: e.startYear || '', end: e.current ? 'Present' : (e.endYear || '') })),
    projects: [],
    skills: (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : (skills || [])).map(name => ({ name, level: 3 })),
    certifications: (certifications || []).filter(c => c.name).map(c => ({ name: c.name, issuer: c.issuer || '' })),
    languages: [],
    // A standalone, grouped-by-role section — the same level as Skills,
    // Education and Certifications — rather than nested under each job
    // (ExpBullets never renders achievements per role any more).
    achievements: groupAchievementsByRole(mappedExperience),
  };
}

function MPSidebar({ data }) {
  const accent = '#1e40af';
  const hasSummary = !!data.summary?.trim();
  const hasLinkedin = !!data.contact?.linkedin;
  const hasSkills = data.skills?.length > 0;
  const hasCerts = data.certifications?.length > 0;
  const hasLanguages = data.languages?.length > 0;
  const hasExperience = data.experience?.length > 0;
  const hasEducation = data.education?.length > 0;
  const hasProjects = data.projects?.length > 0;
  const hasAchievements = data.achievements?.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', background: '#fff' }}>
      <div style={{ flex: '0 0 258px', background: '#0e2a52', color: '#fff', padding: '46px 28px 44px', display: 'flex', flexDirection: 'column', gap: 26, boxSizing: 'border-box' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>CONTACT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MPIcon.phone style={{ flexShrink: 0 }} /><span>{data.contact.phone}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MPIcon.mail style={{ flexShrink: 0 }} /><span>{data.contact.email}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MPIcon.pin style={{ flexShrink: 0 }} /><span>{data.contact.location}</span></div>
            {hasLinkedin && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MPIcon.linkedin style={{ flexShrink: 0 }} /><span>{data.contact.linkedin}</span></div>}
          </div>
        </div>
        {hasSkills && (
          <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}><MPIcon.diamond />SKILLS</div>
            {data.skills.map((skill, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{skill.name}</div>
            ))}
          </div>
        )}
        {hasCerts && (
          <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}><MPIcon.badge />CERTIFICATIONS</div>
            {data.certifications.map((cert, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 9 }}>
                <div>{cert.name}</div>
                {cert.issuer && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1 }}>{cert.issuer}</div>}
              </div>
            ))}
          </div>
        )}
        {hasLanguages && (
          <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}><MPIcon.globe />LANGUAGES</div>
            {data.languages.map((lang, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>{lang.name}</span><span style={{ color: 'rgba(255,255,255,0.6)' }}>{lang.level}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 auto', padding: '52px 46px 60px', minWidth: 0, boxSizing: 'border-box' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1.12, letterSpacing: '-0.01em' }}>{data.name}</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{data.title}</div>

        {hasSummary && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}><MPIcon.summary style={{ color: accent }} />Professional Summary</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#374151', margin: 0 }}>{data.summary}</p>
          </div>
        )}

        {hasExperience && (
          <div style={{ marginTop: 26 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 14 }}><MPIcon.briefcase style={{ color: accent }} />Work Experience</div>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ breakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{exp.role} <span style={{ fontWeight: 500, color: '#64748b' }}>· {exp.company}</span></div>
                    <div style={{ fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>{exp.start} – {exp.end}</div>
                  </div>
                  {exp.location && <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{exp.location}</div>}
                </div>
                <ExpBullets exp={exp} style={{ margin: '8px 0 0' }} liStyle={{ fontSize: 14, lineHeight: 1.55, color: '#374151', marginBottom: 4 }} />
              </div>
            ))}
          </div>
        )}

        {hasAchievements && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 12 }}><MPIcon.trophy style={{ color: accent }} />Achievements</div>
            {data.achievements.map((group, i) => (
              <div key={i} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{[group.role, group.company].filter(Boolean).join(' · ')}</div>
                <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>
                  {group.items.map((a, j) => <li key={j} style={{ fontSize: 14, lineHeight: 1.55, color: '#374151', marginBottom: 4 }}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {hasEducation && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 12 }}><MPIcon.cap style={{ color: accent }} />Education</div>
            {data.education.map((edu, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10, breakInside: 'avoid' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{edu.degree}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{edu.school}{edu.location ? ` · ${edu.location}` : ''}</div>
                </div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>{edu.start} – {edu.end}</div>
              </div>
            ))}
          </div>
        )}

        {hasProjects && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 12 }}><MPIcon.folder style={{ color: accent }} />Projects</div>
            {data.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{proj.name}</div>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: '#374151', margin: '3px 0 0' }}>{proj.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MPCentered({ data }) {
  const accent = '#047857';
  const hasSummary = !!data.summary?.trim();
  const hasLinkedin = !!data.contact?.linkedin;
  const hasExperience = data.experience?.length > 0;
  const hasEducation = data.education?.length > 0;
  const hasProjects = data.projects?.length > 0;
  const hasAchievements = data.achievements?.length > 0;
  const hasSkills = data.skills?.length > 0;
  const hasCerts = data.certifications?.length > 0;

  return (
    <div style={{ width: '100%', background: '#fff', padding: '56px 64px 64px', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{data.name}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>{data.title}</div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', marginTop: 16, fontSize: 13.5, color: '#475569' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.phone style={{ color: accent }} />{data.contact.phone}</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.mail style={{ color: accent }} />{data.contact.email}</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.pin style={{ color: accent }} />{data.contact.location}</span>
          {hasLinkedin && <><span style={{ color: '#cbd5e1' }}>•</span><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.linkedin style={{ color: accent }} />{data.contact.linkedin}</span></>}
        </div>
      </div>

      {hasSummary && (
        <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 12 }}><MPIcon.summary />Professional Summary</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#374151', textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>{data.summary}</p>
        </div>
      )}

      {hasExperience && (
        <div style={{ marginTop: 30, paddingTop: 28, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 18 }}><MPIcon.briefcase />Experience</div>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ breakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: '#0f172a' }}>{exp.role} <span style={{ fontWeight: 500, color: '#64748b' }}>— {exp.company}</span></div>
                  <div style={{ fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>{exp.start} – {exp.end}</div>
                </div>
                {exp.location && <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{exp.location}</div>}
              </div>
              <ExpBullets exp={exp} style={{ margin: '9px 0 0' }} liStyle={{ fontSize: 14, lineHeight: 1.6, color: '#374151', marginBottom: 4 }} />
            </div>
          ))}
        </div>
      )}

      {hasAchievements && (
        <div style={{ marginTop: 8, paddingTop: 28, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 14 }}><MPIcon.trophy />Achievements</div>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {data.achievements.map((group, i) => (
              <div key={i} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>{[group.role, group.company].filter(Boolean).join(' — ')}</div>
                {group.items.map((a, j) => <div key={j} style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', textAlign: 'center', marginTop: 4 }}>{a}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEducation && (
        <div style={{ marginTop: 8, paddingTop: 28, borderTop: '1px solid #e5e7eb', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 16 }}><MPIcon.cap />Education</div>
          {data.education.map((edu, i) => (
            <div key={i} style={{ textAlign: 'center', marginBottom: 12, breakInside: 'avoid' }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{edu.degree}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{edu.school}{edu.location ? ` · ${edu.location}` : ''} · {edu.start} – {edu.end}</div>
            </div>
          ))}
        </div>
      )}

      {hasProjects && (
        <div style={{ marginTop: 8, paddingTop: 28, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 16 }}><MPIcon.folder />Projects</div>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ textAlign: 'center', marginBottom: 14, breakInside: 'avoid' }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{proj.name}</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', margin: '3px auto 0', maxWidth: 560 }}>{proj.description}</p>
            </div>
          ))}
        </div>
      )}

      {hasSkills && (
        <div style={{ marginTop: 8, paddingTop: 28, borderTop: '1px solid #e5e7eb', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 14 }}><MPIcon.diamond />Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {data.skills.map((skill, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 999, padding: '5px 13px' }}>{skill.name}</span>)}
          </div>
        </div>
      )}

      {hasCerts && (
        <div style={{ marginTop: 8, paddingTop: 28, borderTop: '1px solid #e5e7eb', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 14 }}><MPIcon.badge />Certifications</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 22px' }}>
            {data.certifications.map((cert, i) => (
              <div key={i} style={{ fontSize: 13.5, color: '#374151', textAlign: 'center' }}>{cert.name}{cert.issuer && <span style={{ color: '#94a3b8' }}> · {cert.issuer}</span>}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MPHeaderBand({ data }) {
  const accent = '#1c2431';
  const hasSummary = !!data.summary?.trim();
  const hasLinkedin = !!data.contact?.linkedin;
  const hasExperience = data.experience?.length > 0;
  const hasEducation = data.education?.length > 0;
  const hasProjects = data.projects?.length > 0;
  const hasAchievements = data.achievements?.length > 0;
  const hasSkills = data.skills?.length > 0;
  const hasCerts = data.certifications?.length > 0;
  const hasLanguages = data.languages?.length > 0;

  return (
    <div style={{ width: '100%', background: '#fff' }}>
      <div style={{ background: accent, color: '#fff', padding: '44px 56px', display: 'flex', alignItems: 'center', gap: 22, boxSizing: 'border-box' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.01em' }}>{data.name}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{data.title}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', marginTop: 12, fontSize: 13, color: '#cbd5e1' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.phone style={{ color: '#cbd5e1' }} />{data.contact.phone}</span>
            <span style={{ color: '#4b5563' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.mail style={{ color: '#cbd5e1' }} />{data.contact.email}</span>
            <span style={{ color: '#4b5563' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.pin style={{ color: '#cbd5e1' }} />{data.contact.location}</span>
            {hasLinkedin && <><span style={{ color: '#4b5563' }}>|</span><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MPIcon.linkedin style={{ color: '#cbd5e1' }} />{data.contact.linkedin}</span></>}
          </div>
        </div>
      </div>

      <div style={{ padding: '36px 56px 56px', boxSizing: 'border-box' }}>
        {hasSummary && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, marginBottom: 10 }}><MPIcon.summary />Professional Summary</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#374151', margin: 0 }}>{data.summary}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            {hasExperience && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 14 }}><MPIcon.briefcase />Experience</div>
                {data.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ breakInside: 'avoid' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{exp.role}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{exp.start} – {exp.end}</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 1 }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</div>
                    </div>
                    <ExpBullets exp={exp} style={{ margin: '7px 0 0', paddingLeft: 17 }} liStyle={{ fontSize: 13.5, lineHeight: 1.55, color: '#374151', marginBottom: 4 }} />
                  </div>
                ))}
              </div>
            )}
            {hasProjects && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 14 }}><MPIcon.folder />Projects</div>
                {data.projects.map((proj, i) => (
                  <div key={i} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{proj.name}</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#374151', margin: '3px 0 0' }}>{proj.description}</p>
                  </div>
                ))}
              </div>
            )}
            {hasAchievements && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 14 }}><MPIcon.trophy />Achievements</div>
                {data.achievements.map((group, i) => (
                  <div key={i} style={{ marginBottom: 10, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{[group.role, group.company].filter(Boolean).join(' · ')}</div>
                    <ul style={{ margin: '3px 0 0', paddingLeft: 17 }}>
                      {group.items.map((a, j) => <li key={j} style={{ fontSize: 13.5, lineHeight: 1.55, color: '#374151', marginBottom: 4 }}>{a}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            {hasEducation && (
              <div style={{ marginBottom: 22, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 12 }}><MPIcon.cap />Education</div>
                {data.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 10, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{edu.degree}</div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{edu.school}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{edu.start} – {edu.end}{edu.location ? ` · ${edu.location}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
            {hasSkills && (
              <div style={{ marginBottom: 22, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 12 }}><MPIcon.diamond />Skills</div>
                {data.skills.map((skill, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>{skill.name}</div>
                ))}
              </div>
            )}
            {hasCerts && (
              <div style={{ marginBottom: 22, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 12 }}><MPIcon.badge />Certifications</div>
                {data.certifications.map((cert, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: '#374151', marginBottom: 8 }}>
                    <div>{cert.name}</div>
                    {cert.issuer && <div style={{ color: '#94a3b8', fontSize: 12 }}>{cert.issuer}</div>}
                  </div>
                ))}
              </div>
            )}
            {hasLanguages && (
              <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, paddingBottom: 6, borderBottom: `1px solid ${accent}`, marginBottom: 12 }}><MPIcon.globe />Languages</div>
                {data.languages.map((lang, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#374151' }}>{lang.name}</span><span style={{ color: '#94a3b8' }}>{lang.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const TEMPLATES = { classic: ClassicProfessional, executive: ExecutiveMinimal, mpSidebar: MPSidebar, mpCentered: MPCentered, mpHeaderBand: MPHeaderBand };
export const TEMPLATE_LABELS = { classic: 'Elegant Minimal', executive: 'Executive', mpSidebar: 'Modern Professional — Sidebar', mpCentered: 'Modern Professional — Centered', mpHeaderBand: 'Modern Professional — Header Band' };

// Richer metadata for the card-based template picker — badge (⭐ = recommended
// for that situation), and a "best for" line so people can choose based on
// their actual situation rather than guessing from a name alone. When more
// templates are added later, just add an entry here — both Resume Builder
// and CV Improver read from this same list.
export const TEMPLATE_META = [
  { key: 'mpSidebar', label: 'Modern Professional — Sidebar', badge: '⭐', bestFor: 'Perfect for most job applications. A coloured sidebar anchors contact, skills and credentials beside a clean main column.' },
  { key: 'mpCentered', label: 'Modern Professional — Centered', badge: null, bestFor: 'Clean, modern and ATS-friendly. Generous whitespace and thin dividers give it an open, elegant feel.' },
  { key: 'mpHeaderBand', label: 'Modern Professional — Header Band', badge: null, bestFor: 'Modern corporate appearance with premium hierarchy. A dark header band opens onto a two-column body.' },
  { key: 'classic', label: 'Elegant Minimal', badge: null, bestFor: 'Banking, finance, legal, administration' },
  { key: 'executive', label: 'Executive', badge: null, bestFor: 'Managers and senior professionals' },
];

// Shared card-based picker — shows people what each template is *for*, not
// just a name, so they can choose based on their own situation. Both tools
// render this exact same component; adding a template to TEMPLATE_META above
// automatically gives it a card here in both places, no extra wiring needed.
export function TemplatePicker({ selected, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 4 }}>
      {TEMPLATE_META.map(({ key, label, badge, bestFor }) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: isSelected ? '#EFF6FF' : 'white',
              transition: 'all 150ms ease',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#1D4ED8' : '#0F172A', marginBottom: 4 }}>
              {badge && <span style={{ marginRight: 5 }}>{badge}</span>}{label}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>{bestFor}</div>
            {isSelected && (
              <div style={{ marginTop: 8, fontSize: '0.72rem', fontWeight: 700, color: '#2563EB' }}>✓ Selected</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Generates the actual PDF file server-side (Puppeteer, one canonical
// Chromium instance/font/DPI on every machine) instead of relying on the
// visitor's own window.print() — which handed pagination, margins, fonts,
// and header/footer rendering to whatever browser/OS/print-driver the
// person happened to have, producing different output on different PCs
// and an unsuppressable browser header/footer on machines where the print
// dialog's "Headers and footers" setting was on. Shared by both Resume
// Builder and CV Improver so there is exactly one download implementation,
// same as there is exactly one set of templates above.
const DOWNLOAD_TIMEOUT_MS = 50000;

// Shared button-label text for each real download stage — kept in one
// place so both tools show identical wording rather than each hand-writing
// its own copy that could drift.
export const DOWNLOAD_STAGE_LABELS = {
  preparing: 'Preparing CV…',
  generating: 'Generating PDF…',
  'starting-download': 'Starting download…',
};

// Three real, sequential stages tied to actual async boundaries (request
// built → request in flight on the server → file handed to the browser) —
// not a fake progress percentage, since there's no meaningful sub-progress
// to report inside a single server round trip.
export async function downloadResumePdf({ templateKey, templateData, fileName, onStage }) {
  onStage?.('preparing');
  // Yields one frame so the "preparing" label actually paints before the
  // fetch call below starts — without this, the state update and the
  // fetch would both happen within the same synchronous stretch and the
  // browser would never get a chance to render the transition at all.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  let res;
  try {
    onStage?.('generating');
    res = await fetch('/api/resume-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, templateData }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('PDF generation is taking longer than expected. Please try again.');
    throw new Error('Could not reach the server — check your internet connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `The server could not generate the PDF (error ${res.status}). Please try again.`);
  }
  onStage?.('starting-download');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Same real, sequential-stage pattern as downloadResumePdf above, hitting
// /api/resume-docx instead — a direct, purpose-built .docx export from the
// same templateData (see lib/resume/renderResumeDocxHtml.js) rather than
// routing the CV through the generic, lossy PDF-to-Word tool.
export const DOCX_DOWNLOAD_STAGE_LABELS = {
  preparing: 'Preparing CV…',
  generating: 'Generating Word document…',
  'starting-download': 'Starting download…',
};

export async function downloadResumeDocx({ templateKey, templateData, fileName, onStage }) {
  onStage?.('preparing');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  let res;
  try {
    onStage?.('generating');
    res = await fetch('/api/resume-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, templateData }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Word document generation is taking longer than expected. Please try again.');
    throw new Error('Could not reach the server — check your internet connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `The server could not generate the Word document (error ${res.status}). Please try again.`);
  }
  onStage?.('starting-download');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
