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

    const prompt = `You are a professional CV writer. Read the CV below and return a single valid JSON object.

Important rules:
- Use ONLY real information from the CV — never use placeholders like [Your Name]
- If a field is missing from the CV, use "" for strings and [] for arrays
- Improve the language: use strong action verbs, fix grammar, make it ATS-friendly
- Include ALL experience and education entries — do not truncate
- Return ONLY the JSON object with no markdown, no code blocks, no explanation
${jobTitle ? `- Optimize for the role: ${jobTitle}` : ''}

JSON structure to return:
{
  "name": "full name from CV",
  "title": "job title or headline",
  "email": "email from CV",
  "phone": "phone from CV",
  "location": "location from CV",
  "linkedin": "linkedin from CV or empty string",
  "summary": "improved professional summary",
  "experience": [{"role": "job title", "company": "company", "period": "dates", "bullets": ["achievement 1", "achievement 2"]}],
  "education": [{"degree": "degree", "institution": "school", "year": "year"}],
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1"]
}

CV to improve:
${cvText}`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 65536,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return Response.json({ error: 'AI could not process your CV. Please try again.' }, { status: 502 });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!raw) {
      return Response.json({ error: 'No response from AI. Please try again.' }, { status: 422 });
    }

    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return Response.json({ error: 'AI could not format the response. Please try again.' }, { status: 422 });
    }

    return Response.json({ improved: raw, structured: parsed });
  } catch (err) {
    console.error('CV improver error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
