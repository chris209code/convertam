'use client';

import { FileClock } from 'lucide-react';
import { TEMPLATE_GALLERY } from '@/lib/invoice-studio/templates';

const cardStyle = {
  background: '#fff', borderRadius: 14, border: '1px solid #E7EAF0', overflow: 'hidden', cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15,23,42,.03)', textAlign: 'left', padding: 0, font: 'inherit',
};

export default function Gallery({ onSelectTemplate, hasSavedDraft, savedDraftTemplateName, onResumeDraft }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
      <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Invoice Studio</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Pick a template to open the canvas. Every layout is genuinely different, not just a colour swap.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
        {hasSavedDraft && (
          <button onClick={onResumeDraft} style={cardStyle}>
            <div style={{ position: 'relative', height: 130, background: '#F3F5F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileClock size={28} color="#94A3B8" strokeWidth={1.6} />
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Continue Draft</div>
              <div style={{ fontSize: 11, color: '#8891A0', marginTop: 2 }}>{savedDraftTemplateName}</div>
            </div>
          </button>
        )}
        {TEMPLATE_GALLERY.map((card) => (
          <button key={card.id} onClick={() => onSelectTemplate(card.id)} style={cardStyle}>
            <div style={{
              position: 'relative', height: 130,
              background: `repeating-linear-gradient(135deg, hsl(${card.hue},65%,52%), hsl(${card.hue},65%,52%) 10px, hsl(${card.hue},60%,46%) 10px, hsl(${card.hue},60%,46%) 20px)`,
              display: 'flex', alignItems: 'flex-end', padding: 8,
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,.85)', letterSpacing: '.06em' }}>PREVIEW</span>
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{card.name}</div>
              <div style={{ fontSize: 11, color: '#8891A0', marginTop: 2 }}>{card.category}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
