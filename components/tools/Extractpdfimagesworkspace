'use client';

import { useState } from 'react';
import Script from 'next/script';

export default function ExtractPdfImagesWorkspace() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function handleFile(e) {
    setFile(e.target.files?.[0] || null);
    setImages([]);
    setError('');
  }

  async function handleExtract() {
    if (!file) return;
    if (!window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    setBusy(true);
    setError('');
    setImages([]);

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const found = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setStatus(`Scanning page ${pageNum} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNum);

        // Render the page once (off-screen) so pdf.js resolves and caches
        // the embedded image objects referenced in the operator list.
        const viewport = page.getViewport({ scale: 1 });
        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;
        await page.render({ canvasContext: renderCanvas.getContext('2d'), viewport }).promise;

        const opList = await page.getOperatorList();
        const seen = new Set();

        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i];
          const isImageOp = fn === window.pdfjsLib.OPS.paintImageXObject || fn === window.pdfjsLib.OPS.paintJpegXObject;
          if (!isImageOp) continue;

          const objId = opList.argsArray[i][0];
          if (seen.has(objId)) continue;
          seen.add(objId);

          try {
            const imgData = page.objs.get(objId);
            if (!imgData || !imgData.width || !imgData.height) continue;

            const canvas = document.createElement('canvas');
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            const ctx = canvas.getContext('2d');

            if (imgData.data) {
              // Raw pixel data — build an ImageData and paint it
              const channels = imgData.data.length / (imgData.width * imgData.height);
              let rgba;
              if (channels === 4) {
                rgba = imgData.data instanceof Uint8ClampedArray ? imgData.data : new Uint8ClampedArray(imgData.data);
              } else if (channels === 3) {
                rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
                for (let p = 0, q = 0; p < imgData.data.length; p += 3, q += 4) {
                  rgba[q] = imgData.data[p]; rgba[q + 1] = imgData.data[p + 1]; rgba[q + 2] = imgData.data[p + 2]; rgba[q + 3] = 255;
                }
              } else {
                continue; // unsupported pixel format (e.g. CMYK) — skip rather than render garbage
              }
              ctx.putImageData(new ImageData(rgba, imgData.width, imgData.height), 0, 0);
            } else if (imgData.bitmap) {
              ctx.drawImage(imgData.bitmap, 0, 0);
            } else {
              continue;
            }

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (blob && blob.size > 200) { // skip tiny/blank artifacts
              found.push({ blob, url: URL.createObjectURL(blob), page: pageNum, width: imgData.width, height: imgData.height });
            }
          } catch {
            // Some embedded images use encodings pdf.js can't resolve this way — skip and continue
          }
        }
      }

      setImages(found);
      setStatus('');
      if (found.length === 0) {
        setError('No extractable embedded images were found in this PDF. It may only contain full-page scans (try OCR PDF or PDF to Images instead) or images in a format this tool can\'t decode.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong reading this PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function downloadOne(img, i) {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `image-${i + 1}-page${img.page}.png`;
    link.click();
  }

  async function downloadAllZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    images.forEach((img, i) => zip.file(`image-${i + 1}-page${img.page}.png`, img.blob));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted-images.zip';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {images.length === 0 && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to pull its embedded images out</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Works best on PDFs with embedded photos, logos, or figures — not full-page scans.</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {file && (
            <button onClick={handleExtract} disabled={busy} style={{ display: 'block', margin: '20px auto 0', padding: '12px 24px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? (status || 'Working…') : 'Extract Images'}
            </button>
          )}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {images.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{images.length} image{images.length > 1 ? 's' : ''} found</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {images.length > 1 && <button onClick={downloadAllZip} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>⬇ Download All (ZIP)</button>}
              <button onClick={() => { setImages([]); setFile(null); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Start Over</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {images.map((img, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <img src={img.url} alt="" style={{ width: '100%', height: 120, objectFit: 'contain', background: '#F8FAFC' }} />
                <div style={{ padding: 8 }}>
                  <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '0 0 6px' }}>Page {img.page} · {img.width}×{img.height}</p>
                  <button onClick={() => downloadOne(img, i)} style={{ width: '100%', padding: '5px', fontSize: '0.72rem', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>⬇ Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="privacy-note">Your document is processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
