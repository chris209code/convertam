'use client';

import { useState } from 'react';

const TOOLS = [
  { id: 'password', label: 'Password Generator', icon: '🔐' },
  { id: 'wordcount', label: 'Word Counter', icon: '📝' },
  { id: 'textcase', label: 'Text Case Converter', icon: '🔤' },
];

function PasswordGenerator() {
  const [mode, setMode] = useState('characters'); // characters | passphrase
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ upper: true, lower: true, numbers: true, symbols: true });

  const [separator, setSeparator] = useState('-');
  const [capitalizeWords, setCapitalizeWords] = useState(true);
  const [numberMode, setNumberMode] = useState('random'); // none | random | custom
  const [customNumber, setCustomNumber] = useState('');
  const [useOwnWords, setUseOwnWords] = useState(false);
  const [ownWordsInput, setOwnWordsInput] = useState('');
  const [passphraseLength, setPassphraseLength] = useState(20);
  const [lengthNote, setLengthNote] = useState('');

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  function generateCharacters() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let chars = '';
    if (options.upper) chars += upper;
    if (options.lower) chars += lower;
    if (options.numbers) chars += numbers;
    if (options.symbols) chars += symbols;
    if (!chars) return '';
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }

  const SYMBOL_POOL = '!@#$%^&*';

  function generatePassphrase() {
    let sourceWords;
    if (useOwnWords) {
      sourceWords = ownWordsInput.split(/[,\s]+/).map(w => w.trim()).filter(Boolean);
      if (!sourceWords.length) return '';
      // Shuffle the order so the same set of words doesn't always come out
      // in the order they were typed — still recognizable to the person,
      // still not predictable to anyone else.
      sourceWords = [...sourceWords].sort(() => Math.random() - 0.5);
    } else {
      // Shuffle first, then only take as many as actually get used below —
      // this way "how many words fit" is driven by the length target, not
      // a fixed count, while still starting from a big enough pool.
      sourceWords = Array.from({ length: 8 }, () => randomWord());
    }
    const words = sourceWords.map(w => capitalizeWords ? capitalize(w) : w.toLowerCase());

    const sep = separator === 'space' ? ' '
      : separator === 'none' ? ''
      : separator === 'symbol' ? SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]
      : separator;

    const numberSuffix = numberMode === 'custom' ? customNumber.replace(/[^0-9]/g, '')
      : numberMode === 'random' ? String(Math.floor(10 + Math.random() * 90))
      : '';
    const reserveForNumber = numberSuffix ? sep.length + numberSuffix.length : 0;

    // Build up the phrase one word at a time, using only as many words as
    // fit within the chosen target length — not necessarily all of them.
    let phrase = '';
    for (const word of words) {
      const candidate = phrase ? phrase + sep + word : word;
      if (candidate.length + reserveForNumber > passphraseLength && phrase) break;
      phrase = candidate;
      if (phrase.length + reserveForNumber >= passphraseLength) break;
    }
    if (!phrase) phrase = words[0] || '';

    if (numberSuffix) phrase += sep + numberSuffix;

    if (phrase.length > passphraseLength) {
      phrase = phrase.slice(0, passphraseLength);
      setLengthNote('Trimmed to fit your chosen length exactly.');
    } else if (phrase.length < passphraseLength) {
      setLengthNote(useOwnWords
        ? "Used all your words but still shorter than your chosen length — add more words to reach it exactly."
        : '');
    } else {
      setLengthNote('');
    }

    return phrase;
  }

  function generate() {
    const pwd = mode === 'characters' ? generateCharacters() : generatePassphrase();
    if (!pwd) return;
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('characters')} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: mode === 'characters' ? '2px solid #2563EB' : '1px solid #E2E8F0', background: mode === 'characters' ? '#EFF6FF' : 'white', color: mode === 'characters' ? '#2563EB' : '#475569' }}>
          Random Characters
        </button>
        <button onClick={() => setMode('passphrase')} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: mode === 'passphrase' ? '2px solid #2563EB' : '1px solid #E2E8F0', background: mode === 'passphrase' ? '#EFF6FF' : 'white', color: mode === 'passphrase' ? '#2563EB' : '#475569' }}>
          Word Combination
        </button>
      </div>

      {mode === 'characters' ? (
        <>
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
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
            Easier to remember and type than random characters, while still being hard to guess — a few unrelated words strung together.
          </p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#334155', cursor: 'pointer', marginBottom: 14 }}>
            <input type="checkbox" checked={useOwnWords} onChange={e => setUseOwnWords(e.target.checked)} />
            Use my own words instead of suggested ones
          </label>

          {useOwnWords && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Your words (separate with commas or spaces)</label>
              <input
                type="text" value={ownWordsInput} onChange={e => setOwnWordsInput(e.target.value)}
                placeholder="e.g. mango, lagos, sunrise, 2019"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>These get shuffled into a different order each time you generate — not just used as typed. Not all of them may be needed, depending on the length you choose below.</p>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Password length: {passphraseLength}</label>
            <input type="range" min={10} max={40} value={passphraseLength} onChange={e => setPassphraseLength(Number(e.target.value))} style={{ width: '100%', accentColor: '#2563EB' }} />
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>Only as many words as fit within this length get used.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Separator</label>
              <select value={separator} onChange={e => setSeparator(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value="space">Space</option>
                <option value="symbol">Random Symbol (!@#$%^&*)</option>
                <option value="none">None</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end', paddingBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={capitalizeWords} onChange={e => setCapitalizeWords(e.target.checked)} /> Capitalize Words
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Number at the end</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[['none', 'None'], ['random', 'Random'], ['custom', 'My own']].map(([val, label]) => (
                <button key={val} onClick={() => setNumberMode(val)} style={{ flex: 1, padding: '7px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, border: numberMode === val ? '2px solid #2563EB' : '1px solid #E2E8F0', background: numberMode === val ? '#EFF6FF' : 'white', color: numberMode === val ? '#2563EB' : '#475569' }}>{label}</button>
              ))}
            </div>
            {numberMode === 'custom' && (
              <input
                type="text" value={customNumber} onChange={e => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. your birth year, a meaningful number"
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
              />
            )}
          </div>
        </>
      )}

      <button onClick={generate} disabled={useOwnWords && mode === 'passphrase' && !ownWordsInput.trim()} style={{ width: '100%', padding: '10px', background: (useOwnWords && mode === 'passphrase' && !ownWordsInput.trim()) ? '#94A3B8' : '#2563EB', color: 'white', border: 'none', borderRadius: 8, cursor: (useOwnWords && mode === 'passphrase' && !ownWordsInput.trim()) ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', marginBottom: 12 }}>
        Generate {mode === 'characters' ? 'Password' : 'Passphrase'}
      </button>
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
          {mode === 'passphrase' && lengthNote && (
            <p style={{ fontSize: '0.72rem', color: '#D97706', marginTop: 8 }}>{lengthNote}</p>
          )}
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

const TOOL_COMPONENTS = { password: PasswordGenerator, wordcount: WordCounter, textcase: TextCaseConverter };

export default function UtilitiesWorkspace() {
  const [active, setActive] = useState('password');
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
