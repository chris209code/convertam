async function pollForCompletion({ jobId, paymentReference, onStatus }) {
  onStatus?.('Converting… large files may take a few minutes, please wait.');
  let result = null;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const qs = new URLSearchParams({ jobId });
      if (paymentReference) qs.set('paymentReference', paymentReference);
      const statusRes = await fetch(`/api/convert/status?${qs.toString()}`);
      const statusData = await statusRes.json();
      if (statusData.status === 'finished') {
        result = statusData;
        break;
      }
      if (statusData.status === 'error') {
        throw new Error(statusData.error || 'Conversion failed.');
      }
      // Update status message with attempt count
      if (i > 0 && i % 10 === 0) {
        onStatus?.(`Still converting… (${Math.round(i * 2 / 60)} min elapsed, please wait)`);
      }
    } catch (err) {
      if (err.message.includes('Conversion failed')) throw err;
      // Network hiccup — keep polling
    }
  }
  if (!result) {
    throw new Error('Conversion is taking longer than expected. Please try again with a smaller file.');
  }
  return result;
}

// paymentReference is optional — only the paid Office Convert tools
// (pdf-to-word, word-to-pdf, etc.) pass one; free tools (compress-pdf,
// protect-pdf) call this without it and are completely unaffected.
//
// When a reference is provided, the server may respond with `replay: true`
// instead of a fresh job — see app/api/convert/start/route.js and
// lib/paymentIdempotency.js: this means the same payment already produced
// a job, so this call skips uploading the file again (it was already
// uploaded for the original job) and either downloads the already-
// completed result directly, or resumes polling the existing job.
export async function runCloudConvertJob({ file, operation = 'convert', to, profile, password, paymentReference, onStatus }) {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File is larger than the 100MB limit.');
  }

  onStatus?.('Starting…');
  const startRes = await fetch('/api/convert/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, to, profile, password, paymentReference }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) {
    throw new Error(startData.error || 'Could not start the conversion.');
  }

  let result;
  if (startData.replay && startData.downloadUrl) {
    // This payment already completed a conversion — nothing new to upload
    // or wait for, just hand back the existing result.
    result = { downloadUrl: startData.downloadUrl, filename: startData.filename };
  } else if (startData.replay) {
    // This payment already has a job in progress — resume polling it
    // instead of starting (and re-uploading for) a new one.
    result = await pollForCompletion({ jobId: startData.jobId, paymentReference, onStatus });
  } else {
    onStatus?.('Uploading…');
    const uploadBody = new FormData();
    Object.entries(startData.uploadParameters).forEach(([key, value]) => {
      uploadBody.append(key, value);
    });
    uploadBody.append('file', file, file.name);
    const uploadRes = await fetch(startData.uploadUrl, { method: 'POST', body: uploadBody });
    if (!uploadRes.ok) {
      throw new Error('Upload failed. Please try again.');
    }
    result = await pollForCompletion({ jobId: startData.jobId, paymentReference, onStatus });
  }

  onStatus?.('Downloading…');
  const fileRes = await fetch(result.downloadUrl);
  const blob = await fileRes.blob();
  return { blob, filename: result.filename };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
