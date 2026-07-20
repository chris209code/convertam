'use client';

import { useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../salary-calculator/format';

const COLLAPSED_ROWS = 12;

function toCsv(schedule, currency) {
  const header = ['Payment #', 'Date', 'Principal Paid', 'Interest Paid', 'Remaining Balance'];
  const rows = schedule.map((r) => [
    r.paymentNumber,
    r.date.toISOString().slice(0, 10),
    r.principalPaid.toFixed(2),
    r.interestPaid.toFixed(2),
    r.remainingBalance.toFixed(2),
  ]);
  return [header, ...rows].map((row) => row.join(',')).join('\n');
}

// Payment-by-payment breakdown with search, jump-to-payment, expand/collapse
// and CSV export. Collapsed by default (first 12 payments) since a
// multi-decade loan can run to hundreds of rows — the full schedule only
// renders once the user actually asks for it.
export default function AmortizationTable({ schedule, currency, fileNamePrefix }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [jumpTo, setJumpTo] = useState('');
  const [highlighted, setHighlighted] = useState(null);
  const rowRefs = useRef(new Map());

  const filtered = useMemo(() => {
    if (!query.trim()) return schedule;
    const q = query.trim();
    return schedule.filter((r) => String(r.paymentNumber).includes(q) || r.date.toLocaleDateString().includes(q));
  }, [schedule, query]);

  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_ROWS);

  function handleJump() {
    const target = parseInt(jumpTo, 10);
    if (!Number.isFinite(target)) return;
    setExpanded(true);
    setQuery('');
    setHighlighted(target);
    // Wait a tick for the full (unfiltered) row list to render before scrolling.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rowRefs.current.get(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    setTimeout(() => setHighlighted(null), 2000);
  }

  function handleExport() {
    const csv = toCsv(schedule, currency);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}-amortization-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (schedule.length === 0) return null;

  return (
    <div>
      {expanded && (
        <div className="ln2-amort-controls">
          <input
            type="search"
            className="ln2-amort-search"
            placeholder="Search by payment # or date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search amortization schedule"
          />
          <div className="ln2-amort-jump">
            <input
              type="number"
              className="ln2-amort-jump-input"
              placeholder="Jump to #"
              value={jumpTo}
              onChange={(e) => setJumpTo(e.target.value)}
              aria-label="Jump to payment number"
            />
            <button className="ln2-ghost-btn" onClick={handleJump}>Go</button>
          </div>
          <button className="ln2-ghost-btn" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      )}

      <div className={`ln2-amort-scroll ${expanded ? 'ln2-amort-scroll-tall' : ''}`}>
        <table className="ln2-table">
          <thead>
            <tr><th>#</th><th>Date</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.paymentNumber}
                ref={(el) => { if (el) rowRefs.current.set(r.paymentNumber, el); }}
                data-payment={r.paymentNumber}
                className={highlighted === r.paymentNumber ? 'ln2-row-highlight' : ''}
              >
                <td>{r.paymentNumber}</td>
                <td>{r.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td>{formatCurrency(r.principalPaid, currency)}</td>
                <td>{formatCurrency(r.interestPaid, currency)}</td>
                <td className="ln2-net-cell">{formatCurrency(r.remainingBalance, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="ln2-amort-empty">No payments match "{query}".</div>}
      </div>

      {!expanded && filtered.length > COLLAPSED_ROWS && (
        <button className="ln2-add-btn" onClick={() => setExpanded(true)}>
          Show Full Schedule ({schedule.length} payments)
        </button>
      )}
      {expanded && (
        <button className="ln2-ghost-btn" style={{ marginTop: 10 }} onClick={() => { setExpanded(false); setQuery(''); }}>
          Collapse
        </button>
      )}
    </div>
  );
}
