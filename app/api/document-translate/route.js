export const runtime = 'nodejs';
export const maxDuration = 60;

import { AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { getTranslationEngine } from '@/lib/documentTranslate/engine';
import { validateTextLength, validateTotalLength } from '@/lib/documentTranslate/limits';
import { encodeSignedCookie, buildCookieHeader, msUntilNextWATMidnight, computeDocumentTranslatorUsageState } from '@/lib/usageCookie';

const USAGE_COOKIE_NAME = 'convertam_document_translator_daily_usage';
const OWNER_COOKIE_NAME = 'convertam_owner';
const DAILY_TRANSLATION_LIMIT = 2;

function readUsageState(request) {
  const usageSecret = process.env.CONVERTAM_OWNER_COOKIE_SECRET;
  const state = computeDocumentTranslatorUsageState({
    cookieHeader: request.headers.get('cookie'),
    ownerCookieName: OWNER_COOKIE_NAME,
    usageCookieName: USAGE_COOKIE_NAME,
    cookieSecret: usageSecret,
    dailyLimit: DAILY_TRANSLATION_LIMIT,
  });
  return { ...state, usageSecret };
}

function withUsageCookie(responseBody, status, usageState, newCount) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (usageState.usageSecret && !usageState.isOwner) {
    const token = encodeSignedCookie({ date: usageState.today, count: newCount }, usageState.usageSecret);
    headers.append('Set-Cookie', buildCookieHeader(USAGE_COOKIE_NAME, token, { maxAgeSeconds: 60 * 60 * 30, httpOnly: true, sameSite: 'Lax' }));
  }
  return new Response(JSON.stringify(responseBody), { status, headers });
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const body = await request.json();

    if (body.action === 'usageStatus') {
      const usageState = readUsageState(request);
      return Response.json({
        isOwner: usageState.isOwner,
        remaining: usageState.isOwner ? null : usageState.remaining,
        limit: DAILY_TRANSLATION_LIMIT,
        resetInMs: msUntilNextWATMidnight(),
      });
    }

    const { text, blocks, sourceLanguage, targetLanguage, mode } = body;

    if (!targetLanguage) {
      return Response.json({ error: 'Please choose a target language.' }, { status: 400 });
    }

    // Two request shapes share this route: `text` for the flat-text
    // pipeline (PDF/TXT/paste), `blocks` (an array of strings) for the
    // structure-preserving pipeline (DOCX/PPTX) — the caller has already
    // extracted the document's translatable text in document order and
    // just needs each item translated in place, same count, same order.
    const isBlockRequest = Array.isArray(blocks);

    if (isBlockRequest) {
      if (blocks.length === 0) {
        return Response.json({ error: 'No text to translate.' }, { status: 400 });
      }
      const totalLength = blocks.reduce((sum, b) => sum + (b?.length || 0), 0);
      const lengthError = validateTotalLength(totalLength);
      if (lengthError) {
        return Response.json({ error: lengthError }, { status: 400 });
      }
    } else {
      if (!text || !text.trim()) {
        return Response.json({ error: 'No text to translate.' }, { status: 400 });
      }
      const lengthError = validateTextLength(text);
      if (lengthError) {
        return Response.json({ error: lengthError }, { status: 400 });
      }
    }

    const usageState = readUsageState(request);
    if (!usageState.isOwner && usageState.remaining <= 0) {
      return withUsageCookie(
        { error: `You've reached today's limit of ${DAILY_TRANSLATION_LIMIT} translations. This resets daily — try again tomorrow.`, limitReached: true },
        429,
        usageState,
        usageState.count,
      );
    }

    const engine = getTranslationEngine();

    if (isBlockRequest) {
      const { translatedBlocks, detectedSourceLanguage, requestId } = await engine.translateBlocks({
        apiKey,
        blocks,
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
      });
      return withUsageCookie(
        { translatedBlocks, detectedSourceLanguage, requestId },
        200,
        usageState,
        usageState.count + 1,
      );
    }

    const { translatedText, detectedSourceLanguage, requestId } = await engine.translateText({
      apiKey,
      text,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      mode: mode === 'accurate' ? 'accurate' : 'fast',
    });

    return withUsageCookie(
      { translatedText, detectedSourceLanguage, requestId },
      200,
      usageState,
      usageState.count + 1,
    );
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Document Translator error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Document Translator error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
