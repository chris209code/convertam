'use client';

import { useState } from 'react';

function toTitleCase(str) {
  const smallWords = new Set(['a','an','the','and','but','or','nor','for','so','yet','at','by','in','of','on','to','up','as','is']);
  return str.toLowerCase().split(' ').map((word, i) => {
    if (!word) return word;
    if (i !== 0 && smallWords.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}
function toSentenceCase(str) {
  const lower = str.toLowerCase();
  return lower.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
}
function toCamelCase(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}
function toSnakeCase(str) {
  return str.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function toKebabCase(str) {
  return str.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function UtilitiesWorkspace() {
  const [text, setText] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const conversions = [
    { key: 'upper', label: 'UPPERCASE', value: text.toUpperCase() },
    { key: 'lower', label: 'lowercase', value: text.toLowerCase() },
    { key: 'title', label: 'Title Case', value: toTitleCase(text) },
    { key: 'sentence', label: 'Sentence case', value: toSentenceCase(text) },
    { key: 'camel', label: 'camelCase', value: toCamelCase(text) },
    { key: 'snake', label: 'snake_case', value: toSnakeCase(text) },
    { key: 'kebab', label: 'kebab-case', value: toKebabCase(text) },
  ];

  function copy(key, value) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  return (
    <div className="panel">
      <div style={{ background: '#FAFAFA', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type or paste your text here..."
          style={{ width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 16 }} />
        {text.trim() && (
          <div style={{ display: 'grid', gap: 8 }}>
            {conversions.map(({ key, label, value }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', width: 90, flexShrink: 0 }}>{label}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#0F172A', wordBreak: 'break-word' }}>{value}</span>
                <button onClick={() => copy(key, value)} style={{ padding: '5px 12px', background: copiedKey === key ? '#DCFCE7' : '#EFF6FF', color: copiedKey === key ? '#059669' : '#2563EB', border: '1px solid', borderColor: copiedKey === key ? '#A7F3D0' : '#BFDBFE', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}>
                  {copiedKey === key ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
