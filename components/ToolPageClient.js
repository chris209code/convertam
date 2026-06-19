'use client';

import PdfLibWorkspace from '@/components/tools/PdfLibWorkspace';
import OfficeConvertWorkspace from '@/components/tools/OfficeConvertWorkspace';
import PdfToImageWorkspace from '@/components/tools/PdfToImageWorkspace';
import ComingSoon from '@/components/tools/ComingSoon';

export default function ToolPageClient({ tool }) {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
      <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">
        {tool.category.toUpperCase()}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{tool.title}</h1>
      <p className="text-ink-soft mb-8 max-w-xl">{tool.description}</p>

      {tool.mode === 'office' && (
        <OfficeConvertWorkspace accept={tool.accept} toFormat={tool.toFormat} toLabel={tool.toLabel} />
      )}
      {tool.mode === 'pdf-lib' && <PdfLibWorkspace mode={tool.pdfLibMode} accept={tool.accept} />}
      {tool.mode === 'pdf-to-image' && <PdfToImageWorkspace format={tool.imageFormat} />}
      {tool.mode === 'soon' && <ComingSoon title={tool.title} note={tool.note} />}
    </main>
  );
}
