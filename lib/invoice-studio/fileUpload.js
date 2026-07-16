export const MAX_IMAGE_MB = 5;

export function validateImageFile(file) {
  if (!file) return 'No file selected.';
  if (!/^image\//.test(file.type)) return 'Please choose an image file (PNG, JPG, WEBP).';
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Image is too large — max ${MAX_IMAGE_MB}MB.`;
  return null;
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image.'));
    img.src = src;
  });
}
