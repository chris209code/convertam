export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { detectCvLeakage, stripCvLeakage } from '@/lib/cvValidation';

// OUTPUT A — the CV itself. Every field here must be finished, ready-to-send
// content only: no advice, no instructions, no reasoning, no placeholders.
// Kept in the exact shape the existing template-rendering pipeline
// (resumeTemplates.js) already expects — unchanged so PDF/DOCX-link/CV
// Builder handoff all keep working.
const cvFields = {
  name: { type: 'STRING' },
  title: { type: 'STRING' },
  email: { type: 'STRING' },
  phone: { type: 'STRING' },
  location: { type: 'STRING' },
  linkedin: { type: 'STRING' },
  summary: { type: 'STRING' },
  experience: {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        role: { type: 'STRING' },
        company: { type: 'STRING' },
        period: { type: 'STRING' },
        // Whether this role is ongoing (determined from period text like
        // "Present" / "Current" / "Till date" / "Ongoing" / a missing end
        // date) — drives which tense the responsibilities below must use.
        // Never assume based on array position; only the dates decide this.
        isCurrentRole: { type: 'BOOLEAN' },
        // Day-to-day duties only — present tense for the current role,
        // past tense for every previous role. Never a quantified result.
        responsibilities: { type: 'ARRAY', items: { type: 'STRING' } },
        // Quantified results, completed initiatives, recognition, or
        // measurable business impact — never a routine daily duty. Empty
        // array is correct when a role genuinely has no achievements.
        achievements: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['role', 'company', 'isCurrentRole', 'responsibilities', 'achievements'],
    },
  },
  education: {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        degree: { type: 'STRING' },
        institution: { type: 'STRING' },
        year: { type: 'STRING' },
      },
      required: ['degree', 'institution'],
    },
  },
  skills: { type: 'ARRAY', items: { type: 'STRING' } },
  certifications: { type: 'ARRAY', items: { type: 'STRING' } },
};

// OUTPUT B — the professional review. Never rendered as part of the CV;
// the workspace shows it in a completely separate panel/tab.
const reviewFields = {
  review: {
    type: 'OBJECT',
    properties: {
      atsScore: { type: 'NUMBER' },
      recruiterReadiness: { type: 'STRING' },
      strengths: { type: 'ARRAY', items: { type: 'STRING' } },
      weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
      missingAchievements: { type: 'ARRAY', items: { type: 'STRING' } },
      keywordsMatched: { type: 'ARRAY', items: { type: 'STRING' } },
      keywordsMissing: { type: 'ARRAY', items: { type: 'STRING' } },
      interviewReadiness: { type: 'STRING' },
      topImprovements: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['atsScore', 'recruiterReadiness', 'strengths', 'weaknesses', 'topImprovements'],
  },
  // Rewrite suggestions — each one is a fully-written, ready-to-insert
  // replacement, never an instruction. targetSection/targetIndex identify
  // exactly what in the CV a suggestion would replace if applied.
  suggestions: {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        targetSection: { type: 'STRING' }, // 'summary' | 'experience' | 'skills'
        targetIndex: { type: 'NUMBER' }, // experience array index; -1 when not applicable
        targetField: { type: 'STRING' }, // 'responsibilities' | 'achievements' — only when targetSection is 'experience'
        currentText: { type: 'STRING' },
        proposedRewrite: { type: 'STRING' },
        reason: { type: 'STRING' },
      },
      required: ['targetSection', 'targetIndex', 'targetField', 'currentText', 'proposedRewrite', 'reason'],
    },
  },
  warnings: { type: 'ARRAY', items: { type: 'STRING' } },
};

const cvSchema = {
  type: 'OBJECT',
  properties: { ...cvFields, ...reviewFields },
  required: ['name', 'title', 'summary', 'experience', 'skills', 'review', 'suggestions'],
};

function buildPrompt({ cvText, targetPosition, jobDescription }) {
  return `You are an experienced professional CV consultant — not a chatbot. A candidate has given you their current CV and the exact role they are applying for. Produce two completely separate things: (A) a stronger, more competitive, ATS-friendly, ready-to-send CV, and (B) a private consulting review that the candidate will see in a separate panel, never inside the CV itself. Return everything as one structured JSON object.

TARGET POSITION (drives tailoring — see title rule below for the one place it must NOT be used):
${targetPosition}

${jobDescription?.trim() ? `JOB DESCRIPTION / REQUIREMENTS (use this to tailor even more precisely — pull in its natural, relevant keywords without stuffing):\n${jobDescription.trim()}\n` : ''}

====================================================
ABSOLUTE RULE — NEVER FABRICATE
====================================================
Never invent employers, job titles, dates, certifications, degrees, licences, responsibilities the candidate never performed, KPIs, numbers, awards, software proficiency, leadership experience, or projects that are not already present in the CV below. You may rewrite what IS there into stronger, more professional language (e.g. "Checked production quality" -> "Performed routine production quality inspections, identified non-conformances, and supported compliance with GMP standards" is fine — it adds no new fact). Never add a specific number, percentage, or metric unless that figure already appears in the candidate's CV, or is directly and correctly calculable from figures that already appear (e.g. "reduced from 5,000 hl to 114 hl" makes a 97.7% reduction a valid, real calculation — but never invent a percentage when the underlying numbers aren't both present). If the CV is missing something that would meaningfully strengthen it, do NOT insert it into the CV — put it in "suggestions" instead (see below), so the candidate can confirm it themselves. When a statement sounds like an achievement but has no measurable outcome in the source CV, improve its wording (e.g. "Helped improve the quality process" -> "Contributed to improvements in the quality-control process") — never invent a number to make it sound quantified.

====================================================
CURRENT VS. PREVIOUS ROLE — DETERMINE STATUS FROM DATES
====================================================
For every experience entry, decide isCurrentRole from its actual dates/period text — indicators include "Present", "Current", "Till date", "To date", "Ongoing", or an end date that is clearly missing/open on a role that is obviously still active. Never assume the first (or most recent) entry is current just because of its position in the list — check its dates. If the dates are genuinely ambiguous, use your best judgement from context but default to treating a role as previous (past tense) unless there is a clear current-role indicator.

====================================================
RESPONSIBILITIES vs. ACHIEVEMENTS — SEPARATE, NEVER MIXED
====================================================
Every experience entry must split its content into two separate arrays — "responsibilities" (day-to-day duties) and "achievements" (results). Never blend a quantified result into a responsibility bullet, and never leave an achievement sitting among ordinary duties.

Achievement indicators — a bullet is an achievement, not a responsibility, when it contains any of: a measurable improvement, a percentage, cost savings, time savings, reduced losses, increased output or accuracy, reduced defects or blocked stock, audit results, an award or recognition, a successfully completed project or implementation, a problem solved with a stated outcome, exceeded targets, improved compliance or turnaround time, or a stated team/process impact.
Example: "Reduced blocked stock from 5,000 hl to 114 hl." is an achievement, not a responsibility. "Conducted quality checks on packaged products." is a responsibility.

TENSE — tied to isCurrentRole, applied independently to each array:
- Current role: responsibilities in present tense (Manage, Lead, Monitor, Coordinate, Analyse, Ensure, Maintain, Support, Drive, Oversee...) UNLESS a specific bullet clearly describes a one-off completed initiative rather than an ongoing duty, in which case it belongs in "achievements" instead, described in past/result wording (e.g. a current QA manager who ran one specific completed audit still writes that as an achievement in past tense, while their ongoing daily oversight stays present tense).
- Previous role: both responsibilities and achievements in past tense (Managed, Led, Improved, Reduced, Coordinated, Implemented, Achieved, Delivered...).
Do not rewrite an ongoing current-role duty into the past tense, and do not leave a previous role's duties in the present tense.

AMBIGUOUS BULLETS — SPLIT WHEN A DUTY AND A RESULT ARE COMBINED
If a single bullet from the source CV contains both an ongoing duty and a measurable result, split it: the duty portion becomes a responsibility, the result portion becomes an achievement. Example — source: "Managed blocked stock and reduced the volume from 5,000 hl to 114 hl." becomes responsibility "Manage blocked-stock review, disposition and stakeholder follow-up." plus achievement "Reduced blocked stock from 5,000 hl to 114 hl, representing a 97.7% reduction." (only include a computed percentage when it is mathematically valid from numbers already given).

Do not duplicate the same fact in both arrays — each real fact from the source CV appears exactly once, in whichever array actually describes it.

====================================================
PROFESSIONAL TITLE RULES (the "title" field)
====================================================
The title is the candidate's professional identity line, shown directly under their name. It must NEVER be the target job title with "Applicant" tacked on, and must NEVER contain the words: Applicant, Candidate, Seeking, Applying For, Looking For, or Job Seeker. Wrong: "Packaging Technical Trainee Applicant", "Quality Assurance Applicant", "Production Manager Applicant".

Instead, generate a polished professional identity based on the candidate's CURRENT or MOST RECENT position, elevated into confident, natural title language. Examples of the transformation:
- Packaging Laboratory Specialist -> Packaging Quality Specialist
- Laboratory Technician -> Quality Assurance Professional
- Quality Assurance Lead -> Quality Assurance & Process Improvement Specialist
- Production Supervisor -> Production Operations Specialist

The target position may ONLY be used to tailor the Professional Summary, Skills, and Experience wording — never to replace or appear directly in the title line itself. If the candidate has little or no work experience, generate a suitable entry-level professional title instead (e.g. "Aspiring Quality Assurance Professional", "Entry-Level Production Technician") rather than leaving it blank or using the target title.

====================================================
HOW TO IMPROVE THE CV (Output A)
====================================================
- Strengthen the professional summary and tailor it toward the target position (language and emphasis only — see title rule above).
- Rewrite weak, passive responsibility statements into stronger professional language while keeping them as responsibilities — see the section below for exactly how responsibilities and achievements must be classified, tensed, and kept separate; never blend the two into one merged statement.
- Highlight transferable skills relevant to the target position.
- Improve action verbs and overall wording.
- Prioritize and, where beneficial, reorder content so the most relevant experience for this role stands out.
- Strengthen measurable achievements ONLY where the underlying numbers already exist in the source CV.
- Use standard CV section headings, and naturally weave in keywords from the target position and job description for stronger ATS compatibility — never keyword-stuff, never sacrifice readability.
- Include ALL experience entries, ALL education entries, ALL skills from the original — do not truncate, drop, or cut anything off.
- Extract and use ONLY real information already in the CV — names, contacts, companies, dates. If something is missing, omit that field entirely or use an empty string. Never invent placeholders like "[Your Name]" or "[Company Name]" — a placeholder left in a document meant to be sent to an employer is a serious defect.
- Do not unnecessarily redesign the CV's substance — preserve company names, job titles, dates, and qualifications exactly; only improve classification (responsibility vs. achievement), tense, wording, clarity, and impact.

====================================================
WHAT MUST NEVER APPEAR ANYWHERE IN THE CV FIELDS (name, title, summary, experience responsibilities/achievements, skills, certifications)
====================================================
The CV fields must contain ONLY finished, professional, ready-to-send content. NEVER include, anywhere in those fields: AI suggestions, AI reasoning, editing notes, recommendations, prompt instructions, ATS explanations, bracketed placeholders, or any sentence that reads as an instruction addressed to the candidate rather than a statement of fact about their work — for example sentences beginning with "Consider...", "Elaborate on...", "Mention...", "Include...", "Quantify...", "Provide...", "Insert...", "Add...", "Expand on...", or "Explain...". Advice and suggestions belong ONLY in the "suggestions" and "review" fields below, never inside the CV itself. The finished CV must never reveal that AI generated or edited it.

====================================================
THE PROFESSIONAL REVIEW (Output B — the "review" field, never part of the CV)
====================================================
- atsScore: your honest estimate (0-100) of how well this CV would parse and rank in an Applicant Tracking System for the target position.
- recruiterReadiness: one short label describing overall readiness (e.g. "Strong", "Needs Work", "Excellent", "Not Ready Yet").
- strengths: genuine strengths of this CV for this specific role.
- weaknesses: genuine weaknesses or gaps.
- missingAchievements: specific things a strong version of this CV would ideally include but this one doesn't yet (e.g. "No quantified results in the most recent role") — describe the gap, do not invent a fake achievement to fill it.
- keywordsMatched: real keywords from the target position / job description that ARE already reflected in the improved CV.
- keywordsMissing: real, relevant keywords from the target position / job description that are NOT yet reflected.
- interviewReadiness: one short assessment of how ready this candidate likely is for an interview based on what's on the CV.
- topImprovements: a short list of concrete improvements you actually made to the CV (plain, specific sentences — not generic praise).
Do not invent a fabricated-sounding false-precision score presented as fact from a real scoring algorithm — atsScore is your qualitative estimate, treat it and present it as such.

====================================================
SUGGESTIONS (the "suggestions" field — separate, optional rewrites the candidate can choose to apply)
====================================================
Each suggestion is a fully-written, ready-to-insert REPLACEMENT for a specific piece of the CV — never an instruction telling the candidate what to do. Wrong: proposedRewrite = "Elaborate on instrumentation and control." Correct: proposedRewrite = a complete, polished sentence or bullet that actually elaborates on instrumentation and control, using only real facts already present elsewhere in the CV, ready to be inserted as-is.
- targetSection: "summary" (rewrite of the whole summary), "experience" (a bullet within one experience entry), or "skills" (an addition to the skills list).
- targetIndex: for "experience", the 0-based index into the experience array this suggestion targets; use -1 for "summary" and "skills".
- targetField: for "experience", whether the bullet lives in "responsibilities" or "achievements" (must match wherever currentText actually is, so applying it edits the right list); use "" for "summary" and "skills".
- currentText: the exact current text this would replace (empty string if it's a pure addition, like a new bullet or skill, rather than a replacement).
- proposedRewrite: the complete, ready-to-insert replacement or addition text — finished CV prose, never an instruction.
- reason: a short explanation of why this would strengthen the CV — this is shown to the candidate alongside the rewrite, it never appears in the CV itself.
Only propose suggestions genuinely worth making — an empty array is correct if the CV is already strong.

CANDIDATE'S CURRENT CV:
${cvText}`;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }
  try {
    const { cvText, targetPosition, jobDescription } = await request.json();
    if (!cvText?.trim()) {
      return Response.json({ error: 'No CV text provided.' }, { status: 400 });
    }
    if (!targetPosition?.trim()) {
      return Response.json({ error: 'Please enter the position you want your CV optimized for.' }, { status: 400 });
    }

    const prompt = buildPrompt({ cvText, targetPosition, jobDescription });
    let { parsed } = await callGemini({ apiKey, toolName: 'cv-improver', routeName: '/api/cv-improver', parts: [{ text: prompt }], schema: cvSchema, maxOutputTokens: 65536, inputSizeApprox: prompt.length });

    // Final quality check (defense in depth — the prompt above already asks
    // for this, this is what guarantees it before anything reaches the
    // candidate). If leakage is found, regenerate once with the exact
    // issues called out; if it still isn't clean, deterministically strip
    // the offending sentences as a last resort rather than ever shipping
    // AI-instruction text inside a document meant to be sent to an employer.
    let leakage = detectCvLeakage(parsed);
    if (!leakage.clean) {
      const correctivePrompt = `${prompt}\n\n====================================================\nCORRECTION REQUIRED\n====================================================\nYour previous attempt at this task left the following problems inside the CV fields (not the review — the CV itself): ${leakage.issues.join('; ')}. Regenerate the complete JSON object again, fixing every one of these — the CV fields must contain only finished, ready-to-send professional content with no instructions, placeholders, or banned title words.`;
      const retry = await callGemini({ apiKey, toolName: 'cv-improver-correction', routeName: '/api/cv-improver', parts: [{ text: correctivePrompt }], schema: cvSchema, maxOutputTokens: 65536, inputSizeApprox: correctivePrompt.length });
      parsed = retry.parsed;
      leakage = detectCvLeakage(parsed);
      if (!leakage.clean) {
        parsed = stripCvLeakage(parsed);
        parsed.warnings = [...(parsed.warnings || []), 'Some AI-generated text was automatically removed from your CV during a final quality check. Please review the result carefully.'];
      }
    }

    return Response.json({ structured: parsed });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`CV improver error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('CV improver error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
