// Client-side caller for payslip AI document understanding
// (/api/payslip-extract) — the primary extraction path. Always sends page
// IMAGES (never extracted text): reading the payslip's actual visual table
// structure (which column is "Current" vs "YTD", which section a row
// belongs to) is the entire reason this uses a vision model instead of
// keyword matching, and that structure is lost the moment text is
// flattened out of its layout. If redactions were applied upstream, the
// caller passes the FLATTENED redacted page canvases here — this module
// has no way to tell (nor needs to) whether that happened.
import { emptyPayslipResult } from './fields';

export class PayslipAIError extends Error {}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export async function extractPayslipWithAI(pageCanvases) {
  let res;
  try {
    const formData = new FormData();
    for (let i = 0; i < pageCanvases.length; i++) {
      const blob = await canvasToPngBlob(pageCanvases[i]);
      if (blob) formData.append('images', blob, `page-${i + 1}.png`);
    }
    res = await fetch('/api/payslip-extract', { method: 'POST', body: formData });
  } catch {
    throw new PayslipAIError('Could not reach the AI service. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new PayslipAIError(data?.error || 'AI extraction failed. Please try again.');
  }

  const empty = emptyPayslipResult();
  return {
    ...empty,
    ...data,
    allowances: Array.isArray(data.allowances) ? data.allowances : [],
    bonuses: Array.isArray(data.bonuses) ? data.bonuses : [],
    deductions: Array.isArray(data.deductions) ? data.deductions : [],
    contributions: Array.isArray(data.contributions) ? data.contributions : [],
  };
}
