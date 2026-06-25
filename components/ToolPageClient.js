'use client';

import PdfLibWorkspace from '@/components/tools/PdfLibWorkspace';
import OfficeConvertWorkspace from '@/components/tools/OfficeConvertWorkspace';
import GoogleDriveConvertWorkspace from '@/components/tools/GoogleDriveConvertWorkspace';
import PdfToImageWorkspace from '@/components/tools/PdfToImageWorkspace';
import SmartConverterWorkspace from '@/components/tools/SmartConverterWorkspace';
import SummarizePdfWorkspace from '@/components/tools/SummarizePdfWorkspace';
import ReceiptScanWorkspace from '@/components/tools/ReceiptScanWorkspace';
import CompressPdfWorkspace from '@/components/tools/CompressPdfWorkspace';
import SignPdfWorkspace from '@/components/tools/SignPdfWorkspace';
import FillPdfWorkspace from '@/components/tools/FillPdfWorkspace';
import ReorderPdfWorkspace from '@/components/tools/ReorderPdfWorkspace';
import WatermarkPdfWorkspace from '@/components/tools/WatermarkPdfWorkspace';
import InvoiceGeneratorWorkspace from '@/components/tools/InvoiceGeneratorWorkspace';
import RemovePagesWorkspace from '@/components/tools/RemovePagesWorkspace';
import AddPageNumbersWorkspace from '@/components/tools/AddPageNumbersWorkspace';
import ProtectPdfWorkspace from '@/components/tools/ProtectPdfWorkspace';
import HtmlToPdfWorkspace from '@/components/tools/HtmlToPdfWorkspace';
import OcrPdfWorkspace from '@/components/tools/OcrPdfWorkspace';
import PaymentGate from '@/components/PaymentGate';
import ComingSoon from '@/components/tools/ComingSoon';
import Link from 'next/link';
import { tools, getTool } from '@/lib/tools-config';
import { toolMeta } from '@/lib/tool-meta';

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder', 'watermark', 'invoice',
   'remove-pages', 'add-page-numbers', 'protect-pdf', 'html-to-pdf', 'ocr-pdf'].includes(mode);

export default function ToolPageClient({ tool }) {
  const meta = toolMeta[tool.slug] || {};
  const relatedTools = (meta.related || [])
    .map((slug) => getTool(slug))
    .filter(Boolean);

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-10">

      {/* Category */}
      <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">
        {tool.category.toUpperCase()}
      </p>

      {/* Title */}
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{tool.title}</h1>

      {/* Description */}
      <p className="text-ink-soft mb-4 max-w-xl">{tool.description}</p>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { icon: '⭐', label: isFree(tool.mode) ? 'Free' : tool.mode === 'office' ? 'Free & Premium' : '₦500' },
          { icon: '⚡', label: 'Fast' },
          { icon: '🔒', label: 'Secure' },
          { icon: '🚫', label: 'No Login Required' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9', color: '#1c2333' }}
          >
            {icon} {label}
          </span>
        ))}
      </div>

      {/* Steps */}
      {meta.steps && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {meta.steps.map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: '#f0f5ff', color: '#3a63b8', border: '1px solid #d0dcf5' }}
              >
                {step}
              </span>
              {i < arr.length - 1 && (
                <span className="text-ink-soft text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Workspace */}
      {tool.mode === 'office' && (
        <OfficeConvertWorkspace accept={tool.accept} toFormat={tool.toFormat} toLabel={tool.toLabel} />
      )}
      {tool.mode === 'drive' && (
        <GoogleDriveConvertWorkspace
          accept={tool.accept}
          sourceMimeType={tool.sourceMimeType}
          googleNativeType={tool.googleNativeType}
          exportMimeType={tool.exportMimeType}
          downloadExt={tool.downloadExt}
          toLabel={tool.toLabel}
        />
      )}
      {tool.mode === 'pdf-lib' && <PdfLibWorkspace mode={tool.pdfLibMode} accept={tool.accept} />}
      {tool.mode === 'pdf-to-image' && <PdfToImageWorkspace format={tool.imageFormat} />}
      {tool.mode === 'smart' && <SmartConverterWorkspace />}
      {tool.mode === 'summarize' && <SummarizePdfWorkspace />}
      {tool.mode === 'receipt' && <ReceiptScanWorkspace />}
      {tool.mode === 'compress' && (
        <PaymentGate toolName={tool.slug}>
          <CompressPdfWorkspace />
        </PaymentGate>
      )}
      {tool.mode === 'fill' && <FillPdfWorkspace />}
      {tool.mode === 'sign' && <SignPdfWorkspace />}
      {tool.mode === 'reorder' && <ReorderPdfWorkspace />}
      {tool.mode === 'watermark' && <WatermarkPdfWorkspace />}
      {tool.mode === 'invoice' && <InvoiceGeneratorWorkspace />}
      {tool.mode === 'remove-pages' && <RemovePagesWorkspace />}
      {tool.mode === 'add-page-numbers' && <AddPageNumbersWorkspace />}
      {tool.mode === 'protect-pdf' && <ProtectPdfWorkspace />}
      {tool.mode === 'html-to-pdf' && <HtmlToPdfWorkspace />}
      {tool.mode === 'ocr-pdf' && <OcrPdfWorkspace />}
      {tool.mode === 'soon' && <ComingSoon title={tool.title} note={tool.note} />}

      {/* Privacy line */}
      <div
        className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm"
        style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}
      >
        <span>🔒</span>
        <span className="text-ink-soft">
          Your files are automatically deleted after processing and are never shared with third parties.
        </span>
      </div>

      {/* Tips */}
      {meta.tips && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-2">Tips</p>
          <div className="flex flex-col gap-1.5">
            {meta.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <span style={{ color: '#2f8f5b', flexShrink: 0 }}>✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related tools */}
      {relatedTools.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">Related Tools</p>
          <div className="flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:border-stamp-blue"
                style={{ background: '#fffefb', border: '1px solid #e2dcc9', color: '#1c2333' }}
              >
                {t.title} →
              </Link>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
