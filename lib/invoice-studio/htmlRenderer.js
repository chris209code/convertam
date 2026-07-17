// Produces the HTML a headless browser turns into the real PDF. Same
// section-based document the editor renders, same style tokens - genuinely
// one shared structure, not two things to keep in sync by hand. Real
// <table> with <thead>/<tbody> for items: fixed columns can't overlap,
// descriptions wrap inside their own cell, and the browser repeats the
// header automatically if the table spans a page break during print -
// native behavior, not something built by hand here.

import { formatMoney } from './moneyFormat';
import { fontCss, GOOGLE_FONTS_HREF } from './styleTokens';

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2br(str) {
  return esc(str).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `<div>${l}</div>`).join('');
}
// Table cells use a bare number - the currency SYMBOL isn't reliably in
// every loaded web font's glyph set and can visually collide with the
// adjacent digit when a fallback font is silently substituted for it.
// Column headers already say Rate/Amount, so the currency stays implied.
function cellMoney(amount) {
  return (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function companyAbbreviation(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const PAYMENT_ICONS = { 'Bank Transfer': '🏦', POS: '💳', USSD: '📱', Cash: '💵' };
const SECTION_GAP = '22px';

function renderLetterhead(data) {
  if (!data.visible || !data.src) return '';
  return `<div><img src="${data.src}" style="width:100%;display:block;" /></div>`;
}

function renderHeader(data, s) {
  if (!data.visible) return '';
  const centered = s.headerLayout === 'centered';
  const head = fontCss(s.headingFont), body = fontCss(s.bodyFont);
  const logo = data.logoSrc
    ? `<img src="${esc(data.logoSrc)}" style="width:56px;height:56px;object-fit:contain;border-radius:${data.logoShape === 'rounded' ? '14px' : '50%'};" />`
    : `<div style="width:56px;height:56px;border-radius:${data.logoShape === 'rounded' ? '14px' : '50%'};background:${s.brandPrimary};color:#fff;display:flex;align-items:center;justify-content:center;font-family:${head};font-weight:700;font-size:22px;">${esc(companyAbbreviation(data.companyName))}</div>`;
  const company = `
    <div style="text-align:${centered ? 'center' : 'left'};">
      <div style="font-family:${head};font-weight:700;font-size:22px;color:${s.textDark};">${esc(data.companyName)}</div>
      ${data.tagline ? `<div style="font-family:${body};font-size:12.5px;color:${s.textGray};margin-top:2px;">${esc(data.tagline)}</div>` : ''}
    </div>`;
  const contactLines = [data.phone, data.email, data.website, data.address].filter(Boolean);
  const contact = `<div style="text-align:${centered ? 'center' : 'right'};">${contactLines.map((l) => `<div style="font-family:${body};font-size:12px;color:${s.textGray};line-height:1.6;">${esc(l)}</div>`).join('')}</div>`;

  const top = centered
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;">${logo}${company}${contact}</div>`
    : `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;"><div style="display:flex;gap:14px;align-items:center;">${logo}${company}</div>${contact}</div>`;

  return `<div>${top}<div style="height:3px;background:${s.brandPrimary};margin-top:18px;"></div></div>`;
}

function renderClientInfo(data, s) {
  if (!data.visible) return '';
  const head = fontCss(s.headingFont), body = fontCss(s.bodyFont);
  const metaRows = [['Invoice No.', data.invoiceNo], ['Invoice Date', data.invoiceDate], ['Due Date', data.dueDate], ['Status', data.status]]
    .map(([label, value]) => `
      <div style="display:flex;justify-content:flex-end;gap:14px;margin-top:4px;">
        <span style="font-family:${body};font-size:11.5px;color:${s.textMuted};">${esc(label)}</span>
        <span style="font-family:${body};font-size:12.5px;font-weight:600;color:${s.textDark};min-width:90px;text-align:right;">${esc(value)}</span>
      </div>`).join('');
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div>
        <div style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.06em;color:${s.brandAccent};margin-bottom:6px;">BILLED TO</div>
        <div style="font-family:${head};font-weight:600;font-size:16px;color:${s.textDark};">${esc(data.clientName)}</div>
        ${data.clientAddress ? `<div style="font-family:${body};font-size:12px;color:${s.textGray};margin-top:4px;max-width:260px;">${esc(data.clientAddress)}</div>` : ''}
        ${data.clientPhone ? `<div style="font-family:${body};font-size:12px;color:${s.textGray};">${esc(data.clientPhone)}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:${head};font-weight:700;font-size:24px;color:${s.textDark};margin-bottom:8px;">INVOICE</div>
        ${metaRows}
      </div>
    </div>`;
}

// A real HTML table — this is the entire point of the rewrite for the
// items list. Fixed <colgroup> widths mean Qty/Rate/VAT/Amount physically
// cannot overlap; descriptions wrap inside their own <td>; a <thead>
// repeats automatically on additional printed pages, native browser
// behavior for tables spanning a page break, not something built by hand.
function renderItemsTable(data, s, currency) {
  if (!data.visible) return '';
  const body = fontCss(s.bodyFont);
  const outline = s.tableHeaderStyle === 'outline';
  const showImages = data.showImages && data.rows.some((r) => r.img);
  const headCell = (label, right) => `<th style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:10px 8px;text-align:${right ? 'right' : 'left'};color:${outline ? s.brandPrimary : '#fff'};${outline ? `border-bottom:2px solid ${s.brandPrimary};` : ''}">${label}</th>`;

  const rows = data.rows.map((row, i) => {
    const qty = parseFloat(row.qty) || 0, rate = parseFloat(row.rate) || 0, vat = parseFloat(row.vat) || 0;
    const amount = qty * rate * (1 + vat / 100);
    const cellStyle = `padding:10px 8px;border-bottom:${i === data.rows.length - 1 ? 'none' : `1px solid ${s.divider}`};vertical-align:top;`;
    return `
      <tr>
        <td style="${cellStyle}font-family:${body};font-size:12px;color:${s.textMuted};">${i + 1}</td>
        ${showImages ? `<td style="${cellStyle}">${row.img ? `<img src="${row.img}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;" />` : ''}</td>` : ''}
        <td style="${cellStyle}">
          <div style="font-family:${body};font-size:13px;font-weight:600;color:${s.textDark};word-break:break-word;">${esc(row.name)}</div>
          ${row.desc ? `<div style="font-family:${body};font-size:11px;color:${s.textMuted};margin-top:2px;word-break:break-word;">${esc(row.desc)}</div>` : ''}
        </td>
        <td style="${cellStyle}font-family:${body};font-size:13px;color:${s.textDark};text-align:right;">${qty}</td>
        <td style="${cellStyle}font-family:${body};font-size:13px;color:${s.textDark};text-align:right;">${esc(cellMoney(rate))}</td>
        <td style="${cellStyle}font-family:${body};font-size:12px;color:${s.textMuted};text-align:right;">${vat}%</td>
        <td style="${cellStyle}font-family:${body};font-size:13px;font-weight:600;color:${s.textDark};text-align:right;">${esc(cellMoney(amount))}</td>
      </tr>`;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid ${outline ? s.brandPrimary : s.divider};border-radius:10px;overflow:hidden;">
      <colgroup>
        <col style="width:28px" />${showImages ? '<col style="width:44px" />' : ''}
        <col /><col style="width:55px" /><col style="width:100px" /><col style="width:60px" /><col style="width:105px" />
      </colgroup>
      <thead style="background:${outline ? '#fff' : s.brandPrimary};">
        <tr>${headCell('#')}${showImages ? headCell('') : ''}${headCell('Item / Description')}${headCell('Qty', true)}${headCell('Rate', true)}${headCell('VAT', true)}${headCell('Amount', true)}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTotals(data, s, currency, totals, wordsText) {
  if (!data.visible) return '';
  const body = fontCss(s.bodyFont), head = fontCss(s.headingFont);
  const bg = s.totalsBg === 'tan' ? '#FBF3E3' : s.totalsBg === 'plain' ? 'transparent' : '#F7F8FA';
  const line = (label, value, big) => `
    <div style="display:flex;justify-content:space-between;font-family:${body};font-size:${big ? 15 : 12.5}px;font-weight:${big ? 700 : 400};color:${big ? s.brandPrimary : s.textGray};margin-top:${big ? 10 : 6}px;${big ? `padding-top:10px;border-top:1px solid ${s.divider};` : ''}">
      <span>${label}</span><span style="color:${big ? s.brandPrimary : s.textDark};">${value}</span>
    </div>`;
  return `
    <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
      <div style="flex:1;min-width:0;">
        <div style="font-family:${body};font-size:10.5px;color:${s.textMuted};letter-spacing:.05em;text-transform:uppercase;">Total in words</div>
        <div style="font-family:${head};font-weight:600;font-size:13px;color:${s.textDark};margin-top:4px;line-height:1.5;">${esc(wordsText)}</div>
      </div>
      <div style="width:230px;flex-shrink:0;background:${bg};border-radius:10px;padding:14px 16px;">
        ${line('Subtotal', esc(formatMoney(totals.subtotal, currency)))}
        ${line('VAT', esc(formatMoney(totals.vat, currency)))}
        ${totals.discount > 0 ? line('Discount', `-${esc(formatMoney(totals.discount, currency))}`) : ''}
        ${line('Total Due', esc(formatMoney(totals.total, currency)), true)}
      </div>
    </div>`;
}

function renderNotes(data, s) {
  if (!data.visible || !data.content) return '';
  const body = fontCss(s.bodyFont);
  return `
    <div>
      <div style="font-family:${body};font-size:10.5px;font-weight:700;letter-spacing:.05em;color:${s.textMuted};text-transform:uppercase;">Notes</div>
      <div style="font-family:${body};font-size:11.5px;color:${s.textGray};margin-top:4px;line-height:1.5;">${nl2br(data.content)}</div>
    </div>`;
}

function renderPaymentBank(payment, bank, s) {
  if (!payment.visible && !bank.visible) return '';
  const body = fontCss(s.bodyFont);
  const paymentHtml = payment.visible ? `
    <div style="flex:1;">
      <div style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.05em;color:${s.brandAccent};margin-bottom:8px;">PAYMENT METHODS</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${payment.methods.map((m) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:9px;border:1px solid ${s.divider};font-family:${body};font-size:12px;color:${s.textDark};"><span>${PAYMENT_ICONS[m] || ''}</span>${esc(m)}</div>`).join('')}
      </div>
    </div>` : '';
  const bankHtml = bank.visible ? `
    <div style="flex:1;">
      <div style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.05em;color:${s.brandAccent};margin-bottom:8px;">BANK DETAILS</div>
      ${bank.rows.map((r, i) => `
        <div style="margin-top:${i === 0 ? 0 : 6}px;">
          <div style="font-family:${body};font-size:10px;color:${s.textMuted};">${esc(r.k)}</div>
          <div style="font-family:${body};font-size:12px;font-weight:600;color:${s.textDark};word-break:break-word;">${esc(r.v)}</div>
        </div>`).join('')}
    </div>` : '';
  return `<div style="display:flex;gap:32px;">${paymentHtml}${bankHtml}</div>`;
}

function renderSignature(data, s) {
  if (!data.visible) return '';
  const head = fontCss(s.headingFont), body = fontCss(s.bodyFont);
  const isTyped = data.mode === 'typed' || !data.mode;
  const mark = isTyped
    ? (data.text ? `<div style="font-family:'Caveat',cursive;font-size:26px;color:${s.textDark};">${esc(data.text)}</div>` : '')
    : (data.src ? `<img src="${data.src}" style="max-height:40px;object-fit:contain;" />` : '');
  const approval = data.approvedName ? `
    <div style="font-family:${body};font-size:10px;color:${s.textMuted};text-transform:uppercase;letter-spacing:.04em;margin-top:8px;">Approved By</div>
    <div style="font-family:${head};font-weight:600;font-size:13px;color:${s.textDark};margin-top:2px;">${esc(data.approvedName)}</div>
    <div style="font-family:${body};font-size:11.5px;color:${s.textGray};">${esc(data.approvedRole)}</div>` : '';
  return `
    <div style="display:flex;justify-content:flex-end;">
      <div style="width:200px;text-align:left;">
        <div style="min-height:40px;display:flex;align-items:flex-end;">${mark}</div>
        <div style="border-top:1.5px solid #CBD5E1;margin-top:4px;"></div>
        ${approval}
      </div>
    </div>`;
}

function renderTerms(data, s) {
  if (!data.visible || !data.content) return '';
  const body = fontCss(s.bodyFont);
  return `
    <div>
      <div style="font-family:${body};font-size:10.5px;font-weight:700;letter-spacing:.05em;color:${s.textMuted};text-transform:uppercase;">Terms &amp; Conditions</div>
      <div style="font-family:${body};font-size:10.5px;color:${s.textMuted};margin-top:4px;line-height:1.5;">${nl2br(data.content)}</div>
    </div>`;
}

function renderFooter(data, s, pageLabel) {
  const bg = s.footerStyle === 'bar' ? s.brandPrimary : 'transparent';
  const body = fontCss(s.bodyFont);
  const color = s.footerStyle === 'bar' ? '#fff' : s.textGray;
  const mutedColor = s.footerStyle === 'bar' ? 'rgba(255,255,255,.75)' : s.textMuted;
  return `
    <div style="background:${bg};padding:14px 28px;display:flex;justify-content:space-between;align-items:center;break-inside:avoid;">
      <div style="font-family:${body};font-size:13px;font-weight:600;color:${color};">${esc(data.content)}</div>
      <div style="font-family:${body};font-size:11.5px;color:${mutedColor};">${esc(pageLabel)}</div>
    </div>`;
}

export function renderInvoiceHtml(doc, s, totals, wordsText) {
  const sec = doc.sections;
  const body = `
    <div style="position:relative;width:794px;min-height:1123px;background:#fff;padding:40px;box-sizing:border-box;display:flex;flex-direction:column;">
      ${renderLetterhead(sec.letterhead)}
      <div style="margin-top:22px;">${renderHeader(sec.header, s)}</div>
      <div style="margin-top:22px;">${renderClientInfo(sec.clientInfo, s)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderItemsTable(sec.itemsTable, s, doc.currency)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderTotals(sec.totals, s, doc.currency, totals, wordsText)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderNotes(sec.notes, s)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderPaymentBank(sec.payment, sec.bank, s)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderSignature(sec.signature, s)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderTerms(sec.terms, s)}</div>
      <div style="flex:1;"></div>
      ${renderFooter(sec.footer, s, 'Page 1')}
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { break-inside: auto; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; } /* repeats on each printed page a table spans */
  @page { size: A4; margin: 0; }
</style>
</head>
<body>${body}</body>
</html>`;
}
