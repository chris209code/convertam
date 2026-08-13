// File ingestion layer for Smart Parser — the only module that touches
// pdfjs-dist/mammoth/xlsx directly. Every downstream module (tableDetect,
// fieldExtract, normalize, schemaMap) works on the plain {pages, rawText,
// table} shape this returns, never on a File object, so this is the one
// place that changes if a new input format is added later.
//
// pdfjs-dist is dynamically imported (not a global `window.pdfjsLib`, which
// depends on some other already-mounted tool having injected the CDN
// script first) — same pattern as PdfToTextWorkspace.js.

export class IngestError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'password_protected' | 'corrupt' | 'unsupported' | 'empty' | 'read_failed'
  }
}

export function detectKind(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (type.includes('sheet') || type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  if (type === 'text/csv' || name.endsWith('.csv')) return 'csv';
  if (type === 'text/plain' || name.endsWith('.txt')) return 'txt';
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/.test(name)) return 'image';
  return 'unsupported';
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new IngestError('read_failed', 'Could not read this file.'));
    reader.readAsText(file);
  });
}

async function ingestPdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new IngestError('password_protected', 'This PDF is password-protected. Remove the password first (try Unlock PDF), then upload it here.');
    }
    throw new IngestError('corrupt', 'This PDF could not be opened — it may be corrupted or in an unsupported PDF format.');
  }

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ').trim();
    pages.push({ number: i, text });
  }

  const rawText = pages.map((p) => p.text).join('\n\n').trim();
  // A PDF with pages but almost no extractable text is almost certainly a
  // scan (each page is one big embedded image) rather than a genuinely
  // empty document — average characters-per-page below this floor is
  // treated as "needs OCR" rather than "empty," since a real empty PDF
  // (zero pages of content) is a separate, much rarer case.
  const avgCharsPerPage = pdf.numPages ? rawText.length / pdf.numPages : 0;
  const isScanned = avgCharsPerPage < 20;

  return { kind: 'pdf', pageCount: pdf.numPages, pages, rawText, isScanned, table: null, warnings: [] };
}

async function ingestDocx(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const buf = await file.arrayBuffer();
  let result;
  try {
    result = await mammoth.extractRawText({ arrayBuffer: buf });
  } catch {
    throw new IngestError('corrupt', 'This Word document could not be read — it may be corrupted or password-protected.');
  }
  const rawText = (result.value || '').trim();
  return { kind: 'docx', pageCount: 1, pages: [{ number: 1, text: rawText }], rawText, isScanned: false, table: null, warnings: [] };
}

async function ingestXlsx(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  let wb;
  try {
    wb = XLSX.read(buf, { type: 'array' });
  } catch {
    throw new IngestError('corrupt', 'This spreadsheet could not be read — it may be corrupted or in an unsupported format.');
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new IngestError('empty', 'This spreadsheet has no sheets.');
  const sheet = wb.Sheets[sheetName];
  const rowsAoA = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const nonEmptyRows = rowsAoA.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!nonEmptyRows.length) throw new IngestError('empty', 'This spreadsheet appears to be empty.');

  const [headerRow, ...dataRows] = nonEmptyRows;
  const columns = headerRow.map((c, i) => (String(c).trim() ? String(c).trim() : `Column ${i + 1}`));
  const rows = dataRows.map((r) => {
    const row = {};
    columns.forEach((col, i) => { row[col] = r[i] !== undefined ? String(r[i]) : ''; });
    return row;
  });
  // Read directly from the workbook's own structure — a ground-truth table,
  // not a guess, so it carries full confidence with no need to run through
  // tableDetect.js's text-pattern heuristics at all.
  const table = { columns, rows, confidence: 100, level: 'high', source: 'xlsx', sheetName, otherSheets: wb.SheetNames.slice(1) };
  const rawText = [columns.join('\t'), ...rows.map((r) => columns.map((c) => r[c]).join('\t'))].join('\n');

  return { kind: 'xlsx', pageCount: 1, pages: [{ number: 1, text: rawText }], rawText, isScanned: false, table, warnings: wb.SheetNames.length > 1 ? [`This file has ${wb.SheetNames.length} sheets — only "${sheetName}" (the first) was parsed.`] : [] };
}

async function ingestCsv(file) {
  const rawText = (await readAsText(file)).trim();
  if (!rawText) throw new IngestError('empty', 'This CSV file appears to be empty.');
  return { kind: 'csv', pageCount: 1, pages: [{ number: 1, text: rawText }], rawText, isScanned: false, table: null, warnings: [] };
}

async function ingestTxt(file) {
  const rawText = (await readAsText(file)).trim();
  if (!rawText) throw new IngestError('empty', 'This text file appears to be empty.');
  return { kind: 'txt', pageCount: 1, pages: [{ number: 1, text: rawText }], rawText, isScanned: false, table: null, warnings: [] };
}

async function ingestImage(file) {
  // No client-side text extraction for images — Extract Text/Data modes on
  // an image input require the "Analyze with AI" step (Gemini vision).
  // Ingestion still succeeds so the workspace can show the image and offer
  // that path, rather than treating "image" itself as an error.
  return { kind: 'image', pageCount: 1, pages: [{ number: 1, text: '' }], rawText: '', isScanned: true, table: null, warnings: [] };
}

// Returns the normalized ingestion result, or throws IngestError. Never
// throws a raw pdfjs/mammoth/xlsx error — every failure path is mapped to
// one of the explicit error codes the UI knows how to explain.
export async function ingestFile(file) {
  const kind = detectKind(file);
  try {
    if (kind === 'pdf') return await ingestPdf(file);
    if (kind === 'docx') return await ingestDocx(file);
    if (kind === 'xlsx') return await ingestXlsx(file);
    if (kind === 'csv') return await ingestCsv(file);
    if (kind === 'txt') return await ingestTxt(file);
    if (kind === 'image') return await ingestImage(file);
    throw new IngestError('unsupported', 'Unsupported file type.');
  } catch (err) {
    if (err instanceof IngestError) throw err;
    console.error('Smart Parser ingest error:', err);
    throw new IngestError('read_failed', 'Could not read this file. It may be corrupted or in an unexpected format.');
  }
}
