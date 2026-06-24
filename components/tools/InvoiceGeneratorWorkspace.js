'use client';

import { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR'];
const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' };
const STORAGE_KEY = 'convertam_biz_profile_v2';

function sym(c) { return CURRENCY_SYMBOLS[c] || c; }
const emptyItem = () => ({ description: '', quantity: '1', unitPrice: '' });
function autoInvNum() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  return `INV-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}
function getInitials(name) {
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}
function fmt(num, currency) {
  return sym(currency) + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── INVOICE TEMPLATE (rendered in DOM, captured as image) ──
function InvoiceTemplate({ biz, client, invoice, items, logo, subtotal, discountAmt, taxAmt, total }) {
  const amber = '#E2962C';
  const dark = '#161E38';
  const gray = '#666';

  const paymentLabels = {
    cash: { label: 'Cash', icon: '💵' },
    bankTransfer: { label: 'Bank Transfer', icon: '🏦' },
    pos: { label: 'POS', icon: '💳' },
    ussd: { label: 'USSD', icon: '📱' },
  };

  const activeMethods = [
    { label: 'Cash', icon: '💵' },
    { label: 'Bank Transfer', icon: '🏦' },
    { label: 'POS', icon: '💳' },
    { label: 'USSD', icon: '📱' },
  ];

  const hasBankDetails = invoice.bankName || invoice.bankAccount || invoice.bankAccountName;

  return (
    <div id="invoice-template" style={{
      width: 794, background: 'white', fontFamily: 'Arial, Helvetica, sans-serif',
      color: dark, position: 'absolute', left: '-9999px', top: 0,
    }}>
      {/* Top amber bar */}
      <div style={{ background: amber, height: 10, width: '100%' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 40px 10px' }}>
        {/* Left: Logo + Business */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {logo && <img src={logo} alt="logo" style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 8 }} />}
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: dark, letterSpacing: 1 }}>{biz.name.toUpperCase()}</div>
            {biz.tagline && <div style={{ color: amber, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{biz.tagline}</div>}
            {biz.address && <div style={{ fontSize: 10, color: gray, display: 'flex', alignItems: 'center', gap: 4 }}>📍 {biz.address}</div>}
            {biz.phone && <div style={{ fontSize: 10, color: gray, display: 'flex', alignItems: 'center', gap: 4 }}>📞 {biz.phone}</div>}
            {biz.email && <div style={{ fontSize: 10, color: gray, display: 'flex', alignItems: 'center', gap: 4 }}>✉️ {biz.email}</div>}
          </div>
        </div>

        {/* Right: INVOICE label + meta */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: amber, letterSpacing: 2 }}>INVOICE</div>
          <table style={{ marginLeft: 'auto', fontSize: 10, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Invoice No.', invoice.number],
                ['Invoice Date', invoice.date],
                ...(invoice.dueDate ? [['Due Date', invoice.dueDate]] : []),
                ['Status', invoice.status],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ fontWeight: 700, color: gray, paddingRight: 8, paddingBottom: 3 }}>{label}</td>
                  <td style={{ color: dark, paddingBottom: 3 }}>: {value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amber divider */}
      <div style={{ height: 2, background: amber, margin: '0 40px' }} />

      {/* Bill To + Thank You */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 40px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div>
            <div style={{ color: amber, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>BILL TO</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: dark }}>{client.name}</div>
            {client.address && <div style={{ fontSize: 10, color: gray }}>{client.address}</div>}
            {client.email && <div style={{ fontSize: 10, color: gray }}>{client.email}</div>}
          </div>
        </div>

        {/* Thank you box */}
        <div style={{ border: `1.5px solid ${amber}`, borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 10, alignItems: 'center', maxWidth: 220 }}>
          <div style={{ width: 36, height: 36, border: `2px solid ${amber}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: dark }}>Thank you for your business!</div>
            <div style={{ fontSize: 10, color: gray }}>We appreciate your patronage.</div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ margin: '0 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: dark, color: 'white' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: 30 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>DESCRIPTION</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>QTY</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: 120 }}>RATE</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: 120 }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(i => i.description).map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unitPrice) || 0;
              return (
                <tr key={idx} style={{ background: idx % 2 === 1 ? '#f7f7f7' : 'white' }}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{item.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{qty}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmt(price, invoice.currency)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmt(qty * price, invoice.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes + Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 40px', gap: 20 }}>
        {/* Notes */}
        <div style={{ flex: 1 }}>
          {invoice.notes && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, border: `2px solid ${amber}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <span style={{ color: amber, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>NOTES</span>
              </div>
              <div style={{ fontSize: 10, color: gray, marginLeft: 34 }}>{invoice.notes}</div>
            </>
          )}
        </div>

        {/* Totals */}
        <div style={{ minWidth: 260 }}>
          {[
            ['Subtotal', subtotal],
            ...(discountAmt > 0 ? [[`Discount (${invoice.discount}%)`, -discountAmt]] : []),
            [`Tax (${invoice.tax || 0}%)`, taxAmt],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingBottom: 6, borderBottom: '1px dashed #eee', marginBottom: 6 }}>
              <span style={{ color: gray }}>{label}</span>
              <span style={{ color: dark }}>{fmt(Math.abs(value), invoice.currency)}</span>
            </div>
          ))}
          <div style={{ background: amber, borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>TOTAL DUE</span>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{fmt(total, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {/* Payment Methods + Bank Details */}
      {(activeMethods.length > 0 || hasBankDetails) && (
        <div style={{ display: 'flex', gap: 12, margin: '0 40px 16px', }}>
          {activeMethods.length > 0 && (
            <div style={{ flex: 1, border: `1px solid #eee`, borderRadius: 8, padding: '10px 14px', background: '#fafafa' }}>
              <div style={{ color: amber, fontWeight: 700, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>PAYMENT METHODS</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {activeMethods.map(({ label, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: dark }}>
                    <span style={{ fontSize: 16 }}>{icon}</span> {label}
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasBankDetails && (
            <div style={{ flex: 1, border: `1px solid #eee`, borderRadius: 8, padding: '10px 14px', background: '#fafafa' }}>
              <div style={{ color: amber, fontWeight: 700, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>BANK DETAILS</div>
              {invoice.bankName && <div style={{ fontSize: 10, color: dark, marginBottom: 3 }}>Bank Name &nbsp;&nbsp;&nbsp;: {invoice.bankName}</div>}
              {invoice.bankAccountName && <div style={{ fontSize: 10, color: dark, marginBottom: 3 }}>Account Name : {invoice.bankAccountName}</div>}
              {invoice.bankAccount && <div style={{ fontSize: 10, color: dark }}>Account No. &nbsp;: {invoice.bankAccount}</div>}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ background: dark, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${amber}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{ color: amber, fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>Thank You!</div>
              <div style={{ color: '#aaa', fontSize: 9 }}>We look forward to serving you again.</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {biz.phone && <div style={{ color: '#ccc', fontSize: 10, marginBottom: 3 }}>📞 {biz.phone}</div>}
          {biz.email && <div style={{ color: '#ccc', fontSize: 10, marginBottom: 3 }}>✉️ {biz.email}</div>}
          {biz.address && <div style={{ color: '#ccc', fontSize: 10 }}>📍 {biz.address}</div>}
        </div>
      </div>

      {/* Bottom tag */}
      <div style={{ textAlign: 'center', padding: '6px', fontSize: 8, color: '#aaa' }}>
        Generated by convertam.app
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function InvoiceGeneratorWorkspace() {
  const [savedBiz, setSavedBiz] = useState(null);
  const [editingBiz, setEditingBiz] = useState(false);
  const [logo, setLogo] = useState(null);
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
    paymentMethods: { cash: true, bankTransfer: true, pos: true, ussd: true },
    bankName: '', bankAccount: '', bankAccountName: '',
    status: 'Pending',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);
  const [lastBlob, setLastBlob] = useState(null);
  const [lastFilename, setLastFilename] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setSavedBiz(p);
        if (p.biz) setBiz(p.biz);
        if (p.logo) setLogo(p.logo);
        if (p.invoice) setInvoice(prev => ({ ...prev, ...p.invoice, number: prev.number, date: prev.date, dueDate: '', status: 'Pending', notes: prev.notes, paymentMethods: p.invoice.paymentMethods || { cash: true, bankTransfer: true, pos: true, ussd: true } }));
      }
    } catch {}
  }, []);

  function saveProfile() {
    if (!biz.name) { setError('Please enter your business name first.'); return; }
    const profile = { biz, logo, invoice: { currency: invoice.currency, paymentMethods: invoice.paymentMethods, bankName: invoice.bankName, bankAccount: invoice.bankAccount, bankAccountName: invoice.bankAccountName } };
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
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  function updateItem(i, field, value) {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity)||0) * (parseFloat(i.unitPrice)||0), 0);
  const discountAmt = subtotal * ((parseFloat(invoice.discount)||0) / 100);
  const taxAmt = (subtotal - discountAmt) * ((parseFloat(invoice.tax)||0) / 100);
  const total = subtotal - discountAmt + taxAmt;

  async function handleGenerate() {
    if (!biz.name || !client.name || items.every(i => !i.description)) {
      setError('Please fill in your business name, client name, and at least one item.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Wait for template to render
      await new Promise(r => setTimeout(r, 300));

      const el = document.getElementById('invoice-template');
      if (!el) throw new Error('Template not found');

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
      });

      const imgData = canvas.toDataURL('image/png');

      // Wrap in PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([canvas.width / 2, canvas.height / 2]);
      const img = await pdfDoc.embedPng(imgData);
      page.drawImage(img, { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fname = `Invoice-${invoice.number}-${client.name}.pdf`;
      downloadBlob(blob, fname);
      setLastBlob(blob);
      setLastFilename(fname);
      setGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Could not generate invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!lastBlob || !lastFilename) return;

    // Try native share (works on mobile — shows all apps including WhatsApp, Telegram, Gmail etc.)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([lastBlob], lastFilename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice #${invoice.number} from ${biz.name}`,
            text: `Hello ${client.name},\n\nPlease find attached your invoice #${invoice.number} from ${biz.name}.\n\nTotal Due: ${fmt(total, invoice.currency)}\n\nGenerated via convertam.app`,
            files: [file],
          });
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
        return;
      }
    }

    // Fallback for desktop — copy message to clipboard
    try {
      await navigator.clipboard.writeText(
        `Hello ${client.name},\n\nPlease find attached your invoice #${invoice.number} from ${biz.name}.\n\nTotal Due: ${fmt(total, invoice.currency)}\n\nGenerated via convertam.app`
      );
      alert('Message copied! Open WhatsApp or any app, find your contact, attach the downloaded PDF, and paste this message.');
    } catch {
      alert('To share: open WhatsApp or any app, find your contact, attach the downloaded PDF from your downloads folder.');
    }
  }

  const s = sym(invoice.currency);
  const ic = inputCls => 'w-full border rounded-lg px-3 py-2 text-sm';
  const is = { borderColor: '#e2dcc9', background: '#fffefb' };
  const lb = 'text-xs font-medium text-ink-soft block mb-1';

  return (
    <>
      {/* Hidden invoice template rendered in DOM */}
      <InvoiceTemplate
        biz={biz} client={client} invoice={invoice}
        items={items} logo={logo}
        subtotal={subtotal} discountAmt={discountAmt}
        taxAmt={taxAmt} total={total}
      />

      <div className="panel">
        {/* Business profile */}
        {savedBiz && !editingBiz ? (
          <div className="rounded-xl p-4 mb-6 flex items-center justify-between gap-4" style={{ background: '#f0f5ff', border: '1.5px solid #3a63b8' }}>
            <div className="flex items-center gap-3">
              {logo
                ? <img src={logo} alt="logo" className="rounded-lg object-contain flex-shrink-0" style={{ width: 44, height: 44 }} />
                : <div className="rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0" style={{ width: 44, height: 44, background: '#3a63b8', fontSize: 14 }}>{getInitials(biz.name)}</div>
              }
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
          <div className="mb-6">
            <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">🏢 Your Business <span className="text-xs font-normal text-ink-soft">(saved to this device)</span></h3>
            <p className="text-xs text-ink-soft mb-3">Fill in once — remembered for future invoices on this device.</p>
            <div className="flex items-center gap-4 mb-4">
              {logo && <img src={logo} alt="Logo" className="rounded-lg object-contain" style={{ width: 56, height: 56, border: '1px solid #e2dcc9' }} />}
              <div>
                <button className="btn-ghost-sm" onClick={() => fileInputRef.current?.click()}>{logo ? '🔄 Change logo' : '📁 Upload logo (optional)'}</button>
                {logo && <button className="btn-ghost-sm ml-2" onClick={() => setLogo(null)}>✕ Remove</button>}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogo} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div><label className={lb}>Business Name *</label><input className={ic()} style={is} placeholder="OBG Noble Laundry" value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })} /></div>
              <div><label className={lb}>Tagline</label><input className={ic()} style={is} placeholder="Clean Clothes, Happy You." value={biz.tagline} onChange={e => setBiz({ ...biz, tagline: e.target.value })} /></div>
              <div><label className={lb}>Address</label><input className={ic()} style={is} placeholder="Kajola, Sagamu" value={biz.address} onChange={e => setBiz({ ...biz, address: e.target.value })} /></div>
              <div><label className={lb}>Phone</label><input className={ic()} style={is} placeholder="+234 800 000 0000" value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={lb}>Email</label><input className={ic()} style={is} placeholder="you@example.com" value={biz.email} onChange={e => setBiz({ ...biz, email: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary text-sm py-2 px-4" onClick={saveProfile}>💾 Save my business details</button>
              {savedBiz && <button className="btn-ghost-sm" onClick={() => setEditingBiz(false)}>Cancel</button>}
            </div>
          </div>
        )}

        {/* Client */}
        <div className="mb-6">
          <h3 className="font-semibold text-ink mb-3">👤 Client Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lb}>Client Name *</label><input className={ic()} style={is} placeholder="Mr Jacob" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} /></div>
            <div><label className={lb}>Address</label><input className={ic()} style={is} placeholder="Sagamu" value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} /></div>
            <div><label className={lb}>Email</label><input className={ic()} style={is} placeholder="client@example.com" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div><label className={lb}>Invoice #</label><input className={ic()} style={is} value={invoice.number} onChange={e => setInvoice({ ...invoice, number: e.target.value })} /></div>
          <div><label className={lb}>Date</label><input type="date" className={ic()} style={is} value={invoice.date} onChange={e => setInvoice({ ...invoice, date: e.target.value })} /></div>
          <div><label className={lb}>Due Date</label><input type="date" className={ic()} style={is} value={invoice.dueDate} onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
          <div><label className={lb}>Currency</label>
            <select className={ic()} style={is} value={invoice.currency} onChange={e => setInvoice({ ...invoice, currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
            </select>
          </div>
          <div><label className={lb}>Status</label>
            <select className={ic()} style={is} value={invoice.status} onChange={e => setInvoice({ ...invoice, status: e.target.value })}>
              {['Pending','Paid','Overdue','Draft'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <h3 className="font-semibold text-ink mb-3">📋 Items</h3>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '3fr 1fr 1.5fr auto' }}>
                <input className={ic()} style={is} placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input className={ic()} style={is} placeholder="Qty" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input className={ic()} style={is} placeholder={`Unit price (${s})`} type="number" min="0" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                <button onClick={() => items.length > 1 && setItems(items.filter((_,idx) => idx !== i))} className="text-red-400 font-mono text-lg px-2" disabled={items.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setItems([...items, emptyItem()])} className="btn-ghost-sm mt-2">+ Add item</button>
        </div>

        {/* Totals preview */}
        <div className="rounded-xl p-4 mb-6" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <div className="flex justify-between text-sm mb-2"><span className="text-ink-soft">Subtotal</span><span>{s}{subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex gap-4 mb-2 flex-wrap">
            <div className="flex items-center gap-2"><span className="text-sm text-ink-soft">Discount (%)</span><input type="number" min="0" max="100" className="border rounded px-2 py-1 text-sm w-20" style={{ borderColor: '#e2dcc9' }} placeholder="0" value={invoice.discount} onChange={e => setInvoice({ ...invoice, discount: e.target.value })} /></div>
            <div className="flex items-center gap-2"><span className="text-sm text-ink-soft">Tax (%)</span><input type="number" min="0" max="100" className="border rounded px-2 py-1 text-sm w-20" style={{ borderColor: '#e2dcc9' }} placeholder="0" value={invoice.tax} onChange={e => setInvoice({ ...invoice, tax: e.target.value })} /></div>
          </div>
          <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '2px solid #e2962c', color: '#e2962c' }}>
            <span>TOTAL DUE</span><span>{s}{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mb-6">
          <h3 className="font-semibold text-ink mb-3">💳 Bank Details <span className="text-xs font-normal text-ink-soft">(all payment methods shown on invoice)</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lb}>Bank Name</label><input className={ic()} style={is} placeholder="First Bank of Nigeria" value={invoice.bankName} onChange={e => setInvoice({ ...invoice, bankName: e.target.value })} /></div>
            <div><label className={lb}>Account Name</label><input className={ic()} style={is} placeholder="OBG Noble Laundry" value={invoice.bankAccountName} onChange={e => setInvoice({ ...invoice, bankAccountName: e.target.value })} /></div>
            <div><label className={lb}>Account Number</label><input className={ic()} style={is} placeholder="2034025678" value={invoice.bankAccount} onChange={e => setInvoice({ ...invoice, bankAccount: e.target.value })} /></div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className={lb}>Notes</label>
          <textarea className={ic()} style={{ ...is, minHeight: '60px', resize: 'vertical' }} value={invoice.notes} onChange={e => setInvoice({ ...invoice, notes: e.target.value })} />
        </div>

        {error && <div className="status error mb-3">{error}</div>}

        <div className="actions flex-wrap gap-3">
          <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
            {busy ? '⏳ Generating…' : '📄 Generate Invoice PDF'}
          </button>
          {generated && (
            <button
              className="btn flex items-center gap-2"
              onClick={handleShare}
              style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 600 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share Invoice
            </button>
          )}
        </div>
        <p className="privacy-note mt-4">Generated entirely in your browser — nothing is uploaded or stored.</p>
      </div>
    </>
  );
}
