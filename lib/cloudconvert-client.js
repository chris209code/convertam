export async function runCloudConvertJob({ file, operation = 'convert', to, profile, onStatus }) {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File is larger than the 100MB limit.');
  }

  onStatus?.('Starting…');
  const startRes = await fetch('/api/convert/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, to, profile }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) {
    throw new Error(startData.error || 'Could not start the conversion.');
  }

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

  onStatus?.('Converting… large files may take a few minutes, please wait.');
  let result = null;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const statusRes = await fetch(`/api/convert/status?jobId=${startData.jobId}`);
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
