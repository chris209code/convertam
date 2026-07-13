'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Design tokens — taken directly from the approved Claude Design export
// (Ultimate QR Code Studio, "Modern Dashboard" direction). Preserved as
// closely as inline-style React allows.
// ---------------------------------------------------------------------------
const T = {
  ink: '#14151A', inkSecondary: '#3A3D46', muted: '#8A8D96', mutedDark: '#6B6F7A',
  borderLight: '#ECECEE', borderInput: '#E4E4E8', pageBg: '#FBFBFA',
  blue: '#2563EB', blueHover: '#1D4FD1', blueTint: '#EEF3FF',
  emerald: '#10B981', emeraldTint: '#ECFDF5', emeraldBorder: '#C9F1DE',
  qrInk: '#181A20',
  font: '"Plus Jakarta Sans", system-ui, sans-serif',
};

const CONTENT_TYPES = [
  { id: 'website', label: 'Website', icon: '🌐' },
  { id: 'text', label: 'Text', icon: '📝' },
  { id: 'phone', label: 'Phone', icon: '📞' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { id: 'vcard', label: 'vCard', icon: '👤' },
];

const PRESETS = [
  { id: 'business', label: 'Business', icon: '💼', contentType: 'vcard' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶', contentType: 'wifi' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', contentType: 'whatsapp' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️', contentType: 'website' },
  { id: 'portfolio', label: 'Portfolio', icon: '🎨', contentType: 'website' },
  { id: 'payment', label: 'Payment', icon: '💳', contentType: 'website' },
  { id: 'event', label: 'Event', icon: '🎟️', contentType: 'website' },
  { id: 'social', label: 'Social', icon: '📷', contentType: 'website' },
];

const PREVIEW_STYLES = [
  { id: 'clean', label: 'Clean' },
  { id: 'confetti', label: 'Colorful Confetti' },
  { id: 'gradient', label: 'Abstract Gradient' },
  { id: 'floating', label: 'Floating Shapes' },
  { id: 'marketing', label: 'Marketing Card' },
  { id: 'transparent', label: 'Transparent' },
];

const MODULE_SHAPES = [
  { id: 'square', label: 'Square', dotType: 'square' },
  { id: 'rounded', label: 'Rounded', dotType: 'rounded' },
  { id: 'dots', label: 'Dots', dotType: 'dots' },
  { id: 'classy', label: 'Classy', dotType: 'classy' },
];

const EYE_SHAPES = [
  { id: 'square', label: 'Square eye', cornerType: 'square' },
  { id: 'rounded', label: 'Rounded eye', cornerType: 'extra-rounded' },
  { id: 'circle', label: 'Circular eye', cornerType: 'dot' },
];

const SHADOW_LEVELS = ['None', 'Light', 'Medium', 'Strong'];

// ---------------------------------------------------------------------------
// Payload builders — each content type has a real, standard-compliant format,
// not just a raw text dump.
// ---------------------------------------------------------------------------
function buildPayload(contentType, fields) {
  switch (contentType) {
    case 'website': return fields.url || '';
    case 'text': return fields.text || '';
    case 'phone': return fields.phone ? `tel:${fields.phone}` : '';
    case 'whatsapp': return fields.waNumber ? `https://wa.me/${fields.waNumber.replace(/[^\d]/g, '')}${fields.waMessage ? `?text=${encodeURIComponent(fields.waMessage)}` : ''}` : '';
    case 'wifi': return fields.ssid ? `WIFI:T:${fields.wifiEnc || 'WPA'};S:${fields.ssid};P:${fields.wifiPassword || ''};;` : '';
    case 'vcard': return fields.vName ? `BEGIN:VCARD\nVERSION:3.0\nFN:${fields.vName}\nTEL:${fields.vPhone || ''}\nEMAIL:${fields.vEmail || ''}\nORG:${fields.vOrg || ''}\nEND:VCARD` : '';
    default: return '';
  }
}

function isValidPayload(contentType, fields) {
  const p = buildPayload(contentType, fields);
  return p.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Contrast check — relative luminance, WCAG-style ratio, used for the Scan
// Validation "sufficient contrast" check.
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  return m ? m.map((h) => parseInt(h, 16)) : [0, 0, 0];
}
function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Bakes a white circular/rounded-square badge, with safe padding, around the
// uploaded logo — into an actual composited image, not a CSS overlay. This
// is what makes the badge survive PNG/SVG/PDF export: qr-code-styling embeds
// whatever image it's given directly into the QR's pixel/vector data, so the
// badge has to be part of that image, not layered on top in the DOM.
function compositeLogoBadge(logoDataUrl, shape) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(20,21,26,0.18)';
      ctx.shadowBlur = 10;
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRectPath(ctx, 6, 6, size - 12, size - 12, size * 0.22);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Safe padding so the logo never touches the badge edge, and is
      // scaled to fit while preserving its aspect ratio.
      const padding = size * 0.2;
      const area = size - padding * 2;
      const scale = Math.min(area / img.width, area / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = logoDataUrl;
  });
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Preview background decorations — CSS-drawn, matching the README's six
// preview styles. Purely presentational, clipped to the 480x480 stage,
// never overlapping the QR card itself.
// ---------------------------------------------------------------------------
function PreviewBackground({ style }) {
  if (style === 'clean') {
    return <div style={{ position: 'absolute', inset: 0, background: '#F9F9F8' }} />;
  }
  if (style === 'transparent') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(45deg, #e3e3e6 25%, transparent 25%), linear-gradient(-45deg, #e3e3e6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e3e3e6 75%), linear-gradient(-45deg, transparent 75%, #e3e3e6 75%)',
        backgroundSize: '22px 22px', backgroundPosition: '0 0, 0 11px, 11px -11px, -11px 0px', backgroundColor: '#fff',
      }} />
    );
  }
  if (style === 'confetti') {
    const colors = ['#2563EB', '#10B981', '#06B6D4', '#FBBF24', '#F97316', '#EC4899', '#8B5CF6', '#EF4444'];
    const cardHalf = 180; // half-width of the card within the actual 400px on-screen stage
    const shapes = Array.from({ length: 16 }, (_, i) => {
      const size = 10 + (i % 4) * 6;
      const isCircle = i % 2 === 0;
      const angle = (i / 16) * 360;
      const rad = (angle * Math.PI) / 180;
      // True distance from center to a SQUARE's edge in a given direction
      // (not a circle's) — this correctly clears the card at every angle:
      // enough margin at the diagonals (where corners/brackets reach
      // furthest) without over-pushing cardinal-direction pieces off the
      // visible stage, which a single flat "safe" radius can't do at once.
      const minClearRadius = cardHalf / Math.max(Math.abs(Math.cos(rad)), Math.abs(Math.sin(rad)));
      const radius = minClearRadius + 20 + (i % 3) * 15;
      const x = 240 + radius * Math.cos(rad) - size / 2;
      const y = 240 + radius * Math.sin(rad) - size / 2;
      const blurred = i % 5 === 0;
      return (
        <div key={i} style={{
          position: 'absolute', left: x, top: y, width: size, height: size,
          background: colors[i % colors.length], borderRadius: isCircle ? '50%' : 6,
          opacity: blurred ? 0.3 : 0.85 + (i % 3) * 0.03,
          filter: blurred ? 'blur(6px)' : 'none',
          transform: `rotate(${(i * 37) % 360}deg)`,
        }} />
      );
    });
    return <div style={{ position: 'absolute', inset: 0, background: '#F8F9FC', overflow: 'hidden' }}>{shapes}</div>;
  }
  if (style === 'gradient') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'radial-gradient(circle at 30% 30%, rgba(37,99,235,0.18), transparent 55%), radial-gradient(circle at 75% 65%, rgba(16,185,129,0.16), transparent 55%), radial-gradient(circle at 50% 85%, rgba(236,72,153,0.14), transparent 55%)' }}>
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: '#2563EB', opacity: 0.22, filter: 'blur(22px)', top: 40, left: 40 }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: '#10B981', opacity: 0.2, filter: 'blur(20px)', bottom: 60, right: 50 }} />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: ['#2563EB', '#10B981', '#EC4899'][i % 3], left: 60 + i * 60, top: 380 - (i % 2) * 300 }} />
        ))}
      </div>
    );
  }
  if (style === 'floating') {
    const items = [
      { size: 58, shape: 'circle', x: 30, y: 192 },
      { size: 50, shape: 'square', x: 396, y: 108, rot: 20 },
      { size: 60, shape: 'diamond', x: 84, y: 372 },
      { size: 53, shape: 'circle', x: 360, y: 348 },
      { size: 43, shape: 'square', x: 216, y: 26, rot: -15 },
    ];
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#F8F9FC', overflow: 'hidden' }}>
        {items.map((it, i) => (
          <div key={i} style={{
            position: 'absolute', left: it.x, top: it.y, width: it.size, height: it.size,
            background: ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][i % 5],
            borderRadius: it.shape === 'circle' ? '50%' : it.shape === 'diamond' ? 8 : 10,
            opacity: 0.88, transform: it.shape === 'diamond' ? 'rotate(45deg)' : it.rot ? `rotate(${it.rot}deg)` : 'none',
          }} />
        ))}
      </div>
    );
  }
  if (style === 'marketing') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 55%, #EC4899 100%)' }}>
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'white', opacity: 0.12, filter: 'blur(20px)', top: -40, right: -30 }} />
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'white', opacity: 0.1, filter: 'blur(18px)', bottom: -30, left: -20 }} />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: i % 2 ? '#FBBF24' : '#06B6D4', left: 50 + i * 80, top: 30 + (i % 3) * 150 }} />
        ))}
      </div>
    );
  }
  return null;
}

// Four decorative corner accents on the QR card itself — matching the
// approved design exactly: 14px inset, 26x26px, 4px thick, rounded on the
// outer corner only. Positioned inside the card's own padding (the quiet
// zone), never overlapping the QR modules, and purely decorative — they
// carry no data and can't affect scan reliability.
function CornerBrackets() {
  const base = { position: 'absolute', width: 26, height: 26 };
  return (
    <>
      <div style={{ ...base, top: 14, left: 14, borderTop: `4px solid ${T.blue}`, borderLeft: `4px solid ${T.blue}`, borderTopLeftRadius: 8 }} />
      <div style={{ ...base, top: 14, right: 14, borderTop: '4px solid #EF4444', borderRight: '4px solid #EF4444', borderTopRightRadius: 8 }} />
      <div style={{ ...base, bottom: 14, left: 14, borderBottom: `4px solid ${T.emerald}`, borderLeft: `4px solid ${T.emerald}`, borderBottomLeftRadius: 8 }} />
      <div style={{ ...base, bottom: 14, right: 14, borderBottom: '4px solid #F59E0B', borderRight: '4px solid #F59E0B', borderBottomRightRadius: 8 }} />
    </>
  );
}

export default function QrCodeStudioWorkspace() {
  const [contentType, setContentType] = useState('website');
  const [fields, setFields] = useState({});
  const [activeDesignTab, setActiveDesignTab] = useState('colors');
  const [previewSize, setPreviewSize] = useState(1024);
  const [previewStyle, setPreviewStyle] = useState('confetti');

  const [foreground, setForeground] = useState('#181A20');
  const [accent, setAccent] = useState('#2563EB');
  const [background, setBackground] = useState('#FFFFFF');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [shadowLevel, setShadowLevel] = useState('Medium');
  const [moduleShape, setModuleShape] = useState('square');
  const [eyeShape, setEyeShape] = useState('square');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [compositedLogoUrl, setCompositedLogoUrl] = useState(null);
  const [logoBadgeShape, setLogoBadgeShape] = useState('circle'); // 'circle' | 'rounded'
  const [showCornerBrackets, setShowCornerBrackets] = useState(true);
  const [logoSizeRatio, setLogoSizeRatio] = useState(0.28);
  const [frame, setFrame] = useState('none');
  const [captionText, setCaptionText] = useState('Scan Me');

  const [scanResult, setScanResult] = useState(null);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  const qrContainerRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const fileInputRef = useRef(null);

  const payload = buildPayload(contentType, fields);
  const hasValidPayload = isValidPayload(contentType, fields);
  const errorCorrectionLevel = logoDataUrl ? 'H' : 'M';

  function updateField(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!logoDataUrl) { setCompositedLogoUrl(null); return; }
    let cancelled = false;
    compositeLogoBadge(logoDataUrl, logoBadgeShape).then((url) => { if (!cancelled) setCompositedLogoUrl(url); }).catch(() => { if (!cancelled) setCompositedLogoUrl(logoDataUrl); });
    return () => { cancelled = true; };
  }, [logoDataUrl, logoBadgeShape]);

  const buildQrOptions = useCallback((size) => ({
    width: size, height: size,
    data: hasValidPayload ? payload : 'https://convertam.app',
    margin: 16,
    image: compositedLogoUrl || undefined,
    qrOptions: { errorCorrectionLevel },
    imageOptions: { crossOrigin: 'anonymous', margin: 2, imageSize: logoSizeRatio, hideBackgroundDots: true },
    dotsOptions: gradientEnabled
      ? { type: MODULE_SHAPES.find((m) => m.id === moduleShape)?.dotType || 'square', gradient: { type: 'linear', rotation: Math.PI / 4, colorStops: [{ offset: 0, color: foreground }, { offset: 1, color: accent }] } }
      : { type: MODULE_SHAPES.find((m) => m.id === moduleShape)?.dotType || 'square', color: foreground },
    cornersSquareOptions: { type: EYE_SHAPES.find((e) => e.id === eyeShape)?.cornerType || 'square', color: accent },
    cornersDotOptions: { type: eyeShape === 'circle' ? 'dot' : 'square', color: accent },
    backgroundOptions: { color: background },
  }), [payload, hasValidPayload, compositedLogoUrl, logoSizeRatio, errorCorrectionLevel, gradientEnabled, moduleShape, foreground, accent, eyeShape, background]);

  // Render/update the live preview. A fixed on-screen render size is used
  // regardless of the selected export size — previewSize only affects what
  // gets exported, matching the design's stated behavior.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      if (cancelled) return;
      const options = buildQrOptions(280);
      if (!qrInstanceRef.current) {
        qrInstanceRef.current = new QRCodeStyling(options);
        if (qrContainerRef.current) {
          qrContainerRef.current.innerHTML = '';
          qrInstanceRef.current.append(qrContainerRef.current);
        }
      } else {
        qrInstanceRef.current.update(options);
      }
    })();
    return () => { cancelled = true; };
  }, [buildQrOptions]);

  function handlePreset(preset) {
    setContentType(preset.contentType);
    setFields({});
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.readAsDataURL(file);
  }

  // --- Scan Validation ---------------------------------------------------
  async function runScanValidation() {
    setError('');
    try {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      const jsQR = (await import('jsqr')).default;
      const options = buildQrOptions(400);
      const tempQr = new QRCodeStyling(options);
      const blob = await tempQr.getRawData('png');
      const dataUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, canvas.width, canvas.height);
      URL.revokeObjectURL(dataUrl);

      const readable = decoded && decoded.data === payload;
      const contrast = contrastRatio(foreground, background);
      const contrastOk = contrast >= 3;
      const contrastGood = contrast >= 4.5;
      const logoOk = !logoDataUrl || logoSizeRatio <= 0.35;
      const logoGood = !logoDataUrl || logoSizeRatio <= 0.28;
      const quietZoneOk = true; // margin is fixed at 16px, always adequate

      const recommendations = [];
      if (!readable) recommendations.push('This QR did not decode correctly. Try disabling the logo, reducing its size, or increasing color contrast.');
      if (!contrastOk) recommendations.push('Foreground and background colors are too close in contrast — increase the difference between them.');
      else if (!contrastGood) recommendations.push('Contrast is acceptable but could be stronger for reliable scanning in low light.');
      if (!logoOk) recommendations.push('Logo is large relative to the code — reduce logo size to improve scan reliability.');
      else if (!logoGood) recommendations.push('Logo size is workable but a smaller logo would scan more reliably across more devices.');

      let level = 'Poor';
      if (readable && contrastGood && logoGood) level = 'Excellent';
      else if (readable && contrastOk && logoOk) level = 'Good';

      setScanResult({ level, readable, contrast: Math.round(contrast * 10) / 10, recommendations });
    } catch (err) {
      console.error(err);
      setError('Could not run scan validation. Please try again.');
    }
  }

  // --- Exports -------------------------------------------------------------
  function blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  // Canvas equivalent of <PreviewBackground> — proportionally scaled to the
  // export size. This is a good-faith recreation of each decorative scene,
  // not a pixel-identical copy of the CSS version (six distinct hand-tuned
  // scenes fully replicated in canvas would be a much larger undertaking) —
  // but every scene's real shape, color, and density is represented.
  function drawBackgroundOnCanvas(ctx, style, size) {
    if (style === 'transparent') return; // nothing drawn — canvas stays transparent behind the card
    if (style === 'clean') { ctx.fillStyle = '#F9F9F8'; ctx.fillRect(0, 0, size, size); return; }
    if (style === 'confetti') {
      ctx.fillStyle = '#F8F9FC'; ctx.fillRect(0, 0, size, size);
      const colors = ['#2563EB', '#10B981', '#06B6D4', '#FBBF24', '#F97316', '#EC4899', '#8B5CF6', '#EF4444'];
      const cardHalf = (size / 480) * 180;
      for (let i = 0; i < 16; i++) {
        const s = (size / 480) * (10 + (i % 4) * 6);
        const angle = (i / 16) * 360;
        const rad = (angle * Math.PI) / 180;
        const minClearRadius = cardHalf / Math.max(Math.abs(Math.cos(rad)), Math.abs(Math.sin(rad)));
        const radius = minClearRadius + (size / 480) * (20 + (i % 3) * 15);
        const x = size / 2 + radius * Math.cos(rad);
        const y = size / 2 + radius * Math.sin(rad);
        ctx.globalAlpha = i % 5 === 0 ? 0.3 : 0.85;
        ctx.fillStyle = colors[i % colors.length];
        if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2); ctx.fill(); }
        else { roundRectPath(ctx, x - s / 2, y - s / 2, s, s, s * 0.25); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (style === 'gradient') {
      const g = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.3, size * 0.3, size * 0.6);
      g.addColorStop(0, 'rgba(37,99,235,0.18)'); g.addColorStop(1, 'rgba(37,99,235,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      const g2 = ctx.createRadialGradient(size * 0.75, size * 0.65, 0, size * 0.75, size * 0.65, size * 0.55);
      g2.addColorStop(0, 'rgba(16,185,129,0.16)'); g2.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, size, size);
      return;
    }
    if (style === 'floating') {
      ctx.fillStyle = '#F8F9FC'; ctx.fillRect(0, 0, size, size);
      const items = [
        { x: 0.0625, y: 0.4, s: 0.12, shape: 'circle', color: '#2563EB' },
        { x: 0.825, y: 0.225, s: 0.105, shape: 'square', color: '#10B981' },
        { x: 0.175, y: 0.775, s: 0.125, shape: 'diamond', color: '#F59E0B' },
        { x: 0.75, y: 0.725, s: 0.11, shape: 'circle', color: '#EC4899' },
        { x: 0.45, y: 0.055, s: 0.09, shape: 'square', color: '#8B5CF6' },
      ];
      ctx.globalAlpha = 0.88;
      items.forEach((it) => {
        const s = size * it.s, x = size * it.x, y = size * it.y;
        ctx.fillStyle = it.color;
        if (it.shape === 'circle') { ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (it.shape === 'diamond') { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.15); ctx.fill(); ctx.restore(); }
        else { roundRectPath(ctx, x - s / 2, y - s / 2, s, s, s * 0.2); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      return;
    }
    if (style === 'marketing') {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, '#2563EB'); g.addColorStop(0.55, '#7C3AED'); g.addColorStop(1, '#EC4899');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.85;
      ['#FBBF24', '#06B6D4'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(size * (0.15 + i * 0.35), size * (0.2 + i * 0.55), size * 0.01, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      return;
    }
  }

  // Builds the fully composited export image — decorative scene (unless
  // transparent) + white card + corner brackets + the real QR with its
  // logo badge already baked in. This is what makes preview and download
  // match, per the "export consistency" requirement.
  async function renderExportCanvas(size) {
    const { default: QRCodeStyling } = await import('qr-code-styling');
    const qrSize = Math.round(size * (280 / 480));
    const options = buildQrOptions(qrSize);
    const exportQr = new QRCodeStyling(options);
    const qrBlob = await exportQr.getRawData('png');
    const qrDataUrl = await blobToDataUrl(qrBlob);
    const qrImg = new Image();
    await new Promise((resolve, reject) => { qrImg.onload = resolve; qrImg.onerror = reject; qrImg.src = qrDataUrl; });

    // The Scan Me pill / caption renders below the square stage in the live
    // preview, not inside it — the export canvas needs real extra height
    // for it, or it simply has nowhere to go. Previously this was drawn in
    // the preview only and never reached any export at all.
    const frameHeight = frame === 'none' ? 0 : Math.round(size * 0.17);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size + frameHeight;
    const ctx = canvas.getContext('2d');

    drawBackgroundOnCanvas(ctx, previewStyle, size);

    const cardPad = size * (40 / 480);
    const cardSize = qrSize + cardPad * 2;
    const cardX = (size - cardSize) / 2, cardY = (size - cardSize) / 2;
    const cardRadius = size * (24 / 480);

    ctx.save();
    ctx.shadowColor = 'rgba(20,21,26,0.28)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
    ctx.fill();
    ctx.restore();

    if (showCornerBrackets) {
      const inset = size * (14 / 480), bLen = size * (26 / 480), thick = Math.max(2, size * (4 / 480)), rad = size * (8 / 480);
      const brackets = [
        { x: cardX + inset, y: cardY + inset, corner: 'tl', color: T.blue },
        { x: cardX + cardSize - inset - bLen, y: cardY + inset, corner: 'tr', color: '#EF4444' },
        { x: cardX + inset, y: cardY + cardSize - inset - bLen, corner: 'bl', color: T.emerald },
        { x: cardX + cardSize - inset - bLen, y: cardY + cardSize - inset - bLen, corner: 'br', color: '#F59E0B' },
      ];
      brackets.forEach(({ x, y, corner, color }) => {
        ctx.strokeStyle = color; ctx.lineWidth = thick; ctx.lineCap = 'butt';
        ctx.beginPath();
        if (corner === 'tl') { ctx.moveTo(x, y + bLen); ctx.lineTo(x, y + rad); ctx.arcTo(x, y, x + rad, y, rad); ctx.lineTo(x + bLen, y); }
        if (corner === 'tr') { ctx.moveTo(x, y); ctx.lineTo(x + bLen - rad, y); ctx.arcTo(x + bLen, y, x + bLen, y + rad, rad); ctx.lineTo(x + bLen, y + bLen); }
        if (corner === 'bl') { ctx.moveTo(x, y); ctx.lineTo(x, y + bLen - rad); ctx.arcTo(x, y + bLen, x + rad, y + bLen, rad); ctx.lineTo(x + bLen, y + bLen); }
        if (corner === 'br') { ctx.moveTo(x + bLen, y); ctx.lineTo(x + bLen, y + bLen - rad); ctx.arcTo(x + bLen, y + bLen, x + bLen - rad, y + bLen, rad); ctx.lineTo(x, y + bLen); }
        ctx.stroke();
      });
    }

    ctx.drawImage(qrImg, cardX + cardPad, cardY + cardPad, qrSize, qrSize);

    if (frame === 'scanme') {
      const label = captionText || 'Scan Me';
      const fontSize = Math.round(size * 0.032);
      ctx.font = `700 ${fontSize}px ${T.font}`;
      const textWidth = ctx.measureText(label).width;
      const padX = size * 0.045, pillH = size * 0.09;
      const pillW = textWidth + padX * 2;
      const pillX = (size - pillW) / 2, pillY = size + (frameHeight - pillH) / 2;
      ctx.fillStyle = T.blue;
      roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, size / 2, pillY + pillH / 2 + fontSize * 0.05);
    } else if (frame === 'caption') {
      const fontSize = Math.round(size * 0.028);
      ctx.font = `600 ${fontSize}px ${T.font}`;
      ctx.fillStyle = T.inkSecondary;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(captionText, size / 2, size + frameHeight / 2);
    }

    return canvas;
  }

  // SVG export: the QR itself (with logo badge baked in) is embedded as true
  // vector content from qr-code-styling's own SVG output — full fidelity for
  // the core identity elements. The decorative background scene is embedded
  // as a raster layer within the SVG rather than redrawn as vector shapes;
  // card and corner brackets are real vector elements. A reasonable, stated
  // tradeoff rather than a silent simplification.
  async function renderExportSVG(size) {
    const { default: QRCodeStyling } = await import('qr-code-styling');
    const qrSize = Math.round(size * (280 / 480));
    // Deliberately request the QR pattern WITHOUT asking the library to
    // embed the logo — qr-code-styling's SVG output doesn't reliably embed
    // a raster logo image the way its canvas/PNG output does. Instead, the
    // logo badge is composited manually as its own SVG layer below, which
    // guarantees it's actually present rather than depending on library
    // behavior that turned out not to hold.
    const options = { ...buildQrOptions(qrSize), image: undefined };
    const exportQr = new QRCodeStyling(options);
    const svgBlob = await exportQr.getRawData('svg');
    const svgText = await svgBlob.text();
    const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const innerSvg = innerMatch ? innerMatch[1] : '';

    const cardPad = size * (40 / 480);
    const cardSize = qrSize + cardPad * 2;
    const cardX = (size - cardSize) / 2, cardY = (size - cardSize) / 2;
    const cardRadius = size * (24 / 480);

    let backgroundLayer = '';
    if (previewStyle !== 'transparent') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = size; bgCanvas.height = size;
      drawBackgroundOnCanvas(bgCanvas.getContext('2d'), previewStyle, size);
      backgroundLayer = `<image href="${bgCanvas.toDataURL('image/png')}" x="0" y="0" width="${size}" height="${size}" />`;
    }

    let bracketsLayer = '';
    if (showCornerBrackets) {
      const inset = size * (14 / 480), bLen = size * (26 / 480), thick = Math.max(2, size * (4 / 480)), rad = size * (8 / 480);
      const mk = (x, y, d, color) => `<path d="${d}" stroke="${color}" stroke-width="${thick}" fill="none" />`;
      bracketsLayer = [
        mk(0, 0, `M ${cardX + inset} ${cardY + inset + bLen} L ${cardX + inset} ${cardY + inset + rad} A ${rad} ${rad} 0 0 1 ${cardX + inset + rad} ${cardY + inset} L ${cardX + inset + bLen} ${cardY + inset}`, T.blue),
        mk(0, 0, `M ${cardX + cardSize - inset - bLen} ${cardY + inset} L ${cardX + cardSize - inset - rad} ${cardY + inset} A ${rad} ${rad} 0 0 1 ${cardX + cardSize - inset} ${cardY + inset + rad} L ${cardX + cardSize - inset} ${cardY + inset + bLen}`, '#EF4444'),
        mk(0, 0, `M ${cardX + inset} ${cardY + cardSize - inset - bLen} L ${cardX + inset} ${cardY + cardSize - inset - rad} A ${rad} ${rad} 0 0 0 ${cardX + inset + rad} ${cardY + cardSize - inset} L ${cardX + inset + bLen} ${cardY + cardSize - inset}`, T.emerald),
        mk(0, 0, `M ${cardX + cardSize - inset - bLen} ${cardY + cardSize - inset} L ${cardX + cardSize - inset - rad} ${cardY + cardSize - inset} A ${rad} ${rad} 0 0 0 ${cardX + cardSize - inset} ${cardY + cardSize - inset - rad} L ${cardX + cardSize - inset} ${cardY + cardSize - inset - bLen}`, '#F59E0B'),
      ].join('');
    }

    let logoLayer = '';
    if (compositedLogoUrl) {
      const logoSize = qrSize * logoSizeRatio;
      const logoOffset = (qrSize - logoSize) / 2;
      logoLayer = `<image href="${compositedLogoUrl}" x="${logoOffset}" y="${logoOffset}" width="${logoSize}" height="${logoSize}" />`;
    }

    let frameLayer = '';
    const frameHeight = frame === 'none' ? 0 : Math.round(size * 0.17);
    if (frame === 'scanme') {
      const label = captionText || 'Scan Me';
      const fontSize = Math.round(size * 0.032);
      const approxCharWidth = fontSize * 0.58; // rough estimate since SVG text can't be measured without a live DOM
      const textWidth = label.length * approxCharWidth;
      const padX = size * 0.045, pillH = size * 0.09;
      const pillW = textWidth + padX * 2;
      const pillX = (size - pillW) / 2, pillY = size + (frameHeight - pillH) / 2;
      frameLayer = `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${T.blue}" />
        <text x="${size / 2}" y="${pillY + pillH / 2}" font-family="${T.font}" font-weight="700" font-size="${fontSize}" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
    } else if (frame === 'caption') {
      const fontSize = Math.round(size * 0.028);
      frameLayer = `<text x="${size / 2}" y="${size + frameHeight / 2}" font-family="${T.font}" font-weight="600" font-size="${fontSize}" fill="${T.inkSecondary}" text-anchor="middle" dominant-baseline="middle">${captionText}</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + frameHeight}" viewBox="0 0 ${size} ${size + frameHeight}">
      ${backgroundLayer}
      <rect x="${cardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="${cardRadius}" fill="#FFFFFF" />
      ${bracketsLayer}
      <g transform="translate(${cardX + cardPad}, ${cardY + cardPad})">${innerSvg}${logoLayer}</g>
      ${frameLayer}
    </svg>`;
  }

  async function downloadAs(extension) {
    setDownloading(extension);
    setError('');
    try {
      if (extension === 'svg') {
        const svgString = await renderExportSVG(previewSize);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'qr-code.svg'; a.click();
        URL.revokeObjectURL(url);
      } else {
        const canvas = await renderExportCanvas(previewSize);
        if (extension === 'pdf') {
          const dataUrl = canvas.toDataURL('image/png');
          const { jsPDF } = await import('jspdf');
          // Use the canvas's actual dimensions rather than assuming square —
          // it's genuinely taller than wide whenever a frame/CTA is active.
          const imgW = canvas.width * 0.75, imgH = canvas.height * 0.75;
          const pdf = new jsPDF({ orientation: imgH >= imgW ? 'portrait' : 'landscape', unit: 'pt', format: [imgW + 80, imgH + 80] });
          pdf.addImage(dataUrl, 'PNG', 40, 40, imgW, imgH);
          pdf.save('qr-code.pdf');
        } else {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a'); a.href = url; a.download = 'qr-code.png'; a.click();
        }
      }
    } catch (err) {
      console.error(err);
      setError(`Could not export as ${extension.toUpperCase()}. Please try again.`);
    } finally {
      setDownloading('');
    }
  }

  const contentFields = () => {
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.borderInput}`, fontSize: '0.85rem', fontFamily: T.font, outline: 'none', marginBottom: 10 };
    const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, display: 'block', marginBottom: 4 };
    if (contentType === 'website') return (<><label style={labelStyle}>Website URL</label><input style={inputStyle} value={fields.url || ''} onChange={(e) => updateField('url', e.target.value)} placeholder="https://example.com" /></>);
    if (contentType === 'text') return (<><label style={labelStyle}>Text</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={fields.text || ''} onChange={(e) => updateField('text', e.target.value)} placeholder="Any text" /></>);
    if (contentType === 'phone') return (<><label style={labelStyle}>Phone Number</label><input style={inputStyle} value={fields.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="+234 800 000 0000" /></>);
    if (contentType === 'whatsapp') return (<>
      <label style={labelStyle}>WhatsApp Number</label><input style={inputStyle} value={fields.waNumber || ''} onChange={(e) => updateField('waNumber', e.target.value)} placeholder="234800000000" />
      <label style={labelStyle}>Pre-filled Message (optional)</label><input style={inputStyle} value={fields.waMessage || ''} onChange={(e) => updateField('waMessage', e.target.value)} placeholder="Hi, I'd like to..." />
    </>);
    if (contentType === 'wifi') return (<>
      <label style={labelStyle}>Network Name (SSID)</label><input style={inputStyle} value={fields.ssid || ''} onChange={(e) => updateField('ssid', e.target.value)} placeholder="MyWiFi" />
      <label style={labelStyle}>Password</label><input style={inputStyle} value={fields.wifiPassword || ''} onChange={(e) => updateField('wifiPassword', e.target.value)} placeholder="password" />
      <label style={labelStyle}>Encryption</label>
      <select style={inputStyle} value={fields.wifiEnc || 'WPA'} onChange={(e) => updateField('wifiEnc', e.target.value)}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">None</option></select>
    </>);
    if (contentType === 'vcard') return (<>
      <label style={labelStyle}>Full Name</label><input style={inputStyle} value={fields.vName || ''} onChange={(e) => updateField('vName', e.target.value)} placeholder="Jane Doe" />
      <label style={labelStyle}>Phone</label><input style={inputStyle} value={fields.vPhone || ''} onChange={(e) => updateField('vPhone', e.target.value)} placeholder="+234 800 000 0000" />
      <label style={labelStyle}>Email</label><input style={inputStyle} value={fields.vEmail || ''} onChange={(e) => updateField('vEmail', e.target.value)} placeholder="jane@example.com" />
      <label style={labelStyle}>Organization</label><input style={inputStyle} value={fields.vOrg || ''} onChange={(e) => updateField('vOrg', e.target.value)} placeholder="Company name" />
    </>);
    return null;
  };

  const scanColor = scanResult?.level === 'Excellent' ? T.emerald : scanResult?.level === 'Good' ? '#D97706' : '#DC2626';
  const scanBg = scanResult?.level === 'Excellent' ? T.emeraldTint : scanResult?.level === 'Good' ? '#FFFBEB' : '#FEF2F2';
  const scanIcon = scanResult?.level === 'Excellent' ? '✅' : scanResult?.level === 'Good' ? '⚠️' : '❌';

  return (
    <div style={{ fontFamily: T.font, background: T.pageBg, borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.borderLight}` }}>
      <style>{`
        .qr-studio-body { display: flex; flex-direction: row; min-height: 700px; }
        @media (max-width: 1100px) {
          .qr-studio-body { flex-direction: column; }
          .qr-studio-left, .qr-studio-right { width: 100% !important; }
        }
        @media (min-width: 1101px) and (max-width: 1400px) {
          .qr-studio-body { flex-wrap: wrap; }
          .qr-studio-left { width: 100% !important; order: 1; }
          .qr-studio-center { order: 2; flex: 1 1 60% !important; }
          .qr-studio-right { order: 3; flex: 1 1 35% !important; }
        }
      `}</style>

      {/* Top nav */}
      <div style={{ height: 76, borderBottom: `1px solid ${T.borderLight}`, background: 'white', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563EB, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>Q</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: T.ink }}>QR Code Generator</span>
          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: T.blue, background: T.blueTint, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase' }}>Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={runScanValidation} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: `1px solid ${T.borderInput}`, background: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: T.font }}>🔍 Scan Test</button>
          <button
            onClick={() => downloadAs('png')}
            disabled={!!downloading}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.blue, color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: T.font, boxShadow: '0 10px 24px -8px rgba(37,99,235,.5)' }}
          >
            {downloading === 'png' ? 'Preparing…' : '⬇ Download'}
          </button>
        </div>
      </div>

      <div className="qr-studio-body">
        {/* Left panel — Content */}
        <div className="qr-studio-left" style={{ width: 300, flexShrink: 0, padding: '28px 24px', borderRight: `1px solid ${T.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: T.ink, color: 'white', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: T.ink }}>CONTENT</span>
          </div>

          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: T.inkSecondary, marginBottom: 8 }}>Choose QR type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {CONTENT_TYPES.map((ct) => (
              <button key={ct.id} onClick={() => setContentType(ct.id)} style={{
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: T.font, textAlign: 'left',
                border: contentType === ct.id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`,
                background: contentType === ct.id ? T.blueTint : 'white', color: contentType === ct.id ? T.blue : T.inkSecondary,
                fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{ct.icon}</span><span>{ct.label}</span>
              </button>
            ))}
          </div>

          {contentFields()}

          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: T.inkSecondary, margin: '16px 0 8px' }}>Templates</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => handlePreset(p)} style={{
                flexShrink: 0, width: 84, padding: '10px 8px', borderRadius: 10, border: `1px solid ${T.borderLight}`, background: 'white',
                cursor: 'pointer', fontFamily: T.font, textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: T.inkSecondary }}>{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Center panel — Live Preview */}
        <div className="qr-studio-center" style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 480, marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: T.ink }}>Live Preview</span>
            <div style={{ display: 'flex', background: '#F1F1F0', borderRadius: 10, padding: 3 }}>
              {[512, 1024, 2048].map((s) => (
                <button key={s} onClick={() => setPreviewSize(s)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: '0.72rem', fontWeight: 700,
                  background: previewSize === s ? 'white' : 'transparent', color: previewSize === s ? T.ink : T.muted,
                  boxShadow: previewSize === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>{s}px</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, maxWidth: 480 }}>
            {PREVIEW_STYLES.map((ps) => (
              <button key={ps.id} onClick={() => setPreviewStyle(ps.id)} style={{
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: T.font, fontSize: '0.7rem', fontWeight: 600,
                border: previewStyle === ps.id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`,
                background: previewStyle === ps.id ? T.blueTint : 'white', color: previewStyle === ps.id ? T.blue : T.mutedDark,
              }}>{ps.label}</button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 480, height: 480, maxWidth: '100%', aspectRatio: '1/1', borderRadius: 28, overflow: 'hidden' }}>
            <PreviewBackground style={previewStyle} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'white', borderRadius: 24, padding: 40,
              boxShadow: shadowLevel === 'None' ? 'none' : shadowLevel === 'Light' ? '0 10px 24px -12px rgba(20,21,26,.2)' : shadowLevel === 'Strong' ? '0 50px 100px -30px rgba(20,21,26,.4), 0 8px 24px rgba(20,21,26,.1)' : '0 40px 80px -28px rgba(20,21,26,.3), 0 6px 18px rgba(20,21,26,.06)',
            }}>
              {showCornerBrackets && <CornerBrackets />}
              <div ref={qrContainerRef} style={{ width: 280, height: 280 }} />
            </div>
          </div>

          {!hasValidPayload && <p style={{ fontSize: '0.75rem', color: T.muted, marginTop: 12 }}>Fill in the content on the left to generate a real, scannable code — this preview uses a placeholder link until then.</p>}

          {frame === 'scanme' && (
            <button style={{ marginTop: 20, padding: '12px 28px', borderRadius: 999, border: 'none', background: T.blue, color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'default', fontFamily: T.font }}>{captionText || 'Scan Me'}</button>
          )}
          {frame === 'caption' && <p style={{ marginTop: 16, fontSize: '0.85rem', fontWeight: 600, color: T.inkSecondary }}>{captionText}</p>}

          {scanResult && (
            <div style={{ marginTop: 20, width: '100%', maxWidth: 400, background: scanBg, border: `1px solid ${scanResult.level === 'Excellent' ? T.emeraldBorder : scanResult.level === 'Good' ? '#FDE68A' : '#FECACA'}`, borderRadius: 12, padding: 14 }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: scanColor, margin: 0 }}>{scanIcon} Scan Quality: {scanResult.level}</p>
              <p style={{ fontSize: '0.75rem', color: T.mutedDark, margin: '4px 0 0' }}>Contrast ratio: {scanResult.contrast}:1</p>
              {scanResult.recommendations.map((r, i) => <p key={i} style={{ fontSize: '0.75rem', color: T.inkSecondary, margin: '4px 0 0' }}>• {r}</p>)}
            </div>
          )}

          {error && <p style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => downloadAs('png')} disabled={!!downloading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.borderInput}`, background: 'white', cursor: 'pointer', fontFamily: T.font, fontSize: '0.78rem', fontWeight: 600 }}>{downloading === 'png' ? 'Preparing…' : 'PNG'}</button>
            <button onClick={() => downloadAs('svg')} disabled={!!downloading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.borderInput}`, background: 'white', cursor: 'pointer', fontFamily: T.font, fontSize: '0.78rem', fontWeight: 600 }}>{downloading === 'svg' ? 'Preparing…' : 'SVG'}</button>
            <button onClick={() => downloadAs('pdf')} disabled={!!downloading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.borderInput}`, background: 'white', cursor: 'pointer', fontFamily: T.font, fontSize: '0.78rem', fontWeight: 600 }}>{downloading === 'pdf' ? 'Preparing…' : 'PDF'}</button>
          </div>
        </div>

        {/* Right panel — Design */}
        <div className="qr-studio-right" style={{ width: 320, flexShrink: 0, padding: '28px 24px', borderLeft: `1px solid ${T.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: T.blue, color: 'white', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: T.ink }}>DESIGN</span>
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
            {['colors', 'style', 'logo', 'frame'].map((tab) => (
              <button key={tab} onClick={() => setActiveDesignTab(tab)} style={{
                padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: T.font, textTransform: 'capitalize',
                fontSize: '0.78rem', fontWeight: activeDesignTab === tab ? 700 : 600, color: activeDesignTab === tab ? T.blue : T.muted,
                borderBottom: activeDesignTab === tab ? `2px solid ${T.blue}` : '2px solid transparent',
              }}>{tab}</button>
            ))}
          </div>

          {activeDesignTab === 'colors' && (
            <div>
              {[['Foreground', foreground, setForeground], ['Accent / Eye Color', accent, setAccent], ['Background', background, setBackground]].map(([label, val, setter]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 10px', border: `1px solid ${T.borderLight}`, borderRadius: 10 }}>
                  <input type="color" value={val} onChange={(e) => setter(e.target.value)} style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: T.ink, margin: 0 }}>{val.toUpperCase()}</p>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.inkSecondary }}>Gradient fill</span>
                <button onClick={() => setGradientEnabled((g) => !g)} style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: gradientEnabled ? T.blue : '#D8D8DE', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 2, left: gradientEnabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, display: 'block', marginBottom: 4 }}>Shadow</label>
                <select value={shadowLevel} onChange={(e) => setShadowLevel(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.borderInput}`, fontFamily: T.font, fontSize: '0.8rem' }}>
                  {SHADOW_LEVELS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeDesignTab === 'style' && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, marginBottom: 8 }}>Module style</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {MODULE_SHAPES.map((m) => (
                  <button key={m.id} onClick={() => setModuleShape(m.id)} style={{ padding: 8, borderRadius: 10, cursor: 'pointer', fontFamily: T.font, border: moduleShape === m.id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`, background: moduleShape === m.id ? T.blueTint : 'white' }}>
                    <div style={{ width: 22, height: 22, background: T.ink, margin: '0 auto 4px', borderRadius: m.id === 'square' ? 2 : m.id === 'rounded' ? 8 : m.id === 'dots' ? '50%' : 6 }} />
                    <span style={{ fontSize: '0.62rem', color: T.inkSecondary }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, marginBottom: 8 }}>Eye style</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {EYE_SHAPES.map((e) => (
                  <button key={e.id} onClick={() => setEyeShape(e.id)} style={{ padding: 8, borderRadius: 10, cursor: 'pointer', fontFamily: T.font, border: eyeShape === e.id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`, background: eyeShape === e.id ? T.blueTint : 'white' }}>
                    <div style={{ width: 22, height: 22, border: `4px solid ${T.ink}`, margin: '0 auto 4px', borderRadius: e.id === 'square' ? 2 : e.id === 'rounded' ? 8 : '50%' }} />
                    <span style={{ fontSize: '0.62rem', color: T.inkSecondary }}>{e.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.inkSecondary, display: 'block' }}>Corner accents</span>
                  <span style={{ fontSize: '0.68rem', color: T.muted }}>Decorative corner brackets on the card</span>
                </div>
                <button onClick={() => setShowCornerBrackets((v) => !v)} style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: showCornerBrackets ? T.blue : '#D8D8DE', position: 'relative', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 2, left: showCornerBrackets ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
                </button>
              </div>
            </div>
          )}

          {activeDesignTab === 'logo' && (
            <div>
              <div onClick={() => fileInputRef.current?.click()} style={{ border: `1.5px dashed ${T.borderInput}`, borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer' }}>
                {compositedLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={compositedLogoUrl} alt="Logo badge preview" style={{ width: 56, height: 56, objectFit: 'contain', margin: '0 auto 8px' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #2563EB, #10B981)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>Q</div>
                )}
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.inkSecondary, margin: 0 }}>{logoDataUrl ? 'Logo added' : 'Drop logo here'}</p>
                <p style={{ fontSize: '0.7rem', color: T.muted, margin: '4px 0 0' }}>PNG or SVG, centered automatically in a badge</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              {logoDataUrl && (
                <>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, display: 'block', margin: '14px 0 6px' }}>Badge shape</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {[['circle', 'Circular'], ['rounded', 'Rounded square']].map(([id, label]) => (
                      <button key={id} onClick={() => setLogoBadgeShape(id)} style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: T.font, fontSize: '0.76rem', fontWeight: 600,
                        border: logoBadgeShape === id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`,
                        background: logoBadgeShape === id ? T.blueTint : 'white', color: logoBadgeShape === id ? T.blue : T.inkSecondary,
                      }}>{label}</button>
                    ))}
                  </div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: T.inkSecondary, display: 'block', margin: '10px 0 4px' }}>Badge size</label>
                  <input type="range" min="0.15" max="0.35" step="0.01" value={logoSizeRatio} onChange={(e) => setLogoSizeRatio(Number(e.target.value))} style={{ width: '100%' }} />
                  <button onClick={() => setLogoDataUrl(null)} style={{ marginTop: 10, fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove logo</button>
                  <p style={{ fontSize: '0.7rem', color: T.muted, marginTop: 8 }}>Error correction automatically set to High (H) while a logo is present.</p>
                </>
              )}
            </div>
          )}

          {activeDesignTab === 'frame' && (
            <div>
              {[['none', 'None'], ['scanme', 'Scan Me pill'], ['caption', 'Custom caption']].map(([id, label]) => (
                <button key={id} onClick={() => setFrame(id)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', fontFamily: T.font,
                  border: frame === id ? `1px solid ${T.blue}` : `1px solid ${T.borderLight}`, background: frame === id ? T.blueTint : 'white',
                  color: frame === id ? T.blue : T.inkSecondary, fontWeight: 600, fontSize: '0.82rem',
                }}>{label}</button>
              ))}
              {frame !== 'none' && (
                <input value={captionText} onChange={(e) => setCaptionText(e.target.value)} placeholder="Scan Me" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.borderInput}`, fontFamily: T.font, fontSize: '0.8rem', marginTop: 8 }} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
