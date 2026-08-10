'use client';

import { useState, useEffect } from 'react';
import { inputStyle, labelStyle, errorBox } from './uiStyles';

let nextLocalId = 1;
function localSlideId() { return `local-${Date.now()}-${nextLocalId++}`; }

// The outline approval gate — the spec's required checkpoint between the
// cheap outline call and the expensive full slide-content call. Everything
// here (edit title/summary, add/delete/reorder slides) is local state, zero
// AI calls; only Regenerate and Generate Presentation touch the network.
export default function OutlineStep({ outline, onBack, onRegenerate, onApprove, regenerating, generating, error }) {
  const [local, setLocal] = useState(outline);
  const [editing, setEditing] = useState(false);

  useEffect(() => { setLocal(outline); }, [outline]);

  function updateSlide(i, patch) {
    setLocal((o) => ({ ...o, slides: o.slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }
  function deleteSlide(i) {
    setLocal((o) => ({ ...o, slides: o.slides.filter((_, idx) => idx !== i) }));
  }
  function addSlide(afterIndex) {
    setLocal((o) => {
      const slides = [...o.slides];
      slides.splice(afterIndex + 1, 0, { id: localSlideId(), slideType: 'content', title: 'New Slide', summary: 'Describe what this slide should cover.' });
      return { ...o, slides };
    });
  }
  function moveSlide(i, dir) {
    setLocal((o) => {
      const slides = [...o.slides];
      const j = i + dir;
      if (j < 0 || j >= slides.length) return o;
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...o, slides };
    });
  }

  const busy = regenerating || generating;

  return (
    <div className="panel">
      <div style={{ marginBottom: 20 }}>
        {editing ? (
          <>
            <label style={labelStyle}>Presentation Title</label>
            <input style={{ ...inputStyle, fontWeight: 700, fontSize: '1rem' }} value={local.title} onChange={(e) => setLocal((o) => ({ ...o, title: e.target.value }))} />
            <label style={{ ...labelStyle, marginTop: 8 }}>Subtitle</label>
            <input style={inputStyle} value={local.subtitle || ''} onChange={(e) => setLocal((o) => ({ ...o, subtitle: e.target.value }))} />
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{local.title}</h2>
            {local.subtitle && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>{local.subtitle}</p>}
          </>
        )}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        {local.slides.map((slide, i) => (
          <div key={slide.id || i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Slide {i + 1} · {slide.slideType}</span>
              {editing && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => moveSlide(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === 0 ? '#CBD5E1' : '#475569' }}>↑</button>
                  <button onClick={() => moveSlide(i, 1)} disabled={i === local.slides.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === local.slides.length - 1 ? '#CBD5E1' : '#475569' }}>↓</button>
                  <button onClick={() => deleteSlide(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.75rem' }}>Delete</button>
                </div>
              )}
            </div>
            {editing ? (
              <>
                <input style={{ ...inputStyle, fontWeight: 700, marginBottom: 6 }} value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} />
                <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={slide.summary} onChange={(e) => updateSlide(i, { summary: e.target.value })} />
                <button onClick={() => addSlide(i)} style={{ marginTop: 8, fontSize: '0.72rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add slide after this one</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{slide.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{slide.summary}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={busy}>← Edit Settings</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => onRegenerate()}>
          {regenerating ? 'Regenerating…' : '↻ Regenerate'}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing((v) => !v)}>
          {editing ? 'Done Editing' : '✎ Edit Outline'}
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => onApprove(local)}>
          {generating ? 'Generating presentation…' : 'Generate Presentation →'}
        </button>
      </div>
    </div>
  );
}
