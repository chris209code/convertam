'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Undo2, Redo2, Minus, Plus, Download, ChevronDown, FileText, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { ZOOM_MIN, ZOOM_MAX } from '@/lib/invoice-studio/constants';

// Distinct color per document type so the badge reads at a glance, not just
// by the text — matters most right after a conversion, when the type just
// changed and a person needs to register that immediately.
const DOC_TYPE_COLORS = {
  invoice: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  quotation: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  'delivery-note': { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  waybill: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
};

// A bold, colored badge showing the active document type — INVOICE,
// QUOTATION, DELIVERY NOTE, or WAYBILL — impossible to miss at the top of
// the editor. Also the switcher: selecting a different type doesn't apply
// immediately here, the workspace shows a confirmation first (see
// BusinessDocumentStudioWorkspace's requestDocTypeChange) explaining what
// will be hidden or adapted, per the navigation requirement.
function DocTypeMenu({ options, current, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = options.find((o) => o.id === current)?.label || current;
  const colors = DOC_TYPE_COLORS[current] || DOC_TYPE_COLORS.invoice;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Document type: ${currentLabel}. Click to switch.`}
        style={{
          height: 40, padding: '0 14px', borderRadius: 10, border: `1.5px solid ${colors.border}`,
          background: colors.bg, display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontSize: 14.5, fontWeight: 800,
          letterSpacing: '.03em', textTransform: 'uppercase', color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {currentLabel} <ChevronDown size={16} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 46, left: 0, background: '#fff', border: '1px solid #E2E6ED', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)', minWidth: 190, overflow: 'hidden', zIndex: 20 }}>
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => { setOpen(false); if (o.id !== current) onSelect(o.id); }}
              style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: o.id === current ? '#EFF6FF' : 'none', textAlign: 'left', fontSize: 13, fontWeight: o.id === current ? 700 : 500, color: o.id === current ? '#2563EB' : '#334155', cursor: 'pointer' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 8, border: '1px solid transparent', background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#CBD5E1' : '#334155',
      }}
    >
      {children}
    </button>
  );
}

function DownloadMenu({ onDownload, isDownloading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function choose(format) {
    setOpen(false);
    onDownload(format);
  }

  const optionStyle = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isDownloading}
        aria-busy={isDownloading}
        style={{
          height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: isDownloading ? '#93B4F5' : '#2563EB', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
          cursor: isDownloading ? 'default' : 'pointer',
        }}
      >
        <Download size={15} /> {isDownloading ? 'Preparing…' : 'Download'} <ChevronDown size={14} />
      </button>
      {open && !isDownloading && (
        <div style={{ position: 'absolute', top: 42, right: 0, background: '#fff', border: '1px solid #E2E6ED', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)', minWidth: 180, overflow: 'hidden', zIndex: 20 }}>
          <button onClick={() => choose('pdf')} style={optionStyle}><FileText size={16} color="#DC2626" /> Download PDF</button>
          <button onClick={() => choose('png')} style={optionStyle}><ImageIcon size={16} color="#2563EB" /> Download PNG</button>
          <button onClick={() => choose('jpg')} style={optionStyle}><ImageIcon size={16} color="#10B981" /> Download JPG</button>
        </div>
      )}
    </div>
  );
}

export default function Toolbar({
  templateName, canUndo, canRedo, onUndo, onRedo,
  zoom, onZoomIn, onZoomOut, onResetToFit, onDownload, onBack, isDownloading,
  docTypeOptions, docType, onSwitchDocType, convertTargetLabel, onConvert,
}) {
  return (
    <div style={{
      height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px',
      borderBottom: '1px solid #E7EAF0', background: '#fff', flexWrap: 'wrap',
    }}>
      <button
        onClick={onBack}
        aria-label="Back to template gallery"
        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E6ED', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5B6472', flexShrink: 0, background: '#fff' }}
      >
        <ChevronLeft size={18} />
      </button>

      {docTypeOptions && <DocTypeMenu options={docTypeOptions} current={docType} onSelect={onSwitchDocType} />}

      <div style={{ minWidth: 0, flexShrink: 1 }}>
        <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {templateName}
        </div>
        <div style={{ fontSize: 11, color: '#8891A0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Editing on this device
        </div>
      </div>

      {convertTargetLabel && (
        <button
          onClick={onConvert}
          style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #2563EB', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Convert to {convertTargetLabel} <ArrowRight size={14} />
        </button>
      )}

      <div style={{ flex: 1 }} />

      <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={18} /></IconBtn>
      <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></IconBtn>

      <div style={{ width: 1, height: 24, background: '#E7EAF0', margin: '0 4px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F5F8', borderRadius: 8, padding: '4px 8px' }}>
        <IconBtn onClick={onZoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out"><Minus size={16} /></IconBtn>
        <button
          onClick={onResetToFit}
          title="Reset to Fit Page"
          style={{ fontSize: 12, color: '#5B6472', width: 42, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconBtn onClick={onZoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in"><Plus size={16} /></IconBtn>
      </div>

      <DownloadMenu onDownload={onDownload} isDownloading={isDownloading} />
    </div>
  );
}
