'use client';

import Link from 'next/link';
import { getToolSuggestions } from '@/lib/workspace/toolSuggestions';

// Shown at a session-compatible tool's terminal step instead of an automatic
// download — Continue Working and Download become an explicit choice. The
// document itself is already saved to the session by the time this renders;
// clicking a suggestion is just a plain <Link>, no extra handoff needed.
export default function ContinueWorkingPanel({ toolSlug, documentName, onDownload, downloading }) {
  const suggestions = getToolSuggestions(toolSlug);

  return (
    <div style={{ border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 14, padding: 18, marginTop: 16 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
        What&apos;s next for {documentName}?
      </div>
      <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 14px' }}>
        Your document is saved in this session — continue with another tool without re-uploading, or download now.
      </p>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {suggestions.map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                background: 'white', border: '1px solid #BFDBFE', textDecoration: 'none',
              }}
            >
              <span aria-hidden="true">{s.icon}</span>
              <span>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1D4ED8' }}>
                  Continue to {s.title}
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748B' }}>{s.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={onDownload}
        disabled={downloading}
        style={{
          padding: '10px 18px', borderRadius: 10, border: 'none',
          background: downloading ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700,
          fontSize: '0.85rem', cursor: downloading ? 'default' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {downloading ? 'Preparing download…' : '⬇ Download instead'}
      </button>
    </div>
  );
}
