'use client';
import { useState } from 'react';
import { T } from './theme';
import { buildResultJSON, downloadBlob } from '@/lib/smartParser/exporters';

export default function JsonTab({ documentType, pageCount, fields, tables, text }) {
  const [copyState, setCopyState] = useState('idle');
  const json = buildResultJSON({ documentType, pageCount, fields, tables, text });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch { /* clipboard unavailable */ }
  }
  function handleDownload() {
    downloadBlob(json, 'application/json', 'smart-parser-result.json');
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={handleCopy} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font, color: T.inkSecondary }}>
          {copyState === 'copied' ? '✓ Copied' : '📋 Copy JSON'}
        </button>
        <button onClick={handleDownload} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: T.accent, color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>Download JSON</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem', lineHeight: 1.6, color: T.inkSecondary, background: '#0F172A', padding: 18, borderRadius: 12, maxHeight: 520, overflowY: 'auto' }}>
        <code style={{ color: '#A5F3FC' }}>{json}</code>
      </pre>
    </div>
  );
}
