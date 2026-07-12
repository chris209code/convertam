export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

const NO_FABRICATION_RULE = `Critical rule: never invent employers, job titles, dates, responsibilities, numbers, or achievements that are not present in what the user actually provided. If a measurable result (a number, percentage, or quantity) would clearly strengthen a bullet point but wasn't given, do NOT make one up — instead insert a short bracketed placeholder like "[add a number, e.g. how many customers/day]" so the user can fill in the real figure themselves.`;

function buildBulletsPrompt({ careerLevel, targetRole, jobTitle, employer, whatYouDid, toolsUsed, problemsSolved, whoYouWorkedWith, improvements, numbers, supervised }) {
  return `You are an expert CV writer helping a ${careerLevel || 'job seeker'} targeting a "${targetRole || 'general'}" role turn their own rough notes about one job/role into 2-4 strong, professional CV bullet points.

${NO_FABRICATION_RULE}

Job title: ${jobTitle || '(not given)'}
Employer/Organization: ${employer || '(not given)'}
What they usually did day-to-day: ${whatYouDid || '(not given)'}
Tools, software, or equipment used: ${toolsUsed || '(not given)'}
Problems they solved: ${problemsSolved || '(not given)'}
Who/what they worked with (customers, students, machines, documents, teams): ${whoYouWorkedWith || '(not given)'}
Anything they improved: ${improvements || '(not given)'}
Any numbers, targets, percentages, or quantities they remember: ${numbers || '(not given)'}
Did they supervise or train anyone: ${supervised || '(not given)'}

Write 2-4 bullet points, each starting with a strong past-tense action verb, professional tone, no first-person pronouns. Return ONLY a JSON array of strings, nothing else.`;
}

function buildSummaryPrompt({ careerLevel, targetRole, experienceText, educationText, skillsText }) {
  return `You are an expert CV writer. Write a 2-4 sentence professional summary for a CV.

Career stage: ${careerLevel || 'not specified'}
Target role: ${targetRole || 'not specified'}
Work/volunteer/NYSC/internship experience (may be empty if none):
${experienceText || '(none provided)'}
Education:
${educationText || '(none provided)'}
Skills:
${skillsText || '(none provided)'}

${NO_FABRICATION_RULE}
If there is no work experience listed, do NOT invent any — write an honest entry-level summary built from education, transferable skills, and any NYSC/internship/volunteer experience given. Do not claim years of experience that were not stated.

Return ONLY the summary text, nothing else — no heading, no quotes, no markdown.`;
}

function buildSkillsPrompt({ targetRole, experienceText, educationText }) {
  return `Based on the target role and background below, suggest relevant CV skills, grouped into three categories: technical skills, tools/software, and professional (soft) skills. Only suggest skills that are plausible given the actual background provided — do not suggest anything wildly unrelated to what's described.

Target role: ${targetRole || 'not specified'}
Background:
${experienceText || ''}
${educationText || ''}

Return ONLY JSON matching the schema. Each array should have 4-8 short items. If a category genuinely doesn't apply, return an empty array for it.`;
}

function buildRefinePrompt({ text, modifier, context }) {
  const actionInstructions = {
    regenerate: 'Rewrite this with fresh wording, same meaning and same facts.',
    shorten: 'Make this noticeably shorter and punchier without losing the key facts.',
    strengthen: 'Make this sound more impactful and confident, using stronger action verbs, without inventing any new facts or numbers not already present.',
    formal: 'Rewrite this in a more formal, traditional CV tone.',
  };
  return `You are editing a piece of CV content. ${actionInstructions[modifier] || actionInstructions.regenerate}

${NO_FABRICATION_RULE}

Context (career/role, for tone only): ${context || 'general'}

Original text:
${text}

Return ONLY the revised text, nothing else. If the original was a list of bullet points (one per line), return the same number of lines in the same format.`;
}

function buildPolishPrompt({ resumeText }) {
  return `You are a senior CV reviewer. Review the following complete CV and identify specific, actionable issues — do not rewrite the whole thing, just point out what's weak and why.

Check for: clarity, grammar, repetition, weak or vague wording, missing sections, overly long bullet points, inconsistent verb tense, relevance to the stated target role, and basic ATS-friendliness (standard section headers, no tables/graphics-dependent content, consistent formatting).

CV content:
${resumeText}

Return ONLY JSON matching the schema. Score each dimension honestly based on what's actually there — do not default to high scores. Keep issue/suggestion text concise (1-2 sentences each). List at most 8 issues, prioritizing the most impactful ones.`;
}

const bulletsSchema = { type: 'ARRAY', items: { type: 'STRING' } };
const skillsSchema = {
  type: 'OBJECT',
  properties: {
    technical: { type: 'ARRAY', items: { type: 'STRING' } },
    tools: { type: 'ARRAY', items: { type: 'STRING' } },
    professional: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['technical', 'tools', 'professional'],
};
const polishSchema = {
  type: 'OBJECT',
  properties: {
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { section: { type: 'STRING' }, issue: { type: 'STRING' }, suggestion: { type: 'STRING' } },
        required: ['section', 'issue', 'suggestion'],
      },
    },
    score: {
      type: 'OBJECT',
      properties: {
        completeness: { type: 'NUMBER' }, clarity: { type: 'NUMBER' }, relevance: { type: 'NUMBER' },
        impact: { type: 'NUMBER' }, atsStructure: { type: 'NUMBER' },
      },
      required: ['completeness', 'clarity', 'relevance', 'impact', 'atsStructure'],
    },
  },
  required: ['issues', 'score'],
};

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This feature is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  const routeName = '/api/resume-ai';

  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === 'bullets') {
      const prompt = buildBulletsPrompt(payload);
      const { parsed, requestId } = await callGemini({ apiKey, toolName: 'resume-ai:bullets', routeName, parts: [{ text: prompt }], schema: bulletsSchema, inputSizeApprox: prompt.length });
      return Response.json({ bullets: parsed, requestId });
    }

    if (action === 'summary') {
      const prompt = buildSummaryPrompt(payload);
      const { raw, requestId } = await callGemini({ apiKey, toolName: 'resume-ai:summary', routeName, parts: [{ text: prompt }], inputSizeApprox: prompt.length });
      return Response.json({ summary: raw.trim(), requestId });
    }

    if (action === 'skills') {
      const prompt = buildSkillsPrompt(payload);
      const { parsed, requestId } = await callGemini({ apiKey, toolName: 'resume-ai:skills', routeName, parts: [{ text: prompt }], schema: skillsSchema, inputSizeApprox: prompt.length });
      return Response.json({ ...parsed, requestId });
    }

    if (action === 'refine') {
      const prompt = buildRefinePrompt(payload);
      const { raw, requestId } = await callGemini({ apiKey, toolName: 'resume-ai:refine', routeName, parts: [{ text: prompt }], inputSizeApprox: prompt.length });
      return Response.json({ text: raw.trim(), requestId });
    }

    if (action === 'polish') {
      const prompt = buildPolishPrompt(payload);
      const { parsed, requestId } = await callGemini({ apiKey, toolName: 'resume-ai:polish', routeName, parts: [{ text: prompt }], schema: polishSchema, inputSizeApprox: prompt.length });
      return Response.json({ ...parsed, requestId });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Resume AI error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category }, { status: 502 });
    }
    console.error('Resume AI error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
