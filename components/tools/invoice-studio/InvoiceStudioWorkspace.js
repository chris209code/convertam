'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { poppins, inter, caveat, fontStack } from '@/lib/invoice-studio/fonts';
import { buildTemplateElements, cloneElements, TEMPLATE_DEFAULTS, TEMPLATE_GALLERY, recomputeDynamicLayout, contentExceedsOnePage } from '@/lib/invoice-studio/templates';
import { DEFAULT_CURRENCY, DEFAULT_DISCOUNT, DEFAULT_VAT_RATE, HISTORY_LIMIT, ZOOM_DEFAULT, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '@/lib/invoice-studio/constants';
import { computeInvoiceTotals, computeItemLine } from '@/lib/invoice-studio/calculations';
import { amountInWords } from '@/lib/invoice-studio/numberToWords';
import { readLegacyBizProfile } from '@/lib/invoice-studio/legacySeed';
import { validateImageFile, readFileAsDataURL } from '@/lib/invoice-studio/fileUpload';
import { generateQrDataUrl } from '@/lib/invoice-studio/qrGenerate';
import { saveDraft, loadDraft, clearDraft } from '@/lib/invoice-studio/draftStorage';
import { CURRENCIES } from '@/lib/invoice-studio/constants';
import Gallery from './Gallery';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import DesignPanel from './panels/DesignPanel';
import ContentPanel from './panels/ContentPanel';
import LetterheadCropModal from './LetterheadCropModal';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// One-time seed from the classic Invoice Generator's saved business profile,
// applied to a freshly picked template so returning users don't start from
// the sample "Nimbus Office Supplies" data. Read-only — never mutates the
// legacy key, which the old tool still owns until it's retired.
function applyLegacySeed(elements) {
  const legacy = readLegacyBizProfile();
  if (!legacy || !legacy.name) return elements;
  return elements.map((el) => {
    if (el.id === 'logo' && legacy.logoDataUrl) return { ...el, src: legacy.logoDataUrl };
    if (el.id === 'companyText') return { ...el, name: legacy.name, tagline: legacy.tagline || el.tagline };
    if (el.id === 'contactInfo') return { ...el, phone: legacy.phone || '', email: legacy.email || '', address: legacy.address || '', website: '' };
    return el;
  });
}

const emptyDoc = () => ({
  elements: [], brandPrimary: '#2563EB', brandSecondary: '#0F172A', brandAccent: '#10B981',
  headingFont: 'Poppins', bodyFont: 'Inter', currency: DEFAULT_CURRENCY, discount: DEFAULT_DISCOUNT, vatRate: DEFAULT_VAT_RATE,
});

const emptyRow = (vatRate) => ({ name: '', desc: '', qty: 1, rate: 0, vat: vatRate, img: null });

export default function InvoiceStudioWorkspace() {
  const [view, setView] = useState('gallery');
  const [templateId, setTemplateId] = useState('modern');
  const [doc, setDoc] = useState(emptyDoc);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [zoomIsManual, setZoomIsManual] = useState(false); // true once the user clicks +/- ; reset whenever a template opens
  const [panelTab, setPanelTab] = useState('content');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [savedDraftMeta, setSavedDraftMeta] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const d = loadDraft();
    if (d) setSavedDraftMeta({ templateId: d.templateId, savedAt: d.savedAt });
  }, []);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // Mirrors of `doc`/`historyIndex` that update synchronously (inside the
  // setState updater itself, not on the next render). Drag/resize event
  // listeners are bound once at mousedown and would otherwise close over
  // whatever `doc`/`historyIndex` were at that instant — reading these refs
  // instead of the plain state variables is what makes pushHistory() commit
  // the value *after* the interaction, not a stale snapshot from before it.
  const docRef = useRef(doc);
  const historyIndexRef = useRef(historyIndex);
  // ResizeObserver's callback (inside Canvas) is created once and needs the
  // CURRENT zoomIsManual value at call time, not whatever it was when the
  // effect first ran — a ref avoids the stale-closure trap a plain state
  // read inside a dependency-less callback would otherwise hit.
  const zoomIsManualRef = useRef(false);
  useEffect(() => { zoomIsManualRef.current = zoomIsManual; }, [zoomIsManual]);

  const updateDoc = useCallback((patch) => {
    setDoc((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      docRef.current = next;
      return next;
    });
  }, []);

  const pushHistory = useCallback(() => {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndexRef.current + 1);
      trimmed.push({ ...docRef.current, elements: cloneElements(docRef.current.elements) });
      if (trimmed.length > HISTORY_LIMIT) trimmed.shift();
      historyIndexRef.current = trimmed.length - 1;
      setHistoryIndex(historyIndexRef.current);
      return trimmed;
    });
  }, []);

  const openTemplate = useCallback((id) => {
    const seeded = applyLegacySeed(buildTemplateElements(id));
    const defaults = TEMPLATE_DEFAULTS[id] || TEMPLATE_DEFAULTS.modern;
    const initial = { ...emptyDoc(), elements: seeded, ...defaults };
    setTemplateId(id);
    docRef.current = initial;
    setDoc(initial);
    setPanelTab('content');
    setView('editor');
    setZoomIsManual(false);
    historyIndexRef.current = 0;
    setHistory([{ ...initial, elements: cloneElements(seeded) }]);
    setHistoryIndex(0);
  }, []);

  const resumeDraft = useCallback(() => {
    const d = loadDraft();
    if (!d) { showToast('No draft found'); return; }
    const restored = { ...d.doc, elements: cloneElements(d.doc.elements) };
    setTemplateId(d.templateId);
    docRef.current = restored;
    setDoc(restored);
    setPanelTab('content');
    setView('editor');
    setZoomIsManual(false);
    historyIndexRef.current = 0;
    setHistory([{ ...restored, elements: cloneElements(restored.elements) }]);
    setHistoryIndex(0);
  }, [showToast]);

  const goToGallery = useCallback(() => setView('gallery'), []);

  const restoreSnapshot = useCallback((snap) => {
    const restored = { ...snap, elements: cloneElements(snap.elements) };
    docRef.current = restored;
    setDoc(restored);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const idx = historyIndexRef.current - 1;
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
    restoreSnapshot(history[idx]);
  }, [history, restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= history.length - 1) return;
    const idx = historyIndexRef.current + 1;
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
    restoreSnapshot(history[idx]);
  }, [history, restoreSnapshot]);

  // Every one-shot edit (a blur, a click, a picker change) follows the same
  // shape: patch the doc, then immediately commit it as one history step —
  // never one step per keystroke, and never silently uncommitted.
  const patchElement = useCallback((elId, patch) => {
    updateDoc((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) }));
  }, [updateDoc]);

  const commitElementPatch = useCallback((elId, patch) => {
    patchElement(elId, patch);
    pushHistory();
  }, [patchElement, pushHistory]);

  const handleBrandChange = useCallback((key, value) => {
    updateDoc({ [key]: value });
    pushHistory();
  }, [updateDoc, pushHistory]);

  const handleDocSettingChange = useCallback((key, value) => {
    updateDoc({ [key]: value });
  }, [updateDoc]);

  const commitDocSetting = useCallback(() => pushHistory(), [pushHistory]);

  const onFieldBlur = useCallback((elId, field, value) => {
    commitElementPatch(elId, { [field]: value });
  }, [commitElementPatch]);

  const onMetaRowBlur = useCallback((elId, rowKey, value) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== elId ? e : { ...e, rows: e.rows.map((r) => (r.key === rowKey ? { ...r, value } : r)) })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onBankRowBlur = useCallback((elId, idx, value) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== elId ? e : { ...e, rows: e.rows.map((r, i) => (i === idx ? { ...r, v: value } : r)) })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onRowFieldBlur = useCallback((tableId, idx, field, value, isNumber) => {
    const v = isNumber ? (parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0) : value;
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== tableId ? e : { ...e, rows: e.rows.map((r, i) => (i === idx ? { ...r, [field]: v } : r)) })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onAddRow = useCallback((tableId) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== tableId ? e : { ...e, rows: [...e.rows, emptyRow(prev.vatRate)] })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onRemoveRow = useCallback((tableId, idx) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== tableId ? e : { ...e, rows: e.rows.length > 1 ? e.rows.filter((_, i) => i !== idx) : e.rows })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onMoveRow = useCallback((tableId, idx, dir) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => {
        if (e.id !== tableId) return e;
        const target = idx + dir;
        if (target < 0 || target >= e.rows.length) return e;
        const rows = [...e.rows];
        [rows[idx], rows[target]] = [rows[target], rows[idx]];
        return { ...e, rows };
      }),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onTogglePaymentMethod = useCallback((elId, method) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => {
        if (e.id !== elId) return e;
        const has = e.methods.includes(method);
        return { ...e, methods: has ? e.methods.filter((m) => m !== method) : [...e.methods, method] };
      }),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onToggleVisible = useCallback((elId) => {
    updateDoc((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === elId ? { ...e, visible: !e.visible } : e)) }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onToggleTableImages = useCallback((tableId) => {
    updateDoc((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === tableId ? { ...e, showImages: !e.showImages } : e)) }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  // Returns an error string on failure, or null on success — callers show
  // the error inline rather than failing silently.
  const onImageUpload = useCallback(async (elId, file) => {
    const err = validateImageFile(file);
    if (err) return err;
    try {
      const dataUrl = await readFileAsDataURL(file);
      commitElementPatch(elId, { src: dataUrl });
      return null;
    } catch (e) {
      return e.message || 'Could not upload that image.';
    }
  }, [commitElementPatch]);

  const onImageRemove = useCallback((elId) => {
    commitElementPatch(elId, { src: null });
  }, [commitElementPatch]);

  const onTableRowImageUpload = useCallback(async (tableId, idx, file) => {
    const err = validateImageFile(file);
    if (err) return err;
    try {
      const dataUrl = await readFileAsDataURL(file);
      updateDoc((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => (e.id !== tableId ? e : { ...e, rows: e.rows.map((r, i) => (i === idx ? { ...r, img: dataUrl } : r)) })),
      }));
      pushHistory();
      return null;
    } catch (e) {
      return e.message || 'Could not upload that image.';
    }
  }, [updateDoc, pushHistory]);

  const onTableRowImageRemove = useCallback((tableId, idx) => {
    updateDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id !== tableId ? e : { ...e, rows: e.rows.map((r, i) => (i === idx ? { ...r, img: null } : r)) })),
    }));
    pushHistory();
  }, [updateDoc, pushHistory]);

  const onSignatureUpload = useCallback(async (elId, file) => {
    const err = validateImageFile(file);
    if (err) return err;
    try {
      const dataUrl = await readFileAsDataURL(file);
      commitElementPatch(elId, { mode: 'image', src: dataUrl });
      return null;
    } catch (e) {
      return e.message || 'Could not upload that image.';
    }
  }, [commitElementPatch]);

  const onSignatureDrawSave = useCallback((elId, dataUrl) => {
    commitElementPatch(elId, { mode: 'image', src: dataUrl });
  }, [commitElementPatch]);

  const onSignatureTypedSave = useCallback((elId, text) => {
    commitElementPatch(elId, { mode: 'typed', text });
  }, [commitElementPatch]);

  const onStampOpacityChange = useCallback((elId, opacity) => {
    updateDoc((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === elId ? { ...e, opacity } : e)) }));
  }, [updateDoc]);

  const commitStampOpacity = useCallback(() => pushHistory(), [pushHistory]);

  const letterheadEl = doc.elements.find((e) => e.id === 'letterhead');

  const onLetterheadSave = useCallback((dataUrl) => {
    commitElementPatch('letterhead', { src: dataUrl, visible: true });
    setCropModalOpen(false);
  }, [commitElementPatch]);

  const onLetterheadRemove = useCallback(() => {
    commitElementPatch('letterhead', { src: null, visible: false });
  }, [commitElementPatch]);

  const onQrValueBlur = useCallback(async (elId, value) => {
    const dataUrl = await generateQrDataUrl(value, { color: doc.brandSecondary });
    commitElementPatch(elId, { value, src: dataUrl });
  }, [commitElementPatch, doc.brandSecondary]);

  const onSaveDraft = useCallback(() => {
    const ok = saveDraft({ templateId, doc: docRef.current });
    if (ok) {
      setSavedDraftMeta({ templateId, savedAt: Date.now() });
      showToast('Draft saved');
    } else {
      showToast('Could not save — storage may be full');
    }
  }, [templateId, showToast]);

  const zoomIn = useCallback(() => { setZoomIsManual(true); setZoom((z) => clamp(Math.round((z + ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)); }, []);
  const zoomOut = useCallback(() => { setZoomIsManual(true); setZoom((z) => clamp(Math.round((z - ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)); }, []);
  const handlePrint = useCallback(() => window.print(), []);

  // Screenshots the actual rendered .cs-print DOM node (the same one the
  // browser's own print/save-as-PDF targets) rather than redrawing the
  // invoice from scratch via a separate PDF-drawing pipeline. That's a
  // deliberate choice: a second independent rendering path is exactly how
  // "the preview and the PDF don't match" bugs happen — screenshotting
  // what's actually on screen makes mismatch structurally impossible.
  const handleDownload = useCallback(async (format) => {
    const node = document.querySelector('.cs-print');
    if (!node) return;
    showToast('Preparing download…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const filename = `Invoice-${templateId}-${Date.now()}`;

      if (format === 'pdf') {
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        // Standard A4-in-points page size (210mm x 297mm), matching the same
        // values already used by Convertam's other PDF-generating tools.
        const page = pdfDoc.addPage([595, 842]);
        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then((r) => r.arrayBuffer());
        const embedded = await pdfDoc.embedPng(pngBytes);
        page.drawImage(embedded, { x: 0, y: 0, width: 595, height: 842 });
        const bytes = await pdfDoc.save();
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${filename}.pdf`);
      } else {
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `${filename}.${format}`); }, mime, format === 'jpg' ? 0.92 : undefined);
      }
      showToast(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast('Could not generate the download — please try again.');
    }
  }, [templateId, showToast]);

  // Reported by Canvas whenever the available preview space changes (window
  // resize, sidebar toggling, etc.) — applied automatically unless the user
  // has manually zoomed since the template was opened, so a resize never
  // fights a deliberate zoom choice but always keeps the default state
  // genuinely fit-to-page.
  const handleFitZoomChange = useCallback((fitZoom) => {
    setZoom((current) => (zoomIsManualRef.current ? current : clamp(Math.round(fitZoom * 100) / 100, ZOOM_MIN, ZOOM_MAX)));
  }, []);

  const resetToFit = useCallback(() => setZoomIsManual(false), []);

  const tableEl = doc.elements.find((e) => e.kind === 'table');
  const totals = useMemo(() => computeInvoiceTotals(tableEl ? tableEl.rows : [], doc.discount), [tableEl, doc.discount]);
  const wordsText = useMemo(() => amountInWords(totals.total, doc.currency), [totals.total, doc.currency]);

  const companyTextEl = doc.elements.find((e) => e.id === 'companyText');
  // Recomputed fresh whenever doc.elements changes — this is what prevents
  // a 6-item invoice from overlapping/clipping content that was positioned
  // assuming the original 3-row sample. doc.elements itself is left as the
  // "authored" state (field values, visibility, colors); only this derived
  // array carries corrected positions for actual rendering.
  const renderElements = useMemo(() => recomputeDynamicLayout(doc.elements), [doc.elements]);
  const overflowsPage = useMemo(() => contentExceedsOnePage(doc.elements), [doc.elements]);

  const ctx = useMemo(() => ({
    headFont: fontStack(doc.headingFont), bodyFont: fontStack(doc.bodyFont),
    brandPrimary: doc.brandPrimary, brandSecondary: doc.brandSecondary, brandAccent: doc.brandAccent,
    companyName: companyTextEl?.name || '',
    // The invoice preview is always read-only now — all editing happens
    // through the sidebar ContentPanel, which calls these same mutation
    // functions directly, not through contentEditable on the canvas.
    currency: doc.currency, totals, wordsText, lineFor: computeItemLine, editable: false, pageLabel: 'Page 1 of 1',
    onFieldBlur, onMetaRowBlur, onBankRowBlur, onRowFieldBlur, onAddRow, onRemoveRow, onMoveRow, onTogglePaymentMethod,
    onTableRowImageUpload, onTableRowImageRemove,
  }), [doc.headingFont, doc.bodyFont, doc.brandPrimary, doc.brandSecondary, doc.brandAccent, doc.currency, totals, wordsText, companyTextEl?.name,
    onFieldBlur, onMetaRowBlur, onBankRowBlur, onRowFieldBlur, onAddRow, onRemoveRow, onMoveRow, onTogglePaymentMethod,
    onTableRowImageUpload, onTableRowImageRemove]);

  const templateName = (TEMPLATE_GALLERY.find((t) => t.id === templateId)?.name || 'Invoice') + ' Template';

  return (
    <div className={`${poppins.variable} ${inter.variable} ${caveat.variable}`} style={{ height: 'calc(100vh - 64px)', minHeight: 560, width: '100%', display: 'flex', fontFamily: 'var(--cs-font-inter), Inter, sans-serif', color: '#0F172A', overflow: 'hidden', background: '#F7F8FA' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .cs-print, .cs-print * { visibility: visible; }
          .cs-print {
            position: absolute; left: 0; top: 0;
            transform: none !important;
            box-shadow: none !important;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <div style={{ width: 88, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E7EAF0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#10B981)' }} />
        <button
          onClick={goToGallery}
          aria-label="Template gallery"
          style={{
            width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none',
            color: view === 'gallery' ? '#2563EB' : '#94A3B8', background: view === 'gallery' ? '#EFF6FF' : 'transparent',
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 5, background: 'currentColor', opacity: 0.85 }} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {view === 'gallery' && (
          <Gallery
            onSelectTemplate={openTemplate}
            hasSavedDraft={!!savedDraftMeta}
            savedDraftTemplateName={savedDraftMeta ? (TEMPLATE_GALLERY.find((t) => t.id === savedDraftMeta.templateId)?.name || '') : ''}
            onResumeDraft={resumeDraft}
          />
        )}

        {view === 'editor' && (
          <>
            <Toolbar
              templateName={templateName}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={undo}
              onRedo={redo}
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetToFit={resetToFit}
              onPrint={handlePrint}
              onDownload={handleDownload}
              onBack={goToGallery}
              onSaveDraft={onSaveDraft}
            />
            {overflowsPage && (
              <div style={{ padding: '8px 20px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', color: '#92400E', fontSize: 12.5, flexShrink: 0 }}>
                This invoice's content is taller than one A4 page — some items or sections may be cut off in the exported PDF. Consider shortening descriptions, reducing line items, or hiding optional sections (Notes, Terms) in the Design panel.
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {/* The invoice preview is display-only — no drag, no resize, no
                  click-to-edit. Zoom and print are the only interactions. */}
              <Canvas
                elements={renderElements}
                ctx={ctx}
                zoom={zoom}
                onFitZoomChange={handleFitZoomChange}
              />

              <div style={{ width: 380, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E7EAF0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #E7EAF0', flexShrink: 0 }}>
                  {['content', 'design'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPanelTab(tab)}
                      style={{
                        flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
                        color: panelTab === tab ? '#2563EB' : '#8891A0',
                        borderBottom: panelTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                      }}
                    >
                      {tab === 'content' ? 'Content' : 'Design'}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
                  {panelTab === 'content'
                    ? (
                      <ContentPanel
                        elements={doc.elements}
                        onFieldBlur={onFieldBlur}
                        onMetaRowBlur={onMetaRowBlur}
                        onBankRowBlur={onBankRowBlur}
                        onRowFieldBlur={onRowFieldBlur}
                        onAddRow={onAddRow}
                        onRemoveRow={onRemoveRow}
                        onMoveRow={onMoveRow}
                        onTogglePaymentMethod={onTogglePaymentMethod}
                        onTableRowImageUpload={onTableRowImageUpload}
                        onTableRowImageRemove={onTableRowImageRemove}
                        onQrValueBlur={onQrValueBlur}
                        onImageUpload={onImageUpload}
                        onImageRemove={onImageRemove}
                        onOpenCrop={() => setCropModalOpen(true)}
                        onLetterheadRemove={onLetterheadRemove}
                        onSignatureUpload={onSignatureUpload}
                        onSignatureDrawSave={onSignatureDrawSave}
                        onSignatureTypedSave={onSignatureTypedSave}
                        onStampOpacityChange={onStampOpacityChange}
                        onCommitStampOpacity={commitStampOpacity}
                        docSettings={{ currency: doc.currency, discount: doc.discount, vatRate: doc.vatRate }}
                        onDocSettingChange={handleDocSettingChange}
                        onCommitDocSetting={commitDocSetting}
                        currencies={CURRENCIES}
                      />
                    )
                    : (
                      <DesignPanel
                        brand={{ brandPrimary: doc.brandPrimary, brandSecondary: doc.brandSecondary, brandAccent: doc.brandAccent, headingFont: doc.headingFont, bodyFont: doc.bodyFont }}
                        onBrandChange={handleBrandChange}
                        elements={doc.elements}
                        onToggleVisible={onToggleVisible}
                        docSettings={{ currency: doc.currency, discount: doc.discount, vatRate: doc.vatRate }}
                        onDocSettingChange={handleDocSettingChange}
                        onCommitDocSetting={commitDocSetting}
                        onImageUpload={onImageUpload}
                        onImageRemove={onImageRemove}
                        letterheadEl={letterheadEl}
                        onOpenCrop={() => setCropModalOpen(true)}
                        onLetterheadRemove={onLetterheadRemove}
                      />
                    )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {cropModalOpen && letterheadEl && (
        <LetterheadCropModal
          targetW={letterheadEl.w}
          targetH={letterheadEl.h}
          initialSrc={letterheadEl.src}
          onSave={onLetterheadSave}
          onCancel={() => setCropModalOpen(false)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 60 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
