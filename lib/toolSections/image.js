// Tool metadata for the Image Studio hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
  {
    id: 'all',
    label: 'All Image Tools',
    icon: '🖼️',
    tools: [
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', desc: 'Combine JPG photos into a single PDF', icon: '🖼️', badge: 'free' },
      { slug: 'png-to-pdf', title: 'PNG to PDF', desc: 'Combine PNG images into a single PDF', icon: '🖼️', badge: 'free' },
      { slug: 'pdf-to-jpg', title: 'PDF to JPG', desc: 'Turn each PDF page into a JPG image', icon: '🧷', badge: 'free' },
      { slug: 'image-compressor', title: 'Image Compressor', desc: 'Reduce image file size without losing quality', icon: '🗜️', badge: 'free' },
      { slug: 'resize-image', title: 'Image Resizer & Cropper', desc: 'Resize, crop and perfectly fit images for social media, profiles, banners and custom dimensions', icon: '✂️', badge: 'free' },
      { slug: 'watermark-image', title: 'Watermark Image', desc: 'Add text or logo watermarks to images', icon: '💧', badge: 'free' },
      { slug: 'convert-image-format', title: 'Image Format Converter', desc: 'Convert between JPG, PNG, and WebP', icon: '🔁', badge: 'free' },
      { slug: 'heic-to-jpg', title: 'HEIC to JPG/PNG', desc: 'Convert iPhone HEIC photos to JPG or PNG', icon: '📱', badge: 'new' },
      { slug: 'meme-generator', title: 'Meme Generator', desc: 'Add classic bold top/bottom captions to any image', icon: '😄', badge: 'free' },
      { slug: 'document-enhancer', title: 'Document Enhancer', desc: 'Remove shadows and enhance scanned documents', icon: '✨', badge: 'free' },
    ],
  },
];
