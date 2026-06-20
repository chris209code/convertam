export async function runCloudConvertJob({ file, operation = 'convert', to, profile, onStatus }) {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File is larger than the 100MB limit.');
  }

  // 1. Ask our server to start a job — returns a direct upload URL, no file bytes sent yet
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

  // 2. Upload the file straight from the browser to CloudConvert — bypasses our server entirely
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

  // 3. Poll our server (small JSON only) until the conversion finishes
  onStatus?.('Converting…');
  let result = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await fetch(`/api/convert/status?jobId=${startData.jobId}`);
    const statusData = await statusRes.json();

    if (statusData.status === 'finished') {
      result = statusData;
      break;
    }
    if (statusData.status === 'error') {
      throw new Error(statusData.error || 'Conversion failed.');
    }
  }
  if (!result) {
    throw new Error('Conversion is taking longer than expected. Please try again, or try a smaller file.');
  }

  // 4. Download the finished file directly from CloudConvert — again bypassing our server
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
