import Link from 'next/link';
import SqlStudioWorkspace from '../../../components/tools/data-tools/sql-studio/SqlStudioWorkspace';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'SQL Studio — Write & Run SQL Against Your Data | Convertam',
  description: 'Write, format, and validate SQL, and run SELECT/JOIN/GROUP BY queries directly against CSV, JSON, or XLSX data you import — entirely in your browser, no database server required.',
  alternates: { canonical: '/data-tools/sql-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SQL Studio',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based SQL editor and query engine that runs SELECT, JOIN, GROUP BY, INSERT, UPDATE, DELETE, and CREATE TABLE statements against data imported from CSV, JSON, or XLSX files — no server-side database.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/sql-studio',
};

const FAQ = [
  { q: 'Is this a real SQL database, or does it just look like one?', a: 'It\'s a real, working SQL query engine — a hand-written SQL parser and executor that runs entirely in your browser. It genuinely evaluates WHERE conditions, performs JOINs, computes GROUP BY aggregates, and mutates data with INSERT/UPDATE/DELETE against whatever table you\'ve imported. It is not a connection to any external or production database — see "What is SQL Studio not" below for exactly what it doesn\'t do.' },
  { q: 'Where does the data I query actually come from?', a: 'From a file you import (CSV, XLSX, or JSON) or paste in, or from a table handed off from another Convertam Data Workspace tool (CSV Studio, XML Studio). Nothing is fetched from a remote server — the "tables" you query are entirely in your browser\'s memory for the duration of your session.' },
  { q: 'Does my data get uploaded anywhere when I run a query?', a: 'No — every query executes locally in your browser against the in-memory table. Nothing you import or query is sent to a server.' },
  { q: 'What SQL features are NOT supported?', a: 'Subqueries, Common Table Expressions (WITH), window functions, multiple chained JOINs, UNION/INTERSECT/EXCEPT, and transactions are not supported — see the "What\'s not supported" panel inside the tool for the current, exact list. This is a genuinely useful subset for real single/two-table analysis, not a full ANSI SQL engine.' },
  { q: 'Can I use SQL Studio to modify my original file?', a: 'INSERT, UPDATE, and DELETE modify the in-memory table you\'re querying, and you can export the result back to CSV or JSON — but the original file you imported is never touched. Nothing is written back to disk automatically.' },
  { q: 'What happens if my query has a syntax error?', a: 'You get a specific error message describing what SQL Studio expected and where, rather than a silent failure or generic "query failed."' },
];

export default function SqlStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>SQL Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Write and run real SQL — SELECT, JOIN, GROUP BY, INSERT, UPDATE, DELETE — directly against a CSV, JSON, or XLSX file you import, entirely in your browser. No database server, no setup.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <LeaderboardAd />
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 32 }}>
            <SqlStudioWorkspace />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <ResponsiveAd />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is SQL Studio?</h2>
              <p>
                SQL Studio is a genuine SQL query engine that runs entirely inside your browser. You import a CSV, JSON, or XLSX file (or paste data, or receive it from another Data Workspace tool), and it becomes a queryable table — visible in the schema sidebar with its real column names — that you can write actual SQL against: filter it, join it against a second table, group and aggregate it, or edit it with INSERT/UPDATE/DELETE. There&apos;s no database server anywhere in this — the query engine is a small SQL parser and executor written specifically for this tool.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is SQL Studio <em>not</em>?</h2>
              <p>
                It is not a connection to a remote or production database, and it never queries one — every table you see in the schema sidebar exists only in your browser&apos;s memory, built from a file you imported in this session. It is also not a full ANSI SQL implementation — subqueries, CTEs, window functions, and multi-table chained JOINs beyond a single JOIN aren&apos;t supported (the exact list is in the tool&apos;s &quot;What&apos;s not supported&quot; panel and the Limitations section below). Being upfront about both of these is more useful than a tool that quietly pretends to be something it isn&apos;t.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can you do with it?</h2>
              <ul style={ul}>
                <li><strong>SELECT</strong> with WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, and DISTINCT.</li>
                <li><strong>JOIN</strong> — one INNER or LEFT JOIN between two imported tables, matched on an equality condition.</li>
                <li><strong>Aggregate functions</strong> — COUNT, SUM, AVG, MIN, MAX — combined with GROUP BY.</li>
                <li><strong>Common functions</strong> — UPPER, LOWER, LENGTH, ROUND, ABS, CONCAT, TRIM, COALESCE.</li>
                <li><strong>INSERT, UPDATE, DELETE</strong> — genuinely mutate the in-memory table you&apos;re working with.</li>
                <li><strong>CREATE TABLE</strong> — start a new empty table with defined columns.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How importing works</h2>
              <p>
                Import a CSV, JSON (an array of objects), or XLSX file, and it&apos;s parsed into a table with real column names shown in the schema sidebar — so you always know what to write in your <code style={code}>FROM</code> and <code style={code}>SELECT</code> clauses without guessing. You can also arrive here already carrying data via &quot;Open in SQL Studio&quot; from CSV Studio or XML Studio, which hands the current table straight over without a manual re-export/re-import step.
              </p>
              <p style={{ marginTop: 10 }}>
                Example, once <code style={code}>customers</code> and <code style={code}>orders</code> tables are imported:
              </p>
              <pre style={preStyle}>{`SELECT c.name, SUM(o.amount) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.name
ORDER BY total_spent DESC;`}</pre>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li>Subqueries and Common Table Expressions (<code style={code}>WITH ... AS</code>) are not supported.</li>
                <li>Only a single JOIN per query is supported — no chained multi-table joins.</li>
                <li>Window functions (<code style={code}>OVER</code>, <code style={code}>PARTITION BY</code>) are not supported.</li>
                <li>No transactions — every statement runs immediately against the in-browser table, there&apos;s nothing to commit or roll back.</li>
                <li><code style={code}>UNION</code>, <code style={code}>INTERSECT</code>, and <code style={code}>EXCEPT</code> are not supported.</li>
                <li>Very large imported files may be slow, since every table lives in browser memory for the session.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy</h2>
              <p>Imported files and every query you run stay in your browser — nothing is uploaded to a server. Refreshing the page clears all imported tables, since nothing is persisted beyond your current session.</p>
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
              <Link href="/data-tools/csv-studio" style={relatedLink}>CSV Studio →</Link>
              <Link href="/data-tools/xml-studio" style={relatedLink}>XML Studio →</Link>
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
              <Link href="/data-analyst" style={relatedLink}>AI Data Analyst →</Link>
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
const preStyle = { background: '#0F172A', color: '#E2E8F0', padding: '14px 16px', borderRadius: 10, fontSize: '0.8rem', overflowX: 'auto', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 };
const relatedLink = { fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' };
