'use client';

import { useState, useRef } from 'react';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';

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
  const { session, startSession, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();

  async function handleFile(f, { fromSession = false } = {}) {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(await f.arrayBuffer());
      setFileInfo({ name: f.name, pages: doc.getPageCount(), size: (f.size / 1024).toFixed(0) });
    } catch {
      setFileInfo({ name: f.name, pages: '?', size: (f.size / 1024).toFixed(0) });
    }
    setStatus('');
    if (!fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'protect-pdf' });
      }
    }
  }

  function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    if (f) handleFile(f, { fromSession: true });
  }

  async function protect() {
    if (!pw1) { setStatus('Please enter a password.'); return; }
    if (pw1 !== pw2) { setStatus('Passwords do not match.'); return; }
    setLoading(true); setStatus('Encrypting…');
    try {
      // Real password protection requires CloudConvert — the pdf-lib
      // version this app uses has no encryption support at all, so this
      // can't be done client-side (see convert-route.js / start/route.js
      // for the 'encrypt' operation this calls).
      const { blob, filename } = await runCloudConvertJob({
        file,
        operation: 'encrypt',
        password: pw1,
        onStatus: setStatus,
      });
      downloadBlob(blob, filename || 'convertam-protected.pdf');
      setStatus('✅ PDF protected! Your download should start.');
    } catch (err) {
      setStatus(err.message || 'Encryption failed. Please try again.');
    }
    setLoading(false);
  }

  function reset() { setFile(null); setFileInfo(null); setPw1(''); setPw2(''); setStatus(''); }

  const strength = getStrength(pw1);
  const strengthIndex = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'].indexOf(strength.label);

  // Gated on fileInfo, not file: setFile(f) commits synchronously but
  // fileInfo is set after an await (pdf-lib's dynamic import + parse), so a
  // gate on file alone rendered the "loaded" view mid-async-gap and crashed
  // reading fileInfo.name on a still-null fileInfo — pre-existing, just
  // never hit until Continue made this a fast, real, repeatable path.
  if (!file || !fileInfo) {
    return (
      <div>
        {session.status === 'active' && session.document && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {session.document.pageCount ? `${session.document.pageCount} pages · ` : ''}already in this session — no need to re-upload.
              </div>
            </div>
            <button onClick={continueWithSessionDocument} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Continue
            </button>
          </div>
        )}
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
      <p className="privacy-note">Your file is sent securely to encrypt it with a real password and deleted automatically afterward — genuine PDF encryption isn't something a browser can do on its own.</p>
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
        {loading ? (status || 'Encrypting…') : 'Protect & Download PDF'}
      </button>
      {status && !loading && (
        <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>
      )}
    </div>
  );
}
