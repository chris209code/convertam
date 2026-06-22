'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { PDFDocument } from 'pdf-lib';

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

export default function SignPdfWorkspace() {
  const [step, setStep] = useState(1); // 1=upload sig, 2=upload pdf, 3=place sig
  const [sigFile, setSigFile] = useState(null);
  const [sigDataUrl, setSigDataUrl] = useState(null); // cleaned transparent signature
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]); // rendered page canvases as dataURLs
  const [selectedPage, setSelectedPage] = useState(0);
  const [sigPos, setSigPos] = useState({ x: 50, y: 50, w: 180, h: 60 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const previewRef = useRef(null);
  const sigRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Step 1: Remove white background from signature photo
  async function handleSigUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSigFile(file);
    setError('');
    setStatus('Removing background…');
    setBusy(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Make near-white pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const brightness = (r + g + b) / 3;
          if (brightness > 180) {
            // Smooth fade near the threshold
            const alpha = Math.max(0, 255 - (brightness - 180) * 8);
            data[i + 3] = alpha;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const cleaned = canvas.toDataURL('image/png');
        setSigDataUrl(cleaned);
        setStatus('');
        setBusy(false);
        setStep(2);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Step 2: Render PDF pages as images for preview
  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file || !window.pdfjsLib) return;
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
    } catch (err) {
      setError('Could not read that PDF. Make sure it is not password-protected.');
      setStatus('');
      setBusy(false);
    }
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
  }

  // Embed signature into PDF and download
  async function handleDownload() {
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
      const baseName = pdfFile.name.replace('.pdf', '');
      downloadBlob(new Blob([signed], { type: 'application/pdf' }), `${baseName}-signed.pdf`);
      setStatus('Done — your signed PDF has downloaded.');
    } catch (err) {
      console.error(err);
      setError('Could not embed the signature. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep(1);
    setSigFile(null);
    setSigDataUrl(null);
    setPdfFile(null);
    setPdfPages([]);
    setSelectedPage(0);
    setSigPos({ x: 50, y: 50, w: 180, h: 60 });
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
      {step === 1 && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Sign your name on <strong>white paper</strong> with a <strong>dark pen</strong>, then take a clear photo of it and upload below.
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
          {busy && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* STEP 2: Upload PDF */}
      {step === 2 && (
        <div>
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: '#f0f5ff', border: '1px solid #3a63b8' }}>
            <img src={sigDataUrl} alt="Your signature" style={{ height: '40px', maxWidth: '120px', objectFit: 'contain' }} />
            <div>
              <div className="text-xs font-semibold text-ink">Signature ready</div>
              <button onClick={() => setStep(1)} className="text-xs text-stamp-blue underline">Change</button>
            </div>
          </div>
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
                  onClick={() => setSelectedPage(i)}
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
              }}
              className="flex-1"
            />
          </div>

          <div className="actions mt-4">
            <button className="btn btn-primary" disabled={busy} onClick={handleDownload}>
              {busy ? 'Embedding…' : 'Download signed PDF'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
          </div>

          {status && <div className="status success">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      <p className="privacy-note">Your signature and documents never leave your browser — nothing is uploaded to any server.</p>
    </div>
  );
}
