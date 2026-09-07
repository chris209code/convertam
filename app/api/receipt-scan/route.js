export const runtime = 'nodejs';
export const maxDuration = 60;

import { GEMINI_MODEL_URL as GEMINI_URL } from '@/lib/geminiModel';

// This route calls Gemini via a raw fetch rather than the shared
// lib/geminiClient.js helper (which has no size guard of its own either),
// so nothing rejects an oversized upload before it's buffered into memory
// and base64-encoded — cap it here rather than relying on Gemini itself to
// eventually error on an inline payload that's too large.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB — a photographed receipt is never legitimately larger than this

const PROMPT = `You are a receipt and invoice data extraction engine. Carefully examine the attached image of a receipt, invoice, or bill and extract all financial and business information.

Extract the following fields (leave blank if not found):
- vendor: business/store/supplier name
- date: date of transaction
- invoice_number: invoice or receipt number
- payment_method: cash, card, transfer, etc.
- subtotal: amount before tax
- tax: tax amount
- total: final total amount
- currency: currency symbol or code
- notes: any other relevant information

Also extract all line items as a table with columns: description, quantity, unit_price, amount.

Return ONLY valid JSON in this exact shape, nothing else:
{
  "vendor": "",
  "date": "",
  "invoice_number": "",
  "payment_method": "",
  "subtotal": "",
  "tax": "",
  "total": "",
  "currency": "",
  "notes": "",
  "items": [
    { "description": "", "quantity": "", "unit_price": "", "amount": "" }
  ]
}`;

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
    const image = formData.get('image');

    if (!image) {
      return Response.json({ error: 'No image received.' }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: 'That image is too large (max 20MB). Try a smaller photo or scan.' }, { status: 400 });
    }

    const buf = Buffer.from(await image.arrayBuffer());

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: image.type || 'image/jpeg', data: buf.toString('base64') } },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini receipt error:', data);
      return Response.json({ error: 'Could not read that image. Try a clearer photo.' }, { status: 502 });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return Response.json({ error: 'No data returned. Try a clearer photo.' }, { status: 422 });
    }

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return Response.json({ error: 'Could not understand the response. Please try again.' }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    console.error('Receipt scan error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
