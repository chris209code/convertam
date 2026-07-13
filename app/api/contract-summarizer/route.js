export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

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
    let parts, hasImage = false;

    if (contentType.includes('multipart/form-data')) {
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
      hasImage = true;
    } else {
      const { text } = await request.json();
      if (!text || text.length < 50) {
        return Response.json({ error: 'No usable contract text received.' }, { status: 400 });
      }
      const trimmed = text.length > 100000 ? text.slice(0, 100000) : text;
      parts = [{ text: `${PROMPT}\n\n--- CONTRACT TEXT ---\n${trimmed}` }];
    }

    const { parsed } = await callGemini({ apiKey, toolName: 'contract-summarizer', routeName: '/api/contract-summarizer', parts, schema: responseSchema, hasImage });
    return Response.json(parsed);
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Contract summarizer error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Contract summarizer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
