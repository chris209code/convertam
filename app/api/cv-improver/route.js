export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Enforces the exact shape the prompt asks for — previously this route
// relied entirely on prompt instructions ("Return ONLY valid JSON") with no
// schema behind it, which is the same class of bug found and fixed in
// AI Data Analyst's extraction actions: unenforced JSON occasionally comes
// back malformed or truncated, especially on longer input like a full CV.
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

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Retries transient failures automatically (rate limits, momentary server
// errors, network blips, or an occasional malformed-JSON response) before
// ever showing the user an error.
async function callGeminiForCV(apiKey, prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
      responseSchema: cvSchema,
    },
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
        console.error(`Gemini CV-improver error (attempt ${attempt}/${maxAttempts}):`, JSON.stringify(data));
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('gemini_error');
      }

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!raw) {
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('empty_response');
      }

      // Parsing is inside the retry loop too — an occasional malformed
      // response is worth a fresh attempt rather than an immediate failure.
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return { raw, parsed };
      } catch (parseErr) {
        console.error(`JSON parse error (attempt ${attempt}/${maxAttempts}):`, parseErr.message);
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('parse_error');
      }
    } catch (err) {
      lastError = err;
      const isKnownFinalError = ['gemini_error', 'empty_response', 'parse_error'].includes(err.message);
      if (!isKnownFinalError && attempt < maxAttempts) { await sleep(700 * attempt); continue; } // network-level failure — also worth retrying
      if (attempt === maxAttempts) throw lastError;
    }
  }
  throw lastError;
}

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

    const { raw, parsed } = await callGeminiForCV(apiKey, prompt);
    return Response.json({ improved: raw, structured: parsed });
  } catch (err) {
    console.error('CV improver error:', err);
    const message = err.message === 'parse_error'
      ? 'AI returned an unexpected format. Please try again.'
      : 'Something went wrong. Please try again.';
    return Response.json({ error: message }, { status: 500 });
  }
}
