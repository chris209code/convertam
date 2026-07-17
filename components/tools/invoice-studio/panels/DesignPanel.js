'use client';

import { TEMPLATE_GALLERY } from '@/lib/invoice-studio/styleTokens';

const groupTitle = { fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 };
const groupSub = { fontSize: 11.5, color: '#8891A0', marginBottom: 14, lineHeight: 1.5 };
const miniLabel = { fontSize: 11, color: '#8891A0', marginBottom: 6 };
const fieldWrap = { marginBottom: 16 };

function ToggleRow({ label, on, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0F1F3' }}>
      <span style={{ fontSize: 12.5, color: '#334155' }}>{label}</span>
      <button
        type="button" role="switch" aria-checked={on} onClick={onClick}
        style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', border: 'none', background: on ? '#2563EB' : '#E2E6ED', flexShrink: 0 }}
      >
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'transform .15s', transform: `translateX(${on ? 16 : 0}px)` }} />
      </button>
    </div>
  );
}

export default function DesignPanel({
  templateId, onSelectTemplate,
  colorOverrides, onColorChange,
  docSettings, onDocSettingChange,
  sections, onToggleSection,
}) {
  return (
    <div>
      <div style={groupTitle}>Template</div>
      <div style={groupSub}>Switching templates only changes the visual style — nothing you've entered is affected.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {TEMPLATE_GALLERY.map((t) => (
          <button
            key={t.id} onClick={() => onSelectTemplate(t.id)}
            style={{
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              border: templateId === t.id ? '1.5px solid #2563EB' : '1px solid #E2E6ED',
              background: templateId === t.id ? '#EFF6FF' : '#fff', color: templateId === t.id ? '#2563EB' : '#334155',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div style={sectionTitle}>Colors</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[['brandPrimary', 'Primary'], ['brandSecondary', 'Secondary'], ['brandAccent', 'Accent']].map(([key, label]) => (
          <div key={key} style={{ flex: 1 }}>
            <div style={miniLabel}>{label}</div>
            <input type="color" value={colorOverrides[key]} onChange={(e) => onColorChange(key, e.target.value)} style={{ width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', cursor: 'pointer' }} />
          </div>
        ))}
      </div>

      <div style={sectionTitle}>Document Settings</div>
      <div style={fieldWrap}>
        <div style={miniLabel}>Default VAT %</div>
        <input type="number" value={docSettings.vatRate} onChange={(e) => onDocSettingChange('vatRate', Number(e.target.value))} style={{ width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', padding: '0 10px', fontSize: 12.5 }} />
      </div>
      <div style={fieldWrap}>
        <div style={miniLabel}>Discount Amount</div>
        <input type="number" value={docSettings.discount} onChange={(e) => onDocSettingChange('discount', Number(e.target.value))} style={{ width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', padding: '0 10px', fontSize: 12.5 }} />
      </div>

      <div style={sectionTitle}>Display Options</div>
      <ToggleRow label="Notes" on={sections.notes.visible} onClick={() => onToggleSection('notes')} />
      <ToggleRow label="Show Bank Details" on={sections.bank.visible} onClick={() => onToggleSection('bank')} />
      <ToggleRow label="Signature Block" on={sections.signature.visible} onClick={() => onToggleSection('signature')} />
      <ToggleRow label="Terms & Conditions" on={sections.terms.visible} onClick={() => onToggleSection('terms')} />
      <ToggleRow label="Watermark" on={sections.watermark.visible} onClick={() => onToggleSection('watermark')} />
      <ToggleRow label="QR Payment Code" on={sections.qr.visible} onClick={() => onToggleSection('qr')} />
    </div>
  );
}

const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: '#8891A0', textTransform: 'uppercase', marginBottom: 10, marginTop: 22 };
