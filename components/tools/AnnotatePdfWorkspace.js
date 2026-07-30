'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

const RENDER_SCALE = 1.5;
const NOTE_RADIUS = 13;

const HIGHLIGHT_COLORS = ['#FDE047', '#86EFAC', '#93C5FD', '#F9A8D4'];
const INK_COLORS = ['#DC2626', '#2563EB', '#059669', '#0F172A'];

const TOOLS = [
  { id: 'highlight', label: 'Highlight', icon: '🖍️' },
  { id: 'draw', label: 'Draw', icon: '✏️' },
  { id: 'note', label: 'Sticky Note', icon: '📝' },
  { id: 'text', label: 'Text', icon: '🅰️' },
];

function pointInRect(pos, r) {
  return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
}

function strokeBounds(points, pad = 8) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
}

function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function drawObject(ctx, o) {
  if (o.type === 'highlight') {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.restore();
  } else if (o.type === 'draw') {
    if (o.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(o.points[0].x, o.points[0].y);
    o.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  } else if (o.type === 'note') {
    ctx.save();
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.arc(o.x, o.y, NOTE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', o.x, o.y + 1);
    ctx.textAlign = 'left';
    if (o.text) {
      const maxW = 240;
      const label = truncateToWidth(ctx, o.text, maxW - 16);
      const boxX = o.x + NOTE_RADIUS + 8;
      const boxY = o.y - 16;
      const w = Math.min(maxW, ctx.measureText(label).width + 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(boxX, boxY, w, 32);
      ctx.strokeRect(boxX, boxY, w, 32);
      ctx.fillStyle = '#1E293B';
      ctx.font = '13px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxX + 8, boxY + 16);
    }
    ctx.restore();
  } else if (o.type === 'text') {
    if (!o.text) return;
    ctx.save();
    ctx.fillStyle = o.color;
    ctx.font = `bold ${o.size}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(o.text, o.x, o.y);
    ctx.restore();
  }
}

function textBounds(ctx, o) {
  ctx.save();
  ctx.font = `bold ${o.size}px sans-serif`;
  const w = ctx.measureText(o.text || ' ').width;
  ctx.restore();
  return { x: o.x, y: o.y, w: Math.max(w, 10), h: o.size };
}

function smallBtn(active, danger) {
  return {
    padding: '7px 12px', borderRadius: 8, border: '1px solid', borderColor: danger ? '#FECACA' : (active ? '#2563EB' : '#E2E8F0'),
    background: danger ? '#FEF2F2' : (active ? '#EFF6FF' : 'white'),
    color: danger ? '#DC2626' : (active ? '#1D4ED8' : '#334155'), cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 600,
  };
}

export default function AnnotatePdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null);

  const [activeTool, setActiveTool] = useState('highlight');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [selected, setSelected] = useState(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [editor, setEditor] = useState(null); // { id, x, y, value }

  const [history, setHistory] = useState({ stack: [[]], index: 0 });

  const canvasRef = useRef(null);
  const stageWrapperRef = useRef(null);
  const dragRef = useRef(null);
  const liveObjectRef = useRef(null);
  const nextIdRef = useRef(1);

  const currentObjects = history.stack[history.index]?.[activePage] || [];

  async function loadPdfIntoWorkspace(f, { fromSession = false } = {}) {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    setLoading(true);
    setError('');
    setResultBytes(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const loadedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height });
      }
      nextIdRef.current = 1;
      setPages(loadedPages);
      setHistory({ stack: [loadedPages.map(() => [])], index: 0 });
      setActivePage(0);
      setSelected(null);
      setEditor(null);
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'annotate-pdf' });
        }
      }
    } catch {
      setError("Could not read this PDF. Make sure it's a valid, non-password-protected file.");
    }
    setLoading(false);
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await loadPdfIntoWorkspace(f, { fromSession: true });
  }

  function handleFileInput(e) {
    loadPdfIntoWorkspace(e.target.files?.[0]);
  }

  function commitObjects(newPageObjects) {
    setHistory((h) => {
      const truncated = h.stack.slice(0, h.index + 1);
      const nextSnapshot = truncated[truncated.length - 1].map((arr, i) => (i === activePage ? newPageObjects : arr));
      return { stack: [...truncated, nextSnapshot], index: truncated.length };
    });
    setResultBytes(null);
  }

  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;
  function undo() { if (canUndo) { setHistory((h) => ({ ...h, index: h.index - 1 })); setSelected(null); setEditor(null); } }
  function redo() { if (canRedo) { setHistory((h) => ({ ...h, index: h.index + 1 })); setSelected(null); setEditor(null); } }

  function deleteObject(id) {
    commitObjects(currentObjects.filter((o) => o.id !== id));
    setSelected(null);
    setEditor(null);
  }

  function patchObject(id, patch) {
    commitObjects(currentObjects.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function clearPage() {
    commitObjects([]);
    setSelected(null);
    setEditor(null);
  }

  function deleteSelected() {
    if (selected) deleteObject(selected.id);
  }

  useEffect(() => {
    function recompute() {
      const page = pages[activePage];
      const wrapper = stageWrapperRef.current;
      if (!page || !wrapper) return;
      const available = Math.max(120, wrapper.clientWidth - 32);
      setDisplayScale(Math.min(1, Math.max(0.15, available / page.width)));
    }
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [pages, activePage]);

  const drawDisplay = useCallback(() => {
    const displayCanvas = canvasRef.current;
    const page = pages[activePage];
    if (!displayCanvas || !page) return;
    const ctx = displayCanvas.getContext('2d');
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(page.canvas, 0, 0);

    const live = liveObjectRef.current;
    currentObjects.forEach((o) => {
      if (live && live.id === o.id) return;
      drawObject(ctx, o);
      if (selected?.id === o.id) {
        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        const b = o.type === 'draw' ? strokeBounds(o.points) : o;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.restore();
      }
    });
    if (live) drawObject(ctx, live);
  }, [pages, activePage, currentObjects, selected]);

  useEffect(() => { drawDisplay(); }, [drawDisplay]);

  function getPos(e) {
    const rectEl = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rectEl.width;
    const scaleY = canvasRef.current.height / rectEl.height;
    return { x: (e.clientX - rectEl.left) * scaleX, y: (e.clientY - rectEl.top) * scaleY };
  }

  function screenPosFor(o) {
    const wrapperRect = stageWrapperRef.current.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const offsetX = canvasRect.left - wrapperRect.left;
    const offsetY = canvasRect.top - wrapperRect.top;
    return { left: offsetX + o.x * displayScale, top: offsetY + o.y * displayScale };
  }

  function hitEditable(pos) {
    const ctx = canvasRef.current.getContext('2d');
    for (let i = currentObjects.length - 1; i >= 0; i--) {
      const o = currentObjects[i];
      if (o.type === 'note') {
        const dx = pos.x - o.x, dy = pos.y - o.y;
        if (Math.sqrt(dx * dx + dy * dy) <= NOTE_RADIUS + 5) return o;
      } else if (o.type === 'text') {
        const b = textBounds(ctx, o);
        if (pointInRect(pos, { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 })) return o;
      }
    }
    return null;
  }

  function hitSelectable(pos) {
    for (let i = currentObjects.length - 1; i >= 0; i--) {
      const o = currentObjects[i];
      if (o.type === 'highlight' && pointInRect(pos, o)) return o;
      if (o.type === 'draw' && pointInRect(pos, strokeBounds(o.points))) return o;
    }
    return null;
  }

  function openEditor(o) {
    setSelected(null);
    setEditor({ id: o.id, value: o.text || '' });
  }

  function onPointerDown(e) {
    const pos = getPos(e);
    const editHit = hitEditable(pos);
    if (editHit) { openEditor(editHit); return; }
    const selHit = hitSelectable(pos);
    if (selHit) { setSelected({ id: selHit.id }); return; }
    setSelected(null);

    if (activeTool === 'highlight') {
      dragRef.current = { type: 'highlight', start: pos };
      liveObjectRef.current = { id: null, type: 'highlight', x: pos.x, y: pos.y, w: 0, h: 0, color: highlightColor };
    } else if (activeTool === 'draw') {
      dragRef.current = { type: 'draw' };
      liveObjectRef.current = { id: null, type: 'draw', points: [pos], color: inkColor };
    } else if (activeTool === 'note') {
      const obj = { id: nextIdRef.current++, type: 'note', x: pos.x, y: pos.y, color: inkColor, text: '' };
      commitObjects([...currentObjects, obj]);
      openEditor(obj);
    } else if (activeTool === 'text') {
      const obj = { id: nextIdRef.current++, type: 'text', x: pos.x, y: pos.y, color: inkColor, size: 28, text: '' };
      commitObjects([...currentObjects, obj]);
      openEditor(obj);
    }
    drawDisplay();
  }

  function onPointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const pos = getPos(e);
    if (drag.type === 'highlight') {
      liveObjectRef.current = {
        id: null, type: 'highlight', color: highlightColor,
        x: Math.min(drag.start.x, pos.x), y: Math.min(drag.start.y, pos.y),
        w: Math.abs(pos.x - drag.start.x), h: Math.abs(pos.y - drag.start.y),
      };
    } else if (drag.type === 'draw') {
      liveObjectRef.current = { ...liveObjectRef.current, points: [...liveObjectRef.current.points, pos] };
    }
    drawDisplay();
  }

  function onPointerUp() {
    const drag = dragRef.current;
    const live = liveObjectRef.current;
    dragRef.current = null;
    liveObjectRef.current = null;
    if (!drag || !live) return;
    if (drag.type === 'highlight' && live.w > 3 && live.h > 3) {
      commitObjects([...currentObjects, { ...live, id: nextIdRef.current++ }]);
    } else if (drag.type === 'draw' && live.points.length > 1) {
      commitObjects([...currentObjects, { ...live, id: nextIdRef.current++ }]);
    } else {
      drawDisplay();
    }
  }

  function commitEditor() {
    if (!editor) return;
    const obj = currentObjects.find((o) => o.id === editor.id);
    if (!obj) { setEditor(null); return; }
    if (!editor.value.trim() && !obj.text) {
      deleteObject(editor.id);
    } else {
      patchObject(editor.id, { text: editor.value });
    }
    setEditor(null);
  }

  function deleteEditorObject() {
    if (editor) deleteObject(editor.id);
  }

  async function handleApply() {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const snapshot = history.stack[history.index];

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const objects = snapshot[i] || [];
        const flat = document.createElement('canvas');
        flat.width = p.width;
        flat.height = p.height;
        const ctx = flat.getContext('2d');
        ctx.drawImage(p.canvas, 0, 0);
        objects.forEach((o) => drawObject(ctx, o));

        const dataUrl = flat.toDataURL('image/png');
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([p.width, p.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: p.width, height: p.height });
      }

      const bytes = await pdfDoc.save();
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'annotate-pdf', label: 'Annotated', hasTextLayer: false });
    } catch {
      setError('Something went wrong applying your annotations. Please try again.');
    }
    setBusy(false);
  }

  function downloadResult() {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'convertam-annotated.pdf';
    a.click();
  }

  function reset() {
    setFile(null);
    setPages([]);
    setHistory({ stack: [[]], index: 0 });
    setSelected(null);
    setEditor(null);
    setResultBytes(null);
    setError('');
  }

  if (!pages.length) {
    return (
      <div className="panel">
        {session.status === 'active' && session.document && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {session.document.pageCount ? `${session.document.pageCount} pages · ` : ''}already in this session — no need to re-upload.
              </div>
            </div>
            <button onClick={continueWithSessionDocument} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Continue
            </button>
          </div>
        )}
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to annotate</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Highlight text, draw, add sticky notes and comments — right on the page.</p>
          <input type="file" accept="application/pdf" onChange={handleFileInput} />
          {loading && <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 12 }}>Loading pages…</p>}
        </div>
        {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
        <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
      </div>
    );
  }

  const page = pages[activePage];
  const editorObj = editor ? currentObjects.find((o) => o.id === editor.id) : null;
  const editorPos = editorObj ? screenPosFor(editorObj) : null;

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setActivePage((p) => Math.max(0, p - 1))} disabled={activePage === 0} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Page {activePage + 1} of {pages.length}</span>
          <button onClick={() => setActivePage((p) => Math.min(pages.length - 1, p + 1))} disabled={activePage === pages.length - 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={undo} disabled={!canUndo} style={{ ...smallBtn(false), opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'default' }}>↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} style={{ ...smallBtn(false), opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'default' }}>↷ Redo</button>
          <button onClick={deleteSelected} disabled={!selected} style={{ ...smallBtn(false, true), opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'default' }}>🗑 Delete Selected</button>
          <button onClick={clearPage} style={smallBtn(false)}>Clear Page</button>
        </div>
      </div>

      <div role="tablist" aria-label="Annotation tool" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TOOLS.map((t) => (
          <button key={t.id} role="tab" aria-selected={activeTool === t.id} onClick={() => { setActiveTool(t.id); setSelected(null); }} style={smallBtn(activeTool === t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTool === 'highlight' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Color</span>
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} onClick={() => setHighlightColor(c)} aria-label={`Highlight color ${c}`} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: highlightColor === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer' }} />
          ))}
        </div>
      )}
      {(activeTool === 'draw' || activeTool === 'note' || activeTool === 'text') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Color</span>
          {INK_COLORS.map((c) => (
            <button key={c} onClick={() => setInkColor(c)} aria-label={`Ink color ${c}`} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: inkColor === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer' }} />
          ))}
        </div>
      )}

      <div ref={stageWrapperRef} style={{ position: 'relative', display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <canvas
          ref={canvasRef}
          width={page.width}
          height={page.height}
          style={{ width: page.width * displayScale, height: page.height * displayScale, borderRadius: 4, boxShadow: '0 4px 16px rgba(15,23,42,0.18)', touchAction: 'none', cursor: activeTool === 'text' ? 'text' : 'crosshair' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
        />
        {editor && editorPos && (
          <div style={{ position: 'absolute', left: editorPos.left, top: editorPos.top, zIndex: 20, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.18)', width: 220 }}>
            <textarea
              autoFocus
              value={editor.value}
              onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              placeholder={editorObj?.type === 'note' ? 'Type a comment…' : 'Type text…'}
              style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button onClick={deleteEditorObject} style={{ ...smallBtn(false, true), padding: '5px 10px' }}>Delete</button>
              <button onClick={commitEditor} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}
      </div>

      {!resultBytes ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleApply} disabled={busy} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: busy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Applying…' : 'Apply Annotations'}
          </button>
          <button onClick={reset} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            Start Over
          </button>
        </div>
      ) : (
        <ContinueWorkingPanel toolSlug="annotate-pdf" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
      )}

      {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
      <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
    </div>
  );
}
