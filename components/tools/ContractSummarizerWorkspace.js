'use client';

import { useState } from 'react';
import Script from 'next/script';

const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const CARD_BG = '#F8FAFC';
const LABEL_COLORS = {
  Important: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E3A8A' },
  'Worth reviewing': { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  'Potential concern': { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  'Significant obligation': { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
};

function labelStyle(label) {
  return LABEL_COLORS[label] || { bg: '#F1F5F9', border: '#E2E8F0', text: '#334155' };
}

const LABEL_EMOJI = {
  Important: '🔵',
  'Worth reviewing': '🟡',
  'Potential concern': '🔴',
  'Significant obligation': '🟠',
};

// A small "here's where this came from" line, shown wherever the model gave
// a location — never fabricated, so simply omitted when it couldn't
// determine one (see the reference rule in lib/contractSummarize/prompt.js).
function LocationNote({ location, style }) {
  if (!location) return null;
  return <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94A3B8', ...style }}>📍 {location}</p>;
}

// Renders a {value, location} pair — the shape every date/money/termination
// field uses so the reader can trace each fact back to the contract.
function Field({ label, field }) {
  return (
    <div style={{ padding: 14, background: CARD_BG, borderRadius: 10 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A' }}>{field?.value || 'Not specified in the contract.'}</p>
      <LocationNote location={field?.location} />
    </div>
  );
}

function SectionTitle({ children }) {
  return <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', margin: '0 0 8px', textTransform: 'uppercase' }}>{children}</p>;
}

function ClauseCard({ item }) {
  const s = labelStyle(item.label);
  return (
    <div style={{ padding: 14, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{LABEL_EMOJI[item.label] ? `${LABEL_EMOJI[item.label]} ` : ''}{item.topic}</p>
        {item.label && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: s.text, background: 'white', border: `1px solid ${s.border}`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{item.label}</span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '0.86rem', color: '#1E293B', lineHeight: 1.55 }}>{item.explanation}</p>
      <LocationNote location={item.location} />
    </div>
  );
}

function PerspectiveList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: '0.84rem', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: '0.86rem', color: '#1E293B', marginBottom: 8, lineHeight: 1.5 }}>
          <strong>{it.point}</strong> — {it.explanation}
          {it.location && <span style={{ color: '#94A3B8' }}> ({it.location})</span>}
        </li>
      ))}
    </ul>
  );
}

export default function ContractSummarizerWorkspace() {
  const [files, setFiles] = useState([]);
  const [userParty, setUserParty] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isPdfSelected = files.length > 0 && files[0].type === 'application/pdf';

  function handleFiles(e) {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;
    const pdf = selected.find((f) => f.type === 'application/pdf');
    setFiles(pdf ? [pdf] : selected.filter((f) => f.type.startsWith('image/')));
    setResult(null);
    setError('');
    setStatus('');
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFile(index, dir) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function extractPagedText(file) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const pageInfos = [];
    let combined = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ').trim();
      pageInfos.push({ number: i, charCount: pageText.length });
      combined += `--- PAGE ${i} ---\n${pageText}\n\n`;
    }
    return { text: combined.trim(), pageInfos };
  }

  async function handleSummarize() {
    if (files.length === 0) return;
    if (isPdfSelected && !window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    if (!isPdfSelected) {
      if (files.length > MAX_IMAGES) {
        setError(`That's ${files.length} photos — please select at most ${MAX_IMAGES} pages at a time. For a longer scanned contract, run it through OCR PDF first and upload the resulting PDF here.`);
        return;
      }
      const totalBytes = files.reduce((n, f) => n + f.size, 0);
      if (totalBytes > MAX_IMAGE_BYTES) {
        setError('These photos add up to more than 20MB total — try fewer or smaller photos, or convert to a PDF and use OCR PDF first.');
        return;
      }
    }
    setBusy(true);
    setError('');
    setResult(null);

    try {
      let res;
      if (isPdfSelected) {
        setStatus('Reading contract…');
        const { text, pageInfos } = await extractPagedText(files[0]);
        const totalChars = pageInfos.reduce((n, p) => n + p.charCount, 0);

        if (totalChars < 50) {
          setError('Could not extract text from this PDF. It may be a scanned image saved as PDF — try uploading photos of the pages instead, or run it through OCR PDF first.');
          setBusy(false);
          return;
        }

        setStatus(`Analyzing all ${pageInfos.length} page${pageInfos.length > 1 ? 's' : ''}…`);
        res = await fetch('/api/contract-summarizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, userParty }),
        });
      } else {
        setStatus(`Reading ${files.length} photo${files.length > 1 ? 's' : ''} and analyzing terms and clauses…`);
        const formData = new FormData();
        files.forEach((f) => formData.append('images', f));
        formData.append('userParty', userParty);
        res = await fetch('/api/contract-summarizer', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }

      setResult(data);
      setStatus('');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function copySummary() {
    if (!result) return;
    const loc = (l) => (l ? ` (${l})` : '');
    const fv = (field) => `${field?.value || 'Not specified in the contract.'}${loc(field?.location)}`;
    const clauseLines = (arr, heading) => (arr && arr.length
      ? [heading, ...arr.map((c) => `- [${c.label || '—'}] ${c.topic}: ${c.explanation}${loc(c.location)}`), '']
      : []);
    const perspectiveLines = (arr, heading) => (arr && arr.length
      ? [heading, ...arr.map((p) => `- ${p.point}: ${p.explanation}${loc(p.location)}`), '']
      : []);

    const lines = [
      'QUICK SUMMARY:',
      result.quickSummary || '',
      '',
      'KEY PARTIES:',
      ...(result.parties || []).map((p) => `- ${p.name} — ${p.role}${loc(p.location)}`),
      '',
      'IMPORTANT DATES & DEADLINES:',
      `Effective date: ${fv(result.importantDates?.effectiveDate)}`,
      `End date: ${fv(result.importantDates?.endDate)}`,
      `Renewal: ${fv(result.importantDates?.renewalDates)}`,
      `Notice periods: ${fv(result.importantDates?.noticePeriods)}`,
      `Payment due dates: ${fv(result.importantDates?.paymentDueDates)}`,
      `Other deadlines: ${fv(result.importantDates?.otherDeadlines)}`,
      '',
      `${result.obligations?.partyALabel || 'PARTY A'} OBLIGATIONS:`,
      ...(result.obligations?.partyAObligations || []).map((o) => `- ${o.text}${loc(o.location)}`),
      '',
      `${result.obligations?.partyBLabel || 'PARTY B'} OBLIGATIONS:`,
      ...(result.obligations?.partyBObligations || []).map((o) => `- ${o.text}${loc(o.location)}`),
      '',
      'MONEY & PAYMENT TERMS:',
      `Contract value: ${fv(result.moneyAndPayment?.contractValue)}`,
      `Fees: ${fv(result.moneyAndPayment?.fees)}`,
      `Payment schedule: ${fv(result.moneyAndPayment?.paymentSchedule)}`,
      `Deposits: ${fv(result.moneyAndPayment?.deposits)}`,
      `Late-payment fees: ${fv(result.moneyAndPayment?.latePaymentFees)}`,
      `Penalties: ${fv(result.moneyAndPayment?.penalties)}`,
      `Refund terms: ${fv(result.moneyAndPayment?.refundTerms)}`,
      `Commissions: ${fv(result.moneyAndPayment?.commissions)}`,
      '',
      ...clauseLines(result.importantClauses, 'IMPORTANT CLAUSES & POTENTIAL CONCERNS:'),
      'TERMINATION & EXIT:',
      `How to terminate: ${fv(result.terminationAndExit?.howToTerminate)}`,
      `Required notice: ${fv(result.terminationAndExit?.requiredNotice)}`,
      `Grounds: ${fv(result.terminationAndExit?.groundsForTermination)}`,
      `Early termination: ${fv(result.terminationAndExit?.earlyTerminationConditions)}`,
      `Penalties: ${fv(result.terminationAndExit?.penalties)}`,
      `After termination: ${fv(result.terminationAndExit?.afterTermination)}`,
      `Differs between parties: ${fv(result.terminationAndExit?.differsBetweenParties)}`,
      '',
      ...clauseLines(result.otherClauses, 'OTHER IMPORTANT CLAUSES:'),
      ...(result.conflictingClauses?.length ? ['POSSIBLY CONFLICTING CLAUSES:', ...result.conflictingClauses.map((c) => `- ${c.description} (${c.clauseALocation || '?'} vs ${c.clauseBLocation || '?'})`), ''] : []),
      ...(result.unreadableOrMissingPages?.length ? ['UNREADABLE / MISSING PAGES:', ...result.unreadableOrMissingPages.map((p) => `- ${p}`), ''] : []),
      'PLAIN-ENGLISH BOTTOM LINE:',
      result.bottomLine || '',
      '',
      ...(result.userPerspective?.identified ? [
        `YOUR POSITION: ${result.userPerspective.identifiedAs}`,
        ...perspectiveLines(result.userPerspective.favorableTerms, 'Terms that favor you:'),
        ...perspectiveLines(result.userPerspective.unfavorableTerms, 'Terms that may work against you:'),
        ...perspectiveLines(result.userPerspective.payAttentionTerms, 'Terms to pay attention to:'),
        ...(result.userPerspective.comparisons?.length ? ['Comparisons:', ...result.userPerspective.comparisons.map((c) => `- ${c.topic} — You: ${c.yourParty}${loc(c.yourPartyLocation)} | Other party: ${c.otherParty}${loc(c.otherPartyLocation)}${c.whyItMatters ? ` — ${c.whyItMatters}` : ''}`), ''] : []),
      ] : []),
      'This summary is AI-generated for informational and clarity purposes only and does not constitute formal legal advice. Consult a qualified legal professional for binding legal guidance.',
    ].join('\n');
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => {}}
      />

      {!result && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Upload a contract — a PDF, or photos of every page in order
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            Upload the whole PDF, or snap photos of every printed page (select them in page order). Every page is read — parties, dates, obligations, payment terms, termination, and anything worth double-checking, in plain language.
          </p>
          <input type="file" accept="application/pdf,image/*" multiple onChange={handleFiles} />

          {files.length > 0 && (
            <div style={{ marginTop: 18, textAlign: 'left', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
              {!isPdfSelected && files.length > 1 && (
                <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 8px' }}>Reorder pages below if needed — 1 is read first.</p>
              )}
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F8FAFC', borderRadius: 8, marginBottom: 6 }}>
                  {!isPdfSelected && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', minWidth: 18 }}>{i + 1}.</span>}
                  <span style={{ fontSize: '0.8rem', color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  {!isPdfSelected && files.length > 1 && (
                    <>
                      <button onClick={() => moveFile(i, -1)} disabled={i === 0} title="Move earlier" style={{ border: 'none', background: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: '0.85rem' }}>▲</button>
                      <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} title="Move later" style={{ border: 'none', background: 'none', cursor: i === files.length - 1 ? 'default' : 'pointer', opacity: i === files.length - 1 ? 0.3 : 1, fontSize: '0.85rem' }}>▼</button>
                    </>
                  )}
                  <button onClick={() => removeFile(i)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.9rem' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div style={{ maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', marginTop: 16, textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Which party are you in this contract? <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={userParty}
                onChange={(e) => setUserParty(e.target.value)}
                placeholder="e.g. your name, company, “Tenant”, “Party B”…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '6px 0 0' }}>
                Tell us this and we'll add a section highlighting which terms favor you, which may work against you, and how your terms compare to the other party's.
              </p>
            </div>
          )}

          {files.length > 0 && (
            <button
              onClick={handleSummarize}
              disabled={busy}
              style={{ display: 'block', margin: '20px auto 0', padding: '12px 24px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}
            >
              {busy ? (status || 'Working…') : 'Summarize Contract'}
            </button>
          )}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Contract Summary</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copySummary} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                {copied ? '✓ Copied' : 'Copy Summary'}
              </button>
              <button onClick={() => { setResult(null); setFiles([]); setUserParty(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Summarize Another
              </button>
            </div>
          </div>

          {result.serverNotice && (
            <div style={{ marginBottom: 16, padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: '0.82rem', color: '#92400E' }}>
              ⚠ {result.serverNotice}
            </div>
          )}

          {/* 1. Quick Summary */}
          <div style={{ padding: 14, background: '#EFF6FF', borderRadius: 10, marginBottom: 16 }}>
            <SectionTitle>Quick Summary</SectionTitle>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.6 }}>{result.quickSummary}</p>
          </div>

          {/* 2. Key Parties */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Key Parties</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {(result.parties || []).map((p, i) => (
                <div key={i} style={{ padding: 12, background: CARD_BG, borderRadius: 10 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>{p.role}</p>
                  <LocationNote location={p.location} />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Important Dates & Deadlines */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Important Dates &amp; Deadlines</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Effective / Start Date" field={result.importantDates?.effectiveDate} />
              <Field label="End Date" field={result.importantDates?.endDate} />
              <Field label="Renewal Dates" field={result.importantDates?.renewalDates} />
              <Field label="Notice Periods" field={result.importantDates?.noticePeriods} />
              <Field label="Payment Due Dates" field={result.importantDates?.paymentDueDates} />
              <Field label="Other Deadlines" field={result.importantDates?.otherDeadlines} />
            </div>
          </div>

          {/* 4. Main Obligations */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Main Obligations</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 14, background: CARD_BG, borderRadius: 10 }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{result.obligations?.partyALabel || 'Party A'}'s obligations</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(result.obligations?.partyAObligations || []).map((o, i) => (
                    <li key={i} style={{ fontSize: '0.86rem', color: '#1E293B', marginBottom: 8 }}>
                      {o.text}
                      <LocationNote location={o.location} style={{ marginTop: 2 }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: 14, background: CARD_BG, borderRadius: 10 }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{result.obligations?.partyBLabel || 'Party B'}'s obligations</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(result.obligations?.partyBObligations || []).map((o, i) => (
                    <li key={i} style={{ fontSize: '0.86rem', color: '#1E293B', marginBottom: 8 }}>
                      {o.text}
                      <LocationNote location={o.location} style={{ marginTop: 2 }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 5. Money & Payment Terms */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Money &amp; Payment Terms</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Contract Value" field={result.moneyAndPayment?.contractValue} />
              <Field label="Fees" field={result.moneyAndPayment?.fees} />
              <Field label="Payment Schedule" field={result.moneyAndPayment?.paymentSchedule} />
              <Field label="Deposits" field={result.moneyAndPayment?.deposits} />
              <Field label="Late-Payment Fees" field={result.moneyAndPayment?.latePaymentFees} />
              <Field label="Penalties" field={result.moneyAndPayment?.penalties} />
              <Field label="Refund Terms" field={result.moneyAndPayment?.refundTerms} />
              <Field label="Commissions" field={result.moneyAndPayment?.commissions} />
            </div>
          </div>

          {/* 6. Important Clauses & Potential Concerns */}
          {result.importantClauses?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionTitle>Important Clauses &amp; Potential Concerns</SectionTitle>
              {result.importantClauses.map((c, i) => <ClauseCard key={i} item={c} />)}
            </div>
          )}

          {/* 7. Termination & Exit */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Termination &amp; Exit</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="How to Terminate" field={result.terminationAndExit?.howToTerminate} />
              <Field label="Required Notice" field={result.terminationAndExit?.requiredNotice} />
              <Field label="Grounds for Termination" field={result.terminationAndExit?.groundsForTermination} />
              <Field label="Early Termination Conditions" field={result.terminationAndExit?.earlyTerminationConditions} />
              <Field label="Penalties" field={result.terminationAndExit?.penalties} />
              <Field label="After Termination" field={result.terminationAndExit?.afterTermination} />
            </div>
            {result.terminationAndExit?.differsBetweenParties?.value && (
              <div style={{ padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: '0.84rem', color: '#92400E' }}>
                <strong>Difference between parties:</strong> {result.terminationAndExit.differsBetweenParties.value}
                <LocationNote location={result.terminationAndExit.differsBetweenParties.location} style={{ color: '#B45309' }} />
              </div>
            )}
          </div>

          {/* 8. Other Important Clauses */}
          {result.otherClauses?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionTitle>Other Important Clauses</SectionTitle>
              {result.otherClauses.map((c, i) => <ClauseCard key={i} item={c} />)}
            </div>
          )}

          {/* Conflicting clauses */}
          {result.conflictingClauses?.length > 0 && (
            <div style={{ marginBottom: 16, padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B', margin: '0 0 8px', textTransform: 'uppercase' }}>Clauses That May Conflict</p>
              {result.conflictingClauses.map((c, i) => (
                <p key={i} style={{ fontSize: '0.86rem', color: '#7F1D1D', margin: '0 0 8px' }}>
                  {c.description} {(c.clauseALocation || c.clauseBLocation) && <span style={{ color: '#B91C1C' }}>({c.clauseALocation}{c.clauseALocation && c.clauseBLocation ? ' vs ' : ''}{c.clauseBLocation})</span>}
                </p>
              ))}
            </div>
          )}

          {/* Unreadable pages */}
          {result.unreadableOrMissingPages?.length > 0 && (
            <div style={{ marginBottom: 16, padding: 14, background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 10 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', margin: '0 0 8px', textTransform: 'uppercase' }}>Unreadable or Missing Pages</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.unreadableOrMissingPages.map((p, i) => <li key={i} style={{ fontSize: '0.84rem', color: '#334155', marginBottom: 4 }}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* 9. Plain-English Bottom Line */}
          <div style={{ padding: 14, background: '#EFF6FF', borderRadius: 10, marginBottom: 16 }}>
            <SectionTitle>Plain-English Bottom Line</SectionTitle>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.6 }}>{result.bottomLine}</p>
            {result.suggestLegalReview && (
              <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#1E3A8A', fontWeight: 600 }}>
                ⚖ This contract has provisions significant or unusual enough that a qualified legal professional's review may be worthwhile.
              </p>
            )}
          </div>

          {/* Your Position */}
          {result.userPerspective?.identified ? (
            <div style={{ marginBottom: 16, padding: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', margin: '0 0 4px', textTransform: 'uppercase' }}>Your Position</p>
              <p style={{ margin: '0 0 14px', fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>You are: {result.userPerspective.identifiedAs}</p>

              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>🟢 Terms That Favor You</p>
                <PerspectiveList items={result.userPerspective.favorableTerms} emptyLabel="No clearly favorable terms identified." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.84rem', fontWeight: 700, color: '#991B1B' }}>🔴 Terms That May Work Against You</p>
                <PerspectiveList items={result.userPerspective.unfavorableTerms} emptyLabel="Nothing clearly unfavorable identified." />
              </div>
              <div style={{ marginBottom: result.userPerspective.comparisons?.length ? 14 : 0 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.84rem', fontWeight: 700, color: '#92400E' }}>🟡 Terms You Should Pay Attention To</p>
                <PerspectiveList items={result.userPerspective.payAttentionTerms} emptyLabel="Nothing further worth flagging." />
              </div>

              {result.userPerspective.comparisons?.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Compare the Parties</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#64748B' }}>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>Topic</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>Your Party</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>Other Party</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>Why It Matters</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.userPerspective.comparisons.map((c, i) => (
                          <tr key={i}>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A' }}>{c.topic}</td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>{c.yourParty}<LocationNote location={c.yourPartyLocation} /></td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>{c.otherParty}<LocationNote location={c.otherPartyLocation} /></td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{c.whyItMatters}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : userParty.trim() && (
            <div style={{ marginBottom: 16, padding: 14, background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.84rem', color: '#334155' }}>
              We couldn't confidently match "{userParty}" to a party in this contract{result.userPerspective?.notIdentifiedReason ? `: ${result.userPerspective.notIdentifiedReason}` : '.'} The general analysis above still applies.
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 16, lineHeight: 1.6 }}>
            This summary is AI-generated for informational and clarity purposes only and does not constitute formal legal advice. Consult a qualified legal professional for binding legal guidance.
          </p>
        </div>
      )}

      <p className="privacy-note">Your document is sent securely to our AI engine and never stored.</p>
    </div>
  );
}
