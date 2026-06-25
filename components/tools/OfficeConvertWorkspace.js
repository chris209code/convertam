'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';

// Free browser-based PDF to text-based Word using pdf.js + docx
async function freeConvertPdfToDocx(file, setStatus) {
  setStatus('Reading PDF…');
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    setStatus(`Extracting text from page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  setStatus('Building Word document…');
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const paragraphs = fullText.split('\n').map(line =>
    new Paragraph({ children: [new TextRun(line)] })
  );
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  return blob;
}

const TIER_INFO = {
  'pdf-to-docx': {
    free: { label: 'Free — Basic', desc: 'Extracts text from simple, selectable PDFs. Tables, images and complex formatting will not be preserved. Great for plain text documents.' },
    premium: { label: 'Premium — ₦500', desc: 'Full conversion via CloudConvert. Preserves tables, columns, images and complex formatting. Best for professional documents.' },
  },
  'pdf-to-xlsx': {
    free: null,
    premium: { label: 'Premium — ₦500', desc: 'Extracts tables and data from PDF into Excel via CloudConvert. No reliable free version exists for this conversion.' },
  },
  'pdf-to-pptx': {
    free: null,
    premium: { label: 'Premium — ₦500', desc: 'Converts PDF pages into editable PowerPoint slides via CloudConvert.' },
  },
};

function getTierKey(accept, toFormat) {
  if (accept === 'application/pdf') return `pdf-to-${toFormat}`;
  return `office-to-${toFormat}`;
}

export default function OfficeConvertWorkspace({ accept, toFormat, toLabel }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState(null); // 'free' | 'premium'

  const tierKey = getTierKey(accept, toFormat);
  const tierInfo = TIER_INFO[tierKey];
  const isPdfInput = accept === 'application/pdf';

  function handleFiles(files) {
    setError(''); setStatus('');
    setFile(files[0] || null);
  }

  async function handleConvert() {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (tier === 'free') {
        const blob = await freeConvertPdfToDocx(file, setStatus);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name.replace(/\.pdf$/i, '') + '-convertam.docx';
        a.click();
        setStatus('Done — your file has downloaded.');
      } else {
        const { blob, filename } = await runCloudConvertJob({
          file, operation: 'convert', to: toFormat, onStatus: setStatus,
        });
        downloadBlob(blob, filename || `convertam-converted.${toFormat}`);
        setStatus('Done — your file has downloaded.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // For non-PDF inputs (Word/Excel/PPT to PDF), just convert free directly
  if (!isPdfInput) {
    return (
      <div className="panel">
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(47,143,91,0.1)', color: '#2f8f5b', border: '1px solid rgba(47,143,91,0.2)' }}>
          ⭐ Free — runs in your browser, no upload needed
        </div>
        <UploadBox accept={accept} multiple={false} onFiles={handleFiles} />
        {file && (
          <div className="file-list">
            <div className="file-row">
              <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
              <span className="name">{file.name}</span>
              <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">×</button>
            </div>
          </div>
        )}
        <div className="actions">
          <button className="btn btn-primary" disabled={!file || busy} onClick={handleConvert}>
            {busy ? 'Converting…' : `Convert to ${toLabel}`}
          </button>
        </div>
        {status && <div className="status success">{status}</div>}
        {error && <div className="status error">{error}</div>}
        <p className="privacy-note">Your file never leaves your device.</p>
      </div>
    );
  }

  // For PDF inputs — show tier picker if tierInfo exists
  if (tierInfo && !tier) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft mb-2">Choose how you want to convert your PDF:</p>

        {tierInfo.free && (
          <button
            onClick={() => setTier('free')}
            className="text-left rounded-2xl p-5 transition-all"
            style={{ background: '#fffefb', border: '2px solid #e2dcc9' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#2f8f5b'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2dcc9'}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: '#2f8f5b' }}>⭐ {tierInfo.free.label}</span>
            </div>
            <p className="text-xs text-ink-soft">{tierInfo.free.desc}</p>
          </button>
        )}

        <button
          onClick={() => setTier('premium')}
          className="text-left rounded-2xl p-5 transition-all"
          style={{ background: '#fffefb', border: '2px solid #e2dcc9' }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#e2962c'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#e2dcc9'}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold" style={{ color: '#e2962c' }}>💎 {tierInfo.premium.label}</span>
          </div>
          <p className="text-xs text-ink-soft">{tierInfo.premium.desc}</p>
        </button>
      </div>
    );
  }

  // After tier selected
  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={tier === 'free'
            ? { background: 'rgba(47,143,91,0.1)', color: '#2f8f5b', border: '1px solid rgba(47,143,91,0.2)' }
            : { background: 'rgba(226,150,44,0.1)', color: '#e2962c', border: '1px solid rgba(226,150,44,0.2)' }
          }>
          {tier === 'free' ? '⭐ Free — Basic' : '💎 Premium — ₦500'}
        </div>
        <button onClick={() => { setTier(null); setFile(null); setStatus(''); setError(''); }}
          className="text-xs text-ink-soft underline">
          Change
        </button>
      </div>

      <UploadBox accept={accept} multiple={false} onFiles={handleFiles} />
      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
            <span className="name">{file.name}</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">×</button>
          </div>
        </div>
      )}
      <div className="actions">
        <button className="btn btn-primary" disabled={!file || busy} onClick={handleConvert}>
          {busy ? 'Converting…' : `Convert to ${toLabel}`}
        </button>
      </div>
      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">
        {tier === 'free'
          ? 'Your file never leaves your device.'
          : 'Your file is sent securely for conversion and deleted automatically afterward.'}
      </p>
    </div>
  );
}
