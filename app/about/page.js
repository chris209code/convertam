export const metadata = {
  title: 'About Convertam — Free File Conversion, No Login',
  description:
    'Learn about Convertam, our privacy policy, and answers to common questions about file conversion, security, and how our tools work.',
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      {/* About */}
      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">ABOUT</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
          What is Convertam?
        </h1>
        <p className="text-ink-soft mb-4">
          Convertam is a free online file conversion platform built around one simple promise:
          <strong className="text-ink"> Upload. Convert am. Download.</strong>
        </p>
        <p className="text-ink-soft mb-4">
          We provide fast, reliable document conversion tools that work directly in your browser —
          no account, no watermark, no subscription required. Whether you need to convert a PDF
          to Word, merge documents, sign a PDF, or extract data from a receipt, Convertam has
          a tool for it.
        </p>
        <p className="text-ink-soft">
          Convertam was built and is maintained by <strong className="text-ink">Christopher Okeke</strong>,
          a Nigerian entrepreneur building simple digital tools for everyday people and businesses
          across Africa and beyond.
        </p>
      </section>

      {/* Privacy Policy */}
      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">PRIVACY POLICY</p>
        <h2 className="font-display text-2xl font-bold mb-4">Your Privacy Matters</h2>

        <div className="flex flex-col gap-5">
          <div
            className="rounded-xl p-5"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
          >
            <h3 className="font-semibold text-ink mb-2">🔒 Files are never stored</h3>
            <p className="text-sm text-ink-soft">
              For browser-based tools (Merge PDF, Split PDF, Sign PDF, Image tools, etc.),
              your files never leave your device at all — everything happens locally in your browser.
              For server-based tools (PDF to Word, Smart AI Converter, etc.), your files are
              transmitted securely and deleted immediately after conversion. We do not keep copies.
            </p>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
          >
            <h3 className="font-semibold text-ink mb-2">📊 What data we collect</h3>
            <p className="text-sm text-ink-soft">
              We collect minimal anonymous usage data (page visits, tool usage counts) to
              understand how the platform is used and improve it. We do not collect your name,
              email, or any personally identifiable information unless you voluntarily provide
              it (e.g. when making a payment via Paystack).
            </p>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
          >
            <h3 className="font-semibold text-ink mb-2">💳 Payments</h3>
            <p className="text-sm text-ink-soft">
              Payments for premium conversion tools are processed securely by Paystack.
              We never see or store your card details. Paystack is PCI-DSS compliant and
              regulated by the Central Bank of Nigeria.
            </p>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
          >
            <h3 className="font-semibold text-ink mb-2">🍪 Cookies</h3>
            <p className="text-sm text-ink-soft">
              We use minimal session storage (not persistent cookies) to remember your payment
              status within a single browser session. We may use third-party advertising
              (Google AdSense) which uses cookies to show relevant ads. You can opt out of
              personalized ads via Google&apos;s ad settings.
            </p>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
          >
            <h3 className="font-semibold text-ink mb-2">🤝 Third-party services</h3>
            <p className="text-sm text-ink-soft">
              We use the following third-party services: CloudConvert (document conversion),
              Google Gemini AI (Smart AI Converter and Receipt Scanner), Paystack (payments),
              and Vercel (hosting). Each of these services has their own privacy policies.
            </p>
          </div>
        </div>

        <p className="text-xs text-ink-soft mt-4">
          Last updated: June 2026. For privacy questions, contact us at{' '}
          <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">
            okekechris24@yahoo.com
          </a>
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">FAQ</p>
        <h2 className="font-display text-2xl font-bold mb-6">Frequently Asked Questions</h2>

        <div className="flex flex-col gap-4">
          {[
            {
              q: 'Is Convertam really free?',
              a: 'Most tools on Convertam are completely free with no limits — including all PDF utilities, image tools, Sign PDF, Watermark PDF, Reorder Pages, Smart AI Converter, Receipt Scanner, and Invoice Generator. A small fee applies for document format conversions (PDF↔Word, PDF↔Excel, PDF↔PowerPoint, Compress PDF) to cover the cost of the conversion engine.',
            },
            {
              q: 'Do I need to create an account?',
              a: 'No. Convertam requires no registration, no login, and no email address. Just upload your file and convert. For paid tools, payment is per-use and your session is remembered in your browser — no account needed.',
            },
            {
              q: 'Are my files safe?',
              a: 'Yes. Browser-based tools process files entirely on your device — your file never leaves your computer or phone. Server-based tools transmit files over encrypted HTTPS connections and delete them immediately after conversion. We never store, share, or analyze your documents.',
            },
            {
              q: 'Why do some tools cost money?',
              a: 'PDF-to-Word and similar format conversions require a powerful third-party conversion engine that charges per conversion. Rather than absorb the cost and limit everyone, we pass it through at a small per-use fee (₦500 in Nigeria, $0.99 internationally). This keeps the free tools truly free and sustainable.',
            },
            {
              q: 'What file size is supported?',
              a: 'Free browser-based tools support files up to 100MB. Paid conversion tools also support files up to 100MB.',
            },
            {
              q: 'Which file formats are supported?',
              a: 'PDF, DOCX (Word), XLSX (Excel), PPTX (PowerPoint), JPG, PNG. More formats will be added over time.',
            },
            {
              q: 'Can I use Convertam on my phone?',
              a: 'Yes — Convertam is fully mobile-friendly and works on any modern smartphone or tablet browser. No app download required.',
            },
            {
              q: 'I paid but the conversion failed. What happens?',
              a: 'If a conversion fails after payment, please try again — most failures are temporary. If the problem persists, contact us at hello@convertam.app with your payment reference and we will resolve it promptly.',
            },
            {
              q: 'How does the Smart AI Converter work?',
              a: 'The Smart AI Converter uses Google Gemini\'s vision AI to read the content of your uploaded image or scanned document and extract the text and tables into a structured Word or Excel file. It works best with clear, well-lit photos or scans.',
            },
            {
              q: 'How does the Invoice Generator work?',
              a: 'Fill in your business details, client information, and line items directly on the page. Click Generate and a professional PDF invoice downloads instantly to your device. Nothing is saved on our servers.',
            },
          ].map(({ q, a }, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}
            >
              <h3 className="font-semibold text-ink mb-2">{q}</h3>
              <p className="text-sm text-ink-soft">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & Social */}
      <section>
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">CONTACT</p>
        <h2 className="font-display text-2xl font-bold mb-4">Get in Touch</h2>
        <p className="text-ink-soft mb-6">
          Have a question, suggestion, or issue? We&apos;d love to hear from you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:okekechris24@yahoo.com"
            className="inline-flex items-center gap-2 btn btn-primary"
          >
            ✉️ okekechris24@yahoo.com
          </a>
          <a
            href="https://x.com/chrisndz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 btn btn-ghost"
            style={{ borderColor: '#e2dcc9' }}
          >
            𝕏 @chrisndz
          </a>
        </div>
      </section>

    </main>
  );
}
