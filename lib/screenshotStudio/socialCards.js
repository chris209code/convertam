import { roundedRect, drawImageCover } from './frames';

const INK = '#0F172A';
const SUB = '#64748B';
const BORDER = '#E2E8F0';

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
}

function drawAvatar(ctx, x, y, r, name, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${Math.round(r * 0.9)}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials(name), x, y + r * 0.05);
}

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawHeader(ctx, x, y, w, { name, handle, avatarColor, fontSize }) {
  const r = fontSize * 1.5;
  drawAvatar(ctx, x + r, y + r, r, name, avatarColor);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `700 ${fontSize}px -apple-system, sans-serif`;
  ctx.fillText(name || 'Someone', x + r * 2.3, y + r * 0.8);
  ctx.fillStyle = SUB;
  ctx.font = `${fontSize * 0.88}px -apple-system, sans-serif`;
  ctx.fillText(handle || '@handle', x + r * 2.3, y + r * 1.55);
  return r * 2.2;
}

function drawFooterIcons(ctx, x, y, w, fontSize, icons) {
  ctx.font = `${fontSize * 0.85}px -apple-system, sans-serif`;
  ctx.fillStyle = SUB;
  ctx.textAlign = 'left';
  let cx = x;
  const gap = w / icons.length;
  icons.forEach((label, i) => {
    ctx.fillText(label, x + i * gap, y);
  });
}

// Generic engine every platform card is built from — a header, wrapped
// text, the embedded screenshot, and a footer icon row. Platform
// differences are just which fields/icons get passed in.
function drawPostCard(ctx, img, { x, y, w, name, handle, text, avatarColor, footerIcons, fontSize = Math.round(w * 0.032), padding = Math.round(w * 0.045) }) {
  const innerW = w - padding * 2;
  const headerH = drawHeader(ctx, x + padding, y + padding, innerW, { name, handle, avatarColor, fontSize });
  let cy = y + padding + headerH + fontSize * 0.4;

  ctx.font = `${fontSize}px -apple-system, sans-serif`;
  ctx.fillStyle = INK;
  const lines = text ? wrapText(ctx, text, innerW) : [];
  lines.forEach((line) => {
    ctx.fillText(line, x + padding, cy);
    cy += fontSize * 1.4;
  });
  cy += fontSize * 0.3;

  let mediaH = 0;
  if (img) {
    mediaH = (img.height / img.width) * innerW;
    const maxMediaH = w * 0.9;
    if (mediaH > maxMediaH) mediaH = maxMediaH;
    roundedRect(ctx, x + padding, cy, innerW, mediaH, fontSize * 0.7);
    ctx.save();
    ctx.clip();
    drawImageCover(ctx, img, x + padding, cy, innerW, mediaH);
    ctx.restore();
    ctx.strokeStyle = BORDER;
    ctx.stroke();
    cy += mediaH + fontSize * 0.9;
  }

  if (footerIcons?.length) {
    drawFooterIcons(ctx, x + padding, cy, innerW, fontSize, footerIcons);
    cy += fontSize * 1.6;
  }

  return cy + padding - y;
}

export function drawTweetCard(ctx, img, box, fields) {
  const { x, y, w } = box;
  return drawPostCard(ctx, img, { x, y, w, ...fields, avatarColor: '#1D9BF0', footerIcons: ['💬 ' + (fields.replies ?? 12), '🔁 ' + (fields.reposts ?? 4), '❤ ' + (fields.likes ?? 128), '📤'] });
}

export function drawQuotedTweetCard(ctx, img, box, fields) {
  const { x, y, w } = box;
  const padding = Math.round(w * 0.045);
  const fontSize = Math.round(w * 0.032);
  const headerH = drawHeader(ctx, x + padding, y + padding, w - padding * 2, { name: fields.name, handle: fields.handle, avatarColor: '#1D9BF0', fontSize });
  let cy = y + padding + headerH + fontSize * 0.4;
  ctx.font = `${fontSize}px -apple-system, sans-serif`;
  ctx.fillStyle = INK;
  const lines = wrapText(ctx, fields.text, w - padding * 2);
  lines.forEach((line) => { ctx.fillText(line, x + padding, cy); cy += fontSize * 1.4; });
  cy += fontSize * 0.5;

  // Nested quoted post — visually secondary: smaller avatar/text, bordered
  // box, its own (smaller) media — so the hierarchy reads correctly rather
  // than two equal-weight cards.
  const qX = x + padding, qW = w - padding * 2;
  const qPad = fontSize * 0.7;
  const qFont = fontSize * 0.9;
  const qHeaderH = qFont * 2.2;
  let qh = qPad * 2 + qHeaderH + qFont * 1.4;
  const qMediaH = img ? Math.min((img.height / img.width) * (qW - qPad * 2), w * 0.55) : 0;
  if (img) qh += qMediaH + qPad;
  roundedRect(ctx, qX, cy, qW, qh, fontSize * 0.6);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawHeader(ctx, qX + qPad, cy + qPad, qW - qPad * 2, { name: fields.quotedName, handle: fields.quotedHandle, avatarColor: '#94A3B8', fontSize: qFont });
  ctx.font = `${qFont}px -apple-system, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText(fields.quotedText || '', qX + qPad, cy + qPad + qHeaderH + qFont * 0.6);
  if (img) {
    const mediaY = cy + qPad + qHeaderH + qFont * 1.4;
    roundedRect(ctx, qX + qPad, mediaY, qW - qPad * 2, qMediaH, qFont * 0.5);
    ctx.save(); ctx.clip();
    drawImageCover(ctx, img, qX + qPad, mediaY, qW - qPad * 2, qMediaH);
    ctx.restore();
  }
  cy += qh + fontSize * 0.8;
  drawFooterIcons(ctx, x + padding, cy, w - padding * 2, fontSize, ['💬 ' + (fields.replies ?? 8), '🔁 ' + (fields.reposts ?? 21), '❤ ' + (fields.likes ?? 340), '📤']);
  cy += fontSize * 1.6;
  return cy + padding - y;
}

export function drawReplyThreadCard(ctx, img, box, fields) {
  const { x, y, w } = box;
  const padding = Math.round(w * 0.045);
  const fontSize = Math.round(w * 0.032);
  const r = fontSize * 1.5;

  // First (parent) post — text only, no media, dimmed slightly with a
  // connecting thread line down to the reply below it.
  drawHeader(ctx, x + padding, y + padding, w - padding * 2, { name: fields.parentName, handle: fields.parentHandle, avatarColor: '#94A3B8', fontSize });
  let cy = y + padding + r * 2.2 + fontSize * 0.4;
  ctx.font = `${fontSize}px -apple-system, sans-serif`;
  ctx.fillStyle = SUB;
  wrapText(ctx, fields.parentText, w - padding * 2 - r * 2.3).forEach((line) => {
    ctx.fillText(line, x + padding + r * 2.3, cy); cy += fontSize * 1.4;
  });
  cy += fontSize * 0.8;

  // Thread connector line
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.beginPath();
  ctx.moveTo(x + padding + r, y + padding + r * 2.1);
  ctx.lineTo(x + padding + r, cy);
  ctx.stroke();

  const replyBoxY = cy;
  const replyH = drawPostCard(ctx, img, { x, y: cy, w, name: fields.replyName, handle: fields.replyHandle, text: fields.replyText, avatarColor: '#1D9BF0', footerIcons: ['💬 ' + (fields.replies ?? 3), '🔁 ' + (fields.reposts ?? 1), '❤ ' + (fields.likes ?? 44), '📤'] });
  return replyBoxY + replyH - y;
}

export function drawLinkedInPost(ctx, img, box, fields, opts = {}) {
  const { x, y, w } = box;
  const h = drawPostCard(ctx, img, { x, y, w, name: fields.name, handle: fields.title, text: fields.text, avatarColor: '#0A66C2', footerIcons: ['👍 ' + (fields.likes ?? 87), '💬 ' + (fields.comments ?? 14), '🔁 ' + (fields.reposts ?? 6), '📤'] });
  if (opts.carousel) {
    const padding = Math.round(w * 0.045);
    const dotY = y + h - padding * 1.6;
    const n = 3, dotR = w * 0.008, gap = dotR * 3.4;
    const startX = x + w / 2 - (gap * (n - 1)) / 2;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * gap, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#0A66C2' : '#CBD5E1';
      ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(w * 0.03)}px -apple-system, sans-serif`;
    ['‹', '›'].forEach((arrow, i) => {
      ctx.beginPath();
      ctx.arc(i === 0 ? x + w * 0.08 : x + w * 0.92, y + h * 0.4, w * 0.032, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,23,42,0.55)';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrow, i === 0 ? x + w * 0.08 : x + w * 0.92, y + h * 0.4);
    });
  }
  return h;
}

export function drawRedditPost(ctx, img, box, fields) {
  const { x, y, w } = box;
  const padding = Math.round(w * 0.045);
  const fontSize = Math.round(w * 0.032);
  const voteW = w * 0.09;
  ctx.fillStyle = SUB;
  ctx.font = `${fontSize * 0.85}px -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`r/${fields.subreddit || 'community'} • ${fields.handle || 'u/user'}`, x + padding, y + padding + fontSize * 0.7);
  ctx.font = `700 ${fontSize * 1.15}px -apple-system, sans-serif`;
  ctx.fillStyle = INK;
  let cy = y + padding + fontSize * 2.1;
  wrapText(ctx, fields.text, w - padding * 2).forEach((line) => { ctx.fillText(line, x + padding, cy); cy += fontSize * 1.6; });
  cy += fontSize * 0.4;
  let mediaH = 0;
  if (img) {
    mediaH = Math.min((img.height / img.width) * (w - padding * 2), w * 0.9);
    roundedRect(ctx, x + padding, cy, w - padding * 2, mediaH, fontSize * 0.5);
    ctx.save(); ctx.clip();
    drawImageCover(ctx, img, x + padding, cy, w - padding * 2, mediaH);
    ctx.restore();
    cy += mediaH + fontSize * 0.8;
  }
  ctx.font = `700 ${fontSize * 0.85}px -apple-system, sans-serif`;
  ctx.fillStyle = '#FF4500';
  ctx.fillText('▲ ' + (fields.upvotes ?? '2.4k') + ' ▼', x + padding, cy);
  ctx.fillStyle = SUB;
  ctx.font = `${fontSize * 0.85}px -apple-system, sans-serif`;
  ctx.fillText('💬 ' + (fields.comments ?? 156), x + padding + voteW * 2, cy);
  cy += fontSize * 1.4;
  return cy + padding - y;
}

export function drawFacebookPost(ctx, img, box, fields) {
  const { x, y, w } = box;
  return drawPostCard(ctx, img, { x, y, w, name: fields.name, handle: fields.subtext || 'Just now · 🌎', text: fields.text, avatarColor: '#1877F2', footerIcons: ['👍 ' + (fields.likes ?? 214), '💬 ' + (fields.comments ?? 32), '🔁 Share'] });
}

export function drawInstagramPost(ctx, img, box, fields) {
  const { x, y, w } = box;
  const padding = Math.round(w * 0.045);
  const fontSize = Math.round(w * 0.032);
  const r = fontSize * 1.3;
  drawAvatar(ctx, x + padding + r, y + padding + r, r, fields.name, '#E1306C');
  ctx.fillStyle = INK;
  ctx.font = `700 ${fontSize}px -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(fields.handle || '@handle', x + padding + r * 2.3, y + padding + r * 1.1);
  let cy = y + padding + r * 2.4;
  let mediaH = 0;
  if (img) {
    mediaH = Math.min((img.height / img.width) * w, w * 1.25);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, cy, w, mediaH); ctx.clip();
    drawImageCover(ctx, img, x, cy, w, mediaH);
    ctx.restore();
    cy += mediaH + fontSize * 0.9;
  }
  ctx.font = `${fontSize * 0.95}px -apple-system, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText(`❤ 🗨 ✈        🔖`, x + padding, cy);
  cy += fontSize * 1.5;
  ctx.font = `700 ${fontSize * 0.9}px -apple-system, sans-serif`;
  ctx.fillText((fields.likes ?? '3,204') + ' likes', x + padding, cy);
  cy += fontSize * 1.4;
  if (fields.text) {
    ctx.font = `${fontSize * 0.9}px -apple-system, sans-serif`;
    ctx.fillStyle = INK;
    const capLines = wrapText(ctx, `${fields.handle || ''} ${fields.text}`, w - padding * 2);
    capLines.forEach((line) => { ctx.fillText(line, x + padding, cy); cy += fontSize * 1.3; });
  }
  return cy + padding - y;
}
