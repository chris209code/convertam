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

    const prompt = `You are a professional CV writer. Improve the CV below and return it as a structured JSON object.

STRICT RULES:
- Extract and use ONLY real information from the CV — names, contacts, companies, dates, achievements
- NEVER invent placeholders like [Your Name] or [Your Email]
- If something is missing, omit that field entirely or use an empty string
- Improve language, use strong action verbs, fix grammar and spelling
- Make it ATS-friendly and professional
- Include ALL experience entries, ALL education entries, ALL skills — do not truncate or cut off
- Return the complete CV — never stop mid-way
${jobTitle ? `- Optimize for the role: ${jobTitle}` : ''}

Return ONLY valid JSON in this exact format, nothing else:
{
  "name": "Full name from CV",
  "title": "Professional title or headline",
  "email": "email from CV or empty string",
  "phone": "phone from CV or empty string",
  "location": "location from CV or empty string",
  "linkedin": "linkedin from CV or empty string",
  "summary": "Improved professional summary paragraph",
  "experience": [
    {
      "role": "Job title",
      "company": "Company name",
      "period": "Date range",
      "bullets": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School name",
      "year": "Year"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "certifications": ["Certification 1"]
}

CV TO IMPROVE:
${cvText}`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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
      return Response.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 422 });
    }

    return Response.json({ improved: raw, structured: parsed });
  } catch (err) {
    console.error('CV improver error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
