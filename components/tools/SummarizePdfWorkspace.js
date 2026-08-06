'use client';

import { useState, useMemo } from 'react';
import Script from 'next/script';
import { extractPdfPages } from '@/lib/pdfSummarize/extractPages';
import { LARGE_DOC_THRESHOLD_PAGES, MAX_PAGES_PER_RUN, validateSelection } from '@/lib/pdfSummarize/limits';
import { cleanPages } from '@/lib/pdfSummarize/clean';
import { detectSections } from '@/lib/pdfSummarize/chunk';
import { SUMMARY_TYPES, LENGTH_TARGETS, FOCUS_AREAS, CHAPTER_SUMMARY_META } from '@/lib/pdfSummarize/schema';
import { summaryToSections, chaptersToSections, sectionsToPlainText, sectionsToMarkdown } from '@/lib/pdfSummarize/formatSummary';
import { generateSummaryReportPdf } from '@/lib/pdfSummarize/summaryPdf';

const SUMMARY_TYPE_LIST = [...Object.values(SUMMARY_TYPES), CHAPTER_SUMMARY_META];
const LENGTH_OPTIONS = Object.entries(LENGTH_TARGETS).map(([id, v]) => ({ id, label: v.label, hint: v.hint }));
const RANGE_OPTIONS = [
  { id: 'all', label: 'Entire document' },
  { id: 'first20', label: 'First 20 pages' },
  { id: 'range', label: 'Page range' },
];

function segStyle(active) {
  return {
    padding: '9px 12px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#3a63b8' : '#e2dcc9', background: active ? '#f0f5ff' : '#fffefb',
    color: active ? '#3a63b8' : '#1c2333', fontWeight: active ? 700 : 500, fontSize: '0.82rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  };
}

function chipStyle(active) {
  return {
    padding: '6px 12px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
    borderColor: active ? '#3a63b8' : '#e2dcc9', background: active ? '#f0f5ff' : '#fffefb',
    color: active ? '#3a63b8' : '#1c2333', fontWeight: active ? 700 : 500, fontSize: '0.76rem',
  };
}

function buildSelection(rangeMode, rangeStart, rangeEnd) {
  if (rangeMode === 'all') return 'all';
  if (rangeMode === 'first20') return { start: 1, end: 20 };
  return { start: Number(rangeStart) || 1, end: Number(rangeEnd) || 1 };
}

function estimateChunkCount(pages, selection, pageCount) {
  const start = selection === 'all' ? 1 : Math.max(1, selection.start || 1);
  const end = selection === 'all' ? pageCount : Math.min(pageCount, selection.end || pageCount);
  const selected = pages.slice(start - 1, end);
  const words = selected.reduce((sum, p) => sum + (p.text ? p.text.split(/\s+/).filter(Boolean).length : 0), 0);
  return Math.max(1, Math.ceil(words / 2500));
}

export default function SummarizePdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pageData, setPageData] = useState(null); // { pages, pageCount }
  const [hasChapters, setHasChapters] = useState(false);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const [type, setType] = useState('smart');
  const [focusAreas, setFocusAreas] = useState([]);
  const [rangeMode, setRangeMode] = useState('all');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(20);
  const [length, setLength] = useState('medium');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [resultPages, setResultPages] = useState(null); // the exact page slice the current result was generated from — reused by "Ask this document"'s full-text fallback
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState('');

  const [askHistory, setAskHistory] = useState([]); // [{ role: 'user'|'assistant', text }]
  const [askQuestion, setAskQuestion] = useState('');
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState('');

  const isLargeDoc = pageData && pageData.pageCount > LARGE_DOC_THRESHOLD_PAGES;
  const showLength = type !== 'executive' && type !== 'chapter';

  const sections = useMemo(() => {
    if (!result) return [];
    return result.type === 'chapter' ? chaptersToSections(result.chapters) : summaryToSections(result.type, result.summary);
  }, [result]);

  function toggleFocusArea(area) {
    setFocusAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  }

  async function handleFile(e) {
    const chosen = e.target.files[0] || null;
    setFile(chosen);
    setPageData(null);
    setResult(null);
    setError('');
    setRangeMode('all');
    if (!chosen || !pdfjsReady) return;

    setExtracting(true);
    try {
      const data = await extractPdfPages(chosen);
      if (!data.pages.some((p) => p.text.trim().length > 0)) {
        setError('Could not extract any text from this PDF — it may be a scanned image. Try OCR PDF instead.');
      } else {
        setPageData(data);
        setRangeEnd(Math.min(20, data.pageCount));
        // Cheap, local check (no AI call) so Chapter Summary can be
        // disabled up front rather than failing after a round trip.
        const cleaned = cleanPages(data.pages);
        setHasChapters(detectSections(cleaned).length > 0);
        if (type === 'chapter' && detectSections(cleaned).length === 0) setType('smart');
      }
    } catch (err) {
      setError(err.message || 'Could not read this PDF.');
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setFile(null);
    setPageData(null);
    setResult(null);
    setResultPages(null);
    setError('');
    setStatus('');
    setAskHistory([]);
    setAskQuestion('');
    setAskError('');
  }

  async function handleGenerate() {
    if (!pageData) return;
    const selection = buildSelection(rangeMode, rangeStart, rangeEnd);
    const start = selection === 'all' ? 1 : Math.max(1, selection.start);
    const end = selection === 'all' ? pageData.pageCount : Math.min(pageData.pageCount, selection.end);
    const selectedPages = pageData.pages.slice(start - 1, end);
    const totalCharacters = selectedPages.reduce((sum, p) => sum + p.text.length, 0);

    const limitError = validateSelection({ pageCount: pageData.pageCount, selection, totalCharacters });
    if (limitError) {
      setError(limitError);
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    setResultPages(null);
    setAskHistory([]);
    setAskQuestion('');
    setAskError('');

    const chunkCount = estimateChunkCount(pageData.pages, selection, pageData.pageCount);
    const stages = type === 'chapter'
      ? ['Cleaning document…', 'Detecting chapters…', 'Summarizing each chapter…']
      : ['Cleaning document…', 'Detecting sections…', chunkCount > 1 ? `Summarizing ${chunkCount} sections…` : 'Summarizing…', 'Combining into final summary…'];
    let stageIndex = 0;
    setStatus(stages[0]);
    const stageInterval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setStatus(stages[stageIndex]);
    }, Math.max(1200, chunkCount * 900));

    try {
      const res = await fetch('/api/summarize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pageData.pages, type, length, selection, focusAreas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not summarize this document.');
      setResult(data);
      setResultPages(selectedPages);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      clearInterval(stageInterval);
      setStatus('');
      setBusy(false);
    }
  }

  const summaryTitle = result ? (SUMMARY_TYPES[result.type]?.label || 'Chapter Summary') : '';
  const baseFileName = file?.name?.replace(/\.pdf$/i, '') || 'document';

  async function handleCopy() {
    await navigator.clipboard.writeText(sectionsToPlainText(sections, summaryTitle));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadTxt() {
    downloadBlob(sectionsToPlainText(sections, summaryTitle), 'text/plain', `${baseFileName}-summary.txt`);
  }

  function handleDownloadMarkdown() {
    downloadBlob(sectionsToMarkdown(sections, summaryTitle), 'text/markdown', `${baseFileName}-summary.md`);
  }

  async function handleDownloadPdf() {
    setExporting('pdf');
    try {
      await generateSummaryReportPdf({
        title: summaryTitle,
        sourceFileName: file?.name,
        sections,
        privacyNote: 'Generated by Convertam — your document was processed locally in your browser; only extracted text was sent to our AI.',
        fileName: `${baseFileName}-summary.pdf`,
      });
    } finally {
      setExporting('');
    }
  }

  async function handleDownloadDocx() {
    setExporting('docx');
    try {
      const res = await fetch('/api/summarize-pdf-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: summaryTitle, sourceFileName: file?.name, sections }),
      });
      if (!res.ok) throw new Error('Could not generate the Word document.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFileName}-summary.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Could not generate the Word document.');
    } finally {
      setExporting('');
    }
  }

  async function handleAsk() {
    const question = askQuestion.trim();
    if (!question || !result) return;
    const nextHistory = [...askHistory, { role: 'user', text: question }];
    setAskHistory(nextHistory);
    setAskQuestion('');
    setAskError('');
    setAskBusy(true);
    try {
      const res = await fetch('/api/summarize-pdf-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: askHistory,
          type: result.type,
          summary: result.summary,
          chapters: result.chapters,
          pages: resultPages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not answer that question.');
      setAskHistory([...nextHistory, { role: 'assistant', text: data.answer, usedFullText: data.usedFullText }]);
    } catch (err) {
      setAskError(err.message || 'Something went wrong. Please try again.');
      setAskHistory(askHistory); // drop the just-added question on failure so retyping doesn't duplicate it
    } finally {
      setAskBusy(false);
    }
  }

  return (
    <div className="panel" style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      {!result && (
        <>
          {!file && (
            <label className="dropzone block cursor-pointer mb-4">
              <input type="file" accept="application/pdf" onChange={handleFile} disabled={!pdfjsReady} hidden />
              <div className="dz-icon">[ PDF ]</div>
              <div className="dz-main">Click to choose a PDF, or drag it here</div>
              <div className="dz-sub">Works best with text-based PDFs. Max 100MB.</div>
            </label>
          )}

          {file && extracting && (
            <div className="status mb-3">Reading {file.name}…</div>
          )}

          {file && pageData && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-ink text-sm">{file.name}</p>
                  <p className="text-xs text-ink-soft">{pageData.pageCount} page{pageData.pageCount === 1 ? '' : 's'} detected</p>
                </div>
                <button className="btn-ghost-sm" onClick={reset}>Change file</button>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">Summary type</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {SUMMARY_TYPE_LIST.map((t) => {
                    const disabled = t.id === 'chapter' && !hasChapters;
                    return (
                      <button
                        key={t.id}
                        onClick={() => !disabled && setType(t.id)}
                        disabled={disabled}
                        title={disabled ? 'No chapters or headings detected in this document' : t.description}
                        style={{ ...segStyle(type === t.id), opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', alignItems: 'flex-start', textAlign: 'left' }}
                      >
                        <span>{t.icon} {t.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-soft mt-2">{SUMMARY_TYPES[type]?.description}</p>
              </div>

              {isLargeDoc && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">
                    This document has {pageData.pageCount} pages — what should be summarized?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: rangeMode === 'range' ? 10 : 0 }}>
                    {RANGE_OPTIONS.map((opt) => (
                      <button key={opt.id} onClick={() => setRangeMode(opt.id)} style={segStyle(rangeMode === opt.id)}>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {rangeMode === 'range' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-ink-soft">Pages</span>
                      <input type="number" min={1} max={pageData.pageCount} value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1px solid #e2dcc9', fontSize: '0.82rem' }} />
                      <span className="text-xs text-ink-soft">to</span>
                      <input type="number" min={1} max={pageData.pageCount} value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1px solid #e2dcc9', fontSize: '0.82rem' }} />
                      <span className="text-xs text-ink-soft">of {pageData.pageCount} (max {MAX_PAGES_PER_RUN} pages per summary)</span>
                    </div>
                  )}
                </div>
              )}

              {showLength && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">Summary length</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {LENGTH_OPTIONS.map((opt) => (
                      <button key={opt.id} onClick={() => setLength(opt.id)} style={segStyle(length === opt.id)}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 400, color: length === opt.id ? '#3a63b8' : '#8a8477' }}>{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {type === 'executive' && (
                <p className="text-xs text-ink-soft mb-6">Executive Summary is a fixed 300–500 words.</p>
              )}

              <div className="mb-6">
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">Focus on (optional)</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FOCUS_AREAS.map((area) => (
                    <button key={area} onClick={() => toggleFocusArea(area)} style={chipStyle(focusAreas.includes(area))}>
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="actions">
                <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
                  {busy ? status || 'Working…' : '✨ Generate Summary'}
                </button>
              </div>
            </>
          )}

          {error && <div className="status error mt-3">{error}</div>}
        </>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-ink">{summaryTitle}</p>
              <p className="text-xs text-ink-soft">{file?.name}</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Summarize another</button>
          </div>

          <div className="flex items-center gap-2 mb-4 text-xs font-medium" style={{ color: '#8a8477' }}>
            <span>📖 {result.readingTimeMinutes} min read</span>
            <span>·</span>
            <span>{result.wordCount} words</span>
            {result.type === 'chapter' && <><span>·</span><span>{result.chapterCount} chapters</span></>}
          </div>

          <div
            className="rounded-xl p-4 mb-4 text-sm leading-relaxed"
            style={{ background: '#f7f4ec', border: '1px solid #e2dcc9', color: '#1c2333', maxHeight: '480px', overflowY: 'auto' }}
          >
            {sections.length === 0 && <p className="text-ink-soft">No content was returned for this summary type.</p>}
            {sections.map((s, i) => (
              <div key={i} className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#8a8477' }}>{s.heading}</p>
                {s.kind === 'list' ? (
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {s.items.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                ) : (
                  <p>{s.items[0]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="actions" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button className="btn btn-ghost" onClick={handleDownloadTxt}>📥 TXT</button>
            <button className="btn btn-ghost" onClick={handleDownloadMarkdown}>📝 Markdown</button>
            <button className="btn btn-ghost" disabled={exporting === 'pdf'} onClick={handleDownloadPdf}>
              {exporting === 'pdf' ? 'Generating…' : '📄 PDF'}
            </button>
            <button className="btn btn-ghost" disabled={exporting === 'docx'} onClick={handleDownloadDocx}>
              {exporting === 'docx' ? 'Generating…' : '📃 Word'}
            </button>
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #e2dcc9' }}>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">💬 Ask this document</p>

            {askHistory.length > 0 && (
              <div className="mb-3" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {askHistory.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div
                      className="text-sm"
                      style={{
                        padding: '8px 12px', borderRadius: 12, lineHeight: 1.5,
                        background: m.role === 'user' ? '#3a63b8' : '#f0f5ff',
                        color: m.role === 'user' ? '#fff' : '#1c2333',
                        border: m.role === 'user' ? 'none' : '1px solid #dce6fb',
                      }}
                    >
                      {m.text}
                    </div>
                    {m.role === 'assistant' && m.usedFullText && (
                      <p className="text-xs mt-1" style={{ color: '#8a8477' }}>Checked the full document for this one</p>
                    )}
                  </div>
                ))}
                {askBusy && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                    <div className="text-sm" style={{ padding: '8px 12px', borderRadius: 12, background: '#f0f5ff', border: '1px solid #dce6fb', color: '#8a8477' }}>Thinking…</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !askBusy) handleAsk(); }}
                placeholder="Ask a question about this document…"
                disabled={askBusy}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #e2dcc9', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
              <button className="btn btn-primary" disabled={askBusy || !askQuestion.trim()} onClick={handleAsk}>
                {askBusy ? '…' : 'Ask'}
              </button>
            </div>
            {askError && <div className="status error mt-2">{askError}</div>}
            <p className="text-xs text-ink-soft mt-2">Answered from this summary — for very specific details, it may also check the original document text.</p>
          </div>
        </div>
      )}

      <p className="privacy-note mt-4">
        Your PDF is read locally in your browser. Only the extracted text is sent to our AI — your file is never uploaded.
      </p>
    </div>
  );
}
