import Link from 'next/link';
import SmartParserWorkspace from '../../../components/tools/data-tools/smart-parser/SmartParserWorkspace';

export const metadata = {
  title: 'Smart Parser — Extract Structured Data from Any Document | Convertam',
  description: 'Turn PDFs, scans, Word documents, spreadsheets and images into structured text, tables, and fields you can edit and export as CSV, JSON, or XLSX. Free, no login, define your own custom schema.',
  alternates: { canonical: '/data-tools/smart-parser' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Smart Parser',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A document parsing and structured-data-extraction workspace — upload a PDF, image, Word document, or spreadsheet and extract clean text, tables, and custom fields, with optional AI enhancement for scanned documents and ambiguous data.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/smart-parser',
};

const FAQ = [
  {
    q: 'What is document parsing, and how is it different from just converting a PDF?',
    a: 'Converting a PDF (to Word, for example) preserves the whole document as a document — same layout, same paragraphs, meant to be read. Parsing goes further: it reads the document and pulls out the specific pieces of information you actually need — an invoice number, a table of line items, a customer\'s email address — as data you can use in a spreadsheet, a database, or another program. Smart Parser does the second job.',
  },
  {
    q: 'What\'s the difference between OCR and document parsing?',
    a: 'OCR (Optical Character Recognition) solves one narrow problem: turning an image of text — a scanned page, a photo of a receipt — into text a computer can read at all. Parsing is the step after that: taking text (however it got there, OCR or otherwise) and understanding its structure — this is a table, this is an invoice number, this is a date — so it becomes usable data rather than one long undifferentiated block. Smart Parser reads real embedded text directly where it can, and uses AI-assisted OCR as a fallback for scans and images where it can\'t.',
  },
  {
    q: 'Will Smart Parser work on a scanned document or a photo?',
    a: 'Yes, with one difference in how it works. Documents with real embedded text (a PDF exported from Word, a native spreadsheet) get parsed instantly and locally in your browser, no AI needed. A scanned page or a photo has no embedded text at all — those need the optional "Analyze with AI" step, which reads the image content directly.',
  },
  {
    q: 'What is Custom Schema mode, and when should I use it?',
    a: 'Instead of extracting everything Smart Parser can find, Custom Schema mode lets you list exactly the fields you want — "Customer Name," "Invoice Number," "Total Amount," whatever matters for your workflow — and Smart Parser looks specifically for those. It\'s the right choice whenever you\'re processing similar documents repeatedly (invoices from the same supplier, forms in the same format) and know in advance what you need out of each one.',
  },
  {
    q: 'Can I correct a value Smart Parser got wrong?',
    a: 'Yes — every extracted field and every table cell is directly editable in the results view before you export anything. Automatic extraction is a starting point, not expected to be perfect on every document; the confidence indicator next to each field tells you how much to double-check it.',
  },
  {
    q: 'What happens to my document after I upload it?',
    a: 'It\'s processed to extract the text, tables, and fields you asked for, and is not kept afterward — see the Privacy section below for the full detail on what does and doesn\'t leave your device.',
  },
  {
    q: 'Does Smart Parser cost anything or require an account?',
    a: 'No — Smart Parser is free with no login. The optional "Analyze with AI" step uses the same AI infrastructure as other Convertam AI tools, but the core parsing (text, tables, labeled fields) runs entirely without it.',
  },
  {
    q: 'What file formats can I upload?',
    a: 'PDF, Word (DOCX), Excel (XLSX/XLS), CSV, plain text, and image files (JPG, PNG, WebP). Password-protected PDFs need their password removed first — Unlock PDF handles that.',
  },
  {
    q: 'Can Smart Parser extract tables from PDFs?',
    a: 'Yes — Extract Tables (or Parse Document, which picks the most useful mode automatically) looks for consistent, repeating column structure inside the PDF\'s text and reconstructs it into a real editable grid. Spreadsheet uploads (XLSX, XLS, CSV) skip that detection step entirely, since their rows and columns are already read directly.',
  },
  {
    q: 'Can I choose which fields to extract, or do I have to take everything?',
    a: 'You choose. Extract Data returns the common fields Smart Parser recognizes automatically (emails, dates, amounts, labeled fields, and so on), but Custom Schema lets you list the exact fields you need — for example, Customer Name, Invoice Number, Invoice Date, Total Amount, VAT, and Payment Status — and it searches specifically for those instead.',
  },
  {
    q: 'Can I export the results to Excel or CSV?',
    a: 'Yes. Any detected table can be downloaded as CSV or as a real XLSX workbook, and the field list can be downloaded as CSV as well — both open directly in Excel or Google Sheets with no import step.',
  },
  {
    q: 'What\'s the difference between the JSON and CSV export?',
    a: 'CSV is a flat table — rows and columns, the most universally compatible format for spreadsheets. JSON is the full structured result (fields, tables, and metadata together) as one machine-readable object, which is the better choice when the data is going into a script, an API, or another program rather than being opened by a person in a spreadsheet.',
  },
  {
    q: 'Why did some fields come back empty?',
    a: 'Smart Parser only fills in a field when it actually finds matching information in the document — it doesn\'t guess. A field stays empty when the document genuinely doesn\'t contain that information in a form it can recognize (for example, asking Custom Schema for a "Name" field from a document where names only appear inside an unlabeled table column, rather than as text or a labeled field). When that happens, it\'s a signal to check the source document or try Extract Tables instead — not a malfunction.',
  },
];

export default function SmartParserPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 720, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Smart Parser</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Upload a document and get back exactly the data you need — clean text, structured tables, or the specific fields you tell it to look for. Not another "convert your file" tool: Smart Parser reads a document and turns it into usable, editable, exportable data.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56 }}>
            <SmartParserWorkspace />
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* Original publisher content — genuinely written for this tool, not  */}
          {/* boilerplate around a bare upload box.                             */}
          {/* ------------------------------------------------------------------ */}
          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is document parsing?</h2>
              <p>
                Most of the documents that pass through a normal workday — an invoice from a supplier, a bank statement, a scanned form, a report someone emailed you — aren&apos;t built for a computer to understand. They&apos;re built to be read by a person. Document parsing is the process of reading a document the way a person does, but producing structured output instead of just comprehension: pulling out the specific pieces that actually matter (a total, a date, a customer name, a table of line items) so they can be used somewhere else — dropped into a spreadsheet, matched against a database, fed into another tool — without someone retyping them by hand.
              </p>
              <p>
                It sits between two things people often reach for instead and find lacking. A plain file converter (PDF to Word, for instance) preserves the document but doesn&apos;t understand it — you still have to read it and pull the numbers out yourself. A basic &quot;extract all text&quot; tool gives you every word, but as one undifferentiated block with no sense of what&apos;s a heading, what&apos;s a table, or what&apos;s an amount versus a date. Parsing is the layer that actually understands structure.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>OCR vs. document parsing</h2>
              <p>
                These two get conflated constantly, but they solve different problems. <strong>OCR (Optical Character Recognition)</strong> answers one question: what text is actually in this image? A scanned page or a photographed receipt has no real text in it at all — just pixels that happen to look like letters — and OCR is the technology that reads those pixels and produces actual, copyable text.
              </p>
              <p>
                <strong>Parsing</strong> is the step after that. Once you have text — whether it came from OCR, or was already embedded in a PDF exported straight from Word or Excel — parsing is what makes sense of its structure: recognizing that a run of characters is a table, that a labeled line is a field, that a cluster of digits with a currency symbol is an amount. A tool can do OCR without parsing (you get readable but unstructured text) or parsing without OCR (if the document already has real embedded text, like most PDFs generated from software rather than scanned). Smart Parser does both where each is actually needed: it reads embedded text directly and instantly wherever a document has it, and only reaches for AI-assisted OCR when a document is a genuine scan or photo with no embedded text to read.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Smart Parser extract?</h2>
              <p>Smart Parser doesn&apos;t just dump everything it finds into one block — you choose what you actually need, and it looks specifically for that.</p>
              <ul style={ul}>
                <li><strong>Text</strong> — the full readable content of the document, cleanly extracted and stripped of layout noise. Use this when you just need the words, not their structure.</li>
                <li><strong>Tables</strong> — rows and columns detected inside a PDF or block of text, or read directly from a spreadsheet, and reconstructed into a proper editable grid rather than visually-aligned text.</li>
                <li><strong>Fields</strong> — the identifiable pieces of information a document usually carries: names, emails, phone numbers, dates, currency amounts, invoice and reference numbers, postal codes and address lines, and anything written as &quot;Label: Value&quot; in the source (&quot;Invoice Number: INV-2026-0012&quot;, &quot;Due Date: 30 Aug 2026&quot;).</li>
                <li><strong>Custom Schema</strong> — the strongest mode. Instead of extracting everything Smart Parser can find, you list the exact fields your workflow needs and it searches specifically for those. For an invoice, that might be <em>Customer Name, Invoice Number, Invoice Date, Total Amount, VAT, Payment Status</em> — six fields, defined once, applied to every invoice you run through it. Fields it can&apos;t find in the document are shown as empty rather than guessed, so you know at a glance what needs a manual look.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How it works</h2>
              <ol style={ul}>
                <li><strong>Upload</strong> — drop in a PDF, image, Word document, spreadsheet, or text file.</li>
                <li><strong>Choose how to parse it</strong> — Extract Text, Extract Tables, Extract Data, Parse Document (Smart Parser picks the most useful representation automatically), or Custom Schema if you know exactly which fields you want.</li>
                <li><strong>Review the result</strong> — extracted text, tables, and fields are laid out in separate tabs, each with a confidence indicator so you can see at a glance what to double-check.</li>
                <li><strong>Correct anything necessary</strong> — every table cell and every field value is directly editable before you export, since automatic extraction is a starting point, not expected to be perfect on every document.</li>
                <li><strong>Export</strong> — download the result as TXT, CSV, JSON, Markdown, or XLSX, whichever fits where the data is going next.</li>
              </ol>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How table extraction works</h2>
              <p>
                A table inside a PDF or a block of extracted text isn&apos;t marked as a table anywhere — visually it&apos;s just rows of text that happen to line up. Smart Parser looks for the signal that reveals a real table hiding in that text: a consistent separator (tabs, commas, or evenly-spaced columns) repeating across multiple lines with the same number of fields each time. When it finds a block like that, it identifies the header row, splits every following line into the right columns, and scores its own confidence in the result — a table with clean, consistent structure scores high; one with ragged or inconsistent columns scores lower, and Smart Parser tells you so rather than presenting a shaky guess as a sure thing.
              </p>
              <p>
                Spreadsheet uploads (XLSX, XLS, CSV) skip the guesswork entirely — those formats already have real rows and columns built in, so Smart Parser reads the structure directly rather than reconstructing it from plain text.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Why structured data extraction matters</h2>
              <p>
                A PDF invoice is easy for a person to read and genuinely difficult for software to use — the total is just some text on a page, indistinguishable to a computer from any other number nearby. The moment that same total becomes <code style={code}>{'{ "field": "Total", "value": "245000" }'}</code>, it can be summed across a folder of invoices, checked against a purchase order, or dropped straight into an accounting system — none of which is possible while it&apos;s locked inside a page layout. That transformation, from a document meant for a human eye to data a program can act on, is the entire value of parsing: it&apos;s what turns a pile of paperwork into something you can actually work with at scale.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Invoices</strong> — Custom Schema pulls invoice number, customer name, date, VAT, and total straight out of a supplier&apos;s PDF, ready for your books instead of retyped by hand.</li>
                <li><strong>Receipts</strong> — Extract Data picks out merchant, date, items, and amount for expense tracking.</li>
                <li><strong>Reports</strong> — Extract Text and Extract Tables get the real prose and the real data tables out of a formatted PDF report, separately, instead of one undifferentiated block.</li>
                <li><strong>Bank statements</strong> — Extract Tables pulls structured transaction rows out of a statement export.</li>
                <li><strong>Business documents</strong> — quotations, delivery notes, purchase orders — any document with a consistent label/value structure works well with Custom Schema.</li>
                <li><strong>Scanned forms</strong> — a photograph or scan has no embedded text to read at all, so this is where OCR does its job first: &quot;Analyze with AI&quot; reads the image, then Smart Parser extracts its fields.</li>
                <li><strong>Research documents</strong> — Extract Text and Extract Tables pull the actual content and any data tables out of a long PDF for further analysis elsewhere.</li>
                <li><strong>Spreadsheet data</strong> — for a file that&apos;s already a spreadsheet (XLSX, XLS, CSV), Extract Tables reads the real rows and columns directly rather than reconstructing them from text — useful when you want the data cleaned up, validated, or re-exported in a different format.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>PDF parsing vs. PDF conversion</h2>
              <p>
                It&apos;s worth being precise about this distinction, since the two get used interchangeably. <strong>PDF conversion</strong> (like Convertam&apos;s own PDF to Word) changes the file&apos;s format while keeping it a whole, readable document — same content, same layout, different container. You still end up with a document, meant to be read top to bottom. <strong>PDF parsing</strong> throws away the idea of &quot;a document&quot; entirely and asks a narrower question: what specific pieces of data does this file contain? The output isn&apos;t a nicer-looking file — it&apos;s a table, a set of fields, or a block of clean text, structured for use rather than for reading. If you need to edit the document itself, convert it. If you need to pull data out of it, parse it.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Extracted data formats — and when to use each</h2>
              <ul style={ul}>
                <li><strong>TXT</strong> — the raw extracted text, nothing else. Good when you just need the words, not the structure.</li>
                <li><strong>CSV</strong> — a table or a field list as plain comma-separated rows. Opens directly in Excel, Google Sheets, or any spreadsheet tool, and is the most universally compatible structured format.</li>
                <li><strong>JSON</strong> — the full structured result (fields, tables, and metadata together) as one machine-readable object. The right choice when the extracted data is going into another program, script, or system rather than being read by a person.</li>
                <li><strong>Markdown</strong> — a readable report combining the summary, fields, and tables with real formatting, useful for pasting into documentation or a wiki.</li>
                <li><strong>XLSX</strong> — a detected table exported as a real Excel workbook, ready to use without any import/formatting step.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>When should I use Smart Parser?</h2>
              <p>Smart Parser is part of Convertam&apos;s Data Workspace — the group of tools built around cleaning, structuring, and reusing data, rather than editing a document&apos;s appearance. Knowing which job you actually have makes it easy to pick the right tool from the start:</p>
              <ul style={ul}>
                <li><strong>Use Smart Parser</strong> when you need to pull specific information or structure — text, tables, or fields — out of a document, rather than change the document itself.</li>
                <li><strong>Use <Link href="/pdf-tools" style={inlineLink}>PDF Tools</Link></strong> when the job is to merge, split, compress, edit, sign, or convert a PDF and you still want a PDF (or another document format) at the end.</li>
                <li><strong>Use <Link href="/ocr-pdf" style={inlineLink}>OCR PDF</Link></strong> when the only problem is that a scanned page or photo has no readable text at all, and you just need that text back — no field extraction, no tables, just the words.</li>
                <li><strong>Use <Link href="/data-tools/json-studio" style={inlineLink}>JSON Studio</Link>, <Link href="/data-tools/extract-studio" style={inlineLink}>Extract Studio</Link>, or <Link href="/data-tools/text-cleaner" style={inlineLink}>Text Cleaner Studio</Link></strong> once you already have text or structured data and want to keep cleaning, reformatting, or transforming it — Smart Parser is usually the step that gets you that data in the first place.</li>
                <li><strong>Use <Link href="/data-analyst" style={inlineLink}>AI Data Analyst</Link></strong> when you want a table or dataset actually analyzed — trends, summaries, answers to questions about the numbers — rather than just extracted.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and document security</h2>
              <p>
                Business documents are often sensitive — invoices carry client relationships, statements carry financial detail — so it&apos;s worth being explicit about what happens to what you upload. Files are processed only for the extraction you request and are not retained afterward; nothing is kept in permanent storage without a separate, explicit action on your part (like choosing to save a result). Deterministic parsing (text, tables, labeled fields) happens without any file ever leaving the extraction process for that request. The optional &quot;Analyze with AI&quot; step sends the relevant text (or image, for scans) to the AI enhancement service for that one request only, following the same file-handling architecture the rest of Convertam already uses — no separate, contradictory storage system for this tool. As a general practice, avoid uploading anything more sensitive than a given task actually requires.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <p>Automatic extraction is genuinely useful, but it isn&apos;t magic — it&apos;s worth knowing where it needs help before you rely on it:</p>
              <ul style={ul}>
                <li>Some complex or heavily-designed PDFs (multi-column layouts, unusual formatting) may not extract as cleanly as a simple, text-based document — always check the confidence indicator and correct anything that looks off before exporting.</li>
                <li>Scanned documents and photos have no embedded text to read at all, so they need the optional &quot;Analyze with AI&quot; step (AI-assisted OCR) rather than the instant local extraction that PDFs and spreadsheets get.</li>
                <li>Custom Schema works best when the information is written as clear labels or straightforward prose (&quot;Invoice Number: INV-2026-0012&quot;) — it can&apos;t reliably pull a field out of a raw table column that has no label of its own, since that&apos;s a job for Extract Tables instead.</li>
                <li>Unusual or inconsistent table layouts may score lower confidence, or need a quick manual review — Smart Parser tells you when a table looks shaky rather than presenting a guess as certain.</li>
                <li>The optional AI enhancement step depends on external AI infrastructure and isn&apos;t always available; when it isn&apos;t, you still get everything the deterministic parsing found, with a clear explanation of what the AI step couldn&apos;t add.</li>
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
              <Link href="/data-tools/extract-studio" style={relatedLink}>Extract Studio →</Link>
              <Link href="/data-tools/json-studio" style={relatedLink}>JSON Studio →</Link>
              <Link href="/data-tools/text-cleaner" style={relatedLink}>Text Cleaner Studio →</Link>
              <Link href="/data-analyst" style={relatedLink}>AI Data Analyst →</Link>
              <Link href="/ocr-pdf" style={relatedLink}>OCR PDF →</Link>
              <Link href="/smart-converter" style={relatedLink}>Smart AI Converter →</Link>
              <Link href="/receipt-scanner" style={relatedLink}>Receipt Scanner →</Link>
              <Link href="/invoice-generator" style={relatedLink}>Invoice Generator →</Link>
              <Link href="/pdf-to-excel" style={relatedLink}>PDF to Excel →</Link>
              <Link href="/pdf-tools" style={relatedLink}>PDF Tools →</Link>
              <Link href="/ai-tools" style={relatedLink}>AI Tools →</Link>
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
const inlineLink = { color: '#0E7490', fontWeight: 700, textDecoration: 'underline' };
