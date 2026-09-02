import Link from 'next/link';
import XmlStudioWorkspace from '../../../components/tools/data-tools/xml-studio/XmlStudioWorkspace';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'XML Studio — View, Format, Validate & Convert XML | Convertam',
  description: 'Format, minify, and validate XML with real error locations, browse it as a collapsible tree, and convert XML to JSON or CSV — entirely in your browser, protected against XXE.',
  alternates: { canonical: '/data-tools/xml-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'XML Studio',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based XML viewer, formatter, validator and converter — tree view, pretty-print/minify, XML to JSON and XML to CSV conversion, with explicit protection against XXE and entity-expansion payloads.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/xml-studio',
};

const FAQ = [
  { q: 'Can XML Studio convert any XML document to CSV?', a: 'No, and it says so honestly rather than forcing a bad conversion — XML → CSV only works when the document actually contains a repeated-record structure (like several sibling <item> elements with a similar shape). A deeply nested or irregular XML document doesn\'t have an obvious tabular shape, and XML Studio tells you that instead of producing a nonsensical single-row CSV.' },
  { q: 'What does XML → JSON actually produce?', a: 'A JSON object mirroring the XML structure: element names become keys, attributes are prefixed with @, text content is kept as #text when an element also has attributes or children, and repeated same-named sibling elements become a JSON array. This is the same shape that round-trips cleanly back through JSON → XML.' },
  { q: 'How does XML Studio protect against XXE and malicious payloads?', a: 'Parsing uses the browser\'s native DOMParser, which never fetches or resolves external entities on its own. On top of that, XML Studio explicitly rejects any document with a DOCTYPE that declares an ENTITY or references an external SYSTEM/PUBLIC identifier before parsing even begins — this also closes off internal-entity recursive-expansion ("billion laughs") payloads, since no DTD entity processing happens at all.' },
  { q: 'What kind of validation errors does it catch?', a: 'Malformed or unclosed tags, invalid nesting, malformed attributes, and invalid XML declarations — with a line/column location when the browser\'s parser reports one, so you know exactly where to look.' },
  { q: 'Can I explore a large or deeply nested XML document without getting lost?', a: 'Yes — the Tree view shows a collapsible hierarchy, and clicking any element shows its full path, attributes, and text value in the inspector panel on the side.' },
  { q: 'Does XML Studio upload my document anywhere?', a: 'No — parsing, formatting, validation, and conversion all happen locally in your browser using native XML APIs.' },
];

export default function XmlStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>XML Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              View, format, validate, and convert XML — a collapsible tree browser, precise error locations, and honest XML → JSON / XML → CSV conversion, entirely in your browser.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <LeaderboardAd />
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 32 }}>
            <XmlStudioWorkspace />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <ResponsiveAd />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is XML Studio?</h2>
              <p>
                XML Studio is a workspace for reading, checking, and converting XML — the format still widely used for invoices, configuration files, data feeds, and legacy business systems. It gives you three complementary ways to look at the same document: a syntax-highlighted editor for reading and editing the raw markup, a collapsible tree that makes even a deeply nested document navigable, and a conversion view for turning it into JSON or CSV when that&apos;s what you actually need.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can you do with it?</h2>
              <ul style={ul}>
                <li><strong>Editor</strong> — syntax-highlighted XML with line numbers, plus Format (pretty-print with indentation) and Minify.</li>
                <li><strong>Validate</strong> — malformed XML is caught immediately, with a specific error message and line/column when available.</li>
                <li><strong>Tree view</strong> — browse the document as a collapsible hierarchy; click any element to see its tag, attributes, text value, and full path.</li>
                <li><strong>XML → JSON</strong> — convert the document into a structured JSON object.</li>
                <li><strong>XML → CSV</strong> — convert a document with a repeated-record structure (e.g. multiple <code style={code}>&lt;item&gt;</code> elements) into a table.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How table extraction works</h2>
              <p>
                XML → CSV looks for the first element in the document that has several children sharing the same tag name — the &quot;list of similar records&quot; shape most XML data actually uses (a purchase order&apos;s line items, a feed&apos;s list of entries). Each matching child becomes one CSV row, with its attributes and child elements becoming columns. If no such structure exists — a deeply nested config file, say — XML Studio says so plainly rather than forcing an unhelpful single-row CSV.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Security: protection against XXE and malicious payloads</h2>
              <p>
                Parsing uses the browser&apos;s native <code style={code}>DOMParser</code>, which by design never fetches external DTDs or resolves external entities from script-invoked parsing — the classic XXE attack surface. XML Studio adds an explicit check on top of that: any document declaring a <code style={code}>DOCTYPE</code> with an <code style={code}>ENTITY</code> or an external <code style={code}>SYSTEM</code>/<code style={code}>PUBLIC</code> reference is rejected before parsing even begins, with a clear explanation why. Since no DTD entity processing happens at all, this also closes off internal-entity recursive-expansion (&quot;billion laughs&quot;) payloads. There is simply no legitimate need for DTD entities in a data-parsing tool like this one.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li>Documents declaring a DOCTYPE with ENTITY or external SYSTEM/PUBLIC references are rejected outright, by design — remove the DOCTYPE declaration if you need to work with that document.</li>
                <li>XML → CSV only works on documents with an actual repeated-record structure; irregular or deeply nested documents won&apos;t convert meaningfully.</li>
                <li>XML namespaces are preserved in tag names as written but are not specially resolved or validated against a schema.</li>
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
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
              <Link href="/data-tools/csv-studio" style={relatedLink}>CSV Studio →</Link>
              <Link href="/data-tools/sql-studio" style={relatedLink}>SQL Studio →</Link>
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
