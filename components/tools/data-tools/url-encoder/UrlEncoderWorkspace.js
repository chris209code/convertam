'use client';

import { useState } from 'react';
import { T } from '../smart-parser/theme';
import { downloadBlob, copyText, formatBytes } from '@/lib/dataTools/shared';
import { urlEncode, urlDecode } from '@/lib/dataTools/urlEncodeEngine';

export default function UrlEncoderWorkspace() {
  const [mode, setMode] = useState('encode'); // encode | decode
  const [plusForSpace, setPlusForSpace] = useState(false);
  const [input, setInput] = useState('');
  const [copyState, setCopyState] = useState('idle');

  let output = '';
  let error = null;
  if (mode === 'encode') {
    output = urlEncode(input, { plusForSpace });
  } else {
    const r = urlDecode(input, { plusForSpace });
    if (r.ok) output = r.text; else error = r.error;
  }

  async function handleCopy() {
    const ok = await copyText(output);
    setCopyState(ok ? 'copied' : 'idle');
    if (ok) setTimeout(() => setCopyState('idle'), 1600);
  }

  function handleSwap() {
    setInput(output || '');
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'));
  }

  return (
    <div style={{ fontFamily: T.font, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setMode('encode')} style={pillStyle(mode === 'encode')}>URL Encode</button>
        <button onClick={() => setMode('decode')} style={pillStyle(mode === 'decode')}>URL Decode</button>
        <button onClick={handleSwap} style={smallBtnStyle} title="Swap input and output">⇄ Swap</button>
        <button onClick={() => setInput('')} style={smallBtnStyle}>Clear</button>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: T.mutedDark, fontWeight: 600 }}>
          <input type="checkbox" checked={plusForSpace} onChange={(e) => setPlusForSpace(e.target.checked)} />
          Use + for spaces (form encoding)
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="url-grid">
        <div>
          <div style={labelStyle}>{mode === 'encode' ? 'Text or URL to encode' : 'Encoded text to decode'}</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'e.g. https://example.com/search?q=hello world&lang=en' : 'e.g. hello%20world%26more'}
            style={textareaStyle}
            spellCheck={false}
          />
          <div style={metaStyle}>{formatBytes(new TextEncoder().encode(input).length)}</div>
        </div>
        <div>
          <div style={labelStyle}>Result</div>
          {error ? (
            <div style={errorBoxStyle}>⚠️ {error}</div>
          ) : (
            <textarea value={output} readOnly style={{ ...textareaStyle, background: '#F8FAFC' }} spellCheck={false} />
          )}
          <div style={{ ...metaStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>{error ? '' : formatBytes(new TextEncoder().encode(output).length)}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCopy} style={smallBtnStyle} disabled={!output}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy'}</button>
              <button onClick={() => downloadBlob(output, 'text/plain', `${mode}d.txt`)} style={smallBtnStyle} disabled={!output}>Download</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .url-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const pillStyle = (active) => ({
  padding: '8px 16px', borderRadius: 999, border: 'none',
  background: active ? T.accentGradient : '#F1F5F9', color: active ? 'white' : T.inkSecondary,
  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: T.font,
});
const labelStyle = { fontSize: '0.76rem', fontWeight: 700, color: T.mutedDark, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' };
const textareaStyle = {
  width: '100%', minHeight: 220, padding: 12, borderRadius: 10, border: `1px solid ${T.border}`,
  fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', color: T.ink,
};
const metaStyle = { fontSize: '0.74rem', color: T.muted, marginTop: 6 };
const errorBoxStyle = { minHeight: 220, padding: 14, borderRadius: 10, background: T.dangerTint, border: `1px solid #FECACA`, color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const smallBtnStyle = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font };
