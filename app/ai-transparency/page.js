import Link from 'next/link';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'AI Transparency — How Convertam Uses AI';
const DESCRIPTION = 'Which Convertam tools use AI, which model powers them, what data is sent, whether it trains on your files, and the real limitations of AI-generated output.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/ai-transparency' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/ai-transparency' }),
};

const AI_TOOLS = [
  { name: 'Smart AI Converter', href: '/smart-converter', does: 'Reads a photographed document and reconstructs it as an editable Word or Excel file.' },
  { name: 'OCR PDF', href: '/ocr-pdf', does: 'Recognizes text in scanned or photographed pages, including handwriting, and makes it selectable and searchable.' },
  { name: 'Receipt & Invoice Scanner', href: '/receipt-scanner', does: 'Extracts vendor, line items, and totals from a photographed receipt or invoice into a spreadsheet.' },
  { name: 'CV Improver', href: '/cv-improver', does: 'Rewrites and restructures a pasted or uploaded CV for a target role, using only facts already present in it.' },
  { name: 'Resume Builder', href: '/resume-builder', does: 'Turns your answers to guided questions into professionally worded CV content.' },
  { name: 'Cover Letter Writer', href: '/cover-letter', does: 'Drafts a tailored cover letter from your background and a job description.' },
  { name: 'Document Translator', href: '/document-translator', does: "Translates a document's text between languages while preserving its layout." },
  { name: 'Contract Summarizer', href: '/contract-summarizer', does: 'Highlights key parties, terms, and obligations in an uploaded contract.' },
  { name: 'Summarize PDF', href: '/summarize-pdf', does: 'Summarizes, extracts key points from, or simplifies the language of an uploaded PDF.' },
  { name: 'AI Data Analyst', href: '/data-analyst', does: 'Turns an uploaded spreadsheet or table photo into charts, insights, and a written report.' },
  { name: 'AI Presentation Generator', href: '/presentation-generator', does: 'Structures uploaded documents into an editable slide deck.' },
  { name: 'Ask & Solve AI', href: '/ask-solve-ai', does: 'Answers a typed, scanned, or photographed question — math or general.' },
];

export default function AiTransparencyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">TRUST &amp; SAFETY</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">AI Transparency</h1>
        <p className="text-ink-soft leading-relaxed">
          A number of Convertam&apos;s tools use AI. This page states plainly which ones, what model
          powers them, what happens to the data you send, and — just as importantly — where AI
          output genuinely can go wrong, so you know when to double-check it.
        </p>
        <p className="text-xs text-ink-soft mt-3">Last updated: July 2026.</p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Which tools use AI</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            Every AI-assisted tool on Convertam is clearly an AI tool by nature of what it does —
            we don&apos;t use AI silently inside a tool that looks purely mechanical. The current list:
          </p>
          <ul className="text-sm text-ink-soft leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
            {AI_TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="underline text-stamp-blue">{t.name}</Link>
                {' — '}{t.does}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-soft leading-relaxed mt-3">
            Every other tool — the PDF utilities, image tools, business document generators,
            calculators, and password/QR tools — uses conventional, deterministic code, not AI.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Which model, and who runs it</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            All AI-assisted tools are powered by Google&apos;s Gemini models, accessed through
            Google&apos;s API. Convertam does not run its own AI model and has not fine-tuned or
            customized the underlying model on any of our own or our users&apos; data — each request
            is a standard API call describing exactly what that one tool needs done.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Your data is not used to train the model</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Content you submit to an AI-assisted tool — a CV, a contract, a photographed receipt —
            is sent to Google&apos;s API for that single request and is not used by Convertam to train,
            fine-tune, or improve any model. Files are not retained by Convertam after the request
            completes; see our <Link href="/file-deletion-policy" className="underline text-stamp-blue">File Deletion Policy</Link> for the exact mechanics.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">What AI can get wrong</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            AI output is generated, not looked up — it can be confidently wrong. Specific,
            realistic failure modes worth knowing about:
          </p>
          <ul className="text-sm text-ink-soft leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
            <li><strong>OCR and handwriting recognition</strong> can misread a character that looks similar to another (a 5 as an 8, a comma as a period) — always verify numbers that matter, like invoice totals or ID numbers.</li>
            <li><strong>Summarization and contract analysis</strong> can miss a clause or overstate its importance — treat the output as a fast first read, not a substitute for reading the original document yourself when the stakes are real.</li>
            <li><strong>CV and cover letter rewriting</strong> is instructed never to invent facts, numbers, or achievements you didn&apos;t provide — but you should still read the final result carefully before sending it to an employer.</li>
            <li><strong>Translation</strong> can occasionally miss idiom or context-dependent meaning, particularly in specialized legal or technical language.</li>
          </ul>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">You&apos;re responsible for reviewing the output</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            For anything with real consequences — a signed document, a submitted CV, a business
            decision based on a data report — review the AI-generated result before relying on it.
            This is also stated in our <Link href="/terms" className="underline text-stamp-blue">Terms of Service</Link>: Convertam&apos;s
            AI tools are aids that speed up the first draft, not a substitute for your own judgment
            on anything that matters.
          </p>
        </section>

      </div>

      <section className="mt-12">
        <p className="text-sm text-ink-soft">
          Questions about a specific tool&apos;s AI behavior?{' '}
          <Link href="/contact" className="underline text-stamp-blue">Contact us</Link>. See also{' '}
          <Link href="/security" className="underline text-stamp-blue">Security</Link> and{' '}
          <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>.
        </p>
      </section>

    </main>
  );
}
