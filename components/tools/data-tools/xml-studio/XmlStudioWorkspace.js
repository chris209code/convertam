'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { T } from '../smart-parser/theme';
import CodeEditor from '../shared/CodeEditor';
import XmlTreeView from './XmlTreeView';
import { downloadBlob, copyText, sendToTool } from '@/lib/dataTools/shared';
import {
  parseXml, formatXml, minifyXml, buildTree, xmlToJson, xmlToCsv, computeXmlStats, tokenizeXmlForHighlight,
} from '@/lib/dataTools/xmlEngine';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
  <supplier>
    <name>Acme Supplies Ltd</name>
    <email>billing@acmesupplies.com</email>
  </supplier>
  <customer>
    <name>ABC Trading Company</name>
    <country>Nigeria</country>
  </customer>
  <items>
    <item sku="W-100">
      <description>Widget A</description>
      <qty>4</qty>
      <price>25.00</price>
    </item>
    <item sku="W-200">
      <description>Widget B</description>
      <qty>2</qty>
      <price>50.00</price>
    </item>
  </items>
</invoice>`;

const TOKEN_CLASS = { keyword: 'ce-keyword', string: 'ce-string', comment: 'ce-comment', tag: 'ce-tag', attr: 'ce-attr', punct: 'ce-punct', ident: 'ce-ident' };

const MODES = [
  { id: 'editor', label: 'Editor' },
  { id: 'tree', label: 'Tree' },
  { id: 'output', label: 'Preview / Output' },
];

export default function XmlStudioWorkspace() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('editor');
  const [outputMode, setOutputMode] = useState('formatted'); // formatted | minified | json | csv
  const [expandedPaths, setExpandedPaths] = useState(() => new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [copyState, setCopyState] = useState('idle');

  const parsed = useMemo(() => parseXml(input), [input]);
  const stats = useMemo(() => (parsed.valid ? computeXmlStats(parsed.doc, input) : null), [parsed, input]);
  const tree = useMemo(() => (parsed.valid ? buildTree(parsed.doc.documentElement) : null), [parsed]);

  // A freshly-parsed document starts with just the root expanded — mirrors
  // JSON Studio's tree view convention, and means the first thing a user
  // sees after uploading isn't a single collapsed "▸<root>" row.
  useEffect(() => {
    if (tree) setExpandedPaths(new Set([tree.path]));
  }, [tree]);

  function toggleNode(path) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function tokenize(text) { return tokenizeXmlForHighlight(text); }

  const outputText = useMemo(() => {
    if (!parsed.valid) return '';
    if (outputMode === 'formatted') return formatXml(parsed.doc);
    if (outputMode === 'minified') return minifyXml(parsed.doc);
    if (outputMode === 'json') return JSON.stringify(xmlToJson(parsed.doc), null, 2);
    if (outputMode === 'csv') {
      const r = xmlToCsv(parsed.doc);
      return r.ok ? r.csv : '';
    }
    return '';
  }, [parsed, outputMode]);

  const csvResult = useMemo(() => (parsed.valid && outputMode === 'csv' ? xmlToCsv(parsed.doc) : null), [parsed, outputMode]);

  async function handleCopy() {
    const ok = await copyText(outputText);
    setCopyState(ok ? 'copied' : 'idle');
    if (ok) setTimeout(() => setCopyState('idle'), 1600);
  }

  function handleDownload() {
    const ext = outputMode === 'json' ? 'json' : outputMode === 'csv' ? 'csv' : 'xml';
    const mime = outputMode === 'json' ? 'application/json' : outputMode === 'csv' ? 'text/csv' : 'application/xml';
    downloadBlob(outputText, mime, `document.${ext}`);
  }

  function handleOpenInCsvStudio() {
    sendToTool({ tool: 'csv-studio', kind: 'csv-text', content: outputText });
    router.push('/data-tools/csv-studio');
  }
  function handleOpenInSqlStudio() {
    sendToTool({ tool: 'sql-studio', kind: 'csv-text', content: outputText, tableName: 'imported' });
    router.push('/data-tools/sql-studio');
  }

  function handleFileUpload(file) {
    file.text().then(setInput);
  }

  return (
    <div style={{ fontFamily: T.font, maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={tabStyle(mode === m.id)}>{m.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={fileBtnStyle}>
            Upload XML
            <input type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />
          </label>
          <button onClick={() => setInput(SAMPLE_XML)} style={smallBtnStyle}>Sample XML</button>
          <button onClick={() => setInput('')} style={smallBtnStyle}>Clear</button>
        </div>
      </div>

      {mode === 'editor' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={() => parsed.valid && setInput(formatXml(parsed.doc))} style={smallBtnStyle} disabled={!parsed.valid}>Format</button>
            <button onClick={() => parsed.valid && setInput(minifyXml(parsed.doc))} style={smallBtnStyle} disabled={!parsed.valid}>Minify</button>
            <button onClick={async () => { const ok = await copyText(input); setCopyState(ok ? 'copied' : 'idle'); if (ok) setTimeout(() => setCopyState('idle'), 1600); }} style={smallBtnStyle}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy'}</button>
            <button onClick={() => downloadBlob(input, 'application/xml', 'document.xml')} style={smallBtnStyle} disabled={!input}>Download XML</button>
          </div>
          <CodeEditor value={input} onChange={setInput} tokenize={tokenize} tokenClass={TOKEN_CLASS} placeholder="Paste or type XML here…" minHeight={340} />
          {input.trim() !== '' && (
            parsed.valid ? (
              <div style={validBoxStyle}>✓ Valid XML — {stats.elements} elements, {stats.attributes} attributes, max depth {stats.maxDepth}</div>
            ) : (
              <div style={errorBoxStyle}>
                ⚠️ {parsed.error.message}
                {parsed.error.line != null && <span> (line {parsed.error.line}, column {parsed.error.column})</span>}
              </div>
            )
          )}
        </div>
      )}

      {mode === 'tree' && (
        <div>
          {!parsed.valid ? (
            <div style={errorBoxStyle}>{input.trim() === '' ? 'Nothing to show yet — paste or upload XML in the Editor tab first.' : `⚠️ ${parsed.error.message}`}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 280px' : '1fr', gap: 16 }} className="xml-tree-grid">
              <div style={treePanelStyle}>
                <XmlTreeView root={tree} expandedPaths={expandedPaths} onToggle={toggleNode} onSelect={setSelectedNode} selectedPath={selectedNode?.path} />
              </div>
              {selectedNode && (
                <div style={inspectorStyle}>
                  <div style={{ fontWeight: 700, color: T.ink, marginBottom: 8, fontSize: '0.85rem' }}>Node inspector</div>
                  <InspectorRow label="Element" value={selectedNode.tagName} />
                  <InspectorRow label="Path" value={selectedNode.path} mono />
                  {selectedNode.attributes.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>ATTRIBUTES</div>
                      {selectedNode.attributes.map((a) => <InspectorRow key={a.name} label={a.name} value={a.value} mono />)}
                    </div>
                  )}
                  {selectedNode.text && <InspectorRow label="Value" value={selectedNode.text} />}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'output' && (
        <div>
          {!parsed.valid ? (
            <div style={errorBoxStyle}>{input.trim() === '' ? 'Nothing to convert yet — paste or upload XML in the Editor tab first.' : `⚠️ ${parsed.error.message}`}</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {[['formatted', 'Formatted XML'], ['minified', 'Minified XML'], ['json', 'XML → JSON'], ['csv', 'XML → CSV']].map(([id, label]) => (
                  <button key={id} onClick={() => setOutputMode(id)} style={pillStyle(outputMode === id)}>{label}</button>
                ))}
              </div>
              {outputMode === 'csv' && csvResult && !csvResult.ok ? (
                <div style={errorBoxStyle}>ℹ️ {csvResult.message}</div>
              ) : (
                <>
                  <textarea readOnly value={outputText} style={outputAreaStyle} spellCheck={false} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={handleCopy} style={smallBtnStyle}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy'}</button>
                    <button onClick={handleDownload} style={smallBtnStyle}>⬇ Download {outputMode === 'json' ? 'JSON' : outputMode === 'csv' ? 'CSV' : 'XML'}</button>
                    {outputMode === 'csv' && (
                      <>
                        <button onClick={handleOpenInCsvStudio} style={primaryBtnStyle}>Open in CSV Studio →</button>
                        <button onClick={handleOpenInSqlStudio} style={primaryBtnStyle}>Open in SQL Studio →</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 720px) {
          .xml-tree-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function InspectorRow({ label, value, mono }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: T.inkSecondary, fontFamily: mono ? 'ui-monospace, monospace' : T.font, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const tabStyle = (active) => ({
  padding: '8px 16px', borderRadius: 10, border: active ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
  background: active ? T.accentTint : 'white', color: active ? T.accentDark : T.inkSecondary,
  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: T.font,
});
const pillStyle = (active) => ({
  padding: '7px 14px', borderRadius: 999, border: 'none',
  background: active ? T.accentGradient : '#F1F5F9', color: active ? 'white' : T.inkSecondary,
  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: T.font,
});
const smallBtnStyle = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font };
const fileBtnStyle = { ...smallBtnStyle, position: 'relative', overflow: 'hidden', display: 'inline-block' };
const primaryBtnStyle = { padding: '7px 14px', borderRadius: 8, border: 'none', background: T.accentGradient, color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font };
const validBoxStyle = { marginTop: 10, padding: '10px 14px', borderRadius: 10, background: T.successTint, border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.8rem', fontWeight: 600 };
const errorBoxStyle = { marginTop: 10, padding: '14px', borderRadius: 10, background: T.dangerTint, border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 };
const treePanelStyle = { border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, maxHeight: 440, overflow: 'auto', background: '#F8FAFC' };
const inspectorStyle = { border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, background: 'white', height: 'fit-content' };
const outputAreaStyle = { width: '100%', minHeight: 320, padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box', color: T.ink, background: '#F8FAFC' };
