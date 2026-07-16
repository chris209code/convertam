'use client';

import { ChevronLeft, Undo2, Redo2, Minus, Plus, Eye, EyeOff, Save } from 'lucide-react';
import { ZOOM_MIN, ZOOM_MAX } from '@/lib/invoice-studio/constants';

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

export default function Toolbar({
  templateName, canUndo, canRedo, onUndo, onRedo,
  zoom, onZoomIn, onZoomOut, previewMode, onTogglePreview, onBack, onSaveDraft,
}) {
  return (
    <div style={{
      height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px',
      borderBottom: '1px solid #E7EAF0', background: '#fff', overflow: 'hidden',
    }}>
      <button
        onClick={onBack}
        aria-label="Back to template gallery"
        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E6ED', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5B6472', flexShrink: 0, background: '#fff' }}
      >
        <ChevronLeft size={18} />
      </button>

      <div style={{ minWidth: 0, flexShrink: 1 }}>
        <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {templateName}
        </div>
        <div style={{ fontSize: 11, color: '#8891A0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Editing on this device
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={18} /></IconBtn>
      <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></IconBtn>

      <div style={{ width: 1, height: 24, background: '#E7EAF0', margin: '0 4px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F5F8', borderRadius: 8, padding: '4px 8px' }}>
        <IconBtn onClick={onZoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out"><Minus size={16} /></IconBtn>
        <span style={{ fontSize: 12, color: '#5B6472', width: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <IconBtn onClick={onZoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in"><Plus size={16} /></IconBtn>
      </div>

      <button
        onClick={onTogglePreview}
        style={{
          height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #E2E6ED',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: previewMode ? '#EFF6FF' : '#fff', color: previewMode ? '#2563EB' : '#334155',
        }}
      >
        {previewMode ? <EyeOff size={15} /> : <Eye size={15} />}
        {previewMode ? 'Exit Preview' : 'Preview'}
      </button>

      <button
        onClick={onSaveDraft}
        style={{
          height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #E2E6ED', background: '#fff', color: '#334155',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <Save size={15} /> Save Draft
      </button>
    </div>
  );
}
