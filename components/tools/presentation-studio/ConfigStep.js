'use client';

import { useState } from 'react';
import { THEMES } from '@/lib/presentation/themes';
import { inputStyle, labelStyle, chipBtn, errorBox } from './uiStyles';

const TONES = ['Professional', 'Academic', 'Educational', 'Sales/Pitch', 'Simple'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Arabic', 'Swahili', 'Hausa', 'Yoruba', 'Igbo', 'Chinese', 'Hindi'];
const SLIDE_COUNTS = [
  { key: 5, label: '5 slides' },
  { key: 8, label: '8 slides' },
  { key: 10, label: '10 slides' },
  { key: 15, label: '15 slides' },
  { key: 'custom', label: 'Custom' },
];

export default function ConfigStep({ initial, onBack, onNext, loading, error }) {
  const [settings, setSettings] = useState(initial || {
    presentationTitle: '', audience: '', purpose: '', tone: 'Professional', language: 'English',
    slideCount: 8, customSlideCount: 10, duration: '', theme: 'modern',
  });

  function set(patch) { setSettings((s) => ({ ...s, ...patch })); }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Presentation Title (optional)</label>
          <input style={inputStyle} value={settings.presentationTitle} onChange={(e) => set({ presentationTitle: e.target.value })} placeholder="Leave blank to let AI suggest one" />
        </div>
        <div>
          <label style={labelStyle}>Audience</label>
          <input style={inputStyle} value={settings.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="e.g. Executive team, students, investors" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={labelStyle}>Purpose</label>
          <input style={inputStyle} value={settings.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="e.g. Report on Q2 performance, pitch a new product" />
        </div>
        <div>
          <label style={labelStyle}>Duration (optional)</label>
          <input style={inputStyle} value={settings.duration} onChange={(e) => set({ duration: e.target.value })} placeholder="e.g. 10 minutes" />
        </div>
      </div>

      <label style={labelStyle}>Tone</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {TONES.map((t) => <button key={t} style={chipBtn(settings.tone === t)} onClick={() => set({ tone: t })}>{t}</button>)}
      </div>

      <label style={labelStyle}>Language</label>
      <select style={{ ...inputStyle, marginBottom: 18, maxWidth: 260 }} value={settings.language} onChange={(e) => set({ language: e.target.value })}>
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <label style={labelStyle}>Length</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {SLIDE_COUNTS.map((l) => <button key={l.key} style={chipBtn(settings.slideCount === l.key)} onClick={() => set({ slideCount: l.key })}>{l.label}</button>)}
      </div>
      {settings.slideCount === 'custom' && (
        <div style={{ marginBottom: 14, maxWidth: 200 }}>
          <input type="number" min={3} max={30} style={inputStyle} value={settings.customSlideCount} onChange={(e) => set({ customSlideCount: Number(e.target.value) })} />
        </div>
      )}

      <label style={{ ...labelStyle, marginTop: 8 }}>Theme</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.values(THEMES).map((t) => (
          <button key={t.key} onClick={() => set({ theme: t.key })} style={{ ...chipBtn(settings.theme === t.key), display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: `#${t.colors.primary}`, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
            {t.label}
          </button>
        ))}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>← Back</button>
        <button className="btn btn-primary" disabled={loading} onClick={() => onNext(settings)}>
          {loading ? 'Creating slide outline…' : '✨ Generate Outline'}
        </button>
      </div>
    </div>
  );
}
