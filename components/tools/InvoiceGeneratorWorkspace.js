'use client';

import { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

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

const CURRENCIES = ['₦', '$', '€', '£', 'GH₵', 'KSh', 'ZAR'];

const emptyItem = () => ({ description: '', quantity: '1', unitPrice: '' });

export default function InvoiceGeneratorWorkspace() {
  const [biz, setBiz] = useState({ name: '', address: '', phone: '', email: '' });
  const [client, setClient] = useState({ name: '', address: '', email: '' });
  const [invoice, setInvoice] = useState({
    number: 'INV-001',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    currency: '₦',
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
    const subtotal = calcSubtotal();
    const taxRate = parseFloat(invoice.tax) || 0;
    return subtotal * (taxRate / 100);
  }

  function calcTotal() { return calcSubtotal() + calcTax(); }

  function fmt(num) {
    return invoice.currency + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // pdfFmt uses same symbol as screen — Roboto font supports ₦ and other Unicode currencies
  function pdfFmt(num) {
    return fmt(num);
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

      // Fetch Roboto from Google Fonts — supports ₦ and full Unicode
      const [fontRegBytes, fontBoldBytes] = await Promise.all([
        fetch('https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2').then(r => r.arrayBuffer()),
        fetch('https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4.woff2').then(r => r.arrayBuffer()),
      ]);

      const fontReg = await doc.embedFont(fontRegBytes, { subset: false });
      const fontBold = await doc.embedFont(fontBoldBytes, { subset: false });

      const amber = rgb(0.886, 0.588, 0.173);
      const dark = rgb(0.11, 0.137, 0.2);
      const gray = rgb(0.4, 0.4, 0.4);
      const lightGray = rgb(0.9, 0.9, 0.9);
      const white = rgb(1, 1, 1);

      // Amber top bar
      page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: amber });

      // Business name top left
      page.drawText(biz.name || 'Your Business', {
        x: 50, y: height - 55, size: 18, font: fontBold, color: dark,
      });
      if (biz.address) {
        page.drawText(biz.address, { x: 50, y: height - 72, size: 9, font: fontReg, color: gray });
      }
      if (biz.phone) {
        page.drawText(biz.phone, { x: 50, y: height - 84, size: 9, font: fontReg, color: gray });
      }
      if (biz.email) {
        page.drawText(biz.email, { x: 50, y: height - 96, size: 9, font: fontReg, color: gray });
      }

      // INVOICE label top right
      page.drawText('INVOICE', {
        x: width - 180, y: height - 50, size: 28, font: fontBold, color: amber,
      });
      page.drawText(`#${invoice.number}`, {
        x: width - 180, y: height - 68, size: 10, font: fontReg, color: gray,
      });
      page.drawText(`Date: ${invoice.date}`, {
        x: width - 180, y: height - 82, size: 9, font: fontReg, color: gray,
      });
      if (invoice.dueDate) {
        page.drawText(`Due: ${invoice.dueDate}`, {
          x: width - 180, y: height - 94, size: 9, font: fontReg, color: gray,
        });
      }

      // Amber divider line
      page.drawRectangle({ x: 50, y: height - 115, width: width - 100, height: 1.5, color: amber });

      // BILL TO section
      page.drawText('BILL TO', { x: 50, y: height - 140, size: 8, font: fontBold, color: amber });
      page.drawText(client.name, { x: 50, y: height - 155, size: 11, font: fontBold, color: dark });
      if (client.address) {
        page.drawText(client.address, { x: 50, y: height - 168, size: 9, font: fontReg, color: gray });
      }
      if (client.email) {
        page.drawText(client.email, { x: 50, y: height - 180, size: 9, font: fontReg, color: gray });
      }

      // Items table header
      const tableTop = height - 220;
      page.drawRectangle({ x: 50, y: tableTop, width: width - 100, height: 24, color: dark });

      const cols = { desc: 50, qty: 310, rate: 380, amount: 460 };
      page.drawText('DESCRIPTION', { x: cols.desc + 8, y: tableTop + 8, size: 8, font: fontBold, color: white });
      page.drawText('QTY', { x: cols.qty, y: tableTop + 8, size: 8, font: fontBold, color: white });
      page.drawText('RATE', { x: cols.rate, y: tableTop + 8, size: 8, font: fontBold, color: white });
      page.drawText('AMOUNT', { x: cols.amount, y: tableTop + 8, size: 8, font: fontBold, color: white });

      // Items rows
      let rowY = tableTop - 2;
      items.forEach((item, i) => {
        if (!item.description) return;
        const rowH = 22;
        rowY -= rowH;
        if (i % 2 === 1) {
          page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: rowH, color: rgb(0.97, 0.97, 0.97) });
        }
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const amount = qty * price;

        page.drawText(item.description, { x: cols.desc + 8, y: rowY + 7, size: 9, font: fontReg, color: dark });
        page.drawText(String(qty), { x: cols.qty, y: rowY + 7, size: 9, font: fontReg, color: dark });
        page.drawText(pdfFmt(price), { x: cols.rate, y: rowY + 7, size: 9, font: fontReg, color: dark });
        page.drawText(pdfFmt(amount), { x: cols.amount, y: rowY + 7, size: 9, font: fontReg, color: dark });
      });

      // Bottom line
      rowY -= 8;
      page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: 1, color: lightGray });

      // Totals
      let totY = rowY - 24;
      const subtotal = calcSubtotal();
      const taxAmt = calcTax();
      const total = calcTotal();

      page.drawText('Subtotal', { x: cols.rate - 10, y: totY, size: 9, font: fontReg, color: gray });
      page.drawText(pdfFmt(subtotal), { x: cols.amount, y: totY, size: 9, font: fontReg, color: dark });

      if (taxAmt > 0) {
        totY -= 18;
        page.drawText(`Tax (${invoice.tax}%)`, { x: cols.rate - 10, y: totY, size: 9, font: fontReg, color: gray });
        page.drawText(pdfFmt(taxAmt), { x: cols.amount, y: totY, size: 9, font: fontReg, color: dark });
      }

      // Total box
      totY -= 30;
      page.drawRectangle({ x: cols.rate - 20, y: totY - 4, width: width - cols.rate - 30, height: 28, color: amber });
      page.drawText('TOTAL DUE', { x: cols.rate - 10, y: totY + 8, size: 10, font: fontBold, color: white });
      page.drawText(pdfFmt(total), { x: cols.amount, y: totY + 8, size: 11, font: fontBold, color: white });

      // Notes
      if (invoice.notes) {
        totY -= 50;
        page.drawText('NOTES', { x: 50, y: totY, size: 8, font: fontBold, color: amber });
        page.drawText(invoice.notes, { x: 50, y: totY - 14, size: 9, font: fontReg, color: gray });
      }

      // Footer
      page.drawRectangle({ x: 0, y: 0, width, height: 4, color: amber });
      page.drawText('Generated by convertam.app', {
        x: 50, y: 12, size: 8, font: fontReg, color: lightGray,
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

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm";
  const inputStyle = { borderColor: '#e2dcc9', background: '#fffefb' };
  const labelClass = "text-xs font-medium text-ink-soft block mb-1";

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
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                placeholder="Qty"
                type="number" min="1"
                value={item.quantity}
                onChange={e => updateItem(i, 'quantity', e.target.value)}
              />
              <input
                className={inputClass} style={inputStyle}
                placeholder="Unit price"
                type="number" min="0"
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
          <span className="font-medium">{invoice.currency}{subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
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
          <span>{invoice.currency}{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className={labelClass}>Notes / Payment Terms</label>
        <textarea
          className={inputClass} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          placeholder="e.g. Payment due within 30 days. Bank: GTBank, Acc: 0123456789"
          value={invoice.notes}
          onChange={e => setInvoice({ ...invoice, notes: e.target.value })}
        />
      </div>

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
