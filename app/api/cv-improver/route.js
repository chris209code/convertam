export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI service not configured.' }, { status: 500 });
  }
  try {
    const { cvText, jobTitle } = await request.json();
    if (!cvText?.trim()) {
      return Response.json({ error: 'No CV text provided.' }, { status: 400 });
    }

    const prompt = `You are a professional CV writer and career coach with 20 years of experience. 
Your task is to improve the following CV to make it more professional, impactful, and ATS-friendly.

${jobTitle ? `The person is targeting a role as: ${jobTitle}` : ''}

Instructions:
- Fix grammar, spelling, and punctuation
- Use strong action verbs (Led, Managed, Developed, Achieved, etc.)
- Quantify achievements where possible
- Make the language more professional and impactful
- Improve the structure and flow
- Keep all the original information — do not invent new facts
- Format it cleanly with proper sections
- Return ONLY the improved CV text, no explanations or commentary

CV to improve:
${cvText}`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: 'AI could not process your CV. Please try again.' }, { status: 502 });
    }

    const improved = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!improved) {
      return Response.json({ error: 'No response from AI. Please try again.' }, { status: 422 });
    }

    return Response.json({ improved });
  } catch (err) {
    console.error('CV improver error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
