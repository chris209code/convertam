import Link from 'next/link';
import CsvStudioWorkspace from '../../../components/tools/data-tools/csv-studio/CsvStudioWorkspace';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'CSV Studio — Edit, Clean & Analyze CSV Data | Convertam',
  description: 'A full spreadsheet-like CSV workspace: edit cells, detect column types, clean and deduplicate data, find and replace, and export to CSV, TSV, or JSON — all in your browser.',
  alternates: { canonical: '/data-tools/csv-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CSV Studio',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based CSV inspection and editing workspace with column type detection, statistics, data cleaning operations, and CSV/TSV/JSON export that preserves quoted fields, embedded delimiters, and Unicode correctly.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/csv-studio',
};

const FAQ = [
  { q: 'How is this different from just opening a CSV in a spreadsheet app?', a: 'CSV Studio is built for a narrower, more deliberate job: understanding and cleaning the actual data — automatic column-type detection, per-column statistics, find-and-replace, deduplication — without any spreadsheet-app formulas, formatting, or file-format complexity to work around. It\'s the step between "raw export" and "the file I actually want to use," not a full spreadsheet application.' },
  { q: 'Will editing and re-exporting corrupt my data?', a: 'No — CSV Studio uses a strict RFC4180-compliant parser and writer, meaning quoted fields, commas inside quoted values, embedded line breaks, escaped quotes, and Unicode all survive a full import → edit → export round trip correctly. This was specifically tested, not assumed.' },
  { q: 'What delimiters does it support?', a: 'Comma, semicolon, tab, and pipe — auto-detected from your file by checking which delimiter produces a consistent column count across the first several lines.' },
  { q: 'What data types does it detect?', a: 'Integer, decimal, date, boolean, text, and empty/null — detected per column by sampling every value in that column, so a column is only marked as a type if most of its actual values fit that pattern.' },
  { q: 'Can I undo a cleaning operation?', a: 'Yes — every edit, cleaning operation, and structural change (add/remove column or row) is tracked, and Undo/Redo step through the full history of changes to the current table.' },
  { q: 'Can I move data from CSV Studio into other Convertam tools?', a: 'Yes — "Open in SQL Studio" hands your current table straight to SQL Studio so you can write real SQL against it without a manual export/re-import step.' },
];

export default function CsvStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>CSV Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              A real spreadsheet-like workspace for inspecting, editing, and cleaning CSV data — column type detection, statistics, deduplication, find-and-replace, and correct import/export round-tripping.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <LeaderboardAd />
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 32 }}>
            <CsvStudioWorkspace />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <ResponsiveAd />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is CSV Studio?</h2>
              <p>
                CSV Studio is a browser-based workspace for working with CSV data the way you actually need to — not just converting it to another format, but seeing it as an editable table, understanding what&apos;s really in each column, and fixing the messy parts (duplicate rows, inconsistent casing, missing values) before you use it somewhere else. It&apos;s deliberately not just &quot;CSV to JSON&quot; — conversion is one export option among several, not the whole point of the tool.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can you do with it?</h2>
              <ul style={ul}>
                <li><strong>Import, paste, or start from scratch</strong> — bring in a CSV/TSV file, paste delimited data directly, or build a new sheet from nothing.</li>
                <li><strong>Edit like a spreadsheet</strong> — click any cell to edit it, rename columns, add/remove rows and columns, reorder columns.</li>
                <li><strong>Search, filter, and sort</strong> — find rows instantly and sort any column ascending or descending.</li>
                <li><strong>Clean the data</strong> — trim whitespace, remove empty rows, remove duplicate rows, normalize case, find-and-replace, fill empty cells, convert a column&apos;s type.</li>
                <li><strong>Export correctly</strong> — CSV, TSV, or JSON, with quoting and Unicode preserved exactly.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Column intelligence</h2>
              <p>
                Every column is automatically analyzed and shown in the sidebar with its detected type (integer, decimal, date, boolean, or text) and, for numeric columns, min/max/average and a missing-value count — so you can spot data quality problems (a &quot;revenue&quot; column with unexpected text in it, a date column with inconsistent formats) at a glance rather than by scrolling through every row.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>When should you use it?</h2>
              <p>
                Use CSV Studio whenever a CSV export needs a cleanup pass before it&apos;s actually usable — deduplicating a contact list, standardizing casing in a category column, filling in blanks, or just understanding what a file someone sent you actually contains. If you need to write real queries against the data (filtering by multiple conditions, joining against a second table, aggregating), use <Link href="/data-tools/sql-studio" style={inlineLink}>SQL Studio</Link> instead — CSV Studio&apos;s &quot;Open in SQL Studio&quot; button hands your table straight over.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li>Very large files (hundreds of thousands of rows) may be slow, since the whole table is held in browser memory and paginated for display.</li>
                <li>Type detection is a best-effort sample of each column&apos;s actual values — always spot-check a column before relying on its detected type for downstream processing.</li>
                <li>Column reordering, renaming, and deletion apply to the current in-browser table only — the original imported file is never modified.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy</h2>
              <p>Everything happens in your browser — importing, editing, and exporting never send your file to a server.</p>
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
              <Link href="/data-tools/sql-studio" style={relatedLink}>SQL Studio →</Link>
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
              <Link href="/data-tools/json-studio" style={relatedLink}>JSON Studio →</Link>
              <Link href="/data-tools/xml-studio" style={relatedLink}>XML Studio →</Link>
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
const relatedLink = { fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' };
const inlineLink = { color: '#0E7490', fontWeight: 700, textDecoration: 'underline' };
