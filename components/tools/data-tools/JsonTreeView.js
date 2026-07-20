'use client';

import { useState } from 'react';
import { formatPath } from './jsonEngine';

const PAGE_SIZE = 100;

function valuePreview(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') return `Object(${Object.keys(v).length})`;
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}
function valueTypeClass(v) {
  if (v === null) return 'jt-null';
  if (Array.isArray(v) || typeof v === 'object') return 'jt-container';
  if (typeof v === 'string') return 'jt-string';
  if (typeof v === 'number') return 'jt-number';
  if (typeof v === 'boolean') return 'jt-boolean';
  return '';
}

function matches(text, query) {
  return query && String(text).toLowerCase().includes(query.toLowerCase());
}

function Highlighted({ text, query }) {
  if (!query) return text;
  const s = String(text);
  const idx = s.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {s.slice(0, idx)}
      <mark className="jt-mark">{s.slice(idx, idx + query.length)}</mark>
      {s.slice(idx + query.length)}
    </>
  );
}

function TreeNode({ nodeKey, value, segments, expandedPaths, onToggle, searchQuery, searchMode, onCopyPath, isArrayItem }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const path = formatPath(segments);
  const isContainer = value !== null && typeof value === 'object';
  const isExpanded = expandedPaths.has(path);

  const keyMatch = searchMode !== 'values' && matches(nodeKey, searchQuery);
  const valueMatch = !isContainer && searchMode !== 'keys' && matches(value, searchQuery);

  if (!isContainer) {
    return (
      <div className="jt-row">
        <span className="jt-indent" />
        {nodeKey !== undefined && (
          <span className={`jt-key ${keyMatch ? 'jt-key-match' : ''}`}>
            {isArrayItem ? '' : <><Highlighted text={nodeKey} query={keyMatch ? searchQuery : ''} />: </>}
          </span>
        )}
        <span className={valueTypeClass(value)}>
          <Highlighted text={valuePreview(value)} query={valueMatch ? searchQuery : ''} />
        </span>
        <button className="jt-path-btn" title="Copy JSON Path" onClick={() => onCopyPath(path)}>⧉</button>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
  const shown = entries.slice(0, visibleCount);
  const remaining = entries.length - shown.length;

  return (
    <div className="jt-node">
      <div className="jt-row">
        <button className="jt-toggle" onClick={() => onToggle(path)} aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? '▾' : '▸'}
        </button>
        {nodeKey !== undefined && !isArrayItem && (
          <span className={`jt-key ${keyMatch ? 'jt-key-match' : ''}`}><Highlighted text={nodeKey} query={keyMatch ? searchQuery : ''} />: </span>
        )}
        <span className="jt-container-label">{Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`}</span>
        <button className="jt-path-btn" title="Copy JSON Path" onClick={() => onCopyPath(path)}>⧉</button>
      </div>
      {isExpanded && (
        <div className="jt-children">
          {shown.map(([k, v]) => (
            <TreeNode
              key={k}
              nodeKey={Array.isArray(value) ? undefined : k}
              value={v}
              segments={[...segments, k]}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              searchQuery={searchQuery}
              searchMode={searchMode}
              onCopyPath={onCopyPath}
              isArrayItem={Array.isArray(value)}
            />
          ))}
          {remaining > 0 && (
            <button className="jt-more" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              + Show {Math.min(remaining, PAGE_SIZE)} more (of {remaining} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Root path is always shown expanded-or-not via the same expandedPaths
// set the caller owns — kept outside this component so "Expand All" /
// "Collapse All" / search-driven auto-expand can all be implemented as
// plain Set operations by the parent, without this component needing its
// own separate expand state to keep in sync.
export default function JsonTreeView({ data, expandedPaths, onToggle, searchQuery, searchMode, onCopyPath }) {
  return (
    <div className="jt-root">
      <TreeNode
        nodeKey={undefined}
        value={data}
        segments={[]}
        expandedPaths={expandedPaths}
        onToggle={onToggle}
        searchQuery={searchQuery}
        searchMode={searchMode}
        onCopyPath={onCopyPath}
      />
    </div>
  );
}
