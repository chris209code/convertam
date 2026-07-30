import CategoryLandingClient from '../../components/CategoryLandingClient';
import { ImageIcon, CATEGORY_ACCENTS, relatedSuites } from '../../components/categoryVisuals';
import { buildOgMeta } from '../../lib/pageMetadata';
import { SECTIONS } from '../../lib/toolSections/image';

const TITLE = 'Image Tools — Convertam';
const DESCRIPTION = 'Free image tools. Convert, compress, resize, watermark and clean up images and phone-scanned documents. No login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/image-tools' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/image-tools' }),
};

const EDITORIAL = {
  intro: [
    "Image Studio handles the everyday work around photos and image files — getting them into or out of a PDF, shrinking them for the web, cropping them to a platform's exact dimensions, watermarking them before sharing, or cleaning up a phone photo of a document until it looks like a real scan. Every tool here runs entirely in your browser, so your photos are never uploaded anywhere.",
    "Because it's all client-side processing, there's no per-use fee anywhere in this suite — compress, resize, or convert as many images as you need, in whatever batch size your browser can handle, at no cost.",
  ],
  whoFor: [
    'Anyone preparing product photos or graphics for a website or store',
    'People resizing a profile picture or banner for a specific platform',
    'Businesses watermarking photos before sharing previews publicly',
    'Anyone turning a phone photo of a document into a clean, scan-like image',
  ],
  learnLinks: [
    { title: 'JPG vs. PNG: Which Should You Use?', href: '/learn/image-guides/jpg-vs-png-which-should-you-use' },
    { title: 'How to Scan a Document With Your Phone', href: '/learn/image-guides/how-to-scan-a-document-with-your-phone' },
    { title: 'How to Compress Images Without Losing Quality', href: '/learn/image-guides/how-to-compress-images-without-losing-quality' },
  ],
};

const FAQS = [
  {
    q: 'Are these image tools really free, with no upload limits?',
    a: 'Yes — every tool in Image Studio runs entirely in your browser and is completely free, with no login and no per-file fee. Very large batches simply take a little longer to process locally.',
  },
  {
    q: 'Are my photos uploaded to a server?',
    a: 'No — image processing happens entirely on your device. Your files never leave your browser.',
  },
  {
    q: "What's the difference between Image Compressor and Image Format Converter?",
    a: 'Image Compressor reduces file size at a quality level you choose, keeping the same format. Image Format Converter changes the file type (JPG, PNG, WebP) at a fixed quality — use Compressor when size is the goal, Converter when format is.',
  },
  {
    q: 'Can I process multiple images at once?',
    a: 'Yes — Image Compressor, Watermark Image, and Image Format Converter all support batch uploads, processing and downloading several images in one pass.',
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('image-tools');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function ImageToolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.image}
        icon={ImageIcon}
        title="Image Tools"
        subtitle="Convert, compress, resize and edit images — all free, all in your browser."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
