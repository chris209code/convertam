'use client';

import { MORSE_MAP, LEARNABLE_CHARS } from './morseCode';

export default function CharacterChart({ onTapChar, activeChar }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 }}>
        Character Reference
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8 }}>
        {LEARNABLE_CHARS.map((char) => (
          <button
            key={char}
            onClick={onTapChar ? () => onTapChar(char) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', borderRadius: 8, cursor: onTapChar ? 'pointer' : 'default',
              background: activeChar === char ? '#EFF6FF' : '#F8FAFC',
              border: '1px solid', borderColor: activeChar === char ? '#93C5FD' : '#E2E8F0',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{char}</span>
            <span style={{ fontSize: '0.72rem', color: '#2563EB', fontFamily: 'monospace', letterSpacing: 1 }}>{MORSE_MAP[char]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
