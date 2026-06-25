'use client';

import { useState, useRef } from 'react';

export default function OcrPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
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
    if (!apiKey.trim()) { setStatus('Please enter your Gemini API key.'); return; }
    if (!file) { setStatus('Please select a file first.'); return; }
    setLoading(true); setResult(''); setStatus('');
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const payload = {
        contents: [{ parts: [{ inline_data: { mime_type: file.type || 'application/pdf', data: base64 } }, { text: 'Extract ALL text from this document exactly as it appears. Preserve the original structure, paragraphs, and line breaks. Return only the extracted text with no additional commentary.' }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || `API error ${res.status}`); }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('No text returned.');
      setResult(text);
      setStatus('✅ Text extracted successfully!');
    } catch (e) { setStatus(`Error: ${e.message}`); }
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
      <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5', color: '#3a63b8' }}>
        ✨ Uses Google Gemini AI (free tier). Get your key at{' '}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">aistudio.google.com</a>.
        Your key stays in your browser only.
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Gemini API Key</label>
        <div className="relative">
          <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your API key here" className="w-full px-4 py-3 rounded-xl text-sm pr-10" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }} />
          <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">{showKey ? '🙈' : '👁️'}</button>
        </div>
      </div>
      {!fileInfo ? (
        <div>
          <div onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer" style={{ borderColor: '#e2dcc9', background: '#fffefb' }}>
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
      <button onClick={runOCR} disabled={loading || !file || !apiKey.trim()} className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
        {loading ? 'Extracting text with AI…' : 'Extract Text'}
      </button>
      {status && !result && <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-green-700">{status}</p>
            <div className="flex gap-2">
              <button onClick={copyText} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#f0f0ec', border: '1px solid #e2dcc9', color: '#555' }}>📋 Copy</button>
              <button onClick={downloadText} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#D95F2B' }}>⬇️ Download .txt</button>
            </div>
          </div>
          <pre className="w-full p-4 rounded-xl text-sm overflow-auto" style={{ background: '#fffefb', border: '1px solid #e2dcc9', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, fontFamily: 'inherit', lineHeight: 1.7 }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
