function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read generated QR code.'));
    reader.readAsDataURL(blob);
  });
}

// Real, scannable QR — same qr-code-styling library and getRawData('png')
// pattern already used by the QR Code Studio tool. Converted to a base64
// data URL (not a blob: URL) so it survives being serialized into a saved
// draft and restored after a page reload.
export async function generateQrDataUrl(value, { color = '#0F172A' } = {}) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const { default: QRCodeStyling } = await import('qr-code-styling');
  const qr = new QRCodeStyling({
    width: 320,
    height: 320,
    data: trimmed,
    margin: 8,
    dotsOptions: { type: 'square', color },
    backgroundOptions: { color: '#ffffff' },
    qrOptions: { errorCorrectionLevel: 'M' },
  });
  const blob = await qr.getRawData('png');
  return blobToDataUrl(blob);
}
