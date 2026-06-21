import { getDriveAccessToken } from '@/lib/google-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  let accessToken;
  try {
    accessToken = await getDriveAccessToken();
  } catch (err) {
    console.error('gdrive/export auth error:', err);
    return Response.json(
      { error: 'This converter is not configured yet. (Missing Google service account credentials on the server.)' },
      { status: 500 }
    );
  }

  try {
    const { fileId, exportMimeType, filename } = await request.json();

    if (!fileId || !exportMimeType) {
      return Response.json({ error: 'Missing export parameters.' }, { status: 400 });
    }

    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // best-effort cleanup regardless of outcome — don't let leftover files pile up in the service account's storage
    const cleanup = () =>
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((e) => console.error('Drive cleanup failed:', e));

    if (!exportRes.ok) {
      const errText = await exportRes.text();
      console.error('Drive export failed:', errText);
      cleanup();
      return Response.json(
        { error: 'Conversion failed — the file may be too complex, password-protected, or an unsupported variant.' },
        { status: 422 }
      );
    }

    const buffer = await exportRes.arrayBuffer();
    cleanup();

    return new Response(buffer, {
      headers: {
        'Content-Type': exportMimeType,
        'Content-Disposition': `attachment; filename="${filename || 'convertam-converted'}"`,
      },
    });
  } catch (err) {
    console.error('gdrive/export error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

