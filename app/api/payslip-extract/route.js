export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { buildPayslipPrompt } from '@/lib/payslip/prompt';
import { payslipExtractSchema } from '@/lib/payslip/schema';

// Payslips are rarely more than a couple of pages; this caps request body
// size, same reasoning as contract-summarizer's own MAX_IMAGES.
const MAX_IMAGES = 10;

// The payslip's page images are ALWAYS what gets sent here — vision-based
// document understanding (reading the actual table layout/columns) is the
// whole point, not a fallback, so there is no separate "send extracted
// text instead" mode the way earlier tools in this app have. If the client
// applied redactions, it sends the FLATTENED redacted page images (never
// the original file) — this route has no way to tell the difference and
// doesn't need to; it just reads whatever images it's handed.
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
    const images = formData.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function');
    if (images.length === 0) {
      return Response.json({ error: 'No images received.' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return Response.json({ error: `That's ${images.length} pages — please upload at most ${MAX_IMAGES} pages at a time.` }, { status: 400 });
    }

    const parts = [{ text: `${buildPayslipPrompt()}\n\nThe following ${images.length} image${images.length > 1 ? 's are' : ' is'} the page${images.length > 1 ? 's' : ''} of this payslip (page 1 first).` }];
    for (let i = 0; i < images.length; i++) {
      const buf = Buffer.from(await images[i].arrayBuffer());
      parts.push({ inline_data: { mime_type: images[i].type || 'image/png', data: buf.toString('base64') } });
    }

    const { parsed } = await callGemini({
      apiKey,
      toolName: 'payslip-extract',
      routeName: '/api/payslip-extract',
      parts,
      schema: payslipExtractSchema,
      maxOutputTokens: 4096,
      temperature: 0.1,
      hasImage: true,
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
