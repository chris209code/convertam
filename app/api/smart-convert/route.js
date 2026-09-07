export const runtime = 'nodejs';
export const maxDuration = 60;

import { GEMINI_MODEL_URL as GEMINI_URL } from '@/lib/geminiModel';

// This route calls Gemini via a raw fetch rather than the shared
// lib/geminiClient.js helper (which has no size guard of its own either),
// so nothing rejects an oversized upload before it's buffered into memory
// and base64-encoded — cap it here rather than relying on Gemini itself to
// eventually error on an inline payload that's too large. The page-count
// cap below already bounds request size roughly, but a handful of huge
// scans can still add up to an enormous request, so each page also gets
// its own cap.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB per page

const PROMPT = `You are a document digitization engine. Look at the attached image(s) of a document, scanned page, or photo and do the following:
1. Read every piece of text in natural reading order, exactly as written. Correct obvious scanning artifacts where you are confident, but never invent content that isn't there.
2. Separately identify any tables. For each table, extract its rows as arrays of cell strings, including header rows as the first row.
3. Do not duplicate table content inside the general text field — table content belongs only in "tables".
Return your answer in the exact JSON shape requested, and nothing else.`;

const responseSchema = {
  type: 'OBJECT',
  properties: {
    text: {
      type: 'STRING',
      description: 'All non-tabular text from the document, in reading order.',
    },
    tables: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          rows: {
            type: 'ARRAY',
            items: { type: 'ARRAY', items: { type: 'STRING' } },
          },
        },
        required: ['rows'],
      },
    },
  },
  required: ['text', 'tables'],
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
    const formData = await request.formData();
    const images = formData.getAll('images');

    if (!images.length) {
      return Response.json({ error: 'No images received.' }, { status: 400 });
    }

    if (images.length > 15) {
      return Response.json(
        { error: 'Too many pages — please try 15 pages or fewer at a time.' },
        { status: 400 }
      );
    }
    if (images.some((img) => img.size > MAX_IMAGE_BYTES)) {
      return Response.json(
        { error: 'One of those pages is too large (max 20MB per page). Try a smaller scan.' },
        { status: 400 }
      );
    }

    const parts = [{ text: PROMPT }];
    for (const img of images) {
      const buf = Buffer.from(await img.arrayBuffer());
      parts.push({
        inline_data: {
          mime_type: img.type || 'image/jpeg',
          data: buf.toString('base64'),
        },
      });
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini error:', data);
      return Response.json(
        { error: 'The AI engine could not process that file. Try a clearer photo or scan.' },
        { status: 502 }
      );
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return Response.json(
        { error: 'No readable content was returned. Try a clearer image.' },
        { status: 422 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: 'Could not understand the AI response. Please try again.' },
        { status: 502 }
      );
    }

    return Response.json({
      text: parsed.text || '',
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    });

  } catch (err) {
    console.error('Smart convert error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
