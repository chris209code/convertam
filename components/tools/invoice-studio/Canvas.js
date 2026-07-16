'use client';

import { useEffect, useRef } from 'react';
import { CANVAS_W, CANVAS_H } from '@/lib/invoice-studio/constants';
import CanvasElement from './elements/CanvasElement';

const HIDDEN_WHEN_LETTERHEAD = new Set(['logo', 'companyText', 'contactInfo', 'accentBar']);

// Padding kept around the page so it doesn't touch the container edges even
// at 100% fit — matches how Figma/Google Docs print-preview always leave a
// visible margin of "desk" around the sheet of paper.
const FIT_PADDING = 32;

export default function Canvas({ elements, ctx, zoom, onFitZoomChange }) {
  const containerRef = useRef(null);
  const letterhead = elements.find((e) => e.id === 'letterhead');
  const letterheadActive = !!(letterhead && letterhead.visible);

  const visibleElements = elements.filter((el) => !(letterheadActive && HIDDEN_WHEN_LETTERHEAD.has(el.id)));

  // Measures the actual available space for the page and reports the ideal
  // "fit to page" zoom level upward — recalculated whenever the container
  // itself resizes (window resize, sidebar open/close, etc.), not just once
  // on mount. This is what replaces the old fixed ZOOM_DEFAULT.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const computeFit = () => {
      const availW = el.clientWidth - FIT_PADDING * 2;
      const availH = el.clientHeight - FIT_PADDING * 2;
      if (availW <= 0 || availH <= 0) return;
      const fit = Math.min(availW / CANVAS_W, availH / CANVAS_H);
      onFitZoomChange(Math.max(0.1, fit));
    };

    computeFit();
    const observer = new ResizeObserver(computeFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onFitZoomChange]);

  // Scrolling is only ever needed when the person has manually zoomed in
  // past what fits — the default "fit to page" state never scrolls, since
  // the scaled page is always sized to be <= the available space at that
  // point. This is checked live against the container's own measured size
  // rather than a stored "is this manual" flag, so it stays correct even if
  // the window is resized while zoomed in.
  const scaledW = CANVAS_W * zoom;
  const scaledH = CANVAS_H * zoom;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, background: '#EEF1F5', padding: FIT_PADDING,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'auto', // only ever actually scrolls when scaledW/H exceeds the flex box, i.e. zoomed in past fit
      }}
    >
      <div style={{ width: scaledW, height: scaledH, flexShrink: 0 }}>
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
            <CanvasElement key={el.id} el={el} ctx={ctx} selected={false} previewMode={true} />
          ))}
        </div>
      </div>
    </div>
  );
}
