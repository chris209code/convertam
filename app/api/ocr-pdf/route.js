export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'OCR is not configured yet.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return Response.json({ error: 'No file received.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString('base64');
    const mimeType = file.type || 'application/pdf';

    const payload = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: 'Extract ALL text from this document exactly as it appears. Preserve the original structure, paragraphs, and line breaks. Return only the extracted text with no additional commentary.' }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini OCR error:', data);
      return Response.json(
        { error: 'AI could not process that file. Try a clearer image.' },
        { status: 502 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return Response.json(
        { error: 'No text found in the document.' },
        { status: 422 }
      );
    }

    return Response.json({ text });

  } catch (err) {
    console.error('OCR error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
