// Builds a real, editable .docx directly from the CV's structured data —
// deliberately NOT by feeding html-to-docx the same flexbox/absolute-
// positioned HTML used for the PDF (components/tools/resumeTemplates.js).
// html-to-docx has no support for CSS flexbox or multi-column layout (see
// its README), so doing that would silently collapse into the same kind
// of flattened, linear document a generic PDF-to-DOCX engine (CloudConvert)
// already produces — the exact problem this file exists to avoid.
//
// Instead, this renders purpose-built, DOCX-safe semantic HTML: headings,
// paragraphs, and lists for single-column templates, and a real HTML
// <table> for the two templates with a genuine two-column layout
// (mpSidebar's dark sidebar, mpHeaderBand's body columns) — html-to-docx
// DOES support tables, and a table is exactly how Word itself represents
// a two-column resume layout, so this is a genuine structural match, not
// an approximation.
//
// This does NOT and cannot reproduce pixel-perfect visual styling (colors,
// exact fonts, spacing) — Word documents aren't meant to look pixel-
// identical to a PDF. What it does preserve is the actual information
// architecture: which section is in the sidebar vs. the main column,
// real heading levels, real bullet lists — the structure that matters for
// someone who wants to actually edit the CV in Word.
//
// Table cell widths below are in px, not %: html-to-docx's column-width
// parser only recognizes pt/px/cm/in (confirmed against its bundled
// source) — a percentage width silently produces an invalid attribute
// value and crashes the whole conversion, which is exactly what happened
// during testing before this was caught.

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function bulletsHtml(bullets) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) return '';
  return `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

// A role's achievements render directly under its own responsibilities,
// in a second <ul> marked with a ★ prefix so they still read as distinct
// "here's what I achieved" lines — mirrors resumeTemplates.js's ExpBullets.
// An earlier version pulled every role's achievements into one standalone
// "Achievements" section at the end of the document, re-printing each
// role/company as a group heading there too, which reads as the entire
// Experience section appearing a second time rather than a summary.
function expBulletsHtml(exp, fallbackLines) {
  const responsibilities = (fallbackLines || []).filter(Boolean);
  const achievements = (Array.isArray(exp.achievements) ? exp.achievements : []).filter(Boolean);
  const respHtml = responsibilities.length ? `<ul>${responsibilities.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
  const achHtml = achievements.length ? `<ul>${achievements.map((a) => `<li>★ ${esc(a)}</li>`).join('')}</ul>` : '';
  return respHtml + achHtml;
}

function contactLineLegacy(form) {
  return [form.phone, form.email, form.location, form.linkedin].filter(Boolean).map(esc).join(' | ');
}

function contactLineModern(contact) {
  return [contact?.phone, contact?.email, contact?.location, contact?.linkedin].filter(Boolean).map(esc).join(' | ');
}

// ---------------------------------------------------------------------
// Legacy shape (classic / executive) — {form, experience, education,
// certifications, skills, contact} from resumeTemplates.js's
// useResumeData(). Already a single flowing column on-screen, so a
// straightforward heading/paragraph/list document is a genuine match,
// not a simplification.
// ---------------------------------------------------------------------
function renderLegacyBody(data) {
  const { form, experience = [], education = [], certifications = [], skills = [] } = data;
  const parts = [];
  parts.push(`<h1>${esc(form.fullName || 'Your Name')}</h1>`);
  if (form.jobTitle) parts.push(`<p><strong>${esc(form.jobTitle)}</strong></p>`);
  const contactLine = contactLineLegacy(form);
  if (contactLine) parts.push(`<p>${contactLine}</p>`);

  if (form.summary) {
    parts.push('<h2>Professional Summary</h2>');
    parts.push(`<p>${esc(form.summary)}</p>`);
  }
  if (education.length) {
    parts.push('<h2>Education</h2>');
    education.forEach((edu) => {
      const title = edu.course ? `${edu.degree} in ${edu.course}` : edu.degree;
      const sub = [edu.institution, edu.location].filter(Boolean).join(', ');
      const dates = edu.startYear || edu.endYear ? `${edu.startYear || ''}${edu.current ? ' - Present' : (edu.endYear ? ` - ${edu.endYear}` : '')}` : '';
      parts.push(`<p><strong>${esc(title)}</strong>${dates ? ` (${esc(dates)})` : ''}<br/>${esc(sub)}${edu.grade ? ` — ${esc(edu.grade)}` : ''}</p>`);
    });
  }
  if (certifications.length) {
    parts.push('<h2>Certifications</h2>');
    certifications.forEach((cert) => {
      const dateLine = cert.doesNotExpire
        ? (cert.dateIssued ? `Issued ${cert.dateIssued} — Does not expire` : 'Does not expire')
        : [cert.dateIssued && `Issued ${cert.dateIssued}`, cert.expiryDate && `Expires ${cert.expiryDate}`].filter(Boolean).join(' · ');
      parts.push(`<p><strong>${esc(cert.name)}</strong>${dateLine ? ` (${esc(dateLine)})` : ''}${cert.issuer ? `<br/>${esc(cert.issuer)}` : ''}</p>`);
    });
  }
  if (experience.length) {
    parts.push('<h2>Professional Experience</h2>');
    experience.forEach((exp) => {
      parts.push(`<p><strong>${esc(exp.role)}</strong>${exp.period ? ` (${esc(exp.period)})` : ''}<br/>${esc(exp.company)}${exp.type && exp.type !== 'Work Experience' ? ` — ${esc(exp.type)}` : ''}</p>`);
      const lines = Array.isArray(exp.bullets) && exp.bullets.length ? exp.bullets : (exp.description ? String(exp.description).split('\n').filter(Boolean) : []);
      parts.push(expBulletsHtml(exp, lines));
    });
  }
  if (skills.length) {
    parts.push('<h2>Core Skills</h2>');
    parts.push(bulletsHtml(skills));
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------
// Modern Professional shapes — {name, title, contact, summary, experience,
// education, projects, skills, certifications, languages, achievements}
// from adaptToModernProfessionalData().
// ---------------------------------------------------------------------
function modernExperienceHtml(experience = []) {
  return experience.map((exp) => {
    const dates = [exp.start, exp.end].filter(Boolean).join(' – ');
    return `<p><strong>${esc(exp.role)}</strong>${dates ? ` (${esc(dates)})` : ''}<br/>${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</p>${expBulletsHtml(exp, exp.bullets || [])}`;
  }).join('\n');
}
function modernEducationHtml(education = []) {
  return education.map((edu) => {
    const dates = [edu.start, edu.end].filter(Boolean).join(' – ');
    return `<p><strong>${esc(edu.degree)}</strong><br/>${esc(edu.school)}${edu.location ? ` · ${esc(edu.location)}` : ''}${dates ? `<br/>${esc(dates)}` : ''}</p>`;
  }).join('\n');
}
function modernProjectsHtml(projects = []) {
  return projects.map((p) => `<p><strong>${esc(p.name)}</strong></p><p>${esc(p.description)}</p>`).join('\n');
}
function modernSkillsHtml(skills = []) {
  return bulletsHtml(skills.map((s) => (typeof s === 'string' ? s : s.name)));
}
function modernCertsHtml(certifications = []) {
  return certifications.map((c) => `<p>${esc(c.name)}${c.issuer ? ` — ${esc(c.issuer)}` : ''}</p>`).join('\n');
}
function modernLanguagesHtml(languages = []) {
  return languages.map((l) => `<p>${esc(l.name)}${l.level ? ` — ${esc(l.level)}` : ''}</p>`).join('\n');
}
function renderMpCenteredBody(data) {
  const parts = [];
  parts.push(`<h1>${esc(data.name)}</h1>`);
  if (data.title) parts.push(`<p><strong>${esc(data.title)}</strong></p>`);
  const contactLine = contactLineModern(data.contact);
  if (contactLine) parts.push(`<p>${contactLine}</p>`);
  if (data.summary) { parts.push('<h2>Professional Summary</h2>'); parts.push(`<p>${esc(data.summary)}</p>`); }
  if (data.experience?.length) { parts.push('<h2>Experience</h2>'); parts.push(modernExperienceHtml(data.experience)); }
  if (data.education?.length) { parts.push('<h2>Education</h2>'); parts.push(modernEducationHtml(data.education)); }
  if (data.projects?.length) { parts.push('<h2>Projects</h2>'); parts.push(modernProjectsHtml(data.projects)); }
  if (data.skills?.length) { parts.push('<h2>Skills</h2>'); parts.push(modernSkillsHtml(data.skills)); }
  if (data.certifications?.length) { parts.push('<h2>Certifications</h2>'); parts.push(modernCertsHtml(data.certifications)); }
  if (data.languages?.length) { parts.push('<h2>Languages</h2>'); parts.push(modernLanguagesHtml(data.languages)); }
  return parts.join('\n');
}

// Sidebar template — a real two-column HTML table (html-to-docx supports
// tables natively) so the sidebar/main-column structure survives into the
// .docx as a genuine two-column layout, not a linear reflow of it.
function renderMpSidebarBody(data) {
  const sidebarParts = [];
  const contactLine = contactLineModern(data.contact);
  if (contactLine) sidebarParts.push(`<p><strong>Contact</strong><br/>${contactLine.replace(/ \| /g, '<br/>')}</p>`);
  if (data.skills?.length) sidebarParts.push(`<p><strong>Skills</strong></p>${modernSkillsHtml(data.skills)}`);
  if (data.certifications?.length) sidebarParts.push(`<p><strong>Certifications</strong></p>${modernCertsHtml(data.certifications)}`);
  if (data.languages?.length) sidebarParts.push(`<p><strong>Languages</strong></p>${modernLanguagesHtml(data.languages)}`);

  const mainParts = [];
  if (data.summary) mainParts.push(`<h2>Professional Summary</h2><p>${esc(data.summary)}</p>`);
  if (data.experience?.length) mainParts.push(`<h2>Experience</h2>${modernExperienceHtml(data.experience)}`);
  if (data.education?.length) mainParts.push(`<h2>Education</h2>${modernEducationHtml(data.education)}`);
  if (data.projects?.length) mainParts.push(`<h2>Projects</h2>${modernProjectsHtml(data.projects)}`);

  return `
    <h1>${esc(data.name)}</h1>
    ${data.title ? `<p><strong>${esc(data.title)}</strong></p>` : ''}
    <table style="width:640px;border-collapse:collapse;">
      <tr>
        <td style="width:205px;vertical-align:top;padding-right:12px;">${sidebarParts.join('\n') || '<p></p>'}</td>
        <td style="width:435px;vertical-align:top;">${mainParts.join('\n') || '<p></p>'}</td>
      </tr>
    </table>
  `;
}

// Header band template — full-width header, then a genuine two-column
// table body matching its on-screen 1.5fr/1fr grid.
function renderMpHeaderBandBody(data) {
  const leftParts = [];
  if (data.experience?.length) leftParts.push(`<h2>Experience</h2>${modernExperienceHtml(data.experience)}`);
  if (data.projects?.length) leftParts.push(`<h2>Projects</h2>${modernProjectsHtml(data.projects)}`);

  const rightParts = [];
  if (data.education?.length) rightParts.push(`<h2>Education</h2>${modernEducationHtml(data.education)}`);
  if (data.skills?.length) rightParts.push(`<h2>Skills</h2>${modernSkillsHtml(data.skills)}`);
  if (data.certifications?.length) rightParts.push(`<h2>Certifications</h2>${modernCertsHtml(data.certifications)}`);
  if (data.languages?.length) rightParts.push(`<h2>Languages</h2>${modernLanguagesHtml(data.languages)}`);

  const contactLine = contactLineModern(data.contact);
  return `
    <h1>${esc(data.name)}</h1>
    ${data.title ? `<p><strong>${esc(data.title)}</strong></p>` : ''}
    ${contactLine ? `<p>${contactLine}</p>` : ''}
    ${data.summary ? `<h2>Professional Summary</h2><p>${esc(data.summary)}</p>` : ''}
    <table style="width:640px;border-collapse:collapse;">
      <tr>
        <td style="width:384px;vertical-align:top;padding-right:12px;">${leftParts.join('\n') || '<p></p>'}</td>
        <td style="width:256px;vertical-align:top;">${rightParts.join('\n') || '<p></p>'}</td>
      </tr>
    </table>
  `;
}

// data is whatever shape the caller already computed for the PDF export
// (resumeTemplates.js's useResumeData() output for classic/executive, or
// adaptToModernProfessionalData() output for the three mp* templates) —
// the exact same templateData already sent to /api/resume-pdf, so there
// is no separate data-adaptation step for the caller to get wrong.
export function renderResumeDocxHtml(templateKey, data) {
  if (templateKey === 'classic' || templateKey === 'executive') return renderLegacyBody(data);
  if (templateKey === 'mpSidebar') return renderMpSidebarBody(data);
  if (templateKey === 'mpHeaderBand') return renderMpHeaderBandBody(data);
  return renderMpCenteredBody(data);
}
