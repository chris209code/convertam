'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import ChipInput from './ChipInput';
import ResultCard from './ResultCard';
import {
  generateRandomPasswords,
  generatePassphrases,
  buildSmartPasswords,
  rememberabilityScore,
  passphraseEntropyBits,
} from './calculations';

const MODES = [
  { id: 'random', label: 'Random Password', icon: '🎲' },
  { id: 'smart', label: 'Smart Word Builder', icon: '🧠' },
  { id: 'passphrase', label: 'Passphrase', icon: '🔗' },
];

const COUNT_PRESETS = [1, 5, 10, 20];
const PASSPHRASE_SYMBOLS = '!@#$%';

function segStyle(active) {
  return {
    padding: '9px 10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : '#fff',
    color: active ? '#2563EB' : '#475569', fontWeight: active ? 700 : 500, fontSize: '0.78rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  };
}
function labelStyle() {
  return { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 };
}
function fieldWrap() {
  return { marginBottom: 18 };
}
function checkRow() {
  return { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' };
}
function selectStyle() {
  return { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', background: '#fff', color: '#0F172A' };
}

export default function PasswordStudioWorkspace() {
  const [mode, setMode] = useState('random');
  const [results, setResults] = useState([]); // array of { value, meta }
  const [visibility, setVisibility] = useState({}); // index -> bool

  // ---- Random Password state ----
  const [rLength, setRLength] = useState(16);
  const [rUpper, setRUpper] = useState(true);
  const [rLower, setRLower] = useState(true);
  const [rNumbers, setRNumbers] = useState(true);
  const [rSymbols, setRSymbols] = useState(true);
  const [rExcludeSimilar, setRExcludeSimilar] = useState(false);
  const [rExcludeAmbiguous, setRExcludeAmbiguous] = useState(false);
  const [rCount, setRCount] = useState(1);

  // ---- Smart Word Builder state ----
  const [sWords, setSWords] = useState(['Chris', 'Convertam', 'Prime']);
  const [sNumbers, setSNumbers] = useState(['209', '29']);
  const [sSymbols, setSSymbols] = useState('@#_!$%');
  const [sLength, setSLength] = useState(16);
  const [sCapMode, setSCapMode] = useState('beginning');
  const [sCapWordIndex, setSCapWordIndex] = useState(0);
  const [sNumberPlacement, setSNumberPlacement] = useState('end');
  const [sSymbolPlacement, setSSymbolPlacement] = useState('end');
  const [sCount, setSCount] = useState(4);
  const [sError, setSError] = useState(null);
  const [sSuggestions, setSSuggestions] = useState([]);

  // ---- Passphrase state ----
  const [pWordCount, setPWordCount] = useState(4);
  const [pSeparator, setPSeparator] = useState('-');
  const [pCapitalization, setPCapitalization] = useState('first');
  const [pIncludeNumber, setPIncludeNumber] = useState(true);
  const [pIncludeSymbol, setPIncludeSymbol] = useState(false);
  const [pCount, setPCount] = useState(3);

  const generate = useCallback(() => {
    if (mode === 'random') {
      const r = generateRandomPasswords({
        length: rLength, useUpper: rUpper, useLower: rLower, useNumbers: rNumbers, useSymbols: rSymbols,
        excludeSimilar: rExcludeSimilar, excludeAmbiguous: rExcludeAmbiguous, count: rCount,
      });
      if (r.success) {
        setResults(r.results.map((value) => ({ value, meta: { length: value.length } })));
        setSError(null);
      } else {
        setResults([]);
      }
    } else if (mode === 'smart') {
      const r = buildSmartPasswords({
        words: sWords, numbers: sNumbers, symbols: sSymbols.split('').filter(Boolean),
        targetLength: sLength, capitalizationMode: sCapMode, capitalizeWordIndex: sCapWordIndex,
        numberPlacement: sNumberPlacement, symbolPlacement: sSymbolPlacement, count: sCount,
      });
      if (r.success) {
        setResults(r.results.map((res) => ({ value: res.value, meta: { wordCount: res.wordCount } })));
        setSError(null);
        setSSuggestions([]);
      } else {
        setResults([]);
        setSError(r.message);
        setSSuggestions(r.suggestions || []);
      }
    } else if (mode === 'passphrase') {
      const r = generatePassphrases({
        wordCount: pWordCount, separator: pSeparator, capitalization: pCapitalization,
        includeNumber: pIncludeNumber, includeSymbol: pIncludeSymbol, symbolsPool: PASSPHRASE_SYMBOLS, count: pCount,
      });
      if (r.success) {
        setResults(r.results.map((res) => ({
          value: res.value,
          meta: { wordCount: res.wordCount },
          wordEntropyBits: passphraseEntropyBits({ wordCount: res.wordCount, includeNumber: pIncludeNumber, includeSymbol: pIncludeSymbol, symbolsPoolSize: PASSPHRASE_SYMBOLS.length }),
        })));
      }
    }
    setVisibility({});
  }, [
    mode, rLength, rUpper, rLower, rNumbers, rSymbols, rExcludeSimilar, rExcludeAmbiguous, rCount,
    sWords, sNumbers, sSymbols, sLength, sCapMode, sCapWordIndex, sNumberPlacement, sSymbolPlacement, sCount,
    pWordCount, pSeparator, pCapitalization, pIncludeNumber, pIncludeSymbol, pCount,
  ]);

  useEffect(() => { generate(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function regenerateOne(index) {
    if (mode === 'random') {
      const r = generateRandomPasswords({
        length: rLength, useUpper: rUpper, useLower: rLower, useNumbers: rNumbers, useSymbols: rSymbols,
        excludeSimilar: rExcludeSimilar, excludeAmbiguous: rExcludeAmbiguous, count: 1,
      });
      if (r.success) setResults((prev) => prev.map((item, i) => (i === index ? { value: r.results[0], meta: { length: r.results[0].length } } : item)));
    } else if (mode === 'smart') {
      const r = buildSmartPasswords({
        words: sWords, numbers: sNumbers, symbols: sSymbols.split('').filter(Boolean),
        targetLength: sLength, capitalizationMode: sCapMode, capitalizeWordIndex: sCapWordIndex,
        numberPlacement: sNumberPlacement, symbolPlacement: sSymbolPlacement, count: 1,
      });
      if (r.success) setResults((prev) => prev.map((item, i) => (i === index ? { value: r.results[0].value, meta: { wordCount: r.results[0].wordCount } } : item)));
    } else if (mode === 'passphrase') {
      const r = generatePassphrases({
        wordCount: pWordCount, separator: pSeparator, capitalization: pCapitalization,
        includeNumber: pIncludeNumber, includeSymbol: pIncludeSymbol, symbolsPool: PASSPHRASE_SYMBOLS, count: 1,
      });
      if (r.success) setResults((prev) => prev.map((item, i) => (i === index ? {
        value: r.results[0].value,
        meta: { wordCount: r.results[0].wordCount },
        wordEntropyBits: passphraseEntropyBits({ wordCount: r.results[0].wordCount, includeNumber: pIncludeNumber, includeSymbol: pIncludeSymbol, symbolsPoolSize: PASSPHRASE_SYMBOLS.length }),
      } : item)));
    }
  }

  function toggleVisible(index) {
    setVisibility((v) => ({ ...v, [index]: !v[index] }));
  }
  function showAll() { setVisibility(Object.fromEntries(results.map((_, i) => [i, true]))); }
  function hideAll() { setVisibility({}); }
  function clearAll() { setResults([]); setVisibility({}); }
  function copyAll() {
    navigator.clipboard.writeText(results.map((r) => r.value).join('\n'));
  }
  function downloadTxt() {
    const blob = new Blob([results.map((r) => r.value).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const rememberMode = mode === 'random' ? 'random' : mode === 'smart' ? 'smart' : 'passphrase';

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      {/* Privacy badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10 }}>
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <div>
          <span style={{ fontWeight: 700, color: '#065F46', fontSize: '0.82rem' }}>100% Private —</span>{' '}
          <span style={{ color: '#047857', fontSize: '0.82rem' }}>All passwords are generated locally in your browser. Nothing is uploaded or stored.</span>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={segStyle(mode === m.id)}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left — Configuration */}
        <div style={{ flex: '1 1 340px', minWidth: 300, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
          {mode === 'random' && (
            <RandomPanel
              {...{ rLength, setRLength, rUpper, setRUpper, rLower, setRLower, rNumbers, setRNumbers, rSymbols, setRSymbols,
                rExcludeSimilar, setRExcludeSimilar, rExcludeAmbiguous, setRExcludeAmbiguous, rCount, setRCount }}
            />
          )}
          {mode === 'smart' && (
            <SmartPanel
              {...{ sWords, setSWords, sNumbers, setSNumbers, sSymbols, setSSymbols, sLength, setSLength,
                sCapMode, setSCapMode, sCapWordIndex, setSCapWordIndex, sNumberPlacement, setSNumberPlacement,
                sSymbolPlacement, setSSymbolPlacement, sCount, setSCount }}
            />
          )}
          {mode === 'passphrase' && (
            <PassphrasePanel
              {...{ pWordCount, setPWordCount, pSeparator, setPSeparator, pCapitalization, setPCapitalization,
                pIncludeNumber, setPIncludeNumber, pIncludeSymbol, setPIncludeSymbol, pCount, setPCount }}
            />
          )}

          <button
            onClick={generate}
            style={{ width: '100%', marginTop: 4, padding: '12px 16px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⚡ Generate
          </button>
        </div>

        {/* Right — Results */}
        <div style={{ flex: '1 1 380px', minWidth: 300 }}>
          {results.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button onClick={copyAll} style={toolBtn()}>Copy All</button>
              <button onClick={downloadTxt} style={toolBtn()}>Download TXT</button>
              <button onClick={showAll} style={toolBtn()}>Show All</button>
              <button onClick={hideAll} style={toolBtn()}>Hide All</button>
              <button onClick={generate} style={toolBtn()}>Regenerate</button>
              <button onClick={clearAll} style={toolBtn('danger')}>Clear</button>
            </div>
          )}

          {sError && mode === 'smart' && (
            <div style={{ padding: 16, borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.85rem', marginBottom: 8 }}>Couldn't build a password at that length</div>
              <div style={{ color: '#92400E', fontSize: '0.82rem', marginBottom: sSuggestions.length ? 8 : 0 }}>{sError}</div>
              {sSuggestions.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, color: '#92400E', fontSize: '0.8rem' }}>
                  {sSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((r, i) => (
              <ResultCard
                key={i}
                value={r.value}
                rememberability={rememberabilityScore(rememberMode, { ...r.meta, length: r.value.length })}
                onRegenerate={() => regenerateOne(i)}
                visible={!!visibility[i]}
                onToggleVisible={() => toggleVisible(i)}
                wordEntropyBits={r.wordEntropyBits}
              />
            ))}
          </div>

          {results.length === 0 && !sError && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: '0.85rem', border: '1px dashed #E2E8F0', borderRadius: 12 }}>
              Click Generate to create your first password.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toolBtn(variant) {
  return {
    padding: '7px 12px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: variant === 'danger' ? '#FEF2F2' : '#F8FAFC',
    border: variant === 'danger' ? '1px solid #FECACA' : '1px solid #E2E8F0',
    color: variant === 'danger' ? '#DC2626' : '#334155',
  };
}

function RandomPanel({ rLength, setRLength, rUpper, setRUpper, rLower, setRLower, rNumbers, setRNumbers, rSymbols, setRSymbols, rExcludeSimilar, setRExcludeSimilar, rExcludeAmbiguous, setRExcludeAmbiguous, rCount, setRCount }) {
  return (
    <>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Password Length: {rLength}</label>
        <input type="range" min={4} max={64} value={rLength} onChange={(e) => setRLength(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Character Types</label>
        {[
          ['Uppercase (A-Z)', rUpper, setRUpper],
          ['Lowercase (a-z)', rLower, setRLower],
          ['Numbers (0-9)', rNumbers, setRNumbers],
          ['Symbols (!@#$%)', rSymbols, setRSymbols],
        ].map(([label, val, setter]) => (
          <label key={label} style={checkRow()}>
            <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} /> {label}
          </label>
        ))}
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Options</label>
        <label style={checkRow()}><input type="checkbox" checked={rExcludeSimilar} onChange={(e) => setRExcludeSimilar(e.target.checked)} /> Exclude similar characters (i, l, 1, L, o, O, 0)</label>
        <label style={checkRow()}><input type="checkbox" checked={rExcludeAmbiguous} onChange={(e) => setRExcludeAmbiguous(e.target.checked)} /> Exclude ambiguous symbols ({'{ } [ ] ( ) / \\'})</label>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>How Many Passwords</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[1, 2, 5, 10].map((n) => (
            <button key={n} onClick={() => setRCount(n)} style={segStyle(rCount === n)}>{n}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function SmartPanel({ sWords, setSWords, sNumbers, setSNumbers, sSymbols, setSSymbols, sLength, setSLength, sCapMode, setSCapMode, sCapWordIndex, setSCapWordIndex, sNumberPlacement, setSNumberPlacement, sSymbolPlacement, setSSymbolPlacement, sCount, setSCount }) {
  return (
    <>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Words</label>
        <ChipInput chips={sWords} onChange={setSWords} placeholder="e.g. Chris" addLabel="+ Add Word" />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Number Combinations</label>
        <ChipInput chips={sNumbers} onChange={setSNumbers} placeholder="e.g. 209" addLabel="+ Add Number" inputMode="numeric" />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Preferred Symbols</label>
        <input value={sSymbols} onChange={(e) => setSSymbols(e.target.value)} placeholder="@#_!$%" style={selectStyle()} />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Desired Length: {sLength}</label>
        <input type="range" min={6} max={48} value={sLength} onChange={(e) => setSLength(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Capitalization</label>
        <select value={sCapMode} onChange={(e) => setSCapMode(e.target.value)} style={selectStyle()}>
          <option value="none">None</option>
          <option value="beginning">Beginning word</option>
          <option value="middle">Middle word</option>
          <option value="end">End word</option>
          <option value="random">Random word</option>
          <option value="all">All words</option>
          <option value="choose">Choose specific word...</option>
        </select>
        {sCapMode === 'choose' && (
          <select value={sCapWordIndex} onChange={(e) => setSCapWordIndex(Number(e.target.value))} style={{ ...selectStyle(), marginTop: 8 }}>
            {sWords.map((w, i) => <option key={w + i} value={i}>{w}</option>)}
          </select>
        )}
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Number Placement</label>
        <select value={sNumberPlacement} onChange={(e) => setSNumberPlacement(e.target.value)} style={selectStyle()}>
          <option value="beginning">Beginning</option>
          <option value="middle">Middle</option>
          <option value="between">Between words</option>
          <option value="end">End</option>
          <option value="random">Random</option>
          <option value="none">None</option>
        </select>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Symbol Placement</label>
        <select value={sSymbolPlacement} onChange={(e) => setSSymbolPlacement(e.target.value)} style={selectStyle()}>
          <option value="beginning">Beginning</option>
          <option value="middle">Middle</option>
          <option value="between">Between words</option>
          <option value="end">End</option>
          <option value="random">Random</option>
          <option value="none">None</option>
        </select>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Suggestions to Generate</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[1, 4, 8].map((n) => (
            <button key={n} onClick={() => setSCount(n)} style={segStyle(sCount === n)}>{n}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function PassphrasePanel({ pWordCount, setPWordCount, pSeparator, setPSeparator, pCapitalization, setPCapitalization, pIncludeNumber, setPIncludeNumber, pIncludeSymbol, setPIncludeSymbol, pCount, setPCount }) {
  return (
    <>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Word Count: {pWordCount}</label>
        <input type="range" min={3} max={8} value={pWordCount} onChange={(e) => setPWordCount(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Separator</label>
        <select value={pSeparator} onChange={(e) => setPSeparator(e.target.value)} style={selectStyle()}>
          <option value="-">Hyphen ( - )</option>
          <option value="_">Underscore ( _ )</option>
          <option value=".">Period ( . )</option>
          <option value="space">Space</option>
          <option value="random">Random mix</option>
        </select>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Capitalization</label>
        <select value={pCapitalization} onChange={(e) => setPCapitalization(e.target.value)} style={selectStyle()}>
          <option value="none">none (lowercase)</option>
          <option value="first">First Word</option>
          <option value="all">All Words</option>
          <option value="random">Random</option>
        </select>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>Options</label>
        <label style={checkRow()}><input type="checkbox" checked={pIncludeNumber} onChange={(e) => setPIncludeNumber(e.target.checked)} /> Include a number</label>
        <label style={checkRow()}><input type="checkbox" checked={pIncludeSymbol} onChange={(e) => setPIncludeSymbol(e.target.checked)} /> Include a symbol</label>
      </div>
      <div style={fieldWrap()}>
        <label style={labelStyle()}>How Many Passphrases</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COUNT_PRESETS.slice(0, 3).map((n) => (
            <button key={n} onClick={() => setPCount(n)} style={segStyle(pCount === n)}>{n}</button>
          ))}
        </div>
      </div>
    </>
  );
}
