'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MODES, SOCIAL_TYPES, SHOWCASE_TYPES, CANVAS_PRESETS, composeFinalCanvas } from '@/lib/screenshotStudio/compose';
import { FRAME_TYPES } from '@/lib/screenshotStudio/frames';
import { createAnnotation, hitTestAnnotation } from '@/lib/screenshotStudio/annotations';

const PREVIEW_MAX = 460;
const BG_PRESETS = ['#F1F5F9', '#0F172A', '#EFF6FF', '#FEF3C7', '#FFFFFF'];
const GRADIENT_PRESETS = [null, '#93C5FD', '#FCA5A5', '#6EE7B7', '#C4B5FD'];

const labelStyle = { fontSize: '0.76rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.83rem' };
const sectionTitle = { fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2563EB', margin: '16px 0 10px' };
const chipBtn = (active) => ({ padding: '7px 11px', borderRadius: 8, border: active ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: active ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, color: active ? '#1E3A8A' : '#475569' });

const DEFAULT_FIELDS = {
  name: 'Jordan Lee', handle: '@jordanlee', title: 'Product Designer',
  text: 'Just shipped a redesign — check out the before and after 👇',
  quotedName: 'Alex Chen', quotedHandle: '@alexchen', quotedText: 'This is exactly what our team needed.',
  parentName: 'Sam Rivera', parentHandle: '@samrivera', parentText: 'Anyone else notice this?',
  replyName: 'Jordan Lee', replyHandle: '@jordanlee', replyText: 'Yes! Fixed it in the latest release.',
  subreddit: 'webdev', headline: 'See it in action',
};

function loadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ScreenshotStudioWorkspace() {
  const [img, setImg] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [mode, setMode] = useState('device');
  const [subType, setSubType] = useState('generic-browser');
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [showcaseFrameId, setShowcaseFrameId] = useState('none');
  const [dividerPct, setDividerPct] = useState(50);

  const [contentWidth, setContentWidth] = useState(700);
  const [bgColor, setBgColor] = useState('#F1F5F9');
  const [bgGradientTo, setBgGradientTo] = useState(null);
  const [padding, setPadding] = useState(60);
  const [cornerRadius, setCornerRadius] = useState(14);
  const [shadow, setShadow] = useState(true);
  const [canvasPresetId, setCanvasPresetId] = useState('auto');

  const [annotations, setAnnotations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [finalSize, setFinalSize] = useState({ w: 800, h: 600 });
  const [exportFormat, setExportFormat] = useState('png');
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const debounceRef = useRef(null);

  function updateField(key, value) { setFields((f) => ({ ...f, [key]: value })); }

  async function handleUpload(e, which = 'a') {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = await loadImage(file);
    if (which === 'a') setImg(image); else setImgB(image);
  }

  const selected = annotations.find((a) => a.id === selectedId) || null;

  const recompose = useCallback(() => {
    if (!img) return;
    const canvas = composeFinalCanvas({
      mode, subType, img, imgB, fields, contentWidth, showcaseFrameId, dividerPct,
      bgColor, bgGradientTo, padding, cornerRadius, shadow,
      canvasPresetId, annotations, selectedId, interactive: true,
    });
    setFinalSize({ w: canvas.width, h: canvas.height });
    const display = canvasRef.current;
    if (!display) return;
    display.width = canvas.width;
    display.height = canvas.height;
    display.getContext('2d').drawImage(canvas, 0, 0);
  }, [img, imgB, mode, subType, fields, contentWidth, showcaseFrameId, dividerPct, bgColor, bgGradientTo, padding, cornerRadius, shadow, canvasPresetId, annotations, selectedId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(recompose, 90);
    return () => clearTimeout(debounceRef.current);
  }, [recompose]);

  const previewScale = Math.min(1, PREVIEW_MAX / Math.max(finalSize.w, finalSize.h));

  function toNative(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / previewScale, y: (e.clientY - rect.top) / previewScale };
  }

  function onCanvasPointerDown(e) {
    const { x, y } = toNative(e);
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      const hit = hitTestAnnotation(ann, x, y);
      if (hit) {
        setSelectedId(ann.id);
        dragRef.current = { id: ann.id, hit, startX: x, startY: y, startAnn: { ...ann } };
        window.addEventListener('pointermove', onWindowMove);
        window.addEventListener('pointerup', onWindowUp);
        return;
      }
    }
    setSelectedId(null);
  }

  function onWindowMove(e) {
    if (!dragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / previewScale;
    const y = (e.clientY - rect.top) / previewScale;
    const { id, hit, startX, startY, startAnn } = dragRef.current;
    const dx = x - startX, dy = y - startY;
    setAnnotations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      if (a.type === 'arrow') {
        if (hit === 'p1') return { ...a, x1: startAnn.x1 + dx, y1: startAnn.y1 + dy };
        if (hit === 'p2') return { ...a, x2: startAnn.x2 + dx, y2: startAnn.y2 + dy };
        return { ...a, x1: startAnn.x1 + dx, y1: startAnn.y1 + dy, x2: startAnn.x2 + dx, y2: startAnn.y2 + dy };
      }
      if (a.type === 'number') return { ...a, x: startAnn.x + dx, y: startAnn.y + dy };
      if (hit === 'body') return { ...a, x: startAnn.x + dx, y: startAnn.y + dy };
      // corner resize
      let { x: ax, y: ay, w, h } = startAnn;
      if (hit === 'se') { w = Math.max(20, startAnn.w + dx); h = Math.max(20, startAnn.h + dy); }
      if (hit === 'ne') { w = Math.max(20, startAnn.w + dx); h = Math.max(20, startAnn.h - dy); ay = startAnn.y + dy; }
      if (hit === 'sw') { w = Math.max(20, startAnn.w - dx); ax = startAnn.x + dx; h = Math.max(20, startAnn.h + dy); }
      if (hit === 'nw') { w = Math.max(20, startAnn.w - dx); ax = startAnn.x + dx; h = Math.max(20, startAnn.h - dy); ay = startAnn.y + dy; }
      return { ...a, x: ax, y: ay, w, h };
    }));
  }
  function onWindowUp() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onWindowMove);
    window.removeEventListener('pointerup', onWindowUp);
  }

  function addAnnotation(type) {
    const ann = createAnnotation(type, finalSize.w, finalSize.h, type === 'number' ? { n: annotations.filter((a) => a.type === 'number').length + 1 } : {});
    setAnnotations((prev) => [...prev, ann]);
    setSelectedId(ann.id);
  }
  function deleteSelected() {
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  }
  function updateSelected(patch) {
    setAnnotations((prev) => prev.map((a) => (a.id === selectedId ? { ...a, ...patch } : a)));
  }

  async function handleExport() {
    if (!img) return;
    setBusy(true);
    try {
      const canvas = composeFinalCanvas({
        mode, subType, img, imgB, fields, contentWidth, showcaseFrameId, dividerPct,
        bgColor, bgGradientTo, padding, cornerRadius, shadow,
        canvasPresetId, annotations, selectedId: null, interactive: false,
      });
      const mime = exportFormat === 'jpg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
      const url = canvas.toDataURL(mime, 0.95);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${mode}-${subType}.${exportFormat}`;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  const currentSubTypes = mode === 'device' ? FRAME_TYPES : mode === 'social' ? SOCIAL_TYPES : SHOWCASE_TYPES;

  if (!img) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a screenshot to get started</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            Wrap it in a device mockup, turn it into a social post card, or build a before/after showcase.
          </p>
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'a')} />
        </div>
        <p className="privacy-note">Everything happens in your browser — your screenshot is never uploaded to a server.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.1fr)', gap: 28 }}>
        <div>
          <p style={{ ...sectionTitle, marginTop: 0 }}>1. Mode</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {MODES.map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setSubType((m.id === 'device' ? FRAME_TYPES : m.id === 'social' ? SOCIAL_TYPES : SHOWCASE_TYPES)[0].id); }} style={chipBtn(mode === m.id)}>{m.label}</button>
            ))}
          </div>

          <p style={sectionTitle}>2. Type</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {currentSubTypes.map((t) => (
              <button key={t.id} onClick={() => setSubType(t.id)} style={chipBtn(subType === t.id)}>{t.label}</button>
            ))}
          </div>

          {mode === 'social' && (
            <>
              <p style={sectionTitle}>3. Post Content</p>
              {['tweet', 'quoted-tweet'].includes(subType) && (
                <>
                  <label style={labelStyle}>Name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.name} onChange={(e) => updateField('name', e.target.value)} />
                  <label style={labelStyle}>Handle</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.handle} onChange={(e) => updateField('handle', e.target.value)} />
                  <label style={labelStyle}>Post text</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, marginBottom: 8 }} value={fields.text} onChange={(e) => updateField('text', e.target.value)} />
                </>
              )}
              {subType === 'quoted-tweet' && (
                <>
                  <label style={labelStyle}>Quoted name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.quotedName} onChange={(e) => updateField('quotedName', e.target.value)} />
                  <label style={labelStyle}>Quoted handle</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.quotedHandle} onChange={(e) => updateField('quotedHandle', e.target.value)} />
                  <label style={labelStyle}>Quoted text</label>
                  <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 8 }} value={fields.quotedText} onChange={(e) => updateField('quotedText', e.target.value)} />
                </>
              )}
              {subType === 'reply-thread' && (
                <>
                  <label style={labelStyle}>Original poster name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.parentName} onChange={(e) => updateField('parentName', e.target.value)} />
                  <label style={labelStyle}>Original post text</label>
                  <textarea style={{ ...inputStyle, minHeight: 45, marginBottom: 8 }} value={fields.parentText} onChange={(e) => updateField('parentText', e.target.value)} />
                  <label style={labelStyle}>Reply name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.replyName} onChange={(e) => updateField('replyName', e.target.value)} />
                  <label style={labelStyle}>Reply text</label>
                  <textarea style={{ ...inputStyle, minHeight: 45, marginBottom: 8 }} value={fields.replyText} onChange={(e) => updateField('replyText', e.target.value)} />
                </>
              )}
              {['linkedin', 'linkedin-carousel'].includes(subType) && (
                <>
                  <label style={labelStyle}>Name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.name} onChange={(e) => updateField('name', e.target.value)} />
                  <label style={labelStyle}>Title</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.title} onChange={(e) => updateField('title', e.target.value)} />
                  <label style={labelStyle}>Post text</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, marginBottom: 8 }} value={fields.text} onChange={(e) => updateField('text', e.target.value)} />
                </>
              )}
              {subType === 'reddit' && (
                <>
                  <label style={labelStyle}>Subreddit</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.subreddit} onChange={(e) => updateField('subreddit', e.target.value)} />
                  <label style={labelStyle}>Handle</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.handle} onChange={(e) => updateField('handle', e.target.value)} />
                  <label style={labelStyle}>Post text</label>
                  <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 8 }} value={fields.text} onChange={(e) => updateField('text', e.target.value)} />
                </>
              )}
              {subType === 'facebook' && (
                <>
                  <label style={labelStyle}>Name</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.name} onChange={(e) => updateField('name', e.target.value)} />
                  <label style={labelStyle}>Post text</label>
                  <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 8 }} value={fields.text} onChange={(e) => updateField('text', e.target.value)} />
                </>
              )}
              {subType === 'instagram' && (
                <>
                  <label style={labelStyle}>Handle</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.handle} onChange={(e) => updateField('handle', e.target.value)} />
                  <label style={labelStyle}>Caption</label>
                  <textarea style={{ ...inputStyle, minHeight: 50, marginBottom: 8 }} value={fields.text} onChange={(e) => updateField('text', e.target.value)} />
                </>
              )}
            </>
          )}

          {mode === 'showcase' && (
            <>
              <p style={sectionTitle}>3. Content</p>
              {subType === 'before-after' ? (
                <>
                  <label style={labelStyle}>"After" photo</label>
                  <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'b')} style={{ marginBottom: 8 }} />
                  {imgB && <p style={{ fontSize: '0.72rem', color: '#059669', marginBottom: 8 }}>✓ After photo loaded</p>}
                  <label style={labelStyle}>Divider position</label>
                  <input type="range" min="10" max="90" value={dividerPct} onChange={(e) => setDividerPct(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
                </>
              ) : (
                <>
                  <label style={labelStyle}>Headline (optional)</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.headline} onChange={(e) => updateField('headline', e.target.value)} />
                  {subType === 'product' && (
                    <>
                      <label style={labelStyle}>Device frame (optional)</label>
                      <select style={{ ...inputStyle, marginBottom: 8 }} value={showcaseFrameId} onChange={(e) => setShowcaseFrameId(e.target.value)}>
                        <option value="none">No frame</option>
                        {FRAME_TYPES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <p style={sectionTitle}>4. Style</p>
          <label style={labelStyle}>Content width</label>
          <input type="range" min="360" max="1200" value={contentWidth} onChange={(e) => setContentWidth(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
          <label style={labelStyle}>Background color</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {BG_PRESETS.map((c) => (
              <button key={c} onClick={() => setBgColor(c)} style={{ width: 28, height: 28, borderRadius: 7, background: c, border: bgColor === c ? '3px solid #2563EB' : '1px solid #E2E8F0', cursor: 'pointer' }} />
            ))}
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 28, height: 28, padding: 0, border: '1px solid #E2E8F0', borderRadius: 7 }} />
          </div>
          <label style={labelStyle}>Gradient (optional)</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {GRADIENT_PRESETS.map((c, i) => (
              <button key={i} onClick={() => setBgGradientTo(c)} style={{ width: 28, height: 28, borderRadius: 7, background: c ? `linear-gradient(135deg, ${bgColor}, ${c})` : '#fff', border: bgGradientTo === c ? '3px solid #2563EB' : '1px solid #E2E8F0', cursor: 'pointer' }} title={c ? 'Gradient' : 'No gradient'}>{!c && '∅'}</button>
            ))}
          </div>
          <label style={labelStyle}>Padding</label>
          <input type="range" min="0" max="160" value={padding} onChange={(e) => setPadding(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
          <label style={labelStyle}>Corner radius</label>
          <input type="range" min="0" max="48" value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#334155', marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} /> Drop shadow
          </label>
          <label style={labelStyle}>Canvas size</label>
          <select style={{ ...inputStyle, marginBottom: 14 }} value={canvasPresetId} onChange={(e) => setCanvasPresetId(e.target.value)}>
            {CANVAS_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <p style={sectionTitle}>5. Annotate</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={() => addAnnotation('highlight')} style={chipBtn(false)}>▭ Highlight</button>
            <button onClick={() => addAnnotation('blur')} style={chipBtn(false)}>◌ Blur</button>
            <button onClick={() => addAnnotation('arrow')} style={chipBtn(false)}>↗ Arrow</button>
            <button onClick={() => addAnnotation('callout')} style={chipBtn(false)}>💬 Callout</button>
            <button onClick={() => addAnnotation('number')} style={chipBtn(false)}>① Number</button>
          </div>
          {selected && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Editing: {selected.type}</p>
              {selected.type === 'callout' && (
                <input style={{ ...inputStyle, marginBottom: 8 }} value={selected.text} onChange={(e) => updateSelected({ text: e.target.value })} placeholder="Callout text" />
              )}
              <button onClick={deleteSelected} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>Delete</button>
            </div>
          )}
          {annotations.length > 0 && (
            <button onClick={() => { setAnnotations([]); setSelectedId(null); }} style={{ fontSize: '0.74rem', color: '#64748B', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginBottom: 14 }}>Clear all annotations</button>
          )}

          <p style={sectionTitle}>6. Export</p>
          <select style={{ ...inputStyle, marginBottom: 12 }} value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
          </select>
          <button onClick={handleExport} disabled={busy} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Preparing…' : '⬇ Download Image'}
          </button>
          <button onClick={() => { setImg(null); setImgB(null); setAnnotations([]); }} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Upload a different screenshot
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F8FAFC', borderRadius: 16, padding: 20, alignSelf: 'flex-start' }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            style={{ width: finalSize.w * previewScale, height: finalSize.h * previewScale, borderRadius: 8, cursor: 'default', touchAction: 'none', maxWidth: '100%' }}
          />
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>Click an annotation to select, drag to move or resize. Click empty space to deselect.</p>
        </div>
      </div>

      <p className="privacy-note">Everything happens in your browser — your screenshot is never uploaded to a server.</p>
    </div>
  );
}
