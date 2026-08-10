'use client';

import { useRef, useEffect } from 'react';

// Small canvas-draw chart renderer for bar/line/pie/doughnut, following the
// same canvas + useEffect pattern already established by
// DataAnalystWorkspace.js's ChartCanvas (2D context, no chart library
// dependency). Used for on-screen editor rendering; PPTX export instead
// uses pptxgenjs's native addChart() for a genuinely editable chart object
// (see lib/presentation/buildPptx.js, Phase E) — this component is never
// used for export.
export default function SlideChart({ chartType, labels, values, colors, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const palette = colors && colors.length ? colors.map((c) => `#${c}`) : ['#2563EB', '#F59E0B', '#10B981', '#94A3B8'];

    if (chartType === 'pie' || chartType === 'doughnut') {
      const total = values.reduce((a, b) => a + b, 0) || 1;
      const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;
      const innerR = chartType === 'doughnut' ? r * 0.55 : 0;
      let angle = -Math.PI / 2;
      values.forEach((v, i) => {
        const slice = (v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.closePath();
        ctx.fillStyle = palette[i % palette.length];
        ctx.fill();
        angle += slice;
      });
      if (innerR) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
      return;
    }

    const padding = { top: 16, right: 16, bottom: 28, left: 34 };
    const plotW = W - padding.left - padding.right;
    const plotH = H - padding.top - padding.bottom;
    const maxVal = Math.max(...values, 1);
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, H - padding.bottom);
    ctx.lineTo(W - padding.right, H - padding.bottom);
    ctx.stroke();

    if (chartType === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = palette[0];
      ctx.lineWidth = 2;
      values.forEach((v, i) => {
        const x = padding.left + (i / Math.max(values.length - 1, 1)) * plotW;
        const y = H - padding.bottom - (v / maxVal) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      const barW = (plotW / values.length) * 0.6;
      values.forEach((v, i) => {
        const x = padding.left + (i / values.length) * plotW + ((plotW / values.length) - barW) / 2;
        const barH = (v / maxVal) * plotH;
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(x, H - padding.bottom - barH, barW, barH);
      });
    }

    ctx.fillStyle = '#64748B';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = padding.left + (i / Math.max(labels.length - (chartType === 'line' ? 1 : 0), 1)) * plotW + (chartType === 'line' ? 0 : plotW / labels.length / 2);
      ctx.fillText(String(label).length > 10 ? `${String(label).slice(0, 9)}…` : label, x, H - padding.bottom + 14);
    });
  }, [chartType, labels, values, colors]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />;
}
