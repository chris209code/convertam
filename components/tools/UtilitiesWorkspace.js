'use client';

import { useState } from 'react';

const TOOLS = [
  { id: 'wordcount', label: 'Word Counter', icon: '📝' },
  { id: 'textcase', label: 'Text Case Converter', icon: '🔤' },
];

function WordCounter() {
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
  const readTime = Math.ceil(words / 200);

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste or type your text here..."
        style={{ width: '100%', minHeight: 160, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[['Words', words, '#2563EB'], ['Characters', chars, '#7C3AED'], ['Without Spaces', charsNoSpace, '#059669'], ['Sentences', sentences, '#D97706'], ['Paragraphs', paragraphs, '#DC2626'], ['Read Time', `${readTime} min`, '#0891B2']].map(([label, val, color]) => (
          <div key={label} style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function TextCaseConverter() {
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
    <div>
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
  );
}

const TOOL_COMPONENTS = { wordcount: WordCounter, textcase: TextCaseConverter };

export default function UtilitiesWorkspace() {
  const [active, setActive] = useState('wordcount');
  const ActiveTool = TOOL_COMPONENTS[active];

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
        {TOOLS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            padding: '10px 8px', borderRadius: 10, border: '1px solid',
            borderColor: active === id ? '#2563EB' : '#E2E8F0',
            background: active === id ? '#EFF6FF' : 'white',
            color: active === id ? '#2563EB' : '#475569',
            fontWeight: active === id ? 700 : 400,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            <span style={{ lineHeight: 1.2 }}>{label}</span>
          </button>
        ))}
      </div>
      <div style={{ background: '#FAFAFA', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
          {TOOLS.find(t => t.id === active)?.icon} {TOOLS.find(t => t.id === active)?.label}
        </h3>
        <ActiveTool />
      </div>
    </div>
  );
}
