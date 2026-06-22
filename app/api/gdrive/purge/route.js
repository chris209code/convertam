import { getDriveAccessToken } from '@/lib/google-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

// One-time cleanup endpoint to clear leftover files from the service account's Drive.
// Call this once at: /api/gdrive/purge?secret=convertam-purge-now
// Remove or disable this route after the initial cleanup.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'convertam-purge-now') {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let accessToken;
  try {
    accessToken = await getDriveAccessToken();
  } catch (err) {
    return Response.json({ error: 'Missing credentials.' }, { status: 500 });
  }

  try {
    // List all files in the service account's Drive
    const listRes = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=files(id,name)', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listData = await listRes.json();
    const files = listData.files || [];

    // Delete each one
    let deleted = 0;
    for (const file of files) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      deleted++;
    }

    return Response.json({ success: true, deleted, message: `Cleared ${deleted} files from the service account Drive.` });
  } catch (err) {
    console.error('Purge error:', err);
    return Response.json({ error: 'Purge failed.' }, { status: 500 });
  }
}
