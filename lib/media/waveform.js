// Waveform peak extraction — decodes audio via Web Audio and reduces it to
// a fixed-length array of per-bucket peak amplitudes for canvas rendering
// (the audio player's waveform strip, and videoCompose.js's audiogram
// visual). Pure client-side, no dependency.

import { decodeAudioFile } from './audioEncode';

export async function extractWaveformPeaks(file, peaksCount = 200) {
  const audioBuffer = await decodeAudioFile(file);
  const channelData = audioBuffer.getChannelData(0);
  const bucketSize = Math.max(1, Math.floor(channelData.length / peaksCount));
  const peaks = new Array(peaksCount).fill(0);

  for (let i = 0; i < peaksCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(channelData.length, start + bucketSize);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }

  return peaks;
}

// Draws a simple centered-bar waveform onto a canvas 2D context — shared by
// the audio player's waveform strip and videoCompose.js's audiogram frame,
// so both look identical rather than being two separate implementations.
export function drawWaveform(ctx, peaks, { x, y, width, height, color = '#0891B2', progress = null }) {
  if (!peaks?.length) return;
  const barWidth = width / peaks.length;
  const gap = Math.max(1, barWidth * 0.25);
  const activeCount = progress != null ? Math.floor(peaks.length * progress) : peaks.length;

  peaks.forEach((peak, i) => {
    const barHeight = Math.max(2, peak * height);
    const barX = x + i * barWidth;
    const barY = y + (height - barHeight) / 2;
    ctx.fillStyle = i < activeCount ? color : `${color}55`;
    ctx.fillRect(barX, barY, Math.max(1, barWidth - gap), barHeight);
  });
}
