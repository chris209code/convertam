export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { buildContractPrompt } from '@/lib/contractSummarize/prompt';
import { contractSummarySchema } from '@/lib/contractSummarize/schema';

// Gemini 2.5 Flash's context window comfortably holds a full contract's
// text (even a long one) in a single call — no map-reduce chunking needed
// the way Summarize PDF's pipeline requires for arbitrary-length documents.
// This cap exists only to guard against a pathological upload, not because
// ordinary contracts are expected to hit it; if they do, every page is
// still counted (client sends page markers) so the model can say which
// pages it saw.
const MAX_TEXT_CHARS = 500000;

// Each photographed page becomes one inline_data part; a very large batch
// risks the request body limits imposed by the hosting platform long before
// Gemini's own limits matter. Ordinary contracts are a handful of pages;
// anything longer than this should go through OCR PDF into the PDF path
// instead, which has no such per-page multiplier.
const MAX_IMAGES = 30;

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
    let serverNotice = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const images = formData.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function');
      const userParty = formData.get('userParty') || '';
      if (images.length === 0) {
        return Response.json({ error: 'No images received.' }, { status: 400 });
      }
      if (images.length > MAX_IMAGES) {
        return Response.json({ error: `That's ${images.length} photos — please upload at most ${MAX_IMAGES} pages at a time. For a longer scanned contract, run it through OCR PDF first and upload the resulting PDF here instead.` }, { status: 400 });
      }

      parts = [{ text: `${buildContractPrompt({ userParty })}\n\nThe following ${images.length} image${images.length > 1 ? 's are' : ' is'} the ordered page${images.length > 1 ? 's' : ''} of this contract (page 1 first).` }];
      for (let i = 0; i < images.length; i++) {
        const buf = Buffer.from(await images[i].arrayBuffer());
        parts.push({ text: `--- PAGE ${i + 1} (image) ---` });
        parts.push({ inline_data: { mime_type: images[i].type || 'image/jpeg', data: buf.toString('base64') } });
      }
      hasImage = true;
    } else {
      const { text, userParty } = await request.json();
      if (!text || text.length < 50) {
        return Response.json({ error: 'No usable contract text received.' }, { status: 400 });
      }
      let trimmed = text;
      if (text.length > MAX_TEXT_CHARS) {
        trimmed = text.slice(0, MAX_TEXT_CHARS);
        serverNotice = 'This document was unusually long, so analysis is based on roughly the first ' + Math.round(MAX_TEXT_CHARS / 1800) + ' pages of text. Later pages were not included.';
      }
      parts = [{ text: `${buildContractPrompt({ userParty })}\n\n--- CONTRACT TEXT (page markers included) ---\n${trimmed}` }];
    }

    const { parsed } = await callGemini({
      apiKey,
      toolName: 'contract-summarizer',
      routeName: '/api/contract-summarizer',
      parts,
      schema: contractSummarySchema,
      maxOutputTokens: 16384,
      temperature: 0.2,
      hasImage,
      inputSizeApprox: parts.reduce((n, p) => n + (p.text?.length || 0), 0),
    });
    return Response.json(serverNotice ? { ...parsed, serverNotice } : parsed);
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Contract summarizer error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Contract summarizer error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
