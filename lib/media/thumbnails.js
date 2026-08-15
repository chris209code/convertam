// Filmstrip thumbnail extraction — decodes frames from a video file at
// evenly-spaced timestamps via an offscreen <video> + canvas, returning an
// array of data URLs spanning the whole source. Pure client-side, no
// dependency; the same "seek + drawImage" pattern already used for the
// timeline preview and the composed export's decode-forcing hack.
//
// Extracted once per SOURCE (not per clip) — a clip strip picks the subset
// of these that falls within its own trim range rather than re-decoding on
// every trim adjustment, which would make dragging trim handles feel slow.

export async function extractThumbnails(file, count = 10, thumbWidth = 120) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read this video for thumbnails.'));
    });
    const duration = video.duration || 0;
    const thumbHeight = Math.max(1, Math.round(thumbWidth * ((video.videoHeight || 9) / (video.videoWidth || 16))));
    const canvas = document.createElement('canvas');
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;
    const ctx = canvas.getContext('2d');
    const thumbs = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? (duration * i) / (count - 1) : 0;
      await new Promise((resolve) => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.min(Math.max(0, duration - 0.05), Math.max(0, t));
      });
      ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
      thumbs.push(canvas.toDataURL('image/jpeg', 0.55));
    }
    return { thumbs, duration };
  } finally {
    URL.revokeObjectURL(url);
    video.src = '';
  }
}

// Picks the thumbnails (from extractThumbnails' full-source array) that
// fall within [sourceStart, sourceEnd] — used to show only the relevant
// slice of the filmstrip on a trimmed clip's strip, without re-extracting.
export function thumbnailsForRange(thumbs, sourceDuration, sourceStart, sourceEnd) {
  if (!thumbs?.length || !sourceDuration) return thumbs?.length ? [thumbs[0]] : [];
  const n = thumbs.length;
  const startIdx = Math.floor((sourceStart / sourceDuration) * (n - 1));
  const endIdx = Math.ceil((sourceEnd / sourceDuration) * (n - 1));
  const slice = thumbs.slice(Math.max(0, startIdx), Math.min(n, endIdx + 1));
  return slice.length ? slice : [thumbs[Math.min(n - 1, Math.max(0, startIdx))]];
}
