export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const NO_FABRICATION_RULE = 'Never invent facts, numbers, dates, or conclusions that are not present in the provided content. If uploaded documents disagree with each other on something, note the conflict rather than silently picking one version.';

const LENGTH_GUIDANCE = {
  short: '5-7 slides total',
  standard: '8-12 slides total',
  detailed: '13-20 slides total',
};

const outlineSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    slides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          title: { type: 'STRING' },
          subtitle: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
          speakerNotes: { type: 'STRING' },
          sourceFiles: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['type', 'title'],
      },
    },
  },
  required: ['title', 'slides'],
};

function buildOutlinePrompt({ presentationTitle, audience, purpose, tone, length, customLength, includeNotes, includeSources, fileNames }) {
  const lengthLine = length === 'custom' ? `approximately ${customLength || 10} slides total` : (LENGTH_GUIDANCE[length] || LENGTH_GUIDANCE.standard);
  return `You are an expert presentation designer. Read the document content provided (extracted from one or more uploaded files: ${fileNames?.join(', ') || 'the uploaded content'}) and turn it into a structured slide outline for an editable PowerPoint presentation.

Presentation title (if given, use it — otherwise infer a good one): ${presentationTitle || '(not given — infer one from the content)'}
Audience: ${audience || 'general'}
Purpose: ${purpose || 'inform the audience about the content'}
Tone: ${tone}
Target length: ${lengthLine}

Requirements:
- Identify the main topics across all the provided content and remove repetition if the same point appears in multiple files.
- Organize into a logical flow — don't just chop text into arbitrary chunks.
- Each content slide needs a short clear title and 3-5 concise bullet points (short phrases, never full paragraphs).
- Include one slide of type "title" first (title + subtitle for the deck), and end with one slide of type "closing" (a closing/Q&A slide).
- Use type "section" sparingly, only to introduce a genuinely new part of the presentation.
- ${includeNotes ? 'For each content slide, write brief speaker notes (2-3 sentences) expanding on what the presenter should say.' : 'Leave speakerNotes as an empty string for every slide — notes were not requested.'}
- ${includeSources ? 'For each content slide, list which uploaded file(s) (by name) that content came from in sourceFiles.' : 'Leave sourceFiles as an empty array for every slide — source references were not requested.'}
- ${NO_FABRICATION_RULE}

Return ONLY JSON matching the required schema — no extra commentary.`;
}

function buildRefinePrompt({ slide, action, deckTone }) {
  const actionInstructions = {
    regenerate: 'Rewrite this slide with fresh wording and structure, same underlying facts.',
    shorten: 'Make this slide noticeably more concise — fewer, punchier bullets — without losing the key facts.',
    expand: 'Add more relevant detail to this slide\'s bullets, staying strictly within what is plausible given the existing content — do not invent new facts.',
  };
  return `You are editing one slide of a presentation with an overall "${deckTone}" tone. ${actionInstructions[action] || actionInstructions.regenerate}

${NO_FABRICATION_RULE}

Current slide (JSON): ${JSON.stringify(slide)}

Return ONLY JSON for the revised slide, in the same shape: { "type": "...", "title": "...", "bullets": [...], "speakerNotes": "...", "sourceFiles": [...] }`;
}

function buildRetoneAllPrompt({ outline, newTone }) {
  return `Rewrite the wording of every slide in this presentation outline to match a new overall tone: "${newTone}". Keep the same facts, same number of slides, same structure — only adjust wording/phrasing to fit the new tone.

${NO_FABRICATION_RULE}

Current outline (JSON): ${JSON.stringify(outline)}

Return ONLY JSON matching the same shape as the input.`;
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Retries transient failures automatically (rate limits, momentary server
// errors, network blips) before ever showing the user an error.
async function callGemini(apiKey, parts, useSchema) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: useSchema ? { responseMimeType: 'application/json', responseSchema: outlineSchema } : { maxOutputTokens: 2048 },
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
        console.error(`Gemini presentation-generator error (attempt ${attempt}/${maxAttempts}):`, data);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('gemini_error');
      }

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('empty_response');
      }
      return raw;
    } catch (err) {
      lastError = err;
      const isKnownFinalError = err.message === 'gemini_error' || err.message === 'empty_response';
      if (!isKnownFinalError && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
      if (attempt === maxAttempts) throw lastError;
    }
  }
  throw lastError;
}

function parseJsonResponse(raw) {
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === 'outline') {
      const { text, images, fileNames, ...settings } = payload;
      if ((!text || !text.trim()) && (!images || images.length === 0)) {
        return Response.json({ error: 'No usable content received.' }, { status: 400 });
      }
      const trimmedText = text && text.length > 100000 ? text.slice(0, 100000) : text;
      const prompt = buildOutlinePrompt({ ...settings, fileNames });
      const parts = [{ text: `${prompt}${trimmedText ? `\n\n--- DOCUMENT CONTENT ---\n${trimmedText}` : ''}` }];
      if (images && images.length) {
        images.slice(0, 10).forEach((img) => parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } }));
      }
      const raw = await callGemini(apiKey, parts, true);
      const outline = parseJsonResponse(raw);
      return Response.json(outline);
    }

    if (action === 'refineSlide') {
      const { slide, modifier, deckTone } = payload;
      const raw = await callGemini(apiKey, [{ text: buildRefinePrompt({ slide, action: modifier, deckTone }) }], true);
      const revised = parseJsonResponse(raw);
      return Response.json({ slide: revised });
    }

    if (action === 'retoneAll') {
      const { outline, newTone } = payload;
      const raw = await callGemini(apiKey, [{ text: buildRetoneAllPrompt({ outline, newTone }) }], true);
      const revised = parseJsonResponse(raw);
      return Response.json(revised);
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('Presentation generator error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
