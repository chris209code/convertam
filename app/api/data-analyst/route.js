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
    keyFindings: { type: 'ARRAY', items: { type: 'STRING' } },
    insights: { type: 'ARRAY', items: { type: 'STRING' } },
    trends: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
    risks: { type: 'ARRAY', items: { type: 'STRING' } },
    conclusion: { type: 'STRING' },
    suggestedCharts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' }, // bar | line | pie | scatter | histogram
          title: { type: 'STRING' },
          xColumn: { type: 'STRING' },
          yColumn: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['type', 'title', 'xColumn'],
      },
    },
  },
  required: ['executiveSummary', 'keyFindings', 'insights', 'recommendations', 'conclusion'],
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

function buildAnalysisPrompt({ columns, stats, sampleRows, qualityWarnings, intents, industry, rowCount }) {
  const industryLine = industry && industry !== 'General' ? `This data is from a ${industry} context — use terminology and framing appropriate to that field.` : '';
  const intentLine = intents?.length ? `The user specifically asked for: ${intents.join(', ')}.` : '';
  return `You are a business data analyst reviewing a dataset on behalf of a client. Write a clear, professional analysis based ONLY on the real computed statistics and sample rows below — never invent numbers.

${NO_FABRICATION_RULE}
${industryLine}
${intentLine}

Dataset: ${rowCount} rows, columns: ${columns.join(', ')}

Pre-computed column statistics (ground truth — use these exact numbers):
${JSON.stringify(stats, null, 2)}

Sample rows (for context on what the data looks like):
${JSON.stringify(sampleRows.slice(0, 15), null, 2)}

${qualityWarnings?.length ? `Data quality issues already detected: ${qualityWarnings.join('; ')}` : ''}

Write:
- executiveSummary: 2-3 sentences, high-level, for someone with no time to read the full report.
- keyFindings: 3-6 short, concrete findings using the real numbers given.
- insights: 3-6 sentences explaining what the numbers actually mean in plain business language.
- trends: any directional patterns visible in the sample/stats (e.g. "X increases as Y increases") — empty array if nothing meaningful is visible from the given data.
- recommendations: 2-4 practical, actionable suggestions grounded in the findings.
- risks: 1-3 potential concerns or caveats (including anything from the data quality issues above, if relevant) — empty array if none.
- conclusion: 1-2 sentences wrapping up.
- suggestedCharts: 2-4 charts that would best illustrate this data. Only use chart types: bar, line, pie, scatter, histogram. xColumn/yColumn must be exact column names from the list above. Only suggest a chart if the columns genuinely support it (e.g. don't suggest a line chart without a sequential/date-like column).

Return ONLY JSON matching the schema — no extra commentary.`;
}

function buildChatPrompt({ question, columns, stats, sampleRows, rowCount }) {
  return `You are answering a question about a dataset, using ONLY the information given below. ${NO_FABRICATION_RULE}

Dataset: ${rowCount} rows, columns: ${columns.join(', ')}
Pre-computed statistics: ${JSON.stringify(stats)}
Sample rows: ${JSON.stringify(sampleRows.slice(0, 20))}

Question: "${question}"

If the answer genuinely cannot be determined from the statistics and sample given, say so plainly rather than guessing. Answer in 2-4 sentences, plain language, no markdown formatting.`;
}

async function callGemini(apiKey, parts, schema) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema } : { maxOutputTokens: 1024 },
  };
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Gemini data-analyst error:', data);
    throw new Error('gemini_error');
  }
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('empty_response');
  return raw;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This tool is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const { action } = payload;

    if (action === 'analyze') {
      const { columns, stats, sampleRows, qualityWarnings, intents, industry, rowCount } = payload;
      if (!columns?.length || !sampleRows?.length) {
        return Response.json({ error: 'No usable data received.' }, { status: 400 });
      }
      const prompt = buildAnalysisPrompt({ columns, stats, sampleRows, qualityWarnings, intents, industry, rowCount });
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
      const { question, columns, stats, sampleRows, rowCount } = payload;
      if (!question?.trim()) return Response.json({ error: 'No question received.' }, { status: 400 });
      const prompt = buildChatPrompt({ question, columns, stats, sampleRows, rowCount });
      const answer = await callGemini(apiKey, [{ text: prompt }], false);
      return Response.json({ answer: answer.trim() });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('Data analyst error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
