export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
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
      return Response.json({ status: 'incomplete' });
    }

    // 200/201 = that was the final chunk, upload (and conversion) is complete
    if (putRes.ok) {
      const fileData = await putRes.json();
      return Response.json({ status: 'complete', fileId: fileData.id });
    }

    const errText = await putRes.text();
    console.error('Chunk relay failed:', putRes.status, errText);
    return Response.json({ error: 'Upload failed partway through. Please try again.' }, { status: 502 });
  } catch (err) {
    console.error('upload-chunk error:', err);
    return Response.json({ error: 'Something went wrong during upload. Please try again.' }, { status: 500 });
  }
}
