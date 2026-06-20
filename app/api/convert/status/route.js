export const runtime = 'nodejs';

const CLOUDCONVERT_BASE = 'https://api.cloudconvert.com/v2';

export async function GET(request) {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'This converter is not configured yet.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return Response.json({ error: 'Missing jobId.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLOUDCONVERT_BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: 'Could not check conversion status.' }, { status: 502 });
    }

    const status = data.data.status;

    if (status === 'finished') {
      const exportTask = data.data.tasks.find((t) => t.name === 'export-file');
      const file = exportTask.result.files[0];
      return Response.json({
        status: 'finished',
        downloadUrl: file.url,
        filename: file.filename,
      });
    }

    if (status === 'error') {
      const failedTask = data.data.tasks.find((t) => t.status === 'error');
      return Response.json({
        status: 'error',
        error:
          failedTask?.message ||
          'Conversion failed — the file may be corrupted, password-protected, or an unsupported variant.',
      });
    }

    return Response.json({ status: 'processing' });
  } catch (err) {
    console.error('Status check error:', err);
    return Response.json({ error: 'Something went wrong checking status.' }, { status: 500 });
  }
}
