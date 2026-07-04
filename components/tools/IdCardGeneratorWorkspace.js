'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const INDUSTRIES = [
  { id: 'corporate', label: 'Corporate', icon: '🏢', color: '#1E3A8A', idLabel: 'Employee No.', secondaryLabel: 'Department', fieldsOn: [] },
  { id: 'school', label: 'School', icon: '🏫', color: '#B91C1C', idLabel: 'Admission No.', secondaryLabel: 'Class', fieldsOn: [] },
  { id: 'church', label: 'Church', icon: '⛪', color: '#6D28D9', idLabel: 'Member No.', secondaryLabel: 'Ministry / Unit', fieldsOn: [] },
  { id: 'hospital', label: 'Hospital', icon: '🏥', color: '#DC2626', idLabel: 'Staff No.', secondaryLabel: 'Ward / Department', fieldsOn: ['bloodGroup'] },
  { id: 'event', label: 'Event Pass', icon: '🎉', color: '#D97706', idLabel: 'Pass No.', secondaryLabel: 'Access Level', fieldsOn: ['validUntil'] },
  { id: 'security', label: 'Security', icon: '🛡️', color: '#111827', idLabel: 'Badge No.', secondaryLabel: 'Post / Unit', fieldsOn: [] },
  { id: 'construction', label: 'Construction', icon: '👷', color: '#B45309', idLabel: 'Worker No.', secondaryLabel: 'Site / Team', fieldsOn: ['bloodGroup'] },
  { id: 'university', label: 'University', icon: '🎓', color: '#1D4ED8', idLabel: 'Matric No.', secondaryLabel: 'Faculty / Dept.', fieldsOn: [] },
];

const LAYOUTS = [
  { id: 'classic', label: 'Classic', note: 'Photo left, details right' },
  { id: 'executive', label: 'Executive', note: 'Top banner, centered name' },
  { id: 'split', label: 'Modern Split', note: 'Diagonal color block, photo right' },
];

const CARD_W = 1013;
const CARD_H = 638;
const PREVIEW_SCALE = 0.38;

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}/${months[parseInt(m, 10) - 1]}/${y}`;
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

// Sample the logo's pixels to find its dominant non-background color.
// Runs entirely client-side on a canvas — no library needed.
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
      if (r > 235 && g > 235 && b > 235) continue; // skip near-white background
      if (r < 15 && g < 15 && b < 15) continue; // skip near-black
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
    return null; // e.g. tainted canvas — fail silently, keep current color
  }
}

function drawGuilloche(ctx, w, h, color) {
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const y = h / 2 + Math.sin((x + i) * 0.02) * (h / 2.4) * Math.cos(i * 0.01);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWatermarkTiles(ctx, w, h, text, color) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.font = '700 20px Arial, sans-serif';
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 10);
  ctx.translate(-w / 2, -h / 2);
  for (let y = -40; y < h + 40; y += 60) {
    for (let x = -60; x < w + 60; x += 220) {
      ctx.fillText(text || 'VERIFIED', x, y);
    }
  }
  ctx.restore();
}

function drawGhostPhoto(ctx, photoImg, w, h) {
  if (!photoImg) return;
  ctx.save();
  ctx.globalAlpha = 0.08;
  const size = h * 0.9;
  const ratio = Math.max(size / photoImg.width, size / photoImg.height);
  const iw = photoImg.width * ratio, ih = photoImg.height * ratio;
  ctx.drawImage(photoImg, w - iw + 60, (h - ih) / 2, iw, ih);
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

function drawPhotoBox(ctx, x, y, size, photoImg, subtextColor, accent, circle) {
  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, x, y, size, size, 16);
  }
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, size, size);
  if (photoImg) {
    const ratio = Math.max(size / photoImg.width, size / photoImg.height);
    const w = photoImg.width * ratio, h = photoImg.height * ratio;
    ctx.drawImage(photoImg, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    ctx.fillStyle = subtextColor;
    ctx.font = '400 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', x + size / 2, y + size / 2 - 10);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, x, y, size, size, 16);
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();
}

function buildInfoRows(form, toggles, industry) {
  const rows = [[industry.idLabel, form.idNumber || '—'], [industry.secondaryLabel, form.secondaryValue || '—']];
  if (toggles.validUntil) rows.push(['Valid Until', formatDate(form.validUntil) || '—']);
  if (toggles.bloodGroup) rows.push(['Blood Group', form.bloodGroup || '—']);
  return rows;
}

function drawFooter(ctx, { toggles, cardId, textColor, subtextColor, x1 = 48, customCodeImg }) {
  if (toggles.signatureStrip) {
    ctx.strokeStyle = subtextColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, CARD_H - 66);
    ctx.lineTo(x1 + 252, CARD_H - 66);
    ctx.stroke();
    ctx.font = '400 16px Arial, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.textAlign = 'left';
    ctx.fillText('Authorized Signature', x1, CARD_H - 56);
  }
  if (toggles.cardSerial) {
    ctx.font = '400 16px Arial, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.textAlign = 'left';
    ctx.fillText(cardId, x1, CARD_H - 30);
  }

  if (customCodeImg) {
    // User-supplied QR/barcode image takes priority over generated patterns
    const size = 96;
    const cx = CARD_W - size - 44, cy = CARD_H - size - 24;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    drawRoundedRect(ctx, cx - 6, cy - 6, size + 12, size + 12, 8);
    ctx.fill();
    ctx.drawImage(customCodeImg, cx, cy, size, size);
    ctx.restore();
  } else {
    if (toggles.barcode) drawBarcode(ctx, CARD_W - 260, CARD_H - 70, 210, 40, cardId, textColor);
    if (toggles.securityPattern) drawSecurityPattern(ctx, CARD_W - 130, CARD_H - 190, 90, cardId, textColor);
  }
}

function drawFrontClassic(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry, textColor, subtextColor } = ctxData;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, 14);

  let headerX = 48;
  if (logoImg) {
    const logoSize = 64;
    ctx.save();
    drawRoundedRect(ctx, headerX, 40, logoSize, logoSize, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(headerX, 40, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, 40 + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 20;
  }
  ctx.fillStyle = textColor;
  ctx.font = '700 38px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(form.orgName || 'Your Organization', headerX, 42);
  ctx.font = '400 22px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerX, 88);

  const photoX = 48, photoY = 150, photoSize = 270;
  drawPhotoBox(ctx, photoX, photoY, photoSize, photoImg, subtextColor, colors.accent, false);

  const infoX = photoX + photoSize + 40;
  const infoW = CARD_W - infoX - 40;
  let infoY = photoY + 4;
  ctx.fillStyle = textColor;
  ctx.font = '700 36px Arial, sans-serif';
  ctx.fillText(form.fullName || 'Full Name', infoX, infoY);
  infoY += 44;
  ctx.font = '400 24px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(form.role || 'Title / Role', infoX, infoY);
  infoY += 30;
  if (form.orgTagline) {
    ctx.font = 'italic 400 16px Arial, sans-serif';
    ctx.fillText(form.orgTagline, infoX, infoY);
    infoY += 26;
  }
  infoY += 14;

  buildInfoRows(form, toggles, industry).forEach(([label, val]) => {
    ctx.save();
    ctx.globalAlpha = 0.14;
    drawRoundedRect(ctx, infoX, infoY - 6, infoW, 60, 10);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.restore();

    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(label.toUpperCase(), infoX + 16, infoY);
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(val, infoX + 16, infoY + 24);
    infoY += 70;
  });

  drawFooter(ctx, { toggles, cardId, textColor, subtextColor, customCodeImg: ctxData.customCodeImg });
}

function drawFrontExecutive(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry, textColor, subtextColor } = ctxData;

  // Top banner — logo and org name live here, top-LEFT only, so nothing sits
  // behind the centered photo below.
  const bannerH = 118;
  ctx.save();
  ctx.fillStyle = shade(colors.primary, isLight(colors.primary) ? -0.08 : -0.2);
  ctx.fillRect(0, 0, CARD_W, bannerH);
  ctx.restore();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, bannerH, CARD_W, 6);

  ctx.textAlign = 'left';
  let headerX = 40;
  if (logoImg) {
    const logoSize = 56;
    const logoY = (bannerH - logoSize) / 2;
    ctx.save();
    drawRoundedRect(ctx, headerX, logoY, logoSize, logoSize, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(headerX, logoY, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, logoY + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 18;
  }
  ctx.fillStyle = textColor;
  ctx.font = '700 32px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(form.orgName || 'Your Organization', headerX, bannerH / 2);

  // Card type badge, top-right of banner (fills the empty corner)
  ctx.textAlign = 'right';
  ctx.font = '700 16px Arial, sans-serif';
  ctx.fillStyle = colors.accent;
  ctx.fillText(industry.label.toUpperCase(), CARD_W - 40, bannerH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Centered circular photo, overlapping the banner bottom edge only
  const bx = CARD_W / 2;
  const photoSize = 200;
  const photoX = bx - photoSize / 2, photoY = bannerH - photoSize / 2 - 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, photoY + photoSize / 2, photoSize / 2 + 7, 0, Math.PI * 2);
  ctx.fillStyle = isLight(colors.primary) ? '#FFFFFF' : shade(colors.primary, 0.1);
  ctx.fill();
  ctx.restore();
  drawPhotoBox(ctx, photoX, photoY, photoSize, photoImg, subtextColor, colors.accent, true);

  ctx.textAlign = 'center';
  let ty = photoY + photoSize + 20;
  ctx.fillStyle = textColor;
  ctx.font = '700 38px Arial, sans-serif';
  ctx.fillText(form.fullName || 'Full Name', bx, ty);
  ty += 42;
  ctx.font = '400 24px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(form.role || 'Title / Role', bx, ty);
  ty += 30;
  if (form.orgTagline) {
    ctx.font = 'italic 400 17px Arial, sans-serif';
    ctx.fillText(form.orgTagline, bx, ty);
    ty += 26;
  }
  ty += 14;

  const rows = buildInfoRows(form, toggles, industry);
  const colW = (CARD_W - 96) / rows.length;
  rows.forEach(([label, val], i) => {
    const cx = 48 + colW * i + colW / 2;
    // filled pill behind each stat so the row reads as a solid block, not floating text
    ctx.save();
    ctx.globalAlpha = 0.14;
    drawRoundedRect(ctx, 48 + colW * i + 10, ty - 6, colW - 20, 64, 10);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.restore();

    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(label.toUpperCase(), cx, ty);
    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(val, cx, ty + 26);
  });

  ctx.textAlign = 'left';
  drawFooter(ctx, { toggles, cardId, textColor, subtextColor, customCodeImg: ctxData.customCodeImg });
}

function drawFrontSplit(ctx, ctxData) {
  const { colors, logoImg, photoImg, form, toggles, cardId, industry, textColor, subtextColor } = ctxData;

  // Diagonal darker block behind photo (right side)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(CARD_W * 0.62, 0);
  ctx.lineTo(CARD_W, 0);
  ctx.lineTo(CARD_W, CARD_H);
  ctx.lineTo(CARD_W * 0.48, CARD_H);
  ctx.closePath();
  ctx.fillStyle = shade(colors.primary, isLight(colors.primary) ? -0.1 : -0.25);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, 12);

  let headerX = 48;
  if (logoImg) {
    const logoSize = 56;
    ctx.save();
    drawRoundedRect(ctx, headerX, 36, logoSize, logoSize, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(headerX, 36, logoSize, logoSize);
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio, lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, headerX + (logoSize - lw) / 2, 36 + (logoSize - lh) / 2, lw, lh);
    ctx.restore();
    headerX += logoSize + 16;
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = '700 30px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(form.orgName || 'Your Organization', headerX, 40);
  ctx.font = '400 18px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(form.orgTagline || `${industry.label} ID Card`, headerX, 74);

  // Photo on the right diagonal block
  const photoSize = 220;
  const photoX = CARD_W - photoSize - 60, photoY = 130;
  drawPhotoBox(ctx, photoX, photoY, photoSize, photoImg, 'rgba(255,255,255,0.8)', colors.accent, false);

  // Info on the left
  let infoY = 148;
  const infoX = 48;
  const infoW = photoX - infoX - 30;
  ctx.fillStyle = textColor;
  ctx.font = '700 36px Arial, sans-serif';
  ctx.fillText(form.fullName || 'Full Name', infoX, infoY);
  infoY += 42;
  ctx.font = '400 23px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(form.role || 'Title / Role', infoX, infoY);
  infoY += 28;
  if (form.orgTagline) {
    ctx.font = 'italic 400 16px Arial, sans-serif';
    ctx.fillText(form.orgTagline, infoX, infoY);
    infoY += 26;
  }
  infoY += 16;

  buildInfoRows(form, toggles, industry).forEach(([label, val]) => {
    ctx.save();
    ctx.globalAlpha = 0.16;
    drawRoundedRect(ctx, infoX, infoY - 6, infoW, 62, 10);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.restore();

    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(label.toUpperCase(), infoX + 16, infoY);
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(val, infoX + 16, infoY + 24);
    infoY += 72;
  });

  drawFooter(ctx, { toggles, cardId, textColor, subtextColor, customCodeImg: ctxData.customCodeImg });
}

function drawBack(ctx, ctxData) {
  const { colors, form, toggles, cardId, textColor, subtextColor, customCodeImg } = ctxData;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, CARD_W, 14);

  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = '700 28px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Contact & Information', 48, 46);

  ctx.font = '400 21px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  const lines = [
    form.address && `Address: ${form.address}`,
    form.phone && `Phone: ${form.phone}`,
    form.email && `Email: ${form.email}`,
    toggles.emergencyContact && form.emergencyContact && `Emergency Contact: ${form.emergencyContact}`,
  ].filter(Boolean);

  let y = 110;
  lines.forEach((line) => {
    ctx.fillText(line, 48, y);
    y += 38;
  });

  if (form.terms) {
    ctx.font = '400 17px Arial, sans-serif';
    ctx.fillStyle = subtextColor;
    wrapText(ctx, form.terms, 48, y + 16, CARD_W - 96, 24);
  }

  if (toggles.signatureStrip) {
    ctx.strokeStyle = subtextColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, CARD_H - 90);
    ctx.lineTo(300, CARD_H - 90);
    ctx.stroke();
    ctx.font = '400 16px Arial, sans-serif';
    ctx.fillText('Holder Signature', 48, CARD_H - 80);
  }

  if (customCodeImg) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    drawRoundedRect(ctx, 42, CARD_H - 130, 92, 92, 8);
    ctx.fill();
    ctx.drawImage(customCodeImg, 48, CARD_H - 124, 80, 80);
    ctx.restore();
  } else if (toggles.barcode) {
    drawBarcode(ctx, 48, CARD_H - 56, 260, 34, cardId + 'b', textColor);
  }
  if (toggles.cardSerial) {
    ctx.font = '400 15px Arial, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.textAlign = 'right';
    ctx.fillText(cardId, CARD_W - 48, CARD_H - 40);
    ctx.textAlign = 'left';
  }

  ctx.font = '400 16px Arial, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.textAlign = 'center';
  ctx.fillText('If found, please return to the organization above.', CARD_W / 2, CARD_H - 30);
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

  const textColor = isLight(colors.primary) ? '#0F172A' : '#FFFFFF';
  const subtextColor = isLight(colors.primary) ? '#334155' : 'rgba(255,255,255,0.82)';

  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.save();
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, colors.primary);
  grad.addColorStop(1, shade(colors.primary, isLight(colors.primary) ? -0.06 : 0.22));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (toggles.guilloche) drawGuilloche(ctx, CARD_W, CARD_H, colors.accent);
  if (toggles.watermark) drawWatermarkTiles(ctx, CARD_W, CARD_H, form.orgName, textColor);

  const ctxData = { colors, logoImg, photoImg, customCodeImg, form, toggles, cardId, industry, textColor, subtextColor };

  if (side === 'front') {
    if (toggles.ghostPhoto) drawGhostPhoto(ctx, photoImg, CARD_W, CARD_H);
    if (layout === 'executive') drawFrontExecutive(ctx, ctxData);
    else if (layout === 'split') drawFrontSplit(ctx, ctxData);
    else drawFrontClassic(ctx, ctxData);
  } else {
    if (toggles.ghostPhoto) drawGhostPhoto(ctx, photoImg, CARD_W, CARD_H);
    drawBack(ctx, ctxData);
  }

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
    guilloche: true, watermark: false, ghostPhoto: false, barcode: true, securityPattern: false, cardSerial: true,
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
            <label style={checkRow}><input type="checkbox" checked={toggles.signatureStrip} onChange={() => toggle('signatureStrip')} /> Signature strip</label>
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
            <label style={checkRow}><input type="checkbox" checked={toggles.guilloche} onChange={() => toggle('guilloche')} /> Guilloche pattern</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.watermark} onChange={() => toggle('watermark')} /> Watermark tiling</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.ghostPhoto} onChange={() => toggle('ghostPhoto')} /> Ghost photo</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.barcode} onChange={() => toggle('barcode')} disabled={!!customCodeImg} /> Barcode strip</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.securityPattern} onChange={() => toggle('securityPattern')} disabled={!!customCodeImg} /> Verification pattern</label>
            <label style={checkRow}><input type="checkbox" checked={toggles.cardSerial} onChange={() => toggle('cardSerial')} /> Unique card serial</label>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>These are visual only — they make the card look authentic but aren't a scannable/verifiable code.</p>

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
