'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TransformableBox from '@/components/shared/TransformableBox';
import { computeFitToWidthScale, getPointerPageSpace } from '@/components/shared/coordinateTransform';
import { contentFor, createObject } from './objectTypes';
import { FormFieldNode } from './formFields';
import { detectStyleAt, sampleBackgroundColor, StyleMatchChip } from './styleMatchPreview';
import { detectFieldHotspots } from './fieldDetection';
import ClickMenu from './clickMenu';
import { RENDER_SCALE } from './constants';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const MIN_HIGHLIGHT_SIZE = 6;

function viewBtn(disabled) {
  return {
    padding: '5px 9px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
    color: disabled ? '#CBD5E1' : '#334155', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600, lineHeight: 1,
  };
}

// Center panel: the PDF page canvas plus every placed object, rendered as
// real DOM nodes (not canvas-drawn) inside a CSS `transform: scale()`
// wrapper — the same trick Redact & Edit PDF's TextBox overlay uses, which
// means an object's raw page-space x/y/w/h can be used directly as CSS px
// with no per-frame coordinate conversion. TransformableBox (generic move/
// resize/rotate primitive, already shared with Redact & Edit PDF) owns all
// pointer interaction for placed objects; this component only needs to
// handle clicks/drags that land on the empty page (deselect, or create a
// new object for the active tool) and the inline-edit commit/cancel flow.
//
// This deliberately differs from Annotate PDF's canvas-hit-test Stage:
// Annotate needs that model to stay smooth with hundreds of markup objects
// and accepts canvas-drawn (not real-cursor) text editing as the tradeoff.
// Write on PDF's realistic object counts are far smaller, and a real DOM
// text input (not a canvas approximation) is a better fit for the goal of
// added text blending naturally with the original page — not, to be clear,
// for editing the original page's own text, which this tool never touches.
export default function Stage({
  page, activePage, pageObjects,
  activeTool, inkColor,
  selectedId, setSelectedId,
  editingId, setEditingId,
  commitPageObjects, deleteObjectById,
  nextId, nextZ,
  formFields, fieldValues, setFieldValue,
}) {
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [draftValue, setDraftValue] = useState('');
  const [styleChip, setStyleChip] = useState(null); // { text, x, y } | null
  const [pendingMenu, setPendingMenu] = useState(null); // { pos, style, chipText } | null
  const [draftHighlight, setDraftHighlight] = useState(null); // { x, y, w, h } | null, page-space
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const chipTimeoutRef = useRef(null);
  const highlightStartRef = useRef(null);
  const draftHighlightRef = useRef(null);

  const displayScale = baseScale * zoom;

  // Tier 2 of the priority order (see project plan and formFields.js's own
  // header comment for tier 1): recognizable blanks — a label immediately
  // followed by a run of underscores/dots, or a bare run on its own —
  // detected straight from this page's own pdf.js text layer, already
  // filtered against tier-1 AcroForm widgets so a real field always wins
  // (see fieldDetection.js). Recomputed only when the page or its fields
  // change, not on every render.
  const hotspots = useMemo(
    () => (page?.textContent ? detectFieldHotspots(page.textContent, page.height, RENDER_SCALE, formFields) : []),
    [page, formFields]
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!page || !wrapper) return;
    function recompute() {
      const available = Math.max(120, wrapper.clientWidth - 32);
      setBaseScale(computeFitToWidthScale(page.width, available));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    canvas.getContext('2d').drawImage(page.canvas, 0, 0);
  }, [page]);

  // Clears any lingering style-match chip / click menu when the visible page
  // changes (their coordinates were relative to the old page) and on unmount.
  useEffect(() => {
    setStyleChip(null);
    setPendingMenu(null);
    return () => { if (chipTimeoutRef.current) clearTimeout(chipTimeoutRef.current); };
  }, [page]);

  useEffect(() => {
    if (!editingId) return;
    const obj = pageObjects.find((o) => o.id === editingId);
    setDraftValue(obj?.text || '');
    // Only re-sync when the editing target itself changes — not on every
    // pageObjects change, which would otherwise clobber in-progress typing
    // with the last-committed value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  function zoomIn() { setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }
  function zoomReset() { setZoom(1); }

  function getPos(e) {
    return getPointerPageSpace({ x: e.clientX, y: e.clientY }, canvasRef.current);
  }

  function commitEditing() {
    if (!editingId) return;
    const id = editingId;
    const obj = pageObjects.find((o) => o.id === id);
    setEditingId(null);
    clearStyleChip();
    if (!obj) return;
    if (!draftValue.trim() && !obj.text) {
      deleteObjectById(id);
      return;
    }
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, text: draftValue, updatedAt: Date.now() } : o)));
  }

  function clearStyleChip() {
    if (chipTimeoutRef.current) clearTimeout(chipTimeoutRef.current);
    setStyleChip(null);
  }

  // Shared by the direct-placement path (no nearby text — nothing to be
  // honest about replacing) and both "Add text here" / "Match nearby style"
  // click-menu choices. `keepChipOpen` skips the 4s auto-dismiss timeout for
  // "Match nearby style", since that option exists specifically so the user
  // can study the match before typing.
  function placeStyledText(pos, style, chipText, keepChipOpen = false) {
    let obj = createObject('text', { page: activePage, x: pos.x, y: pos.y - 14, color: inkColor, nextId, nextZ });
    if (style) {
      const fontSize = style.fontSizePx;
      const h = Math.max(18, Math.round(fontSize * 1.4));
      obj = { ...obj, h, fontSize, fontFamily: style.fontFamily, bold: style.bold, italic: style.italic, color: style.color };
      // Only a specific nearby match carries a real detected baseline
      // (the page-wide dominant-style fallback has no single line to snap
      // to) — same vertical-centering heuristic export uses (h*0.5 +
      // fontSize*0.32 from the box top lands roughly on the baseline),
      // solved for the box's y given that real baseline.
      if (Number.isFinite(style.baselinePageSpaceY)) {
        obj.y = style.baselinePageSpaceY - h * 0.5 - fontSize * 0.32;
      }
      // A specific match carries the matched text item's own box (see
      // fontMatch.js's sampleStyleNear) — Auto Text Fit (autoFit.js) shrinks
      // to keep new text from visibly overrunning that same width.
      if (style.box) obj.fitWidth = style.box.w;
    }
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
    setEditingId(obj.id);
    if (chipText) {
      setStyleChip({ text: chipText, x: obj.x, y: obj.y });
      if (!keepChipOpen) chipTimeoutRef.current = setTimeout(() => setStyleChip(null), 4000);
    } else {
      clearStyleChip();
    }
    return obj;
  }

  // Tier 2: places text pre-positioned/pre-sized to a detected blank
  // (fieldDetection.js's hotspot rect) rather than the raw click point —
  // still sampling nearby style the same way tier 3 does (a labeled blank's
  // own label text is real, styleable content pdf.js already sees), but the
  // box itself, not the click, drives x/y/w so the placement lands exactly
  // over the blank. `fitWidth` shrinks the text if it would otherwise
  // overrun the blank's own width. No click-menu here — filling a genuine
  // blank isn't "replacing" anything, so there's nothing to be honest about.
  function placeInHotspot(hotspot) {
    const samplePos = { x: hotspot.x + Math.min(6, hotspot.w * 0.1), y: hotspot.y + hotspot.h * 0.5 };
    const { style } = detectStyleAt(samplePos, page);
    let obj = createObject('text', { page: activePage, x: hotspot.x + 2, y: hotspot.y, color: inkColor, nextId, nextZ });
    const fontSize = style?.fontSizePx || obj.fontSize;
    const h = Math.max(18, Math.round(fontSize * 1.4));
    const w = Math.max(30, hotspot.w - 4);
    obj = {
      ...obj, w, h, fontSize,
      y: hotspot.y + (hotspot.h - h) / 2,
      fontFamily: style?.fontFamily || obj.fontFamily,
      bold: style?.bold ?? obj.bold,
      italic: style?.italic ?? obj.italic,
      color: style?.color || obj.color,
      fitWidth: w,
    };
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
    setEditingId(obj.id);
    setStyleChip({ text: hotspot.label ? `Detected blank: "${hotspot.label}"` : 'Detected blank — sized to fit', x: obj.x, y: obj.y });
    chipTimeoutRef.current = setTimeout(() => setStyleChip(null), 4000);
  }

  function handleAddTextHere() {
    const { pos, style, chipText } = pendingMenu;
    setPendingMenu(null);
    placeStyledText(pos, style, chipText, false);
  }

  function handleMatchNearbyStyle() {
    const { pos, style, chipText } = pendingMenu;
    setPendingMenu(null);
    placeStyledText(pos, style, chipText, true);
  }

  // Paints an opaque patch over the existing text's own bounding box (sized
  // and colored from what's actually on the page — see fontMatch.js's `box`
  // and styleMatchPreview.js's sampleBackgroundColor), then places a new
  // text object on top of it. The original PDF text underneath is untouched
  // — this only visually covers it, which is why every label here says
  // "cover"/"replace visually", never "edit".
  function handleCoverAndReplace() {
    const { style } = pendingMenu;
    setPendingMenu(null);
    const box = style.box;
    const color = sampleBackgroundColor(page.canvas, box);
    const coverObj = createObject('cover', { page: activePage, x: box.x, y: box.y, color, nextId, nextZ });
    coverObj.w = box.w;
    coverObj.h = box.h;
    const fontSize = style.fontSizePx;
    const h = Math.max(18, Math.round(fontSize * 1.4));
    let textObj = createObject('text', { page: activePage, x: box.x + 2, y: box.y, color: style.color, nextId, nextZ });
    textObj = {
      ...textObj,
      y: style.baselinePageSpaceY - h * 0.5 - fontSize * 0.32,
      h, fontSize, fontFamily: style.fontFamily, bold: style.bold, italic: style.italic,
      // Shrinks to fit the covered patch's own width — the replacement
      // shouldn't visibly spill past where the covered text ended.
      fitWidth: box.w,
    };
    // Cover committed before the text in the same array so it paints first —
    // this tool has no z-index layering, paint order is array order.
    commitPageObjects([...pageObjects, coverObj, textObj]);
    setSelectedId(textObj.id);
    setEditingId(textObj.id);
    clearStyleChip();
  }

  // Fires on the completed click (mousedown+mouseup), not on pointerdown:
  // creating the object and auto-focusing its input *during* pointerdown
  // means the same gesture's mouseup can still hit-test against the
  // about-to-be-replaced layout (the canvas, not the not-yet-painted input)
  // and blur the input back out before the user ever types a key — which
  // silently deletes the just-created empty object (commitEditing() treats
  // an empty draft on an empty object as "nothing to keep"). Waiting for
  // the full click to resolve first avoids that race entirely.
  function onCanvasClick(e) {
    if (editingId) { commitEditing(); return; }
    if (activeTool === 'highlight') return; // drag-to-draw, handled by pointerdown/move/up below
    if (activeTool === 'checkbox') {
      const pos = getPos(e);
      const obj = createObject('checkbox', { page: activePage, x: pos.x - 11, y: pos.y - 11, color: inkColor, nextId, nextZ });
      commitPageObjects([...pageObjects, obj]);
      setSelectedId(obj.id);
      return;
    }
    if (activeTool === 'text') {
      const pos = getPos(e);

      // Tier 2 (see project plan's priority order): a detected blank always
      // wins over tier 3's free-click style matching below, since it's a
      // more specific, more confident target than "somewhere near a click".
      const hotspot = hotspots.find((h) => pos.x >= h.x && pos.x <= h.x + h.w && pos.y >= h.y && pos.y <= h.y + h.h);
      if (hotspot) { placeInHotspot(hotspot); return; }

      // Tier 2/3 smart font matching: sample nearby text (if any) for a
      // closer-fitting default than the plain ink-color default, and snap
      // the insertion point to its detected baseline so typed text sits on
      // the same visual line as its neighbor. See styleMatchPreview.js for
      // why the chip never claims "Font matched" outright.
      const { style, chipText, isSpecificMatch } = detectStyleAt(pos, page);

      // Only a specific nearby text item makes the click-to-replace menu
      // meaningful (see clickMenu.js) — the page-wide dominant-style
      // fallback and the scanned/empty-page cases have no single item to
      // "replace", so they go straight to free placement.
      if (isSpecificMatch) {
        setPendingMenu({ pos, style, chipText });
        return;
      }
      placeStyledText(pos, style, chipText);
      return;
    }
    setSelectedId(null);
  }

  function onHighlightMove(e) {
    const start = highlightStartRef.current;
    if (!start) return;
    const pos = getPointerPageSpace({ x: e.clientX, y: e.clientY }, canvasRef.current);
    const rect = {
      x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y),
    };
    draftHighlightRef.current = rect;
    setDraftHighlight(rect);
  }

  function onHighlightUp() {
    window.removeEventListener('pointermove', onHighlightMove);
    window.removeEventListener('pointerup', onHighlightUp);
    const rect = draftHighlightRef.current;
    highlightStartRef.current = null;
    draftHighlightRef.current = null;
    setDraftHighlight(null);
    if (!rect || rect.w < MIN_HIGHLIGHT_SIZE || rect.h < MIN_HIGHLIGHT_SIZE) return; // ignore accidental clicks
    const obj = createObject('highlight', { page: activePage, x: rect.x, y: rect.y, nextId, nextZ });
    obj.w = rect.w;
    obj.h = rect.h;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  function onCanvasPointerDown(e) {
    if (activeTool !== 'highlight') return;
    if (editingId) commitEditing();
    const pos = getPos(e);
    highlightStartRef.current = pos;
    const rect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    draftHighlightRef.current = rect;
    setDraftHighlight(rect);
    window.addEventListener('pointermove', onHighlightMove);
    window.addEventListener('pointerup', onHighlightUp);
  }

  function toggleCheckbox(id) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, checked: !o.checked, updatedAt: Date.now() } : o)));
  }

  function handleCommitTransform(id, patch) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o)));
  }

  if (!page) return null;

  const canvasCursor = activeTool === 'text' ? 'text' : (activeTool === 'highlight' || activeTool === 'checkbox') ? 'crosshair' : 'default';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
        <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} style={viewBtn(zoom <= MIN_ZOOM)} aria-label="Zoom out">−</button>
        <button onClick={zoomReset} style={viewBtn(false)}>{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} style={viewBtn(zoom >= MAX_ZOOM)} aria-label="Zoom in">+</button>
      </div>

      <div
        ref={wrapperRef}
        style={{ display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 14, overflow: 'auto' }}
      >
        <div style={{ width: page.width * displayScale, height: page.height * displayScale, flexShrink: 0 }}>
          <div style={{ width: page.width, height: page.height, transform: `scale(${displayScale})`, transformOrigin: 'top left', position: 'relative', boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }}>
            <canvas
              ref={canvasRef}
              width={page.width}
              height={page.height}
              onClick={onCanvasClick}
              onPointerDown={onCanvasPointerDown}
              style={{ display: 'block', width: page.width, height: page.height, cursor: canvasCursor }}
            />
            {formFields?.length > 0 && (
              <div style={{ position: 'absolute', inset: 0 }}>
                {formFields.map((field) => (
                  <FormFieldNode
                    key={field.id}
                    field={field}
                    value={fieldValues?.[field.name]}
                    onChange={(v) => setFieldValue(field.name, v)}
                  />
                ))}
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {activeTool === 'text' && hotspots.map((h) => (
                <div
                  key={h.id}
                  style={{
                    position: 'absolute', left: h.x, top: h.y, width: h.w, height: h.h,
                    border: '1.5px dashed #16A34A', borderRadius: 3, background: 'rgba(22,163,74,0.06)',
                  }}
                />
              ))}
              {pageObjects.map((o) => {
                const Content = contentFor(o.type);
                return (
                  <TransformableBox
                    key={o.id}
                    obj={o}
                    scale={displayScale}
                    isSelected={selectedId === o.id}
                    isEditing={editingId === o.id}
                    onSelect={() => setSelectedId(o.id)}
                    onStartEdit={
                      o.type === 'text' ? () => setEditingId(o.id)
                        : o.type === 'checkbox' ? () => toggleCheckbox(o.id)
                          : undefined
                    }
                    onCommitTransform={(patch) => handleCommitTransform(o.id, patch)}
                    minW={o.type === 'checkbox' ? 16 : 40}
                    minH={o.type === 'checkbox' ? 16 : 16}
                  >
                    {(display, { isEditing }) => (
                      <Content
                        obj={display}
                        isEditing={isEditing}
                        value={draftValue}
                        onChangeValue={setDraftValue}
                        onBlurCommit={commitEditing}
                      />
                    )}
                  </TransformableBox>
                );
              })}
              {draftHighlight && (
                <div style={{ position: 'absolute', left: draftHighlight.x, top: draftHighlight.y, width: draftHighlight.w, height: draftHighlight.h, background: '#FDE047', opacity: 0.4 }} />
              )}
              {styleChip && <StyleMatchChip text={styleChip.text} x={styleChip.x} y={styleChip.y} />}
              {pendingMenu && (
                <ClickMenu
                  x={pendingMenu.pos.x}
                  y={pendingMenu.pos.y}
                  onAddTextHere={handleAddTextHere}
                  onMatchNearbyStyle={handleMatchNearbyStyle}
                  onCoverAndReplace={handleCoverAndReplace}
                  onDismiss={() => setPendingMenu(null)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
