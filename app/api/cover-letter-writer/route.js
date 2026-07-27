export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { validateCoverLetter } from '@/lib/cvValidation';
import { researchCompany } from '@/lib/companyResearch';

function buildPrompt({ yourName, jobTitle, companyName, background, jobDescription, tone, companyResearchText }) {
  const hasRole = !!jobTitle?.trim();
  const hasCompany = !!companyName?.trim();
  const targetLine = (hasRole || hasCompany)
    ? `Job title applying for: ${hasRole ? jobTitle : '(not specified — write generally about fit for this type of role, do not invent a title)'}\nCompany: ${hasCompany ? companyName : '(not specified — do not invent a company name; use "Dear Hiring Manager," and keep the letter company-agnostic)'}`
    : 'No specific job title or company was given — write a strong, general cover letter that showcases the candidate\'s background and could reasonably be sent to any employer in their field. Do not invent a job title or company name.';

  const companySection = companyResearchText?.trim()
    ? `\nADDITIONAL COMPANY INFORMATION (fetched from the company's own website — real, not invented):\n${companyResearchText.trim()}\n`
    : '';

  return `You are an expert career writer and hiring consultant. Write a complete, ready-to-send cover letter for the following applicant.

Candidate name: ${yourName || '(not provided — omit a signature name or use "Sincerely," with no name)'}
${targetLine}
Tone: ${tone}

Candidate's background, experience, and skills (use only real information from this — never invent specific employers, dates, or achievements not mentioned here):
${background}

${jobDescription ? `Job description to tailor the letter against:\n${jobDescription}` : 'No job description was provided — write a strong general letter for this role based on the background given.'}
${companySection}
====================================================
PHILOSOPHY — THIS IS NOT A REWRITTEN CV
====================================================
A cover letter's job is to persuade, not to summarize. Never rewrite the candidate's background into narrative form or walk through it chronologically like a CV — that is the single most common failure mode to avoid. Instead:
- Pick only the ONE or TWO strongest, most relevant examples from the candidate's background — the ones that most directly support their fit for this specific role. Ignore the rest; do not try to mention everything.
- Explicitly connect those examples to what the employer actually needs (from the job description, if given).
- Make the case for WHY this candidate is a strong fit — not just what they have done, but why it matters for this role.
- Make the case for WHY they want to work at THIS company specifically, not just "this type of role" — this is where genuine research (see company information rules below) earns its place, and where a generic letter would say nothing at all.
- Every sentence should be doing persuasive work. Cut anything that reads like a list of facts rather than an argument for hiring this candidate.

====================================================
USING COMPANY INFORMATION (only if given above)
====================================================
${companyResearchText?.trim() ? `- If the job description above already genuinely describes the company's mission, values, or culture, prefer that over the fetched information below — don't cite both for the same point.
- Weave in ONE, at most TWO, specific points from the ADDITIONAL COMPANY INFORMATION above — a real value, mission statement, or focus area — naturally into a sentence that connects it to the candidate's own experience or motivation. Example: "Your emphasis on [specific real value] resonates with how I've approached [specific real thing from the candidate's background]."
- Never turn the letter into a summary of the company's website. It should read as one genuine, well-chosen observation, not a recitation of facts about the employer.
- Only state something about the company that is actually present in the information given above or in the job description — never invent a mission, value, or fact about this employer that isn't there.` : `- No verified information about this company's mission, values, or culture was found (or none was needed to check). Do NOT invent, guess, or assume anything about the company's values, culture, mission, or "why work here" — write a strong, genuinely persuasive letter based entirely on the candidate's fit for the role and what's in the job description, without fabricating anything about the employer itself.`}

Requirements:
- Write in first person, as the candidate.
- A proper greeting, an introduction, 1-2 body paragraphs, and a full closing paragraph with a professional sign-off — a complete letter with a clear beginning, middle, and end, never cut short.
- Match the requested tone (${tone}) throughout.
- Do not use generic filler like "I am writing to express my interest" as the very first sentence — open with something more specific and engaging.
- Do not invent facts, employers, numbers, or achievements that are not present in the background provided, and do not invent anything about the employer that isn't given to you above.
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

// A job description that already reads like it includes the employer's own
// "about us" copy is a strong signal the AI already has genuine company
// context to work with — skip the extra website fetch entirely rather than
// doing a lookup nobody needs.
const COMPANY_CONTEXT_HINTS = /\b(our mission|our values|about us|who we are|our culture|founded in|we believe|our vision)\b/i;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' },
      { status: 500 }
    );
  }
  try {
    const { yourName, jobTitle, companyName, background, jobDescription, tone, companyUrl, cachedCompanyResearch } = await request.json();
    if (!background?.trim()) {
      return Response.json({ error: 'Please add your background, experience, and skills first.' }, { status: 400 });
    }

    // Company research is best-effort enrichment only — never required, and
    // never allowed to fail the request. Skipped entirely when: a cached
    // result from an earlier generation this session is already available,
    // or the job description already contains genuine company context, or
    // neither a company name nor a verified company URL was given.
    let companyResearchResult = null;
    if (cachedCompanyResearch?.trim()) {
      companyResearchResult = { text: cachedCompanyResearch.trim(), sourceUrls: [] };
    } else if (!COMPANY_CONTEXT_HINTS.test(jobDescription || '') && (companyName?.trim() || companyUrl?.trim())) {
      try {
        companyResearchResult = await researchCompany({ companyName, companyUrl });
      } catch {
        companyResearchResult = null; // enrichment only — never blocks generation
      }
    }

    // Job title and company are both optional — a general cover letter
    // works fine without either; buildPrompt() below adapts its framing
    // when they're missing rather than inventing a role or employer.
    const promptOpts = { yourName, jobTitle, companyName, background, jobDescription, tone: tone || 'Professional', companyResearchText: companyResearchResult?.text };

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

    // companyResearchText is handed back so the client can stash it in the
    // Career Session — a later regenerate (or Cover Letter Writer reopened
    // from the same session) reuses it via cachedCompanyResearch instead of
    // re-fetching the company's site for identical information.
    return Response.json({ letter, companyResearchText: companyResearchResult?.text || null });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Cover letter writer error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Cover letter writer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
