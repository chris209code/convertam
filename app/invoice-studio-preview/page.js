// Temporary, unlisted route for reviewing Business Document Studio during
// its staged build-out. Not in lib/tools-config.js, not linked from any
// nav, not in the sitemap.
import BusinessDocumentStudioWorkspace from '@/components/tools/invoice-studio/BusinessDocumentStudioWorkspace';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function InvoiceStudioPreviewPage() {
  return <BusinessDocumentStudioWorkspace />;
}
