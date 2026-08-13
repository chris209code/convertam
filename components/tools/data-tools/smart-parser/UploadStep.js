'use client';
import { useRef, useState } from 'react';
import { T } from './theme';
import { ACCEPT_ATTR, validateFile } from '@/lib/smartParser/limits';

const FORMAT_GROUPS = [
  { label: 'Documents', formats: 'PDF · DOCX' },
  { label: 'Spreadsheets', formats: 'XLSX · XLS · CSV' },
  { label: 'Text', formats: 'TXT' },
  { label: 'Images / Scans', formats: 'JPG · PNG · WebP' },
];

export default function UploadStep({ onFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    onFile(file);
  }

  return (
    <div style={{ fontFamily: T.font, maxWidth: 720, margin: '0 auto' }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(Array.from(e.dataTransfer.files || [])); }}
        style={{
          cursor: 'pointer', textAlign: 'center', padding: '56px 24px', borderRadius: 20,
          border: `2px dashed ${drag ? T.accent : T.accentBorder}`,
          background: drag ? T.accentTint : 'white',
          transition: 'all 0.15s',
        }}
      >
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
        <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>📄</div>
        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: T.ink, marginBottom: 6 }}>Drop a document here or browse your files</div>
        <div style={{ fontSize: '0.85rem', color: T.mutedDark, marginBottom: 20 }}>Upload an invoice, receipt, report, statement, or any document you need structured data from.</div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: T.accentGradient, color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: T.font }}
        >
          Choose a file
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {FORMAT_GROUPS.map((g) => (
          <div key={g.label} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.borderLight}`, background: T.accentTint }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.accentDark, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{g.label}</div>
            <div style={{ fontSize: '0.8rem', color: T.inkSecondary, fontWeight: 600 }}>{g.formats}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: '0.75rem', color: T.muted, textAlign: 'center' }}>Max 100MB per file. Processed temporarily and never stored — see Privacy below.</div>
    </div>
  );
}
