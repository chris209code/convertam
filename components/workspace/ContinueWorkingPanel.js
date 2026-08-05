'use client';

import Link from 'next/link';
import { getToolSuggestions } from '@/lib/workspace/toolSuggestions';
import { useWorkspaceHandoff } from '@/components/document-session/DocumentSessionProvider';

// Shown at a session-compatible tool's terminal step instead of an automatic
// download — Continue Working and Download become an explicit choice. The
// first suggestion (if any) is promoted to the primary action, since that's
// the one workflow the tool's own suggestions list is calibrated to push
// hardest (e.g. Redact & Edit PDF → Write on PDF); any further suggestions
// stay one tap away as smaller links rather than competing for attention.
// "Continue" uses the generic handoffTo() primitive (see
// DocumentSessionProvider.js) rather than a plain <Link> — that's what lets
// the destination workspace auto-load the document instead of requiring its
// own manual "Continue with {name}" click, so the handoff actually feels
// instant end to end.
export default function ContinueWorkingPanel({ toolSlug, documentName, onDownload, downloading }) {
  const suggestions = getToolSuggestions(toolSlug);
  const [primary, ...rest] = suggestions;
  const handoffTo = useWorkspaceHandoff();

  const isPdf = (documentName || '').toLowerCase().endsWith('.pdf');
  const typeLabel = isPdf ? 'PDF' : 'document';

  return (
    <div style={{ border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 14, padding: 20, marginTop: 16 }}>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
        🎉 Your {typeLabel} is ready.
      </div>
      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 16px' }}>
        What would you like to do next?
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: rest.length > 0 ? 10 : 16 }}>
        {primary && (
          <button
            onClick={() => handoffTo(primary.slug)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10,
              border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>{primary.icon}</span>
            <span>
              <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700 }}>
                Continue in {primary.title}
              </span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#DBEAFE' }}>{primary.desc}</span>
            </span>
          </button>
        )}

        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            padding: '12px 18px', borderRadius: 10, border: '1px solid #BFDBFE',
            background: downloading ? '#F1F5F9' : 'white', color: downloading ? '#94A3B8' : '#1D4ED8', fontWeight: 700,
            fontSize: '0.85rem', cursor: downloading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {downloading ? 'Preparing download…' : `⬇ Download ${typeLabel}`}
        </button>
      </div>

      {rest.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          {rest.map((s) => (
            <button
              key={s.slug}
              onClick={() => handoffTo(s.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none',
                color: '#1D4ED8', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span aria-hidden="true">{s.icon}</span>
              <span>Or continue in {s.title}</span>
            </button>
          ))}
        </div>
      )}

      {isPdf && (
        <Link href="/pdf-tools" style={{ fontSize: '0.78rem', color: '#64748B', textDecoration: 'underline' }}>
          Return to PDF Tools
        </Link>
      )}
    </div>
  );
}
