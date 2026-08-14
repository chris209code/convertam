'use client';

// Lets a user choose what "Create Captioned Video" renders on top of,
// before rendering starts — an uploaded image (e.g. a themed cover for a
// teaching/podcast audio), a solid/gradient color pair, the original
// default Convertam background, or a plain dark background with just the
// waveform. Everything here is client-side only: the chosen image is
// decoded in-browser (createImageBitmap) and never uploaded anywhere —
// it's only ever drawn onto the same canvas the render pipeline already
// uses (drawComposeFrame), so this preview can never drift from the real
// export, matching videoCompose.js's own "one draw function" guarantee.

import { useEffect, useRef, useState } from 'react';
import { T } from '../smart-parser/theme';
import { drawComposeFrame, COMPOSE_WIDTH, COMPOSE_HEIGHT } from '@/lib/media/videoCompose';
import { validateUploadSize, MAX_UPLOAD_IMAGE_BYTES } from '@/lib/media/limits';

const TYPES = [
  { value: 'default', label: 'Default Convertam' },
  { value: 'solid', label: '🎨 Solid / gradient' },
  { value: 'image', label: '🖼️ Upload image' },
  { value: 'none', label: 'Waveform only' },
];

// { peaks, value: { background, showWaveform }, onChange(next) }
export default function BackgroundPicker({ peaks, value, onChange }) {
  const [imageError, setImageError] = useState('');
  const canvasRef = useRef(null);

  const background = value.background;
  const showWaveform = value.showWaveform;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawComposeFrame(ctx, { peaks, progress: 0.35, captionText: 'Your captions appear here', background, showWaveform });
  }, [peaks, background, showWaveform]);

  function setType(type) {
    if (type === 'solid') onChange({ ...value, background: { type: 'solid', colors: background.colors || ['#0891B2', '#0E7490'] } });
    else if (type === 'image') onChange({ ...value, background: { type: 'image', image: background.image, fit: background.fit || 'cover', overlay: background.overlay ?? true } });
    else onChange({ ...value, background: { type } });
  }

  async function handleImageFile(file) {
    setImageError('');
    if (!file) return;
    const sizeError = validateUploadSize(file, 'image');
    if (sizeError) { setImageError(sizeError); return; }
    try {
      const bitmap = await createImageBitmap(file);
      onChange({ ...value, background: { ...background, type: 'image', image: bitmap } });
    } catch {
      setImageError('Could not read this image — try a different JPG, PNG, or WebP file.');
    }
  }

  return (
    <div style={{ marginBottom: 16, textAlign: 'left' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <canvas
          ref={canvasRef}
          width={COMPOSE_WIDTH}
          height={COMPOSE_HEIGHT}
          style={{ width: 140, height: 140, borderRadius: 10, border: `1px solid ${T.border}`, flexShrink: 0, background: '#0B1220' }}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: T.inkSecondary, marginBottom: 6 }}>Background</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                style={typeBtn(background.type === t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {background.type === 'solid' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <label style={colorLabel}>
                From
                <input type="color" value={background.colors[0]} onChange={(e) => onChange({ ...value, background: { ...background, colors: [e.target.value, background.colors[1]] } })} style={colorInput} />
              </label>
              <label style={colorLabel}>
                To
                <input type="color" value={background.colors[1]} onChange={(e) => onChange({ ...value, background: { ...background, colors: [background.colors[0], e.target.value] } })} style={colorInput} />
              </label>
            </div>
          )}

          {background.type === 'image' && (
            <div style={{ marginBottom: 10 }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
                style={{ fontSize: '0.76rem', marginBottom: 8 }}
              />
              {imageError && <div style={{ fontSize: '0.72rem', color: '#991B1B', marginBottom: 8 }}>{imageError}</div>}
              {background.image && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.76rem', color: T.inkSecondary }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="fit" checked={background.fit === 'cover'} onChange={() => onChange({ ...value, background: { ...background, fit: 'cover' } })} />
                    Fill (crop to frame)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="fit" checked={background.fit === 'contain'} onChange={() => onChange({ ...value, background: { ...background, fit: 'contain' } })} />
                    Fit (show full image)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={!!background.overlay} onChange={(e) => onChange({ ...value, background: { ...background, overlay: e.target.checked } })} />
                    Dark overlay for readable captions
                  </label>
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: T.inkSecondary }}>
            <input type="checkbox" checked={showWaveform} onChange={(e) => onChange({ ...value, showWaveform: e.target.checked })} />
            Show waveform animation
          </label>
        </div>
      </div>
    </div>
  );
}

const typeBtn = (active) => ({
  padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? T.accent : T.border}`,
  background: active ? T.accentTint : 'white', color: active ? T.accent : T.inkSecondary,
  fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
});
const colorLabel = { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: T.inkSecondary };
const colorInput = { width: 36, height: 26, padding: 0, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' };
