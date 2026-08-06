'use client';

import { useEffect, useRef, useState } from 'react';
import { textToMorse, morseToText } from './morseCode';
import { playMorse, stopMorse, generateMorseWav } from './audio';
import CharacterChart from './CharacterChart';

const WPM_PRESETS = [5, 10, 15, 20, 30];

function toolBtn(variant) {
  return {
    padding: '7px 12px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: variant === 'primary' ? '#2563EB' : '#F8FAFC',
    border: variant === 'primary' ? 'none' : '1px solid #E2E8F0',
    color: variant === 'primary' ? '#fff' : '#334155',
  };
}

export default function TranslatePanel() {
  const [text, setText] = useState('');
  const [morse, setMorse] = useState('');
  const [wpm, setWpm] = useState(15);
  const [playing, setPlaying] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [shared, setShared] = useState(false);
  const initializedFromUrl = useRef(false);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('text');
    if (shared) {
      setText(shared);
      setMorse(textToMorse(shared));
    }
  }, []);

  useEffect(() => () => stopMorse(), []);

  function handleTextChange(e) {
    const value = e.target.value;
    setText(value);
    setMorse(textToMorse(value));
  }

  function handleMorseChange(e) {
    const value = e.target.value;
    setMorse(value);
    setText(morseToText(value));
  }

  function togglePlay() {
    if (playing) {
      stopMorse();
      setPlaying(false);
      return;
    }
    if (!morse.trim()) return;
    setPlaying(true);
    playMorse(morse, { wpm, onDone: () => setPlaying(false) });
  }

  function copy(key, value) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  function downloadWav() {
    if (!morse.trim()) return;
    const blob = generateMorseWav(morse, { wpm });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'morse-code.wav';
    a.click();
    URL.revokeObjectURL(url);
  }

  function share() {
    const url = `${window.location.origin}${window.location.pathname}?text=${encodeURIComponent(text)}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10 }}>
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <div>
          <span style={{ fontWeight: 700, color: '#065F46', fontSize: '0.82rem' }}>100% Private —</span>{' '}
          <span style={{ color: '#047857', fontSize: '0.82rem' }}>Everything translates and plays locally in your browser.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>Text</label>
            <button onClick={() => copy('text', text)} style={toolBtn()}>{copiedKey === 'text' ? '✓ Copied' : 'Copy'}</button>
          </div>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Type a message..."
            style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>Morse Code</label>
            <button onClick={() => copy('morse', morse)} style={toolBtn()}>{copiedKey === 'morse' ? '✓ Copied' : 'Copy'}</button>
          </div>
          <textarea
            value={morse}
            onChange={handleMorseChange}
            placeholder=".... . .-.. .-.. ---"
            style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: 1, outline: 'none', resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={togglePlay} style={{ ...toolBtn('primary'), padding: '10px 18px', fontSize: '0.85rem' }}>
            {playing ? '⏹ Stop' : '▶ Play'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B' }}>Speed</span>
            {WPM_PRESETS.map((n) => (
              <button key={n} onClick={() => setWpm(n)} style={{ ...toolBtn(wpm === n ? 'primary' : undefined), padding: '6px 10px' }}>
                {n} WPM
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={downloadWav} style={toolBtn()}>⬇ Download WAV</button>
          <button onClick={share} style={toolBtn()}>{shared ? '✓ Link Copied' : '🔗 Share Translation'}</button>
        </div>
      </div>

      <CharacterChart />
    </div>
  );
}
