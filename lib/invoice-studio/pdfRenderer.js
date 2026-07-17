// True vector/text PDF rendering via pdf-lib — deliberately NOT a
// screenshot. This module's only job is to draw already-computed element
// positions (the output of recomputeDynamicLayout) onto a real PDF page;
// it does not recompute any layout itself, matching the "renderer receives
// computed positions" architecture. PNG/JPG export is a separate, simpler
// path (screenshot-based) — this file is the PDF-specific, professional
// "master output" path.
//
// Coordinate conversion: CANVAS_W/CANVAS_H are deliberately real A4 at
// 96dpi (794x1123px). PDF points are A4 at 72dpi (595x842pt). Since both
// represent the exact same physical A4 sheet, the conversion is a single
// exact factor: 72/96 = 0.75. No approximation, no separate X/Y scale
// needed.
//
// Font limitation, stated plainly rather than hidden: pdf-lib's built-in
// StandardFonts cover Helvetica/Times/Courier only — not the actual
// Poppins/Inter/Georgia/Caveat used on screen. Matching those exactly
// would need real font-file embedding via @pdf-lib/fontkit, a new
// dependency and font-asset pipeline this pass does not add. Helvetica
// (sans) and Times-Roman (serif) are used as the closest standard
// approximations; a typed signature uses Helvetica-Oblique, which will
// not look like the on-screen cursive Caveat font.

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { CANVAS_W, CANVAS_H } from './constants';
import { ALL_PAYMENT_METHODS } from './constants';

// formatMoney() (used everywhere else in the app) embeds the actual
// currency SYMBOL (e.g. "₦" for Naira) via Intl.NumberFormat. pdf-lib's
// standard fonts (Helvetica etc.) can only render WinAnsi-encoded
// characters — the Naira symbol is outside that set entirely, and asking
// page.drawText() to draw it throws an error. That's the actual, confirmed
// cause of the table cutting off mid-row: the crash happened the instant
// it tried to draw a price. This formatter uses the ISO code instead
// ("NGN 85,000.00") — always plain ASCII letters, safe for any standard
// font, regardless of which currency is selected.
function pdfFormatMoney(amount, code) {
  const numeric = (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${code} ${numeric}`;
}

const PT = 0.75; // canvas-px -> pdf-pt, exact for A4 96dpi -> 72dpi
const PAGE_W = CANVAS_W * PT;
const PAGE_H = CANVAS_H * PT;

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// "Prime Tech Digital" -> "PT", "Convertam" -> "C" — kept identical to the
// on-screen Logo fallback so the PDF matches what the preview actually
// decided to show when there's no uploaded logo.
function companyAbbreviation(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

async function embedImageAuto(pdfDoc, dataUrl) {
  if (!dataUrl) return null;
  try {
    const isPng = dataUrl.startsWith('data:image/png');
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
    return isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  } catch {
    return null; // an unsupported/corrupt image should never block the rest of the PDF
  }
}

export async function renderInvoiceToPdf(elements, pdfCtx) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const isSerif = (name) => name && name.startsWith('Georgia');
  const headFont = isSerif(pdfCtx.headingFontName) ? serifBold : bold;
  const headFontRegular = isSerif(pdfCtx.headingFontName) ? serif : font;
  const bodyFont = font; // body copy stays sans-serif regardless, matching the on-screen default in every template

  const brandPrimary = hexToRgb(pdfCtx.brandPrimary);
  const brandSecondary = hexToRgb(pdfCtx.brandSecondary);
  const brandAccent = hexToRgb(pdfCtx.brandAccent);
  const dark = rgb(0.043, 0.09, 0.145);
  const gray = rgb(0.533, 0.557, 0.627);
  const lightGray = rgb(0.965, 0.969, 0.976);
  const white = rgb(1, 1, 1);
  const divider = rgb(0.914, 0.922, 0.937);

  const byId = Object.fromEntries(elements.map((e) => [e.id, e]));
  const letterheadActive = !!(byId.letterhead && byId.letterhead.visible);
  const hideBecauseLetterhead = new Set(['logo', 'companyText', 'contactInfo', 'accentBar']);

  // --- coordinate helpers -----------------------------------------------
  const px = (v) => v * PT;
  // Converts a canvas-space top-left box into a PDF-space bottom-left origin
  const boxY = (canvasY, canvasH) => PAGE_H - px(canvasY) - px(canvasH);

  function drawRect(x, y, w, h, color, opacity = 1) {
    page.drawRectangle({ x: px(x), y: boxY(y, h), width: px(w), height: px(h), color, opacity });
  }
  function drawLine(x1, y1, x2, y2, color, thickness = 1) {
    page.drawLine({ start: { x: px(x1), y: PAGE_H - px(y1) }, end: { x: px(x2), y: PAGE_H - px(y2) }, thickness, color });
  }
  // y here is the visual TOP of the text line, matching how canvas
  // positioning is authored — converted to pdf-lib's baseline-based origin.
  function drawText(text, x, y, { size = 10, f = bodyFont, color = dark, align = 'left', maxWidth } = {}) {
    if (!text) return;
    const str = String(text);
    const width = f.widthOfTextAtSize(str, size);
    let drawX = px(x);
    if (align === 'right') drawX = px(x) - width;
    if (align === 'center') drawX = px(x) - width / 2;
    page.drawText(str, { x: drawX, y: PAGE_H - px(y) - size * 0.8, size, font: f, color, maxWidth: maxWidth ? px(maxWidth) : undefined });
  }

  // --- per-kind drawing ----------------------------------------------------
  async function drawLogo(el) {
    const embedded = await embedImageAuto(pdfDoc, el.src);
    if (embedded) {
      page.drawImage(embedded, { x: px(el.x), y: boxY(el.y, el.h), width: px(el.w), height: px(el.h) });
      return;
    }
    // No uploaded logo — draw the same initials badge the live preview
    // falls back to, so the PDF matches what's actually shown on screen.
    const cx = px(el.x) + px(el.w) / 2, cy = boxY(el.y, el.h) + px(el.h) / 2;
    page.drawEllipse({ x: cx, y: cy, xScale: px(el.w) / 2, yScale: px(el.h) / 2, color: brandPrimary });
    const label = companyAbbreviation(pdfCtx.companyName);
    const size = px(el.h) * 0.4;
    const w = headFont.widthOfTextAtSize(label, size);
    page.drawText(label, { x: cx - w / 2, y: cy - size * 0.36, size, font: headFont, color: white });
  }

  function drawCompanyText(el) {
    drawText(el.name, el.x, el.y, { size: 17, f: headFont, color: el.onDark ? white : dark, align: el.center ? 'center' : 'left' });
    if (el.tagline) drawText(el.tagline, el.x, el.y + 20, { size: 10, f: bodyFont, color: el.onDark ? rgb(1, 1, 1) : brandAccent, align: el.center ? 'center' : 'left' });
  }

  function drawContactInfo(el) {
    const align = el.center ? 'center' : 'right';
    const color = el.onDark ? rgb(0.9, 0.9, 0.92) : gray;
    const lines = [el.phone, el.email, el.website, el.address].filter(Boolean);
    const xAt = el.center ? el.x + el.w / 2 : el.x + el.w;
    lines.forEach((line, i) => drawText(line, xAt, el.y + i * 15, { size: 9, color, align }));
  }

  function drawBar(el) {
    const color = el.color === 'divider' ? divider : el.color === 'secondary' ? brandSecondary : el.color === 'accent' ? brandAccent : brandPrimary;
    drawRect(el.x, el.y, el.w, el.h, color);
  }

  function drawShape(el) {
    if (el.variant === 'card') { drawRect(el.x, el.y, el.w, el.h, rgb(0.984, 0.988, 0.992)); return; }
    drawRect(el.x, el.y, el.w, el.h, el.color === 'secondary' ? brandSecondary : brandPrimary);
  }

  function drawBillTo(el) {
    drawText('BILLED TO', el.x, el.y, { size: 8, f: bold, color: brandAccent });
    drawText(el.clientName, el.x, el.y + 15, { size: 13, f: headFont, color: dark });
    let y = el.y + 33;
    if (el.clientAddress) { drawText(el.clientAddress, el.x, y, { size: 9, color: gray, maxWidth: el.w }); y += 13; }
    if (el.clientPhone) drawText(el.clientPhone, el.x, y, { size: 9, color: gray });
  }

  function drawMeta(el) {
    drawText('INVOICE', el.x + el.w, el.y, { size: 20, f: headFont, color: dark, align: 'right' });
    let y = el.y + 34;
    el.rows.forEach((r) => {
      drawText(r.label, el.x, y, { size: 9, color: gray });
      drawText(r.value, el.x + el.w, y, { size: 10, f: bold, color: dark, align: 'right' });
      y += 17;
    });
  }

  function drawTable(el) {
    const headerColor = el.headerColor === 'secondary' ? brandSecondary : brandPrimary;
    const showImages = el.showImages && el.rows.some((r) => r.img);
    // Column x-offsets within the table, matching the on-screen grid's
    // relative proportions (#, [image], description, qty, rate, vat, amount).
    const colDesc = showImages ? 76 : 32;
    const colQty = el.w - 246, colRate = el.w - 196, colVat = el.w - 106, colAmt = el.w;

    drawRect(el.x, el.y, el.w, TABLE_HEADER_H_LOCAL, headerColor);
    const headY = el.y + 13;
    drawText('#', el.x + 8, headY, { size: 9, f: bold, color: white });
    drawText('DESCRIPTION', el.x + colDesc, headY, { size: 9, f: bold, color: white });
    drawText('QTY', el.x + colQty, headY, { size: 9, f: bold, color: white, align: 'right' });
    drawText('RATE', el.x + colRate, headY, { size: 9, f: bold, color: white, align: 'right' });
    drawText('VAT', el.x + colVat, headY, { size: 9, f: bold, color: white, align: 'right' });
    drawText('AMOUNT', el.x + colAmt, headY, { size: 9, f: bold, color: white, align: 'right' });

    let y = el.y + TABLE_HEADER_H_LOCAL;
    el.rows.forEach((row, i) => {
      const rowH = row.desc ? ROW_H_WITH_DESC_LOCAL : ROW_H_SIMPLE_LOCAL;
      const amount = (parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0) * (1 + (parseFloat(row.vat) || 0) / 100);
      const textY = y + 16;
      drawText(String(i + 1), el.x + 8, textY, { size: 9, color: gray });
      drawText(row.name || '', el.x + colDesc, textY, { size: 10, f: bold, color: dark, maxWidth: colQty - colDesc - 10 });
      if (row.desc) drawText(row.desc, el.x + colDesc, textY + 13, { size: 8.5, color: gray, maxWidth: colQty - colDesc - 10 });
      drawText(String(row.qty ?? 0), el.x + colQty, textY, { size: 9, color: dark, align: 'right' });
      drawText(pdfFormatMoney(parseFloat(row.rate) || 0, pdfCtx.currency).replace(`${pdfCtx.currency} `, ''), el.x + colRate, textY, { size: 9, color: dark, align: 'right' });
      drawText(`${row.vat || 0}%`, el.x + colVat, textY, { size: 8.5, color: gray, align: 'right' });
      drawText(pdfFormatMoney(amount, pdfCtx.currency).replace(`${pdfCtx.currency} `, ''), el.x + colAmt, textY, { size: 9.5, f: bold, color: dark, align: 'right' });
      if (i < el.rows.length - 1) drawLine(el.x, y + rowH, el.x + el.w, y + rowH, divider, 0.5);
      y += rowH;
    });
  }

  function drawTotals(el) {
    const bg = el.bgVariant === 'tan' ? rgb(0.984, 0.953, 0.89) : el.bgVariant === 'plain' ? null : lightGray;
    if (bg) drawRect(el.x, el.y, el.w, el.h, bg);
    const t = pdfCtx.totals;
    let y = el.y + 18;
    drawText('Subtotal', el.x + 16, y, { size: 9.5, color: gray });
    drawText(pdfFormatMoney(t.subtotal, pdfCtx.currency), el.x + el.w - 16, y, { size: 9.5, color: dark, align: 'right' });
    y += 17;
    drawText('VAT', el.x + 16, y, { size: 9.5, color: gray });
    drawText(pdfFormatMoney(t.vat, pdfCtx.currency), el.x + el.w - 16, y, { size: 9.5, color: dark, align: 'right' });
    y += 17;
    if (t.discount > 0) {
      drawText('Discount', el.x + 16, y, { size: 9.5, color: gray });
      drawText(`-${pdfFormatMoney(t.discount, pdfCtx.currency)}`, el.x + el.w - 16, y, { size: 9.5, color: dark, align: 'right' });
      y += 17;
    }
    drawLine(el.x + 16, y + 4, el.x + el.w - 16, y + 4, divider, 1);
    y += 20;
    drawText('Total Due', el.x + 16, y, { size: 12, f: bold, color: el.useBrand ? brandPrimary : dark });
    drawText(pdfFormatMoney(t.total, pdfCtx.currency), el.x + el.w - 16, y, { size: 12, f: bold, color: el.useBrand ? brandPrimary : dark, align: 'right' });
  }

  function drawWords(el) {
    drawText('TOTAL IN WORDS', el.x, el.y, { size: 8, color: gray });
    drawText(pdfCtx.wordsText, el.x, el.y + 15, { size: 10.5, f: headFont, color: dark, maxWidth: el.w });
  }

  function drawNotes(el) {
    if (!el.content) return;
    drawText('NOTES', el.x, el.y, { size: 8, f: bold, color: gray });
    drawText(el.content, el.x, el.y + 13, { size: 9, color: gray, maxWidth: el.w });
  }

  function drawPayment(el) {
    drawText('PAYMENT METHODS', el.x, el.y, { size: 8, f: bold, color: brandAccent });
    let y = el.y + 15;
    (el.methods || []).forEach((m) => { drawText(`•  ${m}`, el.x, y, { size: 9.5, color: dark }); y += 15; });
  }

  function drawBank(el) {
    drawText('BANK DETAILS', el.x, el.y, { size: 8, f: bold, color: brandAccent });
    let y = el.y + 15;
    el.rows.forEach((r) => {
      drawText(r.k, el.x, y, { size: 8.5, color: gray });
      drawText(r.v, el.x + el.w, y, { size: 8.5, f: bold, color: dark, align: 'right' });
      y += 14;
    });
  }

  // Signature draws ABOVE approval (name/title), matching the same visual
  // order the live preview and layout engine already compute.
  async function drawSignature(el) {
    if ((el.mode === 'typed' || !el.mode) && el.text) {
      drawText(el.text, el.x, el.y + el.h * 0.55, { size: 22, f: oblique, color: dark });
    } else if (el.src) {
      const embedded = await embedImageAuto(pdfDoc, el.src);
      if (embedded) page.drawImage(embedded, { x: px(el.x), y: boxY(el.y, el.h) + px(el.h) * 0.15, width: px(el.w) * 0.7, height: px(el.h) * 0.7 });
    }
    drawLine(el.x, el.y + el.h, el.x + el.w, el.y + el.h, rgb(0.8, 0.82, 0.85), 1);
  }

  function drawApproval(el) {
    drawText('APPROVED BY', el.x, el.y, { size: 8, color: gray });
    drawText(el.name, el.x, el.y + 14, { size: 11, f: headFont, color: dark });
    drawText(el.role, el.x, el.y + 28, { size: 9.5, color: gray });
  }

  async function drawStamp(el) {
    const embedded = await embedImageAuto(pdfDoc, el.src);
    if (!embedded) return;
    page.drawImage(embedded, { x: px(el.x), y: boxY(el.y, el.h), width: px(el.w), height: px(el.h), opacity: (el.opacity ?? 100) / 100 });
  }

  async function drawQr(el) {
    const embedded = await embedImageAuto(pdfDoc, el.src);
    if (embedded) page.drawImage(embedded, { x: px(el.x), y: boxY(el.y, el.h), width: px(el.w), height: px(el.h) });
  }

  function drawFooter(el) {
    const color = el.color === 'secondary' ? brandSecondary : brandPrimary;
    drawRect(el.x, el.y, el.w, el.h, color);
    drawText(el.content, el.x + 24, el.y + el.h / 2 - 5, { size: 11, f: bold, color: white });
    drawText(pdfCtx.pageLabel || 'Page 1 of 1', el.x + el.w - 24, el.y + el.h / 2 - 5, { size: 9.5, color: rgb(1, 1, 1), align: 'right' });
  }

  function drawWatermark(el) {
    const size = px(el.w) * 0.16;
    page.drawText(el.content, {
      x: px(el.x) + px(el.w) / 2 - headFont.widthOfTextAtSize(el.content, size) / 2,
      y: PAGE_H - px(el.y) - px(el.h) / 2,
      size, font: headFont, color: dark, opacity: (el.opacity ?? 12) / 100, rotate: degrees(el.rotation ?? 0),
    });
  }

  function drawTerms(el) {
    if (!el.content) return;
    drawText('TERMS & CONDITIONS', el.x, el.y, { size: 8, f: bold, color: gray });
    drawText(el.content, el.x, el.y + 13, { size: 8.5, color: gray, maxWidth: el.w });
  }

  async function drawLetterhead(el) {
    const embedded = await embedImageAuto(pdfDoc, el.src);
    if (embedded) page.drawImage(embedded, { x: px(el.x), y: boxY(el.y, el.h), width: px(el.w), height: px(el.h) });
  }

  const TABLE_HEADER_H_LOCAL = 24, ROW_H_SIMPLE_LOCAL = 27, ROW_H_WITH_DESC_LOCAL = 36;

  // --- draw every visible element in the same order the canvas uses -----
  for (const el of elements) {
    if (!el.visible) continue;
    if (letterheadActive && hideBecauseLetterhead.has(el.id)) continue;
    // Each element draws independently — if one specific element kind hits
    // an issue, it's skipped and logged rather than failing the entire PDF.
    // A working PDF with one piece missing is always better than no PDF.
    try {
      switch (el.kind) {
        case 'letterhead': await drawLetterhead(el); break;
        case 'logo': await drawLogo(el); break;
        case 'companyText': drawCompanyText(el); break;
        case 'contactInfo': drawContactInfo(el); break;
        case 'bar': drawBar(el); break;
        case 'shape': drawShape(el); break;
        case 'billTo': drawBillTo(el); break;
        case 'meta': drawMeta(el); break;
        case 'table': drawTable(el); break;
        case 'totals': drawTotals(el); break;
        case 'words': drawWords(el); break;
        case 'notes': drawNotes(el); break;
        case 'payment': drawPayment(el); break;
        case 'bank': drawBank(el); break;
        case 'signature': await drawSignature(el); break;
        case 'approval': drawApproval(el); break;
        case 'stamp': await drawStamp(el); break;
        case 'qr': await drawQr(el); break;
        case 'footer': drawFooter(el); break;
        case 'watermark': drawWatermark(el); break;
        case 'terms': drawTerms(el); break;
        default: break;
      }
    } catch (err) {
      console.error(`PDF: skipped drawing "${el.kind}" (${el.id}) due to an error:`, err);
    }
  }

  return pdfDoc.save();
}
