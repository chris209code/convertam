'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  EXTRACTOR_TYPES, extractType, applyListFilters, computeExtractStats,
  PIPELINE_OPERATIONS, pipelineOperationById, applyExtractPipeline, pipelineResultList,
  toTXT, toCSV, toJSONList,
} from './extractEngine';

const DEFAULT_ENABLED = ['emails', 'phones', 'urls', 'numbers'];
const PAGE_SIZE = 200;

let stepSeq = 0;
const nextStepId = () => `xstep-${Date.now()}-${stepSeq++}`;

const PIPELINE_CATEGORIES = [
  { id: 'clean', label: 'Clean' },
  { id: 'extract', label: 'Extract' },
  { id: 'sort', label: 'Sort' },
];

function Highlighted({ text, query }) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="ex-mark">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="ex-stat">
      <div className="ex-stat-value">{value}</div>
      <div className="ex-stat-label">{label}</div>
    </div>
  );
}

function ResultCard({ type, list, filters, onFilterChange, searchQuery, onRemove }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copyState, setCopyState] = useState('idle');

  const searched = useMemo(() => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((v) => v.toLowerCase().includes(q));
  }, [list, searchQuery]);

  const visible = searched.slice(0, visibleCount);
  const remaining = searched.length - visible.length;

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(toTXT(searched));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="ex-result-card">
      <div className="ex-result-head">
        <span className="ex-result-icon" aria-hidden="true">{type.icon}</span>
        <div className="ex-result-title-wrap">
          <span className="ex-result-title">{type.label}</span>
          <span className="ex-result-count">{list.length.toLocaleString()} Found</span>
        </div>
        <button className="ex-result-close" aria-label={`Remove ${type.label} card`} onClick={onRemove}>×</button>
      </div>

      <div className="ex-result-filters">
        <label className="ex-toggle">
          <input type="checkbox" checked={!!filters.uniqueOnly} onChange={(e) => onFilterChange({ uniqueOnly: e.target.checked })} /> Unique Only
        </label>
        <label className="ex-toggle">
          <input type="checkbox" checked={!!filters.removeEmpty} onChange={(e) => onFilterChange({ removeEmpty: e.target.checked })} /> Remove Empty
        </label>
        <select className="ex-sort-select" value={filters.sortMode || ''} onChange={(e) => onFilterChange({ sortMode: e.target.value || null })} aria-label={`Sort ${type.label}`}>
          <option value="">No Sort</option>
          <option value="alpha-asc">A → Z</option>
          <option value="alpha-desc">Z → A</option>
          <option value="numeric-asc">Numeric ↑</option>
          <option value="numeric-desc">Numeric ↓</option>
        </select>
      </div>

      <div className="ex-result-list">
        {visible.length === 0 ? (
          <p className="ex-result-empty">No matches{searchQuery ? ' for this search' : ' yet'}.</p>
        ) : (
          visible.map((v, i) => (
            <div key={i} className="ex-result-row"><Highlighted text={v} query={searchQuery} /></div>
          ))
        )}
        {remaining > 0 && (
          <button className="ex-show-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>+ Show {Math.min(remaining, PAGE_SIZE).toLocaleString()} more</button>
        )}
      </div>

      <div className="ex-result-actions">
        <button className="ex-btn-ghost" onClick={handleCopy} disabled={searched.length === 0}>{copyState === 'copied' ? 'Copied!' : '📋 Copy'}</button>
        <button className="ex-btn-ghost" onClick={() => downloadBlob(toTXT(searched), 'text/plain', `${type.id}.txt`)} disabled={searched.length === 0}>TXT</button>
        <button className="ex-btn-ghost" onClick={() => downloadBlob(toCSV(searched), 'text/csv', `${type.id}.csv`)} disabled={searched.length === 0}>CSV</button>
        <button className="ex-btn-ghost" onClick={() => downloadBlob(toJSONList(searched), 'application/json', `${type.id}.json`)} disabled={searched.length === 0}>JSON</button>
      </div>
    </div>
  );
}

export default function ExtractStudio() {
  const [rawInput, setRawInput] = useState('');
  const deferredInput = useDeferredValue(rawInput);

  const [enabledTypes, setEnabledTypes] = useState(DEFAULT_ENABLED);
  const [cardFilters, setCardFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const [pipeline, setPipeline] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const fileInputRef = useRef(null);

  const rawResults = useMemo(() => {
    const out = {};
    for (const id of enabledTypes) out[id] = extractType(id, deferredInput);
    return out;
  }, [deferredInput, enabledTypes]);

  const filteredResults = useMemo(() => {
    const out = {};
    for (const id of enabledTypes) out[id] = applyListFilters(rawResults[id] || [], cardFilters[id] || {});
    return out;
  }, [rawResults, cardFilters, enabledTypes]);

  const stats = useMemo(() => computeExtractStats(deferredInput), [deferredInput]);

  function toggleType(id) {
    setEnabledTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }
  function updateCardFilter(id, patch) {
    setCardFilters((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function addPipelineStep(opId) {
    setPipeline((prev) => [...prev, { id: nextStepId(), opId, label: pipelineOperationById(opId)?.label }]);
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

  const pipelineValue = useMemo(() => applyExtractPipeline(deferredInput, pipeline), [deferredInput, pipeline]);
  const pipelineList = useMemo(() => pipelineResultList(pipelineValue), [pipelineValue]);

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
  async function handleCopyPipeline() {
    try {
      await navigator.clipboard.writeText(toTXT(pipelineList));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch { /* clipboard unavailable */ }
  }

  const groupedOps = PIPELINE_CATEGORIES.map((cat) => ({
    ...cat,
    ops: PIPELINE_OPERATIONS.filter((op) => op.category === cat.id),
  }));

  return (
    <div className="ex-root">
      <style>{EX_STYLES}</style>

      <div className="ex-header">
        <div>
          <h1 className="ex-title">Extract Studio</h1>
          <p className="ex-subtitle">Extract emails, phone numbers, URLs, numbers and more from text instantly.</p>
        </div>
        <span className="ex-privacy" title="Every extractor runs in your browser — nothing is uploaded or stored.">
          🔒 100% Private
          <span className="ex-privacy-sub">All processing happens inside your browser. Your text is never uploaded or stored.</span>
        </span>
      </div>

      <div className="ex-grid">
        {/* ---------------- LEFT: INPUT + TYPES + PIPELINE ---------------- */}
        <div className="ex-col">
          <div className="ex-card">
            <div className="ex-card-head">
              <span className="ex-card-title">📥 Text Input</span>
              <div className="ex-toolbar">
                <button className="ex-btn-ghost" onClick={() => fileInputRef.current?.click()}>Upload File</button>
                <button className="ex-btn-ghost" onClick={() => setRawInput('')} disabled={!rawInput}>Clear</button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.csv,text/plain,text/csv" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
            <div
              className={`ex-drop ${dragOver ? 'ex-drop-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <textarea
                className="ex-textarea"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste or type text here, or drag & drop a .txt/.csv file…"
                spellCheck={false}
              />
            </div>
            <div className="ex-counters">
              <span>{stats.characters.toLocaleString()} characters</span>
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.lines.toLocaleString()} lines</span>
            </div>
          </div>

          <div className="ex-card">
            <div className="ex-card-head"><span className="ex-card-title">🧩 Extraction Types</span></div>
            <div className="ex-type-chips">
              {EXTRACTOR_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`ex-chip ${enabledTypes.includes(t.id) ? 'active' : ''}`}
                  onClick={() => toggleType(t.id)}
                  aria-pressed={enabledTypes.includes(t.id)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ex-card">
            <div className="ex-card-head">
              <span className="ex-card-title">🛠️ Pipeline {pipeline.length > 0 && <span className="ex-badge">{pipeline.length}</span>}</span>
              {pipeline.length > 0 && <button className="ex-btn-ghost" onClick={clearPipeline}>Clear Pipeline</button>}
            </div>

            {groupedOps.map((cat) => (
              <div key={cat.id} className="ex-op-group">
                <div className="ex-op-group-title">{cat.label}</div>
                <div className="ex-op-chips">
                  {cat.ops.map((op) => (
                    <button key={op.id} className="ex-chip-sm" onClick={() => addPipelineStep(op.id)}>{op.label}</button>
                  ))}
                </div>
              </div>
            ))}

            {pipeline.length > 0 && (
              <div className="ex-pipeline">
                {pipeline.map((step, i) => (
                  <div key={step.id} className="ex-pipeline-step">
                    <span className="ex-pipeline-index">{i + 1}</span>
                    <span className="ex-pipeline-label">{step.label}</span>
                    <div className="ex-pipeline-actions">
                      <button aria-label="Move up" disabled={i === 0} onClick={() => moveStep(step.id, -1)}>↑</button>
                      <button aria-label="Move down" disabled={i === pipeline.length - 1} onClick={() => moveStep(step.id, 1)}>↓</button>
                      <button aria-label="Remove step" className="ex-pipeline-remove" onClick={() => removeStep(step.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pipeline.length > 0 && (
              <>
                <div className="ex-pipeline-output">
                  {pipelineList.length === 0 ? (
                    <p className="ex-result-empty">No results yet.</p>
                  ) : (
                    pipelineList.slice(0, PAGE_SIZE).map((v, i) => <div key={i} className="ex-result-row">{v}</div>)
                  )}
                  {pipelineList.length > PAGE_SIZE && <p className="ex-pipeline-note">Showing the first {PAGE_SIZE.toLocaleString()} of {pipelineList.length.toLocaleString()} results.</p>}
                </div>
                <div className="ex-result-actions">
                  <button className="ex-btn-ghost" onClick={handleCopyPipeline} disabled={pipelineList.length === 0}>{copyState === 'copied' ? 'Copied!' : '📋 Copy'}</button>
                  <button className="ex-btn-ghost" onClick={() => downloadBlob(toTXT(pipelineList), 'text/plain', 'extract-pipeline.txt')} disabled={pipelineList.length === 0}>TXT</button>
                  <button className="ex-btn-ghost" onClick={() => downloadBlob(toCSV(pipelineList), 'text/csv', 'extract-pipeline.csv')} disabled={pipelineList.length === 0}>CSV</button>
                  <button className="ex-btn-ghost" onClick={() => downloadBlob(toJSONList(pipelineList), 'application/json', 'extract-pipeline.json')} disabled={pipelineList.length === 0}>JSON</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---------------- RIGHT: LIVE RESULTS + ANALYSIS ---------------- */}
        <div className="ex-col">
          <div className="ex-card">
            <div className="ex-card-head"><span className="ex-card-title">🔍 Search Results</span></div>
            <input
              type="search"
              className="ex-search"
              placeholder="Search extracted values…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search extracted values"
            />
          </div>

          {enabledTypes.length === 0 ? (
            <div className="ex-card"><p className="ex-result-empty">Enable an extraction type on the left to see live results.</p></div>
          ) : (
            <div className="ex-results-grid">
              {enabledTypes.map((id) => {
                const type = EXTRACTOR_TYPES.find((t) => t.id === id);
                if (!type) return null;
                return (
                  <ResultCard
                    key={id}
                    type={type}
                    list={filteredResults[id] || []}
                    filters={cardFilters[id] || {}}
                    onFilterChange={(patch) => updateCardFilter(id, patch)}
                    searchQuery={searchQuery}
                    onRemove={() => toggleType(id)}
                  />
                );
              })}
            </div>
          )}

          <div className="ex-card">
            <div className="ex-card-head"><span className="ex-card-title">📊 Analysis</span></div>
            <div className="ex-stat-grid">
              <StatTile label="Characters" value={stats.characters.toLocaleString()} />
              <StatTile label="Words" value={stats.words.toLocaleString()} />
              <StatTile label="Lines" value={stats.lines.toLocaleString()} />
              <StatTile label="Emails Found" value={stats.emailsFound.toLocaleString()} />
              <StatTile label="URLs Found" value={stats.urlsFound.toLocaleString()} />
              <StatTile label="Numbers Found" value={stats.numbersFound.toLocaleString()} />
              <StatTile label="Phone Numbers Found" value={stats.phonesFound.toLocaleString()} />
              <StatTile label="Domains Found" value={stats.domainsFound.toLocaleString()} />
            </div>
          </div>

          <div className="ex-card">
            <div className="ex-card-head"><span className="ex-card-title">📤 Export All</span></div>
            <p className="ex-export-hint">Exports the current Pipeline output — build one on the left, or add steps to combine extractors.</p>
            <div className="ex-export-grid">
              <button className="ex-export-btn" onClick={handleCopyPipeline} disabled={pipelineList.length === 0}>
                <span className="ex-export-icon">📋</span>
                <span className="ex-export-label">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className="ex-export-btn" onClick={() => downloadBlob(toTXT(pipelineList), 'text/plain', 'extract-studio.txt')} disabled={pipelineList.length === 0}>
                <span className="ex-export-icon">📄</span>
                <span className="ex-export-label">TXT</span>
              </button>
              <button className="ex-export-btn" onClick={() => downloadBlob(toCSV(pipelineList), 'text/csv', 'extract-studio.csv')} disabled={pipelineList.length === 0}>
                <span className="ex-export-icon">📊</span>
                <span className="ex-export-label">CSV</span>
              </button>
              <button className="ex-export-btn" onClick={() => downloadBlob(toJSONList(pipelineList), 'application/json', 'extract-studio.json')} disabled={pipelineList.length === 0}>
                <span className="ex-export-icon">🧩</span>
                <span className="ex-export-label">JSON</span>
              </button>
              <button className="ex-export-btn" disabled>
                <span className="ex-export-icon">🟢</span>
                <span className="ex-export-label">Excel</span>
                <span className="ex-export-sub">Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EX_STYLES = `
  .ex-root { --ex-teal: #0891B2; color: #0F172A; }

  .ex-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .ex-title { font-size: clamp(1.4rem, 3vw, 1.9rem); font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; }
  .ex-subtitle { font-size: 0.9rem; color: #64748B; margin: 0; }
  .ex-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; flex-shrink: 0; }
  .ex-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .ex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .ex-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .ex-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .ex-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .ex-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .ex-toolbar { display: flex; gap: 8px; }

  .ex-btn-ghost { font-size: 0.76rem; font-weight: 600; color: #0E7490; background: #ECFEFF; border: 1px solid #A5F3FC; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: background 0.15s ease; }
  .ex-btn-ghost:hover:not(:disabled) { background: #CFFAFE; }
  .ex-btn-ghost:disabled { opacity: 0.45; cursor: default; }

  .ex-drop { border-radius: 12px; transition: background 0.15s ease, box-shadow 0.15s ease; }
  .ex-drop-active { background: #ECFEFF; box-shadow: inset 0 0 0 2px #22D3EE; border-radius: 12px; }
  .ex-textarea { width: 100%; min-height: 260px; resize: vertical; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; line-height: 1.55; outline: none; color: #0F172A; background: #F8FAFC; box-sizing: border-box; }
  .ex-textarea:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }

  .ex-counters { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 0.74rem; color: #64748B; font-weight: 600; }

  .ex-search { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; box-sizing: border-box; }
  .ex-search:focus { border-color: #0891B2; box-shadow: 0 0 0 3px rgba(8,145,178,0.12); }

  .ex-type-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .ex-chip { font-size: 0.78rem; font-weight: 600; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 7px 14px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .ex-chip:hover { background: #ECFEFF; border-color: #A5F3FC; color: #0E7490; }
  .ex-chip.active { background: #0891B2; border-color: #0891B2; color: #fff; }

  .ex-op-group { margin-bottom: 14px; }
  .ex-op-group:last-of-type { margin-bottom: 0; }
  .ex-op-group-title { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .ex-op-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .ex-chip-sm { font-size: 0.72rem; font-weight: 600; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 5px 11px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .ex-chip-sm:hover { background: #ECFEFF; border-color: #A5F3FC; color: #0E7490; transform: translateY(-1px); }

  .ex-badge { font-size: 0.62rem; font-weight: 800; color: #0E7490; background: #CFFAFE; border-radius: 999px; padding: 2px 8px; margin-left: 4px; }
  .ex-pipeline { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  .ex-pipeline-step { display: flex; align-items: center; gap: 10px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; }
  .ex-pipeline-index { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: #0891B2; color: #fff; font-size: 0.68rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .ex-pipeline-label { flex: 1; min-width: 0; font-size: 0.8rem; color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ex-pipeline-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .ex-pipeline-actions button { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; cursor: pointer; font-size: 0.72rem; }
  .ex-pipeline-actions button:disabled { opacity: 0.35; cursor: default; }
  .ex-pipeline-remove { color: #DC2626 !important; }
  .ex-pipeline-output { margin-top: 12px; border: 1px solid #F1F5F9; border-radius: 10px; background: #F8FAFC; max-height: 220px; overflow-y: auto; padding: 8px 4px; }
  .ex-pipeline-note { font-size: 0.7rem; color: #94A3B8; padding: 6px 10px 0; margin: 0; }

  .ex-results-grid { display: flex; flex-direction: column; gap: 14px; }
  .ex-result-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .ex-result-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .ex-result-icon { font-size: 1.15rem; width: 36px; height: 36px; border-radius: 10px; background: #ECFEFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ex-result-title-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ex-result-title { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
  .ex-result-count { font-size: 0.72rem; color: #0E7490; font-weight: 700; }
  .ex-result-close { flex-shrink: 0; width: 24px; height: 24px; border-radius: 6px; border: 1px solid #E2E8F0; background: #fff; color: #94A3B8; cursor: pointer; font-size: 0.85rem; line-height: 1; }
  .ex-result-close:hover { color: #DC2626; border-color: #FECACA; background: #FEF2F2; }

  .ex-result-filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .ex-toggle { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: #475569; font-weight: 600; cursor: pointer; }
  .ex-sort-select { font-size: 0.72rem; font-weight: 600; color: #334155; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px 6px; font-family: inherit; background: #fff; }

  .ex-result-list { border: 1px solid #F1F5F9; border-radius: 10px; background: #F8FAFC; max-height: 220px; overflow-y: auto; padding: 4px; }
  .ex-result-row { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.76rem; padding: 5px 8px; border-bottom: 1px solid #EEF2F6; color: #334155; word-break: break-word; }
  .ex-result-row:last-child { border-bottom: none; }
  .ex-result-empty { font-size: 0.78rem; color: #94A3B8; padding: 10px; margin: 0; text-align: center; }
  .ex-mark { background: #FEF08A; color: #713F12; border-radius: 3px; padding: 0 1px; }
  .ex-show-more { width: 100%; text-align: center; font-size: 0.72rem; font-weight: 700; color: #0E7490; background: #ECFEFF; border: none; border-top: 1px solid #E2E8F0; padding: 8px; cursor: pointer; font-family: inherit; }
  .ex-show-more:hover { background: #CFFAFE; }

  .ex-result-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }

  .ex-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .ex-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 10px 8px; text-align: center; }
  .ex-stat-value { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
  .ex-stat-label { font-size: 0.62rem; color: #64748B; font-weight: 600; margin-top: 2px; }

  .ex-export-hint { font-size: 0.74rem; color: #94A3B8; margin: 0 0 12px; }
  .ex-export-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .ex-export-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 8px; border-radius: 12px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .ex-export-btn:hover:not(:disabled) { background: #ECFEFF; border-color: #A5F3FC; transform: translateY(-1px); }
  .ex-export-btn:disabled { opacity: 0.5; cursor: default; }
  .ex-export-icon { font-size: 1.3rem; }
  .ex-export-label { font-size: 0.8rem; font-weight: 700; color: #0F172A; margin-top: 4px; }
  .ex-export-sub { font-size: 0.62rem; color: #94A3B8; }

  @media (max-width: 860px) {
    .ex-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .ex-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .ex-export-grid { grid-template-columns: repeat(2, 1fr); }
    .ex-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  .ex-root button:focus-visible, .ex-root input:focus-visible, .ex-root textarea:focus-visible, .ex-root select:focus-visible {
    outline: 2px solid #0891B2; outline-offset: 2px;
  }
`;
