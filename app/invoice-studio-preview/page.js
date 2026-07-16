// Temporary, unlisted route for reviewing Invoice Studio during its staged
// build-out. Not in lib/tools-config.js, not linked from any nav, not in the
// sitemap — safe to leave in place while the live /invoice-generator route
// still serves the old tool. Delete this route once Invoice Studio is wired
// into ToolPageClient.js and the old workspace is retired.
import InvoiceStudioWorkspace from '@/components/tools/invoice-studio/InvoiceStudioWorkspace';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function InvoiceStudioPreviewPage() {
  return <InvoiceStudioWorkspace />;
}
