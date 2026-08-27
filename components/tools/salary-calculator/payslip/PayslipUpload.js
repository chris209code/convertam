'use client';

// Payslip upload → local-first extraction → review/edit → apply to the
// existing Salary Calculator. AI is never called automatically — it's an
// explicit, consent-gated fallback the user opts into only when local
// extraction (layout-aware text parsing, or client-side OCR for
// scanned/photographed payslips) couldn't confidently read the document.
//
// Flow: upload → preview → redact (optional) → process/extract → review →
// (optional AI fallback) → Calculate Salary (hands off to the same
// gross/frequency/currencyCode/deductions/bonuses state the manual entry
// form already uses — no separate calculation engine).
import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import NumberInput from '../NumberInput';
import { FIELD_DEFS, foundAmountCount } from '@/lib/payslip/fields';
import { renderPayslipPages, RenderPagesError } from '@/lib/payslip/renderPages';
import { extractPayslipFieldsFromItems, mergePageResults } from '@/lib/payslip/layoutExtract';
import { ocrPages, OcrError } from '@/lib/payslip/ocr';
import { extractPayslipWithAI, PayslipAIError } from '@/lib/payslip/aiExtract';
import { FREQUENCIES } from '../calculations';
import { ALL_CURRENCIES } from '../currencies';
import PayslipRedactor from './PayslipRedactor';

const RELIABILITY_FLOOR = 2; // fewer than this many fields found → prominently suggest the AI fallback

function buildCalculatorPayload(fields) {
  let gross = 0;
  let grossComputed = false;
  if (fields.grossEarnings.found) {
    gross = fields.grossEarnings.amount;
  } else {
    const parts = [fields.basicPay, fields.allowances, fields.bonuses].filter((f) => f.found);
    if (parts.length) { gross = parts.reduce((s, f) => s + f.amount, 0); grossComputed = true; }
  }

  const deductions = [];
  let nextId = 1;
  if (fields.paye.found) deductions.push({ id: nextId++, name: fields.paye.label || 'PAYE', type: 'amount', value: String(fields.paye.amount), beforeTax: true });
  if (fields.pension.found) deductions.push({ id: nextId++, name: fields.pension.label || 'Pension', type: 'amount', value: String(fields.pension.amount), beforeTax: true });
  if (fields.nhf.found) deductions.push({ id: nextId++, name: fields.nhf.label || 'NHF', type: 'amount', value: String(fields.nhf.amount), beforeTax: false });
  if (fields.otherDeductions.found) deductions.push({ id: nextId++, name: fields.otherDeductions.label || 'Other Deductions', type: 'amount', value: String(fields.otherDeductions.amount), beforeTax: false });
  if (!deductions.length && fields.totalDeductions.found) {
    deductions.push({ id: nextId++, name: fields.totalDeductions.label || 'Total Deductions', type: 'amount', value: String(fields.totalDeductions.amount), beforeTax: false });
  }

  // Only added as its own line when gross was found DIRECTLY — when gross
  // was computed by summing basicPay+allowances+bonuses above, the bonus
  // figure is already inside it and adding it again here would double-count.
  const bonuses = fields.bonuses.found && !grossComputed ? [{ id: 1, name: 'Bonus', amount: String(fields.bonuses.amount) }] : [];

  const frequency = fields.payPeriod.found ? fields.payPeriod.value : null;
  const currencyCode = fields.currencyCode.found && ALL_CURRENCIES.some((c) => c.code === fields.currencyCode.value) ? fields.currencyCode.value : null;
  const netPayStated = fields.netPay.found ? fields.netPay.amount : null;

  return { gross: String(gross || ''), grossComputed, deductions, bonuses, frequency, currencyCode, netPayStated };
}

export default function PayslipUpload({ onApply, onBack }) {
  const [step, setStep] = useState('upload'); // upload | preview | redact | processing | review | error
  const [pages, setPages] = useState(null); // [{ canvas, width, height, textItems }]
  const [isScanned, setIsScanned] = useState(false);
  const [redactedCanvases, setRedactedCanvases] = useState(null); // null until applied
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fields, setFields] = useState(null);
  const [usedColumnHeuristic, setUsedColumnHeuristic] = useState(false);
  const [source, setSource] = useState('local'); // 'local' | 'ai'
  const [editing, setEditing] = useState(false);
  const [aiConsentOpen, setAiConsentOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const wasRedacted = !!redactedCanvases;

  async function handleFile(file) {
    setErrorMsg('');
    setStep('processing');
    setStatusMsg('Opening payslip…');
    try {
      const result = await renderPayslipPages(file);
      setPages(result.pages);
      setIsScanned(result.isScanned);
      setRedactedCanvases(null);
      setStep('preview');
    } catch (err) {
      setErrorMsg(err instanceof RenderPagesError ? err.message : 'Could not read this file.');
      setStep('error');
    }
  }

  async function runExtraction() {
    setStep('processing');
    setErrorMsg('');
    try {
      let pageResults;
      if (!wasRedacted && !isScanned) {
        setStatusMsg('Reading payslip…');
        pageResults = pages.map((p) => extractPayslipFieldsFromItems(p.textItems, { yTolerance: 4 }));
      } else {
        const canvases = wasRedacted ? redactedCanvases : pages.map((p) => p.canvas);
        setStatusMsg(canvases.length > 1 ? `Reading page 1 of ${canvases.length} with OCR…` : 'Reading payslip with OCR… this can take a moment.');
        const pagesItems = await ocrPages(canvases, {
          onPageStart: (i, n) => setStatusMsg(n > 1 ? `Reading page ${i} of ${n} with OCR…` : 'Reading payslip with OCR… this can take a moment.'),
        });
        pageResults = pagesItems.map((items) => extractPayslipFieldsFromItems(items, { yTolerance: 12 }));
      }
      const merged = mergePageResults(pageResults);
      setFields(merged.fields);
      setUsedColumnHeuristic(merged.usedColumnHeuristic);
      setSource('local');
      setEditing(false);
      setStep('review');
    } catch (err) {
      setErrorMsg(err instanceof OcrError ? err.message : 'Could not read this payslip.');
      setStep('error');
    }
  }

  function handleRedactionApplied(flattenedCanvases) {
    setRedactedCanvases(flattenedCanvases);
    setStep('processing');
    setStatusMsg('Reading redacted payslip with OCR… this can take a moment.');
    // Extraction must now run on the flattened copy, never the original —
    // runExtraction reads redactedCanvases from state, but state updates
    // from setRedactedCanvases above haven't committed yet inside this same
    // handler, so it's passed straight through instead.
    (async () => {
      try {
        const pagesItems = await ocrPages(flattenedCanvases, {
          onPageStart: (i, n) => setStatusMsg(n > 1 ? `Reading page ${i} of ${n} with OCR…` : 'Reading redacted payslip with OCR…'),
        });
        const pageResults = pagesItems.map((items) => extractPayslipFieldsFromItems(items, { yTolerance: 12 }));
        const merged = mergePageResults(pageResults);
        setFields(merged.fields);
        setUsedColumnHeuristic(merged.usedColumnHeuristic);
        setSource('local');
        setEditing(false);
        setStep('review');
      } catch (err) {
        setErrorMsg(err instanceof OcrError ? err.message : 'Could not read this payslip.');
        setStep('error');
      }
    })();
  }

  async function handleConfirmAI() {
    setAiConsentOpen(false);
    setAiLoading(true);
    setAiError('');
    try {
      const useText = !wasRedacted && !isScanned;
      const result = useText
        ? await extractPayslipWithAI({ text: pages.map((p) => p.textItems.map((i) => i.str).join(' ')).join('\n\n') })
        : await extractPayslipWithAI({ pageCanvases: wasRedacted ? redactedCanvases : pages.map((p) => p.canvas) });
      setFields(result);
      setSource('ai');
      setEditing(false);
    } catch (err) {
      setAiError(err instanceof PayslipAIError ? err.message : 'AI extraction failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  function updateField(key, patch) {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleCalculate() {
    onApply(buildCalculatorPayload(fields));
  }

  // ---------------- upload ----------------
  if (step === 'upload') {
    return (
      <div className="sal2-card">
        <div className="sal2-card-title" style={{ marginBottom: 4 }}>📄 Upload your payslip</div>
        <p className="sal2-card-sub">PDF, JPG, PNG, or WebP. We'll try to read it entirely in your browser first.</p>
        <UploadBox
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
          multiple={false}
          onFiles={(files) => files[0] && handleFile(files[0])}
          label="Click to choose your payslip, or drag it here"
          maxSizeMB={20}
        />
        <p style={{ fontSize: '0.72rem', color: '#059669', marginTop: 12 }}>🔒 Processed locally by default — nothing is uploaded unless you explicitly choose "Try AI extraction" later.</p>
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
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '6px 0 0' }}>Hide sensitive personal information before processing.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
          <button className="sal2-ghost-btn" onClick={() => setStep('upload')}>Choose a different file</button>
          <button className="sal2-add-btn" onClick={runExtraction}>Continue to extraction →</button>
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
        <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>⏳</div>
        <p style={{ color: '#475569', fontSize: '0.88rem' }}>{statusMsg}</p>
      </div>
    );
  }

  // ---------------- error ----------------
  if (step === 'error') {
    return (
      <div className="sal2-card">
        <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: 12 }}>⚠️ {errorMsg}</p>
        <button className="sal2-ghost-btn" onClick={() => setStep('upload')}>Choose a different file</button>
      </div>
    );
  }

  // ---------------- review ----------------
  const foundCount = foundAmountCount(fields);
  const lowConfidence = foundCount < RELIABILITY_FLOOR;

  return (
    <div className="sal2-card">
      <div className="sal2-card-title" style={{ marginBottom: 4 }}>
        {source === 'ai' ? '✨ AI extraction results' : 'Payslip information found'}
      </div>
      <p className="sal2-card-sub">Review every figure below — nothing is applied to the calculator until you click Calculate Salary.</p>

      {wasRedacted && (
        <p style={{ fontSize: '0.72rem', color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
          Processed from your redacted copy — the original document was not used for extraction.
        </p>
      )}
      {usedColumnHeuristic && (
        <p style={{ fontSize: '0.72rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
          We couldn't clearly detect separate "Current" vs "YTD" columns on this payslip — the leftmost amount on each line was used. Please double-check the figures below.
        </p>
      )}
      {lowConfidence && source === 'local' && (
        <p style={{ fontSize: '0.76rem', color: '#7C2D12', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          Local extraction only found {foundCount} field{foundCount === 1 ? '' : 's'} on this payslip. You can edit the values below manually, or try AI extraction instead.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {FIELD_DEFS.map((def) => {
          const f = fields[def.key];
          if (def.type === 'text' && def.key === 'payPeriod') {
            return (
              <div key={def.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{def.label}</span>
                {editing ? (
                  <select className="sal2-select" style={{ width: 160 }} value={f.value || ''} onChange={(e) => updateField('payPeriod', { found: !!e.target.value, value: e.target.value })}>
                    <option value="">Not set</option>
                    {FREQUENCIES.map((fr) => <option key={fr.id} value={fr.id}>{fr.label}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: f.found ? '#0F172A' : '#94A3B8', fontStyle: f.found ? 'normal' : 'italic' }}>
                    {f.found ? (FREQUENCIES.find((fr) => fr.id === f.value)?.label || f.value) : 'Not found'}
                  </span>
                )}
              </div>
            );
          }
          if (def.type === 'text' && def.key === 'currencyCode') {
            return (
              <div key={def.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{def.label}</span>
                {editing ? (
                  <select className="sal2-select" style={{ width: 160 }} value={f.value || ''} onChange={(e) => updateField('currencyCode', { found: !!e.target.value, value: e.target.value })}>
                    <option value="">Not set</option>
                    {ALL_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: f.found ? '#0F172A' : '#94A3B8', fontStyle: f.found ? 'normal' : 'italic' }}>{f.found ? f.value : 'Not found'}</span>
                )}
              </div>
            );
          }
          return (
            <div key={def.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{def.label}</span>
              {editing ? (
                <div style={{ width: 160 }}>
                  <NumberInput
                    ariaLabel={def.label}
                    value={f.found ? String(f.amount) : ''}
                    onChange={(v) => updateField(def.key, { found: v !== '' && v != null, amount: v === '' ? null : parseFloat(v) })}
                    placeholder="Not found"
                  />
                </div>
              ) : (
                <span style={{ fontSize: '0.82rem', color: f.found ? '#0F172A' : '#94A3B8', fontStyle: f.found ? 'normal' : 'italic' }}>
                  {f.found ? Number(f.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Not found'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {aiError && <p style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: 10 }}>⚠️ {aiError}</p>}

      {aiConsentOpen && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: '0.8rem', color: '#78350F', margin: 0 }}>
            This payslip will be sent to our AI service for processing because local extraction couldn't reliably read it.
            {wasRedacted ? ' Only the redacted version you created will be sent — the original document is never uploaded.' : ' It will leave your browser and be processed externally.'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="sal2-ghost-btn" onClick={() => setAiConsentOpen(false)}>Cancel</button>
            <button className="sal2-add-btn" onClick={handleConfirmAI} disabled={aiLoading}>{aiLoading ? 'Sending…' : 'Send to AI'}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button className="sal2-ghost-btn" onClick={() => setAiConsentOpen(true)} disabled={aiLoading || aiConsentOpen}>
          {aiLoading ? 'Processing…' : '✨ Try AI extraction instead'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sal2-ghost-btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : 'Edit'}</button>
          <button className="sal2-add-btn" onClick={handleCalculate}>Calculate Salary</button>
        </div>
      </div>
      <button className="sal2-ghost-btn" style={{ marginTop: 12 }} onClick={() => setStep('upload')}>Choose a different file</button>
    </div>
  );
}
