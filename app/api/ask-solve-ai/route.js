export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';

// Token budget by requested depth. Previous flat 2048 was the actual root
// cause of mid-sentence truncation on longer math explanations — this was
// never "streaming cut off early", there is no streaming here at all, it
// was simply running out of its output budget before finishing.
const DEPTH_TOKEN_BUDGET = { quick: 1024, 'step-by-step': 4096, detailed: 8192 };

const DEPTH_INSTRUCTION = {
  quick: 'Keep the explanation brief — the shortest correct explanation that still shows the key reasoning step, not the full derivation.',
  'step-by-step': 'Show your reasoning step by step, one step per line, in plain language a student could follow.',
  detailed: 'Give a thorough, detailed explanation — show every step, explain why each step is taken, and note any relevant general principle the problem illustrates.',
};

function buildPrompt({ mode, question, targetLanguage, hasImage, depth }) {
  const imageNote = hasImage ? 'The question is shown in the attached image — read it carefully first, then answer based on what it actually says.' : '';
  const depthInstruction = DEPTH_INSTRUCTION[depth] || DEPTH_INSTRUCTION['step-by-step'];

  if (mode === 'math') {
    // Answer stated first, on its own line, before the explanation — this is
    // the actual safeguard against truncation: even if the explanation gets
    // cut off, the result the user actually needs has already been delivered.
    return `You are a patient, clear math tutor. ${imageNote}

Question: ${question || '(see attached image)'}

Structure your response EXACTLY like this, in this order:
Final answer: [the direct final answer, stated plainly, on its own line]

Explanation:
[then the reasoning — ${depthInstruction}]

Always put "Final answer: ..." first, before any explanation — this must appear even if you have to shorten the explanation to fit. If the question is ambiguous or you're not fully certain of the intended problem, say so briefly within the explanation, not before the final answer line.`;
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

Give a clear, accurate, direct answer first, then explain your reasoning. ${depthInstruction}`;
}

function buildContinuePrompt({ mode, question, partialAnswer, targetLanguage }) {
  return `You were answering this question and your response was cut off before finishing. Continue EXACTLY from where you left off — do not repeat anything already written, do not restart, do not re-state the final answer if it was already given. Just continue the sentence/explanation naturally from the exact cutoff point.

Original question: ${question}
${mode === 'translate' ? `Target language: ${targetLanguage || 'English'}` : ''}

What was already written (cut off mid-way):
"""
${partialAnswer}
"""

Continue from here. Return ONLY the continuation text — no repetition of what's above, no preamble like "continuing..." or "as I was saying" — just the next words as if the original response had kept going uninterrupted.`;
}

// Heuristic truncation check — a real finishReason of MAX_TOKENS is the
// strongest signal, but a response can also visibly cut off mid-sentence
// even when finishReason reports something else, so this catches both.
function looksTruncated(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const endsCleanly = /[.!?"'\)\]]\s*$/.test(trimmed) || /```\s*$/.test(trimmed);
  if (!endsCleanly) return true;
  const codeFenceCount = (trimmed.match(/```/g) || []).length;
  if (codeFenceCount % 2 !== 0) return true;
  const dollarCount = (trimmed.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) return true;
  return false;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  const routeName = '/api/ask-solve-ai';

  try {
    const contentType = request.headers.get('content-type') || '';
    let mode, question, targetLanguage, depth, continueFrom, parts, hasImage = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      mode = formData.get('mode') || 'general';
      question = formData.get('question') || '';
      targetLanguage = formData.get('targetLanguage') || '';
      depth = formData.get('depth') || 'step-by-step';
      const image = formData.get('image');
      if (!image) {
        return Response.json({ error: 'No image received.' }, { status: 400 });
      }
      const buf = Buffer.from(await image.arrayBuffer());
      const prompt = buildPrompt({ mode, question, targetLanguage, hasImage: true, depth });
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
      depth = body.depth || 'step-by-step';
      continueFrom = body.continueFrom || null;

      if (continueFrom) {
        // Continuation request — build from the partial answer, not a fresh question.
        const prompt = buildContinuePrompt({ mode, question, partialAnswer: continueFrom, targetLanguage });
        parts = [{ text: prompt }];
      } else {
        if (!question.trim()) {
          return Response.json({ error: 'Please type a question first.' }, { status: 400 });
        }
        const prompt = buildPrompt({ mode, question, targetLanguage, hasImage: false, depth });
        parts = [{ text: prompt }];
      }
    }

    const maxOutputTokens = DEPTH_TOKEN_BUDGET[depth] || DEPTH_TOKEN_BUDGET['step-by-step'];
    const { raw, requestId, finishReason } = await callGemini({
      apiKey, toolName: `ask-solve-ai:${mode}`, routeName, parts, hasImage,
      maxOutputTokens, inputSizeApprox: question.length,
    });

    const trimmed = raw.trim();
    const truncated = finishReason === 'MAX_TOKENS' || looksTruncated(trimmed);

    return Response.json({ answer: trimmed, requestId, truncated, finishReason });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Ask & Solve AI error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Ask & Solve AI error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
