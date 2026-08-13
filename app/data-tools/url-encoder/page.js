import Link from 'next/link';
import UrlEncoderWorkspace from '../../../components/tools/data-tools/url-encoder/UrlEncoderWorkspace';

export const metadata = {
  title: 'URL Encode / Decode — Percent-Encoding Tool | Convertam',
  description: 'Encode or decode URLs and query strings using correct percent-encoding — handles spaces, Unicode, and reserved characters (&, =, ?, #, +) properly. Free, in-browser.',
  alternates: { canonical: '/data-tools/url-encoder' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'URL Encode / Decode',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based URL/percent-encoding tool using the browser\'s real URI encoding primitives, not a hand-rolled character table.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/url-encoder',
};

const FAQ = [
  { q: 'What is URL encoding (percent-encoding)?', a: 'URLs can only safely contain a limited set of ASCII characters. URL encoding (percent-encoding) represents any other character — a space, an accented letter, a symbol like & or = when it appears inside a value rather than as URL structure — as a % followed by its byte value in hex, e.g. a space becomes %20.' },
  { q: 'Why does a space sometimes become %20 and sometimes +?', a: 'Both are valid in different contexts. %20 is the general percent-encoding for a space anywhere in a URL. + specifically means "space" only inside application/x-www-form-urlencoded content — the format an HTML form or a hand-built query string traditionally uses. This tool defaults to %20 (the generally correct choice) with a toggle for + when you specifically need form encoding.' },
  { q: 'Does this handle Unicode characters correctly?', a: 'Yes — it uses the browser\'s built-in encodeURIComponent/decodeURIComponent, which correctly UTF-8-encode any Unicode text (accented letters, Chinese, Arabic, emoji) rather than a hand-written character-replacement table that only covers ASCII.' },
  { q: 'What\'s the difference between encoding a whole URL and encoding one value?', a: 'Encoding a single query parameter VALUE should escape every reserved character (including &, =, ?, #) so it can\'t be mistaken for URL structure — that\'s what "URL Encode" does here. Encoding a full URL should leave structural characters like :, /, ?, & alone since they\'re meaningful, only escaping things that are never valid unescaped (like a literal space). Use this tool on one value at a time — a full query string or path segment — for the most predictable result.' },
  { q: 'What happens if I try to decode text that isn\'t validly encoded?', a: 'You get a clear error explaining the input doesn\'t look like valid percent-encoding, rather than throwing an unhandled error or silently returning something wrong.' },
];

export default function UrlEncoderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 720, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>URL Encode / Decode</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Correctly percent-encode or decode URLs and query strings — spaces, Unicode, and reserved characters handled properly, using the browser&apos;s real URI encoding rules.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56 }}>
            <UrlEncoderWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is URL encoding?</h2>
              <p>
                A URL can only safely contain a specific set of ASCII characters. Anything else — a space, an accented letter, or a symbol like <code style={code}>&amp;</code> or <code style={code}>=</code> appearing inside a value rather than as part of the URL&apos;s own structure — has to be represented as a <code style={code}>%</code> followed by two hex digits (its byte value). A space becomes <code style={code}>%20</code>; &quot;café&quot; becomes <code style={code}>caf%C3%A9</code>. This is called percent-encoding, and it&apos;s what makes it safe to put arbitrary text — a search term, a name, a URL itself — inside a URL without breaking it.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can you do with this tool?</h2>
              <ul style={ul}>
                <li><strong>URL Encode</strong> — turn plain text or a raw value into its safely percent-encoded form.</li>
                <li><strong>URL Decode</strong> — turn a percent-encoded string back into readable text.</li>
                <li><strong>Swap</strong> — move the current output into the input and flip modes, for quick back-and-forth checking.</li>
                <li><strong>+ for spaces toggle</strong> — switch between <code style={code}>%20</code> (general percent-encoding) and <code style={code}>+</code> (form/query-string encoding) for spaces specifically.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported characters and edge cases</h2>
              <p>
                Handles spaces, reserved characters (<code style={code}>&amp;</code>, <code style={code}>=</code>, <code style={code}>?</code>, <code style={code}>#</code>, <code style={code}>+</code>), and any Unicode text correctly, using the browser&apos;s native <code style={code}>encodeURIComponent</code>/<code style={code}>decodeURIComponent</code> — not a hand-written character-replacement table, which is exactly the kind of ad-hoc approach that quietly breaks on Unicode or an unusual symbol.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>When should you use it?</h2>
              <p>
                Use URL Encode when you&apos;re building a query string or URL by hand and need a value (a search term, a name with spaces or accents) to survive inside it safely. Use URL Decode when you&apos;ve been handed an encoded URL or query parameter and want to read what it actually says.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li>This encodes a single value at a time (a query parameter, a path segment) rather than parsing and selectively encoding parts of a full URL — paste one value, not a whole multi-parameter URL, for the most predictable result.</li>
                <li>Decoding text that isn&apos;t validly percent-encoded produces a clear error rather than a guess.</li>
              </ul>
            </section>

            <section>
              <h2 style={sectionH2}>Frequently asked questions</h2>
              {FAQ.map((item, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4, fontSize: '0.92rem' }}>{item.q}</div>
                  <div style={{ fontSize: '0.88rem', color: '#475569' }}>{item.a}</div>
                </div>
              ))}
            </section>
          </article>

          <div style={{ maxWidth: 760, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Related Tools</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/data-tools/base64" style={relatedLink}>Base64 Encode / Decode →</Link>
              <Link href="/data-tools/text-cleaner" style={relatedLink}>Text Cleaner Studio →</Link>
              <Link href="/data-tools" style={relatedLink}>All Data Tools →</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const sectionH2 = { fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 };
const ul = { paddingLeft: 20, margin: '10px 0' };
const code = { background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: '0.82rem', fontFamily: 'ui-monospace, monospace' };
const relatedLink = { fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' };
