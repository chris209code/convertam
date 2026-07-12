export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

function buildPrompt({ mode, question, targetLanguage, hasImage }) {
  const imageNote = hasImage ? 'The question is shown in the attached image — read it carefully first, then answer based on what it actually says.' : '';

  if (mode === 'math') {
    return `You are a patient, clear math tutor. ${imageNote}

Question: ${question || '(see attached image)'}

Solve this step by step, showing your working clearly, then give the final answer clearly labeled at the end. Explain each step in plain language a student could follow, not just the raw calculation. If the question is ambiguous or you're not fully certain of the intended problem, say so briefly before answering.`;
  }

  if (mode === 'translate') {
    return `You are a translation assistant. ${imageNote}

Text to translate: ${question || '(see attached image)'}
Target language: ${targetLanguage || 'English'}

First detect the source language, then provide an accurate, natural-sounding translation into ${targetLanguage || 'English'}. Return the translation clearly. If helpful, briefly note the detected source language at the top, then give the translation on its own line.`;
  }

  // general
  return `You are a helpful, knowledgeable assistant. ${imageNote}

Question: ${question || '(see attached image)'}

Give a clear, accurate, direct answer. Keep it concise but complete — explain reasoning briefly where it helps understanding, without padding the response with unnecessary filler.`;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  const routeName = '/api/ask-solve-ai';

  try {
    const contentType = request.headers.get('content-type') || '';
    let mode, question, targetLanguage, parts, hasImage = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      mode = formData.get('mode') || 'general';
      question = formData.get('question') || '';
      targetLanguage = formData.get('targetLanguage') || '';
      const image = formData.get('image');
      if (!image) {
        return Response.json({ error: 'No image received.' }, { status: 400 });
      }
      const buf = Buffer.from(await image.arrayBuffer());
      const prompt = buildPrompt({ mode, question, targetLanguage, hasImage: true });
      hasImage = true;
      parts = [
        { text: prompt },
        { inline_data: { mime_type: image.type || 'image/jpeg', data: buf.toString('base64') } },
      ];
    } else {
      const body = await request.json();
      mode = body.mode || 'general';
      question = body.question || '';
      targetLanguage = body.targetLanguage || '';
      if (!question.trim()) {
        return Response.json({ error: 'Please type a question first.' }, { status: 400 });
      }
      const prompt = buildPrompt({ mode, question, targetLanguage, hasImage: false });
      parts = [{ text: prompt }];
    }

    const { raw, requestId } = await callGemini({ apiKey, toolName: `ask-solve-ai:${mode}`, routeName, parts, hasImage, inputSizeApprox: question.length });
    return Response.json({ answer: raw.trim(), requestId });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Ask & Solve AI error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category }, { status: 502 });
    }
    console.error('Ask & Solve AI error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
