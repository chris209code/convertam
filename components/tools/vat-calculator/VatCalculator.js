'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import { VAT_PRESETS, computeVat, computeWorksheet, buildInsights, num } from './calculations';
import { buildVatSummaryText } from './exportText';

const STORAGE_KEY = 'convertam-vat-rate-v1';
const INSIGHT_ICONS = { shield: '🛡️', percent: '➗', customer: '🧾', wallet: '💼' };

const MODES = [
  { id: 'add', icon: '➕', label: 'Add VAT', hint: 'You have a price and need to add VAT to it.' },
  { id: 'remove', icon: '➖', label: 'Remove VAT', hint: 'You have a VAT-inclusive price and need the amount before VAT.' },
  { id: 'breakdown', icon: '🔍', label: 'VAT Breakdown', hint: 'Analyse any amount — choose whether it already includes VAT.' },
  { id: 'reverse', icon: '↩️', label: 'Reverse VAT', hint: 'You only know the total and the rate — see exactly how the original amount is worked out.' },
];

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="vat2-card">
      <div className="vat2-card-head">
        <span className="vat2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`vat2-stat vat2-stat-${tone || 'default'}`}>
      <div className="vat2-stat-label">{label}</div>
      <div className="vat2-stat-value">{value}</div>
    </div>
  );
}

let nextItemId = 1;

export default function VatCalculator() {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('add');
  const [breakdownInclusive, setBreakdownInclusive] = useState(false);
  const [ratePreset, setRatePreset] = useState(7.5);
  const [customRate, setCustomRate] = useState('');
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);

  const [worksheetOpen, setWorksheetOpen] = useState(false);
  const [items, setItems] = useState([]);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');

  const summaryRef = useRef(null);
  // Guards the write effect below against a mount-order race: on first
  // mount, the read effect calls setRatePreset/setCustomRate to restore a
  // saved rate, but that update is only visible starting next render — the
  // write effect (same dependency-triggered kind) still fires once on this
  // very first render with the pre-restore default closure values, and
  // would clobber the just-read localStorage entry with those defaults if
  // let through. Skipping exactly the first invocation avoids that without
  // needing to coordinate timing between the two effects.
  const skipNextWrite = useRef(true);

  // Remember the user's last VAT rate choice locally — read once on mount,
  // written on every subsequent change. Purely a browser-local convenience;
  // nothing here is ever sent anywhere, matching the "100% Private" badge.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) {
        if (saved.preset === 'custom') { setRatePreset('custom'); setCustomRate(String(saved.custom ?? '')); }
        else if (typeof saved.preset === 'number') setRatePreset(saved.preset);
      }
    } catch { /* localStorage unavailable — fall back to the default rate */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipNextWrite.current) { skipNextWrite.current = false; return; }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: ratePreset, custom: customRate }));
    } catch { /* localStorage unavailable — the choice just won't persist */ }
  }, [ratePreset, customRate]);

  const ratePct = ratePreset === 'custom' ? num(customRate) : ratePreset;

  const result = useMemo(
    () => computeVat({ mode, amount, rate: ratePct, breakdownInclusive }),
    [mode, amount, ratePct, breakdownInclusive]
  );
  const insights = useMemo(() => buildInsights(result, currency), [result, currency]);
  const worksheet = useMemo(() => computeWorksheet(items, ratePct), [items, ratePct]);

  function addItem() {
    setItems((prev) => [...prev, { id: nextItemId++, name: '', amount: '' }]);
  }
  function updateItem(id, key, val) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: val } : it)));
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const chartSegments = [
    { label: 'Original Amount', value: result.original, color: '#2563EB', displayValue: formatCurrency(result.original, currency) },
    result.vatAmount > 0 && { label: 'VAT', value: result.vatAmount, color: '#F59E0B', displayValue: formatCurrency(result.vatAmount, currency) },
  ].filter(Boolean);

  const reportDetails = { businessName, notes, invoiceRef };
  const hasReportDetails = businessName || notes || invoiceRef;

  return (
    <div className="vat2-root">
      <style>{VAT2_STYLES}</style>

      <div className="vat2-topbar no-print">
        <span className="vat2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="vat2-privacy-sub">Your amounts are processed locally and are not stored</span>
        </span>
      </div>

      <div className="vat2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="vat2-col no-print">
          <SectionCard icon="🧾" title="VAT Calculation">
            <p className="vat2-card-sub">Choose how you want to calculate VAT.</p>

            <div className="vat2-mode-grid" role="radiogroup" aria-label="VAT calculation mode">
              {MODES.map((m) => (
                <button key={m.id} role="radio" aria-checked={mode === m.id} className={`vat2-mode-btn ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
            <p className="vat2-mode-hint">{MODES.find((m) => m.id === mode)?.hint}</p>

            {mode === 'breakdown' && (
              <div role="radiogroup" aria-label="Does this amount include VAT?" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button role="radio" aria-checked={!breakdownInclusive} className={`vat2-pill ${!breakdownInclusive ? 'active' : ''}`} onClick={() => setBreakdownInclusive(false)}>Excludes VAT</button>
                <button role="radio" aria-checked={breakdownInclusive} className={`vat2-pill ${breakdownInclusive ? 'active' : ''}`} onClick={() => setBreakdownInclusive(true)}>Already Includes VAT</button>
              </div>
            )}

            <div className="vat2-field-row">
              <div style={{ width: 132, flexShrink: 0 }}>
                <label className="vat2-label" htmlFor="vat2-currency">Currency</label>
                <select id="vat2-currency" className="vat2-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency">
                  <optgroup label="Popular">
                    {POPULAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                  <optgroup label="All Currencies">
                    {OTHER_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="vat2-label" htmlFor="vat2-amount">
                  {mode === 'remove' || mode === 'reverse' ? 'Amount (incl. VAT)' : mode === 'breakdown' ? 'Amount' : 'Amount (excl. VAT)'}
                </label>
                <NumberInput id="vat2-amount" ariaLabel="Amount" value={amount} onChange={setAmount} placeholder="e.g. 100,000" prefix={currency} />
              </div>
            </div>

            <label className="vat2-label" style={{ marginTop: 12 }}>VAT Rate</label>
            <div className="vat2-rate-grid">
              {VAT_PRESETS.map((p) => (
                <button key={p} className={`vat2-pill ${ratePreset === p ? 'active' : ''}`} onClick={() => setRatePreset(p)}>{p}%</button>
              ))}
              <button className={`vat2-pill ${ratePreset === 'custom' ? 'active' : ''}`} onClick={() => setRatePreset('custom')}>Custom</button>
            </div>
            {ratePreset === 'custom' && (
              <div style={{ marginTop: 8 }}>
                <NumberInput ariaLabel="Custom VAT rate" value={customRate} onChange={setCustomRate} placeholder="e.g. 12.5" suffix="%" />
              </div>
            )}
          </SectionCard>

          <div className="vat2-card">
            <button className="vat2-collapsible-head" onClick={() => setWorksheetOpen((v) => !v)} aria-expanded={worksheetOpen}>
              <span className="vat2-card-title"><span aria-hidden="true">📋</span> Multiple Items {items.length > 0 && <span className="vat2-badge">{items.length}</span>}</span>
              <span aria-hidden="true" className={`vat2-chevron ${worksheetOpen ? 'open' : ''}`}>▾</span>
            </button>
            {worksheetOpen && (
              <div className="vat2-collapsible-body">
                <p className="vat2-card-sub">A lightweight worksheet for VAT across several products — each amount is treated as excluding VAT.</p>
                {items.map((it) => {
                  const row = worksheet.rows.find((r) => r.id === it.id);
                  return (
                    <div key={it.id} className="vat2-item-row">
                      <input
                        aria-label="Item name"
                        value={it.name}
                        onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                        placeholder="Product or service"
                        className="vat2-item-name"
                      />
                      <div className="vat2-item-nums">
                        <div className="vat2-item-amount"><NumberInput ariaLabel="Item amount" value={it.amount} onChange={(v) => updateItem(it.id, 'amount', v)} placeholder="0.00" prefix={currency} /></div>
                        <span className="vat2-item-computed">VAT {row ? formatCurrency(row.vatAmount, currency) : '—'}</span>
                        <span className="vat2-item-computed vat2-item-total">{row ? formatCurrency(row.total, currency) : '—'}</span>
                        <button onClick={() => removeItem(it.id)} aria-label={`Remove ${it.name || 'item'}`} className="vat2-remove-btn">×</button>
                      </div>
                    </div>
                  );
                })}
                {items.length > 0 && (
                  <div className="vat2-item-row vat2-item-totals-row">
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Totals</span>
                    <div className="vat2-item-nums">
                      <span className="vat2-item-computed" style={{ fontWeight: 700 }}>{formatCurrency(worksheet.totals.original, currency)}</span>
                      <span className="vat2-item-computed" style={{ fontWeight: 700 }}>VAT {formatCurrency(worksheet.totals.vatAmount, currency)}</span>
                      <span className="vat2-item-computed vat2-item-total" style={{ fontWeight: 700 }}>{formatCurrency(worksheet.totals.total, currency)}</span>
                    </div>
                  </div>
                )}
                <button className="vat2-add-btn" onClick={addItem}>➕ Add Item</button>
              </div>
            )}
          </div>

          <div className="vat2-card">
            <button className="vat2-collapsible-head" onClick={() => setAdvancedOpen((v) => !v)} aria-expanded={advancedOpen}>
              <span className="vat2-card-title"><span aria-hidden="true">⚙️</span> Advanced Options {hasReportDetails && <span className="vat2-badge">active</span>}</span>
              <span aria-hidden="true" className={`vat2-chevron ${advancedOpen ? 'open' : ''}`}>▾</span>
            </button>
            {advancedOpen && (
              <div className="vat2-collapsible-body">
                <p className="vat2-card-sub">Optional — these appear only in your exported report, not in the calculator above.</p>
                <div className="vat2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="vat2-label">Business Name</label>
                    <input className="vat2-plain-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Traders Ltd" aria-label="Business name" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="vat2-label">Invoice Reference</label>
                    <input className="vat2-plain-input" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-0042" aria-label="Invoice reference" />
                  </div>
                </div>
                <label className="vat2-label" style={{ marginTop: 12 }}>Notes</label>
                <textarea className="vat2-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra context for this report" aria-label="Notes" rows={3} />
              </div>
            )}
          </div>

          <p className="vat2-disclaimer">💡 These calculations are estimates based on the figures and rate you enter. Confirm the applicable VAT rate for your jurisdiction.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="vat2-col">
          <div ref={summaryRef} className="vat2-summary-capture">
            {!result.hasResults ? (
              <div className="vat2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>🧾</span>
                <p>Enter an amount to see your live VAT breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your VAT Breakdown" action={<span className="vat2-live-badge">● Live</span>}>
                  <p className="vat2-card-sub">Live calculation based on your inputs</p>

                  <div className="vat2-hero">
                    <div className="vat2-hero-label">Grand Total</div>
                    <div className="vat2-hero-value">{formatCurrency(result.total, currency)}</div>
                    <div className="vat2-hero-sub">{MODES.find((m) => m.id === mode)?.label} · {formatPercent(result.ratePct)} VAT</div>
                  </div>

                  <div className="vat2-stat-grid">
                    <StatCard label="Original Amount" value={formatCurrency(result.original, currency)} tone="blue" />
                    <StatCard label="VAT Amount" value={formatCurrency(result.vatAmount, currency)} tone="amber" />
                    <StatCard label="Grand Total" value={formatCurrency(result.total, currency)} tone="green" />
                    <StatCard label="Effective VAT %" value={formatPercent(result.effectiveVatPct, 2)} tone="purple" />
                  </div>

                  {chartSegments.length > 0 && (
                    <div className="vat2-chart-wrap">
                      <div className="vat2-card-title" style={{ marginBottom: 12 }}>How Much Is Tax?</div>
                      <DoughnutChart segments={chartSegments} centerLabel={formatPercent(result.effectiveVatPct)} centerSubLabel="is VAT" />
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon="⚖️" title="Price Comparison">
                  <p className="vat2-card-sub">Especially useful when quoting business prices</p>
                  <div className="vat2-compare-grid">
                    <div className="vat2-compare-card">
                      <div className="vat2-compare-label">Price Before VAT</div>
                      <div className="vat2-compare-value">{formatCurrency(result.original, currency)}</div>
                    </div>
                    <div className="vat2-compare-card vat2-compare-after">
                      <div className="vat2-compare-label">Price After VAT</div>
                      <div className="vat2-compare-value">{formatCurrency(result.total, currency)}</div>
                    </div>
                  </div>
                </SectionCard>

                {mode === 'reverse' && (
                  <SectionCard icon="🧮" title="How This Is Calculated">
                    <p className="vat2-card-sub">Working backward from the total and the VAT rate</p>
                    <div className="vat2-working">
                      <div className="vat2-working-line"><strong>Original Amount</strong> = Total ÷ (1 + Rate ÷ 100)</div>
                      <div className="vat2-working-line">= {formatCurrency(result.total, currency)} ÷ (1 + {result.ratePct} ÷ 100)</div>
                      <div className="vat2-working-line">= {formatCurrency(result.total, currency)} ÷ {(1 + result.ratePct / 100).toFixed(4)}</div>
                      <div className="vat2-working-line vat2-working-result">= {formatCurrency(result.original, currency)}</div>
                    </div>
                    <div className="vat2-working" style={{ marginTop: 12 }}>
                      <div className="vat2-working-line"><strong>VAT Amount</strong> = Total − Original Amount</div>
                      <div className="vat2-working-line">= {formatCurrency(result.total, currency)} − {formatCurrency(result.original, currency)}</div>
                      <div className="vat2-working-line vat2-working-result">= {formatCurrency(result.vatAmount, currency)}</div>
                    </div>
                  </SectionCard>
                )}

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Business Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="vat2-insight-row">
                        <span aria-hidden="true" className="vat2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="vat2-insight-text">{ins.text}</div>
                          <div className="vat2-insight-detail">{ins.detail}</div>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                )}

                {hasReportDetails && (
                  <SectionCard icon="📄" title="Report Details">
                    <p className="vat2-card-sub">Included in your exported report</p>
                    {businessName && <div className="vat2-report-line"><strong>Business:</strong> {businessName}</div>}
                    {invoiceRef && <div className="vat2-report-line"><strong>Invoice Reference:</strong> {invoiceRef}</div>}
                    {notes && <div className="vat2-report-line"><strong>Notes:</strong> {notes}</div>}
                  </SectionCard>
                )}
              </>
            )}
          </div>

          {result.hasResults && (
            <ExportBar
              captureRef={summaryRef}
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'vat'}
              fileNameSuffix="vat-summary"
              buildText={() => buildVatSummaryText(result, currency, insights, worksheet.rows.length > 0 ? worksheet : null, reportDetails)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const VAT2_STYLES = `
  .vat2-root { --vat2-blue: #2563EB; --vat2-purple: #7C3AED; color: #0F172A; }
  .vat2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .vat2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .vat2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .vat2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .vat2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .vat2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .vat2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .vat2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .vat2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }

  .vat2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .vat2-field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .vat2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; text-overflow: ellipsis; }
  .vat2-plain-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; box-sizing: border-box; }
  .vat2-textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; box-sizing: border-box; resize: vertical; }

  .vat2-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .vat2-mode-btn { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; background: #fff; color: #475569; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.8rem; text-align: left; }
  .vat2-mode-btn.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }
  .vat2-mode-hint { font-size: 0.72rem; color: #94A3B8; margin: 0 0 14px; }

  .vat2-pill { padding: 6px 12px; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.78rem; }
  .vat2-pill.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }
  .vat2-rate-grid { display: flex; flex-wrap: wrap; gap: 6px; }

  .vat2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .vat2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .vat2-chevron.open { transform: rotate(180deg); }
  .vat2-collapsible-body { margin-top: 14px; }
  .vat2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }

  .vat2-item-row { padding: 10px 0; border-bottom: 1px solid #F1F5F9; margin-bottom: 4px; }
  .vat2-item-name { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.82rem; font-family: inherit; outline: none; min-width: 0; box-sizing: border-box; margin-bottom: 8px; }
  .vat2-item-nums { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .vat2-item-amount { flex: 1 1 130px; min-width: 110px; }
  .vat2-item-computed { font-size: 0.8rem; color: #64748B; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .vat2-item-total { color: #0F172A; font-weight: 600; }
  .vat2-item-totals-row { border-top: 1px solid #E7EAF0; border-bottom: none; padding-top: 10px; margin-top: 4px; }
  .vat2-item-totals-row .vat2-item-nums { justify-content: flex-end; }
  .vat2-remove-btn { width: 24px; height: 24px; border-radius: 50%; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; cursor: pointer; font-size: 0.8rem; }
  .vat2-add-btn { margin-top: 4px; font-size: 0.8rem; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }

  .vat2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }

  .vat2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .vat2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .vat2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .vat2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .vat2-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .vat2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }

  .vat2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4px; }
  .vat2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .vat2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .vat2-stat-value { font-size: 1.05rem; font-weight: 800; color: #0F172A; }
  .vat2-stat-blue .vat2-stat-value { color: #2563EB; }
  .vat2-stat-amber .vat2-stat-value { color: #D97706; }
  .vat2-stat-green .vat2-stat-value { color: #059669; }
  .vat2-stat-purple .vat2-stat-value { color: #7C3AED; }

  .vat2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; margin-top: 16px; }

  .vat2-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .vat2-compare-card { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 16px; text-align: center; }
  .vat2-compare-after { background: #EFF6FF; border-color: #BFDBFE; }
  .vat2-compare-label { font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 6px; }
  .vat2-compare-value { font-size: 1.15rem; font-weight: 800; color: #0F172A; }

  .vat2-working { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 14px 16px; }
  .vat2-working-line { font-size: 0.82rem; color: #475569; padding: 3px 0; font-variant-numeric: tabular-nums; }
  .vat2-working-result { font-weight: 800; color: #2563EB; border-top: 1px solid #E2E8F0; margin-top: 4px; padding-top: 8px; }

  .vat2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .vat2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .vat2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .vat2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .vat2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  .vat2-report-line { font-size: 0.82rem; color: #334155; padding: 6px 0; border-bottom: 1px solid #F1F5F9; }
  .vat2-report-line:last-child { border-bottom: none; }

  @media (max-width: 860px) {
    .vat2-grid { grid-template-columns: 1fr; }
    .vat2-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 640px) {
    .vat2-mode-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .vat2-stat-grid { grid-template-columns: 1fr; }
    .vat2-compare-grid { grid-template-columns: 1fr; }
    .vat2-hero-value { font-size: 1.7rem; }
    .vat2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .vat2-topbar { display: none; }
    .vat2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .vat2-root button:focus-visible, .vat2-root input:focus-visible, .vat2-root select:focus-visible, .vat2-root textarea:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
