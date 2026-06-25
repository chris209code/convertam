'use client';

import { useState, useRef } from 'react';

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '', color: '' },
    { label: 'Weak', color: '#e53e3e' },
    { label: 'Fair', color: '#DD6B20' },
    { label: 'Good', color: '#D69E2E' },
    { label: 'Strong', color: '#38A169' },
    { label: 'Very strong', color: '#2B6CB0' },
  ];
  return levels[Math.min(score, 5)];
}

export default function ProtectPdfWorkspace() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') return;
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(buffer);
    setFileInfo({ name: file.name, pages: doc.getPageCount(), size: (file.size / 1024).toFixed(0) });
    setStatus('');
  }

  async function protect() {
    if (!pw1) { setStatus('Please enter a password.'); return; }
    if (pw1 !== pw2) { setStatus('Passwords do not match.'); return; }
    setLoading(true); setStatus('');
    try {
      const { PDFDocument, EncryptionAlgorithm } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const saveOptions = { userPassword: pw1, ownerPassword: pw1 + '_owner_convertam', permissions: { printing: 'highResolution', copying: false, modifying: false, annotating: false } };
      if (EncryptionAlgorithm?.AES_256) saveOptions.encryptionAlgorithm = EncryptionAlgorithm.AES_256;
      const newBytes = await pdfDoc.save(saveOptions);
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'convertam-protected.pdf';
      a.click();
      setStatus('✅ PDF protected! Your download should start.');
    } catch { setStatus('Encryption failed. This PDF may already be protected.'); }
    setLoading(false);
  }

  function reset() { setPdfBytes(null); setFileInfo(null); setPw1(''); setPw2(''); setStatus(''); }

  const strength = getStrength(pw1);
  const strengthIndex = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'].indexOf(strength.label);

  if (!pdfBytes) {
    return (
      <div>
        <div onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer" style={{ borderColor: '#e2dcc9', background: '#fffefb' }}>
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-ink mb-1">Drop your PDF here</p>
          <p className="text-sm text-ink-soft">or click to browse</p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span className="font-medium text-ink">📄 {fileInfo.name} · {fileInfo.pages} pages · {fileInfo.size} KB</span>
        <button onClick={reset} className="text-xs text-ink-soft underline ml-3">Change</button>
      </div>
      <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FFFBE8', border: '1px solid #F0D070', color: '#7A6000' }}>
        ⚠️ <strong>Remember this password.</strong> Forgotten passwords cannot be recovered.
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Password</label>
        <div className="relative">
          <input type={show1 ? 'text' : 'password'} value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Enter a strong password" className="w-full px-4 py-3 rounded-xl text-sm pr-10" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }} />
          <button type="button" onClick={() => setShow1(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">{show1 ? '🙈' : '👁️'}</button>
        </div>
        {pw1 && (
          <div className="mt-2">
            <div className="h-1 rounded-full" style={{ background: '#e2dcc9' }}>
              <div className="h-1 rounded-full transition-all" style={{ width: `${strengthIndex * 20}%`, background: strength.color }} />
            </div>
            <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Confirm password</label>
        <div className="relative">
          <input type={show2 ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat the password" className="w-full px-4 py-3 rounded-xl text-sm pr-10" style={{ border: `1px solid ${pw2 && pw2 !== pw1 ? '#e53e3e' : '#e2dcc9'}`, background: '#fffefb' }} />
          <button type="button" onClick={() => setShow2(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">{show2 ? '🙈' : '👁️'}</button>
        </div>
        {pw2 && pw2 !== pw1 && <p className="text-xs mt-1 text-red-600">Passwords do not match</p>}
      </div>
      <button onClick={protect} disabled={loading || !pw1 || pw1 !== pw2} className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
        {loading ? 'Encrypting…' : 'Protect & Download PDF'}
      </button>
      {status && <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
    </div>
  );
}
