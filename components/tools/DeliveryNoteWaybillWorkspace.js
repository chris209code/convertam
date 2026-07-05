'use client';

import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function genDocNumber(prefix) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${new Date().getFullYear()}-${rand}`;
}

const emptyItem = () => ({ description: '', qtyOrdered: '', qtyDelivered: '', unit: '', condition: 'Good' });

export default function DeliveryNoteWaybillWorkspace() {
  const [docType, setDocType] = useState('delivery'); // 'delivery' | 'waybill'
  const [docNumber, setDocNumber] = useState(() => genDocNumber('DN'));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // Delivery Note specific
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Waybill specific
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [packageCount, setPackageCount] = useState('');

  const [items, setItems] = useState([emptyItem()]);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  function switchType(type) {
    setDocType(type);
    setDocNumber(genDocNumber(type === 'delivery' ? 'DN' : 'WB'));
  }

  function updateItem(i, key, val) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  }
  function addItem() { setItems((prev) => [...prev, emptyItem()]); }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  async function generatePdf() {
    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const margin = 40;
      let y = height - margin;

      const ink = rgb(0.09, 0.13, 0.2);
      const soft = rgb(0.4, 0.45, 0.52);
      const accent = rgb(0.85, 0.55, 0.1);

      function text(str, x, yPos, opts = {}) {
        page.drawText(str || '', { x, y: yPos, size: opts.size || 10, font: opts.bold ? fontBold : font, color: opts.color || ink });
      }
      function line(x1, y1, x2, y2, color = rgb(0.85, 0.85, 0.85)) {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color });
      }

      const title = docType === 'delivery' ? 'DELIVERY NOTE' : 'WAYBILL';
      text(title, margin, y, { size: 22, bold: true, color: accent });
      text(senderName || 'Your Business Name', width - margin - font.widthOfTextAtSize(senderName || 'Your Business Name', 12), y + 2, { size: 12, bold: true });
      y -= 18;
      if (senderAddress) { text(senderAddress, width - margin - font.widthOfTextAtSize(senderAddress, 9), y, { size: 9, color: soft }); y -= 12; }
      if (senderPhone) { text(senderPhone, width - margin - font.widthOfTextAtSize(senderPhone, 9), y, { size: 9, color: soft }); }
      y -= 24;
      line(margin, y, width - margin, y);
      y -= 24;

      text(`${docType === 'delivery' ? 'Delivery' : 'Waybill'} No.`, margin, y, { size: 9, color: soft });
      text(docNumber, margin, y - 13, { size: 11, bold: true });
      text('Date', margin + 200, y, { size: 9, color: soft });
      text(date, margin + 200, y - 13, { size: 11, bold: true });
      y -= 40;

      // Sender / Receiver blocks
      text(docType === 'delivery' ? 'DELIVER TO' : 'RECEIVER', margin, y, { size: 9, bold: true, color: accent });
      text(docType === 'delivery' ? 'DELIVERED FROM' : 'SENDER', margin + 280, y, { size: 9, bold: true, color: accent });
      y -= 14;
      text(receiverName || '—', margin, y, { size: 11, bold: true });
      text(senderName || '—', margin + 280, y, { size: 11, bold: true });
      y -= 14;
      if (receiverAddress) { text(receiverAddress, margin, y, { size: 9, color: soft }); }
      if (senderAddress) { text(senderAddress, margin + 280, y, { size: 9, color: soft }); }
      y -= 12;
      if (receiverPhone) { text(receiverPhone, margin, y, { size: 9, color: soft }); }
      if (senderPhone) { text(senderPhone, margin + 280, y, { size: 9, color: soft }); }
      y -= 28;

      if (docType === 'delivery' && deliveryAddress) {
        text('DELIVERY ADDRESS', margin, y, { size: 9, bold: true, color: accent });
        y -= 14;
        text(deliveryAddress, margin, y, { size: 10 });
        y -= 24;
      }

      if (docType === 'waybill') {
        text('ORIGIN', margin, y, { size: 9, bold: true, color: accent });
        text('DESTINATION', margin + 280, y, { size: 9, bold: true, color: accent });
        y -= 14;
        text(origin || '—', margin, y, { size: 10 });
        text(destination || '—', margin + 280, y, { size: 10 });
        y -= 24;

        text('VEHICLE NO.', margin, y, { size: 9, bold: true, color: accent });
        text('DRIVER', margin + 150, y, { size: 9, bold: true, color: accent });
        text('PACKAGES', margin + 350, y, { size: 9, bold: true, color: accent });
        y -= 14;
        text(vehicleNo || '—', margin, y, { size: 10 });
        text(`${driverName || '—'}${driverPhone ? ' · ' + driverPhone : ''}`, margin + 150, y, { size: 10 });
        text(String(packageCount || '—'), margin + 350, y, { size: 10 });
        y -= 24;
      }

      // Items table
      const colX = { desc: margin, ordered: margin + 260, delivered: margin + 340, unit: margin + 415, cond: margin + 470 };
      page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 20, color: rgb(0.96, 0.96, 0.94) });
      text('DESCRIPTION', colX.desc + 4, y + 2, { size: 8, bold: true, color: soft });
      text('QTY ORD.', colX.ordered, y + 2, { size: 8, bold: true, color: soft });
      text('QTY DEL.', colX.delivered, y + 2, { size: 8, bold: true, color: soft });
      text('UNIT', colX.unit, y + 2, { size: 8, bold: true, color: soft });
      text('CONDITION', colX.cond, y + 2, { size: 8, bold: true, color: soft });
      y -= 24;

      items.forEach((item) => {
        text(item.description || '—', colX.desc + 4, y, { size: 9 });
        text(String(item.qtyOrdered || '—'), colX.ordered, y, { size: 9 });
        text(String(item.qtyDelivered || '—'), colX.delivered, y, { size: 9 });
        text(item.unit || '—', colX.unit, y, { size: 9 });
        text(item.condition || '—', colX.cond, y, { size: 9 });
        y -= 18;
        line(margin, y + 6, width - margin, y + 6, rgb(0.92, 0.92, 0.92));
      });
      y -= 16;

      if (notes) {
        text('NOTES', margin, y, { size: 9, bold: true, color: accent });
        y -= 14;
        text(notes, margin, y, { size: 9, color: soft });
        y -= 30;
      }

      // Footer sign-off section
      const footerY = 110;
      if (docType === 'delivery') {
        line(margin, footerY, margin + 200, footerY);
        text('Received By (Name & Signature)', margin, footerY - 12, { size: 8, color: soft });
        line(margin + 300, footerY, margin + 500, footerY);
        text('Date', margin + 300, footerY - 12, { size: 8, color: soft });
      } else {
        line(margin, footerY, margin + 200, footerY);
        text('Dispatched By', margin, footerY - 12, { size: 8, color: soft });
        line(margin + 300, footerY, margin + 500, footerY);
        text('Acknowledged By (Receiver Signature)', margin + 300, footerY - 12, { size: 8, color: soft });
      }

      text('Generated with Convertam · convertam.app', margin, 40, { size: 7, color: rgb(0.7, 0.7, 0.7) });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docType === 'delivery' ? 'delivery-note' : 'waybill'}-${docNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const fieldWrap = { marginBottom: 12 };
  const sectionTitle = { fontSize: '0.75rem', fontWeight: 700, color: '#334155', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' };

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => switchType('delivery')}
          style={{ flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', border: docType === 'delivery' ? '2px solid #D97706' : '1px solid #E2E8F0', background: docType === 'delivery' ? '#FFFBEB' : 'white', color: '#1E293B' }}
        >
          📦 Delivery Note
        </button>
        <button
          onClick={() => switchType('waybill')}
          style={{ flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', border: docType === 'waybill' ? '2px solid #D97706' : '1px solid #E2E8F0', background: docType === 'waybill' ? '#FFFBEB' : 'white', color: '#1E293B' }}
        >
          🚚 Waybill
        </button>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 16 }}>
        {docType === 'delivery'
          ? 'Confirms what was actually delivered to the customer — signed as proof of receipt.'
          : 'Documents the movement of goods in transit — travels with the shipment from origin to destination.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 24 }}>
        <div>
          <p style={sectionTitle}>Document Info</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>{docType === 'delivery' ? 'Delivery' : 'Waybill'} No.</label>
              <input style={inputStyle} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Date</label>
              <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <p style={sectionTitle}>{docType === 'delivery' ? 'Delivered From (Your Business)' : 'Sender'}</p>
          <div style={fieldWrap}>
            <label style={labelStyle}>Business Name</label>
            <input style={inputStyle} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Acme Distributors Ltd" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="12 Industrial Road, Lagos" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="+234..." />
          </div>

          <p style={sectionTitle}>{docType === 'delivery' ? 'Deliver To (Customer)' : 'Receiver'}</p>
          <div style={fieldWrap}>
            <label style={labelStyle}>Name / Business</label>
            <input style={inputStyle} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Jane's Supermarket" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
          </div>

          {docType === 'delivery' && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Delivery Address (if different)</label>
              <input style={inputStyle} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Warehouse 3, Apapa" />
            </div>
          )}

          {docType === 'waybill' && (
            <>
              <p style={sectionTitle}>Transport Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Origin</label>
                  <input style={inputStyle} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ogun Brewery" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Destination</label>
                  <input style={inputStyle} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ibadan Depot" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Vehicle No.</label>
                  <input style={inputStyle} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="LND-234-XY" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>No. of Packages</label>
                  <input style={inputStyle} value={packageCount} onChange={(e) => setPackageCount(e.target.value)} placeholder="90" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Driver Name</label>
                  <input style={inputStyle} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Driver Phone</label>
                  <input style={inputStyle} value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div style={fieldWrap}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div>
          <p style={sectionTitle}>Items</p>
          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10, position: 'relative' }}>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
              )}
              <div style={fieldWrap}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="50 cartons of malt drink" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Qty Ordered</label>
                  <input style={inputStyle} value={item.qtyOrdered} onChange={(e) => updateItem(i, 'qtyOrdered', e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Qty Delivered</label>
                  <input style={inputStyle} value={item.qtyDelivered} onChange={(e) => updateItem(i, 'qtyDelivered', e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Unit</label>
                  <input style={inputStyle} value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} placeholder="cartons" />
                </div>
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Condition</label>
                <select style={inputStyle} value={item.condition} onChange={(e) => updateItem(i, 'condition', e.target.value)}>
                  <option>Good</option>
                  <option>Damaged</option>
                  <option>Partial</option>
                  <option>Rejected</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={addItem} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px dashed #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: 20 }}>
            + Add Item
          </button>

          <button
            onClick={generatePdf}
            disabled={generating}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: 'none', cursor: generating ? 'default' : 'pointer', background: generating ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}
          >
            {generating ? 'Generating…' : `⬇ Download ${docType === 'delivery' ? 'Delivery Note' : 'Waybill'} PDF`}
          </button>
        </div>
      </div>
    </div>
  );
}
