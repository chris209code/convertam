'use client';

import { useEffect, useState } from 'react';
import { MORSE_MAP, LEARNABLE_CHARS } from './morseCode';
import { playMorse, stopMorse } from './audio';

const LEARN_WPM = 12;

function Symbol({ shape, active }) {
  const base = { borderRadius: 3, background: active ? '#2563EB' : '#CBD5E1', transition: 'background 80ms linear', height: 10 };
  return <span style={{ ...base, width: shape === '-' ? 26 : 10 }} />;
}

export default function LearnPanel() {
  const [activeChar, setActiveChar] = useState(null);
  const [activeSymbolIndex, setActiveSymbolIndex] = useState(-1);

  useEffect(() => () => stopMorse(), []);

  function play(char) {
    setActiveChar(char);
    setActiveSymbolIndex(-1);
    playMorse(MORSE_MAP[char], {
      wpm: LEARN_WPM,
      onSymbol: ({ symbolIndex, active }) => setActiveSymbolIndex(active ? symbolIndex : -1),
      onDone: () => { setActiveChar(null); setActiveSymbolIndex(-1); },
    });
  }

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10 }}>
        <span style={{ fontSize: '1rem' }}>💡</span>
        <span style={{ color: '#1D4ED8', fontSize: '0.82rem' }}>Tap any letter or number to hear it and watch the dots and dashes.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10 }}>
        {LEARNABLE_CHARS.map((char) => {
          const isActive = activeChar === char;
          const symbols = MORSE_MAP[char].split('');
          return (
            <button
              key={char}
              onClick={() => play(char)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '14px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? '#EFF6FF' : '#fff',
                border: '1px solid', borderColor: isActive ? '#2563EB' : '#E2E8F0',
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{char}</span>
              <span style={{ display: 'flex', gap: 4, alignItems: 'center', height: 10 }}>
                {symbols.map((sym, i) => (
                  <Symbol key={i} shape={sym} active={isActive && activeSymbolIndex === i} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
