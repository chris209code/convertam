export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt({ yourName, jobTitle, companyName, background, jobDescription, tone }) {
  return `You are an expert career writer. Write a complete, ready-to-send cover letter for the following applicant.

Candidate name: ${yourName || '(not provided — omit a signature name or use "Sincerely," with no name)'}
Job title applying for: ${jobTitle}
Company: ${companyName}
Tone: ${tone}

Candidate's background, experience, and skills (use only real information from this — never invent specific employers, dates, or achievements not mentioned here):
${background}

${jobDescription ? `Job description to tailor the letter against:\n${jobDescription}` : 'No job description was provided — write a strong general letter for this role based on the background given.'}

Requirements:
- Write in first person, as the candidate.
- 3-4 paragraphs: an opening that names the role and shows genuine interest, 1-2 middle paragraphs connecting the candidate's real background to what the role/company needs, and a confident closing paragraph with a call to action.
- Match the requested tone (${tone}) throughout.
- Do not use generic filler like "I am writing to express my interest" as the very first sentence — open with something more specific and engaging.
- Do not invent facts, employers, numbers, or achievements that are not present in the background provided.
- Do not include a date, address block, or letterhead — just the greeting, body, and sign-off, since this will be placed into a template.
- Start with "Dear Hiring Manager," (or a more specific greeting if a name is evident) and end with a sign-off ("Sincerely," or similar) followed by the candidate's name if provided.
- Return ONLY the plain text of the letter itself, nothing else — no headers, no explanations, no markdown formatting.`;
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Retries transient failures automatically (rate limits, momentary server
// errors, network blips) before ever showing the user an error — same fix
// applied across every AI route on the site after this exact failure mode
// surfaced mid-demo. No JSON parsing here since this route returns plain
// text, so the retry logic is simpler than the JSON-producing routes.
async function callGeminiForLetter(apiKey, prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048 },
  };
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(`Gemini cover letter error (attempt ${attempt}/${maxAttempts}):`, data);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('gemini_error');
      }

      const letter = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!letter) {
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('empty_response');
      }
      return letter;
    } catch (err) {
      lastError = err;
      const isKnownFinalError = err.message === 'gemini_error' || err.message === 'empty_response';
      if (!isKnownFinalError && attempt < maxAttempts) { await sleep(700 * attempt); continue; } // network-level failure — also worth retrying
      if (attempt === maxAttempts) throw lastError;
    }
  }
  throw lastError;
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
    if (!jobTitle || !companyName || !background) {
      return Response.json({ error: 'Job title, company name, and background are required.' }, { status: 400 });
    }
    const prompt = buildPrompt({ yourName, jobTitle, companyName, background, jobDescription, tone: tone || 'Professional' });
    const letter = await callGeminiForLetter(apiKey, prompt);
    return Response.json({ letter: letter.trim() });
  } catch (err) {
    console.error('Cover letter writer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
