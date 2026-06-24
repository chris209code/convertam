'use client';

import { useState } from 'react';
import Script from 'next/script';
import { PDFDocument } from 'pdf-lib';

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
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1=upload, 2=fill, 3=done

  async function handleFile(e) {
    const f = e.target.files[0];
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
        setError('This PDF does not have fillable form fields. Try a different PDF or use the Smart AI Converter to extract text.');
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
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Make sure it is not password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
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

      // Flatten the form so fields are embedded
      form.flatten();

      const bytes = await pdfDoc.save();
      const baseName = file.name.replace('.pdf', '');
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}-filled.pdf`);
      setStatus('Done — your filled PDF has downloaded.');
      setStep(3);
    } catch (err) {
      console.error(err);
      setError('Could not fill the form. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setFields([]);
    setValues({});
    setStep(1);
    setStatus('');
    setError('');
  }

  return (
    <div className="panel">

      {/* Step 1 — Upload */}
      {step === 1 && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Upload a PDF with fillable form fields. Convertam will detect all fields and let you type directly into them.
          </p>
          <label className="dropzone block cursor-pointer">
            <input type="file" accept="application/pdf" onChange={handleFile} hidden />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to choose a PDF form, or drag it here</div>
            <div className="dz-sub">Works with government forms, job applications, bank forms, and more.</div>
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
                    onChange={e => setValues({ ...values, [field.name]: e.target.value })}
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

          <div className="actions">
            <button className="btn btn-primary" disabled={busy} onClick={handleDownload}>
              {busy ? 'Filling…' : 'Download Filled PDF'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
          </div>

          {status && <div className="status success">{status}</div>}
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold text-ink text-lg mb-2">Form filled successfully!</h3>
          <p className="text-sm text-ink-soft mb-6">Your filled PDF has downloaded to your device.</p>
          <div className="actions justify-center">
            <button className="btn btn-primary" onClick={reset}>Fill another form</button>
          </div>
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
    </div>
  );
}
