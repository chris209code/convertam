// Produces the HTML a headless browser turns into the real PDF. Same
// section-based document the editor renders, same style tokens - genuinely
// one shared structure, not two things to keep in sync by hand. Real
// <table> with <thead>/<tbody> for items: fixed columns can't overlap,
// descriptions wrap inside their own cell, and the browser repeats the
// header automatically if the table spans a page break during print -
// native behavior, not something built by hand here.

import { formatMoney } from './moneyFormat';
import { fontCss, GOOGLE_FONTS_HREF } from './styleTokens';
import { docTypeConfig, LOGISTICS_FIELD_LABELS, ITEM_COLUMN_DEFS } from './docTypes';

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

function renderClientInfo(data, s, docType) {
  if (!data.visible) return '';
  const config = docTypeConfig(docType);
  const head = fontCss(s.headingFont), body = fontCss(s.bodyFont);
  const metaRows = [
    [config.numberLabel, data.docNo],
    [config.dateLabel, data.docDate],
    config.secondaryDateLabel ? [config.secondaryDateLabel, data.secondaryDate] : null,
    config.statusLabel ? [config.statusLabel, data.status] : null,
  ].filter(Boolean).map(([label, value]) => `
      <div style="display:flex;justify-content:flex-end;gap:14px;margin-top:4px;">
        <span style="font-family:${body};font-size:11.5px;color:${s.textMuted};">${esc(label)}</span>
        <span style="font-family:${body};font-size:12.5px;font-weight:600;color:${s.textDark};min-width:90px;text-align:right;">${esc(value)}</span>
      </div>`).join('');
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div>
        <div style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.06em;color:${s.brandAccent};margin-bottom:6px;text-transform:uppercase;">${esc(config.partyLabel)}</div>
        <div style="font-family:${head};font-weight:600;font-size:16px;color:${s.textDark};">${esc(data.clientName)}</div>
        ${data.clientAddress ? `<div style="font-family:${body};font-size:12px;color:${s.textGray};margin-top:4px;max-width:260px;">${esc(data.clientAddress)}</div>` : ''}
        ${data.clientPhone ? `<div style="font-family:${body};font-size:12px;color:${s.textGray};">${esc(data.clientPhone)}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:${head};font-weight:700;font-size:24px;color:${s.textDark};margin-bottom:8px;">${esc(config.documentTitle)}</div>
        ${metaRows}
      </div>
    </div>`;
}

// Only rendered when the active docType's config sets showLogistics
// (Delivery Note, Waybill) — mirrors SectionComponents.js's LogisticsSection.
function renderLogistics(data, s, docType) {
  const config = docTypeConfig(docType);
  if (!data.visible || !config.showLogistics) return '';
  const body = fontCss(s.bodyFont);
  const fields = config.logisticsFields
    .map((key) => [LOGISTICS_FIELD_LABELS[key], data[key]])
    .filter(([, value]) => value);
  if (fields.length === 0) return '';
  return `
    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px 24px;">
      ${fields.map(([label, value]) => `
        <div>
          <div style="font-family:${body};font-size:10px;color:${s.textMuted};text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</div>
          <div style="font-family:${body};font-size:12.5px;font-weight:600;color:${s.textDark};margin-top:2px;word-break:break-word;">${esc(value)}</div>
        </div>`).join('')}
    </div>`;
}

// A real HTML table — this is the entire point of the rewrite for the
// items list. Fixed <colgroup> widths mean Qty/Rate/VAT/Amount physically
// cannot overlap; descriptions wrap inside their own <td>; a <thead>
// repeats automatically on additional printed pages, native browser
// behavior for tables spanning a page break, not something built by hand.
function itemCellValue(colId, row, currency) {
  const qty = parseFloat(row.qty) || 0, rate = parseFloat(row.rate) || 0, vat = parseFloat(row.vat) || 0;
  switch (colId) {
    case 'qty': return String(qty);
    case 'rate': return cellMoney(rate);
    case 'vat': return `${vat}%`;
    case 'amount': return cellMoney(qty * rate * (1 + vat / 100));
    case 'unit': return row.unit || '';
    case 'weight': return row.weight != null ? String(row.weight) : '';
    case 'remarks': return row.remarks || '';
    default: return '';
  }
}

function renderItemsTable(data, s, currency, docType) {
  if (!data.visible) return '';
  const config = docTypeConfig(docType);
  const columns = config.itemColumns;
  const body = fontCss(s.bodyFont);
  const outline = s.tableHeaderStyle === 'outline';
  // The image column shows automatically whenever at least one row has an
  // uploaded product image — no separate manual toggle to forget to flip on.
  const showImages = data.rows.some((r) => r.img);
  const headCell = (label, right) => `<th style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:10px 8px;text-align:${right ? 'right' : 'left'};color:${outline ? s.brandPrimary : '#fff'};${outline ? `border-bottom:2px solid ${s.brandPrimary};` : ''}">${label}</th>`;

  const rows = data.rows.map((row, i) => {
    const cellStyle = `padding:10px 8px;border-bottom:${i === data.rows.length - 1 ? 'none' : `1px solid ${s.divider}`};vertical-align:top;`;
    const dynamicCells = columns.map((colId) => {
      const def = ITEM_COLUMN_DEFS[colId];
      const size = colId === 'vat' ? 12 : 13;
      const weight = colId === 'amount' ? 600 : 400;
      const color = colId === 'vat' ? s.textMuted : s.textDark;
      return `<td style="${cellStyle}font-family:${body};font-size:${size}px;font-weight:${weight};color:${color};text-align:${def.align};">${esc(itemCellValue(colId, row, currency))}</td>`;
    }).join('');
    return `
      <tr>
        <td style="${cellStyle}font-family:${body};font-size:12px;color:${s.textMuted};">${i + 1}</td>
        ${showImages ? `<td style="${cellStyle}">${row.img ? `<img src="${row.img}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;" />` : ''}</td>` : ''}
        <td style="${cellStyle}">
          <div style="font-family:${body};font-size:13px;font-weight:600;color:${s.textDark};word-break:break-word;">${esc(row.name)}</div>
          ${row.desc ? `<div style="font-family:${body};font-size:11px;color:${s.textMuted};margin-top:2px;word-break:break-word;">${esc(row.desc)}</div>` : ''}
        </td>
        ${dynamicCells}
      </tr>`;
  }).join('');

  const colgroupCols = columns.map((colId) => `<col style="width:${ITEM_COLUMN_DEFS[colId].width}px" />`).join('');
  const headCells = columns.map((colId) => headCell(ITEM_COLUMN_DEFS[colId].label, ITEM_COLUMN_DEFS[colId].align === 'right')).join('');

  return `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid ${outline ? s.brandPrimary : s.divider};border-radius:10px;overflow:hidden;">
      <colgroup>
        <col style="width:28px" />${showImages ? '<col style="width:44px" />' : ''}
        <col />${colgroupCols}
      </colgroup>
      <thead style="background:${outline ? '#fff' : s.brandPrimary};">
        <tr>${headCell('#')}${showImages ? headCell('') : ''}${headCell('Item / Description')}${headCells}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// QR renders in the gap between "Total in words" and the totals box when
// Bank Details is showing — the totals box itself never moves or changes
// size, it's still the same fixed-width flex-shrink:0 element anchored at
// the end of the row; QR is just a new sibling before it. When Bank
// Details is off, QR moves into renderBankSignature instead, so it's never
// shown in both places at once.
function renderTotals(data, s, currency, totals, wordsText, qr, bank, docType) {
  const config = docTypeConfig(docType);
  if (!data.visible || !config.showFinancials) return '';
  const body = fontCss(s.bodyFont), head = fontCss(s.headingFont);
  const bg = s.totalsBg === 'tan' ? '#FBF3E3' : s.totalsBg === 'plain' ? 'transparent' : '#F7F8FA';
  const showQrHere = bank?.visible && qr?.visible && qr.src;
  const line = (label, value, big) => `
    <div style="display:flex;justify-content:space-between;font-family:${body};font-size:${big ? 15 : 12.5}px;font-weight:${big ? 700 : 400};color:${big ? s.brandPrimary : s.textGray};margin-top:${big ? 10 : 6}px;${big ? `padding-top:10px;border-top:1px solid ${s.divider};` : ''}">
      <span>${label}</span><span style="color:${big ? s.brandPrimary : s.textDark};">${value}</span>
    </div>`;
  return `
    <div style="display:flex;gap:24px;align-items:center;">
      <div style="flex:1;min-width:0;">
        <div style="font-family:${body};font-size:10.5px;color:${s.textMuted};letter-spacing:.05em;text-transform:uppercase;">Total in words</div>
        <div style="font-family:${head};font-weight:600;font-size:13px;color:${s.textDark};margin-top:4px;line-height:1.5;">${esc(wordsText)}</div>
      </div>
      ${showQrHere ? `<img src="${esc(qr.src)}" alt="Payment QR code" style="width:72px;height:72px;object-fit:contain;flex-shrink:0;" />` : ''}
      <div style="width:230px;flex-shrink:0;background:${bg};border-radius:10px;padding:14px 16px;">
        ${line('Subtotal', esc(formatMoney(totals.subtotal, currency)))}
        ${line('VAT', esc(formatMoney(totals.vat, currency)))}
        ${totals.discount > 0 ? line('Discount', `-${esc(formatMoney(totals.discount, currency))}`) : ''}
        ${line(config.totalLabel, esc(formatMoney(totals.total, currency)), true)}
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

// One signature block's HTML — mirrors SectionComponents.js's
// SignatureBlock so the editor and the PDF stay visually identical.
function renderSignatureBlock(data, label, s, anchorRight) {
  if (!data?.visible) return '';
  const head = fontCss(s.headingFont), body = fontCss(s.bodyFont);
  const isTyped = data.mode === 'typed' || !data.mode;
  const size = data.size ?? 40;
  const mark = isTyped
    ? (data.text ? `<div style="font-family:'Caveat',cursive;font-size:26px;color:${s.textDark};">${esc(data.text)}</div>` : '')
    : (data.src ? `<img src="${data.src}" style="height:${size}px;width:auto;max-width:100%;object-fit:contain;" />` : '');
  const approvedByLabel = data.approvedName ? `
    <div style="font-family:${body};font-size:10px;color:${s.textMuted};text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">${esc(label)}</div>` : '';
  const approval = data.approvedName ? `
    <div style="font-family:${head};font-weight:600;font-size:13px;color:${s.textDark};margin-top:8px;">${esc(data.approvedName)}</div>
    <div style="font-family:${body};font-size:11.5px;color:${s.textGray};">${esc(data.approvedRole)}</div>` : '';
  // Order is "Approved By" label -> signature -> underline -> name -> role,
  // not signature -> underline -> label -> name -> role — the label reads
  // as the header for the whole block, sitting above what it's labelling
  // instead of below it.
  return `
    <div style="width:200px;flex-shrink:0;${anchorRight ? 'margin-left:auto;' : ''}text-align:left;">
      ${approvedByLabel}
      <div style="min-height:${size}px;display:flex;align-items:flex-end;">${mark}</div>
      <div style="border-top:1.5px solid #CBD5E1;margin-top:4px;"></div>
      ${approval}
    </div>`;
}

// Bank Details and Signature render as columns of ONE flex row, matching
// the live editor's BankSignatureSection. QR only appears here (filling
// Bank's spot) when Bank Details is off — otherwise it renders up in
// renderTotals instead, so it's never shown in both places at once.
// Waybill's dual signature slots (Dispatched By / Received By) render as a
// pair anchored to the row's right edge instead of the single
// anchored-right block every other doc type uses.
function renderBankSignature(bank, signature, signature2, qr, s, docType) {
  const config = docTypeConfig(docType);
  const bankVisible = bank.visible && config.showBank;
  const showQrHere = !bankVisible && qr?.visible && qr.src;
  const dualSignature = config.signatureSlots.length === 2;
  const sig1Visible = !!signature?.visible;
  const sig2Visible = dualSignature && !!signature2?.visible;
  if (!bankVisible && !sig1Visible && !sig2Visible && !showQrHere) return '';
  const body = fontCss(s.bodyFont);
  const bankHtml = bankVisible ? `
    <div style="flex:1;">
      <div style="font-family:${body};font-size:11px;font-weight:700;letter-spacing:.05em;color:${s.brandAccent};margin-bottom:8px;">BANK DETAILS</div>
      ${bank.rows.map((r, i) => `
        <div style="margin-top:${i === 0 ? 0 : 6}px;">
          <div style="font-family:${body};font-size:10px;color:${s.textMuted};">${esc(r.k)}</div>
          <div style="font-family:${body};font-size:12px;font-weight:600;color:${s.textDark};word-break:break-word;">${esc(r.v)}</div>
        </div>`).join('')}
    </div>` : '';
  const qrHtml = showQrHere ? `
    <div style="flex:1;">
      <img src="${esc(qr.src)}" alt="Payment QR code" style="width:72px;height:72px;object-fit:contain;" />
    </div>` : '';
  const singleSignatureHtml = !dualSignature && sig1Visible
    ? renderSignatureBlock(signature, config.signatureSlots[0]?.label || 'Approved By', s, true)
    : '';
  const dualSignatureHtml = dualSignature && (sig1Visible || sig2Visible) ? `
    <div style="display:flex;gap:24px;margin-left:auto;">
      ${renderSignatureBlock(signature, config.signatureSlots[0]?.label, s, false)}
      ${renderSignatureBlock(signature2, config.signatureSlots[1]?.label, s, false)}
    </div>` : '';
  return `<div style="display:flex;gap:32px;align-items:flex-start;">${bankHtml}${qrHtml}${singleSignatureHtml}${dualSignatureHtml}</div>`;
}

// Full-page background layer, not flow content — absolutely positioned but
// given a negative z-index so it paints behind the normal-flow content in
// the same containing block instead of on top of it, and pointer-events
// none so it can never intercept anything either. That's what keeps it
// from ever blocking or overlapping readable content the way the QR bug did.
function renderWatermark(data, s) {
  if (!data?.visible || !data.content) return '';
  const head = fontCss(s.headingFont);
  const opacity = (data.opacity ?? 12) / 100;
  const rotation = data.rotation ?? -28;
  return `
    <div style="position:absolute;inset:0;z-index:-1;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-family:${head};font-weight:700;font-size:96px;color:${s.textDark};white-space:nowrap;letter-spacing:.05em;text-transform:uppercase;opacity:${opacity};transform:rotate(${rotation}deg);">${esc(data.content)}</div>
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
  // Margin is applied via Puppeteer's own page.pdf({ margin }) option (see
  // app/api/invoice-pdf/route.js), not CSS padding on this div. That's what
  // makes it a genuine PER-PAGE margin: this is one continuous flow of
  // content that the browser's native print pagination slices into
  // physical A4 sheets wherever it happens to overflow, and a page-level
  // margin option applies fresh to every one of those sheets automatically.
  // Padding on the div itself, by contrast, is a property of that ONE tall
  // box — it only ever appears once, at the very top and bottom of the
  // whole flow, which is exactly why page 2+ previously started flush
  // against the paper edge. Width/height are sized to the printable area
  // (A4 794x1123 minus 40px margin on every side) so page 1 renders
  // identically to before, just via a different mechanism.
  const body = `
    <div style="position:relative;z-index:0;width:714px;min-height:1043px;background:#fff;display:flex;flex-direction:column;">
      ${renderWatermark(sec.watermark, s)}
      ${renderLetterhead(sec.letterhead)}
      <div style="margin-top:22px;">${renderHeader(sec.header, s)}</div>
      <div style="margin-top:22px;">${renderClientInfo(sec.clientInfo, s, doc.docType)}</div>
      <div style="margin-top:22px;">${renderLogistics(sec.logistics, s, doc.docType)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderItemsTable(sec.itemsTable, s, doc.currency, doc.docType)}</div>
      <div style="margin-top:22px; break-inside:avoid;">${renderTotals(sec.totals, s, doc.currency, totals, wordsText, sec.qr, sec.bank, doc.docType)}</div>
      <!-- Notes, Bank/Signature, and Terms wrapped in one break-inside:avoid
           box so the browser's print pagination treats them as a single
           unit: either the whole group fits in what's left of the current
           page, or the whole group moves to the next page together. Each
           section previously had its own individual break-inside:avoid
           (still true internally), but nothing stopped a page break from
           landing BETWEEN them - which is exactly how Notes ended up alone
           on page 1 while Bank Details and Signature spilled to page 2. -->
      <div style="break-inside:avoid;">
        <div style="margin-top:22px;">${renderNotes(sec.notes, s)}</div>
        <div style="margin-top:22px;">${renderBankSignature(sec.bank, sec.signature, sec.signature2, sec.qr, s, doc.docType)}</div>
        <div style="margin-top:22px;">${renderTerms(sec.terms, s)}</div>
      </div>
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
  @page { size: A4; } /* margin comes from page.pdf({ margin }) in the API route, not here - see route.js */
</style>
</head>
<body>${body}</body>
</html>`;
}
