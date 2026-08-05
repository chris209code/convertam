'use client';

import { useState, useRef } from 'react';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

export default function UnlockPdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('convertam-unlocked.pdf');
  const fileRef = useRef();

  async function handleFile(f, { fromSession = false } = {}) {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    setFileInfo({ name: f.name, size: (f.size / 1024).toFixed(0) });
    setStatus('');
    setPassword('');
    setResultBlob(null);
    if (!fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'unlock-pdf' });
      }
    }
  }

  function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    if (f) handleFile(f, { fromSession: true });
  }
  useAutoContinueSession('unlock-pdf', continueWithSessionDocument);

  async function unlock() {
    if (!password) { setStatus('Please enter the PDF\'s current password.'); return; }
    setLoading(true);
    setStatus('Unlocking…');
    try {
      // Genuine password removal requires CloudConvert — pdf-lib in this app
      // has no decryption support, so a wrong-password PDF (or any real
      // encryption) can't be undone client-side.
      const { blob, filename } = await runCloudConvertJob({
        file,
        operation: 'decrypt',
        password,
        onStatus: setStatus,
      });
      const name = filename || 'convertam-unlocked.pdf';
      setResultBlob(blob);
      setResultName(name);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await updateDocument(bytes, { toolSlug: 'unlock-pdf', label: 'Unlocked' });
      setStatus('Unlocked — choose what to do next.');
    } catch (err) {
      const msg = err.message || '';
      if (/password/i.test(msg) && /(wrong|incorrect|invalid)/i.test(msg)) {
        setStatus('That password doesn\'t match this PDF. Double-check it and try again.');
      } else {
        setStatus(msg || 'Could not unlock this PDF. Double-check the password and try again.');
      }
    }
    setLoading(false);
  }

  function reset() {
    setFile(null);
    setFileInfo(null);
    setPassword('');
    setStatus('');
  }

  if (!file || !fileInfo) {
    return (
      <div>
        {session.status === 'active' && session.document && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>already in this session — no need to re-upload.</div>
            </div>
            <button onClick={continueWithSessionDocument} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Continue
            </button>
          </div>
        )}
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer"
          style={{ borderColor: '#e2dcc9', background: '#fffefb' }}
        >
          <div className="text-4xl mb-3">🔓</div>
          <p className="font-medium text-ink mb-1">Drop your password-protected PDF here</p>
          <p className="text-sm text-ink-soft">or click to browse</p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span className="font-medium text-ink">📄 {fileInfo.name} · {fileInfo.size} KB</span>
        <button onClick={reset} className="text-xs text-ink-soft underline ml-3">Change</button>
      </div>
      <p className="privacy-note">Your file is sent securely to remove the password and deleted automatically afterward — genuine PDF decryption isn't something a browser can do on its own.</p>

      {!resultBlob ? (
        <>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Current password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the PDF's current password"
                className="w-full px-4 py-3 rounded-xl text-sm pr-10"
                style={{ border: '1px solid #e2dcc9', background: '#fffefb' }}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button onClick={unlock} disabled={loading || !password} className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
            {loading ? (status || 'Unlocking…') : 'Unlock PDF'}
          </button>
          {status && !loading && (
            <p className="text-sm font-medium text-red-600">{status}</p>
          )}
        </>
      ) : (
        <ContinueWorkingPanel
          toolSlug="unlock-pdf"
          documentName={fileInfo.name}
          onDownload={() => downloadBlob(resultBlob, resultName)}
          downloading={loading}
        />
      )}
      {resultBlob && status && <p className="text-sm font-medium text-green-700">{status}</p>}
    </div>
  );
}
