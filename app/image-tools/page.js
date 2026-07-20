import ToolHubClient from '../../components/ToolHubClient';
import { ImageIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Image Tools — Convertam',
  description: 'Free image tools. Convert, compress, resize and edit images. No login required.',
};

const SECTIONS = [
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
      { slug: 'meme-generator', title: 'Meme Generator', desc: 'Add classic bold top/bottom captions to any image', icon: '😄', badge: 'free' },
      { slug: 'document-enhancer', title: 'Document Enhancer', desc: 'Remove shadows and enhance scanned documents', icon: '✨', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

export default function ImageToolsPage() {
  return (
    <ToolHubClient
      accent={CATEGORY_ACCENTS.image}
      icon={ImageIcon}
      title="Image Tools"
      subtitle="Convert, compress, resize and edit images — all free, all in your browser."
      searchPlaceholder="Search image tools…"
      featured={{ slug: 'image-compressor', href: '/image-compressor', icon: '🗜️', title: 'Image Compressor', desc: 'The fastest way to shrink a photo for the web or email without losing visible quality.' }}
      sections={SECTIONS_WITH_HREF}
    />
  );
}
