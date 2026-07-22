'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { PDFDocument } from 'pdf-lib';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
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

export default function SignPdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [step, setStep] = useState(1); // 1=upload sig, 2=upload pdf, 3=place sig
  const [resultBytes, setResultBytes] = useState(null); // set once a signature is applied; cleared by any further change
  const [sigStage, setSigStage] = useState('select'); // select | analyzing | manual-crop | needs-enhancer-hint
  const [sourceImg, setSourceImg] = useState(null); // the originally uploaded photo, for the crop fallback
  const [cropRect, setCropRect] = useState(defaultCropRect);
  const [sigFile, setSigFile] = useState(null);
  const [sigDataUrl, setSigDataUrl] = useState(null); // cleaned, isolated signature
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]); // rendered page canvases as dataURLs
  const [selectedPage, setSelectedPage] = useState(0);
  const [sigPos, setSigPos] = useState({ x: 50, y: 50, w: 180, h: 60 });
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
  // to Sign PDF" — re-attempts automatic extraction on the improved image.
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

  // Step 2: Render PDF pages as images for preview. Shared by a fresh
  // upload and a document pulled from an active Document Session.
  async function loadPdfFile(file, { fromSession = false } = {}) {
    if (!file || !window.pdfjsLib) return;
    if (file.size > 100 * 1024 * 1024) {
      setError('That file is larger than the 100MB limit. Please choose a smaller PDF.');
      return;
    }
    setPdfFile(file);
    setError('');
    setStatus('Loading PDF…');
    setBusy(true);

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
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

      setPdfPages(pages);
      setStatus('');
      setBusy(false);
      setStep(3);
      setResultBytes(null);
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(file, { toolSlug: 'sign-pdf' });
        }
      }
    } catch (err) {
      setError('Could not read that PDF. Make sure it is not password-protected.');
      setStatus('');
      setBusy(false);
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    await loadPdfFile(file);
  }

  async function continueWithSessionPdf() {
    const file = getDocumentAsFile();
    await loadPdfFile(file, { fromSession: true });
  }
  // Drag signature on preview
  function onMouseDown(e) {
    e.preventDefault();
    isDragging.current = true;
    const rect = previewRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left - sigPos.x,
      y: e.clientY - rect.top - sigPos.y,
    };
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragStart.current.x;
      const y = e.clientY - rect.top - dragStart.current.y;
      setSigPos((p) => ({ ...p, x: Math.max(0, x), y: Math.max(0, y) }));
      setResultBytes(null);
    }
    function onMouseUp() { isDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Touch support for mobile
  function onTouchStart(e) {
    const touch = e.touches[0];
    isDragging.current = true;
    const rect = previewRef.current.getBoundingClientRect();
    dragStart.current = {
      x: touch.clientX - rect.left - sigPos.x,
      y: touch.clientY - rect.top - sigPos.y,
    };
  }

  function onTouchMove(e) {
    if (!isDragging.current || !previewRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = previewRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left - dragStart.current.x;
    const y = touch.clientY - rect.top - dragStart.current.y;
    setSigPos((p) => ({ ...p, x: Math.max(0, x), y: Math.max(0, y) }));
    setResultBytes(null);
  }

  // Embeds the signature into the PDF and hands the result to the Document
  // Session instead of downloading immediately — Continue Working or
  // Download becomes an explicit choice (see ContinueWorkingPanel below).
  async function handleApplySignature() {
    if (!pdfFile || !sigDataUrl) return;
    setBusy(true);
    setStatus('Embedding signature…');
    try {
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const page = pages[selectedPage];
      const { width: pageW, height: pageH } = page.getSize();

      // Convert preview coordinates to PDF coordinates
      const previewEl = previewRef.current;
      const scaleX = pageW / previewEl.offsetWidth;
      const scaleY = pageH / previewEl.offsetHeight;

      // PDF coordinates: y=0 is bottom, so flip
      const pdfX = sigPos.x * scaleX;
      const pdfY = pageH - (sigPos.y * scaleY) - (sigPos.h * scaleY);
      const pdfW = sigPos.w * scaleX;
      const pdfH = sigPos.h * scaleY;

      // Embed signature PNG
      const sigRes = await fetch(sigDataUrl);
      const sigBuf = await sigRes.arrayBuffer();
      const sigImage = await pdfDoc.embedPng(sigBuf);

      page.drawImage(sigImage, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
      });

      const signed = await pdfDoc.save();
      setResultBytes(signed);
      await updateDocument(signed, { toolSlug: 'sign-pdf', label: 'Signed' });
      setStatus('Signature placed — choose what to do next.');
    } catch (err) {
      console.error(err);
      setError('Could not embed the signature. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — the session stays active until the user closes it (see
  // WorkspaceSidebar) or starts a new document.
  function downloadResult() {
    if (!resultBytes || !pdfFile) return;
    const baseName = pdfFile.name.replace('.pdf', '');
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), `${baseName}-signed.pdf`);
    setStatus('Done — your signed PDF has downloaded.');
  }

  function reset() {
    setStep(1);
    setSigStage('select');
    setSourceImg(null);
    setCropRect(defaultCropRect);
    setSigFile(null);
    setSigDataUrl(null);
    setPdfFile(null);
    setPdfPages([]);
    setSelectedPage(0);
    setSigPos({ x: 50, y: 50, w: 180, h: 60 });
    setStatus('');
    setError('');
    setResultBytes(null);
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      {/* Step indicators */}
      <div className="flex gap-3 mb-6">
        {['Upload signature', 'Upload PDF', 'Place & download'].map((label, i) => (
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
            Sign your name on <strong>white paper</strong> with a <strong>dark pen</strong>, then take a clear photo of it and upload below. Convertam will try to automatically isolate just your signature.
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

      {/* STEP 2: Upload PDF */}
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
              <div className="text-xs font-semibold text-ink">Signature ready</div>
              <button onClick={() => { setStep(1); setSigStage('select'); setImportedFromEnhancer(false); }} className="text-xs text-stamp-blue underline">Change</button>
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
          <p className="text-sm text-ink-soft mb-4">Now upload the PDF you want to sign.</p>
          <label className="dropzone block cursor-pointer" style={{ borderColor: '#e2dcc9' }}>
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={!pdfjsReady} hidden />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to upload your PDF</div>
            <div className="dz-sub">Max 100MB. Processed entirely in your browser.</div>
          </label>
          {busy && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* STEP 3: Place signature */}
      {step === 3 && (
        <div>
          <p className="text-sm text-ink-soft mb-3">
            Drag your signature to the correct position. Use the size slider to resize it.
          </p>

          {/* Page selector */}
          {pdfPages.length > 1 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {pdfPages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPage(i); setResultBytes(null); }}
                  className={`btn-ghost-sm ${selectedPage === i ? 'active-choice' : ''}`}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* PDF preview with draggable signature */}
          <div
            ref={previewRef}
            className="relative border rounded-xl overflow-hidden select-none"
            style={{ borderColor: '#e2dcc9', background: '#fff', cursor: 'default' }}
          >
            <img
              src={pdfPages[selectedPage]?.dataUrl}
              alt={`Page ${selectedPage + 1}`}
              className="w-full"
              draggable={false}
            />
            {/* Draggable signature */}
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
                left: sigPos.x,
                top: sigPos.y,
                width: sigPos.w,
                height: sigPos.h,
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
              value={sigPos.w}
              onChange={(e) => {
                const w = Number(e.target.value);
                setSigPos((p) => ({ ...p, w, h: Math.round(w / 3) }));
                setResultBytes(null);
              }}
              className="flex-1"
            />
          </div>

          {!resultBytes ? (
            <div className="actions mt-4">
              <button className="btn btn-primary" disabled={busy} onClick={handleApplySignature}>
                {busy ? 'Embedding…' : 'Apply signature'}
              </button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </div>
          ) : (
            <>
              <ContinueWorkingPanel toolSlug="sign-pdf" documentName={pdfFile?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
              <div className="mt-3">
                <button className="btn btn-ghost" onClick={() => setResultBytes(null)}>← Place signature again</button>
              </div>
            </>
          )}

          {status && <div className="status success">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      <p className="privacy-note">Your signature and documents never leave your browser — nothing is uploaded to any server.</p>
    </div>
  );
}
