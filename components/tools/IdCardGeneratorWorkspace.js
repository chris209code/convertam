'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const INDUSTRIES = [
  { id: 'corporate', label: 'Corporate', icon: '🏢', color: '#1E3A8A', idLabel: 'Employee No.', idIcon: 'person', secondaryLabel: 'Department', secondaryIcon: 'building', fieldsOn: [] },
  { id: 'school', label: 'School', icon: '🏫', color: '#B91C1C', idLabel: 'Admission No.', idIcon: 'person', secondaryLabel: 'Class', secondaryIcon: 'building', fieldsOn: [] },
  { id: 'church', label: 'Church', icon: '⛪', color: '#6D28D9', idLabel: 'Member No.', idIcon: 'person', secondaryLabel: 'Ministry / Unit', secondaryIcon: 'building', fieldsOn: [] },
  { id: 'hospital', label: 'Hospital', icon: '🏥', color: '#DC2626', idLabel: 'Staff No.', idIcon: 'person', secondaryLabel: 'Ward / Department', secondaryIcon: 'building', fieldsOn: ['bloodGroup'] },
  { id: 'event', label: 'Event Pass', icon: '🎉', color: '#D97706', idLabel: 'Pass No.', idIcon: 'person', secondaryLabel: 'Access Level', secondaryIcon: 'building', fieldsOn: ['validUntil'] },
  { id: 'security', label: 'Security', icon: '🛡️', color: '#111827', idLabel: 'Badge No.', idIcon: 'person', secondaryLabel: 'Post / Unit', secondaryIcon: 'building', fieldsOn: [] },
  { id: 'construction', label: 'Construction', icon: '👷', color: '#B45309', idLabel: 'Worker No.', idIcon: 'person', secondaryLabel: 'Site / Team', secondaryIcon: 'building', fieldsOn: ['bloodGroup'] },
  { id: 'university', label: 'University', icon: '🎓', color: '#1D4ED8', idLabel: 'Matric No.', idIcon: 'person', secondaryLabel: 'Faculty / Dept.', secondaryIcon: 'building', fieldsOn: [] },
];

const LAYOUTS = [
  { id: 'classic', label: 'Heritage', note: 'Photo left, details right' },
  { id: 'executive', label: 'Prestige', note: 'Navy banner, centered photo, seal' },
  { id: 'split', label: 'Edge', note: 'Diagonal accent, photo right' },
];

const CARD_W = 1013;
const CARD_H = 638;
const PREVIEW_SCALE = 0.38;
const INK = '#0F172A';
const INK_SOFT = '#64748B';

// Exact proportions from the design spec, translated to this canvas.
const SPEC = {
  classic: { headerH: Math.round(CARD_H * 0.18), bodyH: Math.round(CARD_H * 0.67), footerH: Math.round(CARD_H * 0.15), photoPct: 0.30, outerPad: 22, photoGap: 20, rowGap: 16, nameFont: 36, roleFont: 20, labelFont: 11, valueFont: 17, orgFont: 28, tagFont: 12 },
  executive: { headerH: Math.round(CARD_H * 0.20), bodyH: Math.round(CARD_H * 0.55), footerH: Math.round(CARD_H * 0.25), photoPct: 0.26, outerPad: 28, photoNameGap: 20, nameTitleGap: 10, rowGap: 18, nameFont: 40, roleFont: 22, labelFont: 12, valueFont: 18, orgFont: 34 },
  split: { outerPad: 20, panelPad: 18, rowGap: 16, nameFont: 38, roleFont: 21, labelFont: 11, valueFont: 18, panelPct: 0.38 },
  qrPct: 0.15,       // QR/barcode box — always 15% of card width
  logoMaxPct: 0.18,  // logo never bigger than 18% of card width
};

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}/${months[parseInt(m, 10) - 1]}/${y}`;
}

function drawHeading(ctx, text, x, y, maxWidth, font, lineHeight, align = 'left') {
  ctx.font = font;
  ctx.textAlign = align;
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === 1) continue;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const finalLines = lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
  finalLines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return finalLines.length * lineHeight;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateCardId(industryId) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CNV-${industryId.slice(0, 3).toUpperCase()}-${rand}`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const nr = Math.round((t - r) * p) + r;
  const ng = Math.round((t - g) * p) + g;
  const nb = Math.round((t - b) * p) + b;
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function extractDominantColor(img) {
  try {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const counts = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      if (r > 235 && g > 235 && b > 235) continue;
      if (r < 15 && g < 15 && b < 15) continue;
      const key = `${Math.round(r / 20) * 20},${Math.round(g / 20) * 20},${Math.round(b / 20) * 20}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    let best = null, bestCount = 0;
    for (const k in counts) {
      if (counts[k] > bestCount) { bestCount = counts[k]; best = k; }
    }
    if (!best) return null;
    const [r, g, b] = best.split(',').map((v) => Math.min(255, Number(v)));
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

// ---------- Subtle premium background (whitespace-first, not pattern-first) ----------
function drawMeshCorner(ctx, w, h, color) {
  ctx.save();
  const grad = ctx.createRadialGradient(w * 0.92, h * 0.08, 0, w * 0.92, h * 0.08, w * 0.55);
  const { r, g, b } = hexToRgb(color);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.07)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawDotGrid(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = color;
  for (let gy = y; gy < y + h; gy += 16) {
    for (let gx = x; gx < x + w; gx += 16) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGuilloche(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    for (let px = x; px <= x + w; px += 6) {
      const py = y + h / 2 + Math.sin((px + i) * 0.02) * (h / 2.4) * Math.cos(i * 0.01);
      if (px === x) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWatermarkTiles(ctx, x, y, w, h, text, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = color;
  ctx.font = '700 18px Arial, sans-serif';
  for (let py = y - 20; py < y + h + 20; py += 54) {
    for (let px = x - 40; px < x + w + 40; px += 200) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-Math.PI / 10);
      ctx.fillText(text || 'VERIFIED', 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawGhostPhoto(ctx, photoImg, x, y, w, h) {
  if (!photoImg) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = 0.05;
  const size = h * 0.95;
  const ratio = Math.max(size / photoImg.width, size / photoImg.height);
  const iw = photoImg.width * ratio, ih = photoImg.height * ratio;
  ctx.drawImage(photoImg, x + w - iw + 40, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, seed, color) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const barW = 1.5 + rand() * 4;
    if (rand() > 0.45) ctx.fillRect(cx, y, barW, h);
    cx += barW + 1.5;
  }
  ctx.restore();
}

function drawSecurityPattern(ctx, x, y, size, seed, color) {
  const rand = seededRandom(seed + 'pattern');
  const cells = 12;
  const cellSize = size / cells;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if (rand() > 0.55) ctx.fillRect(x + i * cellSize, y + j * cellSize, cellSize - 1, cellSize - 1);
    }
  }
  [[0, 0], [cells - 3, 0], [0, cells - 3]].forEach(([fi, fj]) => {
    ctx.fillRect(x + fi * cellSize, y + fj * cellSize, cellSize * 3, cellSize * 3);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(x + (fi + 0.6) * cellSize, y + (fj + 0.6) * cellSize, cellSize * 1.8, cellSize * 1.8);
    ctx.restore();
    ctx.fillRect(x + (fi + 1.1) * cellSize, y + (fj + 1.1) * cellSize, cellSize * 0.8, cellSize * 0.8);
  });
  ctx.restore();
}

// ---------- Simple vector icons drawn in white, used inside colored chip squares ----------
function drawIconGlyph(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = s * 0.09;
  if (type === 'person') {
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.18, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.42, s * 0.34, Math.PI, 0);
    ctx.fill();
  } else if (type === 'building') {
    drawRoundedRect(ctx, cx - s * 0.28, cy - s * 0.32, s * 0.56, s * 0.64, s * 0.06);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const wsize = s * 0.1;
    [[-0.14, -0.16], [0.06, -0.16], [-0.14, 0.04], [0.06, 0.04]].forEach(([ox, oy]) => {
      ctx.fillRect(cx + ox * s, cy + oy * s, wsize, wsize);
    });
  } else if (type === 'calendar') {
    drawRoundedRect(ctx, cx - s * 0.3, cy - s * 0.26, s * 0.6, s * 0.54, s * 0.06);
    ctx.fill();
    ctx.fillStyle = shade('#000000', -0.4);
    ctx.fillRect(cx - s * 0.3, cy - s * 0.26, s * 0.6, s * 0.16);
  } else if (type === 'drop') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.38);
    ctx.quadraticCurveTo(cx + s * 0.32, cy + s * 0.05, cx, cy + s * 0.38);
    ctx.quadraticCurveTo(cx - s * 0.32, cy + s * 0.05, cx, cy - s * 0.38);
    ctx.fill();
  }
  ctx.restore();
}

function drawIconChip(ctx, { x, y, w, icon, label, value, accent, size = 40, labelFont = 13, valueFont = 22 }) {
  drawRoundedRect(ctx, x, y, size, size, 9);
  ctx.fillStyle = accent;
  ctx.fill();
  drawIconGlyph(ctx, icon, x + size / 2, y + size / 2, size);

  const textX = x + size + 14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${labelFont}px Arial, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText(label.toUpperCase(), textX, y);
  ctx.font = `700 ${valueFont}px Arial, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText(value, textX, y + labelFont + 6);
}

function buildInfoRows(form, toggles, industry) {
  const rows = [
    { label: industry.idLabel, value: form.idNumber || '—', icon: industry.idIcon },
    { label: industry.secondaryLabel, value: form.secondaryValue || '—', icon: industry.secondaryIcon },
  ];
  if (toggles.validUntil) rows.push({ label: 'Valid Until', value: formatDate(form.validUntil) || '—', icon: 'calendar' });
  if (toggles.bloodGroup) rows.push({ label: 'Blood Group', value: form.bloodGroup || '—', icon: 'drop' });
  return rows;
}

// A small wax-seal-style badge — the one premium flourish, used sparingly (Executive only)
function drawSeal(ctx, cx, cy, r, color, initial) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '700 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, cx, cy - 2);
  ctx.font = '600 8px Arial, sans-serif';
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * (r - 16), cy + Math.sin(angle) * (r - 16));
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText('•', 0, 0);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

function drawPhotoBox(ctx, x, y, size, photoImg, accent, circle) {
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, x, y, size, size, 14);
  }
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();
  ctx.restore();

  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, x, y, size, size, 14);
  }
  ctx.clip();
  if (photoImg) {
    const ratio = Math.max(size / photoImg.width, size / photoImg.height);
    const w = photoImg.width * ratio, h = photoImg.height * ratio;
    ctx.drawImage(photoImg, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    ctx.fillStyle = INK_SOFT;
    ctx.font = '400 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, x, y, size, size, 14);
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();
}

function drawBackgroundEffects(ctx, x, y, w, h, colors, form, toggles, photoImg) {
  drawMeshCorner(ctx, CARD_W, CARD_H, colors.primary);
  if (toggles.guilloche) drawGuilloche(ctx, x, y, w, h, colors.primary);
  if (toggles.watermark) drawWatermarkTiles(ctx, x, y, w, h, form.orgName, colors.primary);
  if (toggles.ghostPhoto) drawGhostPhoto(ctx, photoImg, x, y, w, h);
}

function drawFooter(ctx, { toggles, cardId, accent, x1 = 44, customCodeImg }) {
  if (toggles.signatureStrip) {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, CARD_H - 66);
    ctx.lineTo(x1 + 220, CARD_H - 66);
    ctx.stroke();
    ctx.font = '600 15px Arial, sans-serif';
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'left';
    ctx.fillText('AUTHORIZED SIGNATURE', x1, CARD_H - 50);
  }
  if (toggles.cardSerial) {
    ctx.font = '600 17px Arial, sans-serif';
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'left';
    ctx.fillText(cardId, x1, CARD_H - 26);
  }

  if (customCodeImg) {
    const size = Math.round(CARD_W * SPEC.qrPct);
    const cx = CARD_W - size - 40, cy = CARD_H - size - 22;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,0.12)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cx - 6, cy - 6, size + 12, size + 12, 10);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(customCodeImg, cx, cy, size, size);
  } else if (toggles.barcode) {
    drawBarcode(ctx, CARD_W - 250, CARD_H - 64, 200, 34, cardId, INK);
  }
  if (!customCodeImg && toggles.securityPattern) {
    drawSecurityPattern(ctx, CARD_W - 120, CARD_H - 176, 80, cardId, INK);
  }
}

function drawFrontClassic(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry } = ctxData;
  const s = SPEC.classic;
  const pad = s.outerPad;

  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, 0, CARD_W, 8);

  drawBackgroundEffects(ctx, 0, 8, CARD_W, CARD_H - 8, colors, form, toggles, photoImg);

  // ---- HEADER (18% of height) ----
  let headerX = pad;
  const logoMax = CARD_W * SPEC.logoMaxPct;
  if (logoImg) {
    const logoSize = Math.min(logoMax, s.headerH - pad);
    const logoY = (s.headerH - logoSize) / 2;
    drawRoundedRect(ctx, headerX, logoY, logoSize, logoSize, 10);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(headerX, logoY, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, logoY + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 18;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = `700 ${s.orgFont}px Arial, sans-serif`;
  ctx.fillText(form.orgName || 'Your Organization', headerX, s.headerH / 2 - s.orgFont / 2 - 6);
  ctx.font = `400 ${s.tagFont}px Arial, sans-serif`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerX, s.headerH / 2 + s.orgFont / 2 - 8);

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, s.headerH);
  ctx.lineTo(CARD_W - pad, s.headerH);
  ctx.stroke();

  // ---- BODY (67% of height): photo column 35% width, details 65% ----
  const bodyTop = s.headerH;
  const photoColW = CARD_W * 0.35;
  const photoSize = CARD_W * s.photoPct;
  const photoX = pad, photoY = bodyTop + s.photoGap + 6;
  drawPhotoBox(ctx, photoX, photoY, photoSize, photoImg, colors.primary, false);

  const infoX = pad + photoColW + s.photoGap;
  const infoMaxW = CARD_W - infoX - pad;
  ctx.fillStyle = INK;
  const nameH = drawHeading(ctx, form.fullName || 'Full Name', infoX, photoY - 4, infoMaxW, `700 ${s.nameFont}px Arial, sans-serif`, s.nameFont + 6, 'left');
  let cursorY = photoY - 4 + nameH + 10;

  ctx.font = `600 ${s.roleFont}px Arial, sans-serif`;
  ctx.fillStyle = colors.primary;
  ctx.textAlign = 'left';
  ctx.fillText(form.role || 'Title / Role', infoX, cursorY);
  cursorY += s.roleFont + 16;

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(infoX, cursorY);
  ctx.lineTo(infoX + 70, cursorY);
  ctx.stroke();
  cursorY += s.rowGap + 10;

  const rows = buildInfoRows(form, toggles, industry);
  const bodyBottom = CARD_H - s.footerH;
  const availableForRows = bodyBottom - cursorY - 10;
  const rowStep = rows.length > 0 ? Math.max(52, availableForRows / rows.length) : 52;
  rows.forEach((row) => {
    drawIconChip(ctx, { x: infoX, y: cursorY, icon: row.icon, label: row.label, value: row.value, accent: colors.primary, labelFont: s.labelFont, valueFont: s.valueFont });
    cursorY += rowStep;
  });

  // ---- FOOTER (15% of height) ----
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, bodyBottom);
  ctx.lineTo(CARD_W - pad, bodyBottom);
  ctx.stroke();

  drawFooter(ctx, { toggles, cardId, accent: colors.primary, customCodeImg: ctxData.customCodeImg, footerTop: bodyBottom, x1: pad });
}

function drawFrontExecutive(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry } = ctxData;
  const s = SPEC.executive;

  const bannerH = s.headerH;
  const bannerGrad = ctx.createLinearGradient(0, 0, CARD_W, bannerH);
  bannerGrad.addColorStop(0, shade(colors.primary, -0.1));
  bannerGrad.addColorStop(1, shade(colors.primary, 0.05));
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, CARD_W, bannerH);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, bannerH, CARD_W, 4);

  drawBackgroundEffects(ctx, 0, bannerH + 4, CARD_W, CARD_H - bannerH - 4, colors, form, toggles, photoImg);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let headerX = s.outerPad;
  const logoMax = CARD_W * SPEC.logoMaxPct;
  if (logoImg) {
    const logoSize = Math.min(logoMax, bannerH - 30);
    const logoY = (bannerH - logoSize) / 2;
    drawRoundedRect(ctx, headerX, logoY, logoSize, logoSize, 10);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(headerX, logoY, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, logoY + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 16;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${s.orgFont}px Arial, sans-serif`;
  ctx.fillText(form.orgName || 'Your Organization', headerX, bannerH / 2 - 12);
  ctx.font = '400 16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerX, bannerH / 2 + 16);

  ctx.textAlign = 'right';
  ctx.font = '700 14px Arial, sans-serif';
  ctx.fillStyle = colors.accent;
  ctx.fillText(industry.label.toUpperCase(), CARD_W - s.outerPad, bannerH / 2);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const bx = CARD_W / 2;
  const photoSize = CARD_W * s.photoPct;
  const photoY = bannerH - photoSize / 2 - 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, photoY + photoSize / 2, photoSize / 2 + 8, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(15,23,42,0.25)';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.restore();
  drawPhotoBox(ctx, bx - photoSize / 2, photoY, photoSize, photoImg, colors.accent, true);

  // photo → name gap (20px), name → title gap (10px) — per spec
  let ty = photoY + photoSize + s.photoNameGap;
  ctx.fillStyle = INK;
  const nameH = drawHeading(ctx, form.fullName || 'Full Name', bx, ty, CARD_W - s.outerPad * 2 - 40, `700 ${s.nameFont}px Arial, sans-serif`, s.nameFont + 4, 'center');
  ty += nameH + s.nameTitleGap;
  ctx.font = `600 ${s.roleFont}px Arial, sans-serif`;
  ctx.fillStyle = colors.primary;
  ctx.textAlign = 'center';
  ctx.fillText(form.role || 'Title / Role', bx, ty);
  ty += s.roleFont + 16;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 36, ty);
  ctx.lineTo(bx + 36, ty);
  ctx.stroke();
  ty += s.rowGap + 14;
  // (tagline already shown in the banner — not repeated here)

  const rows = buildInfoRows(form, toggles, industry);
  const colW = (CARD_W - s.outerPad * 2) / rows.length;
  rows.forEach((row, i) => {
    const colX = s.outerPad + colW * i;
    if (i > 0) {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX, ty);
      ctx.lineTo(colX, ty + 48);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    const cx = colX + colW / 2;
    ctx.font = `700 ${s.labelFont}px Arial, sans-serif`;
    ctx.fillStyle = colors.primary;
    ctx.fillText(row.label.toUpperCase(), cx, ty);
    ctx.font = `700 ${s.valueFont + 8}px Arial, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(row.value, cx, ty + s.labelFont + 8);
  });

  if (toggles.signatureStrip) {
    drawSeal(ctx, 90, CARD_H - 74, 46, colors.primary, (form.orgName || 'C').trim().charAt(0).toUpperCase());
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, { toggles, cardId, accent: colors.primary, x1: toggles.signatureStrip ? 156 : 44, customCodeImg: ctxData.customCodeImg });
}

function drawFrontSplit(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry } = ctxData;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(CARD_W * 0.66, 0);
  ctx.lineTo(CARD_W, 0);
  ctx.lineTo(CARD_W, CARD_H);
  ctx.lineTo(CARD_W * 0.54, CARD_H);
  ctx.closePath();
  ctx.fillStyle = colors.primary;
  ctx.fill();
  ctx.clip();
  drawDotGrid(ctx, CARD_W * 0.54, 0, CARD_W * 0.46, CARD_H, '#FFFFFF');
  ctx.restore();

  drawBackgroundEffects(ctx, 0, 0, CARD_W * 0.66, CARD_H, colors, form, toggles, null);

  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, 8);

  let headerX = SPEC.split.outerPad + 24;
  const logoMax = CARD_W * SPEC.logoMaxPct;
  if (logoImg) {
    const logoSize = Math.min(logoMax, 56);
    drawRoundedRect(ctx, headerX, 34, logoSize, logoSize, 10);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(headerX, 34, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, 34 + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 16;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText(form.orgName || 'Your Organization', headerX, 34);
  ctx.font = '400 16px Arial, sans-serif';
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerX, 70);

  const photoSize = 208;
  const photoX = CARD_W - photoSize - 56, photoY = 132;
  drawPhotoBox(ctx, photoX, photoY, photoSize, photoImg, '#FFFFFF', false);

  const s = SPEC.split;
  const infoX = s.outerPad + 24;
  const infoMaxW = photoX - infoX - 30;
  ctx.fillStyle = INK;
  const nameH = drawHeading(ctx, form.fullName || 'Full Name', infoX, 148, infoMaxW, `700 ${s.nameFont}px Arial, sans-serif`, s.nameFont + 4, 'left');
  let cursorY = 148 + nameH + 10;

  ctx.font = `600 ${s.roleFont}px Arial, sans-serif`;
  ctx.fillStyle = colors.primary;
  ctx.textAlign = 'left';
  ctx.fillText(form.role || 'Title / Role', infoX, cursorY);
  cursorY += s.roleFont + 16;

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(infoX, cursorY);
  ctx.lineTo(infoX + 70, cursorY);
  ctx.stroke();
  cursorY += s.rowGap + 10;

  const rows = buildInfoRows(form, toggles, industry);
  const footerTop = CARD_H - 130;
  const rowStep = rows.length > 0 ? Math.max(52, (footerTop - cursorY - 10) / rows.length) : 52;
  rows.forEach((row) => {
    drawIconChip(ctx, { x: infoX, y: cursorY, icon: row.icon, label: row.label, value: row.value, accent: colors.primary, labelFont: s.labelFont, valueFont: s.valueFont });
    cursorY += rowStep;
  });

  drawFooter(ctx, { toggles, cardId, accent: colors.primary, customCodeImg: ctxData.customCodeImg, x1: infoX });
}

function drawBack(ctx, ctxData) {
  const { colors, form, toggles, cardId, customCodeImg } = ctxData;
  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, 0, CARD_W, 10);
  drawMeshCorner(ctx, CARD_W, CARD_H, colors.primary);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('Contact & Information', 44, 42);

  ctx.font = '400 20px Arial, sans-serif';
  ctx.fillStyle = INK_SOFT;
  const lines = [
    form.address && `Address: ${form.address}`,
    form.phone && `Phone: ${form.phone}`,
    form.email && `Email: ${form.email}`,
    toggles.emergencyContact && form.emergencyContact && `Emergency Contact: ${form.emergencyContact}`,
  ].filter(Boolean);

  let y = 104;
  lines.forEach((line) => {
    ctx.fillText(line, 44, y);
    y += 36;
  });

  if (form.terms) {
    ctx.font = '400 16px Arial, sans-serif';
    ctx.fillStyle = INK_SOFT;
    wrapText(ctx, form.terms, 44, y + 14, CARD_W - 88, 25);
  }

  if (toggles.signatureStrip) {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(44, CARD_H - 88);
    ctx.lineTo(260, CARD_H - 88);
    ctx.stroke();
    ctx.font = '600 15px Arial, sans-serif';
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('HOLDER SIGNATURE', 44, CARD_H - 74);
  }

  if (customCodeImg) {
    const qrSize = Math.round(CARD_W * SPEC.qrPct);
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,0.12)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, 38, CARD_H - qrSize - 38, qrSize + 12, qrSize + 12, 10);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(customCodeImg, 44, CARD_H - qrSize - 32, qrSize, qrSize);
  } else if (toggles.barcode) {
    drawBarcode(ctx, 44, CARD_H - 52, 240, 32, cardId + 'b', INK);
  }
  if (toggles.cardSerial) {
    ctx.font = '600 16px Arial, sans-serif';
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = 'right';
    ctx.fillText(cardId, CARD_W - 44, CARD_H - 36);
    ctx.textAlign = 'left';
  }

  ctx.font = '400 17px Arial, sans-serif';
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = 'center';
  ctx.fillText('If found, please return to the organization above.', CARD_W / 2, CARD_H - 26);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}

function drawCard(canvas, { side, layout, colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry }) {
  const ctx = canvas.getContext('2d');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 30);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const ctxData = { colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry };

  if (side === 'front') {
    if (layout === 'executive') drawFrontExecutive(ctx, ctxData);
    else if (layout === 'split') drawFrontSplit(ctx, ctxData);
    else drawFrontClassic(ctx, ctxData);
  } else {
    drawBack(ctx, ctxData);
  }

  ctx.restore();

  // Thin outer border for a crisp print edge
  ctx.save();
  drawRoundedRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, 29);
  ctx.strokeStyle = 'rgba(15,23,42,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

const emptyForm = {
  orgName: '', orgTagline: '', fullName: '', role: '', idNumber: '', secondaryValue: '',
  validUntil: '', bloodGroup: '', address: '', phone: '', email: '', emergencyContact: '',
  terms: 'This card remains the property of the issuing organization and must be surrendered upon request.',
};

export default function IdCardGeneratorWorkspace() {
  const [step, setStep] = useState('industry');
  const [industryId, setIndustryId] = useState(null);
  const [layout, setLayout] = useState('classic');
  const [form, setForm] = useState(emptyForm);
  const [primaryColor, setPrimaryColor] = useState('#1E3A8A');
  const [accentColor, setAccentColor] = useState('#FBBF24');
  const [toggles, setToggles] = useState({
    validUntil: false, bloodGroup: false, signatureStrip: false, emergencyContact: true,
    guilloche: false, watermark: false, ghostPhoto: false, barcode: true, securityPattern: false, cardSerial: true,
  });
  const [side, setSide] = useState('front');
  const [photoImg, setPhotoImg] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [customCodeImg, setCustomCodeImg] = useState(null);
  const [cardId, setCardId] = useState('');
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);

  const industry = useMemo(() => INDUSTRIES.find((i) => i.id === industryId), [industryId]);

  function chooseIndustry(ind) {
    setIndustryId(ind.id);
    setPrimaryColor(ind.color);
    setToggles((t) => {
      const next = { ...t };
      ind.fieldsOn.forEach((k) => { next[k] = true; });
      return next;
    });
    setCardId(generateCardId(ind.id));
    setStep('design');
  }

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function toggle(key) {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => setPhotoImg(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setLogoImg(img);
        const dominant = extractDominantColor(img);
        if (dominant) setPrimaryColor(dominant);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleCustomCode(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => setCustomCodeImg(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const colors = { primary: primaryColor, accent: accentColor };

  const render = useCallback(() => {
    if (!industry) return;
    if (frontCanvasRef.current) {
      drawCard(frontCanvasRef.current, { side: 'front', layout, colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry });
    }
    if (backCanvasRef.current) {
      drawCard(backCanvasRef.current, { side: 'back', layout, colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry });
    }
  }, [industry, layout, colors.primary, colors.accent, logoImg, photoImg, customCodeImg, form, toggles, cardId]);

  useEffect(() => { render(); }, [render]);

  function download(canvasRef, filename) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function downloadBoth() {
    const base = (form.fullName || 'id-card').replace(/\s+/g, '-').toLowerCase();
    download(frontCanvasRef, `${base}-front.png`);
    setTimeout(() => download(backCanvasRef, `${base}-back.png`), 300);
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const fieldWrap = { marginBottom: 12 };
  const checkRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.85rem', color: '#334155' };

  if (step === 'industry') {
    return (
      <div className="panel">
        <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
          Choose the type of ID card you're creating
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              onClick={() => chooseIndustry(ind)}
              style={{ padding: '20px 12px', borderRadius: 14, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: '2rem' }}>{ind.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B' }}>{ind.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <button onClick={() => setStep('industry')} style={{ background: 'none', border: 'none', color: '#3A63B8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        ← Change card type ({industry.icon} {industry.label})
      </button>

      <div style={fieldWrap}>
        <label style={labelStyle}>Layout</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              title={l.note}
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                border: layout === l.id ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                background: layout === l.id ? '#EFF6FF' : 'white', color: '#1E293B',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 32 }}>
        {/* FORM SIDE */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Primary Brand Color</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer' }} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Accent Color</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Company / Org Logo</label>
              <input type="file" accept="image/*" onChange={handleLogo} style={inputStyle} />
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>Brand color auto-fills from your logo — override above if needed.</p>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Photo (person)</label>
              <input type="file" accept="image/*" onChange={handlePhoto} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Organization Name</label>
              <input style={inputStyle} value={form.orgName} onChange={(e) => update('orgName', e.target.value)} placeholder="Acme Corp" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Tagline (optional)</label>
              <input style={inputStyle} value={form.orgTagline} onChange={(e) => update('orgTagline', e.target.value)} placeholder={`${industry.label} ID Card`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Title / Role</label>
              <input style={inputStyle} value={form.role} onChange={(e) => update('role', e.target.value)} placeholder="Software Engineer" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>{industry.idLabel}</label>
              <input style={inputStyle} value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} placeholder="00123" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>{industry.secondaryLabel}</label>
              <input style={inputStyle} value={form.secondaryValue} onChange={(e) => update('secondaryValue', e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Optional Fields</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <label style={checkRow}><input type="checkbox" checked={toggles.validUntil} onChange={() => toggle('validUntil')} /> Expiry date</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.bloodGroup} onChange={() => toggle('bloodGroup')} /> Blood group</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.signatureStrip} onChange={() => toggle('signatureStrip')} /> Signature{layout === 'executive' ? ' seal' : ' strip'}</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.emergencyContact} onChange={() => toggle('emergencyContact')} /> Emergency contact (back)</label>
          </div>

          {toggles.validUntil && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Valid Until</label>
              <input type="date" style={inputStyle} value={form.validUntil} onChange={(e) => update('validUntil', e.target.value)} />
            </div>
          )}
          {toggles.bloodGroup && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Blood Group</label>
              <input style={inputStyle} value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} placeholder="O+" />
            </div>
          )}

          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Security & Authenticity Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <label style={checkRow}><input type="checkbox" checked={toggles.guilloche} onChange={() => toggle('guilloche')} /> Faint guilloche line</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.watermark} onChange={() => toggle('watermark')} /> Watermark tiling</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.ghostPhoto} onChange={() => toggle('ghostPhoto')} /> Ghost photo</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.barcode} onChange={() => toggle('barcode')} disabled={!!customCodeImg} /> Barcode strip</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.securityPattern} onChange={() => toggle('securityPattern')} disabled={!!customCodeImg} /> Verification pattern</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.cardSerial} onChange={() => toggle('cardSerial')} /> Unique card serial</label>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>
            Kept subtle by design — premium cards use restraint, not busy patterns. These are visual only, not a scannable/verifiable code.
          </p>

          <div style={fieldWrap}>
            <label style={labelStyle}>Your own QR code or barcode image (optional)</label>
            <input type="file" accept="image/*" onChange={handleCustomCode} style={inputStyle} />
            <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>
              {customCodeImg
                ? 'Using your uploaded code — it replaces the generated barcode/pattern above.'
                : "Upload a QR code you've already generated elsewhere and it'll be placed on the card, fully scannable."}
            </p>
          </div>

          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Back of Card</p>
          <div style={fieldWrap}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main Street, Lagos" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+234..." />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="jane@company.com" />
            </div>
          </div>
          {toggles.emergencyContact && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Emergency Contact</label>
              <input style={inputStyle} value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} placeholder="Name — Phone" />
            </div>
          )}
          <div style={fieldWrap}>
            <label style={labelStyle}>Terms / Return Note</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.terms} onChange={(e) => update('terms', e.target.value)} />
          </div>
        </div>

        {/* PREVIEW SIDE */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setSide('front')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: side === 'front' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: side === 'front' ? '#EFF6FF' : 'white', color: '#1E293B' }}>Front</button>
            <button onClick={() => setSide('back')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: side === 'back' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: side === 'back' ? '#EFF6FF' : 'white', color: '#1E293B' }}>Back</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: '#F8FAFC', borderRadius: 16 }}>
            <div style={{ width: CARD_W * PREVIEW_SCALE, height: CARD_H * PREVIEW_SCALE, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden' }}>
              <canvas ref={frontCanvasRef} style={{ width: '100%', height: '100%', display: side === 'front' ? 'block' : 'none' }} />
              <canvas ref={backCanvasRef} style={{ width: '100%', height: '100%', display: side === 'back' ? 'block' : 'none' }} />
            </div>
          </div>

          <button onClick={downloadBoth} style={{ width: '100%', marginTop: 16, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
            ⬇ Download Front & Back (PNG)
          </button>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
            Print resolution — 1013×638px (CR80 card size, ~300dpi)
          </p>
        </div>
      </div>
    </div>
  );
}
