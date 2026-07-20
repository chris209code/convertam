'use client';

import PdfLibWorkspace from '@/components/tools/PdfLibWorkspace';
import OfficeConvertWorkspace from '@/components/tools/OfficeConvertWorkspace';
import PdfToImageWorkspace from '@/components/tools/PdfToImageWorkspace';
import ImagesToPdfWorkspace from '@/components/tools/ImagesToPdfWorkspace';
import ExtractPdfImagesWorkspace from '@/components/tools/ExtractPdfImagesWorkspace';
import ComparePdfWorkspace from '@/components/tools/ComparePdfWorkspace';
import RedactPdfWorkspace from '@/components/tools/RedactPdfWorkspace';
import PdfOverlayWorkspace from '@/components/tools/PdfOverlayWorkspace';
import SmartConverterWorkspace from '@/components/tools/SmartConverterWorkspace';
import SummarizePdfWorkspace from '@/components/tools/SummarizePdfWorkspace';
import ReceiptScanWorkspace from '@/components/tools/ReceiptScanWorkspace';
import CompressPdfWorkspace from '@/components/tools/CompressPdfWorkspace';
import SignPdfWorkspace from '@/components/tools/SignPdfWorkspace';
import FillPdfWorkspace from '@/components/tools/FillPdfWorkspace';
import ReorderPdfWorkspace from '@/components/tools/ReorderPdfWorkspace';
import WatermarkPdfWorkspace from '@/components/tools/WatermarkPdfWorkspace';
import BusinessDocumentStudioWorkspace from '@/components/tools/invoice-studio/BusinessDocumentStudioWorkspace';
import RemovePagesWorkspace from '@/components/tools/RemovePagesWorkspace';
import AddPageNumbersWorkspace from '@/components/tools/AddPageNumbersWorkspace';
import ProtectPdfWorkspace from '@/components/tools/ProtectPdfWorkspace';
import HtmlToPdfWorkspace from '@/components/tools/HtmlToPdfWorkspace';
import OcrPdfWorkspace from '@/components/tools/OcrPdfWorkspace';
import OverlayTextWorkspace from '@/components/tools/OverlayTextWorkspace';
import QuotationWorkspace from '@/components/tools/QuotationWorkspace';
import SalaryCalculator from '@/components/tools/salary-calculator/SalaryCalculator';
import LoanCalculatorWorkspace from '@/components/tools/calculators/LoanCalculatorWorkspace';
import VatCalculatorWorkspace from '@/components/tools/calculators/VatCalculatorWorkspace';
import ProfitMarginCalculatorWorkspace from '@/components/tools/calculators/ProfitMarginCalculatorWorkspace';
import DiscountCalculatorWorkspace from '@/components/tools/calculators/DiscountCalculatorWorkspace';
import AgeCalculatorWorkspace from '@/components/tools/calculators/AgeCalculatorWorkspace';
import ExpenseBudgetCalculator from '@/components/tools/expense-budget-calculator/ExpenseBudgetCalculator';
import BreakEvenCalculatorWorkspace from '@/components/tools/calculators/BreakEvenCalculatorWorkspace';
import SavingsGoalCalculatorWorkspace from '@/components/tools/calculators/SavingsGoalCalculatorWorkspace';
import UtilitiesWorkspace from '@/components/tools/UtilitiesWorkspace';
import CVImproverWorkspace from '@/components/tools/CVImproverWorkspace';
import QrCodeStudioWorkspace from '@/components/tools/QrCodeStudioWorkspace';
import AskSolveAIWorkspace from '@/components/tools/AskSolveAIWorkspace';
import CoverLetterWriterWorkspace from '@/components/tools/CoverLetterWriterWorkspace';
import ContractSummarizerWorkspace from '@/components/tools/ContractSummarizerWorkspace';
import PresentationGeneratorWorkspace from '@/components/tools/PresentationGeneratorWorkspace';
import DataAnalystWorkspace from '@/components/tools/DataAnalystWorkspace';
import ImageCompressorWorkspace from '@/components/tools/ImageCompressorWorkspace';
import ImageResizerCropperWorkspace from '@/components/tools/ImageResizerCropperWorkspace';
import WatermarkImageWorkspace from '@/components/tools/WatermarkImageWorkspace';
import ImageFormatConverterWorkspace from '@/components/tools/ImageFormatConverterWorkspace';
import MemeGeneratorWorkspace from '@/components/tools/MemeGeneratorWorkspace';
import ResumeBuilderWorkspace from '@/components/tools/ResumeBuilderWorkspace';
import IdCardGeneratorWorkspace from '@/components/tools/IdCardGeneratorWorkspace';
import DocumentEnhancerWorkspace from '@/components/tools/DocumentEnhancerWorkspace';
import DeliveryNoteWaybillWorkspace from '@/components/tools/DeliveryNoteWaybillWorkspace';
import PaymentGate from '@/components/PaymentGate';
import ComingSoon from '@/components/tools/ComingSoon';
import Link from 'next/link';
import { getTool } from '@/lib/tools-config';
import { toolMeta } from '@/lib/tool-meta';

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder', 'watermark', 'invoice',
   'images-to-pdf', 'extract-pdf-images', 'compare-pdf', 'redact-pdf', 'pdf-overlay', 'convert-image-format', 'meme-generator',
   'remove-pages', 'add-page-numbers', 'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize',
   'fill', 'write-on-pdf', 'quotation', 'salary-calculator', 'loan-calculator', 'vat-calculator', 'profit-margin', 'discount-calculator', 'age-calculator',
   'expense-budget-calculator', 'break-even-calculator', 'savings-goal-calculator',
   'utilities-hub', 'cv-improver', 'resume-builder', 'ask-solve-ai', 'qr-code-generator',
   'cover-letter', 'contract-summarizer', 'image-compressor', 'resize-image', 'watermark-image', 'presentation-generator', 'data-analyst',
   'id-card-generator', 'document-enhancer', 'delivery-note-waybill'].includes(mode);

function getPriceBadge(mode) {
  if (isFree(mode)) return 'Free';
  if (mode === 'office') return 'From ₦500';
  if (mode === 'compress') return '₦500';
  return '₦500';
}

export default function ToolPageClient({ tool }) {
  const meta = toolMeta[tool.slug] || {};
  const relatedTools = (meta.related || []).map((slug) => getTool(slug)).filter(Boolean);

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-10 py-10">
      <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">{tool.category.toUpperCase()}</p>
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{tool.title}</h1>
      <p className="text-ink-soft mb-4 max-w-xl">{tool.description}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[{ icon: '⭐', label: getPriceBadge(tool.mode) }, { icon: '⚡', label: 'Fast' }, { icon: '🔒', label: 'Secure' }, { icon: '🚫', label: 'No Login Required' }].map(({ icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#fffefb', border: '1px solid #e2dcc9', color: '#1c2333' }}>
            {icon} {label}
          </span>
        ))}
      </div>

      {meta.steps && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {meta.steps.map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#f0f5ff', color: '#3a63b8', border: '1px solid #d0dcf5' }}>{step}</span>
              {i < arr.length - 1 && <span className="text-ink-soft text-xs">→</span>}
            </div>
          ))}
        </div>
      )}

      {/* Tips before workspace */}
      {meta.tips && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#065F46' }}>💡 Tips for best results</p>
          <div className="flex flex-col gap-1.5">
            {meta.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#065F46' }}>
                <span style={{ flexShrink: 0 }}>✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tool.mode === 'office' && <OfficeConvertWorkspace accept={tool.accept} toFormat={tool.toFormat} toLabel={tool.toLabel} />}
      {tool.mode === 'pdf-lib' && <PdfLibWorkspace mode={tool.pdfLibMode} accept={tool.accept} />}
      {tool.mode === 'pdf-to-image' && <PdfToImageWorkspace format={tool.imageFormat} />}
      {tool.mode === 'images-to-pdf' && <ImagesToPdfWorkspace />}
      {tool.mode === 'extract-pdf-images' && <ExtractPdfImagesWorkspace />}
      {tool.mode === 'compare-pdf' && <ComparePdfWorkspace />}
      {tool.mode === 'redact-pdf' && <RedactPdfWorkspace />}
      {tool.mode === 'pdf-overlay' && <PdfOverlayWorkspace />}
      {tool.mode === 'smart' && <SmartConverterWorkspace />}
      {tool.mode === 'summarize' && <SummarizePdfWorkspace />}
      {tool.mode === 'receipt' && <ReceiptScanWorkspace />}
      {tool.mode === 'compress' && <PaymentGate toolName={tool.slug}><CompressPdfWorkspace /></PaymentGate>}
      {tool.mode === 'fill' && <FillPdfWorkspace />}
      {tool.mode === 'write-on-pdf' && <OverlayTextWorkspace />}
      {tool.mode === 'sign' && <SignPdfWorkspace />}
      {tool.mode === 'reorder' && <ReorderPdfWorkspace />}
      {tool.mode === 'watermark' && <WatermarkPdfWorkspace />}
      {tool.mode === 'invoice' && <BusinessDocumentStudioWorkspace initialDocType="invoice" />}
      {tool.mode === 'remove-pages' && <RemovePagesWorkspace />}
      {tool.mode === 'add-page-numbers' && <AddPageNumbersWorkspace />}
      {tool.mode === 'protect-pdf' && <ProtectPdfWorkspace />}
      {tool.mode === 'html-to-pdf' && <HtmlToPdfWorkspace />}
      {tool.mode === 'ocr-pdf' && <OcrPdfWorkspace />}
      {tool.mode === 'quotation' && <QuotationWorkspace />}
      {tool.mode === 'salary-calculator' && <SalaryCalculator />}
      {tool.mode === 'loan-calculator' && <LoanCalculatorWorkspace />}
      {tool.mode === 'vat-calculator' && <VatCalculatorWorkspace />}
      {tool.mode === 'profit-margin' && <ProfitMarginCalculatorWorkspace />}
      {tool.mode === 'discount-calculator' && <DiscountCalculatorWorkspace />}
      {tool.mode === 'age-calculator' && <AgeCalculatorWorkspace />}
      {tool.mode === 'expense-budget-calculator' && <ExpenseBudgetCalculator />}
      {tool.mode === 'break-even-calculator' && <BreakEvenCalculatorWorkspace />}
      {tool.mode === 'savings-goal-calculator' && <SavingsGoalCalculatorWorkspace />}
      {tool.mode === 'utilities-hub' && <UtilitiesWorkspace />}
      {tool.mode === 'cv-improver' && <CVImproverWorkspace />}
      {tool.mode === 'qr-code-studio' && <QrCodeStudioWorkspace />}
      {tool.mode === 'ask-solve-ai' && <AskSolveAIWorkspace />}
      {tool.mode === 'cover-letter' && <CoverLetterWriterWorkspace />}
      {tool.mode === 'contract-summarizer' && <ContractSummarizerWorkspace />}
      {tool.mode === 'presentation-generator' && <PresentationGeneratorWorkspace />}
      {tool.mode === 'data-analyst' && <DataAnalystWorkspace />}
      {tool.mode === 'image-compressor' && <ImageCompressorWorkspace />}
      {tool.mode === 'resize-image' && <ImageResizerCropperWorkspace />}
      {tool.mode === 'watermark-image' && <WatermarkImageWorkspace />}
      {tool.mode === 'convert-image-format' && <ImageFormatConverterWorkspace />}
      {tool.mode === 'meme-generator' && <MemeGeneratorWorkspace />}
      {tool.mode === 'resume-builder' && <ResumeBuilderWorkspace />}
      {tool.mode === 'id-card-generator' && <IdCardGeneratorWorkspace />}
      {tool.mode === 'document-enhancer' && <DocumentEnhancerWorkspace />}
      {tool.mode === 'delivery-note-waybill' && <DeliveryNoteWaybillWorkspace />}
      {tool.mode === 'soon' && <ComingSoon title={tool.title} note={tool.note} />}

      <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span>🔒</span>
        <span className="text-ink-soft">Your files are automatically deleted after processing and are never shared with third parties.</span>
      </div>

      {relatedTools.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">Related Tools</p>
          <div className="flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <Link key={t.slug} href={`/${t.slug}`} className="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ background: '#fffefb', border: '1px solid #e2dcc9', color: '#1c2333', textDecoration: 'none' }}>
                {t.title} →
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
