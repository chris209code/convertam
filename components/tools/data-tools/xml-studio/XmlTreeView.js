'use client';

function TreeNode({ node, depth, expandedPaths, onToggle, onSelect, selectedPath }) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <div className="xt-node">
      <div
        className={`xt-row ${isSelected ? 'xt-row-selected' : ''}`}
        style={{ paddingLeft: depth * 18 }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button className="xt-toggle" onClick={(e) => { e.stopPropagation(); onToggle(node.path); }} aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : <span className="xt-toggle-spacer" />}
        <span className="xt-tag">&lt;{node.tagName}&gt;</span>
        {node.attributes.length > 0 && (
          <span className="xt-attrs">{node.attributes.map((a) => `${a.name}="${a.value}"`).join(' ')}</span>
        )}
        {!hasChildren && node.text && <span className="xt-text">{node.text}</span>}
        {hasChildren && <span className="xt-count">{node.children.length} child{node.children.length === 1 ? '' : 'ren'}</span>}
      </div>
      {hasChildren && isExpanded && (
        <div className="xt-children">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} expandedPaths={expandedPaths} onToggle={onToggle} onSelect={onSelect} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function XmlTreeView({ root, expandedPaths, onToggle, onSelect, selectedPath }) {
  if (!root) return null;
  return (
    <div className="xt-root">
      <TreeNode node={root} depth={0} expandedPaths={expandedPaths} onToggle={onToggle} onSelect={onSelect} selectedPath={selectedPath} />
      <style jsx>{`
        .xt-root { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.8rem; }
        .xt-row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 6px; cursor: pointer; flex-wrap: wrap; }
        .xt-row:hover { background: #F1F5F9; }
        .xt-row-selected { background: #ECFEFF; }
        .xt-toggle { border: none; background: none; color: #64748B; cursor: pointer; width: 14px; flex-shrink: 0; padding: 0; font-size: 0.7rem; }
        .xt-toggle-spacer { width: 14px; flex-shrink: 0; display: inline-block; }
        .xt-tag { color: #0E7490; font-weight: 700; }
        .xt-attrs { color: #B45309; font-size: 0.76rem; }
        .xt-text { color: #059669; }
        .xt-count { color: #94A3B8; font-size: 0.74rem; font-style: italic; }
      `}</style>
    </div>
  );
}
