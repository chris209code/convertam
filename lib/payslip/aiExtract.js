// Client-side caller for the payslip AI-extraction fallback
// (/api/payslip-extract) — only ever invoked when the user explicitly
// clicks "Try AI extraction." If redactions were applied upstream, the
// caller passes the FLATTENED redacted page images here; this module has
// no way to tell (nor needs to) whether that happened — it just sends
// whatever it's given.
import { emptyFieldResult } from './fields';

export class PayslipAIError extends Error {}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

// text: raw extracted text (text-based PDF path). pageCanvases: array of
// canvases to send as images instead (image / scanned / redacted path).
// Pass exactly one of the two.
export async function extractPayslipWithAI({ text, pageCanvases }) {
  let res;
  try {
    if (pageCanvases?.length) {
      const formData = new FormData();
      for (let i = 0; i < pageCanvases.length; i++) {
        const blob = await canvasToPngBlob(pageCanvases[i]);
        if (blob) formData.append('images', blob, `page-${i + 1}.png`);
      }
      res = await fetch('/api/payslip-extract', { method: 'POST', body: formData });
    } else {
      res = await fetch('/api/payslip-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    }
  } catch {
    throw new PayslipAIError('Could not reach the AI service. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new PayslipAIError(data?.error || 'AI extraction failed. Please try again.');
  }

  const fields = emptyFieldResult();
  for (const key of Object.keys(fields)) {
    if (data[key]) fields[key] = data[key];
  }
  return fields;
}
