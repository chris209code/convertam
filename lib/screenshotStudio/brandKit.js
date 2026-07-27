// Brand Kit: a logo and a few brand colors, stored locally in the browser
// and read by every Screenshot Studio workspace's Background picker and
// export step. No account, no upload — same rule as everything else here.
const STORAGE_KEY = 'convertam.screenshotStudio.brandKit';
const MAX_LOGO_DIM = 240;

const EMPTY = { logo: null, colors: [] };

export function getBrandKit() {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { logo: parsed.logo || null, colors: Array.isArray(parsed.colors) ? parsed.colors.slice(0, 3) : [] };
  } catch {
    return EMPTY;
  }
}

export function saveBrandKit(patch) {
  if (typeof window === 'undefined') return;
  const next = { ...getBrandKit(), ...patch };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearBrandKit() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Downscales before storing — a logo only ever needs to be big enough for a
// small corner badge, and keeping it small keeps localStorage lean.
export function downscaleLogoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    if (!dataURL) return resolve(null);
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}
