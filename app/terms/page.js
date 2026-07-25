import Link from 'next/link';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Terms of Service — Convertam';
const DESCRIPTION = 'The terms governing your use of Convertam — free and paid file conversion tools, acceptable use, payments, and liability.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/terms' }),
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">LEGAL</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-ink-soft leading-relaxed">
          These terms govern your use of Convertam (the &ldquo;Service&rdquo;), available at
          convertam.app. By uploading a file, using any tool, or otherwise accessing the Service,
          you agree to these terms. If you don&apos;t agree, please don&apos;t use the Service.
        </p>
        <p className="text-xs text-ink-soft mt-3">Last updated: July 2026.</p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">1. What Convertam is</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam is a collection of free and paid file-conversion and productivity tools —
            PDF utilities, image tools, document generators, AI-assisted converters, and
            calculators. No account or registration is required to use any tool. Some tools run
            entirely in your browser; others send your file to a third-party processing service
            (see our{' '}
            <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>{' '}
            for exactly which ones and why) and delete it immediately after the job completes.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">2. Acceptable use</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            You agree to use Convertam only for lawful purposes. You may not use the Service to:
          </p>
          <ul className="text-sm text-ink-soft leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
            <li>Upload, convert, or generate content that is illegal, infringes someone else&apos;s intellectual property, or that you don&apos;t have the right to process.</li>
            <li>Attempt to disrupt, overload, or gain unauthorized access to the Service, its infrastructure, or other users&apos; sessions.</li>
            <li>Use automated scripts or bots to send bulk or excessive requests to any tool, including the paid conversion endpoints.</li>
            <li>Use the AI-assisted tools (Smart AI Converter, CV Improver, Ask &amp; Solve AI, and others) to generate content intended to deceive, defraud, or impersonate another person.</li>
          </ul>
          <p className="text-sm text-ink-soft leading-relaxed mt-3">
            You&apos;re solely responsible for the files you upload and the content you generate.
            Convertam does not review, endorse, or take responsibility for user-submitted content.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">3. Payments and refunds</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            Most tools are free with no limits. A small number of tools — document format
            conversions (PDF↔Word, PDF↔Excel, PDF↔PowerPoint) and Compress PDF — charge a
            small per-use fee (currently ₦500 in Nigeria or $1.00 internationally, occasionally
            more for very large or scanned files) to cover the cost of the underlying conversion
            engine. Payments are processed securely by Paystack; Convertam never sees or stores
            your card details.
          </p>
          <p className="text-sm text-ink-soft leading-relaxed">
            Because each payment corresponds to a specific, on-demand conversion job, payments
            are generally non-refundable once the conversion succeeds and the file is delivered.
            If a paid conversion genuinely fails after payment, contact us at{' '}
            <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">okekechris24@yahoo.com</a>{' '}
            with your payment reference and we&apos;ll resolve it — either by re-running the
            conversion or refunding the charge.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">4. Your content and our license to process it</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            You retain full ownership of every file you upload and every document you generate
            using Convertam. We claim no ownership over your content. For server-based tools, you
            grant Convertam and its named third-party processors (see our{' '}
            <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>)
            a limited, temporary license to process your file solely for the purpose of completing
            the requested conversion — nothing more. Files are deleted immediately after processing
            and are never used to train AI models, sold, or shared with anyone else.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">5. AI-generated content</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Several tools (Smart AI Converter, CV Improver, Resume Builder, Cover Letter Writer,
            Ask &amp; Solve AI, AI Data Analyst, and others) use AI models to extract, summarize,
            or generate text. AI output can occasionally be inaccurate or incomplete — you&apos;re
            responsible for reviewing any AI-generated content before relying on it, submitting it,
            or acting on it (for example, before signing a document, submitting a CV, or making a
            decision based on a data analysis report).
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">6. No warranty</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
            warranties of any kind, express or implied. We don&apos;t guarantee that every
            conversion will be perfectly accurate, that the Service will be uninterrupted or
            error-free, or that it will meet every specific requirement you have. For anything
            legally, financially, or medically significant, always verify the output yourself or
            consult a qualified professional — our tools (including the calculators, CV tools, and
            AI features) are aids, not substitutes for professional advice.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">7. Limitation of liability</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            To the fullest extent permitted by law, Convertam and its founder are not liable for
            any indirect, incidental, or consequential damages arising from your use of the
            Service — including lost data, lost income, or missed deadlines — even where a paid
            conversion was involved. Our total liability for any claim relating to a paid tool is
            limited to the amount you paid for that specific transaction.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">8. Third-party services</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Some tools rely on third-party infrastructure — CloudConvert (document conversion),
            Google Gemini AI (AI-assisted tools), Paystack (payments), Vercel (hosting), and Google
            AdSense (advertising). Each has its own terms and privacy practices, which apply
            alongside these terms whenever their service is used to process your request.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">9. Changes to the Service or these terms</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam is actively developed — tools, pricing, and features may change, and new
            tools may be added or existing ones adjusted over time. We may update these terms
            occasionally; the &ldquo;Last updated&rdquo; date above will always reflect the most
            recent revision. Continuing to use the Service after an update means you accept the
            revised terms.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">10. Governing law</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            These terms are governed by the laws of the Federal Republic of Nigeria, without
            regard to conflict-of-law principles, without limiting the rights you may have under
            the mandatory consumer-protection laws of the country you access the Service from.
          </p>
        </section>

      </div>

      <section className="mt-12">
        <p className="text-sm text-ink-soft">
          Questions about these terms? Contact us at{' '}
          <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">
            okekechris24@yahoo.com
          </a>
          . See also our{' '}
          <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>{' '}
          and <Link href="/about" className="underline text-stamp-blue">Our Story</Link>.
        </p>
      </section>

    </main>
  );
}
