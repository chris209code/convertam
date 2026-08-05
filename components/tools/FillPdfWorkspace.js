'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

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

export default function FillPdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [resultBytes, setResultBytes] = useState(null);

  async function loadFile(f, { fromSession = false } = {}) {
    if (!f) return;
    setFile(f);
    setError('');
    setStatus('Reading form fields…');
    setBusy(true);

    try {
      const buf = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const form = pdfDoc.getForm();
      const formFields = form.getFields();

      if (formFields.length === 0) {
        setError('This PDF does not have digital form fields. It may be a scanned or printed form. Try the "Write on PDF" tool instead — it works on any PDF.');
        setStatus('');
        setBusy(false);
        return;
      }

      const detected = formFields.map((field) => {
        const type = field.constructor.name;
        return {
          name: field.getName(),
          type,
          label: field.getName().replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        };
      });

      setFields(detected);
      const initial = {};
      detected.forEach(f => { initial[f.name] = ''; });
      setValues(initial);
      setStep(2);
      setStatus('');
      setResultBytes(null);
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'fill-pdf' });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Make sure it is not password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e) {
    const f = e.target.files[0];
    await loadFile(f);
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await loadFile(f, { fromSession: true });
  }
  useAutoContinueSession('fill-pdf', continueWithSessionDocument);

  async function handleApply() {
    if (!file) return;
    setBusy(true);
    setStatus('Filling form…');
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const form = pdfDoc.getForm();

      fields.forEach((field) => {
        const value = values[field.name] || '';
        if (!value) return;
        try {
          const type = field.type;
          if (type === 'PDFTextField') {
            form.getTextField(field.name).setText(value);
          } else if (type === 'PDFCheckBox') {
            if (value === 'true' || value === 'yes' || value === '1') {
              form.getCheckBox(field.name).check();
            }
          } else if (type === 'PDFDropdown') {
            try { form.getDropdown(field.name).select(value); } catch {}
          } else if (type === 'PDFRadioGroup') {
            try { form.getRadioGroup(field.name).select(value); } catch {}
          }
        } catch {}
      });

      form.flatten();
      const bytes = await pdfDoc.save();
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'fill-pdf', label: 'Form filled' });
      setStatus('Form filled — choose what to do next.');
    } catch (err) {
      console.error(err);
      setError('Could not fill the form. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes || !file) return;
    const baseName = file.name.replace('.pdf', '');
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), `${baseName}-filled.pdf`);
  }

  function reset() {
    setFile(null);
    setFields([]);
    setValues({});
    setStep(1);
    setStatus('');
    setError('');
    setResultBytes(null);
  }

  return (
    <div className="panel">
      {/* Explainer */}
      <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <p className="font-semibold text-ink mb-1">📋 What is a digital fillable PDF?</p>
        <p className="text-ink-soft mb-2">
          Some PDFs are created with built-in form fields — you can click inside boxes and type directly. 
          Common examples: visa application forms, tax forms, job applications downloaded from official websites.
        </p>
        <p className="font-semibold text-ink mb-1">🖨️ Have a scanned or printed form instead?</p>
        <p className="text-ink-soft">
          If your PDF is a scan of a paper form (like bank transfer forms, government forms), use the{' '}
          <a href="/write-on-pdf" className="underline text-stamp-blue font-semibold">Write on PDF</a>{' '}
          tool instead — it lets you click anywhere and type on any PDF.
        </p>
      </div>

      {/* Step 1 — Upload */}
      {step === 1 && (
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
          <label className="dropzone block cursor-pointer">
            <input type="file" accept="application/pdf" onChange={handleFile} hidden />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to choose a PDF form, or drag it here</div>
            <div className="dz-sub">Works with digital forms that have clickable fields built in.</div>
          </label>
          {status && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* Step 2 — Fill fields */}
      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-ink">{file?.name}</p>
              <p className="text-xs text-ink-soft">{fields.length} field{fields.length !== 1 ? 's' : ''} detected</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Change file</button>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="text-xs font-medium text-ink-soft block mb-1">
                  {field.label}
                  <span className="ml-1 text-[10px]" style={{ color: '#c8c2b4' }}>
                    ({field.type.replace('PDF', '').replace('Field', '').replace('Box', ' Box').replace('Group', ' Group')})
                  </span>
                </label>
                {field.type === 'PDFCheckBox' ? (
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: '#e2dcc9', background: '#fffefb' }}
                    value={values[field.name] || ''}
                    onChange={e => { setValues({ ...values, [field.name]: e.target.value }); setResultBytes(null); }}
                  >
                    <option value="">— not selected —</option>
                    <option value="true">✓ Checked</option>
                    <option value="false">✗ Unchecked</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: '#e2dcc9', background: '#fffefb' }}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={values[field.name] || ''}
                    onChange={e => setValues({ ...values, [field.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          {error && <div className="status error mb-3">{error}</div>}

          {!resultBytes ? (
            <div className="actions">
              <button className="btn btn-primary" disabled={busy} onClick={handleApply}>
                {busy ? 'Filling…' : 'Fill Form'}
              </button>
              <button className="btn btn-ghost" onClick={reset}>Start over</button>
            </div>
          ) : (
            <>
              <ContinueWorkingPanel toolSlug="fill-pdf" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
              <button onClick={() => setResultBytes(null)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                ← Edit fields again
              </button>
            </>
          )}

          {status && <div className="status success">{status}</div>}
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
    </div>
  );
}
