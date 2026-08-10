'use client';

import { useState, useMemo } from 'react';
import InputStep from './InputStep';
import ConfigStep from './ConfigStep';
import OutlineStep from './OutlineStep';
import Sidebar from './Sidebar';
import Stage from './Stage';
import Toolbar from './Toolbar';
import NotesPanel from './NotesPanel';
import QualityPanel from './QualityPanel';
import { errorBox } from './uiStyles';
import { useObjectHistory } from '@/components/shared/useObjectHistory';
import { normalizeSlideContentResponse } from '@/lib/presentation/normalizeSlide';
import { buildDeckObjects } from '@/lib/presentation/layoutEngine';
import { getTheme } from '@/lib/presentation/themes';
import { rethemeObjects } from '@/lib/presentation/retheme';
import { toEditableObjects, addBlankSlide, deleteSlide, duplicateSlide, moveSlide } from '@/lib/presentation/slideOps';
import { runQualityChecks, applyAutoFixes } from '@/lib/presentation/qualityCheck';
import { downloadPptx } from '@/lib/presentation/buildPptx';
import { createObject } from './objectTypes';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Orchestrator for the AI Presentation Maker rebuild. Mounted at the same
// 'presentation-generator' slug/mode as before — see components/ToolPageClient.js.
//
// Phase A: input -> config -> outline approval gate (2nd AI call gated
// behind explicit user approval, per the cost-control architecture).
// Phase B: outline approval triggers the ONE slide-content call for the
// whole deck (never per-slide), converted into a positioned object array
// by the local layoutEngine.
// Phase C: the editable canvas. From here on, `objects` (via
// useObjectHistory) is the single source of truth — `slidesMeta` only
// carries the small per-slide bookkeeping (title/layout/notes) that isn't
// itself a canvas object. Every edit (move/resize/add/delete/duplicate/
// reorder/theme) is local; nothing here calls Gemini.
export default function PresentationStudioWorkspace() {
  const [phase, setPhase] = useState('input');
  const [sourceData, setSourceData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [outline, setOutline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [buildingSlides, setBuildingSlides] = useState(false);
  const [error, setError] = useState('');

  const [slidesMeta, setSlidesMeta] = useState(null);
  const [themeKey, setThemeKey] = useState('modern');
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [editingObjectId, setEditingObjectId] = useState(null);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const history = useObjectHistory();

  // Hooks must run unconditionally on every render (the phase-based early
  // returns below happen AFTER this), so this lives up here with the rest
  // rather than beside the 'editor' render branch it's only used by.
  const qualityFindings = useMemo(() => {
    if (phase !== 'editor' || !slidesMeta) return [];
    return runQualityChecks(history.objects, slidesMeta, getTheme(themeKey));
  }, [phase, slidesMeta, history.objects, themeKey]);

  function handleInputNext(data) {
    setSourceData(data);
    setPhase('config');
  }

  async function requestOutline(data, cfg) {
    setError('');
    const res = await fetch('/api/generate-presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'outline', ...data, ...cfg }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not generate an outline.');
    return body;
  }

  async function handleConfigNext(cfg) {
    setSettings(cfg);
    setLoading(true);
    setError('');
    try {
      const result = await requestOutline(sourceData, cfg);
      const withIds = { ...result, slides: result.slides.map((s, i) => ({ id: `slide-${i}`, ...s })) };
      setOutline(withIds);
      setPhase('outline');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError('');
    try {
      const result = await requestOutline(sourceData, settings);
      const withIds = { ...result, slides: result.slides.map((s, i) => ({ id: `slide-${i}`, ...s })) };
      setOutline(withIds);
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleApprove(finalOutline) {
    setOutline(finalOutline);
    setBuildingSlides(true);
    setError('');
    setPhase('building');
    try {
      const res = await fetch('/api/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'slideContent', outline: finalOutline, tone: settings.tone, language: settings.language, sourceText: sourceData?.text || '' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not generate slide content.');
      const normalized = normalizeSlideContentResponse(body);
      const theme = getTheme(settings.theme);
      const initialObjects = toEditableObjects(buildDeckObjects(normalized, theme));
      history.reset(initialObjects);
      setSlidesMeta(normalized.map((s) => ({ id: s.id, layout: s.layout, title: s.title, notes: s.notes })));
      setThemeKey(settings.theme);
      setSelectedSlideIndex(0);
      setSelectedObjectId(null);
      setEditingObjectId(null);
      setPhase('editor');
    } catch (err) {
      setError(err.message);
      setPhase('outline');
    } finally {
      setBuildingSlides(false);
    }
  }

  function startOver() {
    setPhase('input');
    setSourceData(null);
    setSettings(null);
    setOutline(null);
    setSlidesMeta(null);
    setError('');
    history.reset([]);
  }

  // --- Theme switching: local re-color pass, zero AI (Design decision in
  // the approved plan — remap known theme-token values in place rather than
  // rebuilding slides from scratch, so manual edits/added objects survive).
  function handleThemeChange(nextKey) {
    if (nextKey === themeKey) return;
    const rethemed = rethemeObjects(history.objects, getTheme(themeKey), getTheme(nextKey));
    history.commit(rethemed);
    setThemeKey(nextKey);
  }

  // --- Slide-level ops (Sidebar) ---
  function handleAddSlide(afterIndex) {
    const theme = getTheme(themeKey);
    const { slidesMeta: nextMeta, objects: nextObjects } = addBlankSlide(slidesMeta, history.objects, afterIndex, theme, { nextId: history.nextId, nextZ: history.nextZ });
    setSlidesMeta(nextMeta);
    history.commit(nextObjects);
    setSelectedSlideIndex(afterIndex + 1);
  }
  function handleDeleteSlide(index) {
    if (slidesMeta.length <= 1) return;
    const { slidesMeta: nextMeta, objects: nextObjects } = deleteSlide(slidesMeta, history.objects, index);
    setSlidesMeta(nextMeta);
    history.commit(nextObjects);
    setSelectedSlideIndex((i) => Math.max(0, Math.min(i, nextMeta.length - 1)));
  }
  function handleDuplicateSlide(index) {
    const { slidesMeta: nextMeta, objects: nextObjects } = duplicateSlide(slidesMeta, history.objects, index, { nextId: history.nextId, nextZ: history.nextZ });
    setSlidesMeta(nextMeta);
    history.commit(nextObjects);
  }
  function handleMoveSlide(index, dir) {
    const { slidesMeta: nextMeta, objects: nextObjects } = moveSlide(slidesMeta, history.objects, index, dir);
    setSlidesMeta(nextMeta);
    history.commit(nextObjects);
    if (selectedSlideIndex === index) setSelectedSlideIndex(index + dir);
  }
  function handleNotesChange(value) {
    setSlidesMeta((meta) => meta.map((m, i) => (i === selectedSlideIndex ? { ...m, notes: value } : m)));
  }

  // --- Export (Phase E) ---
  async function handleDownloadPptx() {
    setDownloadingPptx(true);
    setDownloadError('');
    try {
      await downloadPptx({ slidesMeta, objects: history.objects, theme: getTheme(themeKey), title: outline?.title });
    } catch (err) {
      console.error(err);
      setDownloadError('Could not build the PowerPoint file. Please try again.');
    } finally {
      setDownloadingPptx(false);
    }
  }
  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/presentation-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slidesMeta, objects: history.objects, theme: getTheme(themeKey), title: outline?.title }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not generate the PDF.');
      }
      const blob = await res.blob();
      const fileName = `${(outline?.title || 'presentation').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`;
      downloadBlob(blob, fileName);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  // --- Object-level ops (Stage/Toolbar) ---
  function deselect() {
    setSelectedObjectId(null);
    setEditingObjectId(null);
  }
  function handleSelectObject(id) {
    setSelectedObjectId(id);
    setEditingObjectId(null);
  }
  function handleCommitTransform(id, rect) {
    history.commit(history.objects.map((o) => (o.id === id ? { ...o, ...rect } : o)));
  }
  function handleCommitText(id, value, field) {
    history.commit(history.objects.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
    setEditingObjectId(null);
  }
  function handleCommitImage(id, dataUrl) {
    history.commit(history.objects.map((o) => (o.id === id ? { ...o, dataUrl } : o)));
  }
  function addObject(type, extra) {
    const theme = getTheme(themeKey);
    const obj = createObject(type, {
      slideIndex: selectedSlideIndex, x: 1, y: 1, w: type === 'text' ? 4 : 3, h: type === 'text' ? 1 : 2,
      nextId: history.nextId, nextZ: history.nextZ, color: theme.colors.text, fill: theme.colors.accent, fontFace: theme.fonts.body, ...extra,
    });
    history.commit([...history.objects, obj]);
    setSelectedObjectId(obj.id);
  }
  function handleDeleteSelected() {
    if (!selectedObjectId) return;
    history.commit(history.objects.filter((o) => o.id !== selectedObjectId));
    deselect();
  }
  function handleDuplicateSelected() {
    const obj = history.objects.find((o) => o.id === selectedObjectId);
    if (!obj) return;
    const clone = { ...obj, id: history.nextId(), z: history.nextZ(), x: obj.x + 0.2, y: obj.y + 0.2 };
    history.commit([...history.objects, clone]);
    setSelectedObjectId(clone.id);
  }

  if (phase === 'input') {
    return <InputStep initial={sourceData} onNext={handleInputNext} />;
  }

  if (phase === 'config') {
    return <ConfigStep initial={settings} onBack={() => setPhase('input')} onNext={handleConfigNext} loading={loading} error={error} />;
  }

  if (phase === 'outline' && outline) {
    return (
      <OutlineStep
        outline={outline}
        onBack={() => setPhase('config')}
        onRegenerate={handleRegenerate}
        onApprove={handleApprove}
        regenerating={regenerating}
        generating={buildingSlides}
        error={error}
      />
    );
  }

  if (phase === 'building') {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Writing your slides…</p>
        <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 6 }}>This is a single request for the whole deck — it can take a little while for longer presentations.</p>
      </div>
    );
  }

  function handleFixQualityIssues() {
    history.commit(applyAutoFixes(history.objects, qualityFindings));
  }

  if (phase === 'editor' && slidesMeta) {
    const theme = getTheme(themeKey);
    const currentObjects = history.objects.filter((o) => o.slideIndex === selectedSlideIndex);
    const currentMeta = slidesMeta[selectedSlideIndex];
    return (
      <div className="panel">
        <Toolbar
          themeKey={themeKey}
          onThemeChange={handleThemeChange}
          onAddText={() => addObject('text')}
          onAddShape={() => addObject('shape')}
          onAddImage={() => addObject('image')}
          onAddChart={() => addObject('chart')}
          onUndo={() => { history.undo(); deselect(); }}
          onRedo={() => { history.redo(); deselect(); }}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
          hasSelection={!!selectedObjectId}
        />
        <div style={{ display: 'flex', gap: 16 }}>
          <Sidebar
            slidesMeta={slidesMeta}
            objects={history.objects}
            theme={theme}
            selectedIndex={selectedSlideIndex}
            onSelect={(i) => { setSelectedSlideIndex(i); deselect(); }}
            onAdd={handleAddSlide}
            onDelete={handleDeleteSlide}
            onDuplicate={handleDuplicateSlide}
            onMove={handleMoveSlide}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stage
              objects={currentObjects}
              theme={theme}
              selectedId={selectedObjectId}
              editingId={editingObjectId}
              onSelect={handleSelectObject}
              onStartEdit={setEditingObjectId}
              onCommitTransform={handleCommitTransform}
              onCommitText={handleCommitText}
              onCommitImage={handleCommitImage}
              onDeselect={deselect}
            />
            <NotesPanel notes={currentMeta?.notes} onChange={handleNotesChange} />
          </div>
        </div>
        <QualityPanel findings={qualityFindings} onFixAll={handleFixQualityIssues} />
        {downloadError && <div style={{ ...errorBox, marginTop: 16, marginBottom: 0 }}>{downloadError}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={startOver}>Start Over</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPptx} disabled={downloadingPptx}>
            {downloadingPptx ? 'Preparing PPTX…' : 'Download PPTX'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
