import Link from 'next/link';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Why Convertam — What Makes It Different';
const DESCRIPTION = 'Why choose Convertam over other file-conversion sites: no login, no watermarks, transparent per-use pricing, browser-based privacy, and a real accountable maintainer.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/why-convertam' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/why-convertam' }),
};

export default function WhyConvertamPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">WHY CONVERTAM</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
          What Makes Convertam Different
        </h1>
        <p className="text-ink-soft leading-relaxed">
          There is no shortage of file-conversion websites. Most look similar and promise the same
          things. This page is a straightforward comparison of what Convertam actually does
          differently, and why — not a list of superlatives.
        </p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">No account, ever</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Many conversion sites let you start a task, process your file, and only then ask you
            to sign up before you can download the result. Convertam never does this — every tool
            works from the first visit, with no registration, no email capture, and no password to
            create or remember.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">No watermarks on your output</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            A common pattern elsewhere is a free tier that stamps a watermark or a promotional
            banner onto your converted file, pushing you toward a paid plan to remove it.
            Convertam doesn&apos;t do this on any tool, free or paid — the document you download is
            exactly what you asked for, nothing added.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Pay per use, not a subscription</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            The handful of tools that genuinely require a paid conversion engine (PDF↔Word,
            PDF↔Excel, PDF↔PowerPoint, and Compress PDF) charge a small, flat, one-time fee for
            that specific job — currently ₦500 in Nigeria or $1.00 internationally. There is no
            monthly plan, no recurring charge, and no upsell screen. Every other tool on the
            platform is free with no usage limit.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Privacy by architecture, not just policy</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Most of Convertam&apos;s tools — Merge PDF, Split PDF, Sign Documents, image editing, and
            all the calculators — run entirely inside your browser. Your file is never uploaded to
            a server for these tools, which isn&apos;t a promise we could later change without you
            noticing; it&apos;s how the tool is built. See <Link href="/security" className="underline text-stamp-blue">Security</Link> and{' '}
            <Link href="/file-deletion-policy" className="underline text-stamp-blue">File Deletion Policy</Link> for the specifics.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">One platform instead of a dozen single-purpose sites</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Instead of bookmarking a different site for merging PDFs, another for generating an
            invoice, another for improving a CV, and another for OCR, Convertam brings PDF tools,
            business document generators, AI-assisted tools, image tools, calculators, and career
            tools into one place — and lets you hand a file from one tool straight into the next
            through the Document Workspace, without re-uploading it.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Built and maintained by one accountable person</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Convertam isn&apos;t run by an anonymous ad-farm operation. It&apos;s built and maintained by
            a named founder who reads and responds to support emails directly — see{' '}
            <Link href="/about" className="underline text-stamp-blue">Our Story</Link> for why it
            exists and <Link href="/contact" className="underline text-stamp-blue">Contact</Link>{' '}
            if you need to reach us.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Honest about AI, and about limitations</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Where AI is used — CV rewriting, OCR, translation, summarization — we say so clearly,
            explain which model powers it, and are direct about where AI output can go wrong
            rather than presenting it as infallible. See{' '}
            <Link href="/ai-transparency" className="underline text-stamp-blue">AI Transparency</Link> for the full picture.
          </p>
        </section>

      </div>

    </main>
  );
}
