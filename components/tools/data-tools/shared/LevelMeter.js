'use client';

// Shared live input-level meter — reads peak amplitude off an AnalyserNode
// via its own rAF loop (getPeakLevel, lib/media/audioEngine.js) so a meter
// never forces its parent workspace to re-render every animation frame.
// Used by both Recording Studio (dark shell) and Voice Over (light shell),
// hence the themeable trackColor rather than a hardcoded dark background.

import { useEffect, useRef } from 'react';
import { getPeakLevel } from '@/lib/media/audioEngine';

export default function LevelMeter({ analyserRef, vertical = false, width = 10, height = 46, trackColor = '#1E293B' }) {
  const barRef = useRef(null);
  useEffect(() => {
    let raf;
    function tick() {
      const level = getPeakLevel(analyserRef.current);
      if (barRef.current) {
        if (vertical) barRef.current.style.height = `${Math.round(level * 100)}%`;
        else barRef.current.style.width = `${Math.round(level * 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, vertical]);

  return (
    <div style={{
      width: vertical ? width : '100%', height: vertical ? height : width,
      background: trackColor, borderRadius: 4, overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: vertical ? 'flex-end' : 'stretch',
    }}
    >
      <div ref={barRef} style={{
        background: 'linear-gradient(90deg, #22D3EE, #F59E0B, #DC2626)',
        width: vertical ? '100%' : '0%', height: vertical ? '0%' : '100%',
        transition: 'width 60ms linear, height 60ms linear',
      }}
      />
    </div>
  );
}
