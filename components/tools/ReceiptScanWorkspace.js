'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

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

const FIELD_LABELS = {
  vendor: 'Vendor / Business',
  date: 'Date',
  invoice_number: 'Invoice / Receipt No.',
  payment_method: 'Payment Method',
  subtotal: 'Subtotal',
  tax: 'Tax',
  total: 'Total',
  currency: 'Currency',
  notes: 'Notes',
};

export default function ReceiptScanWorkspace() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
    setStatus('');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleScan() {
    if (!file) return;
    setBusy(true);
    setError('');
    setStatus('Reading your receipt with AI…');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/receipt-scan', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Could not read the receipt.');
      setResult(data);
      setStatus('Done — review the extracted data below.');
    } catch (err) {
      setError(err.message || 'Something went wrong. Try a clearer photo.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function downloadExcel() {
    if (!result) return;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = Object.entries(FIELD_LABELS)
      .filter(([key]) => result[key])
      .map(([key, label]) => [label, result[key]]);
    const summarySheet = XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...summaryRows]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Line items sheet
    if (result.items && result.items.length > 0) {
      const itemRows = result.items.map((item) => [
        item.description || '',
        item.quantity || '',
        item.unit_price || '',
        item.amount || '',
      ]);
      const itemSheet = XLSX.utils.aoa_to_sheet([
        ['Description', 'Quantity', 'Unit Price', 'Amount'],
        ...itemRows,
      ]);
      XLSX.utils.book_append_sheet(wb, itemSheet, 'Line Items');
    }

    XLSX.writeFile(wb, `convertam-receipt-${result.vendor || 'scan'}.xlsx`);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStatus('');
    setError('');
  }

  return (
    <div className="panel">
      {!result && (
        <>
          <p className="text-sm text-ink-soft mb-4">
            Take a clear photo of any receipt, invoice, or bill and upload it below. AI will extract all the key data for you.
          </p>

          <label className="dropzone block cursor-pointer mb-4">
            <input type="file" accept="image/*" onChange={handleFile} hidden />
            <div className="dz-icon">[ JPG · PNG ]</div>
            <div className="dz-main">
              {file ? file.name : 'Click to upload a photo of your receipt or invoice'}
            </div>
            <div className="dz-sub">Works with receipts, invoices, bills, purchase orders.</div>
          </label>

          {preview && (
            <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: '#e2dcc9' }}>
              <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain" style={{ background: '#f7f4ec' }} />
            </div>
          )}

          <div className="actions">
            <button className="btn btn-primary" disabled={!file || busy} onClick={handleScan}>
              {busy ? 'Reading…' : 'Extract Data with AI'}
            </button>
            {file && <button className="btn btn-ghost" onClick={reset}>Clear</button>}
          </div>

          {status && <div className="status success">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink">Extracted Data</h3>
            <button className="btn-ghost-sm" onClick={reset}>Scan another</button>
          </div>

          {/* Summary fields */}
          <div
            className="rounded-xl overflow-hidden mb-4 border"
            style={{ borderColor: '#e2dcc9' }}
          >
            {Object.entries(FIELD_LABELS).map(([key, label]) =>
              result[key] ? (
                <div
                  key={key}
                  className="flex items-start gap-3 px-4 py-2.5 border-b text-sm"
                  style={{ borderColor: '#e2dcc9' }}
                >
                  <span className="text-ink-soft w-40 flex-shrink-0">{label}</span>
                  <span className="font-medium text-ink">{result[key]}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Line items table */}
          {result.items && result.items.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-ink mb-2">Line Items</h4>
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#e2dcc9' }}>
                <table className="w-full text-xs">
                  <thead style={{ background: '#f7f4ec' }}>
                    <tr>
                      {['Description', 'Qty', 'Unit Price', 'Amount'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-ink-soft font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #e2dcc9' }}>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{item.unit_price}</td>
                        <td className="px-3 py-2 font-medium">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="actions">
            <button className="btn btn-primary" onClick={downloadExcel}>
              Download as Excel (.xlsx)
            </button>
          </div>

          {status && <div className="status success">{status}</div>}
        </div>
      )}

      <p className="privacy-note">Your receipt photo is sent securely to our AI engine and immediately discarded.</p>
    </div>
  );
}
