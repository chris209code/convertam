'use client';

import { useRef, useState, useEffect } from 'react';
import TransformableBox from '@/components/shared/TransformableBox';
import { contentFor } from './objectTypes';
import { SLIDE_W, SLIDE_H, PX_PER_INCH } from '@/lib/presentation/layoutEngine';

// Editable canvas for the current slide. Objects are stored canonically in
// INCHES (matching layoutEngine.js / the PPTX export unit); this component
// converts to/from native px (inches*PX_PER_INCH) at the TransformableBox
// boundary only, so undo history and export always see inches. The whole
// canvas renders at native px inside a CSS `transform: scale(fitScale)`
// wrapper — TransformableBox's own `scale` prop is set to that same
// fitScale so its drag-delta math (screen px / scale) lands back in native
// px, which we then divide by PX_PER_INCH to get inches.
function toPxRect(obj) {
  return { x: obj.x * PX_PER_INCH, y: obj.y * PX_PER_INCH, w: obj.w * PX_PER_INCH, h: obj.h * PX_PER_INCH, rotation: obj.rotation || 0 };
}
function fromPxRect(px) {
  return { x: px.x / PX_PER_INCH, y: px.y / PX_PER_INCH, w: px.w / PX_PER_INCH, h: px.h / PX_PER_INCH, rotation: px.rotation || 0 };
}

export default function Stage({ objects, theme, selectedId, editingId, onSelect, onStartEdit, onCommitTransform, onCommitText, onCommitImage, onDeselect }) {
  const containerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const available = el.clientWidth;
      const native = SLIDE_W * PX_PER_INCH;
      setFitScale(available > 0 ? Math.min(1, available / native) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nativeW = SLIDE_W * PX_PER_INCH;
  const nativeH = SLIDE_H * PX_PER_INCH;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{ position: 'relative', width: nativeW * fitScale, height: nativeH * fitScale, background: `#${theme.colors.background}`, overflow: 'hidden', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) onDeselect(); }}
      >
        <div
          style={{ position: 'absolute', left: 0, top: 0, width: nativeW, height: nativeH, transform: `scale(${fitScale})`, transformOrigin: 'top left' }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) onDeselect(); }}
        >
          {objects.map((obj) => {
            const Content = contentFor(obj.type);
            if (!Content) return null;
            const isEditing = editingId === obj.id;
            return (
              <TransformableBox
                key={obj.id}
                obj={toPxRect(obj)}
                scale={fitScale}
                isSelected={selectedId === obj.id}
                isEditing={isEditing}
                onSelect={() => onSelect(obj.id)}
                onStartEdit={obj.type === 'text' ? () => onStartEdit(obj.id) : undefined}
                onCommitTransform={(next) => onCommitTransform(obj.id, fromPxRect(next))}
              >
                {() => (
                  <Content
                    obj={obj}
                    isEditing={isEditing}
                    onCommitText={(value, field) => onCommitText(obj.id, value, field)}
                    onCommitImage={(dataUrl) => onCommitImage(obj.id, dataUrl)}
                  />
                )}
              </TransformableBox>
            );
          })}
        </div>
      </div>
    </div>
  );
}
