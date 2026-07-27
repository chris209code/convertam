'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  framesFor, SOCIAL_PLATFORMS, socialTypesFor, CANVAS_PRESETS, composeFinalCanvas,
} from '@/lib/screenshotStudio/compose';
import { createAnnotation, hitTestAnnotation } from '@/lib/screenshotStudio/annotations';
import { getBrandKit, saveBrandKit, downscaleLogoFile, loadImageFromDataURL } from '@/lib/screenshotStudio/brandKit';
import { EXPORT_PRESETS, getExportPreset } from '@/lib/screenshotStudio/exportPresets';
import { consumeHandoffImage } from '@/lib/screenshotStudio/handoff';

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
  subreddit: 'webdev', headline: '',
};

// The entry — "What are you trying to create?" — replaces a flat list of
// tool tabs with outcome-first doors. Documentation is named here because
// it's a real, permanent part of the taxonomy, but it isn't built yet (a
// batch upload + one-template-many-images engine is real new plumbing), so
// it stays visibly disabled rather than pretending to work.
const WORKSPACES = [
  { id: 'website', title: 'Website Showcase', desc: 'Show a website or web app in a real browser, laptop, or monitor.' },
  { id: 'app', title: 'App Showcase', desc: 'Show a mobile or native app in a real phone, tablet, or desktop frame.' },
  { id: 'social', title: 'Social Posts', desc: 'Wrap a screenshot in authentic platform chrome — X, LinkedIn, and more.' },
  { id: 'before-after', title: 'Before & After', desc: 'Prove a change with a side-by-side comparison.' },
  { id: 'annotate', title: 'Just Annotate', desc: 'Circle, blur, or callout something — no framing, no background.' },
  { id: 'documentation', title: 'Documentation', desc: 'Consistent, numbered screenshots across a whole guide.', comingSoon: true },
];

const VALID_WORKSPACES = ['website', 'app', 'social', 'before-after', 'annotate'];

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
  const [workspace, setWorkspace] = useState(null);
  const [img, setImg] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [subType, setSubType] = useState(null);
  const [socialPlatform, setSocialPlatform] = useState('x');
  const [fields, setFields] = useState(DEFAULT_FIELDS);
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
  const [exportPresetId, setExportPresetId] = useState('website');
  const [exportFormat, setExportFormat] = useState('png');
  const [advancedExport, setAdvancedExport] = useState(false);
  const [busy, setBusy] = useState(false);

  const [brandKit, setBrandKitState] = useState({ logo: null, colors: [] });
  const [brandLogoImg, setBrandLogoImg] = useState(null);
  const [showBrandLogo, setShowBrandLogo] = useState(false);
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [brandColorDraft, setBrandColorDraft] = useState(['#1E3A8A', '#2563EB', '#F59E0B']);

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const debounceRef = useRef(null);

  // Loads the saved Brand Kit once, and honors a ?ws= handoff from another
  // Convertam tool — a handoff already knows what it's creating, so it
  // skips straight past the entry question instead of re-asking it.
  useEffect(() => {
    const kit = getBrandKit();
    setBrandKitState(kit);
    if (kit.colors.length) setBrandColorDraft((d) => [kit.colors[0] || d[0], kit.colors[1] || d[1], kit.colors[2] || d[2]]);
    if (kit.logo) loadImageFromDataURL(kit.logo).then(setBrandLogoImg);

    const params = new URLSearchParams(window.location.search);
    const ws = params.get('ws');
    if (VALID_WORKSPACES.includes(ws)) openWorkspace(ws);

    // A handoff from another Convertam tool already answers "what are you
    // creating?" and "with what?" — so it skips the entry screen (above)
    // and the upload step (below) entirely, landing straight in the editor.
    if (params.get('handoff') === '1') {
      const dataUrl = consumeHandoffImage();
      if (dataUrl) loadImageFromDataURL(dataUrl).then((image) => { if (image) setImg(image); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openWorkspace(id) {
    setWorkspace(id);
    if (id === 'website') { setSubType('generic-browser'); setExportPresetId('website'); }
    else if (id === 'app') { setSubType('iphone'); setExportPresetId('website'); }
    else if (id === 'social') { setSocialPlatform('x'); setSubType('tweet'); }
    else if (id === 'before-after') { setSubType(null); setExportPresetId('blog'); }
    else setSubType(null);
  }

  function backToEntry() {
    setWorkspace(null);
    setImg(null);
    setImgB(null);
    setAnnotations([]);
    setSelectedId(null);
    setFields(DEFAULT_FIELDS);
  }

  function selectPlatform(p) {
    setSocialPlatform(p);
    setSubType(socialTypesFor(p)[0].id);
  }

  function updateField(key, value) { setFields((f) => ({ ...f, [key]: value })); }

  async function handleUpload(e, which = 'a') {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = await loadImage(file);
    if (which === 'a') setImg(image); else setImgB(image);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await downscaleLogoFile(file);
    saveBrandKit({ logo: dataUrl });
    setBrandKitState((k) => ({ ...k, logo: dataUrl }));
    const loaded = await loadImageFromDataURL(dataUrl);
    setBrandLogoImg(loaded);
    setShowBrandLogo(true);
  }

  function saveBrandColors() {
    const colors = brandColorDraft.filter(Boolean);
    saveBrandKit({ colors });
    setBrandKitState((k) => ({ ...k, colors }));
    setBrandPanelOpen(false);
  }

  const selected = annotations.find((a) => a.id === selectedId) || null;

  // Website/App Showcase and Before & After show an Export Preset picker;
  // Social Posts and Just Annotate already imply their destination, so
  // there's nothing to resolve here — auto is correct and final.
  const showsExportPicker = workspace === 'website' || workspace === 'app' || workspace === 'before-after';
  const resolvedCanvasPresetId = !showsExportPicker ? 'auto' : advancedExport ? canvasPresetId : getExportPreset(exportPresetId).canvasPresetId;
  const resolvedFormat = !showsExportPicker ? 'png' : advancedExport ? exportFormat : getExportPreset(exportPresetId).format;

  const recompose = useCallback(() => {
    if (!img) return;
    const canvas = composeFinalCanvas({
      workspace, subType, img, imgB, fields, contentWidth, headline: fields.headline, dividerPct,
      bgColor, bgGradientTo, padding, cornerRadius, shadow,
      canvasPresetId: resolvedCanvasPresetId, annotations, selectedId, interactive: true,
      brandLogoImg, showBrandLogo: showBrandLogo && workspace !== 'annotate',
    });
    setFinalSize({ w: canvas.width, h: canvas.height });
    const display = canvasRef.current;
    if (!display) return;
    display.width = canvas.width;
    display.height = canvas.height;
    display.getContext('2d').drawImage(canvas, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, img, imgB, subType, fields, contentWidth, dividerPct, bgColor, bgGradientTo, padding, cornerRadius, shadow, resolvedCanvasPresetId, annotations, selectedId, brandLogoImg, showBrandLogo]);

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
        workspace, subType, img, imgB, fields, contentWidth, headline: fields.headline, dividerPct,
        bgColor, bgGradientTo, padding, cornerRadius, shadow,
        canvasPresetId: resolvedCanvasPresetId, annotations, selectedId: null, interactive: false,
        brandLogoImg, showBrandLogo: showBrandLogo && workspace !== 'annotate',
      });
      const mime = resolvedFormat === 'jpg' ? 'image/jpeg' : resolvedFormat === 'webp' ? 'image/webp' : 'image/png';
      const url = canvas.toDataURL(mime, 0.95);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${workspace}-${subType || 'image'}.${resolvedFormat}`;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------- Entry
  if (!workspace) {
    return (
      <div className="panel">
        <p style={{ ...sectionTitle, marginTop: 0 }}>What are you trying to create?</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {WORKSPACES.map((w) => (
            <button
              key={w.id}
              onClick={() => !w.comingSoon && openWorkspace(w.id)}
              disabled={w.comingSoon}
              style={{
                textAlign: 'left', padding: 16, borderRadius: 12, cursor: w.comingSoon ? 'default' : 'pointer',
                border: '1px solid #E2E8F0', background: w.comingSoon ? '#F8FAFC' : 'white', opacity: w.comingSoon ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{w.title}</span>
                {w.comingSoon && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94A3B8', border: '1px solid #E2E8F0', borderRadius: 999, padding: '1px 7px' }}>COMING SOON</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>{w.desc}</p>
            </button>
          ))}
        </div>
        <p className="privacy-note">Everything happens in your browser — your screenshot is never uploaded to a server.</p>
      </div>
    );
  }

  const activeWs = WORKSPACES.find((w) => w.id === workspace);

  // ---------------------------------------------------------------- Upload
  if (!img) {
    return (
      <div className="panel">
        <button onClick={backToEntry} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10, fontSize: '0.78rem', color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}>← Change what you're creating</button>
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            {activeWs.title}{workspace === 'before-after' ? ' — upload the "before" photo' : ' — upload a screenshot'}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>{activeWs.desc}</p>
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'a')} />
        </div>
        <p className="privacy-note">Everything happens in your browser — your screenshot is never uploaded to a server.</p>
      </div>
    );
  }

  const frameOptions = workspace === 'website' || workspace === 'app' ? framesFor(workspace) : [];
  const socialTypeOptions = workspace === 'social' ? socialTypesFor(socialPlatform) : [];

  return (
    <div className="panel">
      <button onClick={backToEntry} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10, fontSize: '0.78rem', color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}>← {activeWs.title} · change what you're creating</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.1fr)', gap: 28 }}>
        <div>
          {(workspace === 'website' || workspace === 'app') && (
            <>
              <p style={{ ...sectionTitle, marginTop: 0 }}>Frame</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {frameOptions.map((f) => (
                  <button key={f.id} onClick={() => setSubType(f.id)} style={chipBtn(subType === f.id)}>{f.label}</button>
                ))}
              </div>

              <p style={sectionTitle}>Content</p>
              <label style={labelStyle}>Headline (optional)</label>
              <input style={{ ...inputStyle, marginBottom: 8 }} value={fields.headline} onChange={(e) => updateField('headline', e.target.value)} placeholder="e.g. Now available on the web" />
            </>
          )}

          {workspace === 'social' && (
            <>
              <p style={{ ...sectionTitle, marginTop: 0 }}>Platform</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {SOCIAL_PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => selectPlatform(p.id)} style={chipBtn(socialPlatform === p.id)}>{p.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {socialTypeOptions.map((t) => (
                  <button key={t.id} onClick={() => setSubType(t.id)} style={chipBtn(subType === t.id)}>{t.label}</button>
                ))}
              </div>

              <p style={sectionTitle}>Content</p>
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

          {workspace === 'before-after' && (
            <>
              <p style={{ ...sectionTitle, marginTop: 0 }}>Content</p>
              <label style={labelStyle}>"After" photo</label>
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'b')} style={{ marginBottom: 8 }} />
              {imgB && <p style={{ fontSize: '0.72rem', color: '#059669', marginBottom: 8 }}>✓ After photo loaded</p>}
              <label style={labelStyle}>Divider position</label>
              <input type="range" min="10" max="90" value={dividerPct} onChange={(e) => setDividerPct(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
            </>
          )}

          {workspace !== 'annotate' && (
            <>
              <p style={sectionTitle}>Style</p>
              <label style={labelStyle}>Content width</label>
              <input type="range" min="360" max="1200" value={contentWidth} onChange={(e) => setContentWidth(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
              <label style={labelStyle}>Background color</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {brandKit.colors.map((c) => (
                  <button key={`brand-${c}`} onClick={() => setBgColor(c)} title="Brand color" style={{ width: 28, height: 28, borderRadius: 7, background: c, border: bgColor === c ? '3px solid #2563EB' : '2px solid #F59E0B', cursor: 'pointer' }} />
                ))}
                {brandKit.colors.length > 0 && <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />}
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
              {brandKit.logo && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#334155', marginBottom: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showBrandLogo} onChange={(e) => setShowBrandLogo(e.target.checked)} /> Add logo watermark
                </label>
              )}

              <div style={{ marginTop: 10 }}>
                <button onClick={() => setBrandPanelOpen((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.76rem', color: '#B45309', cursor: 'pointer', fontWeight: 700 }}>
                  🎨 Brand Kit {brandPanelOpen ? '▲' : '▼'}
                </button>
                {brandPanelOpen && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 10, marginTop: 8 }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#92400E' }}>Saved once, used everywhere in Screenshot Studio — logo and colors stay in this browser only.</p>
                    <label style={labelStyle}>Logo</label>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: 10 }} />
                    <label style={labelStyle}>Brand colors</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {[0, 1, 2].map((i) => (
                        <input key={i} type="color" value={brandColorDraft[i]} onChange={(e) => setBrandColorDraft((d) => d.map((c, idx) => (idx === i ? e.target.value : c)))} style={{ width: 32, height: 32, padding: 0, border: '1px solid #E2E8F0', borderRadius: 7 }} />
                      ))}
                    </div>
                    <button onClick={saveBrandColors} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#B45309', color: 'white', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}>Save Brand Kit</button>
                  </div>
                )}
              </div>
            </>
          )}

          <p style={sectionTitle}>Annotate</p>
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

          {showsExportPicker && (
            <>
              <p style={sectionTitle}>Export</p>
              <label style={labelStyle}>Where is this going?</label>
              <select style={{ ...inputStyle, marginBottom: 8 }} value={exportPresetId} onChange={(e) => setExportPresetId(e.target.value)}>
                {EXPORT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={advancedExport} onChange={(e) => setAdvancedExport(e.target.checked)} /> Advanced (set size and format manually)
              </label>
              {advancedExport && (
                <>
                  <label style={labelStyle}>Canvas size</label>
                  <select style={{ ...inputStyle, marginBottom: 8 }} value={canvasPresetId} onChange={(e) => setCanvasPresetId(e.target.value)}>
                    {CANVAS_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <label style={labelStyle}>Format</label>
                  <select style={{ ...inputStyle, marginBottom: 8 }} value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="webp">WebP</option>
                  </select>
                </>
              )}
            </>
          )}
          {!showsExportPicker && (
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', margin: '16px 0 8px' }}>
              {workspace === 'social' ? 'Sized automatically for the platform you picked above.' : 'Downloads at your screenshot\'s original size.'}
            </p>
          )}

          <button onClick={handleExport} disabled={busy} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer', marginTop: 6 }}>
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
