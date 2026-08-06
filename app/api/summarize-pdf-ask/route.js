export const runtime = 'nodejs';
export const maxDuration = 60;

import { AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { answerFromSummary, answerFromFullText } from '@/lib/pdfSummarize/pipeline';
import { summaryToSections, chaptersToSections, sectionsToPlainText } from '@/lib/pdfSummarize/formatSummary';
import { MAX_PAGES_PER_RUN, MAX_CHARACTERS_PER_RUN } from '@/lib/pdfSummarize/limits';

// "Ask this document" (Phase 3) — a separate, single-purpose route
// (mirrors summarize-pdf-docx sitting alongside summarize-pdf) rather than
// an extra action on the main summarize-pdf route, since this is a
// distinct, repeatable operation (many questions per one summary) with its
// own two-tier cost model instead of a one-shot generate.
export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }

  try {
    const { question, history, type, summary, chapters, pages } = await request.json();

    if (!question?.trim()) {
      return Response.json({ error: 'Please type a question first.' }, { status: 400 });
    }
    const cleanHistory = Array.isArray(history)
      ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string').slice(-12)
      : [];

    let sections;
    if (type === 'chapter') {
      if (!Array.isArray(chapters) || chapters.length === 0) {
        return Response.json({ error: 'No summary available to ask about.' }, { status: 400 });
      }
      sections = chaptersToSections(chapters);
    } else {
      if (!summary || typeof summary !== 'object') {
        return Response.json({ error: 'No summary available to ask about.' }, { status: 400 });
      }
      sections = summaryToSections(type, summary);
    }
    const summaryText = sectionsToPlainText(sections);
    if (!summaryText.trim()) {
      return Response.json({ error: 'No summary available to ask about.' }, { status: 400 });
    }

    const tier1 = await answerFromSummary({ apiKey, question, history: cleanHistory, summaryText });

    if (!tier1.needsFullText || !Array.isArray(pages) || pages.length === 0) {
      return Response.json({ answer: tier1.answer, usedFullText: false });
    }

    // Tier 2 fallback — validate independently of the main route's
    // validateSelection (this request carries a raw pages array, not a
    // pageCount+selection pair), but against the same safety ceilings so a
    // stale/malicious client can't force an oversized re-processing call.
    const totalCharacters = pages.reduce((sum, p) => sum + (p?.text?.length || 0), 0);
    if (pages.length > MAX_PAGES_PER_RUN || totalCharacters > MAX_CHARACTERS_PER_RUN) {
      return Response.json({ answer: tier1.answer, usedFullText: false });
    }

    const fullTextAnswer = await answerFromFullText({ apiKey, question, history: cleanHistory, pages });
    return Response.json({ answer: fullTextAnswer, usedFullText: true });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Summarize PDF ask error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json(
        { error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds },
        { status: 502 }
      );
    }
    console.error('Summarize PDF ask error:', err);
    return Response.json({ error: err.message || 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
