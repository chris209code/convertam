// Produces a complete, self-contained HTML document for the invoice —
// real flexbox layout, real web fonts, real text wrapping — matching what
// kindRenderers.js already renders on screen. This is deliberately plain
// JS string templates, not a re-import of the 'use client' React
// components, so this file has zero dependency on Next.js's client/server
// component boundary and can run safely inside a plain API route.
//
// A headless browser (Chromium via Puppeteer) turns this into the actual
// PDF. That's the entire point of this rewrite: the same rendering
// approach CV/Resume already uses successfully — one real browser engine
// as the single source of truth, not a second hand-coded implementation
// to keep in sync by hand.

import { formatMoney } from './moneyFormat';
import { ALL_PAYMENT_METHODS } from './constants';

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2br(str) {
  return esc(str).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `<div>${l}</div>`).join('');
}
// Table cells show a bare number (no currency marker at all) since the
// column header already says RATE/AMOUNT — this also sidesteps a real
// rendering bug: the raw currency symbol (e.g. "₦") isn't in the loaded
// Google Fonts' glyph set, so the browser silently substitutes a fallback
// font for just that one character, which has different metrics and
// visually collides with the adjacent digit.
function cellMoney(amount) {
  return (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAYMENT_ICON_LABEL = { 'Bank Transfer': '🏦', POS: '💳', USSD: '📱', Cash: '💵' };

function renderLogo(el, ctx) {
  if (el.src) {
    const radius = el.shape === 'rounded' ? '14px' : '6px';
    return `<img src="${el.src}" style="width:100%;height:100%;object-fit:contain;border-radius:${radius};display:block;" />`;
  }
  // Same initials-badge fallback as the live preview and PDF: first letter
  // of the first two words, or one letter for a single-word name.
  const name = (ctx.companyName || '').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length === 0 ? '' : words.length === 1 ? words[0][0].toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
  const radius = el.shape === 'rounded' ? '14px' : '50%';
  return `<div style="width:100%;height:100%;border-radius:${radius};background:${ctx.brandPrimary};display:flex;align-items:center;justify-content:center;color:#fff;font-family:${ctx.headFontCss};font-weight:700;font-size:${Math.round(el.h * 0.4)}px;">${esc(initials)}</div>`;
}

function renderCompanyText(el, ctx) {
  const align = el.center ? 'center' : 'left';
  const color = el.onDark ? '#fff' : (el.useBrand ? ctx.brandPrimary : '#0F172A');
  const taglineColor = el.onDark ? 'rgba(255,255,255,.7)' : '#8891A0';
  return `
    <div style="font-family:${ctx.headFontCss};font-weight:700;font-size:22px;color:${color};text-align:${align};">${esc(el.name)}</div>
    ${el.tagline ? `<div style="font-family:${ctx.bodyFontCss};font-size:12.5px;color:${taglineColor};margin-top:2px;text-align:${align};">${esc(el.tagline)}</div>` : ''}
  `;
}

function renderContactInfo(el, ctx) {
  const align = el.center ? 'center' : 'right';
  const color = el.onDark ? 'rgba(255,255,255,.85)' : '#475569';
  const lines = [el.phone, el.email, el.website, el.address].filter(Boolean);
  return lines.map((l) => `<div style="font-family:${ctx.bodyFontCss};font-size:12px;color:${color};text-align:${align};line-height:1.6;">${esc(l)}</div>`).join('');
}

function renderBar(el, ctx) {
  const bg = el.color === 'divider' ? '#E2E6ED' : el.color === 'secondary' ? ctx.brandSecondary : el.color === 'accent' ? ctx.brandAccent : ctx.brandPrimary;
  return `<div style="width:100%;height:100%;background:${bg};"></div>`;
}

function renderShape(el, ctx) {
  if (el.variant === 'card') return `<div style="width:100%;height:100%;background:#FBFCFD;border:1px solid #E7EAF0;border-radius:16px;"></div>`;
  const bg = el.color === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  return `<div style="width:100%;height:100%;background:${bg};"></div>`;
}

function renderBillTo(el, ctx) {
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:11px;font-weight:700;letter-spacing:.06em;color:${ctx.brandAccent};margin-bottom:6px;">BILLED TO</div>
    <div style="font-family:${ctx.headFontCss};font-weight:600;font-size:17px;color:#0F172A;">${esc(el.clientName)}</div>
    ${el.clientAddress ? `<div style="font-family:${ctx.bodyFontCss};font-size:12px;color:#64748B;margin-top:4px;">${esc(el.clientAddress)}</div>` : ''}
    ${el.clientPhone ? `<div style="font-family:${ctx.bodyFontCss};font-size:12px;color:#64748B;">${esc(el.clientPhone)}</div>` : ''}
  `;
}

function renderMeta(el, ctx) {
  const titleColor = el.useBrand === 'title' ? ctx.brandSecondary : '#0F172A';
  const rows = el.rows.map((r) => `
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:5px;">
      <span style="font-family:${ctx.bodyFontCss};font-size:11.5px;color:#8891A0;flex-shrink:0;">${esc(r.label)}</span>
      <span style="font-family:${ctx.bodyFontCss};font-size:12.5px;font-weight:600;color:#0F172A;text-align:right;">${esc(r.value)}</span>
    </div>`).join('');
  return `<div style="font-family:${ctx.headFontCss};font-weight:700;font-size:26px;color:${titleColor};text-align:right;margin-bottom:10px;">INVOICE</div>${rows}`;
}

function renderTable(el, ctx) {
  const isOutline = el.headerVariant === 'outline';
  const headerColorVal = el.headerColor === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  const showImages = el.showImages && el.rows.some((r) => r.img);
  const cols = showImages ? '30px 44px 1fr 50px 90px 70px 90px' : '30px 1fr 50px 90px 70px 90px';
  const headCells = showImages
    ? ['#', '', 'ITEM / DESCRIPTION', 'QTY', 'RATE', 'VAT', 'AMOUNT']
    : ['#', 'ITEM / DESCRIPTION', 'QTY', 'RATE', 'VAT', 'AMOUNT'];

  const headHtml = headCells.map((label, i) => {
    const isRight = i >= headCells.length - 3 && i < headCells.length;
    return `<div style="font-family:${ctx.bodyFontCss};font-size:11px;font-weight:700;letter-spacing:.04em;padding:10px 6px;text-align:${isRight ? 'right' : 'left'};color:${isOutline ? headerColorVal : '#fff'};">${esc(label)}</div>`;
  }).join('');

  const rowsHtml = el.rows.map((row, i) => {
    const qty = parseFloat(row.qty) || 0, rate = parseFloat(row.rate) || 0, vat = parseFloat(row.vat) || 0;
    const amount = qty * rate * (1 + vat / 100);
    const imgCell = showImages ? `<div>${row.img ? `<img src="${row.img}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;" />` : ''}</div>` : '';
    return `
      <div style="display:grid;grid-template-columns:${cols};align-items:center;padding:10px 6px;border-bottom:${i === el.rows.length - 1 ? 'none' : '1px solid #EEF1F5'};gap:8px;break-inside:avoid;">
        <div style="font-size:12px;color:#94A3B8;">${i + 1}</div>
        ${imgCell}
        <div style="min-width:0;">
          <div style="font-family:${ctx.bodyFontCss};font-size:13px;font-weight:600;color:#0F172A;">${esc(row.name)}</div>
          ${row.desc ? `<div style="font-family:${ctx.bodyFontCss};font-size:11px;color:#94A3B8;margin-top:2px;">${esc(row.desc)}</div>` : ''}
        </div>
        <div style="font-family:${ctx.bodyFontCss};font-size:13px;color:#334155;text-align:right;">${qty}</div>
        <div style="font-family:${ctx.bodyFontCss};font-size:13px;color:#334155;text-align:right;">${esc(cellMoney(rate))}</div>
        <div style="font-family:${ctx.bodyFontCss};font-size:12px;color:#94A3B8;text-align:right;">${vat}%</div>
        <div style="font-family:${ctx.bodyFontCss};font-size:13px;font-weight:600;color:#0F172A;text-align:right;">${esc(cellMoney(amount))}</div>
      </div>`;
  }).join('');

  return `
    <div style="width:100%;border-radius:10px;overflow:hidden;border:1px solid ${isOutline ? headerColorVal : '#EEF1F5'};">
      <div style="display:grid;grid-template-columns:${cols};align-items:center;padding:2px 6px;background:${isOutline ? '#fff' : headerColorVal};border-bottom:${isOutline ? `2px solid ${headerColorVal}` : 'none'};break-inside:avoid;">${headHtml}</div>
      ${rowsHtml}
    </div>`;
}

function renderTotals(el, ctx) {
  const bg = el.bgVariant === 'tan' ? '#FBF3E3' : el.bgVariant === 'plain' ? 'transparent' : '#F7F8FA';
  const border = el.bgVariant === 'tan' ? '1px solid #EAD9B0' : 'none';
  const t = ctx.totals;
  const line = (label, value) => `<div style="display:flex;justify-content:space-between;"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;
  return `
    <div style="width:100%;height:100%;background:${bg};border:${border};border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;font-family:${ctx.bodyFontCss};font-size:12.5px;color:#475569;break-inside:avoid;">
      ${line('Subtotal', formatMoney(t.subtotal, ctx.currency))}
      ${line('VAT', formatMoney(t.vat, ctx.currency))}
      ${t.discount > 0 ? line('Discount', `-${formatMoney(t.discount, ctx.currency)}`) : ''}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #E2E6ED;font-weight:700;font-size:15px;color:${el.useBrand ? ctx.brandPrimary : '#0F172A'};">
        <span>Total Due</span><span>${esc(formatMoney(t.total, ctx.currency))}</span>
      </div>
    </div>`;
}

function renderWords(el, ctx) {
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:11px;color:#8891A0;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Total in words</div>
    <div style="font-family:${ctx.headFontCss};font-weight:600;font-size:13px;color:#0F172A;line-height:1.5;">${esc(ctx.wordsText)}</div>`;
}

function renderNotes(el, ctx) {
  if (!el.content) return '';
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:10.5px;font-weight:700;letter-spacing:.05em;color:#8891A0;margin-bottom:4px;">Notes</div>
    <div style="font-family:${ctx.bodyFontCss};font-size:11px;color:#64748B;line-height:1.5;">${nl2br(el.content)}</div>`;
}

function renderPayment(el, ctx) {
  const items = (el.methods || []).map((m) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:9px;background:#fff;border:1px solid #E7EAF0;font-family:${ctx.bodyFontCss};font-size:12px;font-weight:500;color:#334155;">
      <span style="width:38px;height:38px;border-radius:10px;background:#F3F5F8;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">${PAYMENT_ICON_LABEL[m] || ''}</span>
      <span>${esc(m)}</span>
    </div>`).join('');
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:11px;font-weight:700;letter-spacing:.05em;color:${ctx.brandAccent};margin-bottom:8px;">PAYMENT METHODS</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">${items}</div>`;
}

function renderBank(el, ctx) {
  const rows = el.rows.map((r) => `
    <div style="margin-top:6px;font-family:${ctx.bodyFontCss};">
      <div style="color:#8891A0;font-size:10px;">${esc(r.k)}</div>
      <div style="color:#334155;font-weight:600;font-size:11.5px;word-break:break-word;">${esc(r.v)}</div>
    </div>`).join('');
  return `<div style="font-family:${ctx.bodyFontCss};font-size:11px;font-weight:700;letter-spacing:.05em;color:${ctx.brandAccent};margin-bottom:8px;">BANK DETAILS</div>${rows}`;
}

function renderApproval(el, ctx) {
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:10.5px;color:#8891A0;text-transform:uppercase;letter-spacing:.05em;">Approved By</div>
    <div style="font-family:${ctx.headFontCss};font-weight:600;font-size:14px;color:#0F172A;margin-top:3px;">${esc(el.name)}</div>
    <div style="font-family:${ctx.bodyFontCss};font-size:12px;color:#64748B;margin-top:1px;">${esc(el.role)}</div>`;
}

function renderSignature(el) {
  const isTyped = el.mode === 'typed' || !el.mode;
  let content = '';
  if (isTyped && el.text) {
    // A script font at a flat 28px can overflow a modest-width box for
    // anything longer than a short name — that's exactly what clipped the
    // final letter here. Shrinking proportionally to length, plus
    // overflow:hidden as a safety net, keeps it contained either way.
    const size = Math.max(16, Math.min(26, Math.round(340 / el.text.length)));
    content = `<div style="font-family:'Caveat',cursive;font-size:${size}px;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(el.text)}</div>`;
  } else if (!isTyped && el.src) {
    content = `<img src="${el.src}" style="height:70%;object-fit:contain;" />`;
  }
  return `${content}<div style="width:100%;border-top:1.5px solid #CBD5E1;margin-top:4px;"></div>`;
}

function renderStamp(el) {
  if (!el.src) return '';
  const radius = el.shape === 'circle' ? '9999px' : '8px';
  return `<div style="width:100%;height:100%;opacity:${(el.opacity ?? 100) / 100};"><img src="${el.src}" style="width:100%;height:100%;object-fit:contain;border-radius:${radius};" /></div>`;
}

function renderQr(el) {
  if (!el.src) return '';
  return `<img src="${el.src}" style="width:100%;height:100%;object-fit:contain;" />`;
}

function renderFooter(el, ctx) {
  const bg = el.color === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  return `
    <div style="width:100%;height:100%;background:${bg};display:flex;align-items:center;justify-content:space-between;padding:0 24px;box-sizing:border-box;">
      <div style="color:#fff;font-family:${ctx.bodyFontCss};font-size:13px;font-weight:600;">${esc(el.content)}</div>
      <div style="color:rgba(255,255,255,.75);font-family:${ctx.bodyFontCss};font-size:11.5px;">${esc(ctx.pageLabel || '')}</div>
    </div>`;
}

function renderLetterhead(el) {
  if (!el.src) return '';
  return `<img src="${el.src}" style="width:100%;height:100%;object-fit:cover;" />`;
}

function renderWatermark(el, ctx) {
  return `
    <div style="font-family:${ctx.headFontCss};font-weight:800;font-size:96px;color:#0F172A;opacity:${(el.opacity ?? 12) / 100};transform:rotate(${el.rotation ?? 0}deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;letter-spacing:.05em;">
      ${esc(el.content)}
    </div>`;
}

function renderTerms(el, ctx) {
  if (!el.content) return '';
  return `
    <div style="font-family:${ctx.bodyFontCss};font-size:10.5px;font-weight:700;letter-spacing:.05em;color:#8891A0;margin-bottom:4px;">Terms &amp; Conditions</div>
    <div style="font-family:${ctx.bodyFontCss};font-size:10.5px;color:#94A3B8;line-height:1.5;">${nl2br(el.content)}</div>`;
}

const KIND_RENDERERS_HTML = {
  letterhead: renderLetterhead, logo: renderLogo, companyText: renderCompanyText, contactInfo: renderContactInfo,
  bar: renderBar, shape: renderShape, billTo: renderBillTo, meta: renderMeta, table: renderTable, totals: renderTotals,
  words: renderWords, notes: renderNotes, payment: renderPayment, bank: renderBank, approval: renderApproval,
  signature: renderSignature, stamp: renderStamp, qr: renderQr, footer: renderFooter, watermark: renderWatermark, terms: renderTerms,
};

function fontCss(name) {
  if (name === 'Poppins') return "'Poppins', sans-serif";
  if (name === 'Inter') return "'Inter', sans-serif";
  if (name === 'Georgia') return "Georgia, serif";
  return "Arial, Helvetica, sans-serif";
}

export function renderInvoiceHtml(elements, rawCtx) {
  const ctx = { ...rawCtx, headFontCss: fontCss(rawCtx.headingFontName), bodyFontCss: fontCss(rawCtx.bodyFontName || 'Inter') };
  const letterhead = elements.find((e) => e.id === 'letterhead');
  const letterheadActive = !!(letterhead && letterhead.visible);
  const hideWhenLetterhead = new Set(['logo', 'companyText', 'contactInfo', 'accentBar']);

  const elementsHtml = elements
    .filter((el) => el.visible && !(letterheadActive && hideWhenLetterhead.has(el.id)))
    .map((el) => {
      const renderer = KIND_RENDERERS_HTML[el.kind];
      if (!renderer) return '';
      const inner = renderer(el, ctx);
      // Every element keeps its authored x/y/w/h from the layout engine —
      // this part IS still shared with the live preview, just positioned
      // via CSS instead of pdf-lib coordinates. Table rows and totals
      // additionally get break-inside:avoid at the row level (set inside
      // their own renderers above) so long tables can still flow across
      // pages without splitting a single row in half.
      return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;">${inner}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div style="position:relative;width:794px;min-height:1123px;background:#fff;">
    ${elementsHtml}
  </div>
</body>
</html>`;
}
