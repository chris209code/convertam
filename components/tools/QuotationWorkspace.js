'use client';

import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QuotationPreview, { computeTotals, formatMoney } from './QuotationPreview';

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

const CURRENCIES = [
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { code: 'KES', label: 'KES - Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR - South African Rand' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
];

let nextItemId = 2;

export default function QuotationWorkspace() {
  const [business, setBusiness] = useState({ name: '', tagline: '', phone: '', email: '', address: '', logo: null });
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [quote, setQuote] = useState({
    number: 'QUO-001', // preserves the existing default quotation-number behavior
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: '', currency: 'NGN', vat: 7.5, discountType: 'none', discountValue: 0,
  });
  const [items, setItems] = useState([{ id: 1, description: '', qty: 1, rate: '' }]);
  const [terms, setTerms] = useState('This quotation is valid until the date stated above.\nPayment to be made in full before project commencement.');
  const [notes, setNotes] = useState('Thank you for considering our business.\nWe look forward to working with you.');
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'customer' — pure UI toggle, no persistence, no shareable link
  const [pulse, setPulse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);
  const printRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  // "Totals pulse" — a brief dirty-state flag set on any change and cleared
  // after ~420ms, matching the approved design's animation spec.
  function triggerPulse() {
    setPulse(true);
    clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 420);
  }
  useEffect(() => () => clearTimeout(pulseTimeoutRef.current), []);

  function updateBusiness(key, val) { setBusiness((b) => ({ ...b, [key]: val })); triggerPulse(); }
  function updateCustomer(key, val) { setCustomer((c) => ({ ...c, [key]: val })); triggerPulse(); }
  function updateQuote(key, val) { setQuote((q) => ({ ...q, [key]: val })); triggerPulse(); }
  function updateItem(id, key, val) { setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: val } : item))); triggerPulse(); }
  function addItem() { setItems((prev) => [...prev, { id: nextItemId++, description: '', qty: 1, rate: '' }]); triggerPulse(); }
  function removeItem(id) { setItems((prev) => prev.filter((item) => item.id !== id)); triggerPulse(); }

  function handleLogoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBusiness('logo', reader.result);
    reader.readAsDataURL(file);
  }

  function handleResetForm() {
    setBusiness({ name: '', tagline: '', phone: '', email: '', address: '', logo: null });
    setCustomer({ name: '', phone: '', email: '', address: '' });
    setQuote({ number: 'QUO-001', issueDate: new Date().toISOString().split('T')[0], validUntil: '', currency: 'NGN', vat: 7.5, discountType: 'none', discountValue: 0 });
    setItems([{ id: 1, description: '', qty: 1, rate: '' }]);
    setTerms('');
    setNotes('');
    setStatus('');
  }

  function handlePrint() {
    window.print();
  }

  const { subtotal, vatAmount, discountAmount, grandTotal } = computeTotals(items, quote.vat, quote.discountType, quote.discountValue);

  // Builds the PDF and returns its raw bytes — no download/share side
  // effect here, so this one function is the single source used by both
  // the Download button and the real file-sharing path below.
  async function buildPdfBytes() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { width, height } = page.getSize();

      const blue = rgb(0.145, 0.396, 0.918);
      const emerald = rgb(0.063, 0.725, 0.506);
      const navy = rgb(0.059, 0.09, 0.157);
      const dark = rgb(0.071, 0.078, 0.102);
      const gray = rgb(0.42, 0.44, 0.53);
      const lightGray = rgb(0.965, 0.969, 0.976);
      const white = rgb(1, 1, 1);
      const margin = 40;
      let y = height - 50;

      // Header: logo + business name/tagline (left), QUOTATION + number pill (right).
      // No thick colored header bar — matches the approved design's sparse use of color.
      if (business.logo) {
        try {
          const isPng = business.logo.startsWith('data:image/png');
          const imgBytes = Uint8Array.from(atob(business.logo.split(',')[1]), (c) => c.charCodeAt(0));
          const embedded = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(embedded, { x: margin, y: y - 36, width: 40, height: 40 });
        } catch { /* logo embed is best-effort — an unsupported image format should never block PDF generation */ }
      }
      const nameX = business.logo ? margin + 50 : margin;
      page.drawText(business.name || 'Your Business Name', { x: nameX, y: y - 8, size: 17, font: bold, color: dark });
      if (business.tagline) page.drawText(business.tagline, { x: nameX, y: y - 24, size: 10, font, color: emerald });

      page.drawText('QUOTATION', { x: width - margin - 140, y: y - 4, size: 16, font: bold, color: navy });
      page.drawRectangle({ x: width - margin - 100, y: y - 24, width: 100, height: 16, color: rgb(0.937, 0.957, 1) });
      page.drawText(quote.number || 'QUO-001', { x: width - margin - 92, y: y - 20, size: 9, font: bold, color: blue });

      y -= 55;
      const contactLine = [business.phone, business.email, business.address].filter(Boolean).join('   ·   ');
      if (contactLine) { page.drawText(contactLine, { x: margin, y, size: 9, font, color: gray }); y -= 16; }

      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.914, 0.922, 0.937) });
      y -= 24;

      // Prepared For (left) + Issue/Valid dates + Total callout (right)
      const blockTop = y;
      page.drawText('PREPARED FOR', { x: margin, y, size: 8, font: bold, color: emerald });
      y -= 15;
      page.drawText(customer.name || 'Client Name', { x: margin, y, size: 12, font: bold, color: dark });
      y -= 15;
      [customer.phone, customer.email, customer.address].filter(Boolean).forEach((line) => {
        page.drawText(line, { x: margin, y, size: 9, font, color: gray });
        y -= 13;
      });

      let ry = blockTop;
      page.drawText(`Issue Date: ${quote.issueDate || '-'}`, { x: width - margin - 160, y: ry, size: 9, font, color: gray });
      ry -= 14;
      page.drawText(`Valid Until: ${quote.validUntil || '-'}`, { x: width - margin - 160, y: ry, size: 9, font, color: gray });
      ry -= 18;
      page.drawRectangle({ x: width - margin - 160, y: ry - 34, width: 160, height: 40, color: lightGray });
      page.drawText('Total Amount', { x: width - margin - 150, y: ry - 12, size: 8, font, color: gray });
      page.drawText(formatMoney(grandTotal, quote.currency), { x: width - margin - 150, y: ry - 27, size: 14, font: bold, color: emerald });

      y = Math.min(y, ry - 50) - 20;

      // Items table — dark navy header row only (thin), not a full-width block.
      page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 20, color: navy });
      page.drawText('#', { x: margin + 8, y: y + 2, size: 9, font: bold, color: white });
      page.drawText('Description', { x: margin + 28, y: y + 2, size: 9, font: bold, color: white });
      page.drawText('Qty', { x: width - margin - 190, y: y + 2, size: 9, font: bold, color: white });
      page.drawText('Rate', { x: width - margin - 140, y: y + 2, size: 9, font: bold, color: white });
      page.drawText('Amount', { x: width - margin - 75, y: y + 2, size: 9, font: bold, color: white });
      y -= 24;

      items.forEach((item, idx) => {
        const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
        page.drawText(String(idx + 1), { x: margin + 8, y, size: 9, font, color: gray });
        page.drawText(item.description || 'Item description', { x: margin + 28, y, size: 9, font: bold, color: dark, maxWidth: width - margin * 2 - 220 });
        page.drawText(String(item.qty || 0), { x: width - margin - 190, y, size: 9, font, color: dark });
        page.drawText((parseFloat(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), { x: width - margin - 140, y, size: 9, font, color: dark });
        page.drawText(amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), { x: width - margin - 75, y, size: 9, font, color: dark });
        y -= 20;
        if (idx < items.length - 1) page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: width - margin, y: y + 8 }, thickness: 0.5, color: rgb(0.94, 0.945, 0.953) });
      });

      y -= 16;
      const totalsX = width - margin - 200;
      [['Subtotal', subtotal, false], [`VAT (${quote.vat || 0}%)`, vatAmount, false], ['Discount', discountAmount, false]].forEach(([label, val]) => {
        page.drawText(label, { x: totalsX, y, size: 9, font, color: gray });
        page.drawText(formatMoney(val, quote.currency), { x: width - margin - 90, y, size: 9, font, color: dark });
        y -= 15;
      });
      page.drawLine({ start: { x: totalsX, y: y + 6 }, end: { x: width - margin, y: y + 6 }, thickness: 1, color: rgb(0.914, 0.922, 0.937) });
      y -= 10;
      page.drawText('Grand Total', { x: totalsX, y, size: 11, font: bold, color: blue });
      page.drawText(formatMoney(grandTotal, quote.currency), { x: width - margin - 100, y, size: 11, font: bold, color: blue });

      y -= 30;
      const termsLines = (terms || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const notesLines = (notes || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (termsLines.length) {
        page.drawText('TERMS & CONDITIONS', { x: margin, y, size: 8, font: bold, color: emerald });
        y -= 14;
        termsLines.forEach((line) => { page.drawText(`• ${line}`, { x: margin, y, size: 8, font, color: gray, maxWidth: 250 }); y -= 13; });
      }
      let notesY = y + (termsLines.length ? termsLines.length * 13 + 14 : 0);
      if (notesLines.length) {
        page.drawText('NOTES', { x: width / 2 + 10, y: notesY, size: 8, font: bold, color: emerald });
        notesY -= 14;
        notesLines.forEach((line) => { page.drawText(line, { x: width / 2 + 10, y: notesY, size: 8, font, color: gray, maxWidth: 250 }); notesY -= 13; });
      }

      page.drawText('Generated with Convertam · convertam.app', { x: width / 2 - 90, y: 20, size: 7, font, color: rgb(0.7, 0.7, 0.7) });

    return pdfDoc.save();
  }

  async function handleGenerate() {
    setBusy(true);
    setStatus('');
    try {
      const bytes = await buildPdfBytes();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `Quotation-${quote.number || 'QUO-001'}.pdf`);
      setStatus('✅ Quotation downloaded successfully!');
    } catch (err) {
      console.error(err);
      setStatus('❌ Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Shares the actual generated PDF as a file via the Web Share API, where
  // the browser/device supports sharing files at all. Where it doesn't,
  // this falls back to downloading the PDF and tells the person plainly to
  // attach it manually — never a fake "link" that would open a blank form
  // for whoever receives it.
  async function handleSharePdf() {
    setBusy(true);
    setStatus('');
    try {
      const bytes = await buildPdfBytes();
      const filename = `Quotation-${quote.number || 'QUO-001'}.pdf`;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const file = new File([blob], filename, { type: 'application/pdf' });

      const canShareFile = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({ files: [file], title: `Quotation ${quote.number || ''}`.trim() });
        setStatus('✅ Quotation shared successfully!');
      } else {
        downloadBlob(blob, filename);
        setStatus('File sharing isn\'t supported on this browser/device — the PDF has been downloaded instead. Please attach it manually to share it.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') { setStatus(''); return; } // the person cancelled the native share sheet — not an error
      console.error(err);
      setStatus('❌ Could not share the PDF. Please try downloading it instead.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #DDE1E7', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
  const cardStyle = { background: 'white', borderRadius: 16, padding: 22, boxShadow: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.05)' };

  return (
    <div style={{ background: '#F6F7F9', minHeight: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .quotation-editor-col { flex: 1 1 420px; min-width: 340px; max-width: 560px; }
        .quotation-preview-col { flex: 2 1 560px; min-width: 380px; }
        @media (max-width: 860px) {
          .quotation-editor-col, .quotation-preview-col { max-width: 100%; flex-basis: 100%; }
        }
        @media print {
          .quotation-no-print { display: none !important; }
          .quotation-print-only { display: block !important; }
        }
        .quotation-print-only { display: none; }
      `}</style>

      {/* Header */}
      <div className="quotation-no-print" style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid #E9EBEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>C</div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Convertam</span>
            <span style={{ fontSize: 12, color: '#8A8F98', marginLeft: 8 }}>Quotation Generator</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} /> All changes saved
          </span>
          <button onClick={() => setViewMode((m) => (m === 'edit' ? 'customer' : 'edit'))} style={{ background: 'white', border: '1px solid #DDE1E7', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {viewMode === 'edit' ? '👁 Preview as Customer' : '✏️ Back to Editor'}
          </button>
          <button onClick={handleGenerate} disabled={busy} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,.25), 0 6px 16px rgba(37,99,235,.22)' }}>
            {busy ? 'Generating…' : '⬇ Download PDF'}
          </button>
          <button onClick={handleSharePdf} disabled={busy} style={{ background: 'white', border: '1px solid #DDE1E7', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>📤 Share PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: 24, maxWidth: 1680, margin: '0 auto', flexWrap: 'wrap' }}>
        {/* Editor column */}
        {viewMode === 'edit' && (
          <div className="quotation-editor-col quotation-no-print" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>Create Quotation</p>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: 0 }}>Enter your details and items. Preview updates in real time.</p>
            </div>

            {/* Business Information */}
            <div style={cardStyle}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Business Information</p>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={labelStyle}>Business Name</label>
                  <input style={inputStyle} value={business.name} onChange={(e) => updateBusiness('name', e.target.value)} placeholder="Your Business Ltd." />
                  <label style={{ ...labelStyle, marginTop: 10 }}>Tagline (optional)</label>
                  <input style={inputStyle} value={business.tagline} onChange={(e) => updateBusiness('tagline', e.target.value)} placeholder="A short tagline" />
                </div>
                <div>
                  <label style={labelStyle}>Logo</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); handleLogoFile(e.dataTransfer.files?.[0]); }}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ width: 84, height: 84, borderRadius: '50%', border: '1.5px dashed #DDE1E7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', textAlign: 'center' }}
                  >
                    {business.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={business.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: '#8A8F98', padding: 4 }}>Upload logo</span>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleLogoFile(e.target.files?.[0])} style={{ display: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={business.phone} onChange={(e) => updateBusiness('phone', e.target.value)} /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} value={business.email} onChange={(e) => updateBusiness('email', e.target.value)} /></div>
              </div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={business.address} onChange={(e) => updateBusiness('address', e.target.value)} />
            </div>

            {/* Customer Information */}
            <div style={cardStyle}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Customer Information</p>
              <label style={labelStyle}>Customer Name</label>
              <input style={{ ...inputStyle, marginBottom: 10 }} value={customer.name} onChange={(e) => updateCustomer('name', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} /></div>
                <div><label style={labelStyle}>Email (optional)</label><input style={inputStyle} value={customer.email} onChange={(e) => updateCustomer('email', e.target.value)} /></div>
              </div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={customer.address} onChange={(e) => updateCustomer('address', e.target.value)} />
            </div>

            {/* Quotation Details */}
            <div style={cardStyle}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Quotation Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Quotation Number</label><input style={inputStyle} value={quote.number} onChange={(e) => updateQuote('number', e.target.value)} /></div>
                <div><label style={labelStyle}>Issue Date</label><input type="date" style={inputStyle} value={quote.issueDate} onChange={(e) => updateQuote('issueDate', e.target.value)} /></div>
                <div><label style={labelStyle}>Valid Until</label><input type="date" style={inputStyle} value={quote.validUntil} onChange={(e) => updateQuote('validUntil', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select style={inputStyle} value={quote.currency} onChange={(e) => updateQuote('currency', e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>VAT (%)</label><input type="number" style={inputStyle} value={quote.vat} onChange={(e) => updateQuote('vat', e.target.value)} /></div>
                <div>
                  <label style={labelStyle}>Discount</label>
                  <select style={inputStyle} value={quote.discountType} onChange={(e) => updateQuote('discountType', e.target.value)}>
                    <option value="none">None</option>
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>&nbsp;</label>
                  <input
                    type="number" style={{ ...inputStyle, background: quote.discountType === 'none' ? '#F6F7F9' : 'white', color: quote.discountType === 'none' ? '#B0B4BA' : 'inherit' }}
                    value={quote.discountValue} onChange={(e) => updateQuote('discountValue', e.target.value)} disabled={quote.discountType === 'none'}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={cardStyle}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Items</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 100px 32px', gap: 8, marginBottom: 8 }}>
                {['Description', 'Qty', 'Rate', 'Amount', ''].map((h) => <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8A8F98', textTransform: 'uppercase' }}>{h}</span>)}
              </div>
              {items.map((item, i) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input style={inputStyle} value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" />
                  <input style={inputStyle} type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} min="0" />
                  <input style={inputStyle} type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} placeholder="0.00" />
                  <div style={{ ...inputStyle, background: '#F8FAFC', color: '#475569', fontSize: '0.78rem', textAlign: 'right' }}>
                    {((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}
                  </div>
                  <button onClick={() => removeItem(item.id)} disabled={items.length <= 1} style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: items.length <= 1 ? 'default' : 'pointer', opacity: items.length <= 1 ? 0.4 : 1 }}>×</button>
                </div>
              ))}
              <button onClick={addItem} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>+ Add Item</button>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F0F1F3' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280', padding: '3px 0' }}><span>Subtotal</span><span>{formatMoney(subtotal, quote.currency)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280', padding: '3px 0' }}><span>VAT ({quote.vat || 0}%)</span><span>{formatMoney(vatAmount, quote.currency)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#2563EB', padding: '5px 0' }}><span>Total</span><span>{formatMoney(grandTotal, quote.currency)}</span></div>
              </div>
            </div>

            {/* Terms & Notes */}
            <div style={cardStyle}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>Terms & Notes</p>
              <label style={labelStyle}>Terms & Conditions</label>
              <textarea style={{ ...inputStyle, height: 70, resize: 'vertical', marginBottom: 12 }} value={terms} onChange={(e) => { setTerms(e.target.value); triggerPulse(); }} placeholder="One line per point" />
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={notes} onChange={(e) => { setNotes(e.target.value); triggerPulse(); }} placeholder="One line per point" />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={handleResetForm} style={{ fontSize: '0.8rem', color: '#6B7280', background: 'white', border: '1px solid #DDE1E7', padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>Reset Form</button>
              {status && <span style={{ fontSize: '0.8rem', color: status.startsWith('✅') ? '#059669' : '#DC2626' }}>{status}</span>}
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Processed entirely in your browser — nothing is uploaded anywhere.</p>
          </div>
        )}

        {/* Preview column */}
        <div className={`quotation-preview-col ${viewMode === 'customer' ? '' : ''}`} style={{ flex: viewMode === 'customer' ? '1 1 100%' : undefined, maxWidth: viewMode === 'customer' ? 880 : undefined, margin: viewMode === 'customer' ? '0 auto' : undefined }}>
          <div className="quotation-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F98' }}>{viewMode === 'customer' ? 'Shared Quotation' : 'Live Preview'}</span>
            <span style={{ background: '#ECFDF5', color: '#10B981', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>Updates in real time</span>
          </div>
          <div ref={printRef}>
            <QuotationPreview business={business} customer={customer} quote={quote} items={items} terms={terms} notes={notes} pulse={pulse} />
          </div>

          <div className="quotation-no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: 10, padding: '13px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Accept Quote</button>
            <button style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: 10, padding: '13px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✎ Request Changes</button>
            <button style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: 10, padding: '13px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Decline Quote</button>
            <button onClick={handleGenerate} disabled={busy} style={{ background: 'white', border: '1px solid #DDE1E7', borderRadius: 10, padding: '13px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⬇ Download PDF</button>
            <button onClick={handlePrint} style={{ background: 'white', border: '1px solid #DDE1E7', borderRadius: 10, padding: '13px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖨 Print</button>
          </div>
        </div>
      </div>

      {/* Dedicated print container — only this renders when printing */}
      <div className="quotation-print-only" style={{ padding: 24 }}>
        <QuotationPreview business={business} customer={customer} quote={quote} items={items} terms={terms} notes={notes} pulse={false} />
      </div>

    </div>
  );
}
