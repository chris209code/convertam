export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPTS = {
  summary: `You are a document summarizer. Read the following document text and provide:
1. A brief overview (2-3 sentences)
2. Key points (5-7 bullet points)
3. Main conclusions or takeaways

Be concise and clear. Use plain English.`,

  keypoints: `You are a document analyst. Extract only the most important facts, figures, dates, names, and decisions from the following document. Present them as a clean numbered list. Be brief and factual.`,

  simplify: `You are a plain language expert. Rewrite the following document in simple, everyday English that anyone can understand. Remove legal jargon, technical terms, and complex sentences. Keep all the important information but make it easy to read.`,
};

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }

  try {
    const { text, mode } = await request.json();

    if (!text || !text.trim()) {
      return Response.json({ error: 'No text received from PDF.' }, { status: 400 });
    }

    if (!PROMPTS[mode]) {
      return Response.json({ error: 'Invalid mode.' }, { status: 400 });
    }

    // Limit text to avoid token limits — ~50,000 chars covers most documents
    const truncated = text.length > 50000 ? text.slice(0, 50000) + '\n\n[Document truncated due to length]' : text;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${PROMPTS[mode]}\n\n---\n\n${truncated}` }],
        }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Gemini summarize error:', data);
      return Response.json({ error: 'AI could not process this document. Please try again.' }, { status: 502 });
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) {
      return Response.json({ error: 'No response from AI. Please try again.' }, { status: 422 });
    }

    return Response.json({ result });
  } catch (err) {
    console.error('Summarize PDF error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
