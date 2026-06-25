'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';

// ─── Pricing Engine ───────────────────────────────────────────────────────────

function calcPrice(pages, fileSizeMB, isScanned, currency) {
  let ngn = 500;
  let usd = 1.00;

  if (pages > 300) {
    ngn += 700; usd += 1.00;
  } else if (pages > 100) {
    ngn += 300; usd += 0.50;
  }

  if (isScanned) {
    ngn += 800; usd += 1.50;
  }

  if (fileSizeMB > 50) {
    ngn += 200; usd += 0.50;
  }

  return { ngn, usd };
}

function complexityScore(pages, fileSizeMB, isScanned) {
  let score = 0;
  score += Math.min(pages / 400, 0.4) * 100;        // pages contribute up to 40%
  score += Math.min(fileSizeMB / 100, 0.2) * 100;   // size contributes up to 20%
  if (isScanned) score += 40;                         // scanned adds 40%
  return Math.min(Math.round(score), 99);
}

function scoreColor(score) {
  if (score < 30) return '#2f8f5b';
  if (score < 60) return '#e2962c';
  return '#e53e3e';
}

function formatPrice(currency, ngn, usd) {
  return currency === 'NGN' ? `₦${ngn.toLocaleString()}` : `$${usd.toFixed(2)}`;
}

function getAmountInSmallestUnit(currency, ngn, usd) {
  return currency === 'NGN' ? ngn * 100 : Math.round(usd * 100);
}

// ─── PDF Analyzer ─────────────────────────────────────────────────────────────

async function analyzePdf(file) {
  const { PDFDocument } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPageCount();

  // Detect if scanned: extract text from first few pages via pdf.js
  let totalChars = 0;
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pagesToCheck = Math.min(5, pdf.numPages);
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      totalChars += content.items.reduce((sum, item) => sum + (item.str || '').length, 0);
    }
  } catch {}

  const avgCharsPerPage = pages > 0 ? totalChars / Math.min(5, pages) : 0;
  const isScanned = avgCharsPerPage < 30; // fewer than 30 chars per page = likely scanned
  const fileSizeMB = file.size / (1024 * 1024);

  return { pages, isScanned, fileSizeMB };
}

// ─── Currency Detection ───────────────────────────────────────────────────────

function detectCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language || '';
    if (tz.startsWith('Africa/Lagos') || tz.startsWith('Africa/Abuja') || lang.includes('en-NG')) {
      return 'NGN';
    }
  } catch {}
  return 'USD';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OfficeConvertWorkspace({ accept, toFormat, toLabel }) {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null); // { pages, isScanned, fileSizeMB }
  const [analyzing, setAnalyzing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const currency = typeof window !== 'undefined' ? detectCurrency() : 'NGN';

  async function handleFiles(files) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setAnalysis(null);
    setPaid(false);
    setError('');
    setStatus('');

    // Only analyze PDFs (not Word/Excel/PPT to PDF)
    if (f.type === 'application/pdf') {
      setAnalyzing(true);
      try {
        const result = await analyzePdf(f);
        setAnalysis(result);
      } catch {
        setAnalysis({ pages: '?', isScanned: false, fileSizeMB: f.size / (1024 * 1024) });
      }
      setAnalyzing(false);
    } else {
      // Non-PDF inputs (Word/Excel/PPT → PDF): use base price
      setAnalysis({ pages: 0, isScanned: false, fileSizeMB: f.size / (1024 * 1024) });
    }
  }

  function handlePay() {
    if (!window.PaystackPop) {
      setError('Payment system still loading. Please try again.');
      return;
    }
    setError('');

    const { ngn, usd } = calcPrice(
      analysis.pages || 0,
      analysis.fileSizeMB,
      analysis.isScanned
    );

    const handler = window.PaystackPop.setup({
      key: 'pk_test_d0ce0abc4daa9a22429362cdc4457fff2b5dbffd',
      email: `user_${Date.now()}@convertam.app`,
      amount: getAmountInSmallestUnit(currency, ngn, usd),
      currency,
      metadata: { tool: toFormat, pages: analysis.pages, scanned: analysis.isScanned },
      callback: async (response) => {
        setVerifying(true);
        try {
          const res = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference }),
          });
          const data = await res.json();
          if (data.verified) {
            setPaid(true);
          } else {
            setError(data.error || 'Payment verification failed. Please contact support.');
          }
        } catch {
          setError('Could not verify payment. Please try again.');
        } finally {
          setVerifying(false);
        }
      },
      onClose: () => setError('Payment was cancelled.'),
    });

    handler.openIframe();
  }

  async function handleConvert() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { blob, filename } = await runCloudConvertJob({
        file,
        operation: 'convert',
        to: toFormat,
        onStatus: setStatus,
      });
      downloadBlob(blob, filename || `convertam-converted.${toFormat}`);
      setStatus('Done — your file has downloaded.');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // ── Step 1: Upload ──
  if (!file) {
    return (
      <>
        <script src="https://js.paystack.co/v1/inline.js" onLoad={() => setPaystackReady(true)} />
        <div className="panel">
          <UploadBox accept={accept} multiple={false} onFiles={handleFiles} />
          <p className="privacy-note">Your file is analyzed locally — nothing is uploaded until you pay.</p>
        </div>
      </>
    );
  }

  // ── Step 2: Analyzing ──
  if (analyzing) {
    return (
      <div className="panel text-center py-10">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="font-display text-xl font-bold mb-2">Analyzing document…</h2>
        <p className="text-ink-soft text-sm">Checking pages, content type, and complexity.</p>
      </div>
    );
  }

  // ── Step 3: Show price ──
  if (analysis && !paid) {
    const { pages, isScanned, fileSizeMB } = analysis;
    const { ngn, usd } = calcPrice(pages, fileSizeMB, isScanned);
    const score = complexityScore(pages, fileSizeMB, isScanned);
    const priceStr = formatPrice(currency, ngn, usd);
    const color = scoreColor(score);

    const reasons = [];
    if (pages > 300) reasons.push(`${pages} pages (large document)`);
    else if (pages > 100) reasons.push(`${pages} pages (medium document)`);
    else if (pages !== 0) reasons.push(`${pages} pages`);
    if (isScanned) reasons.push('Scanned PDF — OCR required');
    if (fileSizeMB > 50) reasons.push(`Large file (${fileSizeMB.toFixed(0)}MB)`);
    if (reasons.length === 0) reasons.push('Standard text PDF');

    return (
      <>
        <script src="https://js.paystack.co/v1/inline.js" onLoad={() => setPaystackReady(true)} />
        <div className="panel">
          {/* File info */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm mb-5"
            style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
            <span className="font-medium text-ink">📄 {file.name} · {fileSizeMB.toFixed(1)}MB</span>
            <button onClick={() => { setFile(null); setAnalysis(null); }}
              className="text-xs text-ink-soft underline ml-3">Change</button>
          </div>

          {/* Complexity score */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-ink-soft">Conversion Complexity</span>
              <span className="text-xs font-bold" style={{ color }}>{score}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#e2dcc9' }}>
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${score}%`, background: color }} />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span style={{ color }}>✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="text-center rounded-2xl px-8 py-5 mb-5"
            style={{ background: '#f0f5ff', border: '2px solid #3a63b8' }}>
            <div className="text-4xl font-bold font-display mb-1" style={{ color: '#3a63b8' }}>
              {priceStr}
            </div>
            <div className="text-xs text-ink-soft">one-time · per conversion · secure payment</div>
          </div>

          {/* Pay button */}
          <button
            className="btn btn-primary w-full py-3 text-base"
            onClick={handlePay}
            disabled={verifying}
          >
            {verifying ? 'Verifying payment…' : `Pay ${priceStr} & Convert`}
          </button>

          {error && <div className="status error mt-3">{error}</div>}

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-ink-soft">
            <span>🔒 Secured by Paystack</span>
            <span>💳 Cards, Bank Transfer, USSD</span>
          </div>
        </div>
      </>
    );
  }

  // ── Step 4: Paid — show convert button ──
  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl text-sm"
        style={{ background: 'rgba(47,143,91,0.1)', color: '#2f8f5b', border: '1px solid rgba(47,143,91,0.2)' }}>
        ✅ Payment confirmed — ready to convert
      </div>

      <div className="file-list mb-4">
        <div className="file-row">
          <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
          <span className="name">{file.name}</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={busy} onClick={handleConvert}>
          {busy ? 'Converting…' : `Convert to ${toLabel}`}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Your file is sent securely to CloudConvert and deleted immediately after download.</p>
    </div>
  );
}
