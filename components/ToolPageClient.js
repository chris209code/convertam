'use client';

import PdfLibWorkspace from '@/components/tools/PdfLibWorkspace';
import OfficeConvertWorkspace from '@/components/tools/OfficeConvertWorkspace';
import GoogleDriveConvertWorkspace from '@/components/tools/GoogleDriveConvertWorkspace';
import PdfToImageWorkspace from '@/components/tools/PdfToImageWorkspace';
import SmartConverterWorkspace from '@/components/tools/SmartConverterWorkspace';
import ReceiptScanWorkspace from '@/components/tools/ReceiptScanWorkspace';
import CompressPdfWorkspace from '@/components/tools/CompressPdfWorkspace';
import SignPdfWorkspace from '@/components/tools/SignPdfWorkspace';
import ReorderPdfWorkspace from '@/components/tools/ReorderPdfWorkspace';
import WatermarkPdfWorkspace from '@/components/tools/WatermarkPdfWorkspace';
import InvoiceGeneratorWorkspace from '@/components/tools/InvoiceGeneratorWorkspace';
import ComingSoon from '@/components/tools/ComingSoon';

import PaymentGate from '@/components/PaymentGate';

export default function ToolPageClient({ tool }) {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
      <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">
        {tool.category.toUpperCase()}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{tool.title}</h1>
      <p className="text-ink-soft mb-8 max-w-xl">{tool.description}</p>

      {tool.mode === 'office' && (
        <PaymentGate toolName={tool.slug}>
          <OfficeConvertWorkspace accept={tool.accept} toFormat={tool.toFormat} toLabel={tool.toLabel} />
        </PaymentGate>
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
      {tool.mode === 'receipt' && <ReceiptScanWorkspace />}
      {tool.mode === 'compress' && (
        <PaymentGate toolName={tool.slug}>
          <CompressPdfWorkspace />
        </PaymentGate>
      )}
      {tool.mode === 'sign' && <SignPdfWorkspace />}
      {tool.mode === 'reorder' && <ReorderPdfWorkspace />}
      {tool.mode === 'watermark' && <WatermarkPdfWorkspace />}
      {tool.mode === 'invoice' && <InvoiceGeneratorWorkspace />}
      {tool.mode === 'soon' && <ComingSoon title={tool.title} note={tool.note} />}
    </main>
  );
}
