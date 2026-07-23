
export const runtime = 'nodejs';

import { claimPaymentForNewJob, recordJobCreated } from '@/lib/paymentIdempotency';

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
    const { operation = 'convert', to, profile = 'web', password, paymentReference } = body;

    if (operation === 'convert' && !to) {
      return Response.json({ error: 'Missing target format.' }, { status: 400 });
    }
    if (operation === 'encrypt' && !password) {
      return Response.json({ error: 'Missing password.' }, { status: 400 });
    }

    // Idempotency guard — opt-in via paymentReference, so free tools that
    // never send one (compress-pdf, protect-pdf) are completely unaffected.
    // See lib/paymentIdempotency.js: this is what stops one successful
    // Paystack payment from being able to trigger more than one
    // CloudConvert job, covering double-clicks, refreshes, back/forward
    // navigation, and a directly repeated API request alike, since it's
    // enforced here server-side rather than relying on frontend state.
    if (paymentReference) {
      const { claimed, record } = await claimPaymentForNewJob(paymentReference);
      if (!claimed) {
        if (!record) {
          return Response.json({ error: 'Payment not verified for this conversion.' }, { status: 402 });
        }
        if (record.status === 'completed') {
          return Response.json({ replay: true, jobId: record.jobId, downloadUrl: record.result?.downloadUrl, filename: record.result?.filename });
        }
        if (record.status === 'consumed') {
          return Response.json({ replay: true, jobId: record.jobId });
        }
        // Lost a very tight race for the lock and the winner hasn't written
        // 'consumed' yet — safe to ask the client to retry shortly rather
        // than risk creating a second job.
        return Response.json({ error: 'This conversion is already starting — please wait a moment and try again.' }, { status: 409 });
      }
    }

    const processTask =
      operation === 'optimize'
        ? { operation: 'optimize', input: 'upload-file', input_format: 'pdf', profile }
        : operation === 'encrypt'
        ? {
            // CloudConvert's dedicated PDF encryption task — genuinely sets a
            // user password required to open the file. This can't be done
            // client-side: the pdf-lib version this app uses has no
            // encryption support at all, despite the old implementation
            // silently claiming success.
            operation: 'encrypt',
            input: 'upload-file',
            input_format: 'pdf',
            set_password: password,
          }
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

    if (paymentReference) {
      await recordJobCreated(paymentReference, job.data.id);
    }

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
