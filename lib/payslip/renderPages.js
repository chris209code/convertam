// Renders an uploaded payslip (PDF or image) into one canvas per page —
// the single shared visual representation used for the preview step, the
// redaction editor, and the images sent for AI document understanding.
// Doing this once up front, rather than each of those three re-deriving
// its own version of "what does this page look like," is what guarantees
// a redaction the user draws on the PREVIEW is the exact same pixel grid
// the FLATTENED copy bakes into — there's no separate re-render step that
// could drift out of alignment.
const RENDER_SCALE = 2; // ~150-200dpi equivalent for a typical page — enough for a legible preview and for the AI to read clearly without an excessive request size.

export class RenderPagesError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'password_protected' | 'corrupt' | 'unsupported' | 'read_failed'
  }
}

async function renderPdfPages(file) {
  const pdfjsLib = await import('pdfjs-dist');
  // Self-hosted (public/pdfjs/pdf.worker.min.js) rather than the CDN URL
  // other tools in this app use — a payslip is exactly the kind of
  // document this tool shouldn't have any third party involved in reading,
  // even just for the engine file itself.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
  const buf = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new RenderPagesError('password_protected', 'This PDF is password-protected. Remove the password first, then upload it here.');
    }
    throw new RenderPagesError('corrupt', 'This PDF could not be opened — it may be corrupted or in an unsupported format.');
  }

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({ canvas, width: canvas.width, height: canvas.height });
  }

  return { pages };
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new RenderPagesError('corrupt', 'This image could not be read.')); };
    img.src = url;
  });
}

async function renderImagePage(file) {
  const { img, url } = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return { pages: [{ canvas, width: canvas.width, height: canvas.height }] };
}

export function isPdfFile(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}
export function isImageFile(file) {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name || '');
}

export async function renderPayslipPages(file) {
  try {
    if (isPdfFile(file)) return await renderPdfPages(file);
    if (isImageFile(file)) return await renderImagePage(file);
    throw new RenderPagesError('unsupported', 'Unsupported file type — upload a PDF, JPG, PNG, or WebP.');
  } catch (err) {
    if (err instanceof RenderPagesError) throw err;
    console.error('Payslip render error:', err);
    throw new RenderPagesError('read_failed', 'Could not read this file. It may be corrupted or in an unexpected format.');
  }
}
