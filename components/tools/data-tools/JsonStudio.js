'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import JsonEditor from './JsonEditor';
import JsonTreeView from './JsonTreeView';
import {
  parseJson, findDuplicateKeys, computeJsonStats, formatBytes, formatPath,
  JSON_OPERATIONS, applyJsonPipeline, stringifyWithFormat,
  jsonToCsv, jsonToXml, jsonToText, diffJson,
} from './jsonEngine';

let stepSeq = 0;
const nextStepId = () => `jstep-${Date.now()}-${stepSeq++}`;

function StatTile({ label, value }) {
  return (
    <div className="js2-stat">
      <div className="js2-stat-value">{value}</div>
      <div className="js2-stat-label">{label}</div>
    </div>
  );
}

const STATUS_META = {
  added: { label: 'Added', color: '#059669', bg: '#ECFDF5' },
  removed: { label: 'Removed', color: '#DC2626', bg: '#FEF2F2' },
  modified: { label: 'Modified', color: '#D97706', bg: '#FFFBEB' },
  unchanged: { label: 'Unchanged', color: '#64748B', bg: '#F8FAFC' },
};

export default function JsonStudio() {
  const [rawInput, setRawInput] = useState('');
  const deferredInput = useDeferredValue(rawInput);

  const [pipeline, setPipeline] = useState([]);
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'tree'
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['$']));

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('both'); // 'keys' | 'values' | 'both'
  const [matchIndex, setMatchIndex] = useState(0);

  const [compareMode, setCompareMode] = useState(false);
  const [compareInput, setCompareInput] = useState('');
  const deferredCompareInput = useDeferredValue(compareInput);

  const [copyState, setCopyState] = useState('idle');
  const [fullscreen, setFullscreen] = useState(false);

  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput]);
  const duplicateKeys = useMemo(
    () => (parsed.valid ? findDuplicateKeys(deferredInput) : []),
    [parsed.valid, deferredInput]
  );

  // A freshly-loaded document starts with just the root expanded — deep
  // objects/arrays stay collapsed by default so a huge document doesn't
  // render thousands of rows the moment it parses.
  useEffect(() => {
    setExpandedPaths(new Set(['$']));
  }, [parsed.data]);

  const pipelineResult = useMemo(
    () => (parsed.valid ? applyJsonPipeline(parsed.data, pipeline) : null),
    [parsed, pipeline]
  );
  const outputText = useMemo(
    () => (pipelineResult ? stringifyWithFormat(pipelineResult.data, pipelineResult.format) : ''),
    [pipelineResult]
  );

  const stats = useMemo(
    () => (parsed.valid ? computeJsonStats(pipelineResult ? pipelineResult.data : parsed.data, outputText) : null),
    [parsed, pipelineResult, outputText]
  );

  function addOperation(opId, label) {
    setPipeline((prev) => [...prev, { id: nextStepId(), opId, label }]);
  }
  function removeStep(id) {
    setPipeline((prev) => prev.filter((s) => s.id !== id));
  }
  function moveStep(id, dir) {
    setPipeline((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swapWith = idx + dir;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }
  function clearPipeline() {
    setPipeline([]);
  }

  function toggleExpand(path) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }
  function collectContainerPaths(node, segments, out) {
    const path = formatPath(segments);
    if (Array.isArray(node)) {
      out.push(path);
      node.forEach((v, i) => collectContainerPaths(v, [...segments, i], out));
    } else if (node !== null && typeof node === 'object') {
      out.push(path);
      for (const k of Object.keys(node)) collectContainerPaths(node[k], [...segments, k], out);
    }
  }
  function expandAll() {
    if (!parsed.valid) return;
    const out = [];
    collectContainerPaths(parsed.data, [], out);
    setExpandedPaths(new Set(out));
  }
  function collapseAll() {
    setExpandedPaths(new Set());
  }
  function copyJsonPath(path) {
    navigator.clipboard.writeText(path).catch(() => {});
  }

  // Flat list of matching paths, in document order, for Next/Previous
  // Match navigation — a plain linear walk, cheap even for large data
  // since it only runs when the search box has a query.
  const searchMatches = useMemo(() => {
    if (!parsed.valid || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    const out = [];
    function walk(node, segments) {
      const path = formatPath(segments);
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, [...segments, i]));
      } else if (node !== null && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (searchMode !== 'values' && k.toLowerCase().includes(q)) out.push(path === '$' ? formatPath([k]) : `${path}.${k}`);
          walk(node[k], [...segments, k]);
        }
      } else if (searchMode !== 'keys' && String(node).toLowerCase().includes(q)) {
        out.push(path);
      }
    }
    walk(parsed.data, []);
    return out;
  }, [parsed, searchQuery, searchMode]);

  useEffect(() => { setMatchIndex(0); }, [searchQuery, searchMode]);

  function expandAncestors(path) {
    const segments = path.replace(/^\$/, '').match(/\.[^.[\]]+|\[\d+\]/g) || [];
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      let acc = '$';
      next.add(acc);
      for (const seg of segments.slice(0, -1)) {
        acc += seg;
        next.add(acc);
      }
      return next;
    });
  }
  function gotoMatch(delta) {
    if (searchMatches.length === 0) return;
    const next = (matchIndex + delta + searchMatches.length) % searchMatches.length;
    setMatchIndex(next);
    expandAncestors(searchMatches[next]);
    if (viewMode !== 'tree') setViewMode('tree');
  }

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
      await navigator.clipboard.writeText(outputText);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch { /* clipboard unavailable */ }
  }
  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function handleDownloadJson() { downloadBlob(outputText, 'application/json', 'data.json'); }
  function handleDownloadTxt() { downloadBlob(outputText, 'text/plain', 'data.txt'); }
  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>JSON Studio — Print</title><style>body{font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;padding:32px;font-size:12px;line-height:1.5;color:#0F172A;}</style></head><body>${outputText.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</body></html>`);
    win.document.close(); win.focus(); win.print();
  }
  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'JSON — Convertam', text: outputText }); return; } catch { return; }
    }
    handleCopy();
  }

  function handleConvert(kind) {
    if (!pipelineResult) return;
    if (kind === 'csv') downloadBlob(jsonToCsv(pipelineResult.data), 'text/csv', 'data.csv');
    if (kind === 'xml') downloadBlob(jsonToXml(pipelineResult.data), 'application/xml', 'data.xml');
    if (kind === 'text') downloadBlob(jsonToText(pipelineResult.data), 'text/plain', 'data.txt');
  }

  const compareParsed = useMemo(() => (compareMode ? parseJson(deferredCompareInput) : null), [compareMode, deferredCompareInput]);
  const diffResults = useMemo(() => {
    if (!compareMode || !parsed.valid || !compareParsed?.valid) return null;
    return diffJson(parsed.data, compareParsed.data);
  }, [compareMode, parsed, compareParsed]);
  const diffCounts = useMemo(() => {
    if (!diffResults) return null;
    const c = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    for (const r of diffResults) c[r.status]++;
    return c;
  }, [diffResults]);

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }

  return (
    <div className="js2-root" onKeyDown={handleKeyDown} tabIndex={-1}>
      <style>{JS2_STYLES}</style>

      <div className="js2-header">
        <div>
          <h1 className="js2-title">JSON Studio</h1>
          <p className="js2-subtitle">Format, validate, analyse and transform JSON instantly.</p>
        </div>
        <span className="js2-privacy" title="Every operation runs in your browser — nothing is uploaded or stored.">
          🔒 100% Private
          <span className="js2-privacy-sub">All processing happens inside your browser. Your JSON is never uploaded or stored.</span>
        </span>
      </div>

      <div className="js2-toolbar">
        <button className={`js2-mode-btn ${!compareMode ? 'active' : ''}`} onClick={() => setCompareMode(false)}>📄 Studio</button>
        <button className={`js2-mode-btn ${compareMode ? 'active' : ''}`} onClick={() => setCompareMode(true)}>🆚 Compare Mode</button>
      </div>

      {!compareMode ? (
        <div className="js2-grid">
          {/* ---------------- INPUT ---------------- */}
          <div className="js2-col">
            <div className="js2-card">
              <div className="js2-card-head">
                <span className="js2-card-title">📥 JSON Input</span>
                <div className="js2-toolbar-sm">
                  <button className="js2-btn-ghost" onClick={() => fileInputRef.current?.click()}>Upload File</button>
                  <button className="js2-btn-ghost" onClick={() => setRawInput('')}>Clear</button>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
              <div
                className={`js2-drop ${dragOver ? 'js2-drop-active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <JsonEditor value={rawInput} onChange={setRawInput} placeholder="Paste JSON here, or drag & drop a .json file…" />
              </div>

              <div className="js2-status-row">
                {rawInput.trim() === '' ? (
                  <span className="js2-status js2-status-neutral">Waiting for input…</span>
                ) : parsed.valid ? (
                  <span className="js2-status js2-status-ok">✓ Valid JSON</span>
                ) : (
                  <span className="js2-status js2-status-error">✕ Line {parsed.error.line}, Column {parsed.error.column} — {parsed.error.message}</span>
                )}
              </div>
              {duplicateKeys.length > 0 && (
                <div className="js2-status-row">
                  <span className="js2-status js2-status-warn">
                    ⚠ {duplicateKeys.length} duplicate key{duplicateKeys.length > 1 ? 's' : ''}: {duplicateKeys.slice(0, 3).map((d) => `"${d.key}" (line ${d.line})`).join(', ')}{duplicateKeys.length > 3 ? '…' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="js2-card">
              <div className="js2-card-head"><span className="js2-card-title">🛠️ Transform Pipeline</span></div>
              <div className="js2-op-chips">
                {JSON_OPERATIONS.map((op) => (
                  <button key={op.id} className="js2-chip" disabled={!parsed.valid} onClick={() => addOperation(op.id, op.label)}>{op.label}</button>
                ))}
              </div>

              {pipeline.length > 0 && (
                <div className="js2-pipeline">
                  <div className="js2-pipeline-head">
                    <span>Active Pipeline <span className="js2-badge">{pipeline.length}</span></span>
                    <button className="js2-btn-ghost" onClick={clearPipeline}>Clear Pipeline</button>
                  </div>
                  {pipeline.map((step, i) => (
                    <div key={step.id} className="js2-pipeline-step">
                      <span className="js2-pipeline-index">{i + 1}</span>
                      <span className="js2-pipeline-label">{step.label}</span>
                      <div className="js2-pipeline-actions">
                        <button aria-label="Move up" disabled={i === 0} onClick={() => moveStep(step.id, -1)}>↑</button>
                        <button aria-label="Move down" disabled={i === pipeline.length - 1} onClick={() => moveStep(step.id, 1)}>↓</button>
                        <button aria-label="Remove step" className="js2-pipeline-remove" onClick={() => removeStep(step.id)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="js2-card">
              <div className="js2-card-head"><span className="js2-card-title">🔁 Convert</span></div>
              <div className="js2-convert-grid">
                <button className="js2-btn-ghost" disabled={!parsed.valid} onClick={() => handleConvert('csv')}>JSON → CSV</button>
                <button className="js2-btn-ghost" disabled={!parsed.valid} onClick={() => handleConvert('xml')}>JSON → XML</button>
                <button className="js2-btn-ghost" disabled={!parsed.valid} onClick={() => handleConvert('text')}>JSON → Text</button>
                <button className="js2-btn-ghost" disabled title="Coming soon">JSON → YAML <span className="js2-soon">Coming Soon</span></button>
              </div>
            </div>
          </div>

          {/* ---------------- OUTPUT ---------------- */}
          <div className="js2-col">
            <div className={`js2-card ${fullscreen ? 'js2-fullscreen' : ''}`}>
              <div className="js2-card-head">
                <span className="js2-card-title">📤 Output</span>
                <div className="js2-toolbar-sm">
                  <div role="radiogroup" aria-label="View mode" className="js2-view-toggle">
                    <button role="radio" aria-checked={viewMode === 'text'} className={`js2-pill ${viewMode === 'text' ? 'active' : ''}`} onClick={() => setViewMode('text')}>Text</button>
                    <button role="radio" aria-checked={viewMode === 'tree'} className={`js2-pill ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>Tree</button>
                  </div>
                  <button className="js2-btn-ghost" onClick={() => setFullscreen((v) => !v)}>{fullscreen ? '⤢ Exit' : '⛶ Fullscreen'}</button>
                </div>
              </div>

              {!parsed.valid ? (
                <div className="js2-empty-state">
                  <span aria-hidden="true" style={{ fontSize: '1.8rem' }}>{rawInput.trim() === '' ? '📋' : '⚠️'}</span>
                  <p>{rawInput.trim() === '' ? 'Paste or upload JSON to see it formatted, validated and analysed here.' : 'Fix the error above to see formatted output.'}</p>
                </div>
              ) : (
                <>
                  {viewMode === 'tree' && (
                    <div className="js2-tree-toolbar">
                      <input ref={searchInputRef} type="search" className="js2-search" placeholder="Search keys or values… (Ctrl+F)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      <select className="js2-select-sm" value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
                        <option value="both">Keys + Values</option>
                        <option value="keys">Keys only</option>
                        <option value="values">Values only</option>
                      </select>
                      {searchQuery.trim() && (
                        <span className="js2-match-nav">
                          <button onClick={() => gotoMatch(-1)} disabled={searchMatches.length === 0}>◂</button>
                          {searchMatches.length > 0 ? `${matchIndex + 1} / ${searchMatches.length}` : '0 / 0'}
                          <button onClick={() => gotoMatch(1)} disabled={searchMatches.length === 0}>▸</button>
                        </span>
                      )}
                      <button className="js2-btn-ghost" onClick={expandAll}>Expand All</button>
                      <button className="js2-btn-ghost" onClick={collapseAll}>Collapse All</button>
                    </div>
                  )}

                  {viewMode === 'text' ? (
                    <JsonEditor value={outputText} onChange={() => {}} readOnly />
                  ) : (
                    <div className="js2-tree-scroll">
                      <JsonTreeView
                        data={pipelineResult.data}
                        expandedPaths={expandedPaths}
                        onToggle={toggleExpand}
                        searchQuery={searchQuery}
                        searchMode={searchMode}
                        onCopyPath={copyJsonPath}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="js2-output-actions">
                <button className="js2-btn-ghost" onClick={clearPipeline} disabled={pipeline.length === 0}>Reset</button>
              </div>
            </div>

            {stats && (
              <div className="js2-card">
                <div className="js2-card-head"><span className="js2-card-title">📊 JSON Analysis</span></div>
                <div className="js2-stat-grid">
                  <StatTile label="Characters" value={stats.characters.toLocaleString()} />
                  <StatTile label="Lines" value={stats.lines.toLocaleString()} />
                  <StatTile label="Objects" value={stats.objects.toLocaleString()} />
                  <StatTile label="Arrays" value={stats.arrays.toLocaleString()} />
                  <StatTile label="Keys" value={stats.keys.toLocaleString()} />
                  <StatTile label="Values" value={stats.values.toLocaleString()} />
                  <StatTile label="Max Nesting Depth" value={stats.maxDepth.toLocaleString()} />
                  <StatTile label="File Size" value={formatBytes(stats.fileSizeBytes)} />
                </div>
              </div>
            )}

            <div className="js2-card">
              <div className="js2-export-grid">
                <button className="js2-export-btn" onClick={handleCopy} disabled={!parsed.valid}>
                  <span className="js2-export-icon">📋</span>
                  <span className="js2-export-label">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
                </button>
                <button className="js2-export-btn" onClick={handleDownloadJson} disabled={!parsed.valid}>
                  <span className="js2-export-icon">📄</span>
                  <span className="js2-export-label">Download JSON</span>
                </button>
                <button className="js2-export-btn" onClick={handleDownloadTxt} disabled={!parsed.valid}>
                  <span className="js2-export-icon">📝</span>
                  <span className="js2-export-label">Download TXT</span>
                </button>
                <button className="js2-export-btn" onClick={handlePrint} disabled={!parsed.valid}>
                  <span className="js2-export-icon">🖨️</span>
                  <span className="js2-export-label">Print</span>
                </button>
                <button className="js2-export-btn" onClick={handleShare} disabled={!parsed.valid}>
                  <span className="js2-export-icon">🔗</span>
                  <span className="js2-export-label">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- COMPARE MODE ---------------- */
        <div className="js2-compare">
          <div className="js2-grid">
            <div className="js2-col">
              <div className="js2-card">
                <div className="js2-card-head"><span className="js2-card-title">📄 Document A</span></div>
                <JsonEditor value={rawInput} onChange={setRawInput} placeholder="Paste the original JSON…" />
                {rawInput.trim() && !parsed.valid && <div className="js2-status js2-status-error">✕ Line {parsed.error.line} — {parsed.error.message}</div>}
              </div>
            </div>
            <div className="js2-col">
              <div className="js2-card">
                <div className="js2-card-head"><span className="js2-card-title">📄 Document B</span></div>
                <JsonEditor value={compareInput} onChange={setCompareInput} placeholder="Paste the JSON to compare against…" />
                {compareInput.trim() && compareParsed && !compareParsed.valid && <div className="js2-status js2-status-error">✕ Line {compareParsed.error.line} — {compareParsed.error.message}</div>}
              </div>
            </div>
          </div>

          <div className="js2-card" style={{ marginTop: 16 }}>
            <div className="js2-card-head"><span className="js2-card-title">🆚 Diff Report</span></div>
            {!diffResults ? (
              <div className="js2-empty-state"><p>Paste valid JSON into both documents to see the differences.</p></div>
            ) : (
              <>
                <div className="js2-diff-summary">
                  {Object.entries(diffCounts).map(([status, count]) => (
                    <span key={status} className="js2-diff-chip" style={{ color: STATUS_META[status].color, background: STATUS_META[status].bg }}>
                      {STATUS_META[status].label}: {count}
                    </span>
                  ))}
                </div>
                <div className="js2-diff-list">
                  {diffResults.filter((r) => r.status !== 'unchanged').map((r, i) => (
                    <div key={i} className="js2-diff-row" style={{ background: STATUS_META[r.status].bg }}>
                      <span className="js2-diff-status" style={{ color: STATUS_META[r.status].color }}>{STATUS_META[r.status].label}</span>
                      <span className="js2-diff-path">{r.path}</span>
                      {r.status !== 'added' && <span className="js2-diff-value js2-diff-before">{JSON.stringify(r.before)}</span>}
                      {r.status !== 'removed' && <span className="js2-diff-value js2-diff-after">{JSON.stringify(r.after)}</span>}
                    </div>
                  ))}
                  {diffResults.every((r) => r.status === 'unchanged') && <p className="js2-diff-note">The two documents are identical.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const JS2_STYLES = `
  .js2-root { --js2-cyan: #0891B2; color: #0F172A; }

  .js2-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
  .js2-title { font-size: clamp(1.4rem, 3vw, 1.9rem); font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; }
  .js2-subtitle { font-size: 0.9rem; color: #64748B; margin: 0; }
  .js2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; flex-shrink: 0; }
  .js2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .js2-toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
  .js2-mode-btn { font-size: 0.82rem; font-weight: 700; padding: 8px 16px; border-radius: 10px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; cursor: pointer; font-family: inherit; }
  .js2-mode-btn.active { border-color: #0891B2; background: #ECFEFF; color: #0E7490; }

  .js2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .js2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .js2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .js2-fullscreen { position: fixed; inset: 16px; z-index: 200; overflow-y: auto; box-shadow: 0 20px 60px rgba(15,23,42,0.3); }
  .js2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .js2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .js2-toolbar-sm { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  .js2-btn-ghost { font-size: 0.76rem; font-weight: 600; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: background 0.15s ease; white-space: nowrap; }
  .js2-btn-ghost:hover:not(:disabled) { background: #CFFAFE; }
  .js2-btn-ghost:disabled { opacity: 0.45; cursor: default; }

  .js2-drop { border-radius: 12px; transition: background 0.15s ease, box-shadow 0.15s ease; }
  .js2-drop-active { background: #ECFEFF; box-shadow: inset 0 0 0 2px #22D3EE; border-radius: 12px; }

  .js2-status-row { margin-top: 10px; }
  .js2-status { display: inline-block; font-size: 0.76rem; font-weight: 600; padding: 6px 10px; border-radius: 8px; }
  .js2-status-neutral { color: #94A3B8; }
  .js2-status-ok { color: #059669; background: #ECFDF5; }
  .js2-status-error { color: #DC2626; background: #FEF2F2; }
  .js2-status-warn { color: #B45309; background: #FFFBEB; }

  .js2-op-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  .js2-chip { font-size: 0.78rem; font-weight: 600; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 7px 14px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .js2-chip:hover:not(:disabled) { background: #ECFEFF; border-color: #A5F3FC; color: #0E7490; transform: translateY(-1px); }
  .js2-chip:disabled { opacity: 0.4; cursor: default; }

  .js2-pipeline { margin-top: 14px; border-top: 1px solid #F1F5F9; padding-top: 14px; }
  .js2-pipeline-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 10px; }
  .js2-badge { font-size: 0.62rem; font-weight: 800; color: #0E7490; background: #CFFAFE; border-radius: 999px; padding: 2px 8px; margin-left: 4px; }
  .js2-pipeline-step { display: flex; align-items: center; gap: 10px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; margin-bottom: 6px; }
  .js2-pipeline-index { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: #0891B2; color: #fff; font-size: 0.68rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .js2-pipeline-label { flex: 1; min-width: 0; font-size: 0.8rem; color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .js2-pipeline-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .js2-pipeline-actions button { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; cursor: pointer; font-size: 0.72rem; }
  .js2-pipeline-actions button:disabled { opacity: 0.35; cursor: default; }
  .js2-pipeline-remove { color: #DC2626 !important; }

  .js2-convert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .js2-soon { display: block; font-size: 0.6rem; opacity: 0.75; margin-top: 2px; }

  .js2-view-toggle { display: flex; gap: 6px; }
  .js2-pill { padding: 6px 11px; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.74rem; }
  .js2-pill.active { border-color: #0891B2; background: #ECFEFF; color: #0E7490; }

  .js2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.85rem; }

  .js2-tree-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
  .js2-search { flex: 1 1 160px; padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.8rem; font-family: inherit; outline: none; }
  .js2-search:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }
  .js2-select-sm { padding: 8px 10px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.76rem; font-family: inherit; background: #fff; }
  .js2-match-nav { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: #475569; }
  .js2-match-nav button { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; }
  .js2-match-nav button:disabled { opacity: 0.4; cursor: default; }

  .js2-tree-scroll { max-height: 460px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 12px; background: #FBFDFE; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; }
  .js2-fullscreen .js2-tree-scroll { max-height: calc(100vh - 260px); }

  .js2-output-actions { display: flex; gap: 8px; margin-top: 12px; }

  .js2-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .js2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 10px 6px; text-align: center; }
  .js2-stat-value { font-size: 0.92rem; font-weight: 800; color: #0F172A; }
  .js2-stat-label { font-size: 0.6rem; color: #64748B; font-weight: 600; margin-top: 2px; }

  .js2-export-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .js2-export-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 12px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .js2-export-btn:hover:not(:disabled) { background: #ECFEFF; border-color: #A5F3FC; transform: translateY(-1px); }
  .js2-export-btn:disabled { opacity: 0.4; cursor: default; }
  .js2-export-icon { font-size: 1.2rem; }
  .js2-export-label { font-size: 0.72rem; font-weight: 700; color: #0F172A; }

  .js2-diff-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .js2-diff-chip { font-size: 0.76rem; font-weight: 700; padding: 6px 12px; border-radius: 999px; }
  .js2-diff-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; }
  .js2-diff-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; flex-wrap: wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.76rem; }
  .js2-diff-status { font-weight: 800; text-transform: uppercase; font-size: 0.62rem; letter-spacing: 0.04em; flex-shrink: 0; width: 70px; }
  .js2-diff-path { font-weight: 700; color: #334155; flex-shrink: 0; }
  .js2-diff-value { color: #64748B; overflow-wrap: anywhere; }
  .js2-diff-before { text-decoration: line-through; }
  .js2-diff-note { color: #64748B; font-size: 0.85rem; text-align: center; padding: 20px; }

  /* -------- JsonEditor -------- */
  .je-wrap { display: flex; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; background: #F8FAFC; }
  .je-gutter { flex-shrink: 0; padding: 14px 8px; text-align: right; background: #F1F5F9; color: #94A3B8; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; line-height: 1.55; overflow: hidden; height: 320px; user-select: none; }
  .je-editor-area { position: relative; flex: 1; min-width: 0; }
  .je-highlight, .je-textarea { margin: 0; padding: 14px; width: 100%; height: 320px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; line-height: 1.55; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; }
  .je-highlight { position: absolute; inset: 0; overflow: auto; color: #0F172A; pointer-events: none; }
  .je-textarea { position: relative; border: none; outline: none; resize: vertical; background: transparent; overflow: auto; }
  .je-textarea-overlay { color: transparent; caret-color: #0F172A; }
  .je-textarea-plain { color: #0F172A; background: #F8FAFC; }
  .je-textarea:focus { box-shadow: inset 0 0 0 2px #0891B2; }
  .je-note { font-size: 0.7rem; color: #94A3B8; padding: 6px 10px 0; }
  .je-key { color: #0E7490; font-weight: 600; }
  .je-string { color: #059669; }
  .je-number { color: #7C3AED; }
  .je-boolean { color: #DC2626; }
  .je-null { color: #94A3B8; font-style: italic; }
  .je-punct { color: #64748B; }
  .je-bracket-match { background: #FEF3C7; border-radius: 3px; }

  /* -------- JsonTreeView -------- */
  .jt-row { display: flex; align-items: center; gap: 4px; padding: 2px 0; flex-wrap: wrap; }
  .jt-indent { width: 18px; flex-shrink: 0; }
  .jt-toggle { width: 18px; height: 18px; flex-shrink: 0; border: none; background: none; cursor: pointer; color: #64748B; font-size: 0.7rem; }
  .jt-key { color: #0E7490; font-weight: 600; }
  .jt-key-match, .jt-mark { background: #FEF3C7; border-radius: 3px; padding: 0 2px; }
  .jt-container-label { color: #64748B; font-style: italic; }
  .jt-string { color: #059669; }
  .jt-number { color: #7C3AED; }
  .jt-boolean { color: #DC2626; }
  .jt-null { color: #94A3B8; font-style: italic; }
  .jt-path-btn { border: none; background: none; color: #CBD5E1; cursor: pointer; font-size: 0.72rem; padding: 0 4px; opacity: 0; transition: opacity 0.1s ease; }
  .jt-row:hover .jt-path-btn { opacity: 1; }
  .jt-children { padding-left: 18px; border-left: 1px dashed #E2E8F0; margin-left: 9px; }
  .jt-more { font-size: 0.72rem; color: #0E7490; background: none; border: none; cursor: pointer; padding: 4px 0; }

  @media (max-width: 860px) {
    .js2-grid { grid-template-columns: 1fr; }
    .js2-stat-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 560px) {
    .js2-export-grid { grid-template-columns: 1fr 1fr; }
    .js2-convert-grid { grid-template-columns: 1fr; }
    .js2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
    .je-gutter, .je-highlight, .je-textarea { height: 260px; }
  }

  .js2-root button:focus-visible, .js2-root input:focus-visible, .js2-root select:focus-visible, .js2-root textarea:focus-visible {
    outline: 2px solid #0891B2; outline-offset: 2px;
  }
`;
