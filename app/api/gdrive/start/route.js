import { getDriveAccessToken } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const accessToken = await getDriveAccessToken();
    const { filename, sourceMimeType, googleNativeType } = await request.json();

    if (!filename || !sourceMimeType || !googleNativeType) {
      return Response.json({ error: 'Missing upload parameters.' }, { status: 400 });
    }

    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': sourceMimeType,
      },
      body: JSON.stringify({
        name: filename,
        mimeType: googleNativeType, // setting a Google-native mimeType here triggers conversion on upload
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error('Drive upload session init failed:', errText);
      return Response.json({ error: 'Could not start the conversion.' }, { status: 502 });
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      return Response.json({ error: 'Could not get an upload URL from Google.' }, { status: 502 });
    }

    return Response.json({ uploadUrl });
  } catch (err) {
    console.error('gdrive/start error:', err);
    if (err.message === 'MISSING_GOOGLE_CREDENTIALS') {
      return Response.json(
        { error: 'This converter is not configured yet. (Missing Google service account credentials on the server.)' },
        { status: 500 }
      );
    }
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
