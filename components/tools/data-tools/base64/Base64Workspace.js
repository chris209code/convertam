'use client';

import { useRef, useState } from 'react';
import { T } from '../smart-parser/theme';
import { downloadBlob, copyText, formatBytes } from '@/lib/dataTools/shared';
import {
  encodeTextToBase64, decodeBase64ToText, tryDecodeAsText, fileToBase64,
  base64ToBlob, decodeBase64ToBytes,
} from '@/lib/dataTools/base64Engine';

const TABS = [
  { id: 'text', label: 'Text ↔ Base64' },
  { id: 'file', label: 'File ↔ Base64' },
];

export default function Base64Workspace() {
  const [tab, setTab] = useState('text');
  const [direction, setDirection] = useState('encode'); // encode | decode
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [copyState, setCopyState] = useState('idle');
  const [file, setFile] = useState(null);
  const [decodedFile, setDecodedFile] = useState(null); // {blob, sizeBytes}
  const fileInputRef = useRef(null);

  function reset() {
    setInput(''); setError(null); setFile(null); setDecodedFile(null);
  }

  let output = '';
  if (tab === 'text') {
    if (direction === 'encode') {
      output = encodeTextToBase64(input);
    } else {
      const r = input.trim() ? tryDecodeAsText(input) : { ok: true, text: '' };
      output = r.ok ? r.text : '';
    }
  }

  const decodeError = tab === 'text' && direction === 'decode' && input.trim() ? (tryDecodeAsText(input).ok ? null : tryDecodeAsText(input).error) : null;

  async function handleFileSelect(f) {
    setError(null);
    setDecodedFile(null);
    if (direction === 'encode') {
      setFile(f);
      try {
        const b64 = await fileToBase64(f);
        setInput(b64);
      } catch {
        setError('Could not read this file.');
      }
    } else {
      // File→Base64 direction means decoding a .txt/.b64 file that CONTAINS base64 text.
      const text = await f.text();
      setInput(text.trim());
    }
  }

  function handleDecodeToFile() {
    try {
      const bytes = decodeBase64ToBytes(input);
      const blob = new Blob([bytes]);
      setDecodedFile({ blob, sizeBytes: bytes.length });
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not decode this Base64 as a file.');
      setDecodedFile(null);
    }
  }

  async function handleCopy() {
    const ok = await copyText(tab === 'text' ? output : input);
    setCopyState(ok ? 'copied' : 'idle');
    if (ok) setTimeout(() => setCopyState('idle'), 1600);
  }

  const inputSize = new TextEncoder().encode(input).length;
  const outputSize = new TextEncoder().encode(output).length;

  return (
    <div style={{ fontFamily: T.font, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); reset(); }} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => { setDirection('encode'); reset(); }} style={pillStyle(direction === 'encode')}>Encode</button>
          <button onClick={() => { setDirection('decode'); reset(); }} style={pillStyle(direction === 'decode')}>Decode</button>
        </div>
      </div>

      {tab === 'text' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="b64-grid">
          <div>
            <div style={labelStyle}>{direction === 'encode' ? 'Text input' : 'Base64 input'}</div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={direction === 'encode' ? 'Type or paste text…' : 'Paste Base64 here…'}
              style={textareaStyle}
              spellCheck={false}
            />
            <div style={metaStyle}>{formatBytes(inputSize)}</div>
          </div>
          <div>
            <div style={labelStyle}>{direction === 'encode' ? 'Base64 output' : 'Decoded text'}</div>
            {decodeError ? (
              <div style={errorBoxStyle}>⚠️ {decodeError}</div>
            ) : (
              <textarea value={output} readOnly style={{ ...textareaStyle, background: '#F8FAFC' }} spellCheck={false} />
            )}
            <div style={{ ...metaStyle, display: 'flex', justifyContent: 'space-between' }}>
              <span>{decodeError ? '' : formatBytes(outputSize)}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCopy} style={smallBtnStyle} disabled={!output}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy'}</button>
                <button onClick={() => downloadBlob(output, 'text/plain', direction === 'encode' ? 'encoded.txt' : 'decoded.txt')} style={smallBtnStyle} disabled={!output}>Download</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'file' && (
        <div>
          {direction === 'encode' && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={dropzoneStyle}
              >
                <input ref={fileInputRef} type="file" hidden onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])} />
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>📄</div>
                <div style={{ fontWeight: 700, color: T.ink }}>{file ? file.name : 'Choose a file to encode'}</div>
                {file && <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: 2 }}>{formatBytes(file.size)}</div>}
              </div>
              {input && (
                <div style={{ marginTop: 14 }}>
                  <div style={labelStyle}>Base64 output</div>
                  <textarea value={output || input} readOnly style={{ ...textareaStyle, background: '#F8FAFC', minHeight: 160 }} spellCheck={false} />
                  <div style={{ ...metaStyle, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatBytes(new TextEncoder().encode(input).length)}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => { const ok = await copyText(input); setCopyState(ok ? 'copied' : 'idle'); if (ok) setTimeout(() => setCopyState('idle'), 1600); }} style={smallBtnStyle}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy'}</button>
                      <button onClick={() => downloadBlob(input, 'text/plain', `${file?.name || 'file'}.base64.txt`)} style={smallBtnStyle}>Download .txt</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {direction === 'decode' && (
            <div>
              <div style={labelStyle}>Base64 input</div>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setDecodedFile(null); setError(null); }}
                placeholder="Paste Base64 to decode back into a file…"
                style={{ ...textareaStyle, minHeight: 160 }}
                spellCheck={false}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <button onClick={handleDecodeToFile} style={primaryBtnStyle} disabled={!input.trim()}>Decode to file</button>
                {decodedFile && (
                  <>
                    <span style={{ fontSize: '0.8rem', color: T.mutedDark }}>{formatBytes(decodedFile.sizeBytes)}</span>
                    <button onClick={() => downloadBlob(decodedFile.blob, 'application/octet-stream', 'decoded-file')} style={smallBtnStyle}>⬇ Download file</button>
                  </>
                )}
              </div>
              {error && <div style={{ ...errorBoxStyle, marginTop: 10 }}>⚠️ {error}</div>}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 640px) {
          .b64-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const tabStyle = (active) => ({
  padding: '8px 16px', borderRadius: 10, border: active ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
  background: active ? T.accentTint : 'white', color: active ? T.accentDark : T.inkSecondary,
  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: T.font,
});
const pillStyle = (active) => ({
  padding: '8px 16px', borderRadius: 999, border: 'none',
  background: active ? T.accentGradient : '#F1F5F9', color: active ? 'white' : T.inkSecondary,
  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: T.font,
});
const labelStyle = { fontSize: '0.76rem', fontWeight: 700, color: T.mutedDark, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' };
const textareaStyle = {
  width: '100%', minHeight: 200, padding: 12, borderRadius: 10, border: `1px solid ${T.border}`,
  fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', color: T.ink,
};
const metaStyle = { fontSize: '0.74rem', color: T.muted, marginTop: 6 };
const errorBoxStyle = { minHeight: 200, padding: 14, borderRadius: 10, background: T.dangerTint, border: `1px solid #FECACA`, color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const smallBtnStyle = { padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font };
const primaryBtnStyle = { padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accentGradient, color: 'white', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', fontFamily: T.font };
const dropzoneStyle = { cursor: 'pointer', textAlign: 'center', padding: '32px 20px', borderRadius: 14, border: `2px dashed ${T.accentBorder}`, background: T.accentTint };
