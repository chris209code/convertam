'use client';

import { useRef, useState } from 'react';
import { Landmark, CreditCard, Smartphone, Banknote, Plus, X, ChevronUp, ChevronDown, ImagePlus } from 'lucide-react';
import { formatMoney } from '@/lib/invoice-studio/moneyFormat';
import { SIGNATURE_FONT_STACK } from '@/lib/invoice-studio/fonts';
import { ALL_PAYMENT_METHODS } from '@/lib/invoice-studio/constants';

const PAYMENT_ICONS = {
  'Bank Transfer': Landmark,
  POS: CreditCard,
  USSD: Smartphone,
  Cash: Banknote,
};

const wrapText = { overflowWrap: 'break-word', wordBreak: 'break-word' };
const noOutline = { outline: 'none' };

function editableProps(ctx, onBlur) {
  if (!ctx.editable) return {};
  return { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => onBlur(e.currentTarget.innerText) };
}

// Image-bearing kinds render nothing at all — no box, border, or icon glyph
// — when no source is set. The wrapper element still reserves x/y/w/h on the
// canvas so drag/resize/positioning keeps working either way.
function ImageFill({ src, alt, style, radius }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, display: 'block', ...style }} />;
}

// "Prime Tech Digital" -> "PT" (first letter of the first two words),
// "Convertam" -> "C" (single word -> just its first letter). Matches the
// two examples given exactly, and degrades gracefully for any name shape.
function companyAbbreviation(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function Logo({ el, ctx }) {
  if (!el.src) {
    // The header should never appear empty — an auto-generated initials
    // badge stands in for a real logo until one is uploaded.
    const radius = el.shape === 'rounded' ? 14 : '50%';
    return (
      <div style={{
        width: '100%', height: '100%', borderRadius: radius, background: ctx.brandPrimary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: ctx.headFont, fontWeight: 700, fontSize: '38%',
      }}>
        {companyAbbreviation(ctx.companyName)}
      </div>
    );
  }
  return <ImageFill src={el.src} alt="Company logo" radius={el.shape === 'rounded' ? 14 : 6} style={{ objectFit: 'contain' }} />;
}

function CompanyText({ el, ctx }) {
  const align = el.center ? 'center' : 'left';
  const color = el.onDark ? '#fff' : (el.useBrand ? ctx.brandPrimary : '#0F172A');
  const taglineColor = el.onDark ? 'rgba(255,255,255,.7)' : '#8891A0';
  return (
    <div>
      <div
        {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'name', v))}
        style={{ fontFamily: ctx.headFont, fontWeight: 700, fontSize: 22, color, textAlign: align, ...wrapText, ...noOutline }}
      >
        {el.name}
      </div>
      <div
        {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'tagline', v))}
        style={{ fontFamily: ctx.bodyFont, fontSize: 12.5, color: taglineColor, marginTop: 2, textAlign: align, ...wrapText, ...noOutline }}
      >
        {el.tagline}
      </div>
    </div>
  );
}

function ContactLine({ ctx, elId, field, value, align, color }) {
  if (!value && !ctx.editable) return null;
  return (
    <div {...editableProps(ctx, (v) => ctx.onFieldBlur(elId, field, v))} style={{ fontFamily: ctx.bodyFont, fontSize: 12, color, textAlign: align, lineHeight: 1.6, ...wrapText, ...noOutline }}>
      {value}
    </div>
  );
}

function ContactInfo({ el, ctx }) {
  const align = el.center ? 'center' : 'right';
  const color = el.onDark ? 'rgba(255,255,255,.85)' : '#475569';
  return (
    <div>
      <ContactLine ctx={ctx} elId={el.id} field="phone" value={el.phone} align={align} color={color} />
      <ContactLine ctx={ctx} elId={el.id} field="email" value={el.email} align={align} color={color} />
      <ContactLine ctx={ctx} elId={el.id} field="website" value={el.website} align={align} color={color} />
      <ContactLine ctx={ctx} elId={el.id} field="address" value={el.address} align={align} color={color} />
    </div>
  );
}

function Bar({ el, ctx }) {
  const bg = el.color === 'divider' ? '#E2E6ED' : el.color === 'secondary' ? ctx.brandSecondary : el.color === 'accent' ? ctx.brandAccent : ctx.brandPrimary;
  return <div style={{ width: '100%', height: '100%', background: bg }} />;
}

function Shape({ el, ctx }) {
  if (el.variant === 'card') {
    return <div style={{ width: '100%', height: '100%', background: '#FBFCFD', border: '1px solid #E7EAF0', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03)' }} />;
  }
  const bg = el.color === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  return <div style={{ width: '100%', height: '100%', background: bg }} />;
}

function BillTo({ el, ctx }) {
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: ctx.brandAccent, marginBottom: 6 }}>BILLED TO</div>
      <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'clientName', v))} style={{ fontFamily: ctx.headFont, fontWeight: 600, fontSize: 17, color: '#0F172A', ...wrapText, ...noOutline }}>{el.clientName}</div>
      {(el.clientAddress || ctx.editable) && (
        <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'clientAddress', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 12, color: '#64748B', marginTop: 4, ...wrapText, ...noOutline }}>{el.clientAddress}</div>
      )}
      {(el.clientPhone || ctx.editable) && (
        <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'clientPhone', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 12, color: '#64748B', ...wrapText, ...noOutline }}>{el.clientPhone}</div>
      )}
    </div>
  );
}

function Meta({ el, ctx }) {
  const titleColor = el.useBrand === 'title' ? ctx.brandSecondary : '#0F172A';
  return (
    <div>
      <div style={{ fontFamily: ctx.headFont, fontWeight: 700, fontSize: 26, color: titleColor, textAlign: 'right', marginBottom: 10 }}>INVOICE</div>
      {el.rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5 }}>
          <span style={{ fontFamily: ctx.bodyFont, fontSize: 11.5, color: '#8891A0', flexShrink: 0 }}>{r.label}</span>
          <span {...editableProps(ctx, (v) => ctx.onMetaRowBlur(el.id, r.key, v))} style={{ fontFamily: ctx.bodyFont, fontSize: 12.5, fontWeight: 600, color: '#0F172A', textAlign: 'right', ...wrapText, ...noOutline }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// The image cell reserves the same 44x44 slot across every row (so the
// table stays aligned column-to-column) but only ever draws something when
// this specific row has an image, or — in edit mode — a subtle upload
// prompt. A row with no image never shows a visible box/border/icon.
function ItemImageCell({ row, idx, tableId, ctx }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await ctx.onTableRowImageUpload(tableId, idx, file);
    setError(err || '');
  }

  if (row.img) {
    return (
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <ImageFill src={row.img} alt="" radius={6} />
        {ctx.editable && (
          <button
            type="button"
            aria-label="Remove item image"
            onClick={() => ctx.onTableRowImageRemove(tableId, idx)}
            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#0F172A', color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <X size={10} />
          </button>
        )}
      </div>
    );
  }

  if (!ctx.editable) return <div style={{ width: 44, height: 44 }} />;

  return (
    <div style={{ width: 44, height: 44 }}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={error || 'Add product image (optional)'}
        style={{ width: 44, height: 44, borderRadius: 6, border: '1px dashed #CBD5E1', background: 'transparent', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ImagePlus size={16} />
      </button>
    </div>
  );
}

function TableRow({ row, idx, isFirst, isLast, showImages, ctx, tableId }) {
  const line = ctx.lineFor(row);
  const rowControlsW = ctx.editable ? '58px' : '0px';
  const cols = ['30px', ...(showImages ? ['44px'] : []), '1fr', '50px', '90px', '70px', '90px', ...(ctx.editable ? [rowControlsW] : [])];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols.join(' '), alignItems: 'center', padding: '10px 6px', borderBottom: isLast ? 'none' : '1px solid #EEF1F5', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>{idx + 1}</div>
      {showImages && <ItemImageCell row={row} idx={idx} tableId={tableId} ctx={ctx} />}
      <div style={{ minWidth: 0, ...wrapText }}>
        <div {...editableProps(ctx, (v) => ctx.onRowFieldBlur(tableId, idx, 'name', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 13, fontWeight: 600, color: '#0F172A', ...wrapText, ...noOutline }}>{row.name}</div>
        {(row.desc || ctx.editable) && (
          <div {...editableProps(ctx, (v) => ctx.onRowFieldBlur(tableId, idx, 'desc', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 11, color: '#94A3B8', marginTop: 2, ...wrapText, ...noOutline }}>{row.desc}</div>
        )}
      </div>
      <div {...editableProps(ctx, (v) => ctx.onRowFieldBlur(tableId, idx, 'qty', v, true))} style={{ fontFamily: ctx.bodyFont, fontSize: 13, color: '#334155', ...noOutline }}>{row.qty}</div>
      <div {...editableProps(ctx, (v) => ctx.onRowFieldBlur(tableId, idx, 'rate', v, true))} style={{ fontFamily: ctx.bodyFont, fontSize: 13, color: '#334155', ...noOutline }}>{formatMoney(row.rate, ctx.currency)}</div>
      <div {...editableProps(ctx, (v) => ctx.onRowFieldBlur(tableId, idx, 'vat', v, true))} style={{ fontFamily: ctx.bodyFont, fontSize: 12, color: '#94A3B8', ...noOutline }}>{row.vat}%</div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 13, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{formatMoney(line.lineTotalCents / 100, ctx.currency)}</div>
      {ctx.editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button type="button" aria-label="Move item up" disabled={isFirst} onClick={() => ctx.onMoveRow(tableId, idx, -1)} style={{ border: 'none', background: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#E2E6ED' : '#94A3B8', padding: 2 }}>
            <ChevronUp size={14} />
          </button>
          <button type="button" aria-label="Move item down" disabled={isLast} onClick={() => ctx.onMoveRow(tableId, idx, 1)} style={{ border: 'none', background: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#E2E6ED' : '#94A3B8', padding: 2 }}>
            <ChevronDown size={14} />
          </button>
          <button type="button" aria-label="Remove item" onClick={() => ctx.onRemoveRow(tableId, idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Table({ el, ctx }) {
  const isOutline = el.headerVariant === 'outline';
  const headerColorVal = el.headerColor === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  // Reserve the image column whenever the toggle is on and we're editing
  // (so there's somewhere to click to add the first image); in the final
  // read-only render only if a row actually has one, so a table where no
  // image was ever added doesn't carry a dead empty column.
  const showImages = el.showImages && (ctx.editable || el.rows.some((r) => r.img));
  const rowControlsW = ctx.editable ? '58px' : '0px';
  const headCols = ['30px', ...(showImages ? ['44px'] : []), '1fr', '50px', '90px', '70px', '90px', ...(ctx.editable ? [rowControlsW] : [])];
  const labels = ['#', ...(showImages ? [''] : []), 'ITEM / DESCRIPTION', 'QTY', 'RATE', 'VAT', 'AMOUNT', ...(ctx.editable ? [''] : [])];
  return (
    <div>
      <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden', border: `1px solid ${isOutline ? headerColorVal : '#EEF1F5'}` }}>
        <div style={{
          display: 'grid', gridTemplateColumns: headCols.join(' '), alignItems: 'center', padding: '2px 6px',
          background: isOutline ? '#fff' : headerColorVal, borderBottom: isOutline ? `2px solid ${headerColorVal}` : 'none',
        }}>
          {labels.map((label, i) => (
            <div key={i} style={{
              fontFamily: ctx.bodyFont, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', padding: '10px 6px',
              textAlign: i >= labels.length - (ctx.editable ? 4 : 3) && i < labels.length - (ctx.editable ? 1 : 0) ? 'right' : 'left',
              color: isOutline ? headerColorVal : '#fff',
            }}>
              {label}
            </div>
          ))}
        </div>
        {el.rows.map((row, i) => (
          <TableRow key={i} row={row} idx={i} isFirst={i === 0} isLast={i === el.rows.length - 1} showImages={showImages} ctx={ctx} tableId={el.id} />
        ))}
      </div>
      {ctx.editable && (
        <button
          type="button"
          onClick={() => ctx.onAddRow(el.id)}
          style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px dashed #CBD5E1', borderRadius: 8, padding: '6px 12px', background: 'transparent', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> Add Line Item
        </button>
      )}
    </div>
  );
}

function Totals({ el, ctx }) {
  const bg = el.bgVariant === 'tan' ? '#FBF3E3' : el.bgVariant === 'plain' ? 'transparent' : '#F7F8FA';
  const border = el.bgVariant === 'tan' ? '1px solid #EAD9B0' : 'none';
  const t = ctx.totals;
  const lineStyle = { display: 'flex', justifyContent: 'space-between' };
  return (
    <div style={{ width: '100%', height: '100%', background: bg, border, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: ctx.bodyFont, fontSize: 12.5, color: '#475569' }}>
      <div style={lineStyle}><span>Subtotal</span><span>{formatMoney(t.subtotal, ctx.currency)}</span></div>
      <div style={lineStyle}><span>VAT</span><span>{formatMoney(t.vat, ctx.currency)}</span></div>
      {t.discount > 0 && <div style={lineStyle}><span>Discount</span><span>-{formatMoney(t.discount, ctx.currency)}</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #E2E6ED', fontWeight: 700, fontSize: 15, color: el.useBrand ? ctx.brandPrimary : '#0F172A' }}>
        <span>Total Due</span><span>{formatMoney(t.total, ctx.currency)}</span>
      </div>
    </div>
  );
}

function Words({ ctx }) {
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 11, color: '#8891A0', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Total in words</div>
      <div style={{ fontFamily: ctx.headFont, fontWeight: 600, fontSize: 13, color: '#0F172A', lineHeight: 1.5, ...wrapText }}>{ctx.wordsText}</div>
    </div>
  );
}

function Notes({ el, ctx }) {
  if (!el.content && !ctx.editable) return null;
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: '#8891A0', marginBottom: 4 }}>Notes</div>
      <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'content', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 11, color: '#64748B', lineHeight: 1.5, ...wrapText, ...noOutline }}>{el.content}</div>
    </div>
  );
}

function Payment({ el, ctx }) {
  const active = new Set(el.methods);
  const list = ctx.editable ? ALL_PAYMENT_METHODS : el.methods;
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: ctx.brandAccent, marginBottom: 8 }}>PAYMENT METHODS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map((label) => {
          const Icon = PAYMENT_ICONS[label];
          const on = active.has(label);
          if (!ctx.editable && !on) return null;
          return (
            <button
              key={label}
              type="button"
              onClick={ctx.editable ? () => ctx.onTogglePaymentMethod(el.id, label) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 9,
                background: on ? '#fff' : '#F8FAFC', border: `1px solid ${on ? '#E7EAF0' : '#E2E6ED'}`,
                fontFamily: ctx.bodyFont, fontSize: 12, fontWeight: 500, color: on ? '#334155' : '#B4BCC8',
                cursor: ctx.editable ? 'pointer' : 'default', opacity: on ? 1 : 0.6,
              }}
            >
              <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, background: '#F3F5F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {Icon && <Icon size={22} strokeWidth={1.7} color={on ? '#334155' : '#B4BCC8'} />}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bank({ el, ctx }) {
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: ctx.brandAccent, marginBottom: 8 }}>BANK DETAILS</div>
      {el.rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, fontFamily: ctx.bodyFont, fontSize: 11.5 }}>
          <span style={{ color: '#8891A0', flexShrink: 0 }}>{r.k}</span>
          <span {...editableProps(ctx, (v) => ctx.onBankRowBlur(el.id, i, v))} style={{ color: '#334155', fontWeight: 600, textAlign: 'right', ...wrapText, ...noOutline }}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function Approval({ el, ctx }) {
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 10.5, color: '#8891A0', textTransform: 'uppercase', letterSpacing: '.05em' }}>Approved By</div>
      <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'name', v))} style={{ fontFamily: ctx.headFont, fontWeight: 600, fontSize: 14, color: '#0F172A', marginTop: 3, ...wrapText, ...noOutline }}>{el.name}</div>
      <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'role', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 12, color: '#64748B', marginTop: 1, ...wrapText, ...noOutline }}>{el.role}</div>
    </div>
  );
}

function Signature({ el }) {
  const isTyped = el.mode === 'typed' || !el.mode;
  return (
    <div>
      {isTyped ? (
        el.text && <div style={{ fontFamily: SIGNATURE_FONT_STACK, fontSize: 28, color: '#0F172A' }}>{el.text}</div>
      ) : (
        <ImageFill src={el.src} alt="Signature" style={{ objectFit: 'contain', height: '70%' }} />
      )}
      <div style={{ width: '100%', borderTop: '1.5px solid #CBD5E1', marginTop: 4 }} />
    </div>
  );
}

function Stamp({ el }) {
  return <div style={{ width: '100%', height: '100%', opacity: (el.opacity ?? 100) / 100 }}><ImageFill src={el.src} alt="Company stamp" radius={el.shape === 'circle' ? 9999 : 8} /></div>;
}

function Qr({ el }) {
  return <ImageFill src={el.src} alt="Payment QR code" />;
}

function Footer({ el, ctx }) {
  const bg = el.color === 'secondary' ? ctx.brandSecondary : ctx.brandPrimary;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: bg }}>
      <div style={{ position: 'relative', color: '#fff', fontFamily: ctx.bodyFont, fontSize: 13, fontWeight: 600, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'content', v))} style={noOutline}>{el.content}</div>
        <div style={{ color: 'rgba(255,255,255,.75)', fontFamily: ctx.bodyFont, fontSize: 11.5 }}>{ctx.pageLabel || 'Page 1 of 1'}</div>
      </div>
    </div>
  );
}

function Letterhead({ el }) {
  return <ImageFill src={el.src} alt="Letterhead" />;
}

function Watermark({ el, ctx }) {
  return (
    <div style={{ fontFamily: ctx.headFont, fontWeight: 800, fontSize: 96, color: '#0F172A', opacity: (el.opacity ?? 12) / 100, transform: `rotate(${el.rotation ?? 0}deg)`, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.05em' }}>
      {el.content}
    </div>
  );
}

function Terms({ el, ctx }) {
  return (
    <div>
      <div style={{ fontFamily: ctx.bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: '#8891A0', marginBottom: 4 }}>Terms &amp; Conditions</div>
      <div {...editableProps(ctx, (v) => ctx.onFieldBlur(el.id, 'content', v))} style={{ fontFamily: ctx.bodyFont, fontSize: 10.5, color: '#94A3B8', lineHeight: 1.5, ...noOutline, ...wrapText }}>{el.content}</div>
    </div>
  );
}

export const KIND_RENDERERS = {
  logo: Logo, companyText: CompanyText, contactInfo: ContactInfo, bar: Bar, shape: Shape,
  billTo: BillTo, meta: Meta, table: Table, totals: Totals, words: Words, notes: Notes, payment: Payment,
  bank: Bank, approval: Approval, signature: Signature, stamp: Stamp, qr: Qr, footer: Footer,
  letterhead: Letterhead, watermark: Watermark, terms: Terms,
};
