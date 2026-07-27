export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { validateCoverLetter } from '@/lib/cvValidation';

function buildPrompt({ yourName, jobTitle, companyName, background, jobDescription, tone }) {
  const hasRole = !!jobTitle?.trim();
  const hasCompany = !!companyName?.trim();
  const targetLine = (hasRole || hasCompany)
    ? `Job title applying for: ${hasRole ? jobTitle : '(not specified — write generally about fit for this type of role, do not invent a title)'}\nCompany: ${hasCompany ? companyName : '(not specified — do not invent a company name; use "Dear Hiring Manager," and keep the letter company-agnostic)'}`
    : 'No specific job title or company was given — write a strong, general cover letter that showcases the candidate\'s background and could reasonably be sent to any employer in their field. Do not invent a job title or company name.';

  return `You are an expert career writer. Write a complete, ready-to-send cover letter for the following applicant.

Candidate name: ${yourName || '(not provided — omit a signature name or use "Sincerely," with no name)'}
${targetLine}
Tone: ${tone}

Candidate's background, experience, and skills (use only real information from this — never invent specific employers, dates, or achievements not mentioned here):
${background}

${jobDescription ? `Job description to tailor the letter against:\n${jobDescription}` : 'No job description was provided — write a strong general letter for this role based on the background given.'}

Requirements:
- Write in first person, as the candidate.
- A proper greeting, an introduction, 1-2 body paragraphs, and a full closing paragraph with a professional sign-off — a complete letter with a clear beginning, middle, and end, never cut short.
- Match the requested tone (${tone}) throughout.
- Do not use generic filler like "I am writing to express my interest" as the very first sentence — open with something more specific and engaging.
- Do not invent facts, employers, numbers, or achievements that are not present in the background provided.
- Do not include a date, address block, or letterhead — just the greeting, body, and sign-off, since this will be placed into a template.
- Start with "Dear Hiring Manager," (or a more specific greeting if a name is evident).
- The closing paragraph must thank the reader for their time and consideration and express interest in discussing the role further, then end with a full sign-off — something in the spirit of: "Thank you for your time and consideration. I look forward to the opportunity to discuss how my skills and experience can contribute to your organisation.\\n\\nYours sincerely,\\n${yourName || '[Name]'}"
- NEVER stop mid-sentence and NEVER stop mid-paragraph. The letter must always end with a complete final sentence, a full sign-off, and the candidate's name (when provided) — never trail off.
- Return ONLY the plain text of the letter itself, nothing else — no headers, no explanations, no markdown formatting.`;
}

async function generateLetter({ apiKey, promptOpts, toolName, maxOutputTokens }) {
  const prompt = buildPrompt(promptOpts);
  const { raw } = await callGemini({ apiKey, toolName, routeName: '/api/cover-letter-writer', parts: [{ text: prompt }], maxOutputTokens, inputSizeApprox: prompt.length });
  return raw.trim();
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' },
      { status: 500 }
    );
  }
  try {
    const { yourName, jobTitle, companyName, background, jobDescription, tone } = await request.json();
    if (!background?.trim()) {
      return Response.json({ error: 'Please add your background, experience, and skills first.' }, { status: 400 });
    }
    // Job title and company are both optional — a general cover letter
    // works fine without either; buildPrompt() below adapts its framing
    // when they're missing rather than inventing a role or employer.
    const promptOpts = { yourName, jobTitle, companyName, background, jobDescription, tone: tone || 'Professional' };

    // 4096 tokens gives a generous margin over what a 3-4 paragraph letter
    // actually needs — the previous 2048 cap was the likely cause of
    // letters getting cut off before the closing paragraph and sign-off.
    let letter = await generateLetter({ apiKey, promptOpts, toolName: 'cover-letter-writer', maxOutputTokens: 4096 });
    let check = validateCoverLetter(letter);

    // Final quality check: if the letter still looks incomplete (no
    // sign-off, trails off mid-sentence, too short), regenerate once with
    // the exact problems called out before ever showing it to the user.
    if (!check.complete) {
      const correctivePrompt = { ...promptOpts, background: `${background}\n\n(Your previous attempt at this letter was incomplete: ${check.issues.join('; ')}. Write the full letter again from the start, all the way through a complete closing paragraph and sign-off — do not stop early.)` };
      letter = await generateLetter({ apiKey, promptOpts: correctivePrompt, toolName: 'cover-letter-writer-correction', maxOutputTokens: 4096 });
      check = validateCoverLetter(letter);
    }

    // Last-resort fallback: if it's still missing a sign-off after the
    // retry, append a safe, generic closing rather than ever showing the
    // user a letter that trails off with nothing after it.
    if (!check.complete && !/\b(sincerely|regards)\b/i.test(letter)) {
      const trimmed = letter.replace(/\s+$/, '');
      const needsPeriod = !/[.!?]$/.test(trimmed);
      letter = `${trimmed}${needsPeriod ? '.' : ''}\n\nThank you for your time and consideration. I look forward to the opportunity to discuss how my skills and experience can contribute to your organisation.\n\nYours sincerely,\n${yourName || ''}`.trim();
    }

    return Response.json({ letter });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Cover letter writer error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Cover letter writer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
