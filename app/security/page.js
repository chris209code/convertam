import Link from 'next/link';

export const metadata = {
  title: 'Security — How Convertam Protects Your Files',
  description:
    'How Convertam secures your files and data: encryption in transit, browser-based processing, infrastructure providers, payment security, and how to report a vulnerability.',
  alternates: { canonical: '/security' },
};

export default function SecurityPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">TRUST &amp; SAFETY</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">Security</h1>
        <p className="text-ink-soft leading-relaxed">
          Convertam handles documents that are often sensitive — contracts, IDs, financial
          statements, CVs. This page explains, in plain language, the actual technical measures
          in place to protect them, rather than a generic reassurance. If something here is unclear
          or you find an issue, <Link href="/contact" className="underline text-stamp-blue">contact us</Link> directly.
        </p>
        <p className="text-xs text-ink-soft mt-3">Last updated: July 2026.</p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Most tools never send your file anywhere</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Merge PDF, Split PDF, Rotate PDF, Reorder Pages, Sign Documents, Watermark PDF, Redact &amp; Edit
            PDF, most image tools, and the calculators all run entirely inside your browser using
            JavaScript. Your file is read into memory on your own device, processed there, and
            the result is written back to a download — it never touches a Convertam server or
            leaves your computer or phone at any point. This isn&apos;t a policy decision that could
            change; it&apos;s how the tool is architected. If you disconnect from the internet after
            the page loads, most of these tools keep working.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Encryption in transit</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Every connection to convertam.app, including every file upload for the tools that do
            require server-side processing (document format conversions, Compress PDF, OCR, and
            the AI-assisted tools), is encrypted with HTTPS/TLS. Your browser verifies our
            certificate before sending anything, and the connection cannot be read in transit by
            your network, your ISP, or anyone sitting on the same Wi-Fi.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Server-side processing is short-lived and isolated</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            When a tool does need a server (because browsers can&apos;t run a full document-conversion
            engine or a large AI model), your file is:
          </p>
          <ul className="text-sm text-ink-soft leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
            <li>Uploaded over an encrypted connection directly to the processing service (CloudConvert for format conversions, Google Gemini for AI-assisted extraction/analysis/generation).</li>
            <li>Held only for the duration of that specific job — there is no persistent database of uploaded files.</li>
            <li>Deleted immediately once the job completes or fails. See our <Link href="/file-deletion-policy" className="underline text-stamp-blue">File Deletion Policy</Link> for the exact mechanics per tool.</li>
          </ul>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Payment security</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Paid conversions are billed through Paystack, a PCI-DSS Level 1 compliant payment
            processor regulated by the Central Bank of Nigeria. Card numbers, CVVs, and other
            payment details are entered directly into Paystack&apos;s own hosted checkout — Convertam&apos;s
            servers never receive, see, transmit, or store your card details. We only receive a
            payment reference confirming the transaction succeeded.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Infrastructure</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam is hosted on Vercel, which provides DDoS mitigation, automatic TLS
            certificate management, and infrastructure isolation between deployments. Application
            code is deployed from a version-controlled repository — there is no direct manual
            editing of the live server.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Account security</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam has no user accounts, no passwords, and no login system for regular use of
            the tools — which means there is no password database to be breached, and no account
            to be taken over. The only credential-based access on the site is a separate,
            restricted owner-only admin function unrelated to normal tool usage.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Reporting a vulnerability</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            If you believe you&apos;ve found a genuine security vulnerability — not a general bug
            report — please email{' '}
            <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">okekechris24@yahoo.com</a>{' '}
            with a clear description and, if possible, steps to reproduce it. Please don&apos;t test
            for vulnerabilities against other users&apos; data, and give us a reasonable window to fix
            an issue before disclosing it publicly. Convertam is an independently run project, so
            responses may not be instant, but every genuine report is read and taken seriously.
          </p>
        </section>

      </div>

      <section className="mt-12">
        <p className="text-sm text-ink-soft">
          See also our{' '}
          <Link href="/file-deletion-policy" className="underline text-stamp-blue">File Deletion Policy</Link>,{' '}
          <Link href="/ai-transparency" className="underline text-stamp-blue">AI Transparency</Link>, and{' '}
          <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>.
        </p>
      </section>

    </main>
  );
}
