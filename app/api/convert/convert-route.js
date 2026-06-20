export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const formData = await request.formData();
    const file = formData.get('file');
    const operation = formData.get('operation') || 'convert';
    const outputFormat = formData.get('to');
    const profile = formData.get('profile') || 'web';

    if (!file) {
      return Response.json({ error: 'Missing file.' }, { status: 400 });
    }
    if (operation === 'convert' && !outputFormat) {
      return Response.json({ error: 'Missing target format.' }, { status: 400 });
    }

    if (file.size > 100 * 1024 * 1024) {
      return Response.json({ error: 'File is larger than the 100MB limit.' }, { status: 413 });
    }

    const processTask =
      operation === 'optimize'
        ? {
            operation: 'optimize',
            input: 'upload-file',
            input_format: 'pdf',
            profile,
          }
        : {
            operation: 'convert',
            input: 'upload-file',
            output_format: outputFormat,
          };

    // 1. Create a conversion job
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
          'export-file': {
            operation: 'export/url',
            input: 'process-file',
          },
        },
      }),
    });

    const job = await jobRes.json();
    if (!jobRes.ok) {
      console.error('CloudConvert job creation failed:', job);
      return Response.json({ error: 'Could not start the conversion. Please try again.' }, { status: 502 });
    }

    const uploadTask = job.data.tasks.find((t) => t.name === 'upload-file');
    const uploadForm = uploadTask.result.form;

    // 2. Push the actual file bytes to CloudConvert's upload URL
    const uploadBody = new FormData();
    Object.entries(uploadForm.parameters).forEach(([key, value]) => {
      uploadBody.append(key, value);
    });
    uploadBody.append('file', file, file.name);

    const uploadRes = await fetch(uploadForm.url, { method: 'POST', body: uploadBody });
    if (!uploadRes.ok) {
      return Response.json({ error: 'Upload to the conversion engine failed.' }, { status: 502 });
    }

    // 3. Poll until the job finishes (capped to avoid hanging forever)
    const jobId = job.data.id;
    let finishedJob = null;
    const maxAttempts = 45;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(`${CLOUDCONVERT_BASE}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const statusJob = await statusRes.json();
      const status = statusJob.data.status;

      if (status === 'finished') {
        finishedJob = statusJob.data;
        break;
      }
      if (status === 'error') {
        return Response.json(
          { error: "Conversion failed on that file — it may be corrupted, password-protected, or an unsupported variant." },
          { status: 422 }
        );
      }
    }

    if (!finishedJob) {
      return Response.json(
        { error: 'Conversion is taking longer than expected. Please try again, or try a smaller file.' },
        { status: 504 }
      );
    }

    const exportTask = finishedJob.tasks.find((t) => t.name === 'export-file');
    const resultFile = exportTask.result.files[0];

    // 4. Fetch the converted file and stream it straight back to the visitor
    const fileRes = await fetch(resultFile.url);
    const fileBuffer = await fileRes.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': resultFile.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${resultFile.filename}"`,
      },
    });
  } catch (err) {
    console.error('Convert route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
