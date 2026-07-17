'use client';

import { useRef, useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, ImagePlus } from 'lucide-react';
import SignatureDraw from '../SignatureDraw';
import { CURRENCIES } from '@/lib/invoice-studio/sectionsModel';

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

// Live while typing (instant preview feedback), committed on blur (one
// history/undo step, not one per keystroke) - same pattern every field in
// this panel uses.
function useFieldState(initialValue, commit) {
  const [value, setValue] = useState(initialValue ?? '');
  return { value, onChange: setValue, onBlur: () => commit(value) };
}

function BusinessSection({ header, onPatch, onImageUpload, onImageRemove, letterhead, onOpenCrop, onLetterheadRemove }) {
  const logoInputRef = useRef(null);
  const [logoError, setLogoError] = useState('');

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onImageUpload('header', 'logoSrc', file);
    setLogoError(err || '');
  }

  const name = useFieldState(header.companyName, (v) => onPatch('header', { companyName: v }));
  const tagline = useFieldState(header.tagline, (v) => onPatch('header', { tagline: v }));
  const phone = useFieldState(header.phone, (v) => onPatch('header', { phone: v }));
  const email = useFieldState(header.email, (v) => onPatch('header', { email: v }));
  const website = useFieldState(header.website, (v) => onPatch('header', { website: v }));
  const address = useFieldState(header.address, (v) => onPatch('header', { address: v }));

  return (
    <div>
      <div style={groupTitle}>Business Information</div>
      <div style={groupSub}>Appears in the invoice header. Updates the preview as you type.</div>

      <div style={fieldWrap}>
        <div style={miniLabel}>Logo</div>
        <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => logoInputRef.current?.click()} style={smallBtnGhost}>{header.logoSrc ? 'Change Logo' : 'Upload Logo'}</button>
          {header.logoSrc && <button type="button" onClick={() => onImageRemove('header', 'logoSrc')} style={smallBtnGhost}>Remove</button>}
        </div>
        {logoError && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 6 }}>{logoError}</div>}
      </div>

      <div style={fieldWrap}>
        <div style={miniLabel}>Letterhead (replaces the header design with your printed letterhead image)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onOpenCrop} style={smallBtnGhost}>{letterhead.src ? 'Re-crop' : 'Upload'}</button>
          {letterhead.src && <button type="button" onClick={onLetterheadRemove} style={smallBtnGhost}>Remove</button>}
        </div>
      </div>

      <Field label="Company Name" {...name} placeholder="Your Business Ltd." />
      <Field label="Tagline (optional)" {...tagline} placeholder="A short tagline" />
      <Field label="Phone" {...phone} placeholder="+234 800 000 0000" />
      <Field label="Email" {...email} placeholder="hello@yourbusiness.com" />
      <Field label="Website (optional)" {...website} placeholder="www.yourbusiness.com" />
      <Field label="Address" {...address} textarea rows={2} placeholder="Street, city, state" />
    </div>
  );
}

function ClientSection({ clientInfo, onPatch }) {
  const name = useFieldState(clientInfo.clientName, (v) => onPatch('clientInfo', { clientName: v }));
  const address = useFieldState(clientInfo.clientAddress, (v) => onPatch('clientInfo', { clientAddress: v }));
  const phone = useFieldState(clientInfo.clientPhone, (v) => onPatch('clientInfo', { clientPhone: v }));

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

function InvoiceDetailsSection({ clientInfo, onPatch, currency, onCurrencyChange, onInvoiceDateChange, onDueDateChange }) {
  const no = useFieldState(clientInfo.invoiceNo, (v) => onPatch('clientInfo', { invoiceNo: v }));
  const status = useFieldState(clientInfo.status, (v) => onPatch('clientInfo', { status: v }));

  return (
    <div>
      <div style={groupTitle}>Invoice Details</div>
      <div style={groupSub}>Invoice number, dates, status, and currency.</div>
      <Field label="Invoice Number" {...no} placeholder="INV-2026-0001" />
      <div style={fieldWrap}>
        <div style={miniLabel}>Invoice Date</div>
        <input type="date" value={clientInfo.invoiceDate || ''} onChange={(e) => onInvoiceDateChange(e.target.value)} style={textInput} />
      </div>
      <div style={fieldWrap}>
        <div style={miniLabel}>Due Date {!clientInfo.dueDateManual && <span style={{ color: '#94A3B8', fontWeight: 400 }}>(auto: 30 days after invoice date)</span>}</div>
        <input type="date" value={clientInfo.dueDate || ''} onChange={(e) => onDueDateChange(e.target.value)} style={textInput} />
      </div>
      <Field label="Status" {...status} placeholder="Unpaid / Paid / Overdue" />
      <div style={fieldWrap}>
        <div style={miniLabel}>Currency</div>
        <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={textInput}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
        </select>
      </div>
    </div>
  );
}

function ItemImageControl({ row, idx, onRowImageUpload, onRowImageRemove }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onRowImageUpload(idx, file);
    setError(err || '');
  }
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      {row.img ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.img} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          <button type="button" onClick={() => onRowImageRemove(idx)} style={{ ...smallBtnGhost, padding: '5px 10px' }}>Remove image</button>
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

function ItemRow({ row, idx, isFirst, isLast, rowCount, onRowField, onMoveRow, onRemoveRow, onRowImageUpload, onRowImageRemove }) {
  const desc = useFieldState(row.name, (v) => onRowField(idx, 'name', v));
  const details = useFieldState(row.desc, (v) => onRowField(idx, 'desc', v));
  const qty = useFieldState(row.qty, (v) => onRowField(idx, 'qty', v));
  const rate = useFieldState(row.rate, (v) => onRowField(idx, 'rate', v));
  const vat = useFieldState(row.vat, (v) => onRowField(idx, 'vat', v));

  return (
    <div style={{ border: '1px solid #E7EAF0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8891A0' }}>ITEM {idx + 1}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button type="button" aria-label="Move up" disabled={isFirst} onClick={() => onMoveRow(idx, -1)} style={{ border: 'none', background: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#E2E6ED' : '#94A3B8', padding: 2 }}><ChevronUp size={14} /></button>
          <button type="button" aria-label="Move down" disabled={isLast} onClick={() => onMoveRow(idx, 1)} style={{ border: 'none', background: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#E2E6ED' : '#94A3B8', padding: 2 }}><ChevronDown size={14} /></button>
          <button type="button" aria-label="Remove item" disabled={rowCount <= 1} onClick={() => onRemoveRow(idx)} style={{ border: 'none', background: 'none', cursor: rowCount <= 1 ? 'default' : 'pointer', color: rowCount <= 1 ? '#E2E6ED' : '#CBD5E1', padding: 2 }}><X size={14} /></button>
        </div>
      </div>
      <Field label="Description" {...desc} placeholder="Item name" />
      <Field label="Details (optional)" {...details} placeholder="Short detail line" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Field label="Qty" {...qty} type="number" />
        <Field label="Rate" {...rate} type="number" />
        <Field label="VAT %" {...vat} type="number" />
      </div>
      <ItemImageControl row={row} idx={idx} onRowImageUpload={onRowImageUpload} onRowImageRemove={onRowImageRemove} />
    </div>
  );
}

function ItemsSection({ itemsTable, onRowField, onAddRow, onRemoveRow, onMoveRow, onRowImageUpload, onRowImageRemove }) {
  return (
    <div>
      <div style={groupTitle}>Items</div>
      <div style={groupSub}>Add, remove, and reorder line items — totals update automatically.</div>
      {itemsTable.rows.map((row, i) => (
        <ItemRow
          key={i} row={row} idx={i} isFirst={i === 0} isLast={i === itemsTable.rows.length - 1} rowCount={itemsTable.rows.length}
          onRowField={onRowField} onMoveRow={onMoveRow} onRemoveRow={onRemoveRow}
          onRowImageUpload={onRowImageUpload} onRowImageRemove={onRowImageRemove}
        />
      ))}
      <button type="button" onClick={onAddRow} style={{ ...smallBtnGhost, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={14} /> Add Line Item
      </button>
    </div>
  );
}

function QrControls({ qr, onPatchQr }) {
  const [value, setValue] = useState(qr.value || '');
  const [busy, setBusy] = useState(false);
  async function commit() {
    setBusy(true);
    try { await onPatchQr(value); } finally { setBusy(false); }
  }
  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>QR Payment — link, bank details, or invoice reference</div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} rows={2} style={textareaInput} placeholder="e.g. https://pay.example.com/invoice/INV-2026-0001" />
      <div style={{ fontSize: 11, color: '#8891A0', marginTop: 6 }}>{busy ? 'Generating QR code…' : 'The QR code updates when you click away.'}</div>
    </div>
  );
}

function BankRow({ row, idx, onBankRowField }) {
  const field = useFieldState(row.v, (v) => onBankRowField(idx, v));
  return <Field label={row.k} {...field} />;
}

function BankQrSection({ bank, qr, onBankRowField, onPatchQr }) {
  return (
    <div>
      <div style={groupTitle}>Payment Details</div>
      <div style={groupSub}>Bank details and payment QR code. Turn Bank Details off from the Design tab if you don't need it.</div>

      <div style={fieldWrap}>
        <div style={miniLabel}>Bank Details</div>
        {bank.rows.map((r, i) => <BankRow key={i} row={r} idx={i} onBankRowField={onBankRowField} />)}
      </div>

      <QrControls qr={qr} onPatchQr={onPatchQr} />
    </div>
  );
}

function NotesTermsSection({ notes, terms, watermark, onPatch }) {
  const notesField = useFieldState(notes.content, (v) => onPatch('notes', { content: v }));
  const termsField = useFieldState(terms.content, (v) => onPatch('terms', { content: v }));
  const watermarkField = useFieldState(watermark.content, (v) => onPatch('watermark', { content: v }));
  return (
    <div>
      <div style={groupTitle}>Notes & Terms</div>
      <div style={groupSub}>Shown below the totals on the invoice.</div>
      <Field label="Notes" {...notesField} textarea placeholder="Thank you for your business." />
      <Field label="Terms & Conditions" {...termsField} textarea placeholder="Payment terms, late fees, etc." />
      <Field label="Watermark Text (e.g. UNPAID, PAID, DRAFT)" {...watermarkField} placeholder="UNPAID" />
    </div>
  );
}

function SignatureControls({ signature, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave }) {
  const initialTab = signature.mode === 'typed' || !signature.mode ? 'type' : 'upload';
  const [tab, setTab] = useState(initialTab);
  const [text, setText] = useState(signature.text || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onSignatureUpload(file);
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>{tabBtn('upload', 'Upload')}{tabBtn('draw', 'Draw')}{tabBtn('type', 'Type')}</div>
      {tab === 'upload' && (
        <div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
          <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>Upload Signature Image</button>
          {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 8 }}>{error}</div>}
        </div>
      )}
      {tab === 'draw' && <SignatureDraw onSave={(dataUrl) => onSignatureDrawSave(dataUrl)} />}
      {tab === 'type' && (
        <div>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onSignatureTypedSave(text)} style={textInput} placeholder="Type a name" />
          {text && <div style={{ fontFamily: "'Caveat',cursive", fontSize: 26, marginTop: 10, color: '#0F172A' }}>{text}</div>}
        </div>
      )}
    </div>
  );
}

function SignatureSizeControl({ signature, onPatch }) {
  if (!signature.src) return null;
  return (
    <div style={fieldWrap}>
      <div style={miniLabel}>Signature Size</div>
      <input
        type="range" min="24" max="90" step="2" value={signature.size ?? 40}
        onChange={(e) => onPatch('signature', { size: Number(e.target.value) })}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#8891A0', marginTop: 2 }}>
        <span>Small</span><span>Medium</span><span>Large</span>
      </div>
    </div>
  );
}

function SignatureSectionPanel({ signature, onPatch, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave }) {
  const name = useFieldState(signature.approvedName, (v) => onPatch('signature', { approvedName: v }));
  const role = useFieldState(signature.approvedRole, (v) => onPatch('signature', { approvedRole: v }));

  return (
    <div>
      <div style={groupTitle}>Signature</div>
      <div style={groupSub}>Approval name/title and signature.</div>
      <Field label="Approved By (name)" {...name} placeholder="Full name" />
      <Field label="Title" {...role} placeholder="e.g. Finance Officer" />
      <SignatureControls signature={signature} onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave} onSignatureTypedSave={onSignatureTypedSave} />
      <SignatureSizeControl signature={signature} onPatch={onPatch} />
    </div>
  );
}

export default function ContentPanel({
  sections, currency, onPatchSection, onCurrencyChange, onInvoiceDateChange, onDueDateChange,
  onRowField, onAddRow, onRemoveRow, onMoveRow, onRowImageUpload, onRowImageRemove,
  onBankRowField, onPatchQr,
  onImageUpload, onImageRemove, onOpenCrop, onLetterheadRemove,
  onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave,
}) {
  return (
    <div>
      <BusinessSection header={sections.header} onPatch={onPatchSection} onImageUpload={onImageUpload} onImageRemove={onImageRemove} letterhead={sections.letterhead} onOpenCrop={onOpenCrop} onLetterheadRemove={onLetterheadRemove} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <ClientSection clientInfo={sections.clientInfo} onPatch={onPatchSection} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <InvoiceDetailsSection clientInfo={sections.clientInfo} onPatch={onPatchSection} currency={currency} onCurrencyChange={onCurrencyChange} onInvoiceDateChange={onInvoiceDateChange} onDueDateChange={onDueDateChange} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <ItemsSection itemsTable={sections.itemsTable} onRowField={onRowField} onAddRow={onAddRow} onRemoveRow={onRemoveRow} onMoveRow={onMoveRow} onRowImageUpload={onRowImageUpload} onRowImageRemove={onRowImageRemove} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <BankQrSection bank={sections.bank} qr={sections.qr} onBankRowField={onBankRowField} onPatchQr={onPatchQr} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <NotesTermsSection notes={sections.notes} terms={sections.terms} watermark={sections.watermark} onPatch={onPatchSection} />
      <div style={{ borderTop: '1px solid #F0F1F3', margin: '18px 0' }} />
      <SignatureSectionPanel
        signature={sections.signature} onPatch={onPatchSection}
        onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave} onSignatureTypedSave={onSignatureTypedSave}
      />
    </div>
  );
}
