'use client';

// Presentational only — receives fully computed data as props. Reused for
// the live editor preview, the "Preview as Customer" view, and the print
// container, so all three are guaranteed to render identically. No state,
// no calculations performed here — those live once in QuotationWorkspace.

const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: '₵', KES: 'KSh', ZAR: 'R', CAD: 'C$' };

export function formatMoney(amount, currencyCode) {
  const value = (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currencyCode} ${value}`;
}

export function computeTotals(items, vatPercent, discountType, discountValue) {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), 0);
  const vatAmount = subtotal * ((parseFloat(vatPercent) || 0) / 100);
  const discountAmount = discountType === 'percent'
    ? subtotal * ((parseFloat(discountValue) || 0) / 100)
    : discountType === 'fixed'
      ? Math.min(parseFloat(discountValue) || 0, subtotal)
      : 0;
  const grandTotal = Math.max(0, subtotal + vatAmount - discountAmount);
  return { subtotal, vatAmount, discountAmount, grandTotal };
}

export default function QuotationPreview({ business, customer, quote, items, terms, notes, pulse }) {
  const { subtotal, vatAmount, discountAmount, grandTotal } = computeTotals(items, quote.vat, quote.discountType, quote.discountValue);
  const money = (v) => formatMoney(v, quote.currency);

  const termsLines = (terms || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const notesLines = (notes || '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 40,
      boxShadow: '0 1px 2px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.06)',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#12141A',
    }}>
      {/* Header: business identity + quotation number */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#2563EB' }} />
            </div>
          )}
          <div>
            <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
              {business.name || 'Your Business Name'}
            </p>
            {business.tagline && <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: '#10B981', margin: '2px 0 0' }}>{business.tagline}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', margin: 0 }}>QUOTATION</p>
          <span style={{ display: 'inline-block', marginTop: 8, background: '#EFF4FF', color: '#2563EB', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>
            {quote.number || 'QUO-001'}
          </span>
        </div>
      </div>

      {/* Contact line */}
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
        {[business.phone, business.email, business.address].filter(Boolean).join('  ·  ') || 'Phone · Email · Address'}
      </p>

      <div style={{ borderTop: '1px solid #E9EBEF', margin: '0 0 24px' }} />

      {/* Prepared for + total callout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10B981', marginBottom: 6 }}>Prepared For</p>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>{customer.name || 'Client Name'}</p>
          {customer.phone && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0' }}>{customer.phone}</p>}
          {customer.email && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0' }}>{customer.email}</p>}
          {customer.address && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0' }}>{customer.address}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: '#8A8F98', margin: 0 }}>Issue Date <strong style={{ color: '#12141A', marginLeft: 8 }}>{quote.issueDate || '—'}</strong></p>
            <p style={{ fontSize: 12, color: '#8A8F98', margin: '4px 0 0' }}>Valid Until <strong style={{ color: '#12141A', marginLeft: 8 }}>{quote.validUntil || '—'}</strong></p>
          </div>
          <div style={{
            background: '#F6F7F9', borderRadius: 12, padding: '12px 20px', display: 'inline-block',
            transform: pulse ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.4s ease',
          }}>
            <p style={{ fontSize: 12, color: '#8A8F98', margin: '0 0 2px' }}>Total Amount</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#10B981', margin: 0 }}>{money(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ border: '1px solid #E9EBEF', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 70px 130px 150px', background: '#0F172A', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', padding: '10px 16px' }}>
          <span>#</span><span>Description</span><span style={{ textAlign: 'right' }}>Qty</span><span style={{ textAlign: 'right' }}>Rate</span><span style={{ textAlign: 'right' }}>Amount</span>
        </div>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 70px 130px 150px', padding: '12px 16px', fontSize: 14, borderTop: i > 0 ? '1px solid #F0F1F3' : 'none' }}>
            <span style={{ color: '#8A8F98' }}>{i + 1}</span>
            <span style={{ fontWeight: 600 }}>{item.description || 'Item description'}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.qty || 0}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(parseFloat(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>

      {/* Totals block */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6B7280' }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6B7280' }}><span>VAT ({quote.vat || 0}%)</span><span>{money(vatAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#6B7280' }}><span>Discount</span><span>{money(discountAmount)}</span></div>
          <div style={{ borderTop: '1px solid #E9EBEF', margin: '6px 0' }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#2563EB',
            transform: pulse ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease',
          }}>
            <span>Grand Total</span><span>{money(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Notes */}
      {(termsLines.length > 0 || notesLines.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {termsLines.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10B981', marginBottom: 8 }}>Terms & Conditions</p>
              {termsLines.map((line, i) => <p key={i} style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>• {line}</p>)}
            </div>
          )}
          {notesLines.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10B981', marginBottom: 8 }}>Notes</p>
              {notesLines.map((line, i) => <p key={i} style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>{line}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
