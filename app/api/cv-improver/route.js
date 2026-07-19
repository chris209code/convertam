export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

// The resume fields (name/title/.../certifications) keep the exact shape the
// existing template-rendering pipeline (resumeTemplates.js) already expects
// — unchanged so PDF/DOCX-link/CV-Builder handoff all keep working. The rest
// is the new "CV consultant" layer: improvements made, additions that need
// the user's confirmation before entering the CV, and a job-match summary.
const cvSchema = {
  type: 'OBJECT',
  properties: {
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
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['role', 'company', 'bullets'],
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

    improvementsMade: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestedAdditions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          suggestion: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['suggestion', 'reason'],
      },
    },
    jobMatchSummary: {
      type: 'OBJECT',
      properties: {
        targetPosition: { type: 'STRING' },
        strongMatches: { type: 'ARRAY', items: { type: 'STRING' } },
        gaps: { type: 'ARRAY', items: { type: 'STRING' } },
        recommendedAdditions: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['strongMatches', 'gaps', 'recommendedAdditions'],
    },
    keywordsUsed: { type: 'ARRAY', items: { type: 'STRING' } },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['name', 'summary', 'experience', 'skills', 'improvementsMade', 'suggestedAdditions', 'jobMatchSummary'],
};

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

    const prompt = `You are an experienced professional CV consultant. A candidate has given you their current CV and the exact role they are applying for. Produce a stronger, more competitive, ATS-friendly version of their CV — tailored specifically to that role — plus a short consulting report. Return everything as one structured JSON object.

TARGET POSITION (this must drive the whole optimization):
${targetPosition}

${jobDescription?.trim() ? `JOB DESCRIPTION / REQUIREMENTS (use this to tailor even more precisely — pull in its natural, relevant keywords without stuffing):\n${jobDescription.trim()}\n` : ''}

ABSOLUTE RULE — NEVER FABRICATE:
Never invent employers, job titles, dates, certifications, degrees, licences, responsibilities the candidate never performed, KPIs, numbers, awards, software proficiency, leadership experience, or projects that are not already present in the CV below. You may rewrite what IS there into stronger, more professional language (e.g. "Checked production quality" -> "Performed routine production quality inspections, identified non-conformances, and supported compliance with GMP standards" is fine — it does not add any new fact). But you must NEVER add a specific number, percentage, or metric (e.g. "reduced defects by 35%") unless that figure already appears in the candidate's CV. If you believe the CV is missing something that would meaningfully strengthen it for this role, do NOT insert it — put it in suggestedAdditions instead, so the candidate can confirm it themselves.

HOW TO IMPROVE THE CV:
- Strengthen the professional summary and tailor it toward the target position
- Rewrite weak, passive responsibility statements into stronger professional achievement statements (using only real, existing facts)
- Highlight transferable skills relevant to the target position
- Improve action verbs and overall wording
- Prioritize and, where beneficial, reorder content so the most relevant experience for this role stands out
- Strengthen measurable achievements ONLY where the underlying numbers already exist in the source CV
- Improve readability and recruiter appeal
- Use standard CV section headings, and naturally weave in keywords from the target position and job description for stronger ATS compatibility — never keyword-stuff, and never sacrifice readability for keywords
- Include ALL experience entries, ALL education entries, ALL skills from the original — do not truncate, drop, or cut anything off. Return the complete CV.
- Extract and use ONLY real information already in the CV — names, contacts, companies, dates. If something is missing, omit that field entirely or use an empty string. Never invent placeholders like [Your Name].

ALSO RETURN:
- improvementsMade: a short list of concrete improvements you actually made (plain, specific sentences — not generic praise)
- suggestedAdditions: things that would strengthen this CV for the target position but are NOT already in it, each as {suggestion, reason}. These must NEVER be merged into the CV itself — they are for the candidate to confirm.
- jobMatchSummary: {targetPosition, strongMatches (skills/experience from the CV that genuinely align with the target position), gaps (areas the CV doesn't yet cover for this role), recommendedAdditions (short actionable suggestions, e.g. "Mention team size supervised")}. Do not invent a percentage match score — there is no scoring algorithm, so never state something like "92% match".
- keywordsUsed: the real keywords from the target position / job description that you naturally worked into the improved CV
- warnings: anything worth flagging to the candidate (e.g. the CV seems very short, or a section seems missing) — empty array if nothing to flag

CANDIDATE'S CURRENT CV:
${cvText}`;

    const { raw, parsed } = await callGemini({ apiKey, toolName: 'cv-improver', routeName: '/api/cv-improver', parts: [{ text: prompt }], schema: cvSchema, maxOutputTokens: 65536, inputSizeApprox: prompt.length });
    return Response.json({ improved: raw, structured: parsed });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`CV improver error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('CV improver error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
