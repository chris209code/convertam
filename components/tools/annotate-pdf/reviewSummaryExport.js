// Client-side orchestration for Annotate PDF's 4-way export menu. The
// primary "Annotated PDF" export (full flatten, tied to the Document
// Session) stays in AnnotatePdfWorkspace.js's handleApply() untouched —
// these three are the additional, independent one-click exports that
// don't touch session state, each producing its own download directly.
import { drawObject } from './objectTypes';
import { rotateCanvas } from './rotateCanvas';
import { isCommentBearing } from '@/lib/annotate/reviewLabel';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';

// Flattens pages + (optionally filtered) annotation objects into a PDF's
// raw bytes — the same rasterize-then-embed approach as the main "Apply
// Annotations" flow, factored out so "Comments only" can reuse it with a
// type filter instead of duplicating the loop.
export async function flattenAnnotatedPdfBytes({ pages, pageOrder, pageRotations, objects, filterObject }) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  for (const i of pageOrder) {
    const p = pages[i];
    const pageObjs = objects.filter((o) => o.page === i && (!filterObject || filterObject(o)));
    const flat = document.createElement('canvas');
    flat.width = p.width;
    flat.height = p.height;
    const ctx = flat.getContext('2d');
    ctx.drawImage(p.canvas, 0, 0);
    [...pageObjs].sort((a, b) => a.z - b.z).forEach((o) => drawObject(ctx, o));

    const rotated = rotateCanvas(flat, pageRotations[i] || 0);
    const dataUrl = rotated.toDataURL('image/png');
    const bytes = await (await fetch(dataUrl)).arrayBuffer();
    const embedded = await pdfDoc.embedPng(bytes);
    const page = pdfDoc.addPage([rotated.width, rotated.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: rotated.width, height: rotated.height });
  }

  return pdfDoc.save();
}

function downloadBytes(bytes, mime, fileName) {
  const blob = new Blob([bytes], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

const COMMENTS_ONLY_TYPES = new Set(['note', 'text', 'callout']);

// "Comments only" — the same flatten pipeline pre-filtered to note/text/
// callout objects, so the exported pages show just the written comments
// without highlights, drawings, stamps, or signatures.
export async function downloadCommentsOnlyPdf({ pages, pageOrder, pageRotations, objects }) {
  const bytes = await flattenAnnotatedPdfBytes({
    pages, pageOrder, pageRotations, objects,
    filterObject: (o) => COMMENTS_ONLY_TYPES.has(o.type),
  });
  downloadBytes(bytes, 'application/pdf', 'convertam-comments-only.pdf');
}

// "Review Summary PDF" — reuses the same generic multi-page report engine
// every calculator's "Download PDF" already goes through
// (financial-shared/FinancialReport.js), fed a dashboard hero/stat cards
// plus one table per page — not a separate report engine.
export async function downloadReviewSummaryPdf({ documentName, objects, pageOrder }) {
  const { describeObject, typeGroupLabel } = await import('@/lib/annotate/reviewLabel');
  const total = objects.length;
  const unresolved = objects.filter((o) => isCommentBearing(o) && !o.resolved).length;

  const byGroup = new Map();
  objects.forEach((o) => {
    const label = typeGroupLabel(o);
    byGroup.set(label, (byGroup.get(label) || 0) + 1);
  });
  const statCards = [...byGroup.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, value: String(count) }));

  const byPage = new Map();
  objects.forEach((o) => {
    if (!byPage.has(o.page)) byPage.set(o.page, []);
    byPage.get(o.page).push(o);
  });
  const tables = [];
  pageOrder.forEach((origIdx, position) => {
    const pageObjs = byPage.get(origIdx);
    if (!pageObjs || !pageObjs.length) return;
    tables.push({
      title: `Page ${position + 1}`,
      head: ['Type', 'Comment', 'Status'],
      rows: [...pageObjs].sort((a, b) => a.z - b.z).map((o) => [
        typeGroupLabel(o),
        describeObject(o),
        isCommentBearing(o) ? (o.resolved ? 'Resolved' : 'Unresolved') : '—',
      ]),
    });
  });

  await generateFinancialReportPdf({
    toolName: `Annotate PDF — Review Summary (${documentName || 'document.pdf'})`,
    fileName: 'convertam-review-summary.pdf',
    hero: { label: 'Total annotations', value: String(total), sub: unresolved > 0 ? `${unresolved} unresolved` : 'All resolved' },
    statCards,
    tables,
    footerNote: 'Convertam — free, no-login PDF tools',
  });
}

// "Review Summary Word" — a real, editable .docx from the same underlying
// data (lib/annotate/renderReviewSummaryDocxHtml.js), generated server-side
// via html-to-docx — mirrors the resume tool's DOCX export pipeline
// (lib/resume/renderResumeDocxHtml.js + /api/resume-docx).
export async function downloadReviewSummaryWord({ documentName, objects, pageOrder }) {
  const generatedDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const res = await fetch('/api/review-summary-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentName, generatedDate, objects, pageOrder }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `The server could not generate the Word document (error ${res.status}). Please try again.`);
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'convertam-review-summary.docx';
  a.click();
  URL.revokeObjectURL(a.href);
}
