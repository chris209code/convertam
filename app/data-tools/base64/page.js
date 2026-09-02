import Link from 'next/link';
import Base64Workspace from '../../../components/tools/data-tools/base64/Base64Workspace';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'Base64 Encode / Decode — Text & File Converter | Convertam',
  description: 'Encode text or files to Base64, or decode Base64 back to readable text or a downloadable file — entirely in your browser. Handles Unicode, emoji, and binary files correctly.',
  alternates: { canonical: '/data-tools/base64' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Base64 Encode / Decode',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based Base64 encoder and decoder for text and files, with correct UTF-8/Unicode handling and clear error messages for invalid input.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/base64',
};

const FAQ = [
  { q: 'What is Base64 encoding actually for?', a: 'Base64 turns arbitrary bytes — including binary data like images — into plain ASCII text made up only of letters, digits, +, /, and = padding. It exists because many systems (email, JSON, URLs, some databases) are only designed to safely carry text, not raw binary. Encoding to Base64 is the standard way to embed binary data somewhere that expects text.' },
  { q: 'Does Base64 encoding compress or encrypt data?', a: 'No, and this is a common misconception. Base64 is neither compression nor encryption — it typically makes data about 33% larger, and it provides zero confidentiality (anyone can decode it instantly). It is purely a text-safe representation, not a security or size-reduction technique.' },
  { q: 'Will encoding emoji or non-English text break anything?', a: 'No — Convertam\'s encoder converts text to UTF-8 bytes first and then Base64-encodes those bytes, which is the correct approach for any Unicode text (emoji, Yoruba, Igbo, Hausa, Chinese, Arabic, anything). A naive Base64 implementation that skips this step corrupts non-Latin characters; this one does not.' },
  { q: 'Can I encode or decode entire files, not just text?', a: 'Yes — File ↔ Base64 mode reads any file you select as raw bytes, so it works correctly on images, PDFs, or any binary file, not just text files. Decoding back to a file downloads the exact original bytes.' },
  { q: 'What happens if I paste invalid Base64?', a: 'You get a clear error message explaining what looks wrong (bad characters, wrong padding, or a truncated string), never silent garbage output. Base64 decoding is unforgiving by nature — a single dropped character can make the whole string invalid — so a precise error matters more than a guess.' },
  { q: 'Is my file uploaded anywhere?', a: 'No — encoding and decoding both happen entirely in your browser using the File and TextEncoder/TextDecoder APIs. Nothing is uploaded to a server for this tool.' },
];

export default function Base64Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 720, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Base64 Encode / Decode</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Convert text or files to Base64, or decode Base64 back to text or a file — correctly handling Unicode, emoji, and binary data, entirely in your browser.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <LeaderboardAd />
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 32 }}>
            <Base64Workspace />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <ResponsiveAd />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Base64, and what is it actually for?</h2>
              <p>
                Base64 is a way of representing arbitrary binary data — an image, a PDF, any raw bytes — as plain text built only from letters, digits, and three symbols (<code style={code}>+</code>, <code style={code}>/</code>, <code style={code}>=</code>). It exists because a lot of systems were built to safely carry text but not raw binary: email, JSON payloads, URLs, some database fields. Base64 is the standard bridge — it lets binary data travel safely through a text-only channel, at the cost of making it roughly a third larger.
              </p>
              <p>
                It is not encryption and it is not compression. Anyone can decode Base64 back to the original data instantly with no key or password — it provides zero confidentiality. Treat it purely as a format conversion, never as a way to protect sensitive data.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can you do with this tool?</h2>
              <ul style={ul}>
                <li><strong>Text → Base64</strong> — encode any text, correctly handling Unicode and emoji via UTF-8 byte encoding first.</li>
                <li><strong>Base64 → Text</strong> — decode a Base64 string back to readable text, with a clear error if it isn&apos;t actually text.</li>
                <li><strong>File → Base64</strong> — select any file and get its exact byte content back as a Base64 string, ready to paste into JSON, an email, or a config file.</li>
                <li><strong>Base64 → File</strong> — paste a Base64 string and download it back as the original file&apos;s exact bytes.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>When should you use it?</h2>
              <p>
                Reach for Base64 encoding when you need to embed binary content somewhere that only accepts text — a data URI in CSS/HTML, a field in a JSON API payload, an email attachment, a value in an environment variable or config file that doesn&apos;t support raw binary. Reach for decoding whenever you&apos;ve been handed a Base64 string and need to see or use what it actually contains.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How it works</h2>
              <p>
                Text encoding converts your input to UTF-8 bytes first (via the browser&apos;s native <code style={code}>TextEncoder</code>), then Base64-encodes those bytes — the step a naive character-by-character implementation skips, which is exactly what corrupts emoji and non-Latin scripts elsewhere. File encoding reads the file&apos;s raw bytes directly and Base64-encodes them the same way, so the output round-trips back to the exact original file, byte for byte.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li>Base64 output is roughly 33% larger than the original input — this is inherent to the format, not a bug.</li>
                <li>Very large files (hundreds of MB) may be slow to encode in the browser, since the whole file is processed in memory.</li>
                <li>Base64 provides no encryption or compression — don&apos;t use it as a substitute for either.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy</h2>
              <p>Encoding and decoding happen entirely in your browser — no file or text you enter here is uploaded to a server.</p>
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
              <Link href="/data-tools/url-encoder" style={relatedLink}>URL Encoder / Decoder →</Link>
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
              <Link href="/data-tools/json-studio" style={relatedLink}>JSON Studio →</Link>
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
