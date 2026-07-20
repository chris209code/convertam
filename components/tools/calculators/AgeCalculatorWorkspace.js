'use client';

import { useRef, useState } from 'react';
import ExportBar from '../salary-calculator/ExportBar';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';

// Logic copied verbatim from the age calculator previously embedded in
// CalculatorWorkspace.js — unchanged. Only addition: export capability
// (Copy/PDF/Print/Share), matching the platform-wide export standard now
// shared by every calculator in the Business & Finance suite — this is
// not a redesign of the calculator itself, which keeps its original
// inputs, layout and results panel exactly as they were.
export default function AgeCalculatorWorkspace() {
  const [dob, setDob] = useState('');
  let years = 0, months = 0, days = 0;
  if (dob) {
    const birth = new Date(dob);
    const now = new Date();
    years = now.getFullYear() - birth.getFullYear();
    months = now.getMonth() - birth.getMonth();
    days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
  }
  const summaryRef = useRef(null);

  function buildText() {
    return [
      'Age Summary',
      '',
      `Date of Birth: ${dob}`,
      `Age: ${years} years, ${months} months, ${days} days`,
      '',
      'Calculated with Convertam Age Calculator — convertam.app/calculators/age-calculator',
    ].join('\n');
  }

  function buildReportData() {
    return {
      toolName: 'Age Calculator',
      fileName: 'age-report.pdf',
      hero: { label: 'Current Age', value: `${years} years`, sub: `${months} months, ${days} days` },
      statCards: [
        { label: 'Date of Birth', value: dob },
        { label: 'Years', value: String(years) },
        { label: 'Months', value: String(months) },
        { label: 'Days', value: String(days) },
      ],
      privacyNote: 'Your date of birth is processed locally and is not stored.',
    };
  }

  return (
    <div className="panel">
      <label htmlFor="age-dob" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Date of Birth</label>
      <input id="age-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: 16, outline: 'none' }} />
      {dob && (
        <>
          <div ref={summaryRef} style={{ background: '#FEF2F2', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#DC2626', marginBottom: 8 }}>{years} years</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>{months}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>months</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>{days}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>days</div>
              </div>
            </div>
          </div>
          <ExportBar
            captureRef={summaryRef}
            fileNamePrefix="age"
            fileNameSuffix="age-summary"
            shareTitle="My Age Summary"
            buildText={buildText}
            onDownloadPdf={() => generateFinancialReportPdf(buildReportData())}
          />
        </>
      )}
    </div>
  );
}
