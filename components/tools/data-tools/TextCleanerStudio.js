'use client';

import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  OPERATIONS, operationById, applyPipeline,
} from './textEngine';
import { computeStats, formatDuration } from './textStats';

const CATEGORIES = [
  { id: 'clean', label: 'Clean', icon: '🧹' },
  { id: 'case', label: 'Case', icon: '🔤' },
  { id: 'sort', label: 'Sort', icon: '↕️' },
  { id: 'remove', label: 'Remove', icon: '🧽' },
];

const DIFF_PREVIEW_CAP = 500;
let stepSeq = 0;
const nextStepId = () => `step-${Date.now()}-${stepSeq++}`;

function StatTile({ label, value }) {
  return (
    <div className="txs-stat">
      <div className="txs-stat-value">{value}</div>
      <div className="txs-stat-label">{label}</div>
    </div>
  );
}

export default function TextCleanerStudio() {
  const [rawInput, setRawInput] = useState('');
  const deferredInput = useDeferredValue(rawInput);

  const [pipeline, setPipeline] = useState([]);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const [previewMode, setPreviewMode] = useState('processed'); // 'original' | 'processed' | 'side-by-side'
  const [opSearch, setOpSearch] = useState('');

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [findError, setFindError] = useState('');

  const [dragOver, setDragOver] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const fileInputRef = useRef(null);
  const inputTextareaRef = useRef(null);

  const commitPipeline = useCallback((updater) => {
    setPast((p) => [...p, pipeline]);
    setFuture([]);
    setPipeline((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline]);

  function addOperation(opId) {
    commitPipeline((prev) => [...prev, { id: nextStepId(), opId, label: operationById(opId)?.label }]);
  }

  function addFindReplace(all) {
    if (!findText) return;
    if (useRegex) {
      try { new RegExp(findText); setFindError(''); } catch { setFindError('Invalid regular expression.'); return; }
    }
    commitPipeline((prev) => [...prev, {
      id: nextStepId(), opId: 'find-replace',
      label: `${all ? 'Replace All' : 'Replace'} "${findText}" → "${replaceText}"`,
      params: { find: findText, replace: replaceText, caseSensitive, wholeWord, useRegex, all },
    }]);
  }

  function removeStep(id) {
    commitPipeline((prev) => prev.filter((s) => s.id !== id));
  }
  function moveStep(id, dir) {
    commitPipeline((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swapWith = idx + dir;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }
  function clearPipeline() {
    commitPipeline([]);
  }
  function resetOutput() {
    setPast([]);
    setFuture([]);
    setPipeline([]);
  }
  function undo() {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [pipeline, ...f]);
    setPast((p) => p.slice(0, -1));
    setPipeline(prev);
  }
  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, pipeline]);
    setFuture((f) => f.slice(1));
    setPipeline(next);
  }

  const { result: processedText } = useMemo(
    () => applyPipeline(deferredInput, pipeline),
    [deferredInput, pipeline]
  );

  const statsSource = pipeline.length > 0 ? processedText : deferredInput;
  const stats = useMemo(() => computeStats(statsSource), [statsSource]);
  const inputStats = useMemo(() => computeStats(deferredInput), [deferredInput]);

  const diffRows = useMemo(() => {
    if (previewMode !== 'side-by-side') return null;
    const origLines = deferredInput === '' ? [] : deferredInput.split('\n');
    const procLines = processedText === '' ? [] : processedText.split('\n');
    const max = Math.min(Math.max(origLines.length, procLines.length), DIFF_PREVIEW_CAP);
    const rows = [];
    for (let i = 0; i < max; i++) {
      const o = origLines[i] ?? '';
      const p = procLines[i] ?? '';
      rows.push({ i, o, p, changed: o !== p });
    }
    return { rows, truncated: Math.max(origLines.length, procLines.length) > DIFF_PREVIEW_CAP };
  }, [previewMode, deferredInput, processedText]);

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setRawInput(String(e.target.result || ''));
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(processedText);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('idle');
    }
  }

  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleDownloadTxt() {
    downloadBlob(processedText, 'text/plain', 'cleaned-text.txt');
  }
  function handleDownloadCsv() {
    const rows = (processedText === '' ? [] : processedText.split('\n'))
      .map((l) => `"${l.replace(/"/g, '""')}"`)
      .join('\r\n');
    downloadBlob(rows, 'text/csv', 'cleaned-text.csv');
  }
  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Text Cleaner Studio — Print</title><style>body{font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;padding:32px;font-size:13px;line-height:1.5;color:#0F172A;}</style></head><body>${processedText.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Cleaned Text — Convertam', text: processedText }); return; } catch { /* user cancelled */ return; }
    }
    handleCopy();
  }

  function handleKeyDown(e) {
    const inInput = document.activeElement === inputTextareaRef.current;
    if ((e.ctrlKey || e.metaKey) && !inInput) {
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) { e.preventDefault(); redo(); } else { e.preventDefault(); undo(); }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault(); redo();
      }
    }
  }

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    ops: OPERATIONS.filter((op) => op.category === cat.id && op.label.toLowerCase().includes(opSearch.trim().toLowerCase())),
  }));
  const showFindSection = 'find & replace'.includes(opSearch.trim().toLowerCase()) || opSearch.trim() === '';

  return (
    <div className="txs-root" onKeyDown={handleKeyDown} tabIndex={-1}>
      <style>{TXS_STYLES}</style>

      <div className="txs-header">
        <div>
          <h1 className="txs-title">Text Cleaner Studio</h1>
          <p className="txs-subtitle">Clean, transform and analyse text instantly.</p>
        </div>
        <span className="txs-privacy" title="Every operation runs in your browser — nothing is uploaded or stored.">
          🔒 100% Private
          <span className="txs-privacy-sub">All processing happens inside your browser. Your text is never uploaded or stored.</span>
        </span>
      </div>

      <div className="txs-grid">
        {/* ---------------- INPUT ---------------- */}
        <div className="txs-col">
          <div className="txs-card">
            <div className="txs-card-head">
              <span className="txs-card-title">📥 Input</span>
              <div className="txs-toolbar">
                <button className="txs-btn-ghost" onClick={() => fileInputRef.current?.click()}>Open TXT File</button>
                <button className="txs-btn-ghost" onClick={() => setRawInput('')}>Clear</button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
            <div
              className={`txs-drop ${dragOver ? 'txs-drop-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <textarea
                ref={inputTextareaRef}
                className="txs-textarea"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste or type your text here, or drag & drop a .txt file…"
                spellCheck={false}
              />
            </div>
            <div className="txs-counters">
              <span>{inputStats.characters.toLocaleString()} characters</span>
              <span>{inputStats.words.toLocaleString()} words</span>
              <span>{inputStats.lines.toLocaleString()} lines</span>
            </div>
          </div>

          <div className="txs-card">
            <div className="txs-card-head">
              <span className="txs-card-title">🛠️ Operations</span>
            </div>
            <input
              type="search"
              className="txs-search"
              placeholder="Search operations…"
              value={opSearch}
              onChange={(e) => setOpSearch(e.target.value)}
              aria-label="Search operations"
            />

            {filteredCategories.map((cat) => (
              cat.ops.length > 0 && (
                <div key={cat.id} className="txs-op-group">
                  <div className="txs-op-group-title">{cat.icon} {cat.label}</div>
                  <div className="txs-op-chips">
                    {cat.ops.map((op) => (
                      <button key={op.id} className="txs-chip" onClick={() => addOperation(op.id)}>{op.label}</button>
                    ))}
                  </div>
                </div>
              )
            ))}

            {showFindSection && (
              <div className="txs-op-group">
                <div className="txs-op-group-title">🔎 Find</div>
                <div className="txs-find-form">
                  <input className="txs-input" placeholder="Find…" value={findText} onChange={(e) => setFindText(e.target.value)} aria-label="Find text" />
                  <input className="txs-input" placeholder="Replace with…" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} aria-label="Replace text" />
                  <div className="txs-find-toggles">
                    <label className="txs-toggle"><input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} /> Case Sensitive</label>
                    <label className="txs-toggle"><input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> Whole Word</label>
                    <label className="txs-toggle"><input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} /> Regex</label>
                  </div>
                  {findError && <div className="txs-find-error" role="alert">{findError}</div>}
                  <div className="txs-find-actions">
                    <button className="txs-btn-ghost" disabled={!findText} onClick={() => addFindReplace(false)}>Replace</button>
                    <button className="txs-btn-primary-sm" disabled={!findText} onClick={() => addFindReplace(true)}>Replace All</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- OUTPUT ---------------- */}
        <div className="txs-col">
          <div className="txs-card">
            <div className="txs-card-head">
              <span className="txs-card-title">📤 Output</span>
              <div role="radiogroup" aria-label="Preview mode" className="txs-preview-toggle">
                {[['processed', 'Processed'], ['original', 'Original'], ['side-by-side', 'Side-by-side']].map(([id, label]) => (
                  <button key={id} role="radio" aria-checked={previewMode === id} className={`txs-pill ${previewMode === id ? 'active' : ''}`} onClick={() => setPreviewMode(id)}>{label}</button>
                ))}
              </div>
            </div>

            {previewMode === 'side-by-side' && diffRows ? (
              <div className="txs-diff-wrap">
                <div className="txs-diff-col">
                  <div className="txs-diff-col-head">Original</div>
                  {diffRows.rows.map((r) => <div key={r.i} className={`txs-diff-row ${r.changed ? 'txs-diff-changed' : ''}`}>{r.o || ' '}</div>)}
                </div>
                <div className="txs-diff-col">
                  <div className="txs-diff-col-head">Processed</div>
                  {diffRows.rows.map((r) => <div key={r.i} className={`txs-diff-row ${r.changed ? 'txs-diff-changed' : ''}`}>{r.p || ' '}</div>)}
                </div>
                {diffRows.truncated && <p className="txs-diff-note">Showing the first {DIFF_PREVIEW_CAP.toLocaleString()} lines for comparison performance.</p>}
              </div>
            ) : (
              <textarea className="txs-textarea" value={previewMode === 'original' ? deferredInput : processedText} readOnly spellCheck={false} placeholder="Your cleaned text will appear here…" />
            )}

            <div className="txs-counters">
              <span>{stats.characters.toLocaleString()} characters</span>
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.lines.toLocaleString()} lines</span>
            </div>

            <div className="txs-output-actions">
              <button className="txs-btn-ghost" onClick={undo} disabled={past.length === 0}>↶ Undo</button>
              <button className="txs-btn-ghost" onClick={redo} disabled={future.length === 0}>↷ Redo</button>
              <button className="txs-btn-ghost" onClick={resetOutput} disabled={pipeline.length === 0}>Reset</button>
            </div>
          </div>

          {pipeline.length > 0 && (
            <div className="txs-card">
              <div className="txs-card-head">
                <span className="txs-card-title">🧵 Active Pipeline <span className="txs-badge">{pipeline.length}</span></span>
                <button className="txs-btn-ghost" onClick={clearPipeline}>Clear Pipeline</button>
              </div>
              <div className="txs-pipeline">
                {pipeline.map((step, i) => (
                  <div key={step.id} className="txs-pipeline-step">
                    <span className="txs-pipeline-index">{i + 1}</span>
                    <span className="txs-pipeline-label">{step.label}</span>
                    <div className="txs-pipeline-actions">
                      <button aria-label="Move up" disabled={i === 0} onClick={() => moveStep(step.id, -1)}>↑</button>
                      <button aria-label="Move down" disabled={i === pipeline.length - 1} onClick={() => moveStep(step.id, 1)}>↓</button>
                      <button aria-label="Remove step" className="txs-pipeline-remove" onClick={() => removeStep(step.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="txs-card">
            <div className="txs-card-head"><span className="txs-card-title">📊 Text Analysis</span></div>
            <div className="txs-stat-grid">
              <StatTile label="Characters" value={stats.characters.toLocaleString()} />
              <StatTile label="Characters (no spaces)" value={stats.charactersNoSpaces.toLocaleString()} />
              <StatTile label="Words" value={stats.words.toLocaleString()} />
              <StatTile label="Lines" value={stats.lines.toLocaleString()} />
              <StatTile label="Paragraphs" value={stats.paragraphs.toLocaleString()} />
              <StatTile label="Sentences" value={stats.sentences.toLocaleString()} />
              <StatTile label="Reading Time" value={formatDuration(stats.readingTimeSec)} />
              <StatTile label="Speaking Time" value={formatDuration(stats.speakingTimeSec)} />
              <StatTile label="Avg. Word Length" value={stats.avgWordLength.toFixed(1)} />
              <StatTile label="Longest Line" value={`${stats.longestLine.toLocaleString()} ch`} />
              <StatTile label="Shortest Line" value={`${stats.shortestLine.toLocaleString()} ch`} />
            </div>
          </div>

          <div className="txs-card">
            <div className="txs-export-grid">
              <button className="txs-export-btn" onClick={handleCopy}>
                <span className="txs-export-icon">📋</span>
                <span className="txs-export-label">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
                <span className="txs-export-sub">Copy processed text</span>
              </button>
              <button className="txs-export-btn" onClick={handleDownloadTxt}>
                <span className="txs-export-icon">📄</span>
                <span className="txs-export-label">Download TXT</span>
                <span className="txs-export-sub">Save as a .txt file</span>
              </button>
              <button className="txs-export-btn" onClick={handleDownloadCsv}>
                <span className="txs-export-icon">📊</span>
                <span className="txs-export-label">Download CSV</span>
                <span className="txs-export-sub">One line per row</span>
              </button>
              <button className="txs-export-btn" onClick={handlePrint}>
                <span className="txs-export-icon">🖨️</span>
                <span className="txs-export-label">Print</span>
                <span className="txs-export-sub">Print this result</span>
              </button>
              <button className="txs-export-btn" onClick={handleShare}>
                <span className="txs-export-icon">🔗</span>
                <span className="txs-export-label">Share</span>
                <span className="txs-export-sub">Share with others</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TXS_STYLES = `
  .txs-root { --txs-cyan: #0891B2; color: #0F172A; }

  .txs-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .txs-title { font-size: clamp(1.4rem, 3vw, 1.9rem); font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; }
  .txs-subtitle { font-size: 0.9rem; color: #64748B; margin: 0; }
  .txs-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; flex-shrink: 0; }
  .txs-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .txs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .txs-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .txs-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .txs-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .txs-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .txs-toolbar { display: flex; gap: 8px; }

  .txs-btn-ghost { font-size: 0.76rem; font-weight: 600; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: background 0.15s ease; }
  .txs-btn-ghost:hover:not(:disabled) { background: #CFFAFE; }
  .txs-btn-ghost:disabled { opacity: 0.45; cursor: default; }
  .txs-btn-primary-sm { font-size: 0.76rem; font-weight: 700; color: #fff; background: #0891B2; border: 1px solid #0891B2; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; }
  .txs-btn-primary-sm:disabled { opacity: 0.5; cursor: default; }

  .txs-drop { border-radius: 12px; transition: background 0.15s ease, box-shadow 0.15s ease; }
  .txs-drop-active { background: #ECFEFF; box-shadow: inset 0 0 0 2px #22D3EE; border-radius: 12px; }
  .txs-textarea { width: 100%; min-height: 320px; resize: vertical; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; line-height: 1.55; outline: none; color: #0F172A; background: #F8FAFC; box-sizing: border-box; }
  .txs-textarea:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }
  .txs-textarea[readonly] { background: #FBFDFE; }

  .txs-counters { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 0.74rem; color: #64748B; font-weight: 600; }

  .txs-search { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; margin-bottom: 14px; box-sizing: border-box; }
  .txs-search:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }

  .txs-op-group { margin-bottom: 16px; }
  .txs-op-group:last-child { margin-bottom: 0; }
  .txs-op-group-title { font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .txs-op-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .txs-chip { font-size: 0.78rem; font-weight: 600; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 7px 14px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .txs-chip:hover { background: #ECFEFF; border-color: #A5F3FC; color: #0E7490; transform: translateY(-1px); }

  .txs-find-form { display: flex; flex-direction: column; gap: 8px; }
  .txs-input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.82rem; font-family: inherit; outline: none; box-sizing: border-box; }
  .txs-input:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }
  .txs-find-toggles { display: flex; gap: 14px; flex-wrap: wrap; }
  .txs-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #475569; font-weight: 600; cursor: pointer; }
  .txs-find-error { font-size: 0.74rem; color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 6px 10px; }
  .txs-find-actions { display: flex; gap: 8px; justify-content: flex-end; }

  .txs-preview-toggle { display: flex; gap: 6px; flex-wrap: wrap; }
  .txs-pill { padding: 6px 11px; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.74rem; }
  .txs-pill.active { border-color: #0891B2; background: #ECFEFF; color: #0E7490; }

  .txs-diff-wrap { border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
  .txs-diff-col { display: inline-block; width: 50%; vertical-align: top; box-sizing: border-box; max-height: 420px; overflow-y: auto; }
  .txs-diff-col:first-child { border-right: 1px solid #E2E8F0; }
  .txs-diff-col-head { position: sticky; top: 0; background: #F8FAFC; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; }
  .txs-diff-row { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.76rem; padding: 3px 12px; white-space: pre-wrap; word-break: break-word; color: #334155; }
  .txs-diff-changed { background: #FFFBEB; }
  .txs-diff-note { font-size: 0.72rem; color: #94A3B8; padding: 8px 12px; margin: 0; border-top: 1px solid #E2E8F0; }

  .txs-output-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

  .txs-badge { font-size: 0.62rem; font-weight: 800; color: #0E7490; background: #CFFAFE; border-radius: 999px; padding: 2px 8px; margin-left: 4px; }
  .txs-pipeline { display: flex; flex-direction: column; gap: 8px; }
  .txs-pipeline-step { display: flex; align-items: center; gap: 10px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; }
  .txs-pipeline-index { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: #0891B2; color: #fff; font-size: 0.68rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .txs-pipeline-label { flex: 1; min-width: 0; font-size: 0.8rem; color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .txs-pipeline-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .txs-pipeline-actions button { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; cursor: pointer; font-size: 0.72rem; }
  .txs-pipeline-actions button:disabled { opacity: 0.35; cursor: default; }
  .txs-pipeline-remove { color: #DC2626 !important; }

  .txs-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .txs-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 10px 8px; text-align: center; }
  .txs-stat-value { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
  .txs-stat-label { font-size: 0.62rem; color: #64748B; font-weight: 600; margin-top: 2px; }

  .txs-export-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .txs-export-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 8px; border-radius: 12px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .txs-export-btn:hover { background: #ECFEFF; border-color: #A5F3FC; transform: translateY(-1px); }
  .txs-export-icon { font-size: 1.3rem; }
  .txs-export-label { font-size: 0.8rem; font-weight: 700; color: #0F172A; margin-top: 4px; }
  .txs-export-sub { font-size: 0.66rem; color: #94A3B8; }

  @media (max-width: 860px) {
    .txs-grid { grid-template-columns: 1fr; }
    .txs-diff-col { max-height: 260px; }
  }
  @media (max-width: 560px) {
    .txs-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .txs-export-grid { grid-template-columns: 1fr; }
    .txs-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
    .txs-diff-col { width: 100%; display: block; max-height: 200px; }
    .txs-diff-col:first-child { border-right: none; border-bottom: 1px solid #E2E8F0; }
  }

  .txs-root button:focus-visible, .txs-root input:focus-visible, .txs-root textarea:focus-visible {
    outline: 2px solid #0891B2; outline-offset: 2px;
  }
`;
