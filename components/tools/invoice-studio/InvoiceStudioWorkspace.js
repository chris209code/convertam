'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Poppins, Inter, Caveat } from 'next/font/google';
import { emptyDoc, buildDefaultSections } from '@/lib/invoice-studio/sectionsModel';
import { stylesFor, TEMPLATE_GALLERY } from '@/lib/invoice-studio/styleTokens';
import { computeInvoiceTotals } from '@/lib/invoice-studio/calculations';
import { amountInWords } from '@/lib/invoice-studio/numberToWords';
import { validateImageFile, readFileAsDataURL } from '@/lib/invoice-studio/fileUpload';
import { generateQrDataUrl } from '@/lib/invoice-studio/qrGenerate';
import Gallery from './Gallery';
import Toolbar from './Toolbar';
import FlowCanvas from './FlowCanvas';
import ContentPanel from './panels/ContentPanel';
import DesignPanel from './panels/DesignPanel';
import LetterheadCropModal from './LetterheadCropModal';

const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cs-font-poppins' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--cs-font-inter' });
const caveat = Caveat({ subsets: ['latin'], weight: ['600'], variable: '--cs-font-caveat' });

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

const ZOOM_MIN = 0.3, ZOOM_MAX = 1.5, ZOOM_STEP = 0.1, ZOOM_DEFAULT = 0.75;
const HISTORY_LIMIT = 60;

export default function InvoiceStudioWorkspace() {
  const [view, setView] = useState('gallery');
  const [templateId, setTemplateId] = useState('modern');
  const [doc, setDoc] = useState(emptyDoc());
  const [colorOverrides, setColorOverrides] = useState(null); // null = use template defaults untouched
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [zoomIsManual, setZoomIsManual] = useState(false);
  const [toast, setToast] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);

  const docRef = useRef(doc);
  const historyIndexRef = useRef(historyIndex);
  const zoomIsManualRef = useRef(false);
  useEffect(() => { zoomIsManualRef.current = zoomIsManual; }, [zoomIsManual]);

  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg, durationMs = 2200) => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(''), durationMs);
  }, []);

  const pushHistory = useCallback((nextDoc) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const next = [...truncated, nextDoc].slice(-HISTORY_LIMIT);
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(historyIndexRef.current);
      return next;
    });
  }, []);

  const updateDoc = useCallback((updater, commit = true) => {
    setDoc((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      docRef.current = next;
      if (commit) pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const restoreSnapshot = useCallback((snapshot) => {
    docRef.current = snapshot;
    setDoc(snapshot);
  }, []);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current - 1;
    if (idx < 0) return;
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
    restoreSnapshot(history[idx]);
  }, [history, restoreSnapshot]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current + 1;
    if (idx >= history.length) return;
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
    restoreSnapshot(history[idx]);
  }, [history, restoreSnapshot]);

  // Templates are skins — swapping preserves every field of content by
  // construction, since sections carry no position/style data of their
  // own. Only the style tokens (read separately, below) change.
  const openTemplate = useCallback((id) => {
    const hasExistingDoc = docRef.current.sections.itemsTable.rows.some((r) => r.name);
    const initial = hasExistingDoc ? { ...docRef.current, templateId: id } : { ...emptyDoc(id) };
    setTemplateId(id);
    docRef.current = initial;
    setDoc(initial);
    setColorOverrides(null);
    setPanelTab('content');
    setView('editor');
    setZoomIsManual(false);
    historyIndexRef.current = 0;
    setHistory([initial]);
    setHistoryIndex(0);
  }, []);

  const [panelTab, setPanelTab] = useState('content');
  const goToGallery = useCallback(() => setView('gallery'), []);

  // --- section field updates ---------------------------------------------
  const onPatchSection = useCallback((key, patch) => {
    updateDoc((prev) => ({ ...prev, sections: { ...prev.sections, [key]: { ...prev.sections[key], ...patch } } }));
  }, [updateDoc]);

  const onToggleSection = useCallback((key) => {
    updateDoc((prev) => ({ ...prev, sections: { ...prev.sections, [key]: { ...prev.sections[key], visible: !prev.sections[key].visible } } }));
  }, [updateDoc]);

  const onRowField = useCallback((idx, field, value) => {
    updateDoc((prev) => {
      const rows = prev.sections.itemsTable.rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
      return { ...prev, sections: { ...prev.sections, itemsTable: { ...prev.sections.itemsTable, rows } } };
    });
  }, [updateDoc]);

  const onAddRow = useCallback(() => {
    updateDoc((prev) => ({
      ...prev,
      sections: { ...prev.sections, itemsTable: { ...prev.sections.itemsTable, rows: [...prev.sections.itemsTable.rows, { name: '', desc: '', qty: 1, rate: 0, vat: prev.vatRate, img: null }] } },
    }));
  }, [updateDoc]);

  const onRemoveRow = useCallback((idx) => {
    updateDoc((prev) => {
      if (prev.sections.itemsTable.rows.length <= 1) return prev;
      const rows = prev.sections.itemsTable.rows.filter((_, i) => i !== idx);
      return { ...prev, sections: { ...prev.sections, itemsTable: { ...prev.sections.itemsTable, rows } } };
    });
  }, [updateDoc]);

  const onMoveRow = useCallback((idx, dir) => {
    updateDoc((prev) => {
      const rows = [...prev.sections.itemsTable.rows];
      const target = idx + dir;
      if (target < 0 || target >= rows.length) return prev;
      [rows[idx], rows[target]] = [rows[target], rows[idx]];
      return { ...prev, sections: { ...prev.sections, itemsTable: { ...prev.sections.itemsTable, rows } } };
    });
  }, [updateDoc]);

  const onRowImageUpload = useCallback(async (idx, file) => {
    const err = validateImageFile(file);
    if (err) { showToast(err); return err; }
    const dataUrl = await readFileAsDataURL(file);
    onRowField(idx, 'img', dataUrl);
    return null;
  }, [onRowField, showToast]);

  const onRowImageRemove = useCallback((idx) => onRowField(idx, 'img', null), [onRowField]);

  const onTogglePaymentMethod = useCallback((method) => {
    updateDoc((prev) => {
      const methods = prev.sections.payment.methods.includes(method)
        ? prev.sections.payment.methods.filter((m) => m !== method)
        : [...prev.sections.payment.methods, method];
      return { ...prev, sections: { ...prev.sections, payment: { ...prev.sections.payment, methods } } };
    });
  }, [updateDoc]);

  const onBankRowField = useCallback((idx, value) => {
    updateDoc((prev) => {
      const rows = prev.sections.bank.rows.map((r, i) => (i === idx ? { ...r, v: value } : r));
      return { ...prev, sections: { ...prev.sections, bank: { ...prev.sections.bank, rows } } };
    });
  }, [updateDoc]);

  const onPatchQr = useCallback(async (value) => {
    const src = value ? await generateQrDataUrl(value) : null;
    onPatchSection('qr', { value, src });
  }, [onPatchSection]);

  // --- generic image upload/remove for logo/stamp/letterhead ------------
  const onImageUpload = useCallback(async (sectionKey, field, file) => {
    const err = validateImageFile(file);
    if (err) { showToast(err); return err; }
    const dataUrl = await readFileAsDataURL(file);
    onPatchSection(sectionKey, { [field]: dataUrl });
    return null;
  }, [onPatchSection, showToast]);

  const onImageRemove = useCallback((sectionKey, field) => onPatchSection(sectionKey, { [field]: null }), [onPatchSection]);

  const onLetterheadRemove = useCallback(() => onPatchSection('letterhead', { src: null, visible: false }), [onPatchSection]);
  const onLetterheadSave = useCallback((dataUrl) => { onPatchSection('letterhead', { src: dataUrl, visible: true }); setCropModalOpen(false); }, [onPatchSection]);

  const onSignatureUpload = useCallback(async (file) => {
    const err = validateImageFile(file);
    if (err) return err;
    const dataUrl = await readFileAsDataURL(file);
    onPatchSection('signature', { mode: 'uploaded', src: dataUrl });
    return null;
  }, [onPatchSection]);
  const onSignatureDrawSave = useCallback((dataUrl) => onPatchSection('signature', { mode: 'uploaded', src: dataUrl }), [onPatchSection]);
  const onSignatureTypedSave = useCallback((text) => onPatchSection('signature', { mode: 'typed', text }), [onPatchSection]);
  const onStampOpacityChange = useCallback((opacity) => onPatchSection('stamp', { opacity }), [onPatchSection]);

  const onCurrencyChange = useCallback((currency) => updateDoc((prev) => ({ ...prev, currency })), [updateDoc]);
  const onDocSettingChange = useCallback((key, value) => updateDoc((prev) => ({ ...prev, [key]: value })), [updateDoc]);

  const zoomIn = useCallback(() => { setZoomIsManual(true); setZoom((z) => clamp(Math.round((z + ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)); }, []);
  const zoomOut = useCallback(() => { setZoomIsManual(true); setZoom((z) => clamp(Math.round((z - ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)); }, []);
  const resetToFit = useCallback(() => setZoomIsManual(false), []);
  const handleFitZoomChange = useCallback((fitZoom) => {
    setZoom((current) => (zoomIsManualRef.current ? current : clamp(Math.round(fitZoom * 100) / 100, ZOOM_MIN, ZOOM_MAX)));
  }, []);

  const tableRows = doc.sections.itemsTable.rows;
  const totals = useMemo(() => computeInvoiceTotals(tableRows, doc.discount), [tableRows, doc.discount]);
  const wordsText = useMemo(() => amountInWords(totals.total, doc.currency), [totals.total, doc.currency]);
  const baseStyle = useMemo(() => stylesFor(doc.templateId), [doc.templateId]);
  const style = useMemo(() => (colorOverrides ? { ...baseStyle, ...colorOverrides } : baseStyle), [baseStyle, colorOverrides]);
  const onColorChange = useCallback((key, value) => setColorOverrides((prev) => ({ ...(prev || baseStyle), [key]: value })), [baseStyle]);

  const handleDownload = useCallback(async (format) => {
    showToast('Preparing download…');
    const filename = `Invoice-${doc.templateId}-${Date.now()}`;
    try {
      if (format === 'pdf') {
        // Real headless-browser PDF, built from the exact same doc/style
        // structure the editor renders — one shared source of truth, not
        // a second implementation to keep in sync by hand.
        const res = await fetch('/api/invoice-pdf', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc, style, totals, wordsText }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `PDF generation failed (${res.status})`);
        }
        const bytes = await res.arrayBuffer();
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${filename}.pdf`);
      } else {
        const node = document.querySelector('.cs-flow-pages');
        if (!node) return;
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `${filename}.${format}`); }, mime, format === 'jpg' ? 0.92 : undefined);
      }
      showToast(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast(`Download failed: ${err?.message || String(err)}`, 15000);
    }
  }, [doc, style, totals, wordsText, showToast]);

  const templateName = (TEMPLATE_GALLERY.find((t) => t.id === templateId)?.name || 'Invoice') + ' Template';
  const letterhead = doc.sections.letterhead;

  return (
    <div className={`${poppins.variable} ${inter.variable} ${caveat.variable}`} style={{ height: 'calc(100vh - 64px)', minHeight: 560, width: '100%', display: 'flex', fontFamily: 'var(--cs-font-inter), Inter, sans-serif', color: '#0F172A', overflow: 'hidden', background: '#F7F8FA' }}>
      <div style={{ width: 88, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E7EAF0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#10B981)' }} />
        <button onClick={goToGallery} style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: view === 'gallery' ? '#EFF6FF' : 'transparent', cursor: 'pointer' }} title="Templates" />
      </div>

      {view === 'gallery' && <Gallery onSelectTemplate={openTemplate} />}

      {view === 'editor' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            onDownload={handleDownload}
            onBack={goToGallery}
          />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div className="cs-flow-pages" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
              <FlowCanvas doc={doc} style={style} totals={totals} wordsText={wordsText} zoom={zoom} onFitZoomChange={handleFitZoomChange} />
            </div>

            <div style={{ width: 380, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E7EAF0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #E7EAF0', flexShrink: 0 }}>
                {['content', 'design'].map((tab) => (
                  <button
                    key={tab} onClick={() => setPanelTab(tab)}
                    style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: panelTab === tab ? '#2563EB' : '#8891A0', borderBottom: panelTab === tab ? '2px solid #2563EB' : '2px solid transparent' }}
                  >
                    {tab === 'content' ? 'Content' : 'Design'}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
                {panelTab === 'content' ? (
                  <ContentPanel
                    sections={doc.sections} currency={doc.currency}
                    onPatchSection={onPatchSection} onCurrencyChange={onCurrencyChange}
                    onRowField={onRowField} onAddRow={onAddRow} onRemoveRow={onRemoveRow} onMoveRow={onMoveRow}
                    onRowImageUpload={onRowImageUpload} onRowImageRemove={onRowImageRemove}
                    onTogglePaymentMethod={onTogglePaymentMethod} onBankRowField={onBankRowField} onPatchQr={onPatchQr}
                    onImageUpload={onImageUpload} onImageRemove={onImageRemove}
                    onOpenCrop={() => setCropModalOpen(true)} onLetterheadRemove={onLetterheadRemove}
                    onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave} onSignatureTypedSave={onSignatureTypedSave}
                    onStampOpacityChange={onStampOpacityChange}
                  />
                ) : (
                  <DesignPanel
                    templateId={templateId} onSelectTemplate={openTemplate}
                    colorOverrides={style} onColorChange={onColorChange}
                    docSettings={{ discount: doc.discount, vatRate: doc.vatRate }} onDocSettingChange={onDocSettingChange}
                    sections={doc.sections} onToggleSection={onToggleSection}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {cropModalOpen && (
        <LetterheadCropModal
          onClose={() => setCropModalOpen(false)}
          onSave={onLetterheadSave}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 60, maxWidth: 480, textAlign: 'center' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
