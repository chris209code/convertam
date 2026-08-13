'use client';
import { T } from './theme';

function StatCard({ label, value }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, background: T.accentTint, border: `1px solid ${T.accentBorder}` }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: T.accentDark }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: T.mutedDark, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const KIND_LABELS = { pdf: 'PDF', docx: 'Word Document', xlsx: 'Spreadsheet', csv: 'CSV File', txt: 'Text File', image: 'Image' };

export default function OverviewTab({ result, tables, fieldCount, documentType, classificationSummary, status }) {
  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Document Type" value={documentType || KIND_LABELS[result.kind] || result.kind} />
        <StatCard label="Pages" value={result.pageCount} />
        <StatCard label="Tables Found" value={tables.length} />
        <StatCard label="Fields Found" value={fieldCount} />
        <StatCard label="Status" value={status} />
      </div>

      {classificationSummary && (
        <div style={{ padding: 16, borderRadius: 12, background: 'white', border: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.accentDark, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>✨ AI Summary</div>
          <div style={{ fontSize: '0.86rem', color: T.inkSecondary, lineHeight: 1.6 }}>{classificationSummary}</div>
        </div>
      )}

      {result.warnings?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.78rem', color: '#92400E', background: T.warningTint, border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: T.mutedDark, lineHeight: 1.6 }}>
        <strong style={{ color: T.ink }}>{result.fileName}</strong> — {(result.fileSize / 1024).toFixed(0)} KB.
        {result.isScanned && ' This looks like a scanned or image-based document — deterministic text extraction may be limited. Use "Analyze with AI" for OCR-quality reading.'}
      </div>
    </div>
  );
}
