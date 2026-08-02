'use client';

// 8 preset stamps + custom image upload. Presets are rendered on the fly to
// a small offscreen canvas (rounded border + slight rotation + bold
// uppercase label, in the classic ink-stamp style) and handed back as a
// data URL — from there they're placed exactly like any other raster
// annotation (image.js's decode-cache infrastructure, shared via stamp.js).
export const STAMP_PRESETS = [
  { id: 'approved', label: 'APPROVED', color: '#059669' },
  { id: 'rejected', label: 'REJECTED', color: '#DC2626' },
  { id: 'draft', label: 'DRAFT', color: '#64748B' },
  { id: 'confidential', label: 'CONFIDENTIAL', color: '#DC2626' },
  { id: 'paid', label: 'PAID', color: '#059669' },
  { id: 'urgent', label: 'URGENT', color: '#EA580C' },
  { id: 'signed', label: 'SIGNED', color: '#2563EB' },
  { id: 'void', label: 'VOID', color: '#64748B' },
];

export function renderStampDataUrl(label, color) {
  const canvas = document.createElement('canvas');
  const scale = 3; // render at higher density than CSS size for crisp text on export
  const width = (label.length > 9 ? 220 : 160) * scale;
  const height = 56 * scale;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  const pad = 6 * scale;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  const r = 8 * scale;
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(width - pad - r, pad);
  ctx.quadraticCurveTo(width - pad, pad, width - pad, pad + r);
  ctx.lineTo(width - pad, height - pad - r);
  ctx.quadraticCurveTo(width - pad, height - pad, width - pad - r, height - pad);
  ctx.lineTo(pad + r, height - pad);
  ctx.quadraticCurveTo(pad, height - pad, pad, height - pad - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${20 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2 + scale);

  return { dataUrl: canvas.toDataURL('image/png'), width: width / scale, height: height / scale };
}

function presetBtn() {
  return {
    padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 700,
  };
}

// The tool-specific options row shown in Toolbar.js when the Stamp tool is
// active — mirrors the Shape tool's kind-picker row. Picking a preset places
// it immediately (centered on the page, like Image Insert) rather than
// requiring a second canvas click.
export default function StampPickerRow({ onPickPreset, onUploadCustom }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Stamp</span>
      {STAMP_PRESETS.map((preset) => (
        <button key={preset.id} onClick={() => onPickPreset(preset)} style={{ ...presetBtn(), color: preset.color, borderColor: preset.color }}>
          {preset.label}
        </button>
      ))}
      <label style={{ ...presetBtn(), color: '#334155', display: 'inline-flex', alignItems: 'center' }}>
        🖼️ Custom…
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUploadCustom(f); }} />
      </label>
    </div>
  );
}
