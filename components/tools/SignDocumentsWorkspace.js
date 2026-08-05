'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { PDFDocument } from 'pdf-lib';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import { waitForPdfjs } from '@/lib/workspace/waitForPdfjs';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function makeDocId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const defaultSigPos = { x: 50, y: 50, w: 180, h: 60 };

// Detects what kind of document was uploaded. Word documents still convert
// to PDF silently (a Word document has no fixed page coordinates, so
// free-drag signature placement only really works once it's paginated);
// images sign in place and stay in their original format.
function detectDocumentKind(file) {
  const name = (file.name || '').toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|jpg)$/i.test(name)) return 'image';
  return 'unknown';
}

// Renders a DOCX's content into a real, multi-page PDF entirely in the
// browser — same html2canvas + jsPDF pagination technique already used by
// HtmlToPdfWorkspace.jsx — so a Word document never has to leave the
// browser or go through a paid conversion just to get signed.
async function convertDocxToPdfFile(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const buf = await file.arrayBuffer();
  const { value: docxHtml } = await mammoth.convertToHtml({ arrayBuffer: buf });

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#000000';
  container.innerHTML = docxHtml;
  document.body.appendChild(container);
  await new Promise((r) => setTimeout(r, 300));

  let canvas;
  try {
    canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794 });
  } finally {
    document.body.removeChild(container);
  }

  const pdfW = 210, pdfH = 297; // A4 portrait, mm
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgW = pdfW;
  const imgH = (canvas.height * imgW) / canvas.width;
  let yOffset = 0, remaining = imgH;
  while (remaining > 0) {
    if (yOffset > 0) pdf.addPage();
    const srcY = (yOffset / imgH) * canvas.height;
    const sliceH = Math.min(pdfH, remaining);
    const slicePx = (sliceH / imgH) * canvas.height;
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(slicePx);
    sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, sliceH);
    remaining -= sliceH;
    yOffset += sliceH;
  }

  const blob = pdf.output('blob');
  return new File([blob], file.name.replace(/\.docx?$/i, '.pdf'), { type: 'application/pdf' });
}

// Makes near-white pixels transparent so only the dark ink remains — the
// first pass of turning a photo of a signature into a placeable overlay.
function removeWhiteBackground(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 180) {
      const alpha = Math.max(0, 255 - (brightness - 180) * 8);
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// Finds the bounding box of the remaining (non-transparent) ink pixels —
// this is what lets us automatically isolate just the signature instead of
// keeping the entire photographed page around it.
function findInkBoundingBox(imageData, w, h) {
  const data = imageData.data;
  const ALPHA_THRESHOLD = 40;
  let minX = w, minY = h, maxX = -1, maxY = -1, inkCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > ALPHA_THRESHOLD) {
        inkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, inkCount };
}

// Decides whether the automatic extraction can be trusted, rather than
// assuming it always worked. A reliable extraction found a modest amount of
// ink, in a bounding box that's meaningfully smaller than the whole photo,
// and isn't just a dense dark blob (which usually means poor lighting or a
// non-white background rather than a clean signature).
function evaluateExtraction(box, w, h) {
  if (!box) return { reliable: false };
  const totalPixels = w * h;
  const bboxW = box.maxX - box.minX + 1;
  const bboxH = box.maxY - box.minY + 1;
  const bboxAreaRatio = (bboxW * bboxH) / totalPixels;
  const inkRatio = box.inkCount / totalPixels;
  if (box.inkCount < 120) return { reliable: false };
  if (bboxAreaRatio > 0.92) return { reliable: false };
  if (inkRatio / bboxAreaRatio > 0.55) return { reliable: false };
  return { reliable: true };
}

function cropCanvasToBox(canvas, box, padRatio = 0.14) {
  const w = canvas.width, h = canvas.height;
  const bboxW = box.maxX - box.minX + 1;
  const bboxH = box.maxY - box.minY + 1;
  const padX = Math.max(6, bboxW * padRatio);
  const padY = Math.max(6, bboxH * padRatio);
  const x0 = clamp(box.minX - padX, 0, w);
  const y0 = clamp(box.minY - padY, 0, h);
  const x1 = clamp(box.maxX + padX, 0, w);
  const y1 = clamp(box.maxY + padY, 0, h);
  const cw = Math.max(1, Math.round(x1 - x0));
  const ch = Math.max(1, Math.round(y1 - y0));
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
}

const defaultCropRect = { x: 0, y: 0, w: 1, h: 1 };

// Handoff keys shared with DocumentEnhancerWorkspace.js — must match exactly
// on both sides. A one-time localStorage pass-off (same pattern as the CV
// Improver <-> Resume Builder handoff) lets this tool send an in-progress
// signature photo there for cleanup, and lets Document Enhancer send the
// enhanced result back here to retry automatic extraction.
const SIGN_TO_ENHANCER_KEY = 'convertam_sign_to_enhancer';
const ENHANCER_TO_SIGN_KEY = 'convertam_enhancer_to_sign';

export default function SignDocumentsWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [step, setStep] = useState(1); // 1=upload sig, 2=upload document(s), 3=sign
  const [sigStage, setSigStage] = useState('select'); // select | analyzing | manual-crop | needs-enhancer-hint
  const [sourceImg, setSourceImg] = useState(null); // the originally uploaded photo, for the crop fallback
  const [cropRect, setCropRect] = useState(defaultCropRect);
  const [sigFile, setSigFile] = useState(null);
  const [sigDataUrl, setSigDataUrl] = useState(null); // cleaned, isolated signature — stays active for the whole session

  // Every document uploaded this session. Kept as one array so the
  // signature above is shared across all of them — switching documents
  // never touches sigDataUrl. Each entry: { id, name, kind ('pdf' | 'image'),
  // file, mimeType, pages, selectedPage, sigPos, signed, resultBlob,
  // resultMimeType }. Images sign in place and keep their native format;
  // PDFs (and Word documents, already converted to PDF) sign via pdf-lib.
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [importedFromEnhancer, setImportedFromEnhancer] = useState(false);
  const previewRef = useRef(null);
  const sigRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const cropContainerRef = useRef(null);
  const cropDragRef = useRef(null);
  const addMoreInputRef = useRef(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;
  const activeIndex = documents.findIndex((d) => d.id === activeDocId);
  const signedCount = documents.filter((d) => d.signed).length;

  function patchDoc(id, patch) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)));
  }

  // Shared extraction pipeline: given an already-loaded photo, try to
  // automatically isolate just the signature, falling back to manual crop
  // when the result can't be trusted. Used both for a fresh upload and for
  // a photo handed back from Document Enhancer.
  async function processSignatureImage(img) {
    setSourceImg(img);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    removeWhiteBackground(ctx, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const box = findInkBoundingBox(imageData, canvas.width, canvas.height);
    const result = evaluateExtraction(box, canvas.width, canvas.height);

    if (result.reliable) {
      const cropped = cropCanvasToBox(canvas, box);
      setSigDataUrl(cropped.toDataURL('image/png'));
      setStatus('');
      setBusy(false);
      setSigStage('select');
      setStep(2);
    } else {
      // Automatic extraction wasn't reliable — fall back to letting the
      // user crop the photo down to just the signature themselves.
      setCropRect(defaultCropRect);
      setStatus('');
      setBusy(false);
      setSigStage('manual-crop');
    }
  }

  // Step 1: try to automatically isolate just the signature from the photo.
  async function handleSigUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSigFile(file);
    setError('');
    setStatus('Analyzing your signature…');
    setBusy(true);
    setSigStage('analyzing');
    setImportedFromEnhancer(false);

    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImage(dataUrl);
    await processSignatureImage(img);
  }

  // One-time pickup of a photo sent back from Document Enhancer's "Continue
  // to Sign Documents" — re-attempts automatic extraction on the improved image.
  useEffect(() => {
    let raw;
    try { raw = localStorage.getItem(ENHANCER_TO_SIGN_KEY); } catch { return; }
    if (!raw) return;
    try { localStorage.removeItem(ENHANCER_TO_SIGN_KEY); } catch { /* ignore */ }
    setError('');
    setStatus('Analyzing your signature…');
    setBusy(true);
    setSigStage('analyzing');
    setImportedFromEnhancer(true);
    loadImage(raw).then((img) => processSignatureImage(img));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replacing the signature only changes the ink — every document already
  // in the batch, signed or not, keeps its place. This is the one place a
  // fresh signature upload is allowed to happen after step 1.
  function changeSignature() {
    setStep(1);
    setSigStage('select');
    setImportedFromEnhancer(false);
  }

  // Sends the photo (cropped to whatever region is currently selected, if
  // any) to Document Enhancer for cleanup, as a continuation of this flow
  // rather than a cold start — Document Enhancer lands straight in its crop
  // step with this image already loaded.
  function goToDocumentEnhancer() {
    if (!sourceImg) { window.location.href = '/document-enhancer'; return; }
    const cropX = cropRect.x * sourceImg.width, cropY = cropRect.y * sourceImg.height;
    const cropW = cropRect.w * sourceImg.width, cropH = cropRect.h * sourceImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));
    canvas.getContext('2d').drawImage(sourceImg, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    try { localStorage.setItem(SIGN_TO_ENHANCER_KEY, canvas.toDataURL('image/png')); } catch { /* ignore */ }
    window.location.href = '/document-enhancer';
  }

  // Fallback crop: drag corner handles over the original photo.
  function onCropHandlePointerDown(corner, e) {
    e.preventDefault();
    e.stopPropagation();
    cropDragRef.current = { corner, startRect: { ...cropRect } };
    window.addEventListener('pointermove', onCropPointerMove);
    window.addEventListener('pointerup', onCropPointerUp);
  }
  function onCropPointerMove(e) {
    if (!cropDragRef.current || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const { corner, startRect } = cropDragRef.current;
    setCropRect(() => {
      let { x, y, w, h } = startRect;
      const x2 = x + w, y2 = y + h;
      if (corner === 'tl') { x = Math.min(px, x2 - 0.05); y = Math.min(py, y2 - 0.05); w = x2 - x; h = y2 - y; }
      if (corner === 'tr') { const nx2 = Math.max(px, x + 0.05); y = Math.min(py, y2 - 0.05); w = nx2 - x; h = y2 - y; }
      if (corner === 'bl') { x = Math.min(px, x2 - 0.05); const ny2 = Math.max(py, y + 0.05); w = x2 - x; h = ny2 - y; }
      if (corner === 'br') { const nx2 = Math.max(px, x + 0.05); const ny2 = Math.max(py, y + 0.05); w = nx2 - x; h = ny2 - y; }
      return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), w: clamp(w, 0.05, 1), h: clamp(h, 0.05, 1) };
    });
  }
  function onCropPointerUp() {
    cropDragRef.current = null;
    window.removeEventListener('pointermove', onCropPointerMove);
    window.removeEventListener('pointerup', onCropPointerUp);
  }

  // After the user confirms their manual crop, retry background removal +
  // automatic bounding-box tightening on just that region.
  function confirmManualCrop() {
    const img = sourceImg;
    const cropX = cropRect.x * img.width, cropY = cropRect.y * img.height;
    const cropW = cropRect.w * img.width, cropH = cropRect.h * img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    removeWhiteBackground(ctx, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const box = findInkBoundingBox(imageData, canvas.width, canvas.height);
    const result = evaluateExtraction(box, canvas.width, canvas.height);

    if (result.reliable) {
      const cropped = cropCanvasToBox(canvas, box, 0.08);
      setSigDataUrl(cropped.toDataURL('image/png'));
      setSigStage('select');
      setStep(2);
    } else {
      // Still not clean — use the best-effort result but let the user know
      // Document Enhancer can likely do better, without blocking them.
      setSigDataUrl(canvas.toDataURL('image/png'));
      setSigStage('needs-enhancer-hint');
    }
  }

  function retrySignature() {
    setSigStage('select');
    setSigFile(null);
    setSourceImg(null);
    setCropRect(defaultCropRect);
  }

  function useHintResultAnyway() {
    setSigStage('select');
    setStep(2);
  }

  // Turns one uploaded file into a ready-to-sign document object. Word
  // documents still silently convert to PDF first (see detectDocumentKind);
  // images are read as-is and sign in place, keeping their original format
  // all the way through to download.
  async function processOneFile(file) {
    if (file.size > 100 * 1024 * 1024) {
      return { ok: false, name: file.name, message: 'Larger than the 100MB limit.' };
    }
    const kind = detectDocumentKind(file);
    if (kind === 'unknown') {
      return { ok: false, name: file.name, message: 'Unsupported file type — upload a PDF, Word document (.docx/.doc), JPG, or PNG.' };
    }

    if (kind === 'image') {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const img = await loadImage(dataUrl);
        const mimeType = file.type || (/\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg');
        return {
          ok: true,
          doc: {
            id: makeDocId(),
            name: file.name,
            kind: 'image',
            file,
            mimeType,
            pages: [{ dataUrl, w: img.naturalWidth, h: img.naturalHeight }],
            selectedPage: 0,
            sigPos: { ...defaultSigPos },
            signed: false,
            resultBlob: null,
            resultMimeType: null,
          },
        };
      } catch (err) {
        console.error(err);
        return { ok: false, name: file.name, message: 'Could not read this image.' };
      }
    }

    let workingFile = file;
    try {
      if (kind === 'docx') workingFile = await convertDocxToPdfFile(file);
    } catch (err) {
      console.error(err);
      return { ok: false, name: file.name, message: 'Could not convert this Word document.' };
    }

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await workingFile.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        pages.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), w: viewport.width, h: viewport.height });
      }
      return {
        ok: true,
        doc: {
          id: makeDocId(),
          name: workingFile.name,
          kind: 'pdf',
          file: workingFile,
          mimeType: 'application/pdf',
          pages,
          selectedPage: 0,
          sigPos: { ...defaultSigPos },
          signed: false,
          resultBlob: null,
          resultMimeType: null,
        },
      };
    } catch (err) {
      return { ok: false, name: file.name, message: 'Could not read this PDF. Make sure it is not password-protected.' };
    }
  }

  // Step 2: accepts one or many files at once. Every document lands in the
  // same batch, sharing whatever signature was set up in step 1 — nothing
  // about the signature is touched here.
  async function handleFilesUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !window.pdfjsLib) return;
    setError('');
    setBusy(true);

    const newDocs = [];
    const failures = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(
        files.length > 1
          ? `Adding document ${i + 1} of ${files.length}…`
          : 'Loading your document…'
      );
      const result = await processOneFile(files[i]);
      if (result.ok) newDocs.push(result.doc);
      else failures.push(result);
    }

    setBusy(false);
    setStatus('');
    if (newDocs.length) {
      setDocuments((prev) => [...prev, ...newDocs]);
      setActiveDocId((prev) => prev || newDocs[0].id);
      setStep(3);
    }
    setError(
      failures.length === 0 ? '' :
      failures.length === 1 ? `${failures[0].name}: ${failures[0].message}` :
      `${failures.length} file(s) couldn't be added — ${failures.map((f) => f.name).join(', ')}`
    );
    e.target.value = '';
  }

  useAutoContinueSession('sign-documents', async () => { await waitForPdfjs(); continueWithSessionPdf(); });

  async function continueWithSessionPdf() {
    const file = getDocumentAsFile();
    if (!file || !window.pdfjsLib) return;
    setError('');
    setBusy(true);
    setStatus('Loading document…');
    const result = await processOneFile(file);
    setBusy(false);
    setStatus('');
    if (result.ok) {
      setDocuments((prev) => [...prev, result.doc]);
      setActiveDocId(result.doc.id);
      setStep(3);
    } else {
      setError(result.message);
    }
  }

  // Drag signature on preview — operates on the active document's own
  // sigPos, so every document remembers where its signature was placed.
  function onMouseDown(e) {
    e.preventDefault();
    isDragging.current = true;
    const rect = previewRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left - activeDoc.sigPos.x,
      y: e.clientY - rect.top - activeDoc.sigPos.y,
    };
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current || !previewRef.current || !activeDocId) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragStart.current.x;
      const y = e.clientY - rect.top - dragStart.current.y;
      patchDoc(activeDocId, (d) => ({ sigPos: { ...d.sigPos, x: Math.max(0, x), y: Math.max(0, y) } }));
    }
    function onMouseUp() { isDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId]);

  // Touch support for mobile
  function onTouchStart(e) {
    const touch = e.touches[0];
    isDragging.current = true;
    const rect = previewRef.current.getBoundingClientRect();
    dragStart.current = {
      x: touch.clientX - rect.left - activeDoc.sigPos.x,
      y: touch.clientY - rect.top - activeDoc.sigPos.y,
    };
  }

  function onTouchMove(e) {
    if (!isDragging.current || !previewRef.current || !activeDocId) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = previewRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left - dragStart.current.x;
    const y = touch.clientY - rect.top - dragStart.current.y;
    patchDoc(activeDocId, (d) => ({ sigPos: { ...d.sigPos, x: Math.max(0, x), y: Math.max(0, y) } }));
  }

  // Embeds the signature into the active document and marks it signed, then
  // pushes it to the Document Session (so "Continue Working" always means
  // whichever document was most recently signed) and auto-advances to the
  // next unsigned document — no re-upload, no re-creating the signature,
  // exactly like a pen staying in hand while the paper changes.
  async function handleApplySignature() {
    if (!activeDoc || !sigDataUrl) return;
    const doc = activeDoc;
    setBusy(true);
    setStatus('Embedding signature…');
    try {
      let resultBlob, resultMimeType;

      if (doc.kind === 'image') {
        // Canvas coordinates already run top-left-down, same as the DOM
        // preview — unlike the PDF path below, no y-axis flip is needed.
        const page = doc.pages[0];
        const previewEl = previewRef.current;
        const scaleX = page.w / previewEl.offsetWidth;
        const scaleY = page.h / previewEl.offsetHeight;

        const canvas = document.createElement('canvas');
        canvas.width = page.w;
        canvas.height = page.h;
        const ctx = canvas.getContext('2d');
        const baseImg = await loadImage(page.dataUrl);
        ctx.drawImage(baseImg, 0, 0, page.w, page.h);

        const sigImg = await loadImage(sigDataUrl);
        ctx.drawImage(
          sigImg,
          doc.sigPos.x * scaleX,
          doc.sigPos.y * scaleY,
          doc.sigPos.w * scaleX,
          doc.sigPos.h * scaleY,
        );

        resultMimeType = doc.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
        resultBlob = await new Promise((resolve) => canvas.toBlob(resolve, resultMimeType, 0.95));
      } else {
        const pdfBytes = await doc.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const page = pages[doc.selectedPage];
        const { width: pageW, height: pageH } = page.getSize();

        const previewEl = previewRef.current;
        const scaleX = pageW / previewEl.offsetWidth;
        const scaleY = pageH / previewEl.offsetHeight;

        const pdfX = doc.sigPos.x * scaleX;
        const pdfY = pageH - (doc.sigPos.y * scaleY) - (doc.sigPos.h * scaleY);
        const pdfW = doc.sigPos.w * scaleX;
        const pdfH = doc.sigPos.h * scaleY;

        const sigRes = await fetch(sigDataUrl);
        const sigBuf = await sigRes.arrayBuffer();
        const sigImage = await pdfDoc.embedPng(sigBuf);

        page.drawImage(sigImage, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });

        const signed = await pdfDoc.save();
        resultMimeType = 'application/pdf';
        resultBlob = new Blob([signed], { type: 'application/pdf' });
      }

      patchDoc(doc.id, { signed: true, resultBlob, resultMimeType });

      if (session.status !== 'active') {
        await startSession(doc.file, { toolSlug: 'sign-documents' });
      }
      const resultBytes = new Uint8Array(await resultBlob.arrayBuffer());
      await updateDocument(resultBytes, {
        toolSlug: 'sign-documents',
        label: `Signed — ${doc.name}`,
        mimeType: resultMimeType,
        name: doc.name,
      });

      setStatus('Signature placed.');

      const next = documents.find((d) => d.id !== doc.id && !d.signed);
      if (next) {
        setTimeout(() => setActiveDocId(next.id), 350);
      }
    } catch (err) {
      console.error(err);
      setError('Could not embed the signature. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function undoSignature(id) {
    patchDoc(id, { signed: false, resultBlob: null, resultMimeType: null });
  }

  function signedFileName(doc) {
    const ext = doc.kind === 'image' ? (doc.resultMimeType === 'image/png' ? 'png' : 'jpg') : 'pdf';
    const baseName = doc.name.replace(/\.[^.]+$/, '');
    return `${baseName}-signed.${ext}`;
  }

  // Downloading exports a document but does not end the workspace — the
  // session stays active until the user closes it or starts a new document.
  function downloadDoc(doc) {
    if (!doc?.resultBlob) return;
    downloadBlob(doc.resultBlob, signedFileName(doc));
  }

  async function downloadAllAsZip() {
    const signedDocs = documents.filter((d) => d.signed && d.resultBlob);
    if (!signedDocs.length) return;
    setBusy(true);
    setStatus('Building ZIP…');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const usedNames = new Set();
      for (const doc of signedDocs) {
        const ext = doc.kind === 'image' ? (doc.resultMimeType === 'image/png' ? 'png' : 'jpg') : 'pdf';
        const baseName = doc.name.replace(/\.[^.]+$/, '');
        let name = signedFileName(doc);
        let n = 2;
        while (usedNames.has(name)) { name = `${baseName}-signed-${n}.${ext}`; n += 1; }
        usedNames.add(name);
        zip.file(name, doc.resultBlob);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'convertam-signed-documents.zip');
      setStatus('');
    } catch (err) {
      console.error(err);
      setError('Could not build the ZIP file. Please try downloading documents individually.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // Ends the whole signing session — clears every document and the
  // signature, back to a completely fresh start.
  function reset() {
    setStep(1);
    setSigStage('select');
    setSourceImg(null);
    setCropRect(defaultCropRect);
    setSigFile(null);
    setSigDataUrl(null);
    setDocuments([]);
    setActiveDocId(null);
    setStatus('');
    setError('');
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      {/* Step indicators */}
      <div className="flex gap-3 mb-6">
        {['Upload signature', 'Upload document(s)', 'Sign & download'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: step > i + 1 ? '#2f8f5b' : step === i + 1 ? '#3a63b8' : '#e2dcc9',
                color: step >= i + 1 ? 'white' : '#9a9490',
              }}
            >
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className="text-xs text-ink-soft hidden sm:block">{label}</span>
            {i < 2 && <span className="text-ink-soft text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload signature */}
      {step === 1 && sigStage === 'select' && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Sign your name on <strong>white paper</strong> with a <strong>dark pen</strong>, then take a clear photo of it and upload below. Convertam will try to automatically isolate just your signature, and keep it ready for every document you sign in this session.
          </p>
          <label
            className="dropzone block cursor-pointer"
            style={{ borderColor: '#e2dcc9' }}
          >
            <input type="file" accept="image/*" onChange={handleSigUpload} hidden />
            <div className="dz-icon">[ JPG · PNG ]</div>
            <div className="dz-main">Click to upload your signature photo</div>
            <div className="dz-sub">Your signature never leaves your device.</div>
          </label>
          <p className="text-xs text-ink-soft mt-3">
            Photo has poor lighting, shadows, or faded ink? {' '}
            <a href="/document-enhancer" className="text-stamp-blue underline">Open Document Enhancer first</a> to clean it up, then come back here.
          </p>
          {busy && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* STEP 1 fallback: automatic extraction wasn't reliable — manual crop */}
      {step === 1 && sigStage === 'manual-crop' && sourceImg && (
        <div>
          <p className="text-sm font-semibold text-ink mb-1">We couldn't automatically isolate your signature</p>
          <p className="text-sm text-ink-soft mb-4">Drag the corner handles so only your signature is inside the box, then continue.</p>

          <div
            ref={cropContainerRef}
            style={{
              position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto',
              aspectRatio: `${sourceImg.naturalWidth} / ${sourceImg.naturalHeight}`,
              background: '#0F172A10', borderRadius: 8, overflow: 'hidden', touchAction: 'none',
            }}
          >
            <img src={sourceImg.src} alt="" style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', clipPath: `polygon(0 0, 0 100%, ${cropRect.x * 100}% 100%, ${cropRect.x * 100}% ${cropRect.y * 100}%, ${(cropRect.x + cropRect.w) * 100}% ${cropRect.y * 100}%, ${(cropRect.x + cropRect.w) * 100}% ${(cropRect.y + cropRect.h) * 100}%, ${cropRect.x * 100}% ${(cropRect.y + cropRect.h) * 100}%, ${cropRect.x * 100}% 100%, 100% 100%, 100% 0)` }} />
            <div style={{
              position: 'absolute', left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`,
              width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`, border: '2px solid #FBBF24', boxSizing: 'border-box',
            }}>
              {['tl', 'tr', 'bl', 'br'].map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(e) => onCropHandlePointerDown(corner, e)}
                  style={{
                    position: 'absolute', width: 18, height: 18, background: '#FBBF24', border: '2px solid white', borderRadius: '50%',
                    cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                    top: corner.includes('t') ? -9 : undefined, bottom: corner.includes('b') ? -9 : undefined,
                    left: corner.includes('l') ? -9 : undefined, right: corner.includes('r') ? -9 : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-soft mt-3">
            If the photo itself has poor lighting, shadows, or faded ink, cropping alone may not help much —{' '}
            <button type="button" onClick={goToDocumentEnhancer} className="text-stamp-blue underline" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>try Document Enhancer</button> with this photo, then continue back here.
          </p>

          <div className="actions mt-4">
            <button className="btn btn-primary" onClick={confirmManualCrop}>Use this crop</button>
            <button className="btn btn-ghost" onClick={retrySignature}>Choose a different photo</button>
          </div>
        </div>
      )}

      {/* STEP 1 fallback: even after manual crop, extraction is still weak */}
      {step === 1 && sigStage === 'needs-enhancer-hint' && (
        <div>
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: '#FFFBE8', border: '1px solid #F0D070' }}>
            <img src={sigDataUrl} alt="Your signature" style={{ height: '48px', maxWidth: '140px', objectFit: 'contain', background: '#fff', borderRadius: 6 }} />
            <div className="text-xs" style={{ color: '#7A6000' }}>
              <strong>This will still work</strong>, but the background couldn't be fully removed — likely due to lighting, shadows, or contrast in the photo.
            </div>
          </div>
          <p className="text-sm text-ink-soft mb-4">
            For the cleanest result, {' '}
            <button type="button" onClick={goToDocumentEnhancer} className="text-stamp-blue underline font-semibold" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>open Document Enhancer</button>{' '}
            with this photo, then continue straight back here when you're done.
          </p>
          <div className="actions">
            <button className="btn btn-primary" onClick={useHintResultAnyway}>Continue anyway</button>
            <button className="btn btn-ghost" onClick={retrySignature}>Choose a different photo</button>
          </div>
        </div>
      )}

      {/* STEP 2: Upload document(s) */}
      {step === 2 && (
        <div>
          {importedFromEnhancer && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
              ✨ Re-processed from your enhanced photo.
            </div>
          )}
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: '#f0f5ff', border: '1px solid #3a63b8' }}>
            <img src={sigDataUrl} alt="Your signature" style={{ height: '40px', maxWidth: '120px', objectFit: 'contain' }} />
            <div>
              <div className="text-xs font-semibold text-ink">Signature ready — stays active for every document you sign</div>
              <button onClick={changeSignature} className="text-xs text-stamp-blue underline">Change</button>
            </div>
          </div>
          {session.status === 'active' && session.document && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {session.document.pageCount ? `${session.document.pageCount} pages · ` : ''}already in this session — no need to re-upload.
                </div>
              </div>
              <button onClick={continueWithSessionPdf} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                Continue
              </button>
            </div>
          )}
          <p className="text-sm text-ink-soft mb-4">
            Now upload the document(s) you want to sign — select more than one at once if you have several. Word documents and images are automatically turned into PDFs first; you don't need to convert anything yourself.
          </p>
          <label className="dropzone block cursor-pointer" style={{ borderColor: '#e2dcc9' }}>
            <input
              type="file"
              multiple
              accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={handleFilesUpload}
              disabled={!pdfjsReady}
              hidden
            />
            <div className="dz-icon">[ DOC ]</div>
            <div className="dz-main">Click to upload one or more documents</div>
            <div className="dz-sub">Supported formats: PDF, DOCX, DOC, JPG, PNG · Max 100MB each · Processed entirely in your browser.</div>
          </label>
          {busy && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* STEP 3: Sign & download — multi-document workspace */}
      {step === 3 && activeDoc && (
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm text-ink-soft m-0">
              Document {activeIndex + 1} of {documents.length} · <strong>{signedCount} signed</strong> · {documents.length - signedCount} remaining
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost-sm"
                disabled={activeIndex <= 0}
                onClick={() => setActiveDocId(documents[activeIndex - 1].id)}
              >
                ← Previous
              </button>
              <button
                className="btn-ghost-sm"
                disabled={activeIndex >= documents.length - 1}
                onClick={() => setActiveDocId(documents[activeIndex + 1].id)}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Document list (sidebar-style row, shown once there's more than one) */}
          {documents.length > 1 && (
            <div className="mb-4 flex flex-col gap-1 rounded-xl p-2" style={{ border: '1px solid #e2dcc9', maxHeight: 220, overflowY: 'auto' }}>
              {documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveDocId(d.id)}
                  className="flex items-center gap-2 text-left"
                  style={{
                    background: d.id === activeDocId ? '#f0f5ff' : 'transparent',
                    border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: d.signed ? '#2f8f5b' : '#9a9490', fontWeight: 700, flexShrink: 0 }}>{d.signed ? '✓' : '○'}</span>
                  <span className="text-sm text-ink" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span className="text-xs text-ink-soft flex-shrink-0">{d.pages.length} pg</span>
                </button>
              ))}
            </div>
          )}

          <div className="mb-3">
            <input ref={addMoreInputRef} type="file" multiple accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handleFilesUpload} hidden />
            <button className="btn-ghost-sm" onClick={() => addMoreInputRef.current?.click()}>+ Add more documents</button>
          </div>

          {!activeDoc.signed ? (
            <>
              <p className="text-sm text-ink-soft mb-3">
                Drag your signature to the correct position. Use the size slider to resize it.
              </p>

              {/* Page selector */}
              {activeDoc.pages.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {activeDoc.pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => patchDoc(activeDoc.id, { selectedPage: i })}
                      className={`btn-ghost-sm ${activeDoc.selectedPage === i ? 'active-choice' : ''}`}
                    >
                      Page {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Page preview with draggable signature */}
              <div
                ref={previewRef}
                className="relative border rounded-xl overflow-hidden select-none"
                style={{ borderColor: '#e2dcc9', background: '#fff', cursor: 'default' }}
              >
                <img
                  src={activeDoc.pages[activeDoc.selectedPage]?.dataUrl}
                  alt={`Page ${activeDoc.selectedPage + 1}`}
                  className="w-full"
                  draggable={false}
                />
                <img
                  ref={sigRef}
                  src={sigDataUrl}
                  alt="Signature"
                  onMouseDown={onMouseDown}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={() => { isDragging.current = false; }}
                  style={{
                    position: 'absolute',
                    left: activeDoc.sigPos.x,
                    top: activeDoc.sigPos.y,
                    width: activeDoc.sigPos.w,
                    height: activeDoc.sigPos.h,
                    cursor: 'grab',
                    userSelect: 'none',
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))',
                  }}
                  draggable={false}
                />
              </div>

              {/* Size slider */}
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs text-ink-soft whitespace-nowrap">Signature size</label>
                <input
                  type="range"
                  min="80"
                  max="400"
                  value={activeDoc.sigPos.w}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    patchDoc(activeDoc.id, (d) => ({ sigPos: { ...d.sigPos, w, h: Math.round(w / 3) } }));
                  }}
                  className="flex-1"
                />
              </div>

              <div className="actions mt-4">
                <button className="btn btn-primary" disabled={busy} onClick={handleApplySignature}>
                  {busy ? 'Embedding…' : 'Apply signature'}
                </button>
              </div>
            </>
          ) : (
            <div className="mb-3 p-3 rounded-xl flex items-center gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <span style={{ color: '#2f8f5b', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
              <div style={{ flex: 1 }}>
                <div className="text-sm font-semibold text-ink">{activeDoc.name} is signed</div>
                <button onClick={() => undoSignature(activeDoc.id)} className="text-xs text-stamp-blue underline">Place signature again</button>
              </div>
              <button className="btn btn-ghost-sm" onClick={() => downloadDoc(activeDoc)}>Download this document</button>
            </div>
          )}

          {/* Session-wide actions — available as soon as at least one document is signed */}
          {signedCount > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #e2dcc9' }}>
              <p className="text-xs font-semibold text-ink-soft mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {signedCount === documents.length ? 'All documents signed' : 'Finish whenever you\'re ready'}
              </p>
              <div className="flex gap-2 flex-wrap mb-3">
                <button className="btn btn-ghost" onClick={() => downloadDoc(activeDoc)} disabled={!activeDoc.signed}>
                  Download current
                </button>
                {documents.filter((d) => d.signed).length > 1 && (
                  <button className="btn btn-ghost" disabled={busy} onClick={downloadAllAsZip}>
                    {busy ? 'Building ZIP…' : 'Download all (ZIP)'}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={reset}>End signing session</button>
              </div>
              <ContinueWorkingPanel
                toolSlug="sign-documents"
                documentName={activeDoc?.name || 'document.pdf'}
                onDownload={() => downloadDoc(activeDoc)}
                downloading={busy}
              />
            </div>
          )}

          {status && <div className="status success">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      <p className="privacy-note">Your signature and documents never leave your browser — nothing is uploaded to any server.</p>
    </div>
  );
}
