'use client';
import { T } from './theme';

export default function TextTab({ text, onCopy, copyState }) {
  if (!text) {
    return <div style={{ fontFamily: T.font, textAlign: 'center', padding: '40px 20px', color: T.muted, fontSize: '0.85rem' }}>No text was extracted from this document. If it's a scan or image, try "Analyze with AI" to read it.</div>;
  }
  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={onCopy} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font, color: T.inkSecondary }}>
          {copyState === 'copied' ? '✓ Copied' : '📋 Copy Text'}
        </button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', lineHeight: 1.6, color: T.inkSecondary, background: '#F8FAFC', border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: 18, maxHeight: 520, overflowY: 'auto' }}>
        {text}
      </pre>
    </div>
  );
}
