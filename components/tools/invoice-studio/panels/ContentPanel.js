'use client';

import { useRef, useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, ImagePlus } from 'lucide-react';
import SignatureDraw from '../SignatureDraw';
import { ALL_PAYMENT_METHODS } from '@/lib/invoice-studio/constants';

// ---------------------------------------------------------------------------
// Shared field primitives — plain, always-visible inputs. Nothing here
// depends on canvas selection; every field is wired directly to the same
// doc-mutation functions the old click-to-edit-on-canvas version used.
// ---------------------------------------------------------------------------
const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: '#8891A0', textTransform: 'uppercase', marginBottom: 10, marginTop: 22 };
const groupTitle = { fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 };
const groupSub = { fontSize: 11.5, color: '#8891A0', marginBottom: 14, lineHeight: 1.5 };
const miniLabel = { fontSize: 11, color: '#8891A0', marginBottom: 4 };
const textInput = { width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', padding: '0 10px', fontSize: 12.5, color: '#334155', fontFamily: 'inherit' };
const textareaInput = { ...textInput, height: 'auto', padding: 10, resize: 'vertical', lineHeight: 1.5 };
const smallBtnGhost = { padding: '7px 14px', borderRadius: 7, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const fieldWrap = { marginBottom: 10 };

function Field({ label, value, onChange, onBlur, placeholder, type = 'text', textarea, rows = 3 }) {
  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>{label}</div>
      {textarea ? (
        <textarea rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} style={textareaInput} />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} style={textInput} />
      )}
    </div>
  );
}

function ToggleSwitch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', border: 'none', background: on ? '#2563EB' : '#E2E6ED', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'transform .15s', transform: `translateX(${on ? 16 : 0}px)` }} />
    </button>
  );
}


// ---------------------------------------------------------------------------
// Business Information: logo, letterhead, company name/tagline, contact
// ---------------------------------------------------------------------------
function BusinessSection({ els, onFieldBlur, onImageUpload, onImageRemove, onOpenCrop, onLetterheadRemove }) {
  const logo = els.logo, company = els.companyText, contact = els.contactInfo, letterhead = els.letterhead;
  const logoInputRef = useRef(null);
  const [logoError, setLogoError] = useState('');

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onImageUpload('logo', file);
    setLogoError(err || '');
  }

  const name = useFieldState(company?.name, (v) => onFieldBlur('companyText', 'name', v));
  const tagline = useFieldState(company?.tagline, (v) => onFieldBlur('companyText', 'tagline', v));
  const phone = useFieldState(contact?.phone, (v) => onFieldBlur('contactInfo', 'phone', v));
  const email = useFieldState(contact?.email, (v) => onFieldBlur('contactInfo', 'email', v));
  const website = useFieldState(contact?.website, (v) => onFieldBlur('contactInfo', 'website', v));
  const address = useFieldState(contact?.address, (v) => onFieldBlur('contactInfo', 'address', v));

  if (!company || !contact) return null;

  return (
    <div>
      <div style={groupTitle}>Business Information</div>
      <div style={groupSub}>Appears in the invoice header. Updates the preview as you type.</div>

      {logo && (
        <div style={fieldWrap}>
          <div style={miniLabel}>Logo</div>
          <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => logoInputRef.current?.click()} style={smallBtnGhost}>{logo.src ? 'Change Logo' : 'Upload Logo'}</button>
            {logo.src && <button type="button" onClick={() => onImageRemove('logo')} style={smallBtnGhost}>Remove</button>}
          </div>
          {logoError && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 6 }}>{logoError}</div>}
        </div>
      )}

      {letterhead && (
        <div style={fieldWrap}>
          <div style={miniLabel}>Letterhead (replaces the header design with your printed letterhead image)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onOpenCrop} style={smallBtnGhost}>{letterhead.src ? 'Re-crop' : 'Upload'}</button>
            {letterhead.src && <button type="button" onClick={onLetterheadRemove} style={smallBtnGhost}>Remove</button>}
          </div>
        </div>
      )}

      <Field label="Company Name" {...name} placeholder="Your Business Ltd." />
      <Field label="Tagline (optional)" {...tagline} placeholder="A short tagline" />
      <Field label="Phone" {...phone} placeholder="+234 800 000 0000" />
      <Field label="Email" {...email} placeholder="hello@yourbusiness.com" />
      <Field label="Website (optional)" {...website} placeholder="www.yourbusiness.com" />
      <Field label="Address" {...address} textarea rows={2} placeholder="Street, city, state" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Information
// ---------------------------------------------------------------------------
function ClientSection({ els, onFieldBlur }) {
  const billTo = els.billTo;
  const name = useFieldState(billTo?.clientName, (v) => onFieldBlur('billTo', 'clientName', v));
  const address = useFieldState(billTo?.clientAddress, (v) => onFieldBlur('billTo', 'clientAddress', v));
  const phone = useFieldState(billTo?.clientPhone, (v) => onFieldBlur('billTo', 'clientPhone', v));
  if (!billTo) return null;

  return (
    <div>
      <div style={groupTitle}>Client Information</div>
      <div style={groupSub}>Who this invoice is billed to.</div>
      <Field label="Client Name" {...name} placeholder="Client or company name" />
      <Field label="Address" {...address} textarea rows={2} placeholder="Client's address" />
      <Field label="Phone" {...phone} placeholder="+234 800 000 0000" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Details: number, dates, status (meta rows) + currency (doc-level)
// ---------------------------------------------------------------------------
function InvoiceDetailsSection({ els, onMetaRowBlur, docSettings, onDocSettingChange, onCommitDocSetting, currencies }) {
  const meta = els.invoiceMeta;
  if (!meta) return null;
  const rowByKey = Object.fromEntries(meta.rows.map((r) => [r.key, r]));

  const no = useFieldState(rowByKey.no?.value, (v) => onMetaRowBlur('invoiceMeta', 'no', v));
  const date = useFieldState(rowByKey.date?.value, (v) => onMetaRowBlur('invoiceMeta', 'date', v));
  const due = useFieldState(rowByKey.due?.value, (v) => onMetaRowBlur('invoiceMeta', 'due', v));
  const status = useFieldState(rowByKey.status?.value, (v) => onMetaRowBlur('invoiceMeta', 'status', v));

  return (
    <div>
      <div style={groupTitle}>Invoice Details</div>
      <div style={groupSub}>Invoice number, dates, status, and currency.</div>
      <Field label="Invoice Number" {...no} placeholder="INV-2026-0001" />
      <Field label="Invoice Date" {...date} placeholder="e.g. Jul 15, 2026" />
      <Field label="Due Date" {...due} placeholder="e.g. Jul 30, 2026" />
      <Field label="Status" {...status} placeholder="Unpaid / Paid / Overdue" />
      <div style={fieldWrap}>
        <div style={miniLabel}>Currency</div>
        <select
          value={docSettings.currency}
          onChange={(e) => { onDocSettingChange('currency', e.target.value); onCommitDocSetting(); }}
          style={textInput}
        >
          {currencies.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Items — full row editing: description, qty, rate, VAT, per-item image
// ---------------------------------------------------------------------------
function ItemImageControl({ row, idx, tableId, onTableRowImageUpload, onTableRowImageRemove }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onTableRowImageUpload(tableId, idx, file);
    setError(err || '');
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      {row.img ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.img} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          <button type="button" onClick={() => onTableRowImageRemove(tableId, idx)} style={{ ...smallBtnGhost, padding: '5px 10px' }}>Remove image</button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} style={{ ...smallBtnGhost, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px' }}>
          <ImagePlus size={13} /> Add image
        </button>
      )}
      {error && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function ItemRow({ row, idx, isFirst, isLast, tableId, onRowFieldBlur, onMoveRow, onRemoveRow, onTableRowImageUpload, onTableRowImageRemove, rowCount }) {
  const desc = useFieldState(row.name, (v) => onRowFieldBlur(tableId, idx, 'name', v));
  const details = useFieldState(row.desc, (v) => onRowFieldBlur(tableId, idx, 'desc', v));
  const qty = useFieldState(row.qty, (v) => onRowFieldBlur(tableId, idx, 'qty', v, true));
  const rate = useFieldState(row.rate, (v) => onRowFieldBlur(tableId, idx, 'rate', v, true));
  const vat = useFieldState(row.vat, (v) => onRowFieldBlur(tableId, idx, 'vat', v, true));

  return (
    <div style={{ border: '1px solid #E7EAF0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8891A0' }}>ITEM {idx + 1}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button type="button" aria-label="Move up" disabled={isFirst} onClick={() => onMoveRow(tableId, idx, -1)} style={{ border: 'none', background: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#E2E6ED' : '#94A3B8', padding: 2 }}><ChevronUp size={14} /></button>
          <button type="button" aria-label="Move down" disabled={isLast} onClick={() => onMoveRow(tableId, idx, 1)} style={{ border: 'none', background: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#E2E6ED' : '#94A3B8', padding: 2 }}><ChevronDown size={14} /></button>
          <button type="button" aria-label="Remove item" disabled={rowCount <= 1} onClick={() => onRemoveRow(tableId, idx)} style={{ border: 'none', background: 'none', cursor: rowCount <= 1 ? 'default' : 'pointer', color: rowCount <= 1 ? '#E2E6ED' : '#CBD5E1', padding: 2 }}><X size={14} /></button>
        </div>
      </div>
      <Field label="Description" {...desc} placeholder="Item name" />
      <Field label="Details (optional)" {...details} placeholder="Short detail line" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Field label="Qty" {...qty} type="number" />
        <Field label="Rate" {...rate} type="number" />
        <Field label="VAT %" {...vat} type="number" />
      </div>
      <ItemImageControl row={row} idx={idx} tableId={tableId} onTableRowImageUpload={onTableRowImageUpload} onTableRowImageRemove={onTableRowImageRemove} />
    </div>
  );
}

function ItemsSection({ els, onRowFieldBlur, onAddRow, onRemoveRow, onMoveRow, onTableRowImageUpload, onTableRowImageRemove }) {
  const table = els.itemsTable;
  if (!table) return null;
  return (
    <div>
      <div style={groupTitle}>Items</div>
      <div style={groupSub}>Add, remove, and reorder line items — totals update automatically.</div>
      {table.rows.map((row, i) => (
        <ItemRow
          key={i} row={row} idx={i} isFirst={i === 0} isLast={i === table.rows.length - 1} rowCount={table.rows.length}
          tableId={table.id} onRowFieldBlur={onRowFieldBlur} onMoveRow={onMoveRow} onRemoveRow={onRemoveRow}
          onTableRowImageUpload={onTableRowImageUpload} onTableRowImageRemove={onTableRowImageRemove}
        />
      ))}
      <button type="button" onClick={() => onAddRow(table.id)} style={{ ...smallBtnGhost, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={14} /> Add Line Item
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Details: methods, bank rows, QR value
// ---------------------------------------------------------------------------
function QrControls({ el, onQrValueBlur }) {
  const [value, setValue] = useState(el.value || '');
  const [busy, setBusy] = useState(false);
  async function commit() {
    setBusy(true);
    try { await onQrValueBlur(el.id, value); } finally { setBusy(false); }
  }
  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>QR Payment — link, bank details, or invoice reference</div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} rows={2} style={textareaInput} placeholder="e.g. https://pay.example.com/invoice/INV-2026-0001" />
      <div style={{ fontSize: 11, color: '#8891A0', marginTop: 6 }}>{busy ? 'Generating QR code…' : 'The QR code updates when you click away.'}</div>
    </div>
  );
}

function BankRow({ row, idx, bankId, onBankRowBlur }) {
  const field = useFieldState(row.v, (v) => onBankRowBlur(bankId, idx, v));
  return <Field label={row.k} {...field} />;
}

function PaymentSection({ els, onTogglePaymentMethod, onBankRowBlur, onQrValueBlur }) {
  const payment = els.paymentMethods, bank = els.bankDetails, qr = els.qr;
  const active = new Set(payment?.methods || []);

  return (
    <div>
      <div style={groupTitle}>Payment Details</div>
      <div style={groupSub}>Accepted payment methods, bank details, and payment QR code.</div>

      {payment && (
        <div style={fieldWrap}>
          <div style={miniLabel}>Accepted payment methods</div>
          {ALL_PAYMENT_METHODS.map((label) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 12.5, color: '#334155' }}>{label}</span>
              <ToggleSwitch on={active.has(label)} onClick={() => onTogglePaymentMethod(payment.id, label)} label={label} />
            </div>
          ))}
        </div>
      )}

      {bank && (
        <div style={fieldWrap}>
          <div style={miniLabel}>Bank Details</div>
          {bank.rows.map((r, i) => <BankRow key={i} row={r} idx={i} bankId={bank.id} onBankRowBlur={onBankRowBlur} />)}
        </div>
      )}

      {qr && <QrControls el={qr} onQrValueBlur={onQrValueBlur} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes & Terms
// ---------------------------------------------------------------------------
function NotesTermsSection({ els, onFieldBlur }) {
  const notes = els.notes, terms = els.terms;
  const notesField = useFieldState(notes?.content, (v) => onFieldBlur('notes', 'content', v));
  const termsField = useFieldState(terms?.content, (v) => onFieldBlur('terms', 'content', v));
  if (!notes && !terms) return null;

  return (
    <div>
      <div style={groupTitle}>Notes & Terms</div>
      <div style={groupSub}>Shown below the totals on the invoice.</div>
      {notes && <Field label="Notes" {...notesField} textarea placeholder="Thank you for your business." />}
      {terms && <Field label="Terms & Conditions" {...termsField} textarea placeholder="Payment terms, late fees, etc." />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signature: upload / draw / type, title, approved-by, stamp
// ---------------------------------------------------------------------------
function SignatureControls({ el, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave }) {
  const initialTab = el.mode === 'typed' || !el.mode ? 'type' : 'upload';
  const [tab, setTab] = useState(initialTab);
  const [text, setText] = useState(el.text || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onSignatureUpload(el.id, file);
    setError(err || '');
  }

  const tabBtn = (id, label) => (
    <button type="button" onClick={() => setTab(id)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: tab === id ? '1px solid #2563EB' : '1px solid #E2E6ED', background: tab === id ? '#EFF6FF' : '#fff', color: tab === id ? '#2563EB' : '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>Signature</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {tabBtn('upload', 'Upload')}
        {tabBtn('draw', 'Draw')}
        {tabBtn('type', 'Type')}
      </div>
      {tab === 'upload' && (
        <div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
          <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>Upload Signature Image</button>
          {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 8 }}>{error}</div>}
        </div>
      )}
      {tab === 'draw' && <SignatureDraw onSave={(dataUrl) => onSignatureDrawSave(el.id, dataUrl)} />}
      {tab === 'type' && (
        <div>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onSignatureTypedSave(el.id, text)} style={textInput} placeholder="Type a name" />
          {text && <div style={{ fontFamily: "'Caveat',cursive", fontSize: 26, marginTop: 10, color: '#0F172A' }}>{text}</div>}
        </div>
      )}
    </div>
  );
}

function StampControls({ el, onImageUpload, onImageRemove, onStampOpacityChange, onCommitStampOpacity }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onImageUpload(el.id, file);
    setError(err || '');
  }
  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>Company Stamp (optional)</div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>{el.src ? 'Change Stamp' : 'Upload Stamp'}</button>
        {el.src && <button type="button" onClick={() => onImageRemove(el.id)} style={smallBtnGhost}>Remove</button>}
      </div>
      {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginBottom: 8 }}>{error}</div>}
      {el.src && (
        <>
          <div style={miniLabel}>Opacity</div>
          <input type="range" min="10" max="100" value={el.opacity ?? 100} onChange={(e) => onStampOpacityChange(el.id, Number(e.target.value))} onMouseUp={onCommitStampOpacity} onTouchEnd={onCommitStampOpacity} style={{ width: '100%' }} />
        </>
      )}
    </div>
  );
}

function SignatureSection({ els, onFieldBlur, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave, onImageUpload, onImageRemove, onStampOpacityChange, onCommitStampOpacity }) {
  const signature = els.signature, approval = els.approvedBy, stamp = els.stamp;
  const name = useFieldState(approval?.name, (v) => onFieldBlur('approvedBy', 'name', v));
  const role = useFieldState(approval?.role, (v) => onFieldBlur('approvedBy', 'role', v));

  return (
    <div>
      <div style={groupTitle}>Signature</div>
      <div style={groupSub}>Approval name/title, signature, and an optional company stamp.</div>
      {approval && (
        <>
          <Field label="Approved By (name)" {...name} placeholder="Full name" />
          <Field label="Title" {...role} placeholder="e.g. Finance Officer" />
        </>
      )}
      {signature && <SignatureControls el={signature} onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave} onSignatureTypedSave={onSignatureTypedSave} />}
      {stamp && <StampControls el={stamp} onImageUpload={onImageUpload} onImageRemove={onImageRemove} onStampOpacityChange={onStampOpacityChange} onCommitStampOpacity={onCommitStampOpacity} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A field is "live while typing, committed on blur" — this small hook keeps
// each field's in-progress value local (for instant preview feedback) while
// only calling the real commit function on blur, matching how every field
// in this panel behaves. Declared once, used by every section above.
// ---------------------------------------------------------------------------
function useFieldState(initialValue, commit) {
  const [value, setValue] = useState(initialValue ?? '');
  return { value, onChange: setValue, onBlur: () => commit(value) };
}

export default function ContentPanel({
  elements, onFieldBlur, onMetaRowBlur, onBankRowBlur, onRowFieldBlur,
  onAddRow, onRemoveRow, onMoveRow, onTogglePaymentMethod,
  onTableRowImageUpload, onTableRowImageRemove, onQrValueBlur,
  onImageUpload, onImageRemove, onOpenCrop, onLetterheadRemove,
  onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave,
  onStampOpacityChange, onCommitStampOpacity,
  docSettings, onDocSettingChange, onCommitDocSetting, currencies,
}) {
  const els = Object.fromEntries(elements.map((e) => [e.id, e]));

  return (
    <div>
      <BusinessSection els={els} onFieldBlur={onFieldBlur} onImageUpload={onImageUpload} onImageRemove={onImageRemove} onOpenCrop={onOpenCrop} onLetterheadRemove={onLetterheadRemove} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <ClientSection els={els} onFieldBlur={onFieldBlur} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <InvoiceDetailsSection els={els} onMetaRowBlur={onMetaRowBlur} docSettings={docSettings} onDocSettingChange={onDocSettingChange} onCommitDocSetting={onCommitDocSetting} currencies={currencies} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <ItemsSection els={els} onRowFieldBlur={onRowFieldBlur} onAddRow={onAddRow} onRemoveRow={onRemoveRow} onMoveRow={onMoveRow} onTableRowImageUpload={onTableRowImageUpload} onTableRowImageRemove={onTableRowImageRemove} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <PaymentSection els={els} onTogglePaymentMethod={onTogglePaymentMethod} onBankRowBlur={onBankRowBlur} onQrValueBlur={onQrValueBlur} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <NotesTermsSection els={els} onFieldBlur={onFieldBlur} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <SignatureSection
        els={els} onFieldBlur={onFieldBlur} onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave}
        onSignatureTypedSave={onSignatureTypedSave} onImageUpload={onImageUpload} onImageRemove={onImageRemove}
        onStampOpacityChange={onStampOpacityChange} onCommitStampOpacity={onCommitStampOpacity}
      />
    </div>
  );
}
