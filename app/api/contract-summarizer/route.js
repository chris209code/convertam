export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `You are a contract analysis engine. Read the attached contract or agreement text carefully and extract the key information a busy, non-lawyer reader needs to understand what they're signing.

Extract:
- parties: the names of every party to the agreement (array of strings)
- effectiveDate: the effective/start date of the agreement, if stated
- term: the duration or term of the agreement (e.g. "12 months", "until terminated by either party")
- obligations: the main things each party is required to do (array of clear, plain-English strings, one obligation per item)
- paymentTerms: a plain-English description of any payment amounts, schedules, or conditions
- terminationClause: a plain-English description of how and when the agreement can be terminated
- risks: any clauses a normal person should pay close attention to before signing — unusual penalties, automatic renewal, exclusivity, liability, non-compete, indemnification, or anything one-sided (array of short plain-English strings). Leave empty array if genuinely nothing stands out.
- summary: a 3-5 sentence plain-language summary of what this contract is and what it means for the person reading it

Be accurate and conservative — never invent clauses that are not actually present in the text. If a field cannot be determined from the text, use an empty string or empty array as appropriate. Do not provide legal advice or a legal opinion — only describe what the document says.`;

const responseSchema = {
  type: 'OBJECT',
  properties: {
    parties: { type: 'ARRAY', items: { type: 'STRING' } },
    effectiveDate: { type: 'STRING' },
    term: { type: 'STRING' },
    obligations: { type: 'ARRAY', items: { type: 'STRING' } },
    paymentTerms: { type: 'STRING' },
    terminationClause: { type: 'STRING' },
    risks: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
  },
  required: ['parties', 'obligations', 'summary'],
};

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Retries transient failures automatically (rate limits, momentary server
// errors, network blips, or an occasional malformed-JSON response) before
// ever showing the user an error — same fix applied across every AI route
// on the site after this exact failure mode surfaced mid-demo.
async function callGeminiForContract(apiKey, parts) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema },
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
        console.error(`Gemini contract summarizer error (attempt ${attempt}/${maxAttempts}):`, data);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('gemini_error');
      }

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('empty_response');
      }

      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return parsed;
      } catch {
        console.error(`JSON parse error (attempt ${attempt}/${maxAttempts})`);
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
    return Response.json(
      { error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' },
      { status: 500 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let parts;

    if (contentType.includes('multipart/form-data')) {
      // Photo of a contract page — send straight to Gemini's vision, no separate OCR step needed
      const formData = await request.formData();
      const image = formData.get('image');
      if (!image) {
        return Response.json({ error: 'No image received.' }, { status: 400 });
      }
      const buf = Buffer.from(await image.arrayBuffer());
      parts = [
        { text: PROMPT },
        { inline_data: { mime_type: image.type || 'image/jpeg', data: buf.toString('base64') } },
      ];
    } else {
      const { text } = await request.json();
      if (!text || text.length < 50) {
        return Response.json({ error: 'No usable contract text received.' }, { status: 400 });
      }
      // Guard against extremely large documents blowing past reasonable request size
      const trimmed = text.length > 100000 ? text.slice(0, 100000) : text;
      parts = [{ text: `${PROMPT}\n\n--- CONTRACT TEXT ---\n${trimmed}` }];
    }

    const parsed = await callGeminiForContract(apiKey, parts);
    return Response.json(parsed);
  } catch (err) {
    console.error('Contract summarizer error:', err);
    const message = err.message === 'parse_error'
      ? 'Could not understand the AI response. Please try again.'
      : 'Something went wrong. Please try again.';
    return Response.json({ error: message }, { status: 500 });
  }
}
