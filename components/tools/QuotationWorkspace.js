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

const EMPTY_ITEM = { description: '', qty: 1, rate: '' };

export default function QuotationWorkspace() {
  const [form, setForm] = useState({
    yourName: '', yourEmail: '', yourPhone: '', yourAddress: '',
    clientName: '', clientEmail: '', clientAddress: '',
    quotationNo: 'QUO-001', date: new Date().toISOString().split('T')[0],
    validUntil: '', currency: '₦', notes: '', terms: 'This quotation is valid for 30 days.',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  function updateForm(key, val) { setForm(f => ({ ...f, [key]: val })); }
  function updateItem(i, key, val) { setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item)); }
  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), 0);
  const vat = subtotal * 0.075;
  const total = subtotal + vat;

  async function handleGenerate() {
    setBusy(true);
    setStatus('');
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { width, height } = page.getSize();
      let y = height - 50;

      const blue = rgb(0.145, 0.396, 0.918);
      const dark = rgb(0.059, 0.09, 0.157);
      const gray = rgb(0.4, 0.44, 0.52);
      const light = rgb(0.96, 0.98, 1);

      // Header bar
      page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: blue });
      page.drawText('QUOTATION', { x: 40, y: height - 45, size: 22, font: bold, color: rgb(1,1,1) });
      page.drawText(`#${form.quotationNo}`, { x: 40, y: height - 65, size: 11, font, color: rgb(1,1,1,0.8) });

      // Date info
      page.drawText(`Date: ${form.date}`, { x: width - 200, y: height - 45, size: 10, font, color: rgb(1,1,1) });
      if (form.validUntil) page.drawText(`Valid Until: ${form.validUntil}`, { x: width - 200, y: height - 62, size: 10, font, color: rgb(1,1,1) });

      y = height - 110;

      // From / To
      page.drawText('FROM', { x: 40, y, size: 9, font: bold, color: blue });
      page.drawText('TO', { x: 300, y, size: 9, font: bold, color: blue });
      y -= 18;

      const fromLines = [form.yourName, form.yourEmail, form.yourPhone, form.yourAddress].filter(Boolean);
      const toLines = [form.clientName, form.clientEmail, form.clientAddress].filter(Boolean);
      const maxLines = Math.max(fromLines.length, toLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (fromLines[i]) page.drawText(fromLines[i], { x: 40, y, size: 10, font, color: dark });
        if (toLines[i]) page.drawText(toLines[i], { x: 300, y, size: 10, font, color: dark });
        y -= 15;
      }

      y -= 20;

      // Table header
      page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: blue });
      page.drawText('Description', { x: 48, y: y + 4, size: 9, font: bold, color: rgb(1,1,1) });
      page.drawText('Qty', { x: 330, y: y + 4, size: 9, font: bold, color: rgb(1,1,1) });
      page.drawText('Rate', { x: 390, y: y + 4, size: 9, font: bold, color: rgb(1,1,1) });
      page.drawText('Amount', { x: 460, y: y + 4, size: 9, font: bold, color: rgb(1,1,1) });
      y -= 24;

      // Table rows
      items.forEach((item, idx) => {
        const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
        if (idx % 2 === 0) {
          page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 20, color: light });
        }
        page.drawText(item.description || '-', { x: 48, y: y + 2, size: 9, font, color: dark, maxWidth: 270 });
        page.drawText(String(item.qty), { x: 330, y: y + 2, size: 9, font, color: dark });
        page.drawText(`${form.currency}${parseFloat(item.rate || 0).toLocaleString()}`, { x: 390, y: y + 2, size: 9, font, color: dark });
        page.drawText(`${form.currency}${amount.toLocaleString()}`, { x: 460, y: y + 2, size: 9, font, color: dark });
        y -= 22;
      });

      y -= 10;
      // Totals
      const totals = [
        ['Subtotal', subtotal],
        ['VAT (7.5%)', vat],
        ['Total', total],
      ];
      totals.forEach(([label, val], i) => {
        if (i === 2) page.drawRectangle({ x: 360, y: y - 4, width: width - 400, height: 20, color: blue });
        page.drawText(label, { x: 370, y: y + 2, size: 10, font: i === 2 ? bold : font, color: i === 2 ? rgb(1,1,1) : dark });
        page.drawText(`${form.currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { x: 460, y: y + 2, size: 10, font: i === 2 ? bold : font, color: i === 2 ? rgb(1,1,1) : dark });
        y -= 22;
      });

      y -= 20;
      if (form.notes) {
        page.drawText('Notes:', { x: 40, y, size: 9, font: bold, color: dark });
        y -= 14;
        page.drawText(form.notes, { x: 40, y, size: 9, font, color: gray, maxWidth: 400 });
        y -= 20;
      }
      if (form.terms) {
        page.drawText('Terms & Conditions:', { x: 40, y, size: 9, font: bold, color: dark });
        y -= 14;
        page.drawText(form.terms, { x: 40, y, size: 9, font, color: gray, maxWidth: 400 });
      }

      // Footer
      // Subtle footer — no colored bar
      page.drawText('Generated with Convertam · convertam.app', { x: width / 2 - 100, y: 10, size: 7, font, color: rgb(0.7, 0.7, 0.7) });

      const bytes = await pdfDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `Quotation-${form.quotationNo}.pdf`);
      setStatus('✅ Quotation downloaded successfully!');
    } catch (err) {
      console.error(err);
      setStatus('❌ Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Your Details */}
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Your Details</p>
          {[['yourName','Your Name / Business Name'],['yourEmail','Email'],['yourPhone','Phone'],['yourAddress','Address']].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{label}</label>
              <input style={inputStyle} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} />
            </div>
          ))}
        </div>
        {/* Client Details */}
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Client Details</p>
          {[['clientName','Client Name'],['clientEmail','Client Email'],['clientAddress','Client Address']].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{label}</label>
              <input style={inputStyle} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['quotationNo','Quotation #'],['date','Date'],['validUntil','Valid Until'],['currency','Currency']].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} type={key === 'date' || key === 'validUntil' ? 'date' : 'text'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Items</p>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 40px', gap: 8, marginBottom: 8 }}>
          {['Description', 'Qty', 'Rate', 'Amount', ''].map(h => (
            <span key={h} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 40px', gap: 8, marginBottom: 8 }}>
            <input style={inputStyle} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" />
            <input style={inputStyle} type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} min="1" />
            <input style={inputStyle} type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} placeholder="0.00" />
            <div style={{ ...inputStyle, background: '#F8FAFC', color: '#475569' }}>
              {form.currency}{((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0)).toLocaleString()}
            </div>
            <button onClick={() => removeItem(i)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem' }}>×</button>
          </div>
        ))}
        <button onClick={addItem} style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Item</button>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ minWidth: 250 }}>
          {[['Subtotal', subtotal], ['VAT (7.5%)', vat]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{label}</span>
              <span style={{ fontSize: '0.82rem', color: '#0F172A' }}>{form.currency}{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', background: '#EFF6FF', borderRadius: 8, marginTop: 4, paddingLeft: 8, paddingRight: 8 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E3A5F' }}>Total</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563EB' }}>{form.currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[['notes', 'Notes'], ['terms', 'Terms & Conditions']].map(([key, label]) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form[key]} onChange={e => updateForm(key, e.target.value)} placeholder={label} />
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
          {busy ? 'Generating…' : '⬇️ Download Quotation PDF'}
        </button>
      </div>
      {status && <div className={`status ${status.startsWith('✅') ? 'success' : 'error'}`}>{status}</div>}
      <p className="privacy-note">Processed entirely in your browser — nothing is uploaded anywhere.</p>
    </div>
  );
}
