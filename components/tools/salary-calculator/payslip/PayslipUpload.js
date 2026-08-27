'use client';

// Payslip upload → AI document understanding → review/edit → apply to the
// existing Salary Calculator. Payslip layouts vary too much across
// companies/countries for local keyword/position rules to generalize, so a
// vision model reads the actual document (every page, its table columns,
// its section structure) the way a person would — this is the primary
// extraction method, not an optional fallback, and the UI says so plainly
// before anything is sent.
//
// Flow: upload → preview (with an explicit, unavoidable AI-processing
// notice) → redact (optional) → AI extraction → review, grouped as
// Earnings / Deductions / Summary, every figure editable → Calculate
// Salary (hands off to the same gross/frequency/currency/deductions state
// the manual entry form already uses — no separate calculation engine).
import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import NumberInput from '../NumberInput';
import { STATUS } from '@/lib/payslip/fields';
import { renderPayslipPages, RenderPagesError } from '@/lib/payslip/renderPages';
import { extractPayslipWithAI, PayslipAIError } from '@/lib/payslip/aiExtract';
import { FREQUENCIES } from '../calculations';
import { ALL_CURRENCIES } from '../currencies';
import PayslipRedactor from './PayslipRedactor';

// Deduction line items whose printed label suggests they reduce TAXABLE
// income before tax is applied (matches the calculator's own existing
// before/after-tax convention — see calculations.js) — this classifies an
// already AI-identified deduction for that pre-existing mechanic, it does
// not extract or find anything from the document itself.
const BEFORE_TAX_KEYWORDS = ['tax', 'paye', 'pit', 'pension'];
function isBeforeTax(label) {
  const l = (label || '').toLowerCase();
  return BEFORE_TAX_KEYWORDS.some((k) => l.includes(k));
}

function sumConfirmed(items) {
  return (items || []).filter((it) => it.status !== STATUS.NOT_FOUND && Number.isFinite(it.amount)).reduce((s, it) => s + it.amount, 0);
}

function buildCalculatorPayload(result) {
  let gross = 0;
  let grossComputed = false;
  if (result.grossEarnings.status !== STATUS.NOT_FOUND && Number.isFinite(result.grossEarnings.amount)) {
    gross = result.grossEarnings.amount;
  } else {
    const basic = result.basicPay.status !== STATUS.NOT_FOUND && Number.isFinite(result.basicPay.amount) ? result.basicPay.amount : 0;
    const allowances = sumConfirmed(result.allowances);
    const bonuses = sumConfirmed(result.bonuses);
    if (basic || allowances || bonuses) { gross = basic + allowances + bonuses; grossComputed = true; }
  }

  let nextId = 1;
  const deductions = (result.deductions || [])
    .filter((it) => it.status !== STATUS.NOT_FOUND && Number.isFinite(it.amount))
    .map((it) => ({ id: nextId++, name: it.label || 'Deduction', type: 'amount', value: String(it.amount), beforeTax: isBeforeTax(it.label) }));
  if (!deductions.length && result.totalDeductions.status !== STATUS.NOT_FOUND && Number.isFinite(result.totalDeductions.amount)) {
    deductions.push({ id: nextId++, name: 'Total Deductions', type: 'amount', value: String(result.totalDeductions.amount), beforeTax: false });
  }

  // Only carried over as separate calculator "bonus" rows when gross was
  // NOT computed by summing them in above — otherwise they'd be counted
  // twice.
  const bonuses = grossComputed
    ? []
    : (result.bonuses || []).filter((it) => it.status !== STATUS.NOT_FOUND && Number.isFinite(it.amount)).map((it, i) => ({ id: i + 1, name: it.label || 'Bonus', amount: String(it.amount) }));

  const frequency = result.payFrequency.status !== STATUS.NOT_FOUND ? result.payFrequency.value : null;
  const currencyCode = result.currency.status !== STATUS.NOT_FOUND && ALL_CURRENCIES.some((c) => c.code === result.currency.value) ? result.currency.value : null;
  const netPayStated = result.netPay.status !== STATUS.NOT_FOUND && Number.isFinite(result.netPay.amount) ? result.netPay.amount : null;

  return { gross: String(gross || ''), deductions, bonuses, frequency, currencyCode, netPayStated };
}

function StatusNote({ status }) {
  if (status === STATUS.NEEDS_VERIFICATION) {
    return <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '1px 6px', marginLeft: 6, whiteSpace: 'nowrap' }}>Needs verification</span>;
  }
  return null;
}

function AmountRow({ label, field, editing, onChange }) {
  const found = field.status !== STATUS.NOT_FOUND;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{label}</span>
      {editing ? (
        <div style={{ width: 160 }}>
          <NumberInput ariaLabel={label} value={found ? String(field.amount) : ''} onChange={(v) => onChange({ amount: v === '' ? null : parseFloat(v), status: v === '' ? STATUS.NOT_FOUND : STATUS.CONFIRMED })} placeholder="Not found" />
        </div>
      ) : (
        <span style={{ fontSize: '0.82rem', color: found ? '#0F172A' : '#94A3B8', fontStyle: found ? 'normal' : 'italic' }}>
          {found ? Number(field.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Not found'}
          <StatusNote status={field.status} />
        </span>
      )}
    </div>
  );
}

function LineItemsList({ items, editing, onChangeAmount, emptyLabel }) {
  if (!items?.length) return <p style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic', margin: '4px 0' }}>{emptyLabel}</p>;
  return items.map((it, i) => {
    const found = it.status !== STATUS.NOT_FOUND;
    return (
      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '0.82rem', color: '#334155' }}>{it.label || '—'}</span>
        {editing ? (
          <div style={{ width: 160 }}>
            <NumberInput ariaLabel={it.label} value={found ? String(it.amount) : ''} onChange={(v) => onChangeAmount(i, { amount: v === '' ? null : parseFloat(v), status: v === '' ? STATUS.NOT_FOUND : STATUS.CONFIRMED })} placeholder="0.00" />
          </div>
        ) : (
          <span style={{ fontSize: '0.82rem', color: found ? '#0F172A' : '#94A3B8', fontStyle: found ? 'normal' : 'italic' }}>
            {found ? Number(it.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Not found'}
            <StatusNote status={it.status} />
          </span>
        )}
      </div>
    );
  });
}

export default function PayslipUpload({ onApply, onBack }) {
  const [step, setStep] = useState('upload'); // upload | preview | redact | processing | review | error
  const [pages, setPages] = useState(null); // [{ canvas, width, height }]
  const [redactedCanvases, setRedactedCanvases] = useState(null); // null until applied
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(false);

  const wasRedacted = !!redactedCanvases;

  async function handleFile(file) {
    setErrorMsg('');
    setStep('processing');
    try {
      const rendered = await renderPayslipPages(file);
      setPages(rendered.pages);
      setRedactedCanvases(null);
      setStep('preview');
    } catch (err) {
      setErrorMsg(err instanceof RenderPagesError ? err.message : 'Could not read this file.');
      setStep('error');
    }
  }

  async function runAIExtraction(canvases) {
    setStep('processing');
    setErrorMsg('');
    try {
      const extracted = await extractPayslipWithAI(canvases);
      setResult(extracted);
      setEditing(false);
      setStep('review');
    } catch (err) {
      setErrorMsg(err instanceof PayslipAIError ? err.message : 'Could not analyze this payslip.');
      setStep('error');
    }
  }

  function handleRedactionApplied(flattenedCanvases) {
    setRedactedCanvases(flattenedCanvases);
    runAIExtraction(flattenedCanvases);
  }

  function updateScalar(key, patch) {
    setResult((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }
  function updateLineItem(listKey, index, patch) {
    setResult((prev) => ({ ...prev, [listKey]: prev[listKey].map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  }

  function handleCalculate() {
    onApply(buildCalculatorPayload(result));
  }

  // ---------------- upload ----------------
  if (step === 'upload') {
    return (
      <div className="sal2-card">
        <div className="sal2-card-title" style={{ marginBottom: 4 }}>📄 Upload your payslip</div>
        <p className="sal2-card-sub">PDF, JPG, PNG, or WebP.</p>
        <UploadBox
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
          multiple={false}
          onFiles={(files) => files[0] && handleFile(files[0])}
          label="Click to choose your payslip, or drag it here"
          maxSizeMB={20}
        />
        <p style={{ fontSize: '0.72rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px', marginTop: 12 }}>
          🤖 Reading a payslip requires sending it to our AI service (Google Gemini) — this is not local-only. You can redact any sensitive area first; see the next step.
        </p>
        <button className="sal2-ghost-btn" style={{ marginTop: 10 }} onClick={onBack}>← Back to manual entry</button>
      </div>
    );
  }

  // ---------------- preview ----------------
  if (step === 'preview') {
    return (
      <div className="sal2-card">
        <div className="sal2-card-title" style={{ marginBottom: 4 }}>Preview</div>
        <p className="sal2-card-sub">{pages.length} page{pages.length > 1 ? 's' : ''} — check it's the right document before continuing.</p>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC', padding: 12, maxHeight: 420, overflow: 'auto', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pages[0].canvas.toDataURL()} alt="Payslip preview" style={{ maxWidth: '100%', borderRadius: 6 }} />
        </div>
        <div style={{ marginTop: 14, padding: 12, border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff' }}>
          <button className="sal2-ghost-btn" onClick={() => setStep('redact')}>▣ Redact information</button>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '6px 0 0' }}>Hide sensitive personal information before it's sent for analysis.</p>
        </div>
        <p style={{ fontSize: '0.76rem', color: '#7C2D12', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 10px', marginTop: 12 }}>
          🤖 Clicking below sends this document's page images to our AI service (Google Gemini) to read its figures. Nothing is applied to the calculator until you review and confirm the results.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <button className="sal2-ghost-btn" onClick={() => setStep('upload')}>Choose a different file</button>
          <button className="sal2-add-btn" onClick={() => runAIExtraction(pages.map((p) => p.canvas))}>🔎 Analyze with AI →</button>
        </div>
      </div>
    );
  }

  // ---------------- redact ----------------
  if (step === 'redact') {
    return (
      <div className="sal2-card">
        <div className="sal2-card-title" style={{ marginBottom: 4 }}>▣ Redact sensitive information</div>
        <PayslipRedactor pages={pages} onCancel={() => setStep('preview')} onApply={handleRedactionApplied} />
      </div>
    );
  }

  // ---------------- processing ----------------
  if (step === 'processing') {
    return (
      <div className="sal2-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>🤖</div>
        <p style={{ color: '#475569', fontSize: '0.88rem' }}>Analyzing payslip with AI…</p>
      </div>
    );
  }

  // ---------------- error ----------------
  if (step === 'error') {
    return (
      <div className="sal2-card">
        <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: 12 }}>⚠️ {errorMsg}</p>
        <button className="sal2-ghost-btn" onClick={() => setStep(pages ? 'preview' : 'upload')}>{pages ? 'Back to preview' : 'Choose a different file'}</button>
      </div>
    );
  }

  // ---------------- review ----------------
  return (
    <div className="sal2-card">
      <div className="sal2-card-title" style={{ marginBottom: 4 }}>Payslip information found</div>
      <p className="sal2-card-sub">Review every figure below — nothing is applied to the calculator until you click Calculate Salary.</p>

      {wasRedacted && (
        <p style={{ fontSize: '0.72rem', color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
          Only your redacted copy was sent for analysis — the original document was not.
        </p>
      )}
      {result.reconciliationNote && (
        <p style={{ fontSize: '0.78rem', color: '#7C2D12', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          ⚠️ {result.reconciliationNote}
        </p>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Earnings</div>
        <AmountRow label="Basic Pay" field={result.basicPay} editing={editing} onChange={(p) => updateScalar('basicPay', p)} />
        <AmountRow label="Gross / Total Earnings" field={result.grossEarnings} editing={editing} onChange={(p) => updateScalar('grossEarnings', p)} />
        {(editing || result.allowances.length > 0) && <>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 6 }}>Allowances</div>
          <LineItemsList items={result.allowances} editing={editing} onChangeAmount={(i, p) => updateLineItem('allowances', i, p)} emptyLabel="No allowances found" />
        </>}
        {(editing || result.bonuses.length > 0) && <>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 6 }}>Bonuses / Overtime / Commission</div>
          <LineItemsList items={result.bonuses} editing={editing} onChangeAmount={(i, p) => updateLineItem('bonuses', i, p)} emptyLabel="None found" />
        </>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Deductions</div>
        <LineItemsList items={result.deductions} editing={editing} onChangeAmount={(i, p) => updateLineItem('deductions', i, p)} emptyLabel="No deductions found" />
        <AmountRow label="Total Deductions" field={result.totalDeductions} editing={editing} onChange={(p) => updateScalar('totalDeductions', p)} />
      </div>

      {result.contributions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Employer Contributions</div>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '0 0 4px' }}>Paid by your employer — not part of your take-home calculation.</p>
          <LineItemsList items={result.contributions} editing={editing} onChangeAmount={(i, p) => updateLineItem('contributions', i, p)} emptyLabel="" />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Summary</div>
        <AmountRow label="Net Pay" field={result.netPay} editing={editing} onChange={(p) => updateScalar('netPay', p)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>Pay Period</span>
          {editing ? (
            <select className="sal2-select" style={{ width: 160 }} value={result.payFrequency.status !== STATUS.NOT_FOUND ? result.payFrequency.value : ''} onChange={(e) => updateScalar('payFrequency', { value: e.target.value, status: e.target.value ? STATUS.CONFIRMED : STATUS.NOT_FOUND })}>
              <option value="">Not set</option>
              {FREQUENCIES.map((fr) => <option key={fr.id} value={fr.id}>{fr.label}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: '0.82rem', color: result.payFrequency.status !== STATUS.NOT_FOUND ? '#0F172A' : '#94A3B8', fontStyle: result.payFrequency.status !== STATUS.NOT_FOUND ? 'normal' : 'italic' }}>
              {result.payFrequency.status !== STATUS.NOT_FOUND ? (FREQUENCIES.find((fr) => fr.id === result.payFrequency.value)?.label || result.payPeriod.value || result.payFrequency.value) : 'Not found'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>Currency</span>
          {editing ? (
            <select className="sal2-select" style={{ width: 160 }} value={result.currency.status !== STATUS.NOT_FOUND ? result.currency.value : ''} onChange={(e) => updateScalar('currency', { value: e.target.value, status: e.target.value ? STATUS.CONFIRMED : STATUS.NOT_FOUND })}>
              <option value="">Not set</option>
              {ALL_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: '0.82rem', color: result.currency.status !== STATUS.NOT_FOUND ? '#0F172A' : '#94A3B8', fontStyle: result.currency.status !== STATUS.NOT_FOUND ? 'normal' : 'italic' }}>{result.currency.status !== STATUS.NOT_FOUND ? result.currency.value : 'Not found'}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <button className="sal2-ghost-btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : 'Edit'}</button>
        <button className="sal2-add-btn" onClick={handleCalculate}>Calculate Salary</button>
      </div>
      <button className="sal2-ghost-btn" style={{ marginTop: 12 }} onClick={() => setStep('upload')}>Choose a different file</button>
    </div>
  );
}
