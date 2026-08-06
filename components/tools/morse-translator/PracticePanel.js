'use client';

import { useEffect, useRef, useState } from 'react';
import { MORSE_MAP } from './morseCode';
import { playMorse, stopMorse } from './audio';

const DIRECTIONS = [
  { id: 'sound', label: '🔊 Hear It → Type the Letter' },
  { id: 'morse', label: '⠿ See the Code → Type the Letter' },
  { id: 'letter', label: '🔤 See the Letter → Type the Code' },
];

const POOLS = {
  letters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  numbers: [...'0123456789'],
  both: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
};

function randomChar(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function segStyle(active) {
  return {
    padding: '9px 10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : '#fff',
    color: active ? '#2563EB' : '#475569', fontWeight: active ? 700 : 500, fontSize: '0.78rem',
  };
}

export default function PracticePanel() {
  const [direction, setDirection] = useState('sound');
  const [pool, setPool] = useState('letters');
  const [current, setCurrent] = useState(() => randomChar(POOLS.letters));
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const inputRef = useRef(null);

  function nextQuestion(activePool) {
    setCurrent(randomChar(POOLS[activePool || pool]));
    setAnswer('');
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (direction === 'sound') playMorse(MORSE_MAP[current], { wpm: 15 });
    return () => stopMorse();
  }, [current, direction]);

  function changePool(next) {
    setPool(next);
    setScore({ correct: 0, total: 0 });
    nextQuestion(next);
  }

  function changeDirection(next) {
    setDirection(next);
    setScore({ correct: 0, total: 0 });
    nextQuestion();
  }

  function replay() {
    playMorse(MORSE_MAP[current], { wpm: 15 });
  }

  function submit(e) {
    e.preventDefault();
    if (!answer.trim() || feedback) return;
    const expected = direction === 'letter' ? MORSE_MAP[current] : current;
    const given = direction === 'letter' ? answer.trim() : answer.trim().toUpperCase();
    const isCorrect = given === expected;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  }

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {DIRECTIONS.map((d) => (
          <button key={d.id} onClick={() => changeDirection(d.id)} style={segStyle(direction === d.id)}>{d.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Object.keys(POOLS).map((p) => (
          <button key={p} onClick={() => changePool(p)} style={{ ...segStyle(pool === p), textTransform: 'capitalize' }}>{p}</button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
          Score: {score.correct} / {score.total}
        </p>

        {direction === 'sound' && (
          <button onClick={replay} style={{ ...segStyle(false), padding: '12px 20px', fontSize: '1rem', marginBottom: 20 }}>▶ Replay Sound</button>
        )}
        {direction === 'morse' && (
          <p style={{ fontFamily: 'monospace', fontSize: '2.2rem', letterSpacing: 4, color: '#0F172A', marginBottom: 20 }}>{MORSE_MAP[current]}</p>
        )}
        {direction === 'letter' && (
          <p style={{ fontSize: '3rem', fontWeight: 800, color: '#0F172A', marginBottom: 20 }}>{current}</p>
        )}

        <form onSubmit={submit} style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            placeholder={direction === 'letter' ? 'e.g. .-' : 'Type the letter'}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '1rem', fontFamily: direction === 'letter' ? 'monospace' : 'inherit', textAlign: 'center', width: 160 }}
          />
          {!feedback && <button type="submit" style={{ ...segStyle(true) }}>Check</button>}
        </form>

        {feedback && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: feedback === 'correct' ? '#059669' : '#DC2626', marginBottom: 12 }}>
              {feedback === 'correct' ? '✓ Correct!' : `✗ Incorrect — it was ${direction === 'letter' ? MORSE_MAP[current] : current}`}
            </p>
            <button onClick={() => nextQuestion()} style={{ ...segStyle(true), padding: '10px 20px' }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
