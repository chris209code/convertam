'use client';

import { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

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

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const PRESETS = ['CONFIDENTIAL', 'DRAFT', 'COPY', 'APPROVED', 'REJECTED', 'DO NOT DISTRIBUTE'];

const POSITIONS = [
  { id: 'diagonal-center', label: 'Diagonal (center)', angle: 45 },
  { id: 'horizontal-center', label: 'Horizontal (center)', angle: 0 },
  { id: 'top-left', label: 'Top left', angle: 0 },
  { id: 'bottom-right', label: 'Bottom right', angle: 0 },
];

const OPACITIES = [
  { id: 0.15, label: 'Light' },
  { id: 0.35, label: 'Medium' },
  { id: 0.6, label: 'Strong' },
];

const COLORS = [
  { id: '#888888', label: 'Grey' },
  { id: '#cc0000', label: 'Red' },
  { id: '#0044cc', label: 'Blue' },
  { id: '#e2962c', label: 'Amber' },
  { id: '#1a7a3a', label: 'Green' },
];

export default function WatermarkPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.35);
  const [color, setColor] = useState('#888888');
  const [customColor, setCustomColor] = useState('#888888');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [position, setPosition] = useState('diagonal-center');
  const [pages, setPages] = useState('all');
  const [pageRange, setPageRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function handleFiles(files) {
    setFile(files[0] || null);
    setError('');
    setStatus('');
  }

  async function handleApply() {
    if (!file || !text.trim()) {
      setError('Please upload a PDF and enter watermark text.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('Applying watermark…');

    try {
      const pdfBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);
      const allPages = doc.getPages();
      const totalPages = allPages.length;

      // Determine which pages to watermark
      let targetIndices = [];
      if (pages === 'all') {
        targetIndices = allPages.map((_, i) => i);
      } else if (pages === 'first') {
        targetIndices = [0];
      } else if (pages === 'range' && pageRange.trim()) {
        pageRange.split(',').forEach((part) => {
          part = part.trim();
          if (part.includes('-')) {
            const [a, b] = part.split('-').map((n) => parseInt(n) - 1);
            for (let i = a; i <= b; i++) {
              if (i >= 0 && i < totalPages) targetIndices.push(i);
            }
          } else {
            const n = parseInt(part) - 1;
            if (n >= 0 && n < totalPages) targetIndices.push(n);
          }
        });
      }

      const finalColor = hexToRgb(useCustomColor ? customColor : color);
      const posConfig = POSITIONS.find((p) => p.id === position);

      for (const idx of targetIndices) {
        const page = allPages[idx];
        const { width, height } = page.getSize();

        let x, y, rotation;

        switch (position) {
          case 'diagonal-center':
            x = width / 2;
            y = height / 2;
            rotation = degrees(45);
            break;
          case 'horizontal-center':
            x = width / 2;
            y = height / 2;
            rotation = degrees(0);
            break;
          case 'top-left':
            x = 40;
            y = height - fontSize - 20;
            rotation = degrees(0);
            break;
          case 'bottom-right':
            x = width - (text.length * fontSize * 0.6) - 20;
            y = 20;
            rotation = degrees(0);
            break;
          default:
            x = width / 2;
            y = height / 2;
            rotation = degrees(45);
        }

        page.drawText(text.trim(), {
          x,
          y,
          size: fontSize,
          color: finalColor,
          opacity,
          rotate: rotation,
        });
      }

      const signed = await doc.save();
      const baseName = file.name.replace('.pdf', '');
      downloadBlob(
        new Blob([signed], { type: 'application/pdf' }),
        `${baseName}-watermarked.pdf`
      );
      setStatus(`Done — watermark applied to ${targetIndices.length} page${targetIndices.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error(err);
      setError('Could not apply watermark. Make sure the PDF is not password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      {/* File upload */}
      <div
        className="dropzone mb-5"
        onClick={() => document.getElementById('wm-input').click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
          if (files.length) handleFiles(files);
        }}
      >
        <input
          id="wm-input"
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        <div className="dz-icon">[ PDF ]</div>
        <div className="dz-main">
          {file ? file.name : 'Click to choose a PDF, or drag it here'}
        </div>
        <div className="dz-sub">Processed entirely in your browser.</div>
      </div>

      {/* Watermark text */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Watermark text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your watermark text"
          className="range-input"
          maxLength={60}
        />
        <div className="flex gap-2 flex-wrap mt-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setText(p)}
              className={`btn-ghost-sm ${text === p ? 'active-choice' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">
          Size — <span className="text-ink-soft">{fontSize}pt</span>
        </label>
        <div className="flex gap-2">
          {[24, 36, 48, 64, 80].map((s) => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`btn-ghost-sm ${fontSize === s ? 'active-choice' : ''}`}
            >
              {s === 24 ? 'XS' : s === 36 ? 'S' : s === 48 ? 'M' : s === 64 ? 'L' : 'XL'}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Opacity</label>
        <div className="flex gap-2">
          {OPACITIES.map((o) => (
            <button
              key={o.id}
              onClick={() => setOpacity(o.id)}
              className={`btn-ghost-sm ${opacity === o.id ? 'active-choice' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Color</label>
        <div className="flex gap-2 flex-wrap items-center">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setColor(c.id); setUseCustomColor(false); }}
              className={`btn-ghost-sm flex items-center gap-1.5 ${!useCustomColor && color === c.id ? 'active-choice' : ''}`}
            >
              <span
                className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                style={{ background: c.id }}
              />
              {c.label}
            </button>
          ))}
          <label className={`btn-ghost-sm flex items-center gap-1.5 cursor-pointer ${useCustomColor ? 'active-choice' : ''}`}>
            <input
              type="color"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setUseCustomColor(true); }}
              className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
            />
            Custom
          </label>
        </div>
      </div>

      {/* Position */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Position</label>
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPosition(p.id)}
              className={`btn-ghost-sm ${position === p.id ? 'active-choice' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Which pages */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Apply to</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All pages' },
            { id: 'first', label: 'First page only' },
            { id: 'range', label: 'Specific pages' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPages(p.id)}
              className={`btn-ghost-sm ${pages === p.id ? 'active-choice' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {pages === 'range' && (
          <input
            type="text"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="e.g. 1,3,5-8"
            className="range-input mt-2"
          />
        )}
      </div>

      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={!file || !text.trim() || busy}
          onClick={handleApply}
        >
          {busy ? 'Applying…' : 'Apply Watermark & Download'}
        </button>
        {file && (
          <button
            className="btn btn-ghost"
            onClick={() => { setFile(null); setStatus(''); setError(''); }}
          >
            Clear
          </button>
        )}
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Processed entirely in your browser — your file is never uploaded anywhere.</p>
    </div>
  );
}
