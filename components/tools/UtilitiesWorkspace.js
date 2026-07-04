'use client';

import { useState, useEffect } from 'react';

const TOOLS = [
  { id: 'qr', label: 'QR Code Generator', icon: '📱' },
  { id: 'password', label: 'Password Generator', icon: '🔐' },
  { id: 'wordcount', label: 'Word Counter', icon: '📝' },
  { id: 'lorem', label: 'Lorem Ipsum', icon: '📄' },
];

function QRGenerator() {
  const [text, setText] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  function generate() {
    if (!text.trim()) return;
    const encoded = encodeURIComponent(text);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`);
  }

  function download() {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'qrcode.png';
    a.click();
  }

  return (
    <div>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>URL or Text</label>
      <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Enter URL or text to convert to QR code"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', marginBottom: 12, outline: 'none' }} />
      <button onClick={generate} style={{ padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', marginBottom: 16 }}>Generate QR Code</button>
      {qrUrl && (
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200, border: '1px solid #E2E8F0', borderRadius: 12, marginBottom: 12 }} />
          <div>
            <button onClick={download} style={{ padding: '8px 20px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem' }}>⬇️ Download PNG</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  function generate() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let chars = '';
    if (options.upper) chars += upper;
    if (options.lower) chars += lower;
    if (options.numbers) chars += numbers;
    if (options.symbols) chars += symbols;
    if (!chars) return;
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setCopied(false);
  }

  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const strength = !password ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : password.length < 16 ? 3 : 4;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#DC2626', '#D97706', '#059669', '#0891B2'][strength];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Password Length: {length}</label>
        <input type="range" min={8} max={32} value={length} onChange={e => setLength(Number(e.target.value))} style={{ width: '100%', accentColor: '#2563EB' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['upper','Uppercase A-Z'],['lower','Lowercase a-z'],['numbers','Numbers 0-9'],['symbols','Symbols !@#']].map(([key, label]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={options[key]} onChange={e => setOptions(o => ({ ...o, [key]: e.target.checked }))} />
            {label}
          </label>
        ))}
      </div>
      <button onClick={generate} style={{ width: '100%', padding: '10px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', marginBottom: 12 }}>Generate Password</button>
      {password && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: '#0F172A', letterSpacing: '0.05em', wordBreak: 'break-all' }}>{password}</span>
            <button onClick={copy} style={{ padding: '6px 12px', background: copied ? '#DCFCE7' : '#EFF6FF', color: copied ? '#059669' : '#2563EB', border: '1px solid', borderColor: copied ? '#A7F3D0' : '#BFDBFE', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: '#E2E8F0', borderRadius: 2 }}>
              <div style={{ width: `${strength * 25}%`, height: 4, background: strengthColor, borderRadius: 2, transition: 'all 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

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

function LoremIpsum() {
  const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
  const [count, setCount] = useState(3);
  const [type, setType] = useState('paragraphs');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  function generate() {
    if (type === 'paragraphs') {
      setResult(Array(count).fill(LOREM).join('\n\n'));
    } else if (type === 'sentences') {
      const sentences = LOREM.split('. ');
      setResult(sentences.slice(0, count).join('. ') + '.');
    } else {
      setResult(LOREM.split(' ').slice(0, count).join(' '));
    }
    setCopied(false);
  }

  function copy() { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Generate</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Count</label>
          <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} min={1} max={10}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      </div>
      <button onClick={generate} style={{ width: '100%', padding: '10px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', marginBottom: 12 }}>Generate</button>
      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button onClick={copy} style={{ padding: '5px 12px', background: copied ? '#DCFCE7' : '#EFF6FF', color: copied ? '#059669' : '#2563EB', border: '1px solid', borderColor: copied ? '#A7F3D0' : '#BFDBFE', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600 }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <textarea readOnly value={result} style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#475569' }} />
        </div>
      )}
    </div>
  );
}

const TOOL_COMPONENTS = { qr: QRGenerator, password: PasswordGenerator, wordcount: WordCounter, lorem: LoremIpsum };

export default function UtilitiesWorkspace() {
  const [active, setActive] = useState('qr');
  const ActiveTool = TOOL_COMPONENTS[active];

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
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
