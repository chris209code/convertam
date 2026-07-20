'use client';

import { useRef, useState } from 'react';
import ExportBar from '../salary-calculator/ExportBar';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';

// Logic copied verbatim from the discount calculator previously embedded in
// CalculatorWorkspace.js — unchanged. Only addition: export capability
// (Copy/PDF/Print/Share), matching the platform-wide export standard now
// shared by every calculator in the Business & Finance suite — this is
// not a redesign of the calculator itself, which keeps its original
// inputs, layout and results panel exactly as they were.
export default function DiscountCalculatorWorkspace() {
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const p = parseFloat(price) || 0;
  const d = parseFloat(discount) || 0;
  const saving = p * (d / 100);
  const final = p - saving;
  const summaryRef = useRef(null);

  function buildText() {
    return [
      'Discount Summary',
      '',
      `Original Price: ₦${p.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `Discount: ${d}%`,
      `You Save: ₦${saving.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `Final Price: ₦${final.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      '',
      'Calculated with Convertam Discount Calculator — convertam.app/calculators/discount-calculator',
    ].join('\n');
  }

  function buildReportData() {
    return {
      toolName: 'Discount Calculator',
      fileName: 'discount-report.pdf',
      hero: { label: 'Final Price', value: `₦${final.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sub: `${d}% off ₦${p.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      statCards: [
        { label: 'Original Price', value: `₦${p.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: 'Discount', value: `${d}%` },
        { label: 'You Save', value: `₦${saving.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: 'Final Price', value: `₦${final.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      ],
      privacyNote: 'Your figures are processed locally and are not stored.',
    };
  }

  return (
    <div className="panel">
      {[['Original Price (₦)', price, setPrice, 'e.g. 25000', 'discount-price'], ['Discount (%)', discount, setDiscount, 'e.g. 20', 'discount-pct']].map(([label, val, setter, ph, id]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label htmlFor={id} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input id={id} type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {p > 0 && d > 0 && (
        <>
          <div ref={summaryRef} style={{ background: '#ECFEFF', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#475569' }}>You save</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DC2626' }}>₦{saving.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>Final Price</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0891B2' }}>₦{final.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <ExportBar
            captureRef={summaryRef}
            fileNamePrefix="discount"
            fileNameSuffix="discount-summary"
            shareTitle="My Discount Summary"
            buildText={buildText}
            onDownloadPdf={() => generateFinancialReportPdf(buildReportData())}
          />
        </>
      )}
    </div>
  );
}
