// Aggregates every Learn article (one file per article, see ./articles/) and
// derives everything that shouldn't be hand-maintained per article: reading
// time (from real word count), table of contents (from real heading
// blocks), and search. Adding a future article means one new file in
// ./articles/ plus one import line here — the rest of the section (routing,
// homepage sections, category pages, search) picks it up automatically.

import { LEARN_CATEGORIES } from './categories';
import howToMergePdfFiles from './articles/how-to-merge-pdf-files-without-losing-quality';
import howToCompressAPdf from './articles/how-to-compress-a-pdf-without-losing-quality';
import howToConvertPdfToWord from './articles/how-to-convert-pdf-to-word-without-breaking-formatting';
import whatIsOcr from './articles/what-is-ocr-and-when-you-need-it';
import howAiTranslationWorks from './articles/how-ai-document-translation-works';
import canAiImproveResume from './articles/can-ai-actually-improve-your-resume';
import invoiceVsQuotationVsDeliveryNote from './articles/invoice-vs-quotation-vs-delivery-note';
import howToCreateProfessionalInvoice from './articles/how-to-create-a-professional-invoice';
import areDigitalSignaturesLegallyBinding from './articles/are-digital-signatures-legally-binding';
import jpgVsPng from './articles/jpg-vs-png-which-should-you-use';
import howToCompressImages from './articles/how-to-compress-images-without-losing-quality';
import howToScanWithPhone from './articles/how-to-scan-a-document-with-your-phone';
import howLoanAmortizationWorks from './articles/how-loan-amortization-works';
import vatExplained from './articles/vat-explained-for-small-businesses';
import profitMarginVsMarkup from './articles/profit-margin-vs-markup';
import howToBuildStrongPassword from './articles/how-to-build-a-strong-password';
import qrCodesForBusiness from './articles/qr-codes-for-business';
import howToOrganizeDocuments from './articles/how-to-organize-and-name-your-documents';
import scanToSignedPdfWorkflow from './articles/from-scan-to-signed-pdf-workflow';
import invoiceToPaymentWorkflow from './articles/invoice-to-payment-workflow';
import howToBatchSignDocuments from './articles/how-to-batch-sign-multiple-documents';

export const ARTICLES = [
  howToMergePdfFiles,
  howToCompressAPdf,
  howToConvertPdfToWord,
  whatIsOcr,
  howAiTranslationWorks,
  canAiImproveResume,
  invoiceVsQuotationVsDeliveryNote,
  howToCreateProfessionalInvoice,
  areDigitalSignaturesLegallyBinding,
  jpgVsPng,
  howToCompressImages,
  howToScanWithPhone,
  howLoanAmortizationWorks,
  vatExplained,
  profitMarginVsMarkup,
  howToBuildStrongPassword,
  qrCodesForBusiness,
  howToOrganizeDocuments,
  scanToSignedPdfWorkflow,
  invoiceToPaymentWorkflow,
  howToBatchSignDocuments,
];

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}

export function getArticlesByCategory(categorySlug) {
  return ARTICLES.filter((a) => a.category === categorySlug);
}

export function getFeaturedArticles() {
  return ARTICLES.filter((a) => a.featured);
}

export function getPopularArticles() {
  return ARTICLES.filter((a) => a.popular);
}

export function getLatestArticles(limit = 6) {
  return [...ARTICLES]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

const WORDS_PER_MINUTE = 200;

function blockWordCount(block) {
  if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'callout') {
    return (block.text || '').trim().split(/\s+/).filter(Boolean).length;
  }
  if (block.type === 'list') {
    return (block.items || []).reduce((sum, item) => sum + item.trim().split(/\s+/).filter(Boolean).length, 0);
  }
  if (block.type === 'workflow-steps') {
    return (block.steps || []).reduce((sum, step) => {
      const labelWords = (step.label || '').trim().split(/\s+/).filter(Boolean).length;
      const descWords = (step.description || '').trim().split(/\s+/).filter(Boolean).length;
      return sum + labelWords + descWords;
    }, (block.intro || '').trim().split(/\s+/).filter(Boolean).length);
  }
  return 0;
}

// Computed, not hand-typed per article, so it can never drift from the
// article's real length as content gets edited.
export function getReadingTime(article) {
  const totalWords = (article.body || []).reduce((sum, block) => sum + blockWordCount(block), 0);
  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
}

// Every heading block in reading order — the article renderer gives each
// heading the same `id` as an anchor, so these are just `#id` links.
export function getTableOfContents(article) {
  return (article.body || [])
    .filter((block) => block.type === 'heading')
    .map((block) => ({ id: block.id, text: block.text }));
}

// The site's one established search convention (see app/page.js's tool
// search): a plain case-insensitive substring filter, no search library.
// Deliberately scoped to title + excerpt + category only, per product
// direction — kept simple and fast, not a full-text index.
export function searchArticles(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return ARTICLES.filter((a) => {
    const category = getLearnCategoryTitle(a.category);
    return (
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
  }).slice(0, 8);
}

function getLearnCategoryTitle(categorySlug) {
  return LEARN_CATEGORIES.find((c) => c.slug === categorySlug)?.title || '';
}
