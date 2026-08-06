'use client';

import { useEffect, useRef, useState } from 'react';
import { MORSE_MAP } from './morseCode';
import { playMorse, stopMorse } from './audio';

const QUESTION_COUNT = 10;
const DIRECTION_CHOICES = ['sound', 'morse', 'letter'];
const POOLS = {
  letters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  numbers: [...'0123456789'],
  both: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
};

function segStyle(active) {
  return {
    padding: '9px 10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : '#fff',
    color: active ? '#2563EB' : '#475569', fontWeight: active ? 700 : 500, fontSize: '0.78rem',
  };
}

function buildQuestions(pool, directionMode) {
  const chars = POOLS[pool];
  return Array.from({ length: QUESTION_COUNT }, () => ({
    char: chars[Math.floor(Math.random() * chars.length)],
    direction: directionMode === 'mixed' ? DIRECTION_CHOICES[Math.floor(Math.random() * DIRECTION_CHOICES.length)] : directionMode,
  }));
}

export default function ChallengePanel() {
  const [phase, setPhase] = useState('setup'); // 'setup' | 'active' | 'finished'
  const [pool, setPool] = useState('letters');
  const [directionMode, setDirectionMode] = useState('mixed');
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const advanceTimeout = useRef(null);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const interval = setInterval(() => setElapsed(((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => () => { stopMorse(); clearTimeout(advanceTimeout.current); }, []);

  const current = questions[index];

  useEffect(() => {
    if (phase === 'active' && current?.direction === 'sound') {
      playMorse(MORSE_MAP[current.char], { wpm: 15 });
    }
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    setQuestions(buildQuestions(pool, directionMode));
    setIndex(0);
    setScore(0);
    setAnswer('');
    setFeedback(null);
    setElapsed(0);
    startRef.current = Date.now();
    setPhase('active');
  }

  function submit(e) {
    e.preventDefault();
    if (!answer.trim() || feedback) return;
    const expected = current.direction === 'letter' ? MORSE_MAP[current.char] : current.char;
    const given = current.direction === 'letter' ? answer.trim() : answer.trim().toUpperCase();
    const correct = given === expected;
    if (correct) setScore((s) => s + 1);
    setFeedback(correct ? 'correct' : 'incorrect');
    advanceTimeout.current = setTimeout(() => {
      if (index + 1 >= QUESTION_COUNT) {
        setPhase('finished');
      } else {
        setIndex((i) => i + 1);
        setAnswer('');
        setFeedback(null);
      }
    }, 900);
  }

  function replay() {
    if (current?.direction === 'sound') playMorse(MORSE_MAP[current.char], { wpm: 15 });
  }

  if (phase === 'setup') {
    return (
      <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24 }}>
          <p style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginBottom: 4 }}>10-Question Challenge</p>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: 20 }}>Answer 10 questions as fast as you can. Score and time are shown at the end.</p>

          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Question Type</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[['mixed', 'Mixed'], ['sound', 'Hear It'], ['morse', 'See the Code'], ['letter', 'See the Letter']].map(([id, label]) => (
              <button key={id} onClick={() => setDirectionMode(id)} style={segStyle(directionMode === id)}>{label}</button>
            ))}
          </div>

          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Pool</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {Object.keys(POOLS).map((p) => (
              <button key={p} onClick={() => setPool(p)} style={{ ...segStyle(pool === p), textTransform: 'capitalize' }}>{p}</button>
            ))}
          </div>

          <button onClick={start} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Start Challenge
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Challenge Complete</p>
          <p style={{ fontSize: '2.6rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{score} / {QUESTION_COUNT}</p>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: 24 }}>Finished in {elapsed.toFixed(1)}s</p>
          <button onClick={start} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
        <span>Question {index + 1} / {QUESTION_COUNT}</span>
        <span>⏱ {elapsed.toFixed(1)}s</span>
        <span>Score: {score}</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        {current.direction === 'sound' && (
          <button onClick={replay} style={{ ...segStyle(false), padding: '12px 20px', fontSize: '1rem', marginBottom: 20 }}>▶ Replay Sound</button>
        )}
        {current.direction === 'morse' && (
          <p style={{ fontFamily: 'monospace', fontSize: '2.2rem', letterSpacing: 4, color: '#0F172A', marginBottom: 20 }}>{MORSE_MAP[current.char]}</p>
        )}
        {current.direction === 'letter' && (
          <p style={{ fontSize: '3rem', fontWeight: 800, color: '#0F172A', marginBottom: 20 }}>{current.char}</p>
        )}

        <form onSubmit={submit} style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            disabled={!!feedback}
            placeholder={current.direction === 'letter' ? 'e.g. .-' : 'Type the letter'}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '1rem', fontFamily: current.direction === 'letter' ? 'monospace' : 'inherit', textAlign: 'center', width: 160 }}
          />
          {!feedback && <button type="submit" style={segStyle(true)}>Check</button>}
        </form>

        {feedback && (
          <p style={{ marginTop: 16, fontWeight: 700, fontSize: '0.95rem', color: feedback === 'correct' ? '#059669' : '#DC2626' }}>
            {feedback === 'correct' ? '✓ Correct!' : `✗ It was ${current.direction === 'letter' ? MORSE_MAP[current.char] : current.char}`}
          </p>
        )}
      </div>
    </div>
  );
}
