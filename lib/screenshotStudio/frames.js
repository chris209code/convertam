// Device & browser mockup frames — every frame is drawn with plain canvas
// primitives (rects, circles, arcs), not bitmap assets, so there's nothing
// to load or license. They're deliberately generic representations (three
// dots for "Mac-style" browser chrome, a simple notch for a phone) rather
// than pixel-accurate brand recreations.

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

// Returns { contentBox: {x,y,w,h}, totalH } describing where the screenshot
// goes and how tall the frame is for a given content width — callers use
// this to lay out the frame before the image itself is known precisely.
export function browserFrame(ctx, img, { x, y, w, variant = 'generic' }) {
  const barH = Math.round(w * 0.052);
  const contentH = (img.height / img.width) * w;
  const totalH = barH + contentH;
  roundedRect(ctx, x, y, w, totalH, 10);
  ctx.fillStyle = '#F1F3F5';
  ctx.fill();
  ctx.save();
  roundedRect(ctx, x, y, w, totalH, 10);
  ctx.clip();

  // Title bar
  ctx.fillStyle = variant === 'safari' ? '#F6F6F6' : variant === 'edge' ? '#F4F6FA' : '#ECEDEF';
  ctx.fillRect(x, y, w, barH);
  const dotR = barH * 0.16;
  const dotY = y + barH / 2;
  const colors = variant === 'chrome' || variant === 'generic' ? ['#FF5F57', '#FEBC2E', '#28C840'] : ['#D0D5DD', '#D0D5DD', '#D0D5DD'];
  colors.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(x + barH * 0.5 + i * dotR * 3, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  // Address bar
  const addrX = x + barH * 2.4;
  const addrW = w - barH * 2.4 - barH * 0.6;
  roundedRect(ctx, addrX, dotY - barH * 0.28, addrW, barH * 0.56, barH * 0.28);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.stroke();

  drawImageCover(ctx, img, x, y + barH, w, contentH);
  ctx.restore();
  return { contentBox: { x, y: y + barH, w, h: contentH }, totalH };
}

export function laptopFrame(ctx, img, { x, y, w, variant = 'macbook' }) {
  const bezelSide = w * 0.03;
  const bezelTop = w * 0.025;
  const screenW = w - bezelSide * 2;
  const screenH = (img.height / img.width) * screenW;
  const baseH = w * (variant === 'macbook' ? 0.045 : 0.03);
  const totalH = bezelTop + screenH + bezelSide + baseH;

  roundedRect(ctx, x, y, w, bezelTop + screenH + bezelSide, w * 0.03);
  ctx.fillStyle = '#2B2E33';
  ctx.fill();
  drawImageCover(ctx, img, x + bezelSide, y + bezelTop, screenW, screenH);

  // Base / hinge
  ctx.beginPath();
  ctx.moveTo(x - w * 0.03, y + bezelTop + screenH + bezelSide);
  ctx.lineTo(x + w + w * 0.03, y + bezelTop + screenH + bezelSide);
  ctx.lineTo(x + w * 0.92, y + totalH);
  ctx.lineTo(x + w * 0.08, y + totalH);
  ctx.closePath();
  ctx.fillStyle = variant === 'macbook' ? '#C9CDD3' : '#3A3D42';
  ctx.fill();
  if (variant === 'macbook') {
    roundedRect(ctx, x + w * 0.46, y + totalH - baseH * 0.45, w * 0.08, baseH * 0.22, baseH * 0.1);
    ctx.fillStyle = '#A8ADB5';
    ctx.fill();
  }
  return { contentBox: { x: x + bezelSide, y: y + bezelTop, w: screenW, h: screenH }, totalH };
}

export function monitorFrame(ctx, img, { x, y, w }) {
  const bezel = w * 0.02;
  const screenW = w - bezel * 2;
  const screenH = (img.height / img.width) * screenW;
  const standH = w * 0.09;
  const totalH = bezel * 2 + screenH + standH;

  roundedRect(ctx, x, y, w, bezel * 2 + screenH, w * 0.02);
  ctx.fillStyle = '#22252A';
  ctx.fill();
  drawImageCover(ctx, img, x + bezel, y + bezel, screenW, screenH);

  const neckW = w * 0.08;
  ctx.fillStyle = '#22252A';
  ctx.fillRect(x + w / 2 - neckW / 2, y + bezel * 2 + screenH, neckW, standH * 0.55);
  roundedRect(ctx, x + w * 0.32, y + totalH - standH * 0.28, w * 0.36, standH * 0.28, standH * 0.1);
  ctx.fill();
  return { contentBox: { x: x + bezel, y: y + bezel, w: screenW, h: screenH }, totalH };
}

export function phoneFrame(ctx, img, { x, y, w, variant = 'iphone' }) {
  const bezel = w * 0.035;
  const screenW = w - bezel * 2;
  const screenH = screenW * 2.05;
  const totalH = screenH + bezel * 2;

  roundedRect(ctx, x, y, w, totalH, w * (variant === 'iphone' ? 0.16 : 0.08));
  ctx.fillStyle = '#111318';
  ctx.fill();
  roundedRect(ctx, x + bezel, y + bezel, screenW, screenH, w * (variant === 'iphone' ? 0.1 : 0.04));
  ctx.save();
  ctx.clip();
  drawImageCover(ctx, img, x + bezel, y + bezel, screenW, screenH);
  ctx.restore();

  if (variant === 'iphone') {
    roundedRect(ctx, x + w * 0.32, y + bezel + w * 0.02, w * 0.36, w * 0.07, w * 0.035);
    ctx.fillStyle = '#111318';
    ctx.fill();
    roundedRect(ctx, x + w * 0.38, y + totalH - w * 0.045, w * 0.24, w * 0.012, w * 0.006);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + bezel + w * 0.025, w * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = '#3A3D42';
    ctx.fill();
  }
  return { contentBox: { x: x + bezel, y: y + bezel, w: screenW, h: screenH }, totalH };
}

export function tabletFrame(ctx, img, { x, y, w }) {
  const bezel = w * 0.045;
  const screenW = w - bezel * 2;
  const screenH = screenW * 1.33;
  const totalH = screenH + bezel * 2;
  roundedRect(ctx, x, y, w, totalH, w * 0.06);
  ctx.fillStyle = '#1B1D22';
  ctx.fill();
  drawImageCover(ctx, img, x + bezel, y + bezel, screenW, screenH);
  ctx.beginPath();
  ctx.arc(x + w / 2, y + totalH - bezel / 2, bezel * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#3A3D42';
  ctx.fill();
  return { contentBox: { x: x + bezel, y: y + bezel, w: screenW, h: screenH }, totalH };
}

export const FRAME_TYPES = [
  { id: 'generic-browser', label: 'Generic Browser', group: 'Browser', draw: (ctx, img, box) => browserFrame(ctx, img, { ...box, variant: 'generic' }) },
  { id: 'chrome', label: 'Chrome', group: 'Browser', draw: (ctx, img, box) => browserFrame(ctx, img, { ...box, variant: 'chrome' }) },
  { id: 'safari', label: 'Safari', group: 'Browser', draw: (ctx, img, box) => browserFrame(ctx, img, { ...box, variant: 'safari' }) },
  { id: 'edge', label: 'Edge', group: 'Browser', draw: (ctx, img, box) => browserFrame(ctx, img, { ...box, variant: 'edge' }) },
  { id: 'windows-laptop', label: 'Windows Laptop', group: 'Device', draw: (ctx, img, box) => laptopFrame(ctx, img, { ...box, variant: 'windows' }) },
  { id: 'macbook', label: 'MacBook', group: 'Device', draw: (ctx, img, box) => laptopFrame(ctx, img, { ...box, variant: 'macbook' }) },
  { id: 'desktop-monitor', label: 'Desktop Monitor', group: 'Device', draw: (ctx, img, box) => monitorFrame(ctx, img, box) },
  { id: 'iphone', label: 'iPhone', group: 'Device', draw: (ctx, img, box) => phoneFrame(ctx, img, { ...box, variant: 'iphone' }) },
  { id: 'android', label: 'Android Phone', group: 'Device', draw: (ctx, img, box) => phoneFrame(ctx, img, { ...box, variant: 'android' }) },
  { id: 'tablet', label: 'Tablet', group: 'Device', draw: (ctx, img, box) => tabletFrame(ctx, img, box) },
];

export function getFrame(id) {
  return FRAME_TYPES.find((f) => f.id === id) || FRAME_TYPES[0];
}

export { roundedRect, drawImageCover };
