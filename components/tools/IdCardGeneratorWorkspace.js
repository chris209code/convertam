'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const INDUSTRIES = [
  { id: 'corporate', label: 'Corporate', icon: '🏢', color: '#0F1F3D', accent: '#D9A62E', idLabel: 'Employee No.', secondaryLabel: 'Department', fieldsOn: [] },
  { id: 'school', label: 'School', icon: '🏫', color: '#0F1F3D', accent: '#D9A62E', idLabel: 'Admission No.', secondaryLabel: 'Class', fieldsOn: [] },
  { id: 'church', label: 'Church', icon: '⛪', color: '#3B2A5E', accent: '#C9A24B', idLabel: 'Member No.', secondaryLabel: 'Ministry / Unit', fieldsOn: [] },
  { id: 'hospital', label: 'Hospital', icon: '🏥', color: '#7A1F2B', accent: '#D9A62E', idLabel: 'Staff No.', secondaryLabel: 'Ward / Department', fieldsOn: ['bloodGroup'] },
  { id: 'event', label: 'Event Pass', icon: '🎉', color: '#0F1F3D', accent: '#D97706', idLabel: 'Pass No.', secondaryLabel: 'Access Level', fieldsOn: ['validUntil'] },
  { id: 'security', label: 'Security', icon: '🛡️', color: '#111827', accent: '#9CA3AF', idLabel: 'Badge No.', secondaryLabel: 'Post / Unit', fieldsOn: [] },
  { id: 'construction', label: 'Construction', icon: '👷', color: '#3B2A0E', accent: '#D9A62E', idLabel: 'Worker No.', secondaryLabel: 'Site / Team', fieldsOn: ['bloodGroup'] },
  { id: 'university', label: 'University', icon: '🎓', color: '#0F1F3D', accent: '#1F8A7A', idLabel: 'Matric No.', secondaryLabel: 'Faculty / Dept.', fieldsOn: [] },
];

const LAYOUTS = [
  { id: 'classic', label: 'Heritage', note: 'Photo left, details right' },
  { id: 'executive', label: 'Prestige', note: 'Full dark panel, centered photo, seal' },
  { id: 'split', label: 'Edge', note: 'Diagonal panel, photo right' },
];

// Exact 420×560 reference from the Claude Design handoff, scaled 2x for crisp export.
const SCALE = 2;
const CARD_W = 420 * SCALE;
const CARD_H = 560 * SCALE;
const PREVIEW_SCALE = 0.62;
const px = (n) => n * SCALE;

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}/${months[parseInt(m, 10) - 1]}/${y}`;
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn: h = 60 * (((gn - bn) / d) % 6); break;
      case gn: h = 60 * ((bn - rn) / d + 2); break;
      case bn: h = 60 * ((rn - gn) / d + 4); break;
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
// Never let a raw brand hex flood a large area: keep only its hue, clamp
// saturation into a sane band, and fix lightness per role — same recipe
// used for accessible design-token systems. Neon input → muted, legible output.
const ROLE_RECIPE = {
  surface: { minS: 30, maxS: 55, l: 14 }, // large fills — Prestige bg, Edge diagonal panel
  accent: { minS: 45, maxS: 75, l: 42 },  // top bar, seal, underline, field labels
};
function deriveRole(hex, role) {
  const { h, s } = hexToHsl(hex);
  const r = ROLE_RECIPE[role];
  const safeS = Math.min(r.maxS, Math.max(r.minS, s));
  return hslToHex(h, safeS, r.l);
}
const INK = '#0F1F3D'; // fixed neutral ink — not brand-derived, matches the approved token

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  return `rgb(${Math.round((t - r) * p) + r}, ${Math.round((t - g) * p) + g}, ${Math.round((t - b) * p) + b})`;
}
// Auto text-on-background contrast — required since brand color is variable per company.
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
function textOn(bgHex) {
  return isLight(bgHex) ? '#0F1F3D' : '#FFFFFF';
}
function subtextOn(bgHex) {
  return isLight(bgHex) ? '#5A6472' : '#B9C2D0';
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
    for (const k in counts) if (counts[k] > bestCount) { bestCount = counts[k]; best = k; }
    if (!best) return null;
    const [r, g, b] = best.split(',').map((v) => Math.min(255, Number(v)));
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

// Wraps text to fit maxWidth. Every line is always measured and guaranteed
// to fit — if a name genuinely needs more than "maxLines" to fit, it gets
// more lines (callers push subsequent content down dynamically) rather than
// silently merging overflow words past the edge of the card.
function wrapCapped(ctx, text, x, y, maxWidth, lineHeight, maxLines, align = 'left') {
  ctx.textAlign = align;
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return lines.length * lineHeight;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'left') {
  ctx.textAlign = align;
  const words = (text || '').split(' ');
  let line = '';
  let curY = y;
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, x, curY + i * lineHeight));
  return lines.length * lineHeight;
}

// Diagonal-stripe placeholder — matches the reference's om-photo-stripes / om-qr-stripes look
function drawStripes(ctx, x, y, w, h, kind, darkColor) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, kind === 'photo' ? px(6) : px(3));
  ctx.clip();
  ctx.fillStyle = kind === 'qr' ? '#FFFFFF' : 'rgba(15,31,61,0.04)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = kind === 'qr' ? darkColor : 'rgba(15,31,61,0.10)';
  ctx.lineWidth = kind === 'qr' ? px(2) : px(4);
  const gap = kind === 'qr' ? px(4) : px(8);
  for (let i = -h; i < w + h; i += gap) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();
  if (kind === 'photo') {
    ctx.font = `400 ${px(11)}px ui-monospace, monospace`;
    ctx.fillStyle = darkColor;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('photo', x + w / 2, y + h / 2);
    ctx.globalAlpha = 1;
  }
}

function drawHexLogo(ctx, x, y, size, colorA, colorB, letter) {
  const r = size / 2;
  const cx = x + r, cy = y + r;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const px_ = cx + r * Math.cos(angle);
    const py_ = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px_, py_);
    else ctx.lineTo(px_, py_);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${size * 0.45}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, cx, cy + size * 0.02);
  ctx.restore();
}

function drawLogoOrPlaceholder(ctx, x, y, size, logoImg, colors, orgName) {
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    const r = size / 2, cx = x + r, cy = y + r;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 90);
      const px_ = cx + r * Math.cos(angle);
      const py_ = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px_, py_);
      else ctx.lineTo(px_, py_);
    }
    ctx.closePath();
    ctx.clip();
    const ratio = Math.max(size / logoImg.width, size / logoImg.height);
    const w = logoImg.width * ratio, h = logoImg.height * ratio;
    ctx.drawImage(logoImg, x + (size - w) / 2, y + (size - h) / 2, w, h);
    ctx.restore();
  } else {
    drawHexLogo(ctx, x, y, size, colors.primary, colors.accent, (orgName || 'C').trim().charAt(0).toUpperCase());
  }
}

function drawPhotoOrPlaceholder(ctx, x, y, w, h, photoImg, borderColor, radius, darkColor, bgColor, adjust) {
  const zoom = adjust?.zoom ?? 1;
  const panX = adjust?.panX ?? 0; // -50..50, percent of available shift
  const panY = adjust?.panY ?? 0;
  if (photoImg) {
    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.clip();
    if (bgColor) { ctx.fillStyle = bgColor; ctx.fillRect(x, y, w, h); }
    const ratio = Math.max(w / photoImg.width, h / photoImg.height) * zoom;
    const iw = photoImg.width * ratio, ih = photoImg.height * ratio;
    const maxShiftX = Math.max(0, (iw - w) / 2);
    const maxShiftY = Math.max(0, (ih - h) / 2);
    const drawX = x + (w - iw) / 2 + (panX / 50) * maxShiftX;
    const drawY = y + (h - ih) / 2 + (panY / 50) * maxShiftY;
    ctx.drawImage(photoImg, drawX, drawY, iw, ih);
    ctx.restore();
  } else {
    if (bgColor) {
      ctx.save();
      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.restore();
    }
    drawStripes(ctx, x, y, w, h, 'photo', darkColor);
  }
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.lineWidth = px(3);
  ctx.strokeStyle = borderColor;
  ctx.stroke();
  ctx.restore();
}

function drawCodeBox(ctx, x, y, size, customCodeImg, darkColor) {
  if (customCodeImg) {
    ctx.save();
    drawRoundedRect(ctx, x, y, size, size, px(6));
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, size, size);
    ctx.drawImage(customCodeImg, x, y, size, size);
    ctx.restore();
  } else {
    drawStripes(ctx, x, y, size, size, 'qr', darkColor);
  }
}

function buildRows(form, toggles, industry) {
  const rows = [
    { label: industry.idLabel, value: form.idNumber || '—' },
    { label: industry.secondaryLabel, value: form.secondaryValue || '—' },
  ];
  if (toggles.validUntil) rows.push({ label: 'Valid Until', value: formatDate(form.validUntil) || '—' });
  if (toggles.bloodGroup) rows.push({ label: 'Blood Group', value: form.bloodGroup || '—' });
  return rows;
}

// ---------------- CLASSIC (Heritage) — exact translation of the reference HTML ----------------
function drawClassic(ctx, d) {
  const { colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry } = d;
  const bg = '#FDFCF8';
  const ink = colors.ink;
  const sub = '#5A6472';

  ctx.fillStyle = bg;
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.clip();

  // 6px gold top bar
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, px(6));

  // header: 44px hex logo + wordmark, padding 22/24/14 — org name wraps up to
  // 2 lines instead of being silently clipped when it's long
  const logoSize = px(44);
  drawLogoOrPlaceholder(ctx, px(24), px(22), logoSize, logoImg, colors, form.orgName);
  const headerTextX = px(24) + logoSize + px(12);
  const headerMaxW = CARD_W - headerTextX - px(24);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = ink;
  ctx.font = `800 ${px(22)}px Arial, sans-serif`;
  const orgTopY = px(22);
  const orgLineH = px(22) * 1.15;
  const orgH = wrapCapped(ctx, form.orgName || 'Your Organization', headerTextX, orgTopY, headerMaxW, orgLineH, 2, 'left');
  ctx.font = `400 ${px(12)}px Arial, sans-serif`;
  ctx.fillStyle = sub;
  const tagY = orgTopY + orgH + px(4);
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerTextX, tagY);

  // body: photo 140x170 rounded 12, border 3 gold; text column beside it
  const bodyTop = Math.max(px(22) + px(44) + px(14) + px(6), tagY + px(16) + px(26));
  const photoW = px(140), photoH = px(170);
  const photoX = px(24), photoY = bodyTop + px(6);
  drawPhotoOrPlaceholder(ctx, photoX, photoY, photoW, photoH, photoImg, colors.accent, px(12), ink, null, d.photoAdjust);

  const textX = photoX + photoW + px(18);
  const textMaxW = CARD_W - textX - px(24);
  ctx.fillStyle = ink;
  ctx.font = `800 ${px(24)}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  const nameLineH = px(24) * 1.1;
  const nameH = wrapText(ctx, (form.fullName || 'Full Name').toUpperCase(), textX, photoY + px(2), textMaxW, nameLineH, 'left');
  let cy = photoY + px(2) + nameH + px(8);

  ctx.font = `600 ${px(17)}px Arial, sans-serif`;
  ctx.fillStyle = '#3A4250';
  ctx.fillText(form.role || 'Title / Role', textX, cy);
  cy += px(17) + px(16) + px(8);

  const rows = buildRows(form, toggles, industry);
  rows.forEach((row) => {
    ctx.font = `700 ${px(12)}px Arial, sans-serif`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(row.label.toUpperCase(), textX, cy);
    cy += px(12) + px(4);
    ctx.font = `800 ${px(18)}px Arial, sans-serif`;
    ctx.fillStyle = ink;
    ctx.fillText(row.value, textX, cy);
    cy += px(18) + px(14);
  });

  // footer: unique code bottom-left, QR/code box bottom-right
  const footerY = CARD_H - px(20);
  const qrSize = px(64);
  ctx.font = `400 ${px(11)}px ui-monospace, monospace`;
  ctx.fillStyle = sub;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(cardId, px(24), footerY - px(4));
  drawCodeBox(ctx, CARD_W - px(24) - qrSize, footerY - qrSize + px(4), qrSize, customCodeImg, ink);

  ctx.restore();
}

// ---------------- EXECUTIVE (Prestige) — full dark panel, centered ----------------
function drawExecutive(ctx, d) {
  const { colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry } = d;
  const bg = colors.primary;
  const ink = textOn(bg);
  const sub = subtextOn(bg);

  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.clip();

  // header
  const logoSize = px(44);
  drawLogoOrPlaceholder(ctx, px(24), px(24), logoSize, logoImg, colors, form.orgName);
  const headerTextX = px(24) + logoSize + px(12);
  const headerMaxW = CARD_W - headerTextX - px(24);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = ink;
  ctx.font = `800 ${px(22)}px Arial, sans-serif`;
  const orgTopY = px(24);
  const orgLineH = px(22) * 1.15;
  const orgH = wrapCapped(ctx, form.orgName || 'Your Organization', headerTextX, orgTopY, headerMaxW, orgLineH, 2, 'left');
  ctx.font = `400 ${px(12)}px Arial, sans-serif`;
  ctx.fillStyle = sub;
  const tagY = orgTopY + orgH + px(4);
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerTextX, tagY);

  // gold gradient divider
  const dividerY = Math.max(px(24) + px(44) + px(18), tagY + px(16) + px(14));
  const divGrad = ctx.createLinearGradient(px(24), 0, CARD_W - px(24), 0);
  divGrad.addColorStop(0, 'rgba(0,0,0,0)');
  divGrad.addColorStop(0.5, colors.accent);
  divGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(px(24), dividerY, CARD_W - px(48), px(2));

  // centered circular photo
  const bx = CARD_W / 2;
  const photoD = px(140);
  const photoY = dividerY + px(20);
  drawPhotoOrPlaceholder(ctx, bx - photoD / 2, photoY, photoD, photoD, photoImg, colors.accent, photoD / 2, textOn('#FDFCF8'), '#FDFCF8', d.photoAdjust);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let cy = photoY + photoD + px(24) + px(26);
  ctx.fillStyle = ink;
  ctx.font = `800 ${px(26)}px Arial, sans-serif`;
  const nameLineH = px(26) * 1.1;
  const nameH = wrapCapped(ctx, (form.fullName || 'Full Name').toUpperCase(), bx, cy, CARD_W - px(64), nameLineH, 2, 'center');
  cy += nameH + px(8);
  ctx.font = `600 ${px(17)}px Arial, sans-serif`;
  ctx.fillStyle = sub;
  ctx.textBaseline = 'alphabetic';
  cy += px(14);
  ctx.fillText(form.role || 'Title / Role', bx, cy);

  // two/more-column stat block, vertical dividers
  const rows = buildRows(form, toggles, industry);
  const gap = px(28);
  ctx.font = `800 ${px(18)}px Arial, sans-serif`;
  const colWidths = rows.map((r) => Math.max(ctx.measureText(r.value).width, px(70)));
  const totalW = colWidths.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
  let colX = bx - totalW / 2;
  const statY = cy + px(22);
  rows.forEach((row, i) => {
    const w = colWidths[i];
    const ccx = colX + w / 2;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX - gap / 2, statY);
      ctx.lineTo(colX - gap / 2, statY + px(30));
      ctx.stroke();
    }
    ctx.font = `700 ${px(12)}px Arial, sans-serif`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(row.label.toUpperCase(), ccx, statY);
    ctx.font = `800 ${px(18)}px Arial, sans-serif`;
    ctx.fillStyle = ink;
    ctx.fillText(row.value, ccx, statY + px(24));
    colX += w + gap;
  });

  // gold seal — sits a full margin below the value text's descenders, never overlapping
  const rowBottomY = statY + px(24) + px(10);
  const sealR = px(39);
  const sealY = rowBottomY + px(24) + sealR;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, sealY, sealR, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(bx - sealR * 0.3, sealY - sealR * 0.35, sealR * 0.1, bx, sealY, sealR);
  sealGrad.addColorStop(0, shade(colors.accent, 0.35));
  sealGrad.addColorStop(0.55, colors.accent);
  sealGrad.addColorStop(1, shade(colors.accent, -0.25));
  ctx.fillStyle = sealGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = px(6);
  ctx.fill();
  ctx.lineWidth = px(3);
  ctx.strokeStyle = shade(colors.accent, 0.35);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, sealY, sealR - px(9), 0, Math.PI * 2);
  ctx.setLineDash([px(1), px(2)]);
  ctx.lineWidth = px(1.5);
  ctx.strokeStyle = 'rgba(15,31,61,0.5)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${px(26)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((form.orgName || 'C').trim().charAt(0).toUpperCase(), bx, sealY + px(1));
  ctx.restore();

  // footer: italic "Authorized Signature" + QR
  const footerY = CARD_H - px(22);
  const qrSize = px(60);
  ctx.textAlign = 'left';
  ctx.font = `italic 400 ${px(14)}px Arial, sans-serif`;
  ctx.fillStyle = sub;
  ctx.fillText('Authorized Signature', px(24), footerY - px(4));
  drawCodeBox(ctx, CARD_W - px(24) - qrSize, footerY - qrSize + px(4), qrSize, customCodeImg, ink);

  ctx.restore();
}

// ---------------- MODERN SPLIT (Edge) — diagonal panel, exact clip-path translated ----------------
function drawSplit(ctx, d) {
  const { colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry } = d;
  const leftW = CARD_W * 0.62;
  const rightInk = textOn(colors.primary);

  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.clip();

  // right diagonal panel: polygon(18% 0, 100% 0, 100% 100%, 0% 100%) of the right 38% block
  const panelX = leftW;
  const panelW = CARD_W - leftW;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(panelX + panelW * 0.18, 0);
  ctx.lineTo(CARD_W, 0);
  ctx.lineTo(CARD_W, CARD_H);
  ctx.lineTo(panelX, CARD_H);
  ctx.closePath();
  ctx.fillStyle = colors.primary;
  ctx.fill();
  ctx.restore();

  // left column content
  const padL = px(24);
  const logoSize = px(40);
  drawLogoOrPlaceholder(ctx, padL, px(24), logoSize, logoImg, colors, form.orgName);
  const headerTextX = padL + logoSize + px(12);
  const headerMaxW = leftW - headerTextX - px(16);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.ink;
  ctx.font = `800 ${px(20)}px Arial, sans-serif`;
  const orgTopY = px(24);
  const orgLineH = px(20) * 1.15;
  const orgH = wrapCapped(ctx, form.orgName || 'Your Organization', headerTextX, orgTopY, headerMaxW, orgLineH, 2, 'left');
  ctx.font = `400 ${px(11)}px Arial, sans-serif`;
  ctx.fillStyle = '#5A6472';
  const tagline = form.orgTagline || `${industry.label} ID Card`;
  const tagY = orgTopY + orgH + px(4);
  ctx.fillText(tagline, headerTextX, tagY);

  let cy = Math.max(px(24) + px(40) + px(26) + px(28), tagY + px(15) + px(40));
  ctx.fillStyle = colors.ink;
  ctx.font = `800 ${px(28)}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  const nameH = wrapText(ctx, (form.fullName || 'Full Name').toUpperCase(), padL, cy - px(28), leftW - padL - px(24), px(28) * 1.1, 'left');
  cy = cy - px(28) + nameH + px(6);

  ctx.font = `600 ${px(16)}px Arial, sans-serif`;
  ctx.fillStyle = '#3A4250';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(form.role || 'Title / Role', padL, cy + px(14));
  cy += px(14) + px(10);

  ctx.fillStyle = colors.accent;
  ctx.fillRect(padL, cy, px(44), px(3));
  cy += px(3) + px(26);

  const rows = buildRows(form, toggles, industry);
  ctx.textBaseline = 'alphabetic';
  rows.forEach((row) => {
    ctx.font = `700 ${px(12)}px Arial, sans-serif`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(row.label.toUpperCase(), padL, cy);
    cy += px(12) + px(4);
    ctx.font = `800 ${px(18)}px Arial, sans-serif`;
    ctx.fillStyle = colors.ink;
    ctx.fillText(row.value, padL, cy);
    cy += px(18) + px(14);
  });

  // unique code pinned near bottom of left column
  ctx.font = `400 ${px(11)}px ui-monospace, monospace`;
  ctx.fillStyle = '#8A93A0';
  ctx.fillText(cardId, padL, CARD_H - px(20));

  // right panel: photo near top-right, code box near bottom-right
  const photoW = px(130), photoH = px(150);
  const photoX = CARD_W - px(22) - photoW, photoY = px(36);
  drawPhotoOrPlaceholder(ctx, photoX, photoY, photoW, photoH, photoImg, colors.accent, px(12), rightInk, shade(colors.primary, 0.12), d.photoAdjust);

  const qrSize = px(66);
  const qrX = CARD_W - px(22) - qrSize, qrY = CARD_H - px(34) - qrSize;
  drawCodeBox(ctx, qrX, qrY, qrSize, customCodeImg, rightInk);

  ctx.restore();
}

function drawBack(ctx, d) {
  const { colors, form, toggles, cardId, customCodeImg } = d;
  const ink = colors.ink;
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.fillStyle = '#FDFCF8';
  ctx.fill();
  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, px(16));
  ctx.clip();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, px(6));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = ink;
  ctx.font = `800 ${px(20)}px Arial, sans-serif`;
  ctx.fillText('Contact & Information', px(24), px(28));

  ctx.font = `400 ${px(14)}px Arial, sans-serif`;
  ctx.fillStyle = '#5A6472';
  const lines = [
    form.address && `Address: ${form.address}`,
    form.phone && `Phone: ${form.phone}`,
    form.email && `Email: ${form.email}`,
    toggles.emergencyContact && form.emergencyContact && `Emergency: ${form.emergencyContact}`,
  ].filter(Boolean);
  let y = px(70);
  lines.forEach((line) => { ctx.fillText(line, px(24), y); y += px(26); });

  if (form.terms) {
    ctx.font = `400 ${px(12)}px Arial, sans-serif`;
    wrapText(ctx, form.terms, px(24), y + px(10), CARD_W - px(48), px(18), 'left');
  }

  if (toggles.signatureStrip) {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    ctx.moveTo(px(24), CARD_H - px(70));
    ctx.lineTo(px(180), CARD_H - px(70));
    ctx.stroke();
    ctx.font = `600 ${px(10)}px Arial, sans-serif`;
    ctx.fillStyle = '#5A6472';
    ctx.fillText('HOLDER SIGNATURE', px(24), CARD_H - px(58));
  }

  const qrSize = px(60);
  drawCodeBox(ctx, px(24), CARD_H - px(24) - qrSize, qrSize, customCodeImg, ink);
  ctx.font = `400 ${px(11)}px ui-monospace, monospace`;
  ctx.fillStyle = '#5A6472';
  ctx.textAlign = 'right';
  ctx.fillText(cardId, CARD_W - px(24), CARD_H - px(24));

  ctx.restore();
}

function drawCard(canvas, opts) {
  const ctx = canvas.getContext('2d');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  if (opts.side === 'back') {
    drawBack(ctx, opts);
  } else if (opts.layout === 'executive') {
    drawExecutive(ctx, opts);
  } else if (opts.layout === 'split') {
    drawSplit(ctx, opts);
  } else {
    drawClassic(ctx, opts);
  }
  ctx.save();
  drawRoundedRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, px(16) - 1);
  ctx.strokeStyle = 'rgba(15,31,61,0.10)';
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
  const [primaryColor, setPrimaryColor] = useState('#0F1F3D');
  const [accentColor, setAccentColor] = useState('#D9A62E');
  const [toggles, setToggles] = useState({
    validUntil: false, bloodGroup: false, signatureStrip: false, emergencyContact: true,
  });
  const [side, setSide] = useState('front');
  const [photoImg, setPhotoImg] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoPanX, setPhotoPanX] = useState(0);
  const [photoPanY, setPhotoPanY] = useState(0);
  const [logoImg, setLogoImg] = useState(null);
  const [customCodeImg, setCustomCodeImg] = useState(null);
  const [cardId, setCardId] = useState('');
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);

  const industry = useMemo(() => INDUSTRIES.find((i) => i.id === industryId), [industryId]);

  function chooseIndustry(ind) {
    setIndustryId(ind.id);
    setPrimaryColor(ind.color);
    setAccentColor(ind.accent);
    setToggles((t) => {
      const next = { ...t };
      ind.fieldsOn.forEach((k) => { next[k] = true; });
      return next;
    });
    setCardId(`CNV-${ind.id.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    setStep('design');
  }

  function update(key, val) { setForm((f) => ({ ...f, [key]: val })); }
  function toggle(key) { setToggles((t) => ({ ...t, [key]: !t[key] })); }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setPhotoImg(img);
        setPhotoZoom(1);
        setPhotoPanX(0);
        setPhotoPanY(0);
      };
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

  // Never pass raw brand hex into draw functions — derive safe roles first.
  const colors = useMemo(() => ({
    primary: deriveRole(primaryColor, 'surface'), // large fills: Prestige bg, Edge diagonal panel
    accent: deriveRole(accentColor, 'accent'),    // top bar, seal, underline, field labels
    ink: INK,                                     // fixed neutral text — never brand-derived
  }), [primaryColor, accentColor]);

  const render = useCallback(() => {
    if (!industry) return;
    const photoAdjust = { zoom: photoZoom, panX: photoPanX, panY: photoPanY };
    const opts = { layout, colors, logoImg, photoImg, photoAdjust, customCodeImg, form, toggles, cardId, industry };
    if (frontCanvasRef.current) drawCard(frontCanvasRef.current, { ...opts, side: 'front' });
    if (backCanvasRef.current) drawCard(backCanvasRef.current, { ...opts, side: 'back' });
  }, [industry, layout, colors, logoImg, photoImg, photoZoom, photoPanX, photoPanY, customCodeImg, form, toggles, cardId]);

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
            <button key={ind.id} onClick={() => chooseIndustry(ind)} style={{ padding: '20px 12px', borderRadius: 14, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
            <button key={l.id} onClick={() => setLayout(l.id)} title={l.note} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: layout === l.id ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: layout === l.id ? '#EFF6FF' : 'white', color: '#1E293B' }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 32 }}>
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

          {photoImg && (
            <div style={{ ...fieldWrap, background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Adjust photo crop</label>
                <button
                  onClick={() => { setPhotoZoom(1); setPhotoPanX(0); setPhotoPanY(0); }}
                  style={{ fontSize: '0.72rem', color: '#3A63B8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset
                </button>
              </div>
              <label style={{ fontSize: '0.72rem', color: '#64748B' }}>Zoom</label>
              <input type="range" min="1" max="2.5" step="0.05" value={photoZoom} onChange={(e) => setPhotoZoom(Number(e.target.value))} style={{ width: '100%' }} />
              <label style={{ fontSize: '0.72rem', color: '#64748B' }}>Move horizontal</label>
              <input type="range" min="-50" max="50" step="1" value={photoPanX} onChange={(e) => setPhotoPanX(Number(e.target.value))} style={{ width: '100%' }} />
              <label style={{ fontSize: '0.72rem', color: '#64748B' }}>Move vertical</label>
              <input type="range" min="-50" max="50" step="1" value={photoPanY} onChange={(e) => setPhotoPanY(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}

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
            <label style={checkRow}><input type="checkbox" checked={toggles.signatureStrip} onChange={() => toggle('signatureStrip')} /> Signature line (back)</label>
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

          <div style={fieldWrap}>
            <label style={labelStyle}>Your own QR code or barcode image (optional)</label>
            <input type="file" accept="image/*" onChange={handleCustomCode} style={inputStyle} />
            <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>
              {customCodeImg ? 'Using your uploaded code.' : "Upload a QR code you've already generated elsewhere — until then, a placeholder pattern is shown."}
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

        <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setSide('front')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: side === 'front' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: side === 'front' ? '#EFF6FF' : 'white', color: '#1E293B' }}>Front</button>
            <button onClick={() => setSide('back')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: side === 'back' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: side === 'back' ? '#EFF6FF' : 'white', color: '#1E293B' }}>Back</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: '#F8FAFC', borderRadius: 16 }}>
            <div style={{ width: '100%', maxWidth: CARD_W * PREVIEW_SCALE, aspectRatio: `${CARD_W} / ${CARD_H}`, boxShadow: '0 12px 32px rgba(15,31,61,0.14)', borderRadius: 12, overflow: 'hidden' }}>
              <canvas ref={frontCanvasRef} style={{ width: '100%', height: '100%', display: side === 'front' ? 'block' : 'none', objectFit: 'contain' }} />
              <canvas ref={backCanvasRef} style={{ width: '100%', height: '100%', display: side === 'back' ? 'block' : 'none', objectFit: 'contain' }} />
            </div>
          </div>

          <button onClick={downloadBoth} style={{ width: '100%', marginTop: 16, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
            ⬇ Download Front & Back (PNG)
          </button>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
            {CARD_W}×{CARD_H}px (portrait, matches approved design)
          </p>
        </div>
      </div>
    </div>
  );
}
