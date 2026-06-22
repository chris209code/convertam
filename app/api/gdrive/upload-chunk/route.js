export const runtime = 'nodejs';
export const maxDuration = 60;

async function relayChunk(uploadUrl, chunkBuffer, rangeStart, rangeEnd, totalSize, attempt = 1) {
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(chunkBuffer.length),
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
    },
    body: chunkBuffer,
  });

  // 308 = Google has this chunk, send the next one
  if (putRes.status === 308) {
    return { status: 'incomplete' };
  }

  // 200/201 = that was the final chunk, upload complete
  if (putRes.ok) {
    const fileData = await putRes.json();
    return { status: 'complete', fileId: fileData.id };
  }

  // 503/429 = Google is briefly overloaded — retry up to 3 times
  if ((putRes.status === 503 || putRes.status === 429) && attempt < 4) {
    await new Promise((r) => setTimeout(r, attempt * 1000));
    return relayChunk(uploadUrl, chunkBuffer, rangeStart, rangeEnd, totalSize, attempt + 1);
  }

  const errText = await putRes.text();
  console.error('Chunk relay failed:', putRes.status, errText);
  throw new Error('Upload failed partway through. Please try again.');
}export async function POST(request) {
  try {
    const formData = await request.formData();
    const uploadUrl = formData.get('uploadUrl');
    const chunk = formData.get('chunk');
    const rangeStart = Number(formData.get('rangeStart'));
    const rangeEnd = Number(formData.get('rangeEnd'));
    const totalSize = Number(formData.get('totalSize'));

    if (!uploadUrl || !chunk || Number.isNaN(rangeStart) || Number.isNaN(rangeEnd) || Number.isNaN(totalSize)) {
      return Response.json({ error: 'Missing chunk parameters.' }, { status: 400 });
    }

    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    const result = await relayChunk(uploadUrl, chunkBuffer, rangeStart, rangeEnd, totalSize);
    return Response.json(result);
  } catch (err) {
    console.error('upload-chunk error:', err);
    return Response.json({ error: err.message || 'Something went wrong during upload. Please try again.' }, { status: 500 });
  }
}
