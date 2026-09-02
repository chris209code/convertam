import Link from 'next/link';
import { buildOgMeta } from '@/lib/pageMetadata';
import { ResponsiveAd } from '@/components/ads/AdSlot';

const TITLE = 'Contact Convertam';
const DESCRIPTION = 'How to reach Convertam — general support, security reports, and payment issues, with realistic response-time expectations from an independently run project.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/contact' }),
};

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">CONTACT</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">Get in Touch</h1>
        <p className="text-ink-soft leading-relaxed">
          Convertam is built and run independently, not by a support team — so instead of a
          contact form that disappears into a queue, here&apos;s exactly how to reach us and what to
          expect.
        </p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">General questions, feedback, or a broken tool</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            Email us directly — this is read personally, not by a bot or a ticketing system.
          </p>
          <a href="mailto:okekechris24@yahoo.com" className="inline-flex items-center gap-2 btn btn-primary">
            ✉️ okekechris24@yahoo.com
          </a>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">A paid conversion failed</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Email us with your payment reference and which tool you were using — we&apos;ll either
            re-run the conversion or refund the charge. See our{' '}
            <Link href="/terms" className="underline text-stamp-blue">Terms of Service</Link> for the full payment and refund policy.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Reporting a security issue</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            If you&apos;ve found a genuine vulnerability rather than a general bug, please see our{' '}
            <Link href="/security" className="underline text-stamp-blue">Security</Link> page for
            how to report it responsibly.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Suggesting a new tool</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Use the &ldquo;Suggest a Tool&rdquo; link in the site footer, or email directly. Real
            suggestions from real usage are exactly how most of Convertam&apos;s current tools came
            to exist.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">What to expect</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            There&apos;s no live chat and no phone line — Convertam is a small, independently run
            platform, and every message goes to one person. Most emails get a reply within a few
            business days. Security reports and failed-payment issues are prioritized.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Elsewhere</h2>
          <a href="https://x.com/chrisndz" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 btn btn-ghost" style={{ borderColor: '#e2dcc9' }}>
            𝕏 @chrisndz
          </a>
        </section>

      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <ResponsiveAd />
      </div>

    </main>
  );
}
