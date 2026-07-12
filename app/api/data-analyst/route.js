export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const NO_FABRICATION_RULE = 'You are given pre-computed statistics that are already correct — never recalculate, second-guess, or invent different numbers for totals, averages, counts, min/max, or any other figure. Only use the exact numbers provided. If something can\'t be determined from the given data, say so rather than guessing.';


// V1 scope deliberately excludes forecasting, anomaly detection, and
// period-comparison — these need real statistical modelling, not just an
// LLM call, and were explicitly deferred to a later version.
const analysisSchema = {
  type: 'OBJECT',
  properties: {
    executiveSummary: { type: 'STRING' },
    keyFindings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          finding: { type: 'STRING' },
          evidence: { type: 'STRING' },
          businessImplication: { type: 'STRING' },
          evidenceType: { type: 'STRING' }, // Observed | Estimated | Suggested
        },
        required: ['finding', 'evidence', 'businessImplication', 'evidenceType'],
      },
    },
    rootCauseObservations: { type: 'ARRAY', items: { type: 'STRING' } },
    risks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' }, // Operational | Financial | Compliance | Quality | Customer | Safety | Reputational
          description: { type: 'STRING' },
          likelihood: { type: 'STRING' }, // High | Medium | Low
          impact: { type: 'STRING' }, // High | Medium | Low
          evidence: { type: 'STRING' },
        },
        required: ['category', 'description', 'likelihood', 'impact', 'evidence'],
      },
    },
    opportunities: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          priority: { type: 'STRING' }, // High | Medium | Low
          whyItMatters: { type: 'STRING' },
        },
        required: ['description', 'priority', 'whyItMatters'],
      },
    },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          recommendation: { type: 'STRING' },
          evidence: { type: 'STRING' },
          impact: { type: 'STRING' }, // High | Medium | Low
          effort: { type: 'STRING' }, // High | Medium | Low
          priority: { type: 'STRING' }, // Immediate | Near-term | Long-term
          owner: { type: 'STRING' }, // "To be assigned" if not inferable
        },
        required: ['recommendation', 'evidence', 'impact', 'effort', 'priority', 'owner'],
      },
    },
    actionPlan: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          priority: { type: 'STRING' },
          action: { type: 'STRING' },
          owner: { type: 'STRING' }, // "To be assigned" if not inferable
          timeline: { type: 'STRING' }, // "To be assigned" if not inferable
          successMeasure: { type: 'STRING' },
        },
        required: ['priority', 'action', 'owner', 'timeline', 'successMeasure'],
      },
    },
    confidenceStatement: {
      type: 'OBJECT',
      properties: {
        level: { type: 'STRING' }, // High | Medium | Low
        reasoning: { type: 'STRING' },
      },
      required: ['level', 'reasoning'],
    },
    conclusion: { type: 'STRING' },
  },
  required: ['executiveSummary', 'keyFindings', 'risks', 'opportunities', 'recommendations', 'actionPlan', 'confidenceStatement', 'conclusion'],
};

// Rows come back as arrays-of-strings aligned to `columns` by position,
// rather than objects with dynamic keys — Gemini's structured-output schema
// needs fixed property names, and column names vary per dataset, so this
// sidesteps that entirely. Zipped into column-keyed objects after parsing.
const extractionSchema = {
  type: 'OBJECT',
  properties: {
    columns: { type: 'ARRAY', items: { type: 'STRING' } },
    rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } },
  },
  required: ['columns', 'rows'],
};

const understandingSchema = {
  type: 'OBJECT',
  properties: {
    datasetType: { type: 'STRING' },
    industry: { type: 'STRING' },
    businessProcess: { type: 'STRING' },
    description: { type: 'STRING' },
    potentialKPIs: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'NUMBER' },
    clarifyingQuestion: { type: 'STRING' },
  },
  required: ['datasetType', 'industry', 'businessProcess', 'description', 'potentialKPIs', 'confidence'],
};

function buildUnderstandingPrompt({ columns, stats, sampleRows, rowCount }) {
  return `You are looking at a business dataset for the first time. Based ONLY on the column names, their detected types, and the sample rows below, infer what this dataset represents. Never invent details not supportable by what's actually shown.

This must work across ANY industry — do not default to manufacturing-specific assumptions unless the data genuinely points there. Use whatever terminology naturally fits this specific dataset (e.g. sales data uses "region/salesperson/revenue" language, education data uses "student/grade/attendance" language, healthcare uses "patient/department/outcome" language, and so on) — infer the right vocabulary from what's actually in front of you.

Columns and detected types: ${JSON.stringify(Object.fromEntries(columns.map((c) => [c, stats[c]?.type || 'unknown'])))}
Row count: ${rowCount}
Sample rows: ${JSON.stringify(sampleRows.slice(0, 10))}

Provide:
- datasetType: a short name for what this dataset is (e.g. "Packaging Non-Conformance Tracker", "Regional Sales Performance Log")
- industry: the likely business area/sector this belongs to
- businessProcess: the specific business process this data supports (e.g. "Packaging Quality Management", "Regional Sales Performance Tracking") — more specific than industry
- description: one plain-English sentence describing what this dataset appears to be
- potentialKPIs: 2-5 column names (exact names from the list above) that would make meaningful KPIs for this dataset — empty array if nothing clear stands out, don't force it
- confidence: your confidence in this inference, as a number from 0-100, based on how clear and unambiguous the column names and sample data are
- clarifyingQuestion: if confidence is below 70, one short specific question that would help clarify what this dataset is about — otherwise leave as an empty string

Return ONLY JSON matching the schema.`;
}

const OBJECTIVE_FOCUS = {
  'Executive Management Report': 'Focus on KPIs, business impact, and strategic priorities. Management wants the headline story, not a data dump.',
  'Performance Comparison': 'Focus on rankings, comparisons, and variance between categories.',
  'Operational Analysis': 'Focus on efficiency, frequency of issues, and exceptions.',
  'Root Cause Analysis': 'Focus on patterns, likely drivers, and recurring issues. Emphasize the root-cause observations section.',
  'Audit / Compliance Report': 'Focus on missing records, exceptions, and compliance gaps.',
  'Trend Analysis': 'Focus on how key measures have changed over time.',
  'Dashboard View': 'Write concise insights suitable for cards and tooltips — short, scannable, not paragraph-length.',
  'Let AI Decide': 'Use your judgment on what this dataset most needs — KPIs and business impact if unsure.',
};

function buildAnalysisPrompt({ understanding, objective, health, kpis, chartSummaries, columns, stats, qualityWarnings, rowCount }) {
  const focusLine = OBJECTIVE_FOCUS[objective] || OBJECTIVE_FOCUS['Let AI Decide'];
  const industryLine = understanding?.industry ? `Industry/business context: ${understanding.industry}${understanding.businessProcess ? ` — ${understanding.businessProcess}` : ''}.` : '';

  return `You are a senior partner at a top-tier management consultancy (McKinsey / BCG / Bain / Deloitte calibre) delivering an executive intelligence report. Every number below has ALREADY been calculated by the application — your job is interpretation, storytelling, and decision support, not arithmetic. Write the way a senior partner actually writes: direct, specific, confident, zero filler.

${NO_FABRICATION_RULE}
Never recalculate, re-derive, or second-guess any of the numbers provided below — treat them as ground truth and only interpret them.
Never claim statistical significance unless it's directly evidenced by the numbers given.
Never imply causation from correlation — use hedged language ("may indicate", "suggests", "appears consistent with", "could be associated with"), never "caused by" or "definitely due to".
Never reference a chart that isn't in the chart summaries below.
Clearly distinguish observed facts from anything estimated or suggested.
Tone: professional, executive, evidence-based, sector-neutral — never exaggerated or marketing-flavored.

BANNED PHRASES — a senior consultant does not write these, so neither do you. Never use any of: "notably higher/lower than the rest", "disproportionate(ly)", "widest margin", "meaningfully", "significantly" (unless immediately followed by the actual number that makes it significant), "visible relationship", "non-trivial", "warrants the closest look/review" (vary this every time it applies), "heavily concentrated", "wide margin". If you catch yourself reaching for one of these, replace it with the specific number itself or a sharper, more concrete phrase.

NO REPETITION ACROSS THE REPORT — this is as important as factual accuracy:
- No two key findings may make the same underlying point in different words.
- No two recommendations may address the same problem — if two ideas are really one idea, merge them into one stronger recommendation instead of listing both.
- Do not open multiple findings, risks, or recommendations with the same sentence structure (e.g. do not start three items in a row with "[Category] shows..." or "The data indicates..."). Vary sentence openings deliberately.
- Do not use the same transition word or concluding phrase more than once across the whole report (e.g. if you write "As a result" once, do not write it again — find a different way to connect ideas the second time).
- The conclusion must add something the executive summary did not already say — never restate it in slightly different words.

${industryLine}
Selected objective: ${objective}. ${focusLine}
Dataset: ${rowCount} rows, columns: ${columns.join(', ')} (types: ${JSON.stringify(Object.fromEntries(columns.map((c) => [c, stats[c]?.type])))})

Dataset health: ${JSON.stringify(health)}
${qualityWarnings?.length ? `Known data quality issues: ${qualityWarnings.join('; ')}` : 'No significant data quality issues detected.'}

KPIs already computed:
${JSON.stringify(kpis, null, 2)}

Charts already generated (with their pre-computed key numbers — do not invent chart data beyond this):
${JSON.stringify(chartSummaries, null, 2)}

Write the following, all evidence-based and grounded only in the numbers above:

- executiveSummary: maximum 150 words, and it must clearly answer three things in this order: what happened (the single most important fact), why it matters (the business consequence, not just the number restated), and what management should do first. No chart labels, no bare number-listing, no generic scene-setting sentence before getting to the point — open directly with the finding itself.
- keyFindings: 3-7 items. Each finding must be a genuinely distinct point — if two findings would say roughly the same thing, cut one or merge them. Each has a finding (the specific observation, in a sentence structure different from the other findings), evidence (the specific number(s) behind it), businessImplication (a concrete consequence for the business — never a vague statement like "this could matter" or "this warrants attention"; say specifically what changes if this is true), and evidenceType: "Observed" if it's a direct fact from the computed statistics, "Estimated" if it involves some inference beyond the raw numbers, or "Suggested" if it's a possibility worth investigating rather than a firm conclusion.
- rootCauseObservations: probable root-cause observations, ONLY when genuinely supported by the evidence above — use hedged language, never assert causation. Empty array if the objective isn't Root Cause Analysis or if there's nothing evidence-backed to say.
- risks: identify real risks from categories [Operational, Financial, Compliance, Quality, Customer, Safety, Reputational] that the data actually supports — each with description, likelihood (High/Medium/Low), impact (High/Medium/Low), and the specific evidence behind it. Each risk must be a distinct concern, not a rephrasing of a key finding. Empty array if none are genuinely supported.
- opportunities: improvement opportunities, each with a priority (High/Medium/Low) and why it matters — state the actual upside, not just "this is an opportunity to improve X". Empty array if none stand out.
- recommendations: each one is a single crisp sentence that itself states the concrete action to take AND the expected benefit of taking it (e.g. "Shift 15% of Line 3's volume to Line 5 during peak hours to reduce the defect rate currently concentrated on Line 3" — not "Investigate Line 3 issues"). Never write a recommendation that is just "look into X" or "review Y" — say what should specifically change. Each also has evidence (linked to a specific finding/number), impact (High/Medium/Low), effort (High/Medium/Low), priority (Immediate/Near-term/Long-term), and owner — use "To be assigned" for owner if there's genuinely no way to infer one from the data, never fabricate a name or team. No two recommendations may target the same underlying problem.
- actionPlan: a short implementation plan — priority, action, owner ("To be assigned" if not inferable), timeline ("To be assigned" if not inferable), successMeasure. Each action plan row should correspond to a specific recommendation, not restate it word-for-word — phrase it as the concrete next step to execute that recommendation.
- confidenceStatement: level (High/Medium/Low) and reasoning — base this on the dataset health, row count, missing values, and whether the selected objective is actually well-supported by this data. Do not overstate confidence on a small or messy dataset.
- conclusion: 1-2 sentences that add a genuinely new closing thought — not a restatement of the executive summary or the top finding.

Return ONLY JSON matching the schema — no extra commentary.`;
}

const ROLE_FRAMING = {
  'CEO': 'Speak to a CEO — strategic, brief, focused on business outcomes and what decision is needed.',
  'Operations Manager': 'Speak to an Operations Manager — practical, process-focused, concrete on what to change day-to-day.',
  'Quality Manager': 'Speak to a Quality Manager — precise, focused on root causes, defects, and corrective actions.',
  'Finance Director': 'Speak to a Finance Director — focused on cost, margin, and financial impact where the data supports it.',
  'HR Manager': 'Speak to an HR Manager — focused on people, attendance, retention, and workforce implications.',
  'Sales Manager': 'Speak to a Sales Manager — focused on performance, targets, and what drives results.',
  'Board Presentation': 'Write as if for a board presentation — formal, high-level, strategic framing, no operational detail.',
  'Frontline Team': 'Speak to a frontline team — simple, direct, actionable, no executive jargon.',
};

const TRANSFORM_INSTRUCTIONS = {
  'Summarize in 50 words': 'Summarize the report in exactly around 50 words. No new analysis — condense what already exists.',
  'Create speaker notes': 'Write speaker notes a presenter could read aloud while showing this report — natural spoken language, not bullet fragments.',
  'Generate meeting talking points': 'Produce a short list of talking points for a meeting discussing this report — concise, one idea per point.',
  'Rewrite as an email': 'Rewrite the key findings and recommendations as a professional email, with a subject line, that could be sent as-is.',
  'Rewrite as a memo': 'Rewrite as a formal internal memo — header (To/From/Date/Re), then body.',
  'Create a one-minute briefing': 'Write a briefing that takes about one minute to read aloud — the absolute essentials only.',
  'Create FAQs': 'Generate a short FAQ (3-5 questions) that a reader of this report would likely ask, answered using only the existing findings.',
  'Generate action checklist': 'Turn the recommendations and action plan into a simple checklist format, one line per action.',
};

function buildChatPrompt({ question, history, understanding, objective, health, kpis, chartSummaries, analysis, role, transformType, columns, stats, sampleRows, rowCount }) {
  const historyBlock = history?.length
    ? `Conversation so far (most recent last — use this to resolve references like "it" or "that" to what was actually discussed):\n${history.map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`).join('\n')}\n`
    : '';

  const roleLine = role && ROLE_FRAMING[role] ? `${ROLE_FRAMING[role]} The underlying facts must not change — only the framing and language.` : 'Write in clear, professional business language.';
  const transformLine = transformType && TRANSFORM_INSTRUCTIONS[transformType] ? `\nSPECIAL INSTRUCTION: ${TRANSFORM_INSTRUCTIONS[transformType]} This is a transformation of existing content, not new analysis — do not introduce any finding, number, or claim that isn't already in the report context below.` : '';

  return `You are the analyst who produced this report, continuing the conversation with the person who commissioned it. You already know everything about this dataset and analysis below — never ask them to re-explain the file, industry, objective, or KPIs, and never re-derive numbers that are already given.

${NO_FABRICATION_RULE}
Never invent facts outside what's in the report context or the dataset sample below. If a question genuinely can't be answered from what you have, say so plainly and suggest what additional data would help answer it — do not guess.
${roleLine}
${transformLine}

REPORT CONTEXT (already known — do not ask the user to restate any of this):
Dataset: ${understanding?.datasetType || 'Uploaded dataset'} — ${understanding?.industry || ''} ${understanding?.businessProcess ? `(${understanding.businessProcess})` : ''}
Selected objective: ${objective}
Dataset health: ${JSON.stringify(health)}
KPIs: ${JSON.stringify(kpis)}
Executive summary: ${analysis?.executiveSummary || ''}
Key findings: ${JSON.stringify(analysis?.keyFindings || [])}
Risks: ${JSON.stringify(analysis?.risks || [])}
Opportunities: ${JSON.stringify(analysis?.opportunities || [])}
Recommendations: ${JSON.stringify(analysis?.recommendations || [])}
Action plan: ${JSON.stringify(analysis?.actionPlan || [])}
Charts already generated: ${JSON.stringify(chartSummaries || [])}

Full dataset stats: ${JSON.stringify(stats)}
Sample rows (for row-level follow-up questions, e.g. comparisons not already pre-aggregated above): ${JSON.stringify((sampleRows || []).slice(0, 20))}
Total rows in dataset: ${rowCount}

${historyBlock}
Current question: "${question}"

Answer in plain language, no markdown formatting, 2-5 sentences unless a transformation or list format is specifically requested above. When your answer rests on a specific finding or number, reference it briefly so the answer feels grounded, not generic.`;
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Retries transient failures automatically (rate limits, momentary server
// errors, network blips) before ever showing the user an error — this is
// what makes the difference between "it just works after a short pause"
// and "it fails and the person has to click try again."
async function callGemini(apiKey, parts, schema) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema } : { maxOutputTokens: 1024 },
  };
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(`Gemini data-analyst error (attempt ${attempt}/${maxAttempts}):`, data);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('gemini_error');
      }

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        if (attempt < maxAttempts) { await sleep(700 * attempt); continue; }
        throw new Error('empty_response');
      }
      return raw;
    } catch (err) {
      lastError = err;
      const isKnownFinalError = err.message === 'gemini_error' || err.message === 'empty_response';
      if (!isKnownFinalError && attempt < maxAttempts) { await sleep(700 * attempt); continue; } // network-level failure — also worth retrying
      if (attempt === maxAttempts) throw lastError;
    }
  }
  throw lastError;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === 'understand') {
      const { columns, stats, sampleRows, rowCount } = payload;
      if (!columns?.length || !sampleRows?.length) {
        return Response.json({ error: 'No usable data received.' }, { status: 400 });
      }
      const prompt = buildUnderstandingPrompt({ columns, stats, sampleRows, rowCount });
      const raw = await callGemini(apiKey, [{ text: prompt }], understandingSchema);
      const clean = raw.replace(/```json|```/g, '').trim();
      const understanding = JSON.parse(clean);

      // Deterministic confidence ceiling — a small dataset can't genuinely
      // support high confidence no matter how clean the column names look,
      // so this caps the AI's own confidence value rather than trusting its
      // judgment alone on sample size.
      if (typeof understanding.confidence === 'number') {
        if (rowCount < 10) understanding.confidence = Math.min(understanding.confidence, 59);
        else if (rowCount < 20) understanding.confidence = Math.min(understanding.confidence, 79);
      }

      return Response.json(understanding);
    }

    if (action === 'analyze') {
      const { understanding, objective, health, kpis, chartSummaries, columns, stats, qualityWarnings, rowCount } = payload;
      if (!columns?.length || !rowCount) {
        return Response.json({ error: 'No usable data received.' }, { status: 400 });
      }
      const prompt = buildAnalysisPrompt({ understanding, objective, health, kpis, chartSummaries, columns, stats, qualityWarnings, rowCount });
      const raw = await callGemini(apiKey, [{ text: prompt }], analysisSchema);
      const clean = raw.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(clean);
      return Response.json(analysis);
    }

    if (action === 'extractFromImage') {
      const { images } = payload;
      if (!images?.length) return Response.json({ error: 'No image received.' }, { status: 400 });
      const prompt = `Extract the tabular data visible in this image (spreadsheet screenshot, printed report, or table photo) into structured rows and columns. Read every visible value carefully and exactly as shown — never invent or estimate numbers you can't clearly read. If a value is genuinely illegible, use an empty string for that cell rather than guessing.

Return "columns" as the list of column headers, and "rows" as a list of rows — each row is a list of string values in the exact same order as "columns".`;
      const parts = [{ text: prompt }, ...images.map((img) => ({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } }))];
      const raw = await callGemini(apiKey, parts, extractionSchema);
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const extracted = { columns: parsed.columns, rows: parsed.rows.map((r) => Object.fromEntries(parsed.columns.map((c, i) => [c, r[i] ?? '']))) };
      return Response.json(extracted);
    }

    if (action === 'extractFromPdfText') {
      const { text } = payload;
      if (!text?.trim()) return Response.json({ error: 'No text received.' }, { status: 400 });
      const prompt = `The following text was extracted from a PDF that contains one or more tables. Reconstruct the actual tabular structure (columns and rows) from it as accurately as possible — never invent values that aren't present in the text.

TEXT:
${text.slice(0, 50000)}

Return "columns" as the list of column headers, and "rows" as a list of rows — each row is a list of string values in the exact same order as "columns".`;
      const raw = await callGemini(apiKey, [{ text: prompt }], extractionSchema);
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const extracted = { columns: parsed.columns, rows: parsed.rows.map((r) => Object.fromEntries(parsed.columns.map((c, i) => [c, r[i] ?? '']))) };
      return Response.json(extracted);
    }

    if (action === 'chat') {
      const { question, history, understanding, objective, health, kpis, chartSummaries, analysis, role, transformType, columns, stats, sampleRows, rowCount } = payload;
      if (!question?.trim()) return Response.json({ error: 'No question received.' }, { status: 400 });
      const prompt = buildChatPrompt({ question, history, understanding, objective, health, kpis, chartSummaries, analysis, role, transformType, columns, stats, sampleRows, rowCount });
      const answer = await callGemini(apiKey, [{ text: prompt }], false);
      return Response.json({ answer: answer.trim() });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('Data analyst error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
