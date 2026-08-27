export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { buildPayslipPrompt } from '@/lib/payslip/prompt';
import { payslipExtractSchema } from '@/lib/payslip/schema';

// A payslip is a short document — this only exists to guard against a
// pathological upload, not because real payslip text is ever close to it.
const MAX_TEXT_CHARS = 50000;
// Payslips are rarely more than a couple of pages; this caps request body
// size, same reasoning as contract-summarizer's own MAX_IMAGES.
const MAX_IMAGES = 10;

// This route is only ever called when the user explicitly clicks
// "Try AI extraction" on the client — never automatically. If the client
// has applied redactions to the document, it sends the FLATTENED redacted
// page images here (never the original file) — this route has no way to
// tell the difference and doesn't need to; it just processes whatever
// images/text it's handed.
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
      const images = formData.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function');
      if (images.length === 0) {
        return Response.json({ error: 'No images received.' }, { status: 400 });
      }
      if (images.length > MAX_IMAGES) {
        return Response.json({ error: `That's ${images.length} pages — please upload at most ${MAX_IMAGES} pages at a time.` }, { status: 400 });
      }

      parts = [{ text: `${buildPayslipPrompt()}\n\nThe following ${images.length} image${images.length > 1 ? 's are' : ' is'} the page${images.length > 1 ? 's' : ''} of this payslip (page 1 first).` }];
      for (let i = 0; i < images.length; i++) {
        const buf = Buffer.from(await images[i].arrayBuffer());
        parts.push({ inline_data: { mime_type: images[i].type || 'image/png', data: buf.toString('base64') } });
      }
      hasImage = true;
    } else {
      const { text } = await request.json();
      if (!text || text.length < 10) {
        return Response.json({ error: 'No usable payslip text received.' }, { status: 400 });
      }
      const trimmed = text.slice(0, MAX_TEXT_CHARS);
      parts = [{ text: `${buildPayslipPrompt()}\n\n--- PAYSLIP TEXT ---\n${trimmed}` }];
    }

    const { parsed } = await callGemini({
      apiKey,
      toolName: 'payslip-extract',
      routeName: '/api/payslip-extract',
      parts,
      schema: payslipExtractSchema,
      maxOutputTokens: 2048,
      temperature: 0.1,
      hasImage,
      inputSizeApprox: parts.reduce((n, p) => n + (p.text?.length || 0), 0),
    });
    return Response.json(parsed);
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Payslip extract error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Payslip extract error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
