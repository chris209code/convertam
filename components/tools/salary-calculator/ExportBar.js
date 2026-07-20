'use client';

import { useState } from 'react';

const btnStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  padding: '14px 10px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff',
  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', flex: '1 1 130px', minWidth: 110,
};

// All four actions are 100% client-side — nothing here ever sends salary
// data anywhere, matching the "100% Private, no data is stored" badge.
//
// Download PDF: if the caller passes `onDownloadPdf` (the shared
// FinancialReport engine — see components/tools/financial-shared/), that
// runs instead — a real multi-page, paginated A4 document rather than a
// screenshot. `onDownloadPdf` is optional and additive specifically so
// this stays backward compatible: any existing caller that doesn't pass
// it keeps the original html2canvas-screenshot-of-captureRef behavior
// unchanged, byte-for-byte.
export default function ExportBar({ captureRef, buildText, fileNamePrefix, fileNameSuffix = 'salary-summary', onDownloadPdf, shareTitle = 'My Salary Summary' }) {
  const [busy, setBusy] = useState(null); // null | 'pdf' | 'copy' | 'share'
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleDownloadPdf() {
    if (busy) return;
    if (!onDownloadPdf && !captureRef.current) return;
    setBusy('pdf');
    try {
      if (onDownloadPdf) {
        await onDownloadPdf();
        return;
      }
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = await html2canvas(captureRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      // JPEG, not PNG — this capture is a tall, mostly-flat-color results
      // panel (no fine detail worth lossless encoding), and PNG at a
      // sensible resolution still ran into multiple megabytes here. JPEG
      // at high quality is visually indistinguishable for this content and
      // keeps the download fast on a slow connection.
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      // Page sized to the capture's own aspect ratio (fixed width, proportional
      // height) instead of forcing it into a fixed A4 box — the summary panel's
      // height varies with how many optional sections are showing.
      const pageWidthMm = 190;
      const pageHeightMm = (canvas.height / canvas.width) * pageWidthMm;
      const pdf = new jsPDF({ orientation: pageHeightMm > pageWidthMm ? 'portrait' : 'landscape', unit: 'mm', format: [pageWidthMm, pageHeightMm] });
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);
      pdf.save(`${fileNamePrefix}-${fileNameSuffix}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      window.alert('Something went wrong generating the PDF. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopy() {
    if (busy) return;
    setBusy('copy');
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      window.alert('Could not copy to clipboard. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (busy) return;
    setBusy('share');
    try {
      const text = buildText();
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('Share failed:', err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
      <button style={btnStyle} onClick={handleCopy} disabled={busy === 'copy'}>
        <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>📋</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{copied ? 'Copied!' : 'Copy Results'}</span>
        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Copy all results</span>
      </button>
      <button style={btnStyle} onClick={handleDownloadPdf} disabled={busy === 'pdf'}>
        <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>📄</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{busy === 'pdf' ? 'Preparing…' : 'Download PDF'}</span>
        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Save as PDF</span>
      </button>
      <button style={btnStyle} onClick={handlePrint}>
        <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>🖨️</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Print</span>
        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Print this result</span>
      </button>
      <button style={btnStyle} onClick={handleShare} disabled={busy === 'share'}>
        <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>🔗</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{shared ? 'Copied!' : 'Share'}</span>
        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Share with others</span>
      </button>
    </div>
  );
}
