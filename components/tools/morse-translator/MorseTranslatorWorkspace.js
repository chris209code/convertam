'use client';

import { useState } from 'react';
import TranslatePanel from './TranslatePanel';
import LearnPanel from './LearnPanel';
import PracticePanel from './PracticePanel';
import ChallengePanel from './ChallengePanel';
import { stopMorse } from './audio';

const MODES = [
  { id: 'translate', label: 'Translate', icon: '🔁' },
  { id: 'learn', label: 'Learn', icon: '📖' },
  { id: 'practice', label: 'Practice', icon: '🎯' },
  { id: 'challenge', label: 'Challenge', icon: '🏆' },
];

function tabStyle(active) {
  return {
    padding: '9px 10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : '#fff',
    color: active ? '#2563EB' : '#475569', fontWeight: active ? 700 : 500, fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  };
}

export default function MorseTranslatorWorkspace() {
  const [mode, setMode] = useState('translate');

  function selectMode(next) {
    stopMorse();
    setMode(next);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => selectMode(m.id)} style={tabStyle(mode === m.id)}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
      </div>

      {mode === 'translate' && <TranslatePanel />}
      {mode === 'learn' && <LearnPanel />}
      {mode === 'practice' && <PracticePanel />}
      {mode === 'challenge' && <ChallengePanel />}
    </div>
  );
}
