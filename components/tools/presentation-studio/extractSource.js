// Client-side source extraction for the 3 content-bearing input methods
// (paste text needs none). Mirrors the pdf.js-CDN + mammoth pattern already
// used by the previous PresentationGeneratorWorkspace.js and by
// lib/extractDocText.js elsewhere in the app — kept local to this tool
// rather than touching lib/extractDocText.js, which is shared by CV/
// Contract Summarizer flows with a slightly different (flattened, no
// per-file boundaries) return shape.

export function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function fileToText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}

export async function extractPdfText(file) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

export async function extractDocxText(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || '').trim();
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
