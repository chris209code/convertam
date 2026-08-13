export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { CLASSIFY_PROMPT, CLASSIFY_SCHEMA, buildExtractSchemaPrompt, EXTRACT_SCHEMA_SCHEMA, ANALYZE_PROMPT, ANALYZE_SCHEMA } from '@/lib/smartParser/schema';

const MAX_TEXT_CHARS = 60000;

function buildParts({ text, image, prompt }) {
  const parts = [{ text: prompt }];
  if (text) parts.push({ text: `\n\n--- DOCUMENT TEXT ---\n${text.slice(0, MAX_TEXT_CHARS)}` });
  if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  return parts;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI enhancement is not configured on this server yet. The deterministic extraction above is unaffected.', category: 'auth' }, { status: 500 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let body;
    let imagePart = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const action = formData.get('action');
      const text = formData.get('text') || '';
      const fieldsRaw = formData.get('fields');
      const image = formData.get('image');
      if (image) {
        const buf = Buffer.from(await image.arrayBuffer());
        imagePart = { mimeType: image.type || 'application/octet-stream', base64: buf.toString('base64') };
      }
      body = { action, text, fields: fieldsRaw ? JSON.parse(fieldsRaw) : undefined };
    } else {
      body = await request.json();
    }

    const { action, text, fields, extractedFields } = body;
    const hasImage = !!imagePart;

    if (action === 'classify') {
      if (!text && !imagePart) return Response.json({ error: 'No document content received.' }, { status: 400 });
      const parts = buildParts({ text, image: imagePart, prompt: CLASSIFY_PROMPT });
      const { parsed } = await callGemini({ apiKey, toolName: 'smart-parser', routeName: '/api/smart-parser:classify', parts, schema: CLASSIFY_SCHEMA, hasImage, inputSizeApprox: text?.length });
      return Response.json(parsed);
    }

    if (action === 'extractSchema') {
      if (!fields?.length) return Response.json({ error: 'No fields requested.' }, { status: 400 });
      if (!text && !imagePart) return Response.json({ error: 'No document content received.' }, { status: 400 });
      const parts = buildParts({ text, image: imagePart, prompt: buildExtractSchemaPrompt(fields) });
      const { parsed } = await callGemini({ apiKey, toolName: 'smart-parser', routeName: '/api/smart-parser:extractSchema', parts, schema: EXTRACT_SCHEMA_SCHEMA, hasImage, inputSizeApprox: text?.length, maxOutputTokens: 4096 });
      return Response.json(parsed);
    }

    if (action === 'analyze') {
      if (!text) return Response.json({ error: 'No document text received.' }, { status: 400 });
      const fieldSummary = (extractedFields || []).map((f) => `${f.label || f.field}: ${f.value ?? '(not found)'}`).join('\n');
      const promptWithFields = `${ANALYZE_PROMPT}\n\n--- FIELDS ALREADY EXTRACTED ---\n${fieldSummary || '(none)'}`;
      const parts = buildParts({ text, prompt: promptWithFields });
      const { parsed } = await callGemini({ apiKey, toolName: 'smart-parser', routeName: '/api/smart-parser:analyze', parts, schema: ANALYZE_SCHEMA, inputSizeApprox: text.length, maxOutputTokens: 4096 });
      return Response.json(parsed);
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Smart Parser AI error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Smart Parser error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.', category: 'unexpected' }, { status: 500 });
  }
}
