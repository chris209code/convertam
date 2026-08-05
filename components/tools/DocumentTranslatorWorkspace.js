'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Script from 'next/script';
import { Document, Packer, Paragraph } from 'docx';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import { waitForPdfjs } from '@/lib/workspace/waitForPdfjs';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import { validateFileSize, validateTextLength, validatePageCount, MAX_CHARACTERS } from '@/lib/documentTranslate/limits';
import { extractBlocks, reinjectBlocks } from '@/lib/documentTranslate/htmlBlocks';

// Pinned languages surface above the full alphabetical list below — the
// African languages this tool differentiates on (per the owner's brief),
// plus the other most-requested world languages. Everything else Gemini
// can reasonably translate is still reachable in the full list or by
// search; this is a shortcut, not a restriction.
const PINNED_LANGUAGES = [
  'English', 'French', 'Spanish', 'Portuguese', 'German', 'Arabic', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Bengali', 'Turkish', 'Russian', 'Ukrainian', 'Italian', 'Dutch',
  'Yoruba', 'Hausa', 'Igbo', 'Swahili', 'Amharic', 'Somali', 'Zulu', 'Xhosa', 'Afrikaans',
];

// A broad, alphabetically-ordered set of world languages — deliberately not
// scoped to "languages we've specifically tested," since Gemini is a
// general-purpose multilingual model rather than a service with a fixed,
// published per-language certification list the way a dedicated translation
// API would have. Kept as one flat list (search + pinned both read from it)
// rather than a second, separately-maintained list, so there's exactly one
// place that ever needs a language added.
const ALL_LANGUAGES = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Belarusian', 'Bengali',
  'Bosnian', 'Bulgarian', 'Burmese', 'Catalan', 'Cebuano', 'Chichewa', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Esperanto', 'Estonian', 'Filipino', 'Finnish',
  'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian',
  'Hebrew', 'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Irish', 'Italian', 'Japanese',
  'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Korean', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian',
  'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori', 'Marathi',
  'Mongolian', 'Nepali', 'Nigerian Pidgin', 'Norwegian', 'Odia', 'Pashto', 'Persian', 'Polish', 'Portuguese',
  'Punjabi', 'Romanian', 'Russian', 'Samoan', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Shona', 'Sindhi', 'Sinhala',
  'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu',
  'Thai', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish',
  'Yoruba', 'Zulu',
];

// Formatting preservation is now automatic by file type, not a mode the
// user picks — these two only ever affect translation quality/speed.
const MODES = [
  { id: 'fast', label: '⚡ Fast', desc: 'Optimized for speed — suitable for everyday translation.' },
  { id: 'accurate', label: '🧠 Accurate', desc: 'Better context awareness, wording and sentence flow — slightly slower.' },
];

const RECENT_LANGUAGES_KEY = 'convertam_translator_recent_languages';

function readRecentLanguages() {
  try {
    const raw = localStorage.getItem(RECENT_LANGUAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function rememberLanguage(lang) {
  try {
    const existing = readRecentLanguages().filter((l) => l !== lang);
    localStorage.setItem(RECENT_LANGUAGES_KEY, JSON.stringify([lang, ...existing].slice(0, 5)));
  } catch { /* localStorage unavailable — not worth surfacing an error for */ }
}

// Checks the page count as soon as it's known — before extracting a single
// page of text — so an oversized PDF is rejected without doing any of the
// extraction work, matching the "validate before sending, never send an
// oversized document and reject it afterward" requirement.
async function extractPdfText(file) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pageError = validatePageCount(pdf.numPages);
  if (pageError) { const err = new Error(pageError); err.isLimitError = true; throw err; }
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n\n';
  }
  return text.trim();
}

async function extractDocxHtml(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const buf = await file.arrayBuffer();
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buf }),
    mammoth.convertToHtml({ arrayBuffer: buf }),
  ]);
  return { text: (textResult.value || '').trim(), html: htmlResult.value || '' };
}

// Lightweight, direct extraction — no PPTX-reading library exists in this
// codebase yet, so this unzips the file (pptx is a zip of slide XML) and
// pulls out <a:t> text runs per slide. Good enough for Fast/Accurate
// translation; a real per-slide visual render is out of scope for Phase 1.
async function extractPptxSlides(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });

  const slideCountError = validatePageCount(slideFiles.length);
  if (slideCountError) { const err = new Error(slideCountError); err.isLimitError = true; throw err; }

  const slides = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('text');
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    slides.push(runs.filter(Boolean));
  }
  return slides;
}

async function extractTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.readAsText(file);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function baseName(name) {
  return (name || 'document').replace(/\.[^.]+$/, '');
}

export default function DocumentTranslatorWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();

  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('French');
  const [mode, setMode] = useState('fast');
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'paste'

  const [fileInfo, setFileInfo] = useState(null); // { name, mimeType, kind }
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [docxHtml, setDocxHtml] = useState('');
  const [pptxSlides, setPptxSlides] = useState(null);

  const [sourceText, setSourceText] = useState('');
  const textHistoryRef = useRef({ stack: [''], pointer: 0 });

  const [langMenuOpen, setLangMenuOpen] = useState(null); // 'source' | 'target' | null
  const [langSearch, setLangSearch] = useState('');
  const [recentLanguages, setRecentLanguages] = useState([]);

  const [stage, setStage] = useState(''); // '' | 'reading' | 'translating' | 'ready'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [translatedText, setTranslatedText] = useState(''); // flat text — always kept, used for Copy/.txt regardless of source format
  const [translatedHtml, setTranslatedHtml] = useState(''); // DOCX only — structure-preserved result, feeds the preview and the .docx download
  const [translatedSlides, setTranslatedSlides] = useState(null); // PPTX only — translated per-slide text, feeds the preview and the .pptx download
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState('');

  const fileRef = useRef(null);
  // Holds the live DOM (doc + Text node references) extracted from the
  // uploaded DOCX's HTML — kept in a ref rather than state because it's
  // mutated in place at translate time (see reinjectBlocks) and DOM nodes
  // aren't meaningfully serializable React state anyway.
  const docxExtractionRef = useRef(null);
  // Remembers how many text runs belonged to each PPTX slide, so the
  // flattened, translated blocks array can be regrouped back into slides.
  const pptxSlideRunCountsRef = useRef(null);
  // "One active translation request at a time" is enforced with a ref, not
  // just the `busy` state above — state updates are async, so a very fast
  // double-click/double-Enter can fire twice before the first re-render
  // lands (the same race CVImproverWorkspace was hardened against earlier).
  const translatingRef = useRef(false);

  useEffect(() => { setRecentLanguages(readRecentLanguages()); }, []);

  const canTranslate = sourceText.trim().length > 0 && !busy;
  const overLimit = sourceText.length > MAX_CHARACTERS;

  function pushTextSnapshot(text) {
    const h = textHistoryRef.current;
    const truncated = h.stack.slice(0, h.pointer + 1);
    truncated.push(text);
    textHistoryRef.current = { stack: truncated.slice(-30), pointer: Math.min(truncated.length - 1, 29) };
  }

  function handleTextChange(value) {
    setSourceText(value);
    pushTextSnapshot(value);
  }

  function undo() {
    const h = textHistoryRef.current;
    if (h.pointer <= 0) return;
    h.pointer -= 1;
    setSourceText(h.stack[h.pointer]);
  }

  function redo() {
    const h = textHistoryRef.current;
    if (h.pointer >= h.stack.length - 1) return;
    h.pointer += 1;
    setSourceText(h.stack[h.pointer]);
  }

  function resetPreview() {
    setPdfPreviewUrl(null);
    setDocxHtml('');
    setPptxSlides(null);
    setTranslatedText('');
    setTranslatedHtml('');
    setTranslatedSlides(null);
    setDetectedSourceLanguage('');
    setError('');
    docxExtractionRef.current = null;
    pptxSlideRunCountsRef.current = null;
  }

  async function handleFile(file, { fromSession = false } = {}) {
    if (!file) return;
    const sizeError = validateFileSize(file);
    if (sizeError) { setError(sizeError); return; }

    resetPreview();
    setStage('reading');
    setBusy(true);

    const name = (file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isDocx = file.type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc');
    const isPptx = file.type.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt');
    const isTxt = file.type === 'text/plain' || name.endsWith('.txt');

    try {
      let text = '';
      if (isPdf) {
        text = await extractPdfText(file);
        setPdfPreviewUrl(URL.createObjectURL(file));
        if (!text) { setError('Could not extract any text from this PDF — it may be a scanned image. Try OCR PDF first, or paste your text manually.'); setBusy(false); setStage(''); return; }
      } else if (isDocx) {
        const { text: t, html } = await extractDocxHtml(file);
        text = t;
        setDocxHtml(html);
        if (!text) { setError('Could not extract any text from this document. Please paste your text manually instead.'); setBusy(false); setStage(''); return; }
      } else if (isPptx) {
        const slides = await extractPptxSlides(file);
        setPptxSlides(slides);
        text = slides.map((s) => s.join('\n')).join('\n\n');
        if (!text) { setError('Could not extract any text from this presentation. Please paste your text manually instead.'); setBusy(false); setStage(''); return; }
      } else if (isTxt) {
        text = await extractTextFile(file);
        if (!text.trim()) { setError('This file appears to be empty.'); setBusy(false); setStage(''); return; }
      } else {
        setError('Unsupported file type — please upload a PDF, Word, PowerPoint or text file.');
        setBusy(false); setStage('');
        return;
      }

      const lengthError = validateTextLength(text);
      if (lengthError) { setError(lengthError); setBusy(false); setStage(''); return; }

      setFileInfo({ name: file.name, mimeType: file.type, isPdf, isDocx, isPptx, isTxt });
      setSourceText(text);
      textHistoryRef.current = { stack: [text], pointer: 0 };
      setInputMode('upload');

      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          await startSession(file, { toolSlug: 'document-translator' });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.isLimitError ? err.message : 'Could not read this file. Please try another file, or paste your text manually instead.');
    } finally {
      setBusy(false);
      setStage('');
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    if (f) handleFile(f, { fromSession: true });
  }
  useAutoContinueSession('document-translator', async () => { await waitForPdfjs(); continueWithSessionDocument(); });

  function switchToPaste() {
    resetPreview();
    setFileInfo(null);
    setInputMode('paste');
    setSourceText('');
    textHistoryRef.current = { stack: [''], pointer: 0 };
  }

  function swapLanguages() {
    if (sourceLanguage === 'auto') return; // nothing concrete to swap into the target slot yet
    const prevTarget = targetLanguage;
    setTargetLanguage(sourceLanguage);
    setSourceLanguage(prevTarget);
  }

  function selectLanguage(which, lang) {
    if (which === 'source') setSourceLanguage(lang);
    else { setTargetLanguage(lang); rememberLanguage(lang); setRecentLanguages(readRecentLanguages()); }
    setLangMenuOpen(null);
    setLangSearch('');
  }

  // Flat-text pipeline — PDF, TXT, and pasted text, none of which have a
  // real structure to preserve. Unchanged from Phase 1.
  async function translateFlatText() {
    const res = await fetch('/api/document-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sourceText, sourceLanguage, targetLanguage, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Translation failed.');
    setTranslatedText(data.translatedText);
    setDetectedSourceLanguage(data.detectedSourceLanguage || '');
    return data.translatedText;
  }

  // Structure-preserving pipeline for DOCX — extract every real text node
  // from the HTML mammoth already parsed out of the uploaded file, translate
  // just those strings (same order, same count), then write the
  // translations back into the exact same nodes. Every heading, bold/
  // italic/underline run, list, table, hyperlink, and image is untouched;
  // only the text inside changed.
  async function translateDocxStructure() {
    const extraction = extractBlocks(docxHtml);
    docxExtractionRef.current = extraction;

    const res = await fetch('/api/document-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: extraction.blocks, sourceLanguage, targetLanguage, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Translation failed.');

    const html = reinjectBlocks(extraction, data.translatedBlocks);
    setTranslatedHtml(html);
    setDetectedSourceLanguage(data.detectedSourceLanguage || '');
    const flat = data.translatedBlocks.join('\n\n');
    setTranslatedText(flat);
    return flat;
  }

  // Lightweight structure-preserving pipeline for PPTX — the per-slide text
  // runs extracted at upload time are flattened into one blocks array (so
  // translation still happens in a single request), then regrouped back
  // into slides using the run counts remembered from extraction. Slide
  // count and slide-by-slide text order survive; the original visual
  // design does not (see extractPptxSlides).
  async function translatePptxStructure() {
    const counts = pptxSlides.map((s) => s.length);
    pptxSlideRunCountsRef.current = counts;
    const blocks = pptxSlides.flat();

    const res = await fetch('/api/document-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, sourceLanguage, targetLanguage, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Translation failed.');

    let cursor = 0;
    const slides = counts.map((count) => {
      const slice = data.translatedBlocks.slice(cursor, cursor + count);
      cursor += count;
      return slice;
    });
    setTranslatedSlides(slides);
    setDetectedSourceLanguage(data.detectedSourceLanguage || '');
    const flat = slides.map((s) => s.join('\n')).join('\n\n');
    setTranslatedText(flat);
    return flat;
  }

  async function runTranslate() {
    if (!canTranslate || overLimit || translatingRef.current) return;
    translatingRef.current = true;
    setBusy(true);
    setError('');
    setStage('translating');
    setTranslatedText('');
    setTranslatedHtml('');
    setTranslatedSlides(null);

    try {
      // Formatting preservation is automatic by file type — not a mode the
      // user picks. DOCX and PPTX get the structure-preserving pipeline;
      // everything else (PDF/TXT/paste) gets the flat-text pipeline that
      // already existed.
      let flatTranslatedText;
      if (fileInfo?.isDocx) {
        flatTranslatedText = await translateDocxStructure();
      } else if (fileInfo?.isPptx) {
        flatTranslatedText = await translatePptxStructure();
      } else {
        flatTranslatedText = await translateFlatText();
      }
      setStage('ready');

      // Only pushes into the workspace session when one is already active —
      // most casual (no-session) visitors never trigger the Puppeteer PDF
      // render below, keeping this free tool's operating cost tied to
      // actual multi-step usage rather than every single translation. The
      // session document stays PDF regardless of source format — every
      // other session-compatible tool (Sign PDF, Merge PDF, etc.) expects
      // one — the structure-preserving DOCX/PPTX downloads are separate,
      // explicit choices below, not what gets pushed into the workspace.
      if (session.status === 'active') {
        const pdfRes = await fetch('/api/document-translate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: flatTranslatedText, title: `${baseName(fileInfo?.name)} — translated to ${targetLanguage}` }),
        });
        if (pdfRes.ok) {
          const buf = new Uint8Array(await pdfRes.arrayBuffer());
          await updateDocument(buf, {
            toolSlug: 'document-translator',
            label: `Translated to ${targetLanguage}`,
            mimeType: 'application/pdf',
            name: `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.pdf`,
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStage('');
    } finally {
      setBusy(false);
      translatingRef.current = false;
    }
  }

  function copyTranslated() {
    navigator.clipboard.writeText(translatedText);
  }

  function downloadTxt() {
    downloadBlob(new Blob([translatedText], { type: 'text/plain' }), `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.txt`);
  }

  async function downloadDocx() {
    setDownloadingFormat('docx');
    try {
      // Real structure-preserving DOCX for DOCX-sourced translations —
      // built server-side from the same translatedHtml shown in the right
      // panel. Everything else (PDF/TXT/paste sources, no structure to
      // preserve in the first place) keeps the simple paragraphs-only
      // client-side build.
      if (fileInfo?.isDocx && translatedHtml) {
        const res = await fetch('/api/document-translate-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: translatedHtml, title: `${baseName(fileInfo?.name)} — translated to ${targetLanguage}` }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not generate the Word document.'); }
        const blob = await res.blob();
        downloadBlob(blob, `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.docx`);
        return;
      }

      const paragraphs = translatedText.split(/\n{2,}/).map((p) => new Paragraph({ text: p }));
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.docx`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingFormat('');
    }
  }

  // PPTX rebuild happens entirely client-side via pptxgenjs, same pattern
  // already used by PresentationGeneratorWorkspace/DataAnalystWorkspace —
  // no server route needed. One slide per original slide, translated text
  // stacked as plain lines — structure (slide count/order) is preserved,
  // the original visual design is not (see extractPptxSlides).
  async function downloadPptx() {
    setDownloadingFormat('pptx');
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      (translatedSlides || []).forEach((lines) => {
        const slide = pptx.addSlide();
        if (lines.length) {
          slide.addText(lines.join('\n'), { x: 0.5, y: 0.4, w: 9, h: 4.7, fontSize: 16, valign: 'top', color: '1F2937' });
        }
      });
      await pptx.writeFile({ fileName: `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.pptx` });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingFormat('');
    }
  }

  async function downloadPdf() {
    setDownloadingFormat('pdf');
    try {
      const res = await fetch('/api/document-translate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: translatedText, title: `${baseName(fileInfo?.name)} — translated to ${targetLanguage}` }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not generate the PDF.'); }
      const blob = await res.blob();
      downloadBlob(blob, `${baseName(fileInfo?.name)}-${targetLanguage.toLowerCase()}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingFormat('');
    }
  }

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return null;
    const q = langSearch.trim().toLowerCase();
    return ALL_LANGUAGES.filter((l) => l.toLowerCase().includes(q));
  }, [langSearch]);

  // Paste mode shows its editable textarea immediately, even before any text
  // is typed — gating on sourceText.length would hide the very box the user
  // needs to type into right after choosing "Paste text instead."
  const hasSource = !!fileInfo || inputMode === 'paste';

  return (
    <div className="flex flex-col gap-5">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {/* Language selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <LanguagePicker
          label="Source"
          value={sourceLanguage === 'auto' ? 'Detect automatically' : sourceLanguage}
          isOpen={langMenuOpen === 'source'}
          onToggle={() => setLangMenuOpen(langMenuOpen === 'source' ? null : 'source')}
          onSelect={(l) => selectLanguage('source', l)}
          onSelectAuto={() => selectLanguage('source', 'auto')}
          showAuto
          search={langSearch}
          setSearch={setLangSearch}
          filtered={filteredLanguages}
          recent={recentLanguages}
        />
        <button
          onClick={swapLanguages}
          disabled={sourceLanguage === 'auto'}
          title={sourceLanguage === 'auto' ? 'Pick a source language first' : 'Swap languages'}
          style={{ padding: '10px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', cursor: sourceLanguage === 'auto' ? 'default' : 'pointer', opacity: sourceLanguage === 'auto' ? 0.4 : 1, flexShrink: 0 }}
        >
          ⇄
        </button>
        <LanguagePicker
          label="Target"
          value={targetLanguage}
          isOpen={langMenuOpen === 'target'}
          onToggle={() => setLangMenuOpen(langMenuOpen === 'target' ? null : 'target')}
          onSelect={(l) => selectLanguage('target', l)}
          search={langSearch}
          setSearch={setLangSearch}
          filtered={filteredLanguages}
          recent={recentLanguages}
        />
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => !m.disabled && setMode(m.id)}
            disabled={m.disabled}
            title={m.desc}
            style={{
              flex: '1 1 140px', padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              border: mode === m.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: mode === m.id ? '#EFF6FF' : 'white',
              opacity: m.disabled ? 0.5 : 1, cursor: m.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: mode === m.id ? '#1D4ED8' : '#334155' }}>{m.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Split workspace */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* LEFT: source */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Source</span>
            {hasSource && (
              <div style={{ display: 'flex', gap: 6 }}>
                {inputMode === 'paste' && (
                  <>
                    <button onClick={undo} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>↶ Undo</button>
                    <button onClick={redo} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>↷ Redo</button>
                  </>
                )}
                <button onClick={() => { setFileInfo(null); resetPreview(); setSourceText(''); setInputMode('upload'); }} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>⇄ Replace</button>
              </div>
            )}
          </div>

          {!hasSource ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {session.status === 'active' && session.document && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }} aria-hidden="true">📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>already in this session — no need to re-upload.</div>
                  </div>
                  <button onClick={continueWithSessionDocument} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Continue</button>
                </div>
              )}
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer"
                style={{ borderColor: '#e2dcc9', background: '#fffefb', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="text-3xl mb-2">🌐</div>
                <p className="font-medium text-ink mb-1 text-sm">Drop a PDF, Word, PowerPoint or text file</p>
                <p className="text-xs text-ink-soft">or</p>
                <button onClick={(e) => { e.stopPropagation(); switchToPaste(); }} className="text-xs font-semibold underline mt-2" style={{ color: '#2563EB' }}>Paste text instead</button>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {fileInfo && (
                <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 8 }}>📄 {fileInfo.name}</div>
              )}
              {fileInfo?.isPdf && pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} title="Source PDF preview" style={{ flex: 1, minHeight: 220, border: '1px solid #E2E8F0', borderRadius: 8 }} />
              ) : fileInfo?.isDocx && docxHtml ? (
                <div style={{ flex: 1, minHeight: 220, overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: '0.82rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: docxHtml }} />
              ) : fileInfo?.isPptx && pptxSlides ? (
                <div style={{ flex: 1, minHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Text preview only — slide design isn&apos;t rendered.</p>
                  {pptxSlides.map((lines, i) => (
                    <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Slide {i + 1}</div>
                      {lines.map((l, j) => <div key={j} style={{ fontSize: '0.8rem', color: '#334155' }}>{l}</div>)}
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  value={sourceText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Paste or type the text you want to translate…"
                  style={{ flex: 1, minHeight: 220, padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
              )}
            </div>
          )}
        </div>

        {/* RIGHT: result */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Translated{detectedSourceLanguage ? ` (detected: ${detectedSourceLanguage})` : ''}</span>
          </div>
          {stage && stage !== 'ready' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
              {stage === 'reading' && 'Reading document…'}
              {stage === 'translating' && 'Translating…'}
            </div>
          )}
          {!stage && !translatedText && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
              Your translation will appear here
            </div>
          )}
          {translatedText && translatedHtml ? (
            <div style={{ flex: 1, minHeight: 220, overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: '0.82rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: translatedHtml }} />
          ) : translatedText && translatedSlides ? (
            <div style={{ flex: 1, minHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {translatedSlides.map((lines, i) => (
                <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Slide {i + 1}</div>
                  {lines.map((l, j) => <div key={j} style={{ fontSize: '0.8rem', color: '#334155' }}>{l}</div>)}
                </div>
              ))}
            </div>
          ) : translatedText ? (
            <div style={{ flex: 1, minHeight: 220, overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {translatedText}
            </div>
          ) : null}
        </div>
      </div>

      {overLimit && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem' }}>
          This document has too much text to translate in one go ({sourceText.length.toLocaleString()} characters — the limit is {MAX_CHARACTERS.toLocaleString()}).
        </div>
      )}
      {error && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem' }}>{error}</div>
      )}

      <button
        onClick={runTranslate}
        disabled={!canTranslate || overLimit}
        style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: (!canTranslate || overLimit) ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (!canTranslate || overLimit) ? 'default' : 'pointer', fontFamily: 'inherit' }}
      >
        {busy ? (stage === 'reading' ? 'Reading document…' : 'Translating…') : 'Translate'}
      </button>

      {translatedText && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={copyTranslated} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>📋 Copy text</button>
          <button onClick={downloadTxt} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>⬇ Download .txt</button>
          {fileInfo?.isPptx ? (
            <button onClick={downloadPptx} disabled={downloadingFormat === 'pptx'} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloadingFormat === 'pptx' ? 'Preparing…' : '⬇ Download .pptx'}</button>
          ) : (
            <button onClick={downloadDocx} disabled={downloadingFormat === 'docx'} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloadingFormat === 'docx' ? 'Preparing…' : '⬇ Download .docx'}</button>
          )}
          <button onClick={downloadPdf} disabled={downloadingFormat === 'pdf'} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloadingFormat === 'pdf' ? 'Preparing…' : '⬇ Download .pdf'}</button>
        </div>
      )}

      {translatedText && session.status === 'active' && (
        <ContinueWorkingPanel toolSlug="document-translator" documentName={session.document?.name || 'document'} onDownload={downloadPdf} downloading={downloadingFormat === 'pdf'} />
      )}

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span>🔒</span>
        <span className="text-ink-soft">Your files are automatically deleted after processing and are never shared with third parties.</span>
      </div>
    </div>
  );
}

function LanguagePicker({ label, value, isOpen, onToggle, onSelect, onSelectAuto, showAuto, search, setSearch, filtered, recent }) {
  // Search narrows the full alphabetical list. Otherwise: Recent, then
  // Popular (the pinned shortcut row), then the complete list underneath —
  // all four of "searchable," "recent," "pinned," and "alphabetically
  // organized" coexist rather than being alternate views of each other.
  const list = filtered || ALL_LANGUAGES;
  return (
    <div style={{ position: 'relative', flex: '1 1 180px' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>{label} language</div>
        <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>{value}</div>
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 8, maxHeight: 280, overflowY: 'auto' }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search languages…"
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.8rem', marginBottom: 6, fontFamily: 'inherit' }}
          />
          {showAuto && !search && (
            <button onClick={onSelectAuto} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#2563EB' }}>Detect automatically</button>
          )}
          {!search && recent?.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', padding: '4px 8px' }}>RECENT</div>
              {recent.map((l) => (
                <button key={`recent-${l}`} onClick={() => onSelect(l)} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>{l}</button>
              ))}
            </>
          )}
          {!search && (
            <>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', padding: '4px 8px' }}>POPULAR</div>
              {PINNED_LANGUAGES.map((l) => (
                <button key={`pinned-${l}`} onClick={() => onSelect(l)} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>{l}</button>
              ))}
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', padding: '4px 8px', marginTop: 4, borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>ALL LANGUAGES (A–Z)</div>
            </>
          )}
          {list.map((l) => (
            <button key={l} onClick={() => onSelect(l)} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>{l}</button>
          ))}
          {filtered && filtered.length === 0 && (
            <div style={{ padding: '6px 8px', fontSize: '0.78rem', color: '#94A3B8' }}>No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}
