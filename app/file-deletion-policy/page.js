import Link from 'next/link';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'File Deletion Policy — What Happens to Your File on Convertam';
const DESCRIPTION = 'Exactly what happens to your file when you use Convertam: which tools never leave your device, how server-side files are deleted, and what we never keep.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/file-deletion-policy' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/file-deletion-policy' }),
};

export default function FileDeletionPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">

      <section className="mb-12">
        <p className="font-mono text-xs text-stamp-amber tracking-wide mb-2">TRUST &amp; SAFETY</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">File Deletion Policy</h1>
        <p className="text-ink-soft leading-relaxed">
          A short, specific answer to the question people actually ask: &ldquo;what happens to my
          file after I use this?&rdquo; There are two different answers depending on which kind of
          tool you use, and this page explains both precisely rather than with a vague blanket
          promise.
        </p>
        <p className="text-xs text-ink-soft mt-3">Last updated: July 2026.</p>
      </section>

      <div className="flex flex-col gap-5">

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Browser-based tools: your file never leaves your device</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Merge PDF, Split PDF, Rotate PDF, Reorder Pages, Sign Documents, Watermark PDF, Redact
            &amp; Edit PDF, most image editing tools, and every calculator process your file entirely
            inside your own browser. There is nothing to &ldquo;delete&rdquo; on our end, because
            the file was never uploaded anywhere in the first place — it existed only in your
            device&apos;s memory for the duration of the page being open, the same as any other file
            you have open in an application on your computer. Closing the tab clears it.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">Server-based tools: uploaded, processed, then deleted</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            Some tools genuinely require server-side processing — document format conversions
            (PDF↔Word, PDF↔Excel, PDF↔PowerPoint), Compress PDF, and the AI-assisted tools (Smart
            AI Converter, CV Improver, OCR PDF, Document Translator, AI Data Analyst, and others).
            For these, the sequence is:
          </p>
          <ol className="text-sm text-ink-soft leading-relaxed list-decimal pl-5 flex flex-col gap-1.5">
            <li>Your file is uploaded over an encrypted (HTTPS) connection to the processing service — CloudConvert for format conversions, Google Gemini for AI-assisted tools.</li>
            <li>The service performs the requested job (conversion, compression, extraction, or generation) and returns the result to your browser.</li>
            <li>The result is streamed straight to your download — Convertam does not save a copy on its own servers at any point in this process.</li>
            <li>The uploaded file is deleted from the processing service once the job completes or fails. There is no separate archive, backup, or long-term storage of user files.</li>
          </ol>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">What we don&apos;t do</h2>
          <ul className="text-sm text-ink-soft leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
            <li>We don&apos;t keep a searchable history of files you&apos;ve converted.</li>
            <li>We don&apos;t use your uploaded documents to train any AI model — Google Gemini processes each request independently and does not learn from it.</li>
            <li>We don&apos;t sell, share, or otherwise hand your files to any third party beyond the specific processor needed to complete that one job.</li>
            <li>We don&apos;t retain files &ldquo;just in case&rdquo; for debugging — if a job fails, it fails, and the partial upload is discarded the same way a successful one is.</li>
          </ul>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">The Document Workspace is different — and still yours</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            When you chain several tools together (for example, scanning a document, cleaning it
            up, then converting it), Convertam&apos;s Document Workspace keeps the in-progress file in
            your own browser&apos;s local storage so you don&apos;t have to re-upload it between steps.
            That file lives on your device, not on a Convertam server, and is cleared when you
            close the session or clear your browser&apos;s site data.
          </p>
        </section>

        <section className="rounded-xl p-5" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-semibold text-ink mb-2">How to tell which kind of tool you&apos;re using</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            If a tool shows an upload/progress step and needs an internet connection to produce a
            result, it&apos;s server-based and follows the upload-process-delete sequence above. If it
            works immediately after the page loads — including with your internet disconnected —
            it&apos;s processing the file locally in your browser and nothing was ever transmitted.
          </p>
        </section>

      </div>

      <section className="mt-12">
        <p className="text-sm text-ink-soft">
          See also our{' '}
          <Link href="/security" className="underline text-stamp-blue">Security</Link> page and{' '}
          <Link href="/about#privacy" className="underline text-stamp-blue">Privacy Policy</Link>. Questions?{' '}
          <Link href="/contact" className="underline text-stamp-blue">Contact us</Link>.
        </p>
      </section>

    </main>
  );
}
