'use client';

import { useState, useRef } from 'react';

export default function OcrPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setFileInfo({ name: f.name, size: (f.size / 1024).toFixed(0) });
    setResult(''); setStatus('');
  }

  async function runOCR() {
    if (!file) { setStatus('Please select a file first.'); return; }
    setLoading(true); setResult(''); setStatus('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ocr-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (!data.text) throw new Error('No text returned.');

      setResult(data.text);
      setStatus('✅ Text extracted successfully!');
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  function copyText() { navigator.clipboard.writeText(result); }

  function downloadText() {
    const blob = new Blob([result], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (fileInfo?.name?.replace(/\.(pdf|png|jpg|jpeg)$/i, '') || 'document') + '-ocr.txt';
    a.click();
  }

  function reset() { setFile(null); setFileInfo(null); setResult(''); setStatus(''); }

  return (
    <div className="flex flex-col gap-5">
      {!fileInfo ? (
        <div>
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer"
            style={{ borderColor: '#e2dcc9', background: '#fffefb' }}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium text-ink mb-1">Drop your PDF or image here</p>
            <p className="text-sm text-ink-soft">Supports PDF, JPG, PNG — works on scans & handwriting</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
          <span className="font-medium text-ink">📄 {fileInfo.name} · {fileInfo.size} KB</span>
          <button onClick={reset} className="text-xs text-ink-soft underline ml-3">Change</button>
        </div>
      )}

      <button
        onClick={runOCR}
        disabled={loading || !file}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
        style={{ background: '#2563EB' }}
      >
        {loading ? 'Extracting text with AI…' : 'Extract Text'}
      </button>

      {status && !result && (
        <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
          {status}
        </p>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-green-700">{status}</p>
            <div className="flex gap-2">
              <button onClick={copyText} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#f0f0ec', border: '1px solid #e2dcc9', color: '#555' }}>📋 Copy</button>
              <button onClick={downloadText} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#2563EB' }}>⬇️ Download .txt</button>
            </div>
          </div>
          <pre className="w-full p-4 rounded-xl text-sm overflow-auto" style={{ background: '#fffefb', border: '1px solid #e2dcc9', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, fontFamily: 'inherit', lineHeight: 1.7 }}>
            {result}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span>🔒</span>
        <span className="text-ink-soft">Your files are automatically deleted after processing and are never shared with third parties.</span>
      </div>
    </div>
  );
}
