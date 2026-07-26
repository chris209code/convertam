export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { detectLinkedInLeakage, stripLinkedInLeakage } from '@/lib/linkedinValidation';

const SECTION_KEYS = ['headline', 'about', 'experience', 'skills'];

const SECTION_LABELS = {
  headline: 'Headline',
  about: 'About',
  experience: 'Experience',
  skills: 'Skills',
};

// One combined call handles every section the candidate asked to optimize —
// never one request per section — so choosing "Optimize Entire Profile"
// costs exactly one AI call, not four.
function buildSchema(sections) {
  const properties = {};
  sections.forEach((key) => {
    properties[key] = {
      type: 'OBJECT',
      properties: {
        improved: { type: 'STRING' },
        reasoning: { type: 'STRING' },
      },
      required: ['improved', 'reasoning'],
    };
  });
  return { type: 'OBJECT', properties, required: sections };
}

const SECTION_INSTRUCTIONS = {
  headline: 'HEADLINE: Rewrite as a single concise line (LinkedIn\'s limit is 220 characters) that states the candidate\'s professional identity and value, naturally weaving in the most relevant keywords for the target role. Not a sentence with a period — a punchy professional headline (e.g. "Quality Assurance Manager | Food Safety & Compliance | Process Improvement Specialist"). Never invent a job title, seniority level, or specialism the candidate hasn\'t demonstrated in what they gave you.',
  about: 'ABOUT: Rewrite as an engaging, first-person "About" section (roughly 3-5 short paragraphs) that highlights real strengths and experience already present in what the candidate gave you, naturally including relevant keywords for the target role. Never invent employers, roles, metrics, or accomplishments not already stated.',
  experience: 'EXPERIENCE: Rewrite the wording of the experience descriptions to be more impactful and keyword-rich. Preserve every company name, job title, and date EXACTLY as given — never alter, invent, or omit one. Only improve how existing duties and results are described; never invent a new role, promotion, employer, or achievement.',
  skills: 'SKILLS: Rewrite the skills list using clearer, more standard, more keyword-optimized terminology, and reorder so the most relevant skills for the target role come first. You may rephrase a skill into its more standard industry name (e.g. "Excel" -> "Microsoft Excel") but never add a skill that has no basis in the skills or experience the candidate gave you.',
};

function buildPrompt({ sections, profile, targetRole, industry, jobDescription }) {
  const contextLines = [];
  if (targetRole?.trim()) contextLines.push(`Target role: ${targetRole.trim()}`);
  if (industry?.trim()) contextLines.push(`Industry: ${industry.trim()}`);
  if (jobDescription?.trim()) contextLines.push(`Job description / requirements to tailor toward:\n${jobDescription.trim()}`);

  const sectionBlocks = sections.map((key) => `--- ${SECTION_LABELS[key].toUpperCase()} (current text) ---\n${profile[key]}\n\n${SECTION_INSTRUCTIONS[key]}`).join('\n\n');

  return `You are an expert LinkedIn profile writer helping a real candidate strengthen their profile ahead of a job search. You are given their CURRENT profile section(s) below. Rewrite ONLY the section(s) provided, and return a JSON object with one key per section requested (${sections.join(', ')}), each containing "improved" (the rewritten text) and "reasoning" (a short, specific explanation of what you changed and why — shown to the candidate alongside the rewrite, never inside the profile text itself).

${contextLines.length ? `${contextLines.join('\n')}\n` : ''}
====================================================
ABSOLUTE RULE — NEVER FABRICATE
====================================================
Never invent companies, job titles, employment dates, promotions, certifications, degrees, awards, metrics, or achievements that are not already present in what the candidate gave you below. You may rewrite what IS there into stronger, clearer, more keyword-rich language — that is the entire job. Only improve wording, structure, and keyword optimization; never add a new fact.

====================================================
SECTION-SPECIFIC INSTRUCTIONS
====================================================
${sectionBlocks}

====================================================
WHAT MUST NEVER APPEAR IN ANY "improved" FIELD
====================================================
Each "improved" field must contain ONLY finished, ready-to-publish profile text. Never include AI suggestions, editing notes, or instruction-style sentences addressed to the candidate (e.g. starting with "Consider...", "Add...", "Include...", "Mention...") and never a bracketed placeholder like "[Company Name]". All commentary belongs ONLY in the "reasoning" field.`;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }
  try {
    const { sections, profile, targetRole, industry, jobDescription } = await request.json();
    const requestedSections = (sections || []).filter((s) => SECTION_KEYS.includes(s) && profile?.[s]?.trim());
    if (requestedSections.length === 0) {
      return Response.json({ error: 'Please provide text for at least one section you want optimized.' }, { status: 400 });
    }

    const schema = buildSchema(requestedSections);
    const prompt = buildPrompt({ sections: requestedSections, profile, targetRole, industry, jobDescription });
    let { parsed } = await callGemini({ apiKey, toolName: 'linkedin-optimizer', routeName: '/api/linkedin-optimizer', parts: [{ text: prompt }], schema, maxOutputTokens: 8192, inputSizeApprox: prompt.length });

    // Same defense-in-depth pattern as CV Improver: regenerate once with the
    // exact problems called out, then deterministically strip as a last
    // resort — a published LinkedIn profile should never carry AI leftovers.
    let leakage = detectLinkedInLeakage(parsed);
    if (!leakage.clean) {
      const correctivePrompt = `${prompt}\n\n====================================================\nCORRECTION REQUIRED\n====================================================\nYour previous attempt left the following problems inside the "improved" fields: ${leakage.issues.join('; ')}. Regenerate the complete JSON object again, fixing every one of these.`;
      const retry = await callGemini({ apiKey, toolName: 'linkedin-optimizer-correction', routeName: '/api/linkedin-optimizer', parts: [{ text: correctivePrompt }], schema, maxOutputTokens: 8192, inputSizeApprox: correctivePrompt.length });
      parsed = retry.parsed;
      leakage = detectLinkedInLeakage(parsed);
      if (!leakage.clean) {
        parsed = stripLinkedInLeakage(parsed);
      }
    }

    return Response.json({ results: parsed });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`LinkedIn optimizer error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('LinkedIn optimizer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
