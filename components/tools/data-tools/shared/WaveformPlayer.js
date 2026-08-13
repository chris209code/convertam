'use client';

// Shared audio player + waveform strip — used by Audio Studio (Phase 1)
// and reused unmodified by Video Studio's extracted-audio preview and by
// the audiogram render preview (Phase 2, via videoCompose.js's own
// drawWaveform, the same drawing function this component calls).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { T } from '../smart-parser/theme';
import { drawWaveform } from '@/lib/media/waveform';
import { formatDuration } from '@/lib/media/metadata';

const WaveformPlayer = forwardRef(function WaveformPlayer({ src, peaks, onTimeUpdate, duration }, ref) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useImperativeHandle(ref, () => ({
    seekTo(time) {
      if (audioRef.current) audioRef.current.currentTime = time;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks?.length) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const progress = duration ? currentTime / duration : 0;
    drawWaveform(ctx, peaks, { x: 0, y: 0, width: canvas.width, height: canvas.height, color: T.accent, progress });
  }, [peaks, currentTime, duration]);

  function handleTimeUpdate() {
    const t = audioRef.current?.currentTime || 0;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  }

  function handleCanvasClick(e) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} style={playBtn}>
          {playing ? '⏸' : '▶'}
        </button>
        <canvas
          ref={canvasRef}
          width={800}
          height={64}
          onClick={handleCanvasClick}
          style={{ flex: 1, minWidth: 0, height: 48, cursor: 'pointer', borderRadius: 8, background: T.accentTint, width: '100%' }}
        />
        <span style={{ fontSize: '0.76rem', color: T.mutedDark, flexShrink: 0, minWidth: 84, textAlign: 'right' }}>
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
});

export default WaveformPlayer;

const playBtn = { width: 40, height: 40, borderRadius: '50%', border: 'none', background: T.accentGradient, color: 'white', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 };
