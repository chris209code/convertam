
export const runtime = 'nodejs';

const CLOUDCONVERT_BASE = 'https://api.cloudconvert.com/v2';

export async function POST(request) {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'This converter is not configured yet. (Missing CLOUDCONVERT_API_KEY on the server.)' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { operation = 'convert', to, profile = 'web' } = body;

    if (operation === 'convert' && !to) {
      return Response.json({ error: 'Missing target format.' }, { status: 400 });
    }

    const processTask =
      operation === 'optimize'
        ? { operation: 'optimize', input: 'upload-file', input_format: 'pdf', profile }
        : { operation: 'convert', input: 'upload-file', output_format: to };

    const jobRes = await fetch(`${CLOUDCONVERT_BASE}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'upload-file': { operation: 'import/upload' },
          'process-file': processTask,
          'export-file': { operation: 'export/url', input: 'process-file' },
        },
      }),
    });

    const job = await jobRes.json();
    if (!jobRes.ok) {
      console.error('CloudConvert job creation failed:', job);
      return Response.json({ error: 'Could not start the conversion. Please try again.' }, { status: 502 });
    }

    const uploadTask = job.data.tasks.find((t) => t.name === 'upload-file');

    return Response.json({
      jobId: job.data.id,
      uploadUrl: uploadTask.result.form.url,
      uploadParameters: uploadTask.result.form.parameters,
    });
  } catch (err) {
    console.error('Start convert error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
