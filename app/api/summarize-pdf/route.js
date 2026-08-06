export const runtime = 'nodejs';
export const maxDuration = 60;

import { AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { summarizeDocument, summarizeChapters } from '@/lib/pdfSummarize/pipeline';
import { validateSelection, resolveSelection } from '@/lib/pdfSummarize/limits';
import { SUMMARY_TYPES, FOCUS_AREAS } from '@/lib/pdfSummarize/schema';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }

  try {
    const { pages, type, length, selection, focusAreas } = await request.json();

    if (!Array.isArray(pages) || pages.length === 0) {
      return Response.json({ error: 'No pages received from PDF.' }, { status: 400 });
    }

    const summaryType = type === 'chapter' || SUMMARY_TYPES[type] ? type : 'smart';
    const cleanFocusAreas = Array.isArray(focusAreas) ? focusAreas.filter((f) => FOCUS_AREAS.includes(f)) : [];

    const { start, end } = resolveSelection(pages.length, selection);
    const selectedPages = pages.slice(start - 1, end);
    const totalCharacters = selectedPages.reduce((sum, p) => sum + (p.text?.length || 0), 0);

    const limitError = validateSelection({ pageCount: pages.length, selection, totalCharacters });
    if (limitError) {
      return Response.json({ error: limitError }, { status: 400 });
    }

    const combinedLength = selectedPages.reduce((sum, p) => sum + (p.text?.trim()?.length || 0), 0);
    if (combinedLength < 50) {
      return Response.json({ error: 'Could not extract usable text from the selected pages. This PDF may be a scanned image — try OCR PDF instead.' }, { status: 400 });
    }

    if (summaryType === 'chapter') {
      const result = await summarizeChapters({ apiKey, pages: selectedPages, focusAreas: cleanFocusAreas });
      const wordCount = result.chapters.reduce((sum, c) => sum + (c.summary?.trim().split(/\s+/).filter(Boolean).length || 0), 0);
      return Response.json({
        type: 'chapter',
        chapters: result.chapters,
        chapterCount: result.chapterCount,
        wordCount,
        readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      });
    }

    const result = await summarizeDocument({ apiKey, pages: selectedPages, type: summaryType, length, focusAreas: cleanFocusAreas });

    return Response.json({
      type: summaryType,
      summary: result.summary,
      wordCount: result.wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(result.wordCount / 200)),
      chunkCount: result.chunkCount,
    });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Summarize PDF error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json(
        { error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds },
        { status: 502 }
      );
    }
    console.error('Summarize PDF error:', err);
    return Response.json({ error: err.message || 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
