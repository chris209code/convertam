'use client';

import { createFontEmbedCache, measureTextWidthPagePx } from '@/components/shared/fontResolver';
import { RENDER_SCALE } from './constants';
import { formatPageNumberText } from './objectTypes/pageNumber';
import { buildFooterText } from './objectTypes/footer';
import { resolveTargetPages } from './pageSelection';
import { detectContentBands, computeAutoBandsPx, applyMinContentFloorPx } from './contentBands';

// The full object-layout export pipeline, extracted out of
// PdfLayoutStudioWorkspace.js so it has exactly one implementation shared
// by both the single-document "Apply Layout" button and Batch Processing
// (see BatchPanel.js) — Batch is the second caller that made this worth
// pulling out, following this codebase's usual "promote once a second
// consumer needs the identical code" rule. Takes the already-loaded
// pdf-lib PDFDocument's bytes plus the SAME `objects` template used on the
// currently open document, and a `pagesInfo` array describing each of
// THIS pdfBytes's own pages ({ width, height }, page-space px matching
// RENDER_SCALE) — for the main document pagesInfo is just a thin map over
// the already-loaded `pages` state; for a batch file it comes from
// extractPageInfo() below, which does the pdf.js render pass fresh.
function hexToRgbFractions(hex) {
  const clean = (hex || '#111827').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r: r || 0, g: g || 0, b: b || 0 };
}

// Rotates point (x,y) around (cx,cy) by angleDeg — used only for the text
// underline, which is tightly coupled to the glyph baseline and should
// visually rotate with it. Background/border fills are simpler axis-aligned
// rectangles and are NOT rotated at export in this phase (a disclosed,
// narrow scoping gap, consistent with Write on PDF's own checkbox export,
// which also skips rotation on its border/checkmark rather than
// half-implementing it).
function rotatePoint(cx, cy, x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
}

// Rotates a vector (not a point) by angleDeg — used to convert a shape's
// center + half-width/half-height into the corner coordinate pdf-lib's
// drawRectangle actually wants. pdf-lib rotates a rectangle around its own
// (x,y) CORNER argument, not around its visual center the way the DOM
// preview's CSS `transform: rotate()` does (which pivots around the box's
// center) — so passing the plain unrotated corner straight through would
// make a rotated rectangle export to a different position than what was
// shown on screen. Solving "corner = center - Rotate(halfW, halfH)" is what
// makes pdf-lib's corner-pivot rotation reproduce a center-pivot rotation.
function rotateVector(vx, vy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: vx * Math.cos(rad) - vy * Math.sin(rad), y: vx * Math.sin(rad) + vy * Math.cos(rad) };
}

// Renders every page of a PDF with pdf.js just far enough to know its
// page-space dimensions — no canvas bitmap is retained, since batch files
// are never displayed on the Stage. Mirrors the per-page loop in
// PdfLayoutStudioWorkspace.js's loadPdfIntoWorkspace(), minus the render
// step that produces the on-screen thumbnail.
export async function extractPageInfo(pdfBytes) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pagesInfo = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    pagesInfo.push({ width: viewport.width, height: viewport.height });
  }
  return pagesInfo;
}

// Applies the full `objects` layout to one PDF's bytes and returns the
// resulting PDF bytes. Every draw call below is a direct port of what
// PdfLayoutStudioWorkspace.js's old inline handleApply() did — see that
// file's git history for the original, single-document-only version if
// you need the diff.
export async function applyLayoutToPdf(pdfBytes, objects, pagesInfo) {
  const { PDFDocument, degrees, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const embedFor = createFontEmbedCache(pdfDoc);
  const imageEmbedCache = new Map();

  async function embedImage(src) {
    if (!imageEmbedCache.has(src)) {
      const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
      imageEmbedCache.set(src, await pdfDoc.embedPng(bytes));
    }
    return imageEmbedCache.get(src);
  }

  // Lazily parses the ORIGINAL bytes with pdf.js — a completely separate
  // parse from pdf-lib's own document model above — so Push Down can find
  // where a page's actual text starts and ends. Without this, "shrink to
  // fit" scales the whole page including its own built-in margins, so a
  // normal letter's blank space above/below the text gets preserved
  // proportionally and shrinks right along with it, leaving the actual
  // words looking tiny inside mostly-empty space. A fresh copy of the
  // bytes is used because pdf.js transfers/detaches whatever buffer it's
  // given to its worker, which must not disturb pdf-lib's already-loaded
  // model above.
  let pdfJsDocPromise = null;
  function getPdfJsDoc() {
    if (!pdfJsDocPromise) {
      pdfJsDocPromise = (async () => {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        return pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      })();
    }
    return pdfJsDocPromise;
  }

  // Returns { bottom, top } in PDF points marking the vertical extent of
  // real text on a page, padded a little for ascenders/descenders — or
  // null when there's no extractable text (a scanned/image-only page, or
  // pdf.js failing for any reason), so callers fall back to treating the
  // whole page as the content, unchanged from before this existed.
  async function detectTextContentBoundsPt(pageIndex, pageHeightPt) {
    try {
      const doc = await getPdfJsDoc();
      if (pageIndex + 1 > doc.numPages) return null;
      const page = await doc.getPage(pageIndex + 1);
      const content = await page.getTextContent();
      let minY = Infinity;
      let maxY = -Infinity;
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        const y = item.transform[5];
        const rise = item.height || Math.abs(item.transform[3]) || 10;
        if (y < minY) minY = y;
        if (y + rise > maxY) maxY = y + rise;
      }
      if (!isFinite(minY) || !isFinite(maxY)) return null;
      const padding = 18;
      const bottom = Math.max(0, minY - padding);
      const top = Math.min(pageHeightPt, maxY + padding);
      if (!(top > bottom)) return null;
      // A crop that comes out implausibly thin relative to the page is a
      // sign the detection misfired (e.g. an invisible/OCR text layer whose
      // positions don't line up with what's actually visible on the page)
      // rather than a genuinely short letter — trusting it could crop out
      // real visible content. Discarding it here falls back to treating the
      // whole page as the content, same as before this detection existed,
      // which is always safe even if less tightly cropped.
      if (top - bottom < pageHeightPt * 0.1) return null;
      return { bottom, top };
    } catch {
      return null;
    }
  }

  // Letterhead, first pass — runs before everything else, and before
  // `pdfPages` below is captured, because Push Down mode can REPLACE a
  // target page's underlying PDFPage object (see applyLetterheadToPage()),
  // which would leave a `pdfPages` array grabbed earlier pointing at
  // stale/orphaned pages for every pass that runs after it.
  //
  // Push Down works by treating the page's own pre-existing content as one
  // atomic block via pdf-lib's embedPage/drawPage — not true per-paragraph
  // reflow, which no tool can do reliably for an arbitrary PDF. By default
  // (no usable transparency in the letterhead image — see
  // contentBands.js's `bands === null` case) the whole block is shifted
  // down by the letterhead's full height, reserved as one band at the
  // page's top edge — the right behavior for a plain header graphic. When
  // the image has a real transparent gap (a bordered design with header
  // art on top and footer art at the bottom, meant to frame the actual
  // letter content), only the header's real height is reserved at the top
  // and the footer's real height at the bottom, so content lands in the
  // gap between them instead of being squeezed under the whole image.
  // Either way, if shrinkToFit is on (the default), the block is scaled
  // down just enough to still fit in whatever space remains so nothing is
  // lost; with it off, content already close to the bottom of the page can
  // be pushed past the page edge — disclosed in the Properties panel, not
  // silently swallowed. Other placed objects (text, stamps, page
  // numbers, ...) are NOT part of this shifted block; they keep their own
  // position regardless of a letterhead's mode.
  const letterheadObjects = objects.filter((o) => o.type === 'letterhead');
  for (const o of letterheadObjects) {
    if (!o.src) continue;
    const embedded = await embedImage(o.src);
    const targetPages = resolveTargetPages(o.pagesRule, o.customRange, o.page, pdfDoc.getPageCount());
    const wPt = o.w / RENDER_SCALE;
    const hPt = o.h / RENDER_SCALE;
    const pdfX = o.x / RENDER_SCALE;
    // Computed once per letterhead object (not per target page) — a
    // bordered design (header art + footer art + transparent middle) only
    // reserves its real header/footer heights as bands instead of its
    // whole bounding box, so content lands in the transparent gap between
    // them instead of being squeezed under the entire image. A plain,
    // non-transparent header image (or one with no real gap) falls back to
    // `bands === null`, which keeps the original single-band behavior. Only
    // needed in 'auto' mode — a 'manual' letterhead uses the user's own
    // typed/dragged numbers instead and skips this detection entirely.
    const bands = o.mode === 'pushDown' && o.bandMode !== 'manual' ? await detectContentBands(o.src) : null;

    for (const pageIdx of targetPages) {
      const pageInfo = pagesInfo[pageIdx];
      if (!pageInfo) continue;

      if (o.mode === 'pushDown') {
        const originalPage = pdfDoc.getPage(pageIdx);
        const { width: pageWidthPt, height: pageHeightPt } = originalPage.getSize();
        // A full-page bordered letterhead is designed to span exactly one
        // page's height, with header art at the top and footer art at the
        // bottom. If it's been placed taller than the actual page, drawing
        // it at that full height pushes its bottom portion (often the
        // footer) past the page's bottom edge, where it simply isn't part
        // of the visible page at all — reserving a footer band for art
        // nobody can see both wastes space AND fails to protect what's
        // actually shown. Scaling it down (preserving aspect ratio, kept
        // centered on the same horizontal midpoint) so it fits within the
        // page keeps the whole design visible and keeps the reserved bands
        // proportional to what's really on the page, instead of inflating
        // with however oversized the placement happens to be.
        let effWPt = wPt;
        let effHPt = hPt;
        let effPdfX = pdfX;
        if (effHPt > pageHeightPt) {
          const fitScale = pageHeightPt / effHPt;
          const centerX = pdfX + wPt / 2;
          effHPt = pageHeightPt;
          effWPt = wPt * fitScale;
          effPdfX = centerX - effWPt / 2;
        }
        const effHPx = effHPt * RENDER_SCALE;
        let contentBoundsPt = await detectTextContentBoundsPt(pageIdx, pageHeightPt);
        // The cropped embed is attempted first, but never trusted blindly —
        // if pdf-lib rejects the bounds, or silently hands back something
        // degenerate for a PDF whose structure this detection didn't
        // anticipate, falling back to embedding the FULL page (the always-
        // safe, previously-shipped behavior) guarantees the letter's
        // content is never the thing that goes missing.
        let embeddedOriginal;
        try {
          embeddedOriginal = contentBoundsPt
            ? await pdfDoc.embedPage(originalPage, { left: 0, right: pageWidthPt, bottom: contentBoundsPt.bottom, top: contentBoundsPt.top })
            : await pdfDoc.embedPage(originalPage);
        } catch {
          contentBoundsPt = null;
          embeddedOriginal = await pdfDoc.embedPage(originalPage);
        }
        const contentHeightPt = contentBoundsPt ? contentBoundsPt.top - contentBoundsPt.bottom : pageHeightPt;
        const newPage = pdfDoc.insertPage(pageIdx, [pageWidthPt, pageHeightPt]);
        const pageHeightPx = pageHeightPt * RENDER_SCALE;
        // 'manual' mode uses the user's own typed/dragged reservation
        // (Stage.js's draggable guides / PropertiesPanel's number fields)
        // instead of detecting it from the image — an escape hatch for
        // designs (or placements) where auto-detection doesn't land well.
        // Both paths still go through the same shared floor below (see
        // contentBands.js) so a careless manual value can't zero out the
        // content either. bands' heights are measured in the letterhead
        // IMAGE's own natural pixel space, which only matches page-space px
        // 1:1 if the object happens to be placed at its native size —
        // computeAutoBandsPx scales by effHPx (how tall it's actually being
        // drawn, already capped to the page above) to keep the reserved
        // bands matching what's really on the page.
        const { topPx, bottomPx } = o.bandMode === 'manual'
          ? applyMinContentFloorPx(Math.max(0, o.manualTopPx || 0), Math.max(0, o.manualBottomPx || 0), pageHeightPx)
          : computeAutoBandsPx({ bands, effHPx, pageHeightPx });
        const topPt = topPx / RENDER_SCALE;
        const bottomPt = bottomPx / RENDER_SCALE;
        const availableHeightPt = Math.max(0, pageHeightPt - topPt - bottomPt);

        if (o.shrinkToFit !== false && pageHeightPt > 0 && contentHeightPt > 0) {
          // Capped at 1 — cropping out the page's own margins above means
          // there's usually already room to fit at full, un-shrunk size;
          // never blow the text up past its real size; the same cap keeps
          // the plain-page fallback (contentBoundsPt === null) exactly as
          // it always scaled before this cropping existed.
          const scale = Math.min(1, availableHeightPt / contentHeightPt);
          const drawnWidth = pageWidthPt * scale;
          const drawnHeight = contentHeightPt * scale;
          // Centered in the leftover vertical space (if the content, even
          // at full size, doesn't fill the whole reserved band) rather than
          // jammed against the bottom — reads as intentional, balanced
          // margins instead of the content floating arbitrarily.
          newPage.drawPage(embeddedOriginal, {
            x: (pageWidthPt - drawnWidth) / 2,
            y: bottomPt + (availableHeightPt - drawnHeight) / 2,
            width: drawnWidth, height: drawnHeight,
          });
        } else {
          newPage.drawPage(embeddedOriginal, { x: 0, y: pageHeightPt - topPt - contentHeightPt, width: pageWidthPt, height: contentHeightPt });
        }

        newPage.drawImage(embedded, { x: effPdfX, y: pageHeightPt - effHPt, width: effWPt, height: effHPt, opacity: o.opacity ?? 1 });
        pdfDoc.removePage(pageIdx + 1); // the original page, now shifted one index later
      } else {
        const pdfPage = pdfDoc.getPage(pageIdx);
        const pdfBottomY = (pageInfo.height - (o.y + o.h)) / RENDER_SCALE;
        if (o.solidBackground) {
          const bg = hexToRgbFractions(o.backgroundColor);
          pdfPage.drawRectangle({ x: pdfX, y: pdfBottomY, width: wPt, height: hPt, color: rgb(bg.r, bg.g, bg.b) });
        }
        pdfPage.drawImage(embedded, { x: pdfX, y: pdfBottomY, width: wPt, height: hPt, opacity: o.opacity ?? 1 });
      }
    }
  }

  const pdfPages = pdfDoc.getPages();

  for (const o of objects) {
    if (o.type === 'pageNumber' || o.type === 'letterhead' || o.type === 'watermark' || o.type === 'footer' || o.type === 'qrcode') continue; // handled separately — letterhead above, the rest below (all can span many pages)
    const pdfPage = pdfPages[o.page];
    if (!pdfPage) continue;
    const pageInfoForObject = pagesInfo[o.page];
    if (!pageInfoForObject) continue; // this object's page doesn't exist in this batch file — skip rather than crash
    const { height: pageHeightPx } = pageInfoForObject;
    const pdfX = o.x / RENDER_SCALE;
    const wPt = o.w / RENDER_SCALE;
    const hPt = o.h / RENDER_SCALE;
    const pdfTopY = (pageHeightPx - o.y) / RENDER_SCALE;
    const pdfBottomY = pdfTopY - hPt;

    if (o.type === 'text') {
      if (!o.text.trim()) continue;

      if (o.background || o.borderWidth > 0) {
        const bgColor = hexToRgbFractions(o.background);
        const borderColorFractions = hexToRgbFractions(o.borderColor);
        pdfPage.drawRectangle({
          x: pdfX, y: pdfBottomY, width: wPt, height: hPt,
          ...(o.background ? { color: rgb(bgColor.r, bgColor.g, bgColor.b) } : {}),
          ...(o.borderWidth > 0 ? { borderColor: rgb(borderColorFractions.r, borderColorFractions.g, borderColorFractions.b), borderWidth: Math.max(0.5, o.borderWidth / RENDER_SCALE) } : {}),
        });
      }

      const font = await embedFor(o);
      const sizePt = o.fontSize / RENDER_SCALE;
      const baselineFromTopPx = o.h * 0.5 + o.fontSize * 0.32;
      let xPx = o.x;
      const widthPx = measureTextWidthPagePx(font, o.text, o.fontSize, RENDER_SCALE);
      if (o.align === 'center') xPx = o.x + (o.w - widthPx) / 2;
      else if (o.align === 'right') xPx = o.x + o.w - widthPx;
      const { r, g, b } = hexToRgbFractions(o.color);
      const textX = xPx / RENDER_SCALE;
      const textY = (pageHeightPx - (o.y + baselineFromTopPx)) / RENDER_SCALE;
      pdfPage.drawText(o.text, {
        x: textX, y: textY, size: sizePt, font, color: rgb(r, g, b),
        opacity: o.opacity ?? 1, rotate: degrees(o.rotation || 0),
      });

      if (o.underline) {
        const underlineY = textY - sizePt * 0.08;
        const p1 = { x: textX, y: underlineY };
        const p2 = { x: textX + widthPx / RENDER_SCALE, y: underlineY };
        const angle = o.rotation || 0;
        const start = angle ? rotatePoint(textX, textY, p1.x, p1.y, angle) : p1;
        const end = angle ? rotatePoint(textX, textY, p2.x, p2.y, angle) : p2;
        pdfPage.drawLine({ start, end, thickness: Math.max(0.5, sizePt * 0.05), color: rgb(r, g, b), opacity: o.opacity ?? 1 });
      }
    } else if (o.type === 'image' || o.type === 'signature') {
      if (!o.src) continue;
      const embedded = await embedImage(o.src);
      pdfPage.drawImage(embedded, { x: pdfX, y: pdfBottomY, width: wPt, height: hPt, opacity: o.opacity ?? 1, rotate: degrees(o.rotation || 0) });
    } else if (o.type === 'shape') {
      const strokeFractions = hexToRgbFractions(o.color);
      const strokeColor = rgb(strokeFractions.r, strokeFractions.g, strokeFractions.b);
      const strokeWidthPt = Math.max(0.5, o.borderWidth / RENDER_SCALE);
      const fillFractions = o.fillColor ? hexToRgbFractions(o.fillColor) : null;
      const cx = pdfX + wPt / 2;
      const cy = pdfBottomY + hPt / 2;
      const angle = o.rotation || 0;

      if (o.shapeKind === 'line') {
        const half = rotateVector(wPt / 2, 0, angle);
        pdfPage.drawLine({
          start: { x: cx - half.x, y: cy - half.y }, end: { x: cx + half.x, y: cy + half.y },
          thickness: strokeWidthPt, color: strokeColor, opacity: o.opacity ?? 1,
        });
      } else if (o.shapeKind === 'ellipse') {
        pdfPage.drawEllipse({
          x: cx, y: cy, xScale: wPt / 2, yScale: hPt / 2, rotate: degrees(angle),
          ...(fillFractions ? { color: rgb(fillFractions.r, fillFractions.g, fillFractions.b) } : {}),
          borderColor: strokeColor, borderWidth: strokeWidthPt, opacity: o.opacity ?? 1,
        });
      } else {
        const halfVec = rotateVector(wPt / 2, hPt / 2, angle);
        pdfPage.drawRectangle({
          x: cx - halfVec.x, y: cy - halfVec.y, width: wPt, height: hPt, rotate: degrees(angle),
          ...(fillFractions ? { color: rgb(fillFractions.r, fillFractions.g, fillFractions.b) } : {}),
          borderColor: strokeColor, borderWidth: strokeWidthPt, opacity: o.opacity ?? 1,
        });
      }
    } else if (o.type === 'stamp') {
      const { r, g, b } = hexToRgbFractions(o.color);
      const stampColor = rgb(r, g, b);
      const strokeWidthPt = Math.max(0.5, o.borderWidth / RENDER_SCALE);
      const cx = pdfX + wPt / 2;
      const cy = pdfBottomY + hPt / 2;
      const angle = o.rotation || 0;
      const halfVec = rotateVector(wPt / 2, hPt / 2, angle);
      pdfPage.drawRectangle({
        x: cx - halfVec.x, y: cy - halfVec.y, width: wPt, height: hPt, rotate: degrees(angle),
        borderColor: stampColor, borderWidth: strokeWidthPt, opacity: o.opacity ?? 1,
      });

      const font = await embedFor({ fontFamily: 'sans', bold: true, italic: false });
      const sizePt = o.fontSize / RENDER_SCALE;
      const widthPx = measureTextWidthPagePx(font, o.label, o.fontSize, RENDER_SCALE);
      const baselineFromTopPx = o.h * 0.5 + o.fontSize * 0.32;
      const textX = (o.x + (o.w - widthPx) / 2) / RENDER_SCALE;
      const textY = (pageHeightPx - (o.y + baselineFromTopPx)) / RENDER_SCALE;
      const anchor = angle ? rotatePoint(cx, cy, textX, textY, angle) : { x: textX, y: textY };
      pdfPage.drawText(o.label, {
        x: anchor.x, y: anchor.y, size: sizePt, font, color: stampColor,
        opacity: o.opacity ?? 1, rotate: degrees(angle),
      });
    }
  }

  // Page Numbers, second pass — one object can apply to many pages, so
  // it's drawn once per matching page here rather than in the main
  // per-object loop above, using each target page's own number/height.
  const pageNumberObjects = objects.filter((o) => o.type === 'pageNumber');
  if (pageNumberObjects.length) {
    const plainFont = await embedFor({ fontFamily: 'sans', bold: false, italic: false });
    for (const o of pageNumberObjects) {
      const targetPages = resolveTargetPages(o.pagesRule, o.customRange, o.page, pdfPages.length);
      const { r, g, b } = hexToRgbFractions(o.color);
      for (const pageIdx of targetPages) {
        const pdfPage = pdfPages[pageIdx];
        const pageInfo = pagesInfo[pageIdx];
        if (!pdfPage || !pageInfo) continue;
        const text = formatPageNumberText(o.format, pageIdx + 1, pdfPages.length);
        const sizePt = o.fontSize / RENDER_SCALE;
        const widthPx = measureTextWidthPagePx(plainFont, text, o.fontSize, RENDER_SCALE);
        let xPx = o.x;
        if (o.align === 'center') xPx = o.x + (o.w - widthPx) / 2;
        else if (o.align === 'right') xPx = o.x + o.w - widthPx;
        const baselineFromTopPx = o.h * 0.5 + o.fontSize * 0.32;
        pdfPage.drawText(text, {
          x: xPx / RENDER_SCALE,
          y: (pageInfo.height - (o.y + baselineFromTopPx)) / RENDER_SCALE,
          size: sizePt, font: plainFont, color: rgb(r, g, b), opacity: o.opacity ?? 1,
        });
      }
    }
  }

  // Watermark, third pass — a rule object like Page Numbers:
  // the object's own x/y/w/h (wherever it was dragged/resized/rotated)
  // is stamped identically onto every target page, using the exact same
  // rotation-anchor math as text.js's export branch above.
  const watermarkObjects = objects.filter((o) => o.type === 'watermark');
  if (watermarkObjects.length) {
    const boldFont = await embedFor({ fontFamily: 'sans', bold: true, italic: false });
    for (const o of watermarkObjects) {
      if (!o.text.trim()) continue;
      const targetPages = resolveTargetPages(o.pagesRule, o.customRange, o.page, pdfPages.length);
      const { r, g, b } = hexToRgbFractions(o.color);
      const sizePt = o.fontSize / RENDER_SCALE;
      const widthPx = measureTextWidthPagePx(boldFont, o.text, o.fontSize, RENDER_SCALE);
      const xPx = o.x + (o.w - widthPx) / 2;
      const baselineFromTopPx = o.h * 0.5 + o.fontSize * 0.32;
      const angle = o.rotation || 0;
      for (const pageIdx of targetPages) {
        const pdfPage = pdfPages[pageIdx];
        const pageInfo = pagesInfo[pageIdx];
        if (!pdfPage || !pageInfo) continue;
        const textX = xPx / RENDER_SCALE;
        const textY = (pageInfo.height - (o.y + baselineFromTopPx)) / RENDER_SCALE;
        const cx = (o.x + o.w / 2) / RENDER_SCALE;
        const cy = (pageInfo.height - (o.y + o.h / 2)) / RENDER_SCALE;
        const anchor = angle ? rotatePoint(cx, cy, textX, textY, angle) : { x: textX, y: textY };
        pdfPage.drawText(o.text, {
          x: anchor.x, y: anchor.y, size: sizePt, font: boldFont, color: rgb(r, g, b),
          opacity: o.opacity ?? 1, rotate: degrees(angle),
        });
      }
    }
  }

  // Footer, fourth pass — a rule object like Page Numbers, but with
  // user-authored text (optionally combined with a live page-number
  // suffix and a divider line) rather than Page Numbers' fixed format.
  const footerObjects = objects.filter((o) => o.type === 'footer');
  if (footerObjects.length) {
    const plainFont = await embedFor({ fontFamily: 'sans', bold: false, italic: false });
    for (const o of footerObjects) {
      const targetPages = resolveTargetPages(o.pagesRule, o.customRange, o.page, pdfPages.length);
      const { r, g, b } = hexToRgbFractions(o.color);
      const sizePt = o.fontSize / RENDER_SCALE;
      const baselineFromTopPx = o.h * 0.5 + o.fontSize * 0.32;
      for (const pageIdx of targetPages) {
        const pdfPage = pdfPages[pageIdx];
        const pageInfo = pagesInfo[pageIdx];
        if (!pdfPage || !pageInfo) continue;
        const text = buildFooterText(o, pageIdx + 1, pdfPages.length);
        if (!text) continue;
        const widthPx = measureTextWidthPagePx(plainFont, text, o.fontSize, RENDER_SCALE);
        let xPx = o.x;
        if (o.align === 'center') xPx = o.x + (o.w - widthPx) / 2;
        else if (o.align === 'right') xPx = o.x + o.w - widthPx;
        const textY = (pageInfo.height - (o.y + baselineFromTopPx)) / RENDER_SCALE;
        pdfPage.drawText(text, {
          x: xPx / RENDER_SCALE, y: textY, size: sizePt, font: plainFont,
          color: rgb(r, g, b), opacity: o.opacity ?? 1,
        });
        if (o.showDivider) {
          const dividerY = textY + sizePt * 1.35;
          pdfPage.drawLine({
            start: { x: o.x / RENDER_SCALE, y: dividerY },
            end: { x: (o.x + o.w) / RENDER_SCALE, y: dividerY },
            thickness: 0.5, color: rgb(r, g, b), opacity: (o.opacity ?? 1) * 0.4,
          });
        }
      }
    }
  }

  // QR Code, fifth pass — a rule object like Page Numbers/Watermark/Footer:
  // the same fixed x/y/w/h is stamped onto every target page — a QR code
  // is small enough that a consistent, unconditional placement is the
  // sensible default.
  const qrCodeObjects = objects.filter((o) => o.type === 'qrcode');
  for (const o of qrCodeObjects) {
    if (!o.dataUrl) continue;
    const embedded = await embedImage(o.dataUrl);
    const targetPages = resolveTargetPages(o.pagesRule, o.customRange, o.page, pdfPages.length);
    const wPt = o.w / RENDER_SCALE;
    const hPt = o.h / RENDER_SCALE;
    const pdfX = o.x / RENDER_SCALE;
    for (const pageIdx of targetPages) {
      const pdfPage = pdfPages[pageIdx];
      const pageInfo = pagesInfo[pageIdx];
      if (!pdfPage || !pageInfo) continue;
      const pdfBottomY = (pageInfo.height - (o.y + o.h)) / RENDER_SCALE;
      pdfPage.drawImage(embedded, { x: pdfX, y: pdfBottomY, width: wPt, height: hPt, opacity: o.opacity ?? 1 });
    }
  }

  const bytes = await pdfDoc.save();
  return { bytes };
}
