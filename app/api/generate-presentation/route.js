export const runtime = 'nodejs';
export const maxDuration = 60;

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { outlineSchema, slideContentSchema, singleSlideSchema } from '@/lib/presentation/presentationSchema';

const NO_FABRICATION_RULE = 'Never invent facts, numbers, dates, or conclusions that are not present in the provided content. If the source material disagrees with itself on something, note the conflict rather than silently picking one version.';

const SLIDE_COUNT_GUIDANCE = {
  5: '5 slides total', 8: '8 slides total', 10: '10 slides total', 15: '15 slides total',
};

const MAX_SOURCE_CHARS = 100000;

function languageLine(language) {
  return language && language !== 'English' ? `Write the entire presentation in ${language}.` : '';
}

function buildOutlinePrompt({ sourceType, topic, presentationTitle, audience, purpose, tone, language, slideCount, customSlideCount, duration }) {
  const countLine = slideCount === 'custom' ? `approximately ${customSlideCount || 10} slides total` : (SLIDE_COUNT_GUIDANCE[slideCount] || SLIDE_COUNT_GUIDANCE[10]);
  const durationLine = duration ? `The presenter has about ${duration} to deliver this, so pace slide count and depth accordingly.` : '';
  const sourceLine = sourceType === 'topic'
    ? `The presentation is about this topic (no source document was provided — use your own knowledge, staying factual and conservative): "${topic}"`
    : 'Read the source content provided below and turn it into a structured presentation outline.';

  return `You are an expert presentation designer creating a slide-by-slide OUTLINE ONLY — not full slide content yet. Each slide needs just a short title and a one-sentence summary of what that slide will cover; a separate step will write the full content later.

${sourceLine}

Presentation title (if given, use it — otherwise infer a good one): ${presentationTitle || '(not given — infer one from the content)'}
Audience: ${audience || 'general'}
Purpose: ${purpose || 'inform the audience about the topic'}
Tone: ${tone}
Target length: ${countLine}
${durationLine}
${languageLine(language)}

Requirements:
- Structure this as a coherent presentation, not a document chopped into slides — a title slide, a logical flow of ideas building toward a conclusion, not paragraph-per-slide.
- The first slide must have slideType "title". The last slide must have slideType "closing".
- Use slideType "section" sparingly, only to introduce a genuinely new part of the presentation.
- All other slides use slideType "content".
- Each summary should be one clear sentence describing what that slide will say — not the final wording, just the plan.
- ${NO_FABRICATION_RULE}

Return ONLY JSON matching the required schema — no extra commentary.`;
}

function buildSlideContentPrompt({ outline, tone, language, sourceText }) {
  const layoutList = 'title, titleBullets, twoColumn, imageText, process, timeline, comparison, statistics, chart, quote, sectionDivider, keyTakeaway';
  return `You are writing the full content for every slide of an approved presentation outline. For EACH slide, choose the single best-fitting layout from this list: ${layoutList}.

Rules for choosing layouts:
- Do not default every slide to "titleBullets" — actively look for content that fits a more specific layout: a numbered process or steps → "process"; a chronological sequence → "timeline"; two options/before-after → "comparison" or "twoColumn"; numbers/metrics → "statistics" or "chart"; a notable quotation → "quote"; a single crucial message → "keyTakeaway"; a new part of the deck → "sectionDivider".
- The title slide (first) must use layout "title". The closing slide (last) must use layout "keyTakeaway" or "title".
- Keep content dense but short: 3-5 bullets max per slide, short phrases not paragraphs, never repeat the source text verbatim.
- Write brief speaker notes (1-3 sentences) for every slide in the "notes" field — these are for the presenter only and never shown on the slide itself.
- Populate only the fields relevant to the chosen layout; leave everything else empty/omitted.
- Overall tone: ${tone}. ${languageLine(language)}
- ${NO_FABRICATION_RULE}

Presentation outline (JSON, one entry per slide — id, slideType, title, summary): ${JSON.stringify(outline.slides.map((s, i) => ({ id: s.id || `slide-${i}`, slideType: s.slideType, title: s.title, summary: s.summary })))}

${sourceText ? `--- SOURCE MATERIAL (use this for facts; do not invent beyond it) ---\n${sourceText.slice(0, MAX_SOURCE_CHARS)}` : 'No source document was provided for this presentation — it was generated from a topic/outline alone, so keep claims general and conservative.'}

Return ONLY JSON matching the required schema — a "slides" array, one object per input slide, same order, using the same "id" values given above.`;
}

function buildSlideAssistantPrompt({ slide, action, deckTone }) {
  const ACTIONS = {
    improve: 'Improve this slide\'s clarity and impact overall — tighten wording, sharpen the message.',
    shorter: 'Make this slide noticeably shorter and punchier without losing the key point.',
    moreProfessional: 'Rewrite this slide in a more formal, professional register.',
    simplify: 'Simplify the language on this slide for a general, non-expert audience.',
    expand: 'Add plausible, relevant detail to this slide, staying strictly within what the existing content implies — never invent new facts.',
    rewrite: 'Rewrite this slide with fresh wording and structure, same underlying facts and layout.',
    improveTitle: 'Rewrite only this slide\'s title to be sharper and more compelling; leave all other fields unchanged.',
    convertToBullets: 'Convert this slide\'s content into a clean bulleted list (layout "titleBullets"), preserving all key facts.',
    createComparison: 'Restructure this slide as a comparison (layout "comparison" or "twoColumn"), if the content supports two sides to compare.',
    createProcessDiagram: 'Restructure this slide as a step-by-step process (layout "process"), if the content describes a sequence.',
    generateNotes: 'Write improved, more useful speaker notes for this slide in the "notes" field; leave all visible slide content unchanged.',
  };
  return `You are editing exactly ONE slide of a presentation with an overall "${deckTone}" tone. ${ACTIONS[action] || ACTIONS.improve}

${NO_FABRICATION_RULE}

Current slide (JSON): ${JSON.stringify(slide)}

Return ONLY JSON for the revised slide, in the same shape, keeping the same "id".`;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === 'outline') {
      const { sourceType, topic, text, images, ...settings } = payload;
      if (sourceType !== 'topic' && (!text || !text.trim()) && (!images || images.length === 0)) {
        return Response.json({ error: 'No usable content received.' }, { status: 400 });
      }
      if (sourceType === 'topic' && (!topic || !topic.trim())) {
        return Response.json({ error: 'Please enter a topic.' }, { status: 400 });
      }
      const trimmedText = text && text.length > MAX_SOURCE_CHARS ? text.slice(0, MAX_SOURCE_CHARS) : text;
      const prompt = buildOutlinePrompt({ sourceType, topic, ...settings });
      const parts = [{ text: `${prompt}${trimmedText ? `\n\n--- SOURCE CONTENT ---\n${trimmedText}` : ''}` }];
      const hasImage = !!(images && images.length);
      if (hasImage) {
        images.slice(0, 10).forEach((img) => parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } }));
      }
      const { parsed } = await callGemini({
        apiKey, toolName: 'generate-presentation:outline', routeName: '/api/generate-presentation', parts,
        schema: outlineSchema, maxOutputTokens: 4096, hasImage, inputSizeApprox: trimmedText?.length || 0,
      });
      return Response.json(parsed);
    }

    if (action === 'slideContent') {
      const { outline, tone, language, sourceText } = payload;
      if (!outline?.slides?.length) {
        return Response.json({ error: 'No outline received.' }, { status: 400 });
      }
      const trimmedSource = sourceText && sourceText.length > MAX_SOURCE_CHARS ? sourceText.slice(0, MAX_SOURCE_CHARS) : sourceText;
      const prompt = buildSlideContentPrompt({ outline, tone, language, sourceText: trimmedSource });
      const { parsed } = await callGemini({
        apiKey, toolName: 'generate-presentation:slide-content', routeName: '/api/generate-presentation', parts: [{ text: prompt }],
        schema: slideContentSchema, maxOutputTokens: 16384, inputSizeApprox: prompt.length,
      });
      return Response.json(parsed);
    }

    if (action === 'slideAssistant') {
      const { slide, assistantAction, deckTone } = payload;
      if (!slide) {
        return Response.json({ error: 'No slide received.' }, { status: 400 });
      }
      const prompt = buildSlideAssistantPrompt({ slide, action: assistantAction, deckTone });
      const { parsed } = await callGemini({
        apiKey, toolName: `generate-presentation:assistant:${assistantAction}`, routeName: '/api/generate-presentation', parts: [{ text: prompt }],
        schema: singleSlideSchema, maxOutputTokens: 2048, inputSizeApprox: prompt.length,
      });
      return Response.json({ slide: parsed });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Presentation generator error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Presentation generator error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
