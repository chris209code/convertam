'use client';

import { CANVAS_W, CANVAS_H } from '@/lib/invoice-studio/constants';
import CanvasElement from './elements/CanvasElement';

const HIDDEN_WHEN_LETTERHEAD = new Set(['logo', 'companyText', 'contactInfo', 'accentBar']);

export default function Canvas({ elements, ctx, zoom, selectedId, previewMode, onDeselect, dragStart, resizeStart, guideX, guideY }) {
  const letterhead = elements.find((e) => e.id === 'letterhead');
  const letterheadActive = !!(letterhead && letterhead.visible);

  const visibleElements = elements.filter((el) => !(letterheadActive && HIDDEN_WHEN_LETTERHEAD.has(el.id)));

  return (
    <div
      onMouseDown={onDeselect}
      style={{ flex: 1, overflow: 'auto', background: '#EEF1F5', padding: 44 }}
    >
      <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
        <div
          className="cs-print"
          style={{
            width: CANVAS_W, height: CANVAS_H, background: '#fff',
            boxShadow: '0 8px 30px rgba(15,23,42,.12)',
            transform: `scale(${zoom})`, transformOrigin: 'top left',
            position: 'relative',
          }}
        >
          {visibleElements.map((el) => (
            <CanvasElement
              key={el.id}
              el={el}
              ctx={ctx}
              selected={selectedId === el.id && !previewMode}
              previewMode={previewMode}
              onMouseDown={(e) => dragStart(el.id, e)}
              onResize={(corner, e) => resizeStart(el.id, corner, e)}
            />
          ))}

          {guideX != null && (
            <div style={{ position: 'absolute', left: guideX, top: 0, width: 1, height: CANVAS_H, background: '#2563EB', pointerEvents: 'none' }} />
          )}
          {guideY != null && (
            <div style={{ position: 'absolute', top: guideY, left: 0, height: 1, width: CANVAS_W, background: '#2563EB', pointerEvents: 'none' }} />
          )}
        </div>
      </div>
    </div>
  );
}
