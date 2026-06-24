'use client';

import { useState, useRef, useEffect } from 'react';
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
const STORAGE_KEY = 'convertam_biz_profile';

function screenSym(c) { return CURRENCY_SYMBOLS[c] || c; }
function pdfSym(c) { return c + ' '; }
const emptyItem = () => ({ description: '', quantity: '1', unitPrice: '' });
function autoInvNum() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  return `INV-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function InvoiceGeneratorWorkspace() {
  const [savedBiz, setSavedBiz] = useState(null); // loaded from localStorage
  const [editingBiz, setEditingBiz] = useState(false); // show edit form
  const [logo, setLogo] = useState(null);
  const [logoBytes, setLogoBytes] = useState(null);
  const [logoType, setLogoType] = useState('image/png');
  const [biz, setBiz] = useState({ name: '', tagline: '', address: '', phone: '', email: '' });
  const [client, setClient] = useState({ name: '', address: '', email: '' });
  const [invoice, setInvoice] = useState({
    number: autoInvNum(),
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    currency: 'NGN',
    tax: '',
    discount: '',
    notes: 'Thank you for your Patronage.',
    paymentMethods: { cash: true, bankTransfer: true, pos: false, ussd: false },
    bankName: '', bankAccount: '', bankAccountName: '',
    status: 'Pending',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloadedBlob, setDownloadedBlob] = useState(null);
  const [downloadedName, setDownloadedName] = useState('');
  const fileInputRef = useRef(null);

  // Load saved business profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedBiz(parsed);
        setBiz(parsed.biz || biz);
        if (parsed.logo) setLogo(parsed.logo);
        if (parsed.invoice) {
          setInvoice(prev => ({
            ...prev,
            currency: parsed.invoice.currency || 'NGN',
            paymentMethods: parsed.invoice.paymentMethods || prev.paymentMethods,
            bankName: parsed.invoice.bankName || '',
            bankAccount: parsed.invoice.bankAccount || '',
            bankAccountName: parsed.invoice.bankAccountName || '',
          }));
        }
      }
    } catch {}
  }, []);

  function saveProfile() {
    if (!biz.name) { setError('Please enter your business name before saving.'); return; }
    const profile = {
      biz,
      logo: logo || null,
      invoice: {
        currency: invoice.currency,
        paymentMethods: invoice.paymentMethods,
        bankName: invoice.bankName,
        bankAccount: invoice.bankAccount,
        bankAccountName: invoice.bankAccountName,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setSavedBiz(profile);
    setEditingBiz(false);
    setError('');
  }

  function clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
    setSavedBiz(null);
    setBiz({ name: '', tagline: '', address: '', phone: '', email: '' });
    setLogo(null);
    setLogoBytes(null);
  }

  function updateItem(i, field, value) {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  }
  function addItem() { setItems([...items, emptyItem()]); }
  function removeItem(i) { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); }

  function calcSubtotal() {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }, 0);
  }
  function calcDiscount() { return calcSubtotal() * ((parseFloat(invoice.discount) || 0) / 100); }
  function calcTax() { return (calcSubtotal() - calcDiscount()) * ((parseFloat(invoice.tax) || 0) / 100); }
  function calcTotal() { return calcSubtotal() - calcDiscount() + calcTax(); }

  function fmtS(num) { return screenSym(invoice.currency) + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtP(num) { return pdfSym(invoice.currency) + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogo(ev.target.result);
      const b64 = ev.target.result.split(',')[1];
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      setLogoBytes(bytes.buffer);
    };
    reader.readAsDataURL(file);
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
      const page = doc.addPage([595, 842]);
      const { width, height } = page.getSize();

      const fB = await doc.embedFont(StandardFonts.HelveticaBold);
      const fR = await doc.embedFont(StandardFonts.Helvetica);

      const amber = rgb(0.886, 0.588, 0.173);
      const dark = rgb(0.086, 0.118, 0.22);
      const gray = rgb(0.45, 0.45, 0.45);
      const lgray = rgb(0.88, 0.88, 0.88);
      const white = rgb(1, 1, 1);
      const offWhite = rgb(0.98, 0.96, 0.92);

      // ── TOP AMBER BAR ──
      page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: amber });

      // ── HEADER ──
      let headerY = height - 30;

      // Logo (optional)
      let logoEndX = 50;
      if (logoBytes) {
        try {
          const img = logoType === 'image/jpeg'
            ? await doc.embedJpg(logoBytes)
            : await doc.embedPng(logoBytes);
          const dims = img.scale(0.18);
          page.drawImage(img, { x: 50, y: headerY - dims.height + 10, width: dims.width, height: dims.height });
          logoEndX = 50 + dims.width + 10;
        } catch {}
      }

      // Business name
      page.drawText(biz.name.toUpperCase(), {
        x: logoEndX, y: headerY, size: 16, font: fB, color: dark,
      });
      let byY = headerY - 16;
      if (biz.tagline) {
        page.drawText(biz.tagline, { x: logoEndX, y: byY, size: 9, font: fR, color: amber });
        byY -= 14;
      }
      if (biz.address) { page.drawText('  ' + biz.address, { x: logoEndX, y: byY, size: 8, font: fR, color: gray }); byY -= 12; }
      if (biz.phone) { page.drawText('  ' + biz.phone, { x: logoEndX, y: byY, size: 8, font: fR, color: gray }); byY -= 12; }
      if (biz.email) { page.drawText('  ' + biz.email, { x: logoEndX, y: byY, size: 8, font: fR, color: gray }); }

      // INVOICE label + details (right side)
      page.drawText('INVOICE', { x: width - 160, y: headerY, size: 22, font: fB, color: amber });

      const metaY = headerY - 24;
      const metaRows = [
        ['Invoice No.', ': ' + invoice.number],
        ['Invoice Date', ': ' + invoice.date],
        ...(invoice.dueDate ? [['Due Date', ': ' + invoice.dueDate]] : []),
        ['Status', ': ' + invoice.status],
      ];
      metaRows.forEach(([label, value], i) => {
        page.drawText(label, { x: width - 160, y: metaY - i * 14, size: 8, font: fB, color: gray });
        page.drawText(value, { x: width - 95, y: metaY - i * 14, size: 8, font: fR, color: dark });
      });

      // Divider
      const divY = height - 145;
      page.drawRectangle({ x: 50, y: divY, width: width - 100, height: 1.5, color: amber });

      // ── BILL TO + THANK YOU ──
      const billY = divY - 20;
      page.drawText('BILL TO', { x: 50, y: billY, size: 8, font: fB, color: amber });
      page.drawText(client.name, { x: 50, y: billY - 14, size: 12, font: fB, color: dark });
      let cY = billY - 28;
      if (client.address) { page.drawText(client.address, { x: 50, y: cY, size: 9, font: fR, color: gray }); cY -= 12; }
      if (client.email) { page.drawText(client.email, { x: 50, y: cY, size: 9, font: fR, color: gray }); }

      // Thank you box (right side)
      page.drawRectangle({ x: width - 210, y: billY - 55, width: 160, height: 55, color: offWhite });
      page.drawRectangle({ x: width - 210, y: billY - 55, width: 160, height: 55, color: amber, opacity: 0.15 });
      page.drawText('Thank you for your business!', { x: width - 202, y: billY - 25, size: 8, font: fB, color: dark });
      page.drawText('We appreciate your patronage.', { x: width - 202, y: billY - 39, size: 8, font: fR, color: gray });

      // ── ITEMS TABLE ──
      const tableTop = divY - 80;
      const rowH = 24;
      const cols = { num: 52, desc: 80, qty: 330, rate: 400, amount: 480 };

      // Table header
      page.drawRectangle({ x: 50, y: tableTop, width: width - 100, height: 26, color: dark });
      page.drawText('#', { x: cols.num, y: tableTop + 9, size: 9, font: fB, color: white });
      page.drawText('DESCRIPTION', { x: cols.desc, y: tableTop + 9, size: 9, font: fB, color: white });
      page.drawText('QTY', { x: cols.qty, y: tableTop + 9, size: 9, font: fB, color: white });
      page.drawText('RATE', { x: cols.rate, y: tableTop + 9, size: 9, font: fB, color: white });
      page.drawText('AMOUNT', { x: cols.amount, y: tableTop + 9, size: 9, font: fB, color: white });

      let rowY = tableTop - 2;
      let itemNum = 0;
      items.forEach((item, i) => {
        if (!item.description) return;
        itemNum++;
        rowY -= rowH;
        if (i % 2 === 1) {
          page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: rowH, color: rgb(0.96, 0.96, 0.96) });
        }
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const amount = qty * price;
        const desc = item.description.length > 32 ? item.description.slice(0, 29) + '...' : item.description;

        page.drawText(String(itemNum), { x: cols.num, y: rowY + 8, size: 10, font: fR, color: dark });
        page.drawText(desc, { x: cols.desc, y: rowY + 8, size: 10, font: fR, color: dark });
        page.drawText(String(qty), { x: cols.qty, y: rowY + 8, size: 10, font: fR, color: dark });
        page.drawText(fmtP(price), { x: cols.rate, y: rowY + 8, size: 10, font: fR, color: dark });
        page.drawText(fmtP(amount), { x: cols.amount, y: rowY + 8, size: 10, font: fR, color: dark });
      });

      // Divider after items
      rowY -= 10;
      page.drawRectangle({ x: 50, y: rowY, width: width - 100, height: 1, color: lgray });

      // ── NOTES (left) + TOTALS (right) ──
      const bottomY = rowY - 20;
      if (invoice.notes) {
        page.drawText('NOTES', { x: 50, y: bottomY, size: 9, font: fB, color: amber });
        page.drawText(invoice.notes, { x: 50, y: bottomY - 14, size: 9, font: fR, color: gray });
      }

      // Totals
      const subtotal = calcSubtotal();
      const discountAmt = calcDiscount();
      const taxAmt = calcTax();
      const total = calcTotal();
      let totY = bottomY;

      const totRows = [
        ['Subtotal', fmtP(subtotal)],
        ...(discountAmt > 0 ? [`Discount (${invoice.discount}%)`, fmtP(discountAmt)] : []),
        [`Tax (${invoice.tax || 0}%)`, fmtP(taxAmt)],
      ];

      totRows.forEach(([label, value]) => {
        if (Array.isArray(label)) { label = label; value = value; }
        page.drawText(label, { x: cols.rate - 20, y: totY, size: 9, font: fR, color: gray });
        const vW = fR.widthOfTextAtSize(value, 9);
        page.drawText(value, { x: width - 50 - vW, y: totY, size: 9, font: fR, color: dark });
        totY -= 16;
      });

      // Total box
      totY -= 10;
      page.drawRectangle({ x: cols.rate - 30, y: totY - 6, width: width - cols.rate - 18, height: 30, color: amber });
      page.drawText('TOTAL DUE', { x: cols.rate - 18, y: totY + 7, size: 10, font: fB, color: white });
      const totalStr = fmtP(total);
      const tW = fB.widthOfTextAtSize(totalStr, 12);
      page.drawText(totalStr, { x: width - 52 - tW, y: totY + 6, size: 12, font: fB, color: white });

      // ── PAYMENT METHODS ──
      const pmY = totY - 45;
      const hasBankDetails = invoice.bankName || invoice.bankAccount || invoice.bankAccountName;
      const pmMethods = Object.entries(invoice.paymentMethods)
        .filter(([, v]) => v)
        .map(([k]) => ({ cash: 'Cash', bankTransfer: 'Bank Transfer', pos: 'POS', ussd: 'USSD' }[k]));

      if (pmMethods.length > 0) {
        page.drawRectangle({ x: 50, y: pmY - 40, width: hasBankDetails ? 220 : width - 100, height: 55, color: offWhite });
        page.drawText('PAYMENT METHODS', { x: 60, y: pmY + 5, size: 8, font: fB, color: amber });
        page.drawText(pmMethods.join('   '), { x: 60, y: pmY - 10, size: 8, font: fR, color: dark });
      }

      if (hasBankDetails) {
        page.drawRectangle({ x: width - 270, y: pmY - 40, width: 220, height: 55, color: offWhite });
        page.drawText('BANK DETAILS', { x: width - 260, y: pmY + 5, size: 8, font: fB, color: amber });
        if (invoice.bankName) { page.drawText('Bank Name    : ' + invoice.bankName, { x: width - 260, y: pmY - 9, size: 8, font: fR, color: dark }); }
        if (invoice.bankAccountName) { page.drawText('Account Name : ' + invoice.bankAccountName, { x: width - 260, y: pmY - 21, size: 8, font: fR, color: dark }); }
        if (invoice.bankAccount) { page.drawText('Account No.  : ' + invoice.bankAccount, { x: width - 260, y: pmY - 33, size: 8, font: fR, color: dark }); }
      }

      // ── FOOTER ──
      const footH = 70;
      page.drawRectangle({ x: 0, y: 0, width, height: footH, color: dark });
      page.drawText('Thank You!', { x: 70, y: footH - 28, size: 16, font: fB, color: amber });
      page.drawText('We look forward to serving you again.', { x: 70, y: footH - 44, size: 8, font: fR, color: lgray });

      // Footer contact
      const footDetails = [biz.phone, biz.email, biz.address].filter(Boolean);
      footDetails.forEach((d, i) => {
        page.drawText(d, { x: width - 250, y: footH - 20 - i * 14, size: 8, font: fR, color: lgray });
      });

      // Footer bottom line
      page.drawText('Generated by convertam.app', { x: width / 2 - 60, y: 8, size: 7, font: fR, color: gray });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const fname = `Invoice-${invoice.number}-${client.name}.pdf`;
      downloadBlob(blob, fname);
      setDownloadedBlob(blob);
      setDownloadedName(fname);
    } catch (err) {
      console.error(err);
      setError('Could not generate the invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hello ${client.name || ''},\n\nPlease find attached your invoice #${invoice.number} from ${biz.name}.\n\nTotal Due: ${fmtS(calcTotal())}\n\nGenerated via convertam.app`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  const sym = screenSym(invoice.currency);
  const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm';
  const inputSty = { borderColor: '#e2dcc9', background: '#fffefb' };
  const lbl = 'text-xs font-medium text-ink-soft block mb-1';

  return (
    <div className="panel">

      {/* ── BUSINESS PROFILE SECTION ── */}
      {savedBiz && !editingBiz ? (
        // Saved profile card
        <div
          className="rounded-xl p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: '#f0f5ff', border: '1.5px solid #3a63b8' }}
        >
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="logo" className="rounded-lg object-contain flex-shrink-0" style={{ width: 44, height: 44, border: '1px solid #e2dcc9' }} />
            ) : (
              <div
                className="rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ width: 44, height: 44, background: '#3a63b8', fontSize: 14 }}
              >
                {getInitials(biz.name)}
              </div>
            )}
            <div>
              <div className="font-bold text-ink">{biz.name}</div>
              {biz.tagline && <div className="text-xs" style={{ color: '#e2962c' }}>{biz.tagline}</div>}
              <div className="text-xs text-ink-soft">{[biz.phone, biz.address].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs font-medium" style={{ color: '#2f8f5b' }}>✅ Saved on this device</span>
            <button className="text-xs underline text-stamp-blue" onClick={() => setEditingBiz(true)}>✏️ Edit</button>
            <button className="text-xs underline" style={{ color: '#cc4444' }} onClick={clearProfile}>🗑️ Clear</button>
          </div>
        </div>
      ) : (
        // Business form
        <div className="mb-6">
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
            🏢 Your Business
            <span className="text-xs font-normal text-ink-soft">(saved to this device)</span>
          </h3>
          <p className="text-xs text-ink-soft mb-3">Fill in once — your details will be remembered on this device for future invoices.</p>

          {/* Logo upload */}
          <div className="flex items-center gap-4 mb-4">
            {logo && <img src={logo} alt="Logo" className="rounded-lg object-contain" style={{ width: 56, height: 56, border: '1px solid #e2dcc9' }} />}
            <div>
              <button className="btn-ghost-sm" onClick={() => fileInputRef.current?.click()}>
                {logo ? '🔄 Change logo' : '📁 Upload logo (optional)'}
              </button>
              {logo && <button className="btn-ghost-sm ml-2" onClick={() => { setLogo(null); setLogoBytes(null); }}>✕ Remove</button>}
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogo} />
              <p className="text-xs text-ink-soft mt-1">Optional — JPG or PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div><label className={lbl}>Business Name *</label><input className={inputCls} style={inputSty} placeholder="OBG Noble Laundry" value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })} /></div>
            <div><label className={lbl}>Tagline</label><input className={inputCls} style={inputSty} placeholder="Clean Clothes, Happy You." value={biz.tagline} onChange={e => setBiz({ ...biz, tagline: e.target.value })} /></div>
            <div><label className={lbl}>Address</label><input className={inputCls} style={inputSty} placeholder="Kajola, Sagamu" value={biz.address} onChange={e => setBiz({ ...biz, address: e.target.value })} /></div>
            <div><label className={lbl}>Phone</label><input className={inputCls} style={inputSty} placeholder="+234 800 000 0000" value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={lbl}>Email</label><input className={inputCls} style={inputSty} placeholder="you@example.com" value={biz.email} onChange={e => setBiz({ ...biz, email: e.target.value })} /></div>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-primary text-sm py-2 px-4"
              onClick={saveProfile}
            >
              💾 Save my business details
            </button>
            {savedBiz && (
              <button className="btn-ghost-sm" onClick={() => setEditingBiz(false)}>Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENT DETAILS ── */}
      <div className="mb-6">
        <h3 className="font-semibold text-ink mb-3">👤 Client Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className={lbl}>Client Name *</label><input className={inputCls} style={inputSty} placeholder="Mr Jacob" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} /></div>
          <div><label className={lbl}>Address</label><input className={inputCls} style={inputSty} placeholder="Sagamu" value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} /></div>
          <div><label className={lbl}>Email</label><input className={inputCls} style={inputSty} placeholder="client@example.com" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div><label className={lbl}>Invoice #</label><input className={inputCls} style={inputSty} value={invoice.number} onChange={e => setInvoice({ ...invoice, number: e.target.value })} /></div>
        <div><label className={lbl}>Date</label><input type="date" className={inputCls} style={inputSty} value={invoice.date} onChange={e => setInvoice({ ...invoice, date: e.target.value })} /></div>
        <div><label className={lbl}>Due Date</label><input type="date" className={inputCls} style={inputSty} value={invoice.dueDate} onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
        <div>
          <label className={lbl}>Currency</label>
          <select className={inputCls} style={inputSty} value={invoice.currency} onChange={e => setInvoice({ ...invoice, currency: e.target.value })}>
            {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={inputCls} style={inputSty} value={invoice.status} onChange={e => setInvoice({ ...invoice, status: e.target.value })}>
            {['Pending', 'Paid', 'Overdue', 'Draft'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <h3 className="font-semibold text-ink mb-3">📋 Items</h3>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '3fr 1fr 1.5fr auto' }}>
              <input className={inputCls} style={inputSty} placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <input className={inputCls} style={inputSty} placeholder="Qty" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
              <input className={inputCls} style={inputSty} placeholder={`Unit price (${sym})`} type="number" min="0" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
              <button onClick={() => removeItem(i)} className="text-red-400 font-mono text-lg px-2" disabled={items.length === 1}>×</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="btn-ghost-sm mt-2">+ Add item</button>
      </div>

      {/* Totals preview */}
      <div className="rounded-xl p-4 mb-6" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
        <div className="flex justify-between text-sm mb-1"><span className="text-ink-soft">Subtotal</span><span>{sym}{calcSubtotal().toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
        <div className="flex gap-4 mb-2">
          <div className="flex items-center gap-2"><span className="text-sm text-ink-soft">Discount (%)</span><input type="number" min="0" max="100" className="border rounded px-2 py-1 text-sm w-20" style={{ borderColor: '#e2dcc9' }} placeholder="0" value={invoice.discount} onChange={e => setInvoice({ ...invoice, discount: e.target.value })} /></div>
          <div className="flex items-center gap-2"><span className="text-sm text-ink-soft">Tax (%)</span><input type="number" min="0" max="100" className="border rounded px-2 py-1 text-sm w-20" style={{ borderColor: '#e2dcc9' }} placeholder="0" value={invoice.tax} onChange={e => setInvoice({ ...invoice, tax: e.target.value })} /></div>
        </div>
        <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '2px solid #e2962c', color: '#e2962c' }}>
          <span>TOTAL DUE</span><span>{sym}{calcTotal().toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Payment methods */}
      <div className="mb-6">
        <h3 className="font-semibold text-ink mb-3">💳 Payment Methods</h3>
        <div className="flex gap-4 flex-wrap mb-4">
          {[['cash', 'Cash'], ['bankTransfer', 'Bank Transfer'], ['pos', 'POS'], ['ussd', 'USSD']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={invoice.paymentMethods[key]} onChange={e => setInvoice({ ...invoice, paymentMethods: { ...invoice.paymentMethods, [key]: e.target.checked } })} />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className={lbl}>Bank Name</label><input className={inputCls} style={inputSty} placeholder="First Bank of Nigeria" value={invoice.bankName} onChange={e => setInvoice({ ...invoice, bankName: e.target.value })} /></div>
          <div><label className={lbl}>Account Name</label><input className={inputCls} style={inputSty} placeholder="OBG Noble Laundry" value={invoice.bankAccountName} onChange={e => setInvoice({ ...invoice, bankAccountName: e.target.value })} /></div>
          <div><label className={lbl}>Account Number</label><input className={inputCls} style={inputSty} placeholder="2034025678" value={invoice.bankAccount} onChange={e => setInvoice({ ...invoice, bankAccount: e.target.value })} /></div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className={lbl}>Notes</label>
        <textarea className={inputCls} style={{ ...inputSty, minHeight: '60px', resize: 'vertical' }} value={invoice.notes} onChange={e => setInvoice({ ...invoice, notes: e.target.value })} />
      </div>

      <p className="text-xs text-ink-soft mb-4">
        💡 Currency shows as <strong>{invoice.currency}</strong> in the PDF for maximum compatibility on all devices and PDF viewers.
      </p>

      {error && <div className="status error mb-3">{error}</div>}

      <div className="actions flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
          {busy ? 'Generating…' : 'Generate Invoice PDF'}
        </button>
        {downloadedBlob && (
          <button
            className="btn btn-ghost flex items-center gap-2"
            onClick={shareWhatsApp}
            style={{ background: '#25D366', color: 'white', border: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.144.566 4.148 1.546 5.879L.057 23.405a.5.5 0 0 0 .612.612l5.526-1.489A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.205-1.428l-.373-.221-3.878 1.046 1.046-3.878-.221-.373A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Share on WhatsApp
          </button>
        )}
      </div>

      <p className="privacy-note mt-4">Generated entirely in your browser — nothing is uploaded or stored.</p>
    </div>
  );
}
