// Client-side text extraction for CV upload — same proven approach already
// used by PresentationGeneratorWorkspace.js and ContractSummarizerWorkspace.js
// (pdf.js for PDF, mammoth for DOCX, FileReader for TXT), pulled out here as
// a small shared helper rather than duplicated a fourth time. Those other
// tools are left untouched.

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.readAsText(file);
  });
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF reader is still loading — please wait a moment and try again.');
  }
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

async function extractDocxText(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || '').trim();
}

// Returns { text, error }. On success, error is ''; on failure, text is ''
// and error explains what went wrong so the caller can show it and let the
// user paste manually instead — never processes an upload blindly.
export async function extractTextFromFile(file) {
  const name = (file.name || '').toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = file.type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc');
  const isTxt = file.type === 'text/plain' || name.endsWith('.txt');

  try {
    let text = '';
    if (isPdf) {
      text = await extractPdfText(file);
      if (!text) return { text: '', error: 'Could not extract any text from this PDF — it may be a scanned image. Try running it through OCR PDF first, or paste your CV text manually.' };
    } else if (isDocx) {
      text = await extractDocxText(file);
      if (!text) return { text: '', error: 'Could not extract any text from this document. Please paste your CV text manually instead.' };
    } else if (isTxt) {
      text = await readTextFile(file);
      if (!text.trim()) return { text: '', error: 'This file appears to be empty. Please paste your CV text manually instead.' };
    } else {
      return { text: '', error: 'Unsupported file type — please upload a PDF, DOCX, or TXT file, or paste your CV text manually.' };
    }
    return { text, error: '' };
  } catch (err) {
    console.error(err);
    return { text: '', error: 'Could not read this file. Please try another file, or paste your CV text manually instead.' };
  }
}
