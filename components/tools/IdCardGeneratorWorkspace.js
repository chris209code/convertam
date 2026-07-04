'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const THEMES = {
  corporate: {
    name: 'Corporate Blue',
    bg: '#1E3A8A',
    bgGradientTo: '#3B82F6',
    accent: '#FBBF24',
    text: '#FFFFFF',
    subtext: '#DBEAFE',
  },
  minimal: {
    name: 'Minimal White',
    bg: '#FFFFFF',
    bgGradientTo: '#F1F5F9',
    accent: '#0F172A',
    text: '#0F172A',
    subtext: '#475569',
  },
  emerald: {
    name: 'Emerald Student',
    bg: '#065F46',
    bgGradientTo: '#10B981',
    accent: '#FEF3C7',
    text: '#FFFFFF',
    subtext: '#D1FAE5',
  },
};

// CR80 card size at 300dpi for crisp download, scaled down for on-screen preview
const CARD_W = 1013; // px @300dpi (3.375in)
const CARD_H = 638; // px @300dpi (2.125in)
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

function drawCard(canvas, { side, theme, form, photoImg }) {
  const ctx = canvas.getContext('2d');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  // Card background with rounded corners + gradient
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.save();
  ctx.clip();
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, theme.bgGradientTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (side === 'front') {
    // Top accent bar
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 0, CARD_W, 16);

    // Org name
    ctx.fillStyle = theme.text;
    ctx.font = '700 42px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(form.orgName || 'Your Organization', 48, 48);

    ctx.font = '400 24px Arial, sans-serif';
    ctx.fillStyle = theme.subtext;
    ctx.fillText(form.orgTagline || 'Official ID Card', 48, 100);

    // Photo box
    const photoX = 48, photoY = 160, photoSize = 280;
    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 16);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    if (photoImg) {
      // cover-fit
      const ratio = Math.max(photoSize / photoImg.width, photoSize / photoImg.height);
      const w = photoImg.width * ratio, h = photoImg.height * ratio;
      ctx.drawImage(photoImg, photoX + (photoSize - w) / 2, photoY + (photoSize - h) / 2, w, h);
    } else {
      ctx.fillStyle = theme.subtext;
      ctx.font = '400 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PHOTO', photoX + photoSize / 2, photoY + photoSize / 2 - 10);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 16);
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.accent;
    ctx.stroke();
    ctx.restore();

    // Text info to the right of photo
    const infoX = photoX + photoSize + 40;
    let infoY = photoY + 8;
    ctx.fillStyle = theme.text;
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText(form.fullName || 'Full Name', infoX, infoY);
    infoY += 46;

    ctx.font = '400 24px Arial, sans-serif';
    ctx.fillStyle = theme.subtext;
    ctx.fillText(form.role || 'Title / Role', infoX, infoY);
    infoY += 50;

    const rows = [
      ['ID No.', form.idNumber || '—'],
      ['Blood Group', form.bloodGroup || '—'],
      ['Valid From', formatDate(form.validFrom) || '—'],
      ['Valid Until', formatDate(form.validUntil) || '—'],
    ];
    rows.forEach(([label, val]) => {
      ctx.font = '600 18px Arial, sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.fillText(label.toUpperCase(), infoX, infoY);
      ctx.font = '400 24px Arial, sans-serif';
      ctx.fillStyle = theme.text;
      ctx.fillText(val, infoX, infoY + 24);
      infoY += 62;
    });

    // Bottom strip - signature line
    ctx.strokeStyle = theme.subtext;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, CARD_H - 60);
    ctx.lineTo(320, CARD_H - 60);
    ctx.stroke();
    ctx.font = '400 18px Arial, sans-serif';
    ctx.fillStyle = theme.subtext;
    ctx.fillText('Authorized Signature', 48, CARD_H - 50);

    ctx.font = '400 20px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.subtext;
    ctx.fillText('convertam.app', CARD_W - 40, CARD_H - 44);
    ctx.textAlign = 'left';
  } else {
    // BACK SIDE
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 0, CARD_W, 16);

    ctx.fillStyle = theme.text;
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillText('Contact & Address', 48, 50);

    ctx.font = '400 22px Arial, sans-serif';
    ctx.fillStyle = theme.subtext;
    const lines = [
      form.address && `Address: ${form.address}`,
      form.phone && `Phone: ${form.phone}`,
      form.email && `Email: ${form.email}`,
      form.emergencyContact && `Emergency Contact: ${form.emergencyContact}`,
    ].filter(Boolean);

    let y = 120;
    lines.forEach((line) => {
      ctx.fillText(line, 48, y);
      y += 42;
    });

    if (form.terms) {
      ctx.font = '400 18px Arial, sans-serif';
      ctx.fillStyle = theme.subtext;
      wrapText(ctx, form.terms, 48, y + 20, CARD_W - 96, 26);
    }

    ctx.font = '400 18px Arial, sans-serif';
    ctx.fillStyle = theme.subtext;
    ctx.textAlign = 'center';
    ctx.fillText('If found, please return to the organization above.', CARD_W / 2, CARD_H - 44);
    ctx.textAlign = 'left';
  }

  ctx.restore();
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

const emptyForm = {
  orgName: '',
  orgTagline: '',
  fullName: '',
  role: '',
  idNumber: '',
  bloodGroup: '',
  validFrom: '',
  validUntil: '',
  address: '',
  phone: '',
  email: '',
  emergencyContact: '',
  terms: 'This card remains the property of the issuing organization and must be surrendered upon request.',
};

export default function IdCardGeneratorWorkspace() {
  const [form, setForm] = useState(emptyForm);
  const [themeKey, setThemeKey] = useState('corporate');
  const [side, setSide] = useState('front');
  const [photoImg, setPhotoImg] = useState(null);
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const theme = THEMES[themeKey];

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
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

  const render = useCallback(() => {
    if (frontCanvasRef.current) {
      drawCard(frontCanvasRef.current, { side: 'front', theme, form, photoImg });
    }
    if (backCanvasRef.current) {
      drawCard(backCanvasRef.current, { side: 'back', theme, form, photoImg });
    }
  }, [theme, form, photoImg]);

  useEffect(() => {
    render();
  }, [render]);

  function download(canvasRef, filename) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function downloadBoth() {
    download(frontCanvasRef, `${(form.fullName || 'id-card').replace(/\s+/g, '-').toLowerCase()}-front.png`);
    setTimeout(() => {
      download(backCanvasRef, `${(form.fullName || 'id-card').replace(/\s+/g, '-').toLowerCase()}-back.png`);
    }, 300);
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const fieldWrap = { marginBottom: 12 };

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 32 }}>
        {/* FORM SIDE */}
        <div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Theme</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: themeKey === key ? `2px solid ${t.bg}` : '1px solid #E2E8F0',
                    background: t.bg,
                    color: t.text,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Photo</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Organization Name</label>
              <input style={inputStyle} value={form.orgName} onChange={(e) => update('orgName', e.target.value)} placeholder="Acme Corp" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Tagline (optional)</label>
              <input style={inputStyle} value={form.orgTagline} onChange={(e) => update('orgTagline', e.target.value)} placeholder="Official ID Card" />
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
              <label style={labelStyle}>ID Number</label>
              <input style={inputStyle} value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} placeholder="EMP-00123" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Blood Group (optional)</label>
              <input style={inputStyle} value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} placeholder="O+" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Valid From</label>
              <input type="date" style={inputStyle} value={form.validFrom} onChange={(e) => update('validFrom', e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Valid Until</label>
              <input type="date" style={inputStyle} value={form.validUntil} onChange={(e) => update('validUntil', e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Back of Card (optional)
          </p>

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
          <div style={fieldWrap}>
            <label style={labelStyle}>Emergency Contact (optional)</label>
            <input style={inputStyle} value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} placeholder="Name — Phone" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Terms / Return Note</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={form.terms}
              onChange={(e) => update('terms', e.target.value)}
            />
          </div>
        </div>

        {/* PREVIEW SIDE */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setSide('front')}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                border: side === 'front' ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                background: side === 'front' ? '#EFF6FF' : 'white', color: '#1E293B',
              }}
            >
              Front
            </button>
            <button
              onClick={() => setSide('back')}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                border: side === 'back' ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                background: side === 'back' ? '#EFF6FF' : 'white', color: '#1E293B',
              }}
            >
              Back
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: '#F8FAFC', borderRadius: 16 }}>
            <div style={{ width: CARD_W * PREVIEW_SCALE, height: CARD_H * PREVIEW_SCALE, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden' }}>
              <canvas
                ref={frontCanvasRef}
                style={{ width: '100%', height: '100%', display: side === 'front' ? 'block' : 'none' }}
              />
              <canvas
                ref={backCanvasRef}
                style={{ width: '100%', height: '100%', display: side === 'back' ? 'block' : 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={downloadBoth}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              ⬇ Download Front & Back (PNG)
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
            Downloads at print resolution (1013×638px, ~300dpi for CR80 card size)
          </p>
        </div>
      </div>
    </div>
  );
}
