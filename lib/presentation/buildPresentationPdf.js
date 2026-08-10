// Server-side HTML builder for presentation PDF export, rendered via the
// shared lib/pdf/launchPdfBrowser.js Puppeteer helper (same infra as
// resume-pdf/invoice-pdf). CSS's native `in` unit lets every object's
// inches-based x/y/w/h from the object array be used directly with zero
// conversion — the same numbers the editor and the PPTX export use, so
// the PDF never visually drifts from either. Charts render as small
// inline SVGs built here (not canvas + client JS) since that's simpler
// and more reliable inside a print/PDF page than waiting on canvas paint
// timing before Puppeteer captures the page.
import { SLIDE_W, SLIDE_H } from './layoutEngine';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function chartSvg(obj) {
  const w = obj.w * 96, h = obj.h * 96;
  const palette = (obj.colors || []).length ? obj.colors.map((c) => `#${c}`) : ['#2563EB', '#F59E0B', '#10B981', '#94A3B8'];
  const values = obj.values || [];
  const labels = obj.labels || [];

  if (obj.chartType === 'pie' || obj.chartType === 'doughnut') {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10;
    let angle = -Math.PI / 2;
    const slices = values.map((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
      return `<path d="${path}" fill="${palette[i % palette.length]}" />`;
    }).join('');
    const hole = obj.chartType === 'doughnut' ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="white" />` : '';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${slices}${hole}</svg>`;
  }

  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const plotW = w - padding.left - padding.right, plotH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1);
  let bars = '';
  if (obj.chartType === 'line') {
    const points = values.map((v, i) => {
      const x = padding.left + (i / Math.max(values.length - 1, 1)) * plotW;
      const y = padding.top + plotH - (v / maxVal) * plotH;
      return `${x},${y}`;
    }).join(' ');
    bars = `<polyline points="${points}" fill="none" stroke="${palette[0]}" stroke-width="2" />`;
  } else {
    const barW = (plotW / values.length) * 0.6;
    bars = values.map((v, i) => {
      const x = padding.left + (i / values.length) * plotW + ((plotW / values.length) - barW) / 2;
      const barH = (v / maxVal) * plotH;
      const y = padding.top + plotH - barH;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${palette[i % palette.length]}" />`;
    }).join('');
  }
  const labelEls = labels.map((label, i) => {
    const x = padding.left + (i / Math.max(labels.length - (obj.chartType === 'line' ? 1 : 0), 1)) * plotW + (obj.chartType === 'line' ? 0 : plotW / labels.length / 2);
    return `<text x="${x}" y="${h - 6}" font-size="9" fill="#64748B" text-anchor="middle">${esc(String(label).slice(0, 10))}</text>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="${padding.left}" y1="${padding.top + plotH}" x2="${w - padding.right}" y2="${padding.top + plotH}" stroke="#E2E8F0" />${bars}${labelEls}</svg>`;
}

function objectHtml(obj) {
  const style = `position:absolute; left:${obj.x}in; top:${obj.y}in; width:${obj.w}in; height:${obj.h}in;`;
  if (obj.background) return '';

  if (obj.type === 'text') {
    const textStyle = `${style} font-family:'${obj.fontFace}',sans-serif; font-size:${obj.fontSize}pt; font-weight:${obj.bold ? 700 : 400}; font-style:${obj.italic ? 'italic' : 'normal'}; color:#${obj.color}; text-align:${obj.align || 'left'};`;
    if (obj.bulleted) {
      const items = (obj.lines || []).map((l) => `<li style="margin-bottom:4pt;">${esc(l)}</li>`).join('');
      return `<ul style="${textStyle} margin:0; padding-left:18pt; list-style:disc;">${items}</ul>`;
    }
    return `<div style="${textStyle} display:flex; align-items:${obj.align === 'center' ? 'center' : 'flex-start'}; justify-content:${obj.align === 'center' ? 'center' : 'flex-start'};">${esc(obj.text)}</div>`;
  }
  if (obj.type === 'shape') {
    const radius = obj.shapeType === 'circle' ? '50%' : '0';
    const border = obj.outline ? `border:1px solid #${obj.outline};` : '';
    return `<div style="${style} background:#${obj.fill}; border-radius:${radius}; ${border}"></div>`;
  }
  if (obj.type === 'image') {
    if (obj.dataUrl) return `<img src="${obj.dataUrl}" style="${style} object-fit:cover; border-radius:4pt;" />`;
    return `<div style="${style} background:#${obj.fill}; border:2px dashed #94A3B8; border-radius:8pt; display:flex; align-items:center; justify-content:center; text-align:center; color:#64748B; font-size:9pt;">${esc(obj.placeholderLabel || '')}</div>`;
  }
  if (obj.type === 'chart') {
    return `<div style="${style}">${chartSvg(obj)}</div>`;
  }
  return '';
}

export function buildPresentationHtml({ slidesMeta, objects, theme, title }) {
  const slidesHtml = slidesMeta.map((meta, slideIndex) => {
    const slideObjects = objects.filter((o) => o.slideIndex === slideIndex);
    const backgroundObj = slideObjects.find((o) => o.background);
    const bg = backgroundObj ? backgroundObj.fill : theme.colors.background;
    const content = slideObjects.map(objectHtml).join('');
    return `<div class="slide" style="background:#${bg};">${content}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title || 'Presentation')}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .slide {
    position: relative;
    width: ${SLIDE_W}in;
    height: ${SLIDE_H}in;
    overflow: hidden;
    page-break-after: always;
  }
  .slide:last-child { page-break-after: auto; }
  @page { size: ${SLIDE_W}in ${SLIDE_H}in; margin: 0; }
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}
