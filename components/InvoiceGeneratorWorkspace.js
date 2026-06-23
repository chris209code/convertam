'use client';

import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR'];
const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' };

// pdf-lib standard fonts only support ASCII — we use the 3-letter code in PDF
// but show the symbol on screen
function pdfCurrency(currency) {
  return currency + ' ';
}

function screenCurrency(currency) {
  return CURRENCY_SYMBOLS[currency] || currency;
}

const emptyItem = () => ({ description: '', quantity: '1', unitPrice: '' });

export default function InvoiceGeneratorWorkspace() {
  const [biz, setBiz] = useState({ name: '', address: '', phone: '', email: '' });
  const [client, setClient] = useState({ name: '', address: '', email: '' });
  const [invoice, setInvoice] = useState({
    number: `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    currency: 'NGN',
    tax: '',
    notes: 'Thank you for your business!',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateItem(i, field, value) {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  }

  function addItem() { setItems([...items, emptyItem()]); }
  function removeItem(i) { setItems(items.filter((_, idx) => idx !== i)); }

  function calcSubtotal() {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }
  function calcTax() {
    return calcSubtotal() * ((parseFloat(invoice.tax) || 0) / 100);
  }
  function calcTotal() { return calcSubtotal() + calcTax(); }

  function fmtScreen(num) {
    return screenCurrency(invoice.currency) + num.toLocaleString('en-NG', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
  function fmtPdf(num) {
    return pdfCurrency(invoice.currency) + num.toLocaleString('en-NG', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }

  async function handleGenerate() {
    if (!biz.name || !client.name || items.every(i => !i.description)) {
      setError('Please fill in your business name, client name, and at least one item.');
      return;
    }
    setBusy(true);
    setError('');

    try {
      const doc = await PDFDocument.create();
      const page = doc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();

      // Use built-in standard fonts — no external fetch, works everywhere
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);

      const amber = rgb(0.886, 0.588, 0.173);
      const dark = rgb(0.11, 0.137, 0.2);
      const gray = rgb(0.45, 0.45, 0.45);
      const lightGray = rgb(0.88, 0.88, 0.88);
      const white = rgb(1, 1, 1);

      // Amber top bar
      page.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: amber });

      // Business name — top RIGHT, bold, like a letter header
      const bizName = biz.name || 'Your Business';
      const bizNameWidth = fontBold.widthOfTextAtSize(bizName, 18);
      page.drawText(bizName, {
        x: width - 50 - bizNameWidth,
        y: height - 52,
        size: 18,
        font: fontBold,
        color: dark,
      });

      // Business details — right aligned below name
      let bizY = height - 68;
      const bizDetails = [biz.address, biz.phone, biz.email].filter(Boolean);
      for (const detail of bizDetails) {
        const detailWidth = fontReg.widthOfTextAtSize(detail, 9);
        page.drawText(detail, { x: width - 50 - detailWidth, y: bizY, size: 9, font: fontReg, color: gray });
        bizY -= 13;
      }

      // Invoice reference — small, top LEFT, understated
      page.drawText(`Invoice`, { x: 50, y: height - 38, size: 9, font: fontBold, color: gray });
      page.drawText(`#${invoice.number}`, { x: 50, y: height - 52, size: 9, font: fontReg, color: dark });
      page.drawText(`Date: ${invoice.date}`, { x: 50, y: height - 65, size: 9, font: fontReg, color: gray });
      if (invoice.dueDate) {
        page.drawText(`Due: ${invoice.dueDate}`, { x: 50, y: height - 78, size: 9, font: fontReg, color: gray });
      }

      // Amber divider
      page.drawRectangle({ x: 50, y: height - 120, width: width - 100, height: 2, color: amber });

      // BILL TO
      page.drawText('BILL TO', { x: 50, y: height - 145, size: 9, font: fontBold, color: amber });
      page.drawText(client.name, { x: 50, y: height - 160, size: 12, font: fontBold, color: dark });
      let clientY = height - 176;
      if (client.address) { page.drawText(client.address, { x: 50, y: clientY, size: 9, font: fontReg, color: gray }); clientY -= 13; }
      if (client.email) { page.drawText(client.email, { x: 50, y: clientY, size: 9, font: fontReg, color: gray }); }

      // Table header
      const tableTop = height - 225;
      page.drawRectangle({ x: 50, y: tableTop, width: width - 100, height: 26, color: dark });

      const cols = { desc: 58, qty: 310, rate: 390, amount: 470 };
      page.drawText('DESCRIPTION', { x: cols.desc, y: tableTop + 9, size: 9, font: fontBold, color: white });
      page.drawText('QTY', { x: cols.qty, y: tableTop + 9, size: 9, font: fontBold, color: white });
      page.drawText('RATE', { x: cols.rate, y: tableTop + 9, size: 9, font: fontBold, color: white });
      page.drawText('AMOUNT', { x: cols.amount, y: tableTop + 9, size: 9, font: fontBold, color: white });

      // Items
      let rowY = tableTop - 2;
      items.forEach((item, i) => {
        if (!item.description) return;
        const rowH = 24;
        rowY -= rowH;
        if (i % 2 === 1) {
          page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: rowH, color: rgb(0.96, 0.96, 0.96) });
        }
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const amount = qty * price;

        // Truncate long descriptions
        const desc = item.description.length > 38 ? item.description.slice(0, 35) + '...' : item.description;

        page.drawText(desc, { x: cols.desc, y: rowY + 8, size: 10, font: fontReg, color: dark });
        page.drawText(String(qty), { x: cols.qty, y: rowY + 8, size: 10, font: fontReg, color: dark });
        page.drawText(fmtPdf(price), { x: cols.rate, y: rowY + 8, size: 10, font: fontReg, color: dark });
        page.drawText(fmtPdf(amount), { x: cols.amount, y: rowY + 8, size: 10, font: fontReg, color: dark });
      });

      // Divider after items
      rowY -= 10;
      page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: 1, color: lightGray });

      // Totals
      let totY = rowY - 28;
      const subtotal = calcSubtotal();
      const taxAmt = calcTax();
      const total = calcTotal();

      page.drawText('Subtotal', { x: cols.rate - 20, y: totY, size: 10, font: fontReg, color: gray });
      page.drawText(fmtPdf(subtotal), { x: cols.amount, y: totY, size: 10, font: fontReg, color: dark });

      if (taxAmt > 0) {
        totY -= 20;
        page.drawText(`Tax (${invoice.tax}%)`, { x: cols.rate - 20, y: totY, size: 10, font: fontReg, color: gray });
        page.drawText(fmtPdf(taxAmt), { x: cols.amount, y: totY, size: 10, font: fontReg, color: dark });
      }

      // Total box — adjusted to prevent cutoff
      totY -= 35;
      page.drawRectangle({ x: cols.rate - 30, y: totY - 6, width: width - cols.rate - 20, height: 32, color: amber });
      page.drawText('TOTAL DUE', { x: cols.rate - 18, y: totY + 8, size: 10, font: fontBold, color: white });
      const totalStr = fmtPdf(total);
      const totalWidth = fontBold.widthOfTextAtSize(totalStr, 11);
      page.drawText(totalStr, { x: width - 52 - totalWidth, y: totY + 8, size: 11, font: fontBold, color: white });

      // Notes
      if (invoice.notes) {
        totY -= 55;
        page.drawText('NOTES', { x: 50, y: totY, size: 9, font: fontBold, color: amber });
        page.drawText(invoice.notes, { x: 50, y: totY - 16, size: 10, font: fontReg, color: gray });
      }

      // Footer
      page.drawRectangle({ x: 0, y: 0, width, height: 6, color: amber });
      page.drawText('Generated by convertam.app', {
        x: 50, y: 14, size: 8, font: fontReg, color: lightGray,
      });

      const bytes = await doc.save();
      downloadBlob(
        new Blob([bytes], { type: 'application/pdf' }),
        `Invoice-${invoice.number}-${client.name}.pdf`
      );
    } catch (err) {
      console.error(err);
      setError('Could not generate the invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const subtotal = calcSubtotal();
  const taxAmt = calcTax();
  const total = calcTotal();
  const sym = screenCurrency(invoice.currency);

  const inputClass = 'w-full border rounded-lg px-3 py-2 text-sm';
  const inputStyle = { borderColor: '#e2dcc9', background: '#fffefb' };
  const labelClass = 'text-xs font-medium text-ink-soft block mb-1';

  return (
    <div className="panel">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Your business */}
        <div>
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
            <span>🏢</span> Your Business
          </h3>
          <div className="flex flex-col gap-2.5">
            <div>
              <label className={labelClass}>Business Name *</label>
              <input className={inputClass} style={inputStyle} placeholder="e.g. Okeke Designs" value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input className={inputClass} style={inputStyle} placeholder="Lagos, Nigeria" value={biz.address} onChange={e => setBiz({ ...biz, address: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} style={inputStyle} placeholder="+234 800 000 0000" value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} style={inputStyle} placeholder="you@example.com" value={biz.email} onChange={e => setBiz({ ...biz, email: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Client */}
        <div>
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
            <span>👤</span> Client Details
          </h3>
          <div className="flex flex-col gap-2.5">
            <div>
              <label className={labelClass}>Client Name *</label>
              <input className={inputClass} style={inputStyle} placeholder="e.g. Acme Ltd" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input className={inputClass} style={inputStyle} placeholder="Abuja, Nigeria" value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} style={inputStyle} placeholder="client@example.com" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className={labelClass}>Invoice #</label>
          <input className={inputClass} style={inputStyle} value={invoice.number} onChange={e => setInvoice({ ...invoice, number: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} style={inputStyle} value={invoice.date} onChange={e => setInvoice({ ...invoice, date: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Due Date</label>
          <input type="date" className={inputClass} style={inputStyle} value={invoice.dueDate} onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select className={inputClass} style={inputStyle} value={invoice.currency} onChange={e => setInvoice({ ...invoice, currency: e.target.value })}>
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-6">
        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
          <span>📋</span> Items
        </h3>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '3fr 1fr 1.5fr auto' }}>
              <input
                className={inputClass} style={inputStyle}
                placeholder="Description"
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
              />
              <input
                className={inputClass} style={inputStyle}
                placeholder="Qty" type="number" min="1"
                value={item.quantity}
                onChange={e => updateItem(i, 'quantity', e.target.value)}
              />
              <input
                className={inputClass} style={inputStyle}
                placeholder={`Unit price (${sym})`} type="number" min="0"
                value={item.unitPrice}
                onChange={e => updateItem(i, 'unitPrice', e.target.value)}
              />
              <button
                onClick={() => removeItem(i)}
                className="text-error font-mono text-lg leading-none px-2"
                disabled={items.length === 1}
              >×</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="btn-ghost-sm mt-2">+ Add item</button>
      </div>

      {/* Totals preview */}
      <div className="rounded-xl p-4 mb-6" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-ink-soft">Subtotal</span>
          <span className="font-medium">{sym}{subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-ink-soft">Tax (%)</span>
          <input
            type="number" min="0" max="100"
            className="border rounded px-2 py-1 text-sm w-20"
            style={{ borderColor: '#e2dcc9' }}
            placeholder="0"
            value={invoice.tax}
            onChange={e => setInvoice({ ...invoice, tax: e.target.value })}
          />
        </div>
        <div
          className="flex justify-between font-bold text-base pt-2"
          style={{ borderTop: '2px solid #e2962c', color: '#e2962c' }}
        >
          <span>TOTAL DUE</span>
          <span>{sym}{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className={labelClass}>Notes / Payment Terms</label>
        <textarea
          className={inputClass}
          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          placeholder="e.g. Payment due within 30 days. Bank: GTBank, Acc: 0123456789"
          value={invoice.notes}
          onChange={e => setInvoice({ ...invoice, notes: e.target.value })}
        />
      </div>

      <p className="text-xs text-ink-soft mb-4">
        💡 Note: The {sym} symbol shows on screen. In the PDF it prints as <strong>{invoice.currency}</strong> for maximum compatibility across all devices and PDF viewers.
      </p>

      {error && <div className="status error mb-3">{error}</div>}

      <div className="actions">
        <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
          {busy ? 'Generating…' : 'Generate Invoice PDF'}
        </button>
      </div>

      <p className="privacy-note">Generated entirely in your browser — nothing is uploaded or stored.</p>
    </div>
  );
}
