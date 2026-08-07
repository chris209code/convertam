'use client';

// QR Code is a page-spanning "rule" object like pageNumber.js — one placed
// object can apply to many pages via pagesRule (see ../pageSelection.js),
// unlike Image/Logo which are always single-page. It always uses the same
// fixed x/y/w/h on every target page — a QR code is small and meant to sit
// in a consistent spot (e.g. bottom-right), so there's no real "avoid
// overlapping content" problem worth solving here.
//
// The actual QR matrix is generated client-side via the same
// qr-code-styling + generateQrDataUrl() helper already used by Invoice
// Generator / Business Document Studio (lib/invoice-studio/qrGenerate.js)
// — real, scannable output, not a placeholder graphic. Generation is
// async, so `dataUrl` starts null and is filled in by the workspace after
// insertion (see PdfLayoutStudioWorkspace.js's addQrCode/regenerateQrCode).
export const interaction = 'select';

export function createDefaults({ value = 'https://', color = '#0F172A', dataUrl = null } = {}) {
  return {
    value, color, dataUrl, pagesRule: 'current', customRange: '',
    opacity: 1, w: 110, h: 110,
  };
}

export function Content({ obj }) {
  if (!obj.dataUrl) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed #CBD5E1', borderRadius: 6, fontSize: '0.62rem', color: '#94A3B8',
        textAlign: 'center', padding: 4, cursor: 'move',
      }}>
        Generating…
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={obj.dataUrl}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: obj.opacity ?? 1, cursor: 'move', pointerEvents: 'none' }}
    />
  );
}
