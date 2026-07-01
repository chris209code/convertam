'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import UploadBox from '@/components/UploadBox';

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

export default function SmartConverterWorkspace() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [pdfjsReady, setPdfjsReady] = useState(false);

  function handleFiles(files) {
    setError('');
    setStatus('');
    setResult(null);
    setFile(files[0] || null);
  }

  async function rasterizePdf(pdfFile) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await pdfFile.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const pageCount = Math.min(pdf.numPages, 15);
    const blobs = [];
    for (let i = 1; i <= pageCount; i++) {
      setStatus(`Rendering page ${i} of ${pageCount}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      blobs.push(blob);
    }
    return blobs;
  }

  async function handleRun() {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    setStatus('Preparing…');
    try {
      let images = [];
      if (file.type === 'application/pdf') {
        if (!window.pdfjsLib) {
          setError('Still loading — try again in a second.');
          setBusy(false);
          return;
        }
        images = await rasterizePdf(file);
      } else {
        images = [file];
      }

      setStatus('Reading the document with AI — this can take a moment…');
      const formData = new FormData();
      images.forEach((img, i) => formData.append('images', img, `page-${i + 1}.jpg`));

      const res = await fetch('/api/smart-convert', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not process that file.');
      }

      setResult(data);
      setStatus('Done — review below, then download.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  async function downloadWord() {
    if (!result) return;
    const children = [];

    result.text
      .split('\n')
      .filter((l) => l.trim().length)
      .forEach((line) => children.push(new Paragraph(line)));

    result.tables.forEach((table) => {
      if (table.title) {
        children.push(new Paragraph({ children: [new TextRun({ text: table.title, bold: true })] }));
      }
      const rows = (table.rows || []).map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph(String(cell ?? ''))],
                })
            ),
          })
      );
      if (rows.length) {
        children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(new Paragraph(''));
      }
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, 'convertam-smart-extract.docx');
  }

  function downloadExcel() {
    if (!result) return;
    const wb = XLSX.utils.book_new();
    if (result.tables.length === 0) {
      const rows = result.text.split('\n').map((line) => [line]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Text');
    } else {
      result.tables.forEach((table, i) => {
        const ws = XLSX.utils.aoa_to_sheet(table.rows || []);
        const name = (table.title || `Table ${i + 1}`).slice(0, 28);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
    }
    XLSX.writeFile(wb, 'convertam-smart-extract.xlsx');
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      <UploadBox
        accept="image/*,application/pdf"
        multiple={false}
        onFiles={handleFiles}
        label="Click to choose a photo or scanned PDF, or drag it here"
      />

      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
            <span className="name">{file.name}</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={!file || busy || (file?.type === 'application/pdf' && !pdfjsReady)}
          onClick={handleRun}
        >
          {busy ? 'Working…' : 'Extract with AI'}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}

      {result && (
        <div className="mt-6">
          <label className="text-sm font-medium block mb-2">Extracted text</label>
          <textarea
            value={result.text}
            onChange={(e) => setResult({ ...result, text: e.target.value })}
            className="range-input"
            style={{ minHeight: 180, maxWidth: '100%', width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />

          {result.tables.length > 0 && (
            <div className="mt-5">
              <label className="text-sm font-medium block mb-2">
                Detected table{result.tables.length > 1 ? 's' : ''} ({result.tables.length})
              </label>
              {result.tables.map((table, i) => (
                <div
                  key={i}
                  className="mb-4 overflow-x-auto border rounded-lg"
                  style={{ borderColor: 'var(--rule-light)' }}
                >
                  <table className="text-xs w-full">
                    <tbody>
                      {(table.rows || []).slice(0, 6).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="border px-2 py-1"
                              style={{ borderColor: 'var(--rule-light)' }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.rows && table.rows.length > 6 && (
                    <p className="text-xs text-ink-soft px-2 py-1">
                      …and {table.rows.length - 6} more rows
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="actions">
            <button className="btn btn-primary" onClick={downloadWord}>
              Download as Word (.docx)
            </button>
            <button className="btn btn-amber" onClick={downloadExcel}>
              Download as Excel (.xlsx)
            </button>
          </div>
        </div>
      )}

      <p className="privacy-note">
        Your file is sent securely to our AI engine for reading, then discarded.
      </p>
    </div>
  );
}
