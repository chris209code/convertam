export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

// Enforces the exact shape the prompt asks for.
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
  },
  required: ['name', 'summary', 'experience', 'skills'],
};

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }
  try {
    const { cvText, jobTitle } = await request.json();
    if (!cvText?.trim()) {
      return Response.json({ error: 'No CV text provided.' }, { status: 400 });
    }
    const prompt = `You are a professional CV writer. Improve the CV below and return it as a structured JSON object.

STRICT RULES:
- Extract and use ONLY real information from the CV — names, contacts, companies, dates, achievements
- NEVER invent placeholders like [Your Name] or [Your Email]
- If something is missing, omit that field entirely or use an empty string
- Improve language, use strong action verbs, fix grammar and spelling
- Make it ATS-friendly and professional
- Include ALL experience entries, ALL education entries, ALL skills — do not truncate or cut off
- Return the complete CV — never stop mid-way
${jobTitle ? `- Optimize for the role: ${jobTitle}` : ''}

CV TO IMPROVE:
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
