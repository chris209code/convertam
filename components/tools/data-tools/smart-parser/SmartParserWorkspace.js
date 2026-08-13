'use client';
import { useState } from 'react';
import { T } from './theme';
import { ingestFile, IngestError } from '@/lib/smartParser/ingest';
import { detectTables } from '@/lib/smartParser/tableDetect';
import { extractAll } from '@/lib/smartParser/fieldExtract';
import { normalizeExtraction } from '@/lib/smartParser/normalize';
import { mapToCustomSchema } from '@/lib/smartParser/schemaMap';
import { downloadBlob, buildResultMarkdown } from '@/lib/smartParser/exporters';
import UploadStep from './UploadStep';
import ModeStep from './ModeStep';
import OverviewTab from './OverviewTab';
import TextTab from './TextTab';
import TablesTab from './TablesTab';
import FieldsTab from './FieldsTab';
import JsonTab from './JsonTab';
import { ErrorPanel, WarningBanner } from './ErrorStates';

const REGEX_TYPE_LABELS = { emails: 'Email', phones: 'Phone', urls: 'URL', dates: 'Date', currency: 'Amount', postal: 'Postal Code' };
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'text', label: 'Text' },
  { id: 'tables', label: 'Tables' },
  { id: 'fields', label: 'Fields' },
  { id: 'json', label: 'JSON' },
];

function buildFieldRows(mode, extraction, customResults) {
  if (mode === 'custom') {
    return customResults.map((r) => ({ field: r.field, label: r.field, value: r.value, confidence: r.confidence === 'none' ? 'low' : r.confidence }));
  }
  const rows = extraction.labeledFields.map((f) => ({ label: f.label, value: f.value, confidence: f.confidence }));
  for (const [type, label] of Object.entries(REGEX_TYPE_LABELS)) {
    (extraction[type] || []).forEach((v) => rows.push({ label, value: v, confidence: 'high' }));
  }
  return rows;
}

export default function SmartParserWorkspace() {
  const [step, setStep] = useState('upload'); // upload | mode | processing | results
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('parse');
  const [schemaFields, setSchemaFields] = useState([]);
  const [error, setError] = useState(null);

  const [result, setResult] = useState(null); // raw ingest result
  const [extraction, setExtraction] = useState(null);
  const [tables, setTables] = useState([]);
  const [fieldRows, setFieldRows] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [copyState, setCopyState] = useState('idle');

  const [aiState, setAiState] = useState('idle'); // idle | loading | error
  const [aiErrorCode, setAiErrorCode] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiApplied, setAiApplied] = useState(0);

  function reset() {
    setStep('upload'); setFile(null); setError(null); setResult(null); setExtraction(null);
    setTables([]); setFieldRows([]); setActiveTab('overview'); setAiState('idle'); setAiErrorCode(null);
    setDocumentType(null); setAiSummary(null); setAiApplied(0); setMode('parse'); setSchemaFields([]);
  }

  function handleFile(f) {
    setFile(f);
    setError(null);
    setStep('mode');
  }

  async function handleProcess() {
    setStep('processing');
    setError(null);
    try {
      const ingestResult = await ingestFile(file);
      const rawExtraction = extractAll(ingestResult.rawText);
      const normExtraction = normalizeExtraction(rawExtraction);
      const detectedTables = mode === 'text' ? [] : detectTables(ingestResult);
      const customResults = mode === 'custom' ? mapToCustomSchema(schemaFields, normExtraction) : [];
      const rows = mode === 'tables' ? [] : buildFieldRows(mode, normExtraction, customResults);

      setResult({ ...ingestResult, fileName: file.name, fileSize: file.size });
      setExtraction(normExtraction);
      setTables(detectedTables);
      setFieldRows(rows);
      setActiveTab(mode === 'tables' ? 'tables' : mode === 'text' ? 'text' : 'overview');
      setStep('results');
    } catch (err) {
      if (err instanceof IngestError) {
        setError({ code: err.code, message: err.message });
      } else {
        console.error('Smart Parser processing error:', err);
        setError({ code: 'read_failed', message: 'Something went wrong while processing this file.' });
      }
      setStep('error');
    }
  }

  function handleEditCell(tableIdx, rowIdx, col, value) {
    setTables((prev) => prev.map((t, i) => {
      if (i !== tableIdx) return t;
      const rows = t.rows.map((r, ri) => (ri === rowIdx ? { ...r, [col]: value } : r));
      return { ...t, rows };
    }));
  }

  function handleEditField(idx, value) {
    setFieldRows((prev) => prev.map((f, i) => (i === idx ? { ...f, value } : f)));
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(result.rawText);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch { /* clipboard unavailable */ }
  }

  async function handleAnalyzeWithAI() {
    setAiState('loading');
    setAiErrorCode(null);
    try {
      let res;
      if (mode === 'custom') {
        const formData = new FormData();
        formData.append('action', 'extractSchema');
        formData.append('fields', JSON.stringify(schemaFields));
        if (result.kind === 'image') {
          formData.append('image', file);
        } else {
          formData.append('text', result.rawText);
        }
        res = await fetch('/api/smart-parser', { method: 'POST', body: formData });
      } else {
        const formData = new FormData();
        formData.append('action', 'analyze');
        formData.append('text', result.rawText || `[No extractable text — file: ${result.fileName}]`);
        formData.append('fields', JSON.stringify(fieldRows));
        if (result.kind === 'image' && !result.rawText) {
          formData.append('image', file);
        }
        res = await fetch('/api/smart-parser', { method: 'POST', body: formData });
      }

      const data = await res.json();
      if (!res.ok) {
        setAiErrorCode(data.category === 'auth' ? 'ai_unavailable' : data.category === 'timeout' ? 'ai_timeout' : 'ai_error');
        setAiState('error');
        return;
      }

      if (mode === 'custom') {
        const rows = (data.fields || []).map((f) => ({ field: f.field, label: f.field, value: f.value || null, confidence: f.value ? (f.confidence || 'medium') : 'none' }));
        setFieldRows(rows);
      } else {
        setDocumentType(data.documentType || null);
        setAiSummary(data.summary || null);
        let applied = 0;
        setFieldRows((prev) => prev.map((f) => {
          const cleaned = (data.cleanedFields || []).find((c) => c.field === f.label || c.field === f.field);
          if (cleaned?.changed && cleaned.cleanedValue) { applied += 1; return { ...f, value: cleaned.cleanedValue }; }
          return f;
        }));
        setAiApplied(applied);
      }
      setAiState('idle');
    } catch (err) {
      console.error('Smart Parser AI call failed:', err);
      setAiErrorCode('ai_error');
      setAiState('error');
    }
  }

  function handleExport(format) {
    const base = `smart-parser-result`;
    if (format === 'txt') downloadBlob(result.rawText || '', 'text/plain', `${base}.txt`);
    else if (format === 'md') downloadBlob(buildResultMarkdown({ documentType, fields: fieldRows, tables, text: result.rawText }), 'text/markdown', `${base}.md`);
  }

  if (step === 'upload') return <UploadStep onFile={handleFile} />;

  if (step === 'mode') {
    return <ModeStep file={file} mode={mode} setMode={setMode} schemaFields={schemaFields} setSchemaFields={setSchemaFields} onContinue={handleProcess} onBack={reset} />;
  }

  if (step === 'processing') {
    return (
      <div style={{ fontFamily: T.font, textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${T.accentBorder}`, borderTopColor: T.accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'spSpin 0.8s linear infinite' }} />
        <style>{`@keyframes spSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontWeight: 700, color: T.ink, fontSize: '0.95rem' }}>Parsing your document…</div>
        <div style={{ fontSize: '0.8rem', color: T.muted, marginTop: 4 }}>Extracting text, tables, and fields.</div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <ErrorPanel code={error.code} message={error.message} onRetry={reset} />
      </div>
    );
  }

  // step === 'results'
  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={reset} style={{ fontSize: '0.78rem', color: T.accentDark, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}>← Parse another document</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleExport('txt')} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>TXT</button>
          <button onClick={() => handleExport('md')} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>Markdown</button>
          <button
            onClick={handleAnalyzeWithAI}
            disabled={aiState === 'loading'}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: aiState === 'loading' ? '#CBD5E1' : 'linear-gradient(120deg, #7C3AED, #DB2777)', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: aiState === 'loading' ? 'default' : 'pointer', fontFamily: T.font }}
          >
            {aiState === 'loading' ? 'Analyzing…' : '✨ Analyze with AI'}
          </button>
        </div>
      </div>

      {result.isScanned && result.kind !== 'image' && <WarningBanner>This looks like a scanned document — deterministic text extraction may be incomplete. Try "Analyze with AI" for OCR-quality reading.</WarningBanner>}
      {result.kind === 'image' && <WarningBanner>Images have no extractable text without AI — click "Analyze with AI" to read this image.</WarningBanner>}
      {aiState === 'error' && <ErrorPanel code={aiErrorCode} onDismiss={() => setAiState('idle')} />}
      {aiApplied > 0 && aiState === 'idle' && <div style={{ fontSize: '0.78rem', color: '#065F46', background: T.successTint, border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>✓ AI improved {aiApplied} field{aiApplied === 1 ? '' : 's'} above.</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.borderLight}`, overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: T.font,
              fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap',
              color: activeTab === t.id ? T.accentDark : T.muted,
              borderBottom: activeTab === t.id ? `2px solid ${T.accent}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab result={result} tables={tables} fieldCount={fieldRows.length} documentType={documentType} classificationSummary={aiSummary} status="Complete" />}
      {activeTab === 'text' && <TextTab text={result.rawText} onCopy={handleCopyText} copyState={copyState} />}
      {activeTab === 'tables' && <TablesTab tables={tables} onEditCell={handleEditCell} />}
      {activeTab === 'fields' && <FieldsTab fields={fieldRows} onEditValue={handleEditField} />}
      {activeTab === 'json' && <JsonTab documentType={documentType} pageCount={result.pageCount} fields={fieldRows} tables={tables} text={result.rawText} />}
    </div>
  );
}
