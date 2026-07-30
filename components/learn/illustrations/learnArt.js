// Learn Center illustration registry — premium raster artwork (soft 3D
// product-art style) that replaced the old flat-SVG motif library. Source
// boards are preserved at design-assets/learn-art-source/; the optimized
// runtime WebP files live in public/learn-art/. Each entry carries its
// intrinsic pixel size so <Image> can render with fixed width/height and
// avoid layout shift — these are the real dimensions of the exported file,
// not arbitrary display sizes.

export const LEARN_HERO_ART = { src: '/learn-art/learn-hero.webp', width: 389, height: 373 };

// Keyed by the same accentKey already used everywhere else (categories.js,
// CATEGORY_ACCENTS) so callers don't need a second lookup table.
export const CATEGORY_ART = {
  pdf: { src: '/learn-art/category-pdf.webp', width: 373, height: 373 },
  ai: { src: '/learn-art/category-ai.webp', width: 372, height: 373 },
  business: { src: '/learn-art/category-business.webp', width: 408, height: 373 },
  image: { src: '/learn-art/category-image.webp', width: 389, height: 375 },
  calculator: { src: '/learn-art/category-calculator.webp', width: 373, height: 375 },
  utilities: { src: '/learn-art/category-productivity.webp', width: 372, height: 375 },
  workflow: { src: '/learn-art/category-workflow.webp', width: 408, height: 375 },
};

// Keyed by each article's `illustration` field (lib/learn/articles/*.js) —
// every article now points at its own unique asset, one-to-one.
export const ARTICLE_ART = {
  mergePdfArt: { src: '/learn-art/article-merge-pdf.webp', width: 347, height: 326 },
  compressPdfArt: { src: '/learn-art/article-compress-pdf.webp', width: 324, height: 326 },
  pdfToWordArt: { src: '/learn-art/article-pdf-to-word.webp', width: 336, height: 326 },
  ocrArt: { src: '/learn-art/article-ocr.webp', width: 328, height: 326 },
  aiTranslationArt: { src: '/learn-art/article-ai-translation.webp', width: 347, height: 322 },
  aiResumeArt: { src: '/learn-art/article-ai-resume.webp', width: 324, height: 322 },
  invoiceQuotationArt: { src: '/learn-art/article-invoice-quotation.webp', width: 336, height: 322 },
  createInvoiceArt: { src: '/learn-art/article-create-invoice.webp', width: 328, height: 322 },
  digitalSignatureArt: { src: '/learn-art/article-digital-signature.webp', width: 343, height: 330 },
  jpgPngArt: { src: '/learn-art/article-jpg-vs-png.webp', width: 335, height: 330 },
  compressImageArt: { src: '/learn-art/article-compress-image.webp', width: 332, height: 330 },
  phoneScanArt: { src: '/learn-art/article-phone-scan.webp', width: 339, height: 330 },
  loanAmortizationArt: { src: '/learn-art/article-loan-amortization.webp', width: 343, height: 335 },
  vatArt: { src: '/learn-art/article-vat.webp', width: 335, height: 335 },
  profitMarginArt: { src: '/learn-art/article-profit-margin.webp', width: 332, height: 335 },
  strongPasswordArt: { src: '/learn-art/article-strong-password.webp', width: 339, height: 335 },
  qrBusinessArt: { src: '/learn-art/article-qr-business.webp', width: 480, height: 355 },
  organizeDocsArt: { src: '/learn-art/article-organize-docs.webp', width: 480, height: 366 },
  scanToSignedArt: { src: '/learn-art/article-scan-to-signed.webp', width: 480, height: 357 },
  invoiceToPaymentArt: { src: '/learn-art/article-invoice-to-payment.webp', width: 480, height: 241 },
  batchSignArt: { src: '/learn-art/article-batch-sign.webp', width: 480, height: 248 },
};
