'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { buildPptxFromOutline } from '@/lib/buildPptxFromOutline';

const INTENT_OPTIONS = [
  'Analyze my data', 'Generate charts', 'Executive report', 'Identify trends', 'Create PowerPoint presentation',
];
// V1 deliberately excludes: Compare periods, Forecast future values, Detect anomalies —
// these need real statistical modelling, not just an LLM call, and were
// explicitly deferred per the original scope for this tool.

const INDUSTRIES = ['General', 'Business/Finance', 'Sales', 'Manufacturing/Production', 'Quality Assurance', 'Laboratory', 'Inventory', 'Education', 'Healthcare'];

const CHART_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 };
const chipBtn = (active) => ({ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: active ? '2px solid #2563EB' : '1px solid #E2E8F0', background: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#475569' });

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(file) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

function parseDelimitedText(text) {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (!lines.length) return { columns: [], rows: [] };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const columns = lines[0].split(delimiter).map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    const row = {};
    columns.forEach((col, i) => { row[col] = (cells[i] || '').trim(); });
    return row;
  });
  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Client-side stats — this is what makes the AI's numbers real rather than
// invented: we compute every number ourselves from the actual data, and the
// AI only ever writes narrative text around numbers we hand it.
// ---------------------------------------------------------------------------
function isNumeric(val) {
  if (val === null || val === undefined || val === '') return false;
  return !isNaN(parseFloat(String(val).replace(/,/g, ''))) && isFinite(String(val).replace(/,/g, ''));
}
function toNumber(val) {
  return parseFloat(String(val).replace(/,/g, ''));
}

// Date detection requires an actual date-like shape (separators, month
// names) before trusting Date.parse — otherwise plain numbers ("2024",
// "5", serial-looking IDs) get misread as dates, since Date.parse is
// permissive by design.
const DATE_SHAPE_RE = /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$|^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i;

function isDateLike(val) {
  if (val === null || val === undefined || String(val).trim() === '') return false;
  const s = String(val).trim();
  if (!DATE_SHAPE_RE.test(s)) return false;
  const parsed = Date.parse(s);
  return !isNaN(parsed);
}

function computeStats(columns, rows) {
  const stats = {};
  columns.forEach((col) => {
    const values = rows.map((r) => r[col]);
    const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const missing = values.length - nonEmpty.length;
    const dateCount = nonEmpty.filter(isDateLike).length;
    const isDateCol = nonEmpty.length > 0 && dateCount / nonEmpty.length >= 0.7;

    if (isDateCol) {
      const invalidDates = nonEmpty.filter((v) => !isDateLike(v)).length;
      stats[col] = { type: 'date', count: nonEmpty.length, missing, invalidDates };
      return;
    }

    const numericCount = nonEmpty.filter(isNumeric).length;
    const isNumericCol = nonEmpty.length > 0 && numericCount / nonEmpty.length >= 0.7;

    if (isNumericCol) {
      const nums = nonEmpty.filter(isNumeric).map(toNumber);
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = nums.length ? sum / nums.length : 0;
      const variance = nums.length ? nums.reduce((s, n) => s + (n - avg) ** 2, 0) / nums.length : 0;
      const stdDev = Math.sqrt(variance);
      const outlierCount = stdDev > 0 ? nums.filter((n) => Math.abs(n - avg) > 3 * stdDev).length : 0;
      stats[col] = {
        type: 'numeric', count: nums.length, missing,
        sum: Math.round(sum * 100) / 100,
        avg: nums.length ? Math.round(avg * 100) / 100 : 0,
        min: nums.length ? Math.min(...nums) : 0,
        max: nums.length ? Math.max(...nums) : 0,
        negativeCount: nums.filter((n) => n < 0).length,
        outlierCount,
      };
    } else {
      const counts = {};
      nonEmpty.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      const topValues = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count }));
      stats[col] = { type: 'categorical', count: nonEmpty.length, missing, uniqueCount: Object.keys(counts).length, topValues };
    }
  });
  return stats;
}

// ---------------------------------------------------------------------------
// Dataset Health Check — fully deterministic, no AI involved, never alters
// the user's data. This is what the Dataset Understanding step and every
// downstream confidence statement is grounded in.
// ---------------------------------------------------------------------------
function computeDatasetHealth(columns, rows, stats) {
  const totalRows = rows.length;
  const totalColumns = columns.length;
  const totalCells = totalRows * totalColumns;

  const missingValues = columns.reduce((sum, c) => sum + (stats[c]?.missing || 0), 0);
  const emptyColumns = columns.filter((c) => stats[c] && stats[c].missing === totalRows);

  const seen = new Set();
  let duplicateRows = 0;
  rows.forEach((r) => { const key = JSON.stringify(r); if (seen.has(key)) duplicateRows++; else seen.add(key); });

  const invalidDates = columns.reduce((sum, c) => sum + (stats[c]?.type === 'date' ? (stats[c].invalidDates || 0) : 0), 0);
  const possibleOutliers = columns.reduce((sum, c) => sum + (stats[c]?.type === 'numeric' ? (stats[c].outlierCount || 0) : 0), 0);

  const completeness = totalCells > 0 ? Math.round(((totalCells - missingValues) / totalCells) * 1000) / 10 : 0;

  let health = 'Good';
  const issueCount = emptyColumns.length + (duplicateRows > 0 ? 1 : 0) + (invalidDates > 0 ? 1 : 0);
  if (completeness < 70 || issueCount >= 3) health = 'Poor';
  else if (completeness < 90 || issueCount >= 1) health = 'Needs Attention';

  return { totalRows, totalColumns, missingValues, duplicateRows, emptyColumns: emptyColumns.length, invalidDates, possibleOutliers, completeness, health };
}

function computeQualityWarnings(columns, rows, stats) {
  const warnings = [];
  const missingCols = columns.filter((c) => stats[c]?.missing > 0);
  if (missingCols.length) warnings.push(`Missing values found in: ${missingCols.map((c) => `${c} (${stats[c].missing})`).join(', ')}`);

  const seen = new Set();
  let duplicates = 0;
  rows.forEach((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) duplicates++; else seen.add(key);
  });
  if (duplicates > 0) warnings.push(`${duplicates} duplicate row${duplicates > 1 ? 's' : ''} detected`);

  columns.forEach((c) => {
    if (stats[c]?.type === 'numeric' && stats[c].negativeCount > 0) {
      warnings.push(`"${c}" contains ${stats[c].negativeCount} negative value${stats[c].negativeCount > 1 ? 's' : ''} — worth double-checking if unexpected`);
    }
  });

  return warnings;
}

// ---------------------------------------------------------------------------
// Chart data preparation — turns a suggested chart spec + the real rows into
// actual plottable {labels, values} or {points}, computed by us, not the AI.
// ---------------------------------------------------------------------------
function prepareChartData(chart, rows, stats) {
  const { type, xColumn, yColumn } = chart;

  if (type === 'histogram') {
    const nums = rows.map((r) => toNumber(r[xColumn])).filter((n) => !isNaN(n));
    if (!nums.length) return null;
    const min = Math.min(...nums), max = Math.max(...nums);
    const binCount = 8;
    const binSize = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({ label: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`, count: 0 }));
    nums.forEach((n) => {
      let idx = Math.floor((n - min) / binSize);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    });
    return { labels: bins.map((b) => b.label), values: bins.map((b) => b.count) };
  }

  if (type === 'scatter') {
    const points = rows.map((r) => ({ x: toNumber(r[xColumn]), y: toNumber(r[yColumn]) })).filter((p) => !isNaN(p.x) && !isNaN(p.y)).slice(0, 300);
    return points.length ? { points } : null;
  }

  // bar / line / pie — aggregate yColumn by xColumn category (or count rows if no yColumn / non-numeric yColumn)
  const groups = {};
  rows.forEach((r) => {
    const key = String(r[xColumn] ?? 'Unknown');
    const yVal = yColumn ? toNumber(r[yColumn]) : 1;
    if (!groups[key]) groups[key] = 0;
    groups[key] += (yColumn && !isNaN(yVal)) ? yVal : 1;
  });
  let entries = Object.entries(groups);
  if (entries.length > 12) {
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const otherSum = entries.slice(10).reduce((s, [, v]) => s + v, 0);
    entries = [...top, ['Other', otherSum]];
  }
  return { labels: entries.map((e) => e[0]), values: entries.map((e) => Math.round(e[1] * 100) / 100) };
}

// ---------------------------------------------------------------------------
// Canvas chart renderer — bar / line / pie / scatter / histogram, no new
// charting-library dependency, drawn directly the same way other visual
// tools on this site already do.
// ---------------------------------------------------------------------------
function ChartCanvas({ chart, data, chartRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const padding = { top: 30, right: 20, bottom: 50, left: 55 };
    ctx.clearRect(0, 0, W, H);
    ctx.font = '12px Inter, sans-serif';

    if (chart.type === 'pie') {
      const total = data.values.reduce((a, b) => a + b, 0) || 1;
      const cx = W / 2, cy = H / 2 + 10, r = Math.min(W, H) / 2 - 50;
      let angle = -Math.PI / 2;
      data.values.forEach((v, i) => {
        const slice = (v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.closePath();
        ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
        ctx.fill();
        angle += slice;
      });
      let legendY = H - 30;
      data.labels.forEach((label, i) => {
        const lx = 10 + (i % 4) * (W / 4);
        const ly = legendY + Math.floor(i / 4) * 16;
        ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
        ctx.fillRect(lx, ly, 10, 10);
        ctx.fillStyle = '#334155';
        ctx.fillText(`${label}`, lx + 14, ly + 9);
      });
      return;
    }

    if (chart.type === 'scatter') {
      const xs = data.points.map((p) => p.x), ys = data.points.map((p) => p.y);
      const xMin = Math.min(...xs), xMax = Math.max(...xs);
      const yMin = Math.min(...ys), yMax = Math.max(...ys);
      const plotW = W - padding.left - padding.right, plotH = H - padding.top - padding.bottom;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, H - padding.bottom); ctx.lineTo(W - padding.right, H - padding.bottom); ctx.stroke();
      data.points.forEach((p) => {
        const px = padding.left + ((p.x - xMin) / (xMax - xMin || 1)) * plotW;
        const py = H - padding.bottom - ((p.y - yMin) / (yMax - yMin || 1)) * plotH;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fillStyle = '#2563EB99'; ctx.fill();
      });
      return;
    }

    // bar, line, histogram — shared axis logic
    const values = data.values;
    const maxVal = Math.max(...values, 1);
    const plotW = W - padding.left - padding.right, plotH = H - padding.top - padding.bottom;
    const n = values.length;

    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, H - padding.bottom); ctx.lineTo(W - padding.right, H - padding.bottom); ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = H - padding.bottom - (i / 4) * plotH;
      ctx.fillText(Math.round((maxVal * i) / 4), padding.left - 8, y + 4);
    }
    ctx.textAlign = 'center';

    if (chart.type === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      values.forEach((v, i) => {
        const x = padding.left + (i / Math.max(n - 1, 1)) * plotW;
        const y = H - padding.bottom - (v / maxVal) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      values.forEach((v, i) => {
        const x = padding.left + (i / Math.max(n - 1, 1)) * plotW;
        const y = H - padding.bottom - (v / maxVal) * plotH;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#2563EB'; ctx.fill();
      });
    } else {
      const barWidth = (plotW / n) * 0.7;
      values.forEach((v, i) => {
        const x = padding.left + (i / n) * plotW + ((plotW / n) - barWidth) / 2;
        const barH = (v / maxVal) * plotH;
        const y = H - padding.bottom - barH;
        ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
        ctx.fillRect(x, y, barWidth, barH);
      });
    }

    ctx.fillStyle = '#475569';
    ctx.font = '10px Inter, sans-serif';
    data.labels.forEach((label, i) => {
      const x = padding.left + (i / Math.max(n - 1, chart.type === 'line' ? n - 1 : n)) * plotW + (chart.type !== 'line' ? (plotW / n) / 2 : 0);
      const short = String(label).length > 10 ? String(label).slice(0, 9) + '…' : label;
      ctx.save();
      ctx.translate(x, H - padding.bottom + 14);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = 'right';
      ctx.fillText(short, 0, 0);
      ctx.restore();
    });
  }, [chart, data]);

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{chart.title}</p>
      <canvas ref={(el) => { canvasRef.current = el; if (chartRef) chartRef.current = el; }} width={380} height={240} style={{ width: '100%', height: 'auto', maxWidth: 380 }} />
      {chart.reason && <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 6 }}>{chart.reason}</p>}
    </div>
  );
}

export default function DataAnalystWorkspace() {
  const [phase, setPhase] = useState('upload'); // upload | review | intents | report
  const [inputMode, setInputMode] = useState('file');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const [understanding, setUnderstanding] = useState(null);
  const [datasetHealth, setDatasetHealth] = useState(null);
  const [understandBusy, setUnderstandBusy] = useState(false);
  const [clarifyingAnswer, setClarifyingAnswer] = useState('');

  const [intents, setIntents] = useState(['Analyze my data', 'Generate charts', 'Executive report']);
  const [industry, setIndustry] = useState('General');

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chartData, setChartData] = useState({});
  const chartRefs = useRef({});

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const [downloading, setDownloading] = useState('');

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    setFileName(file.name);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'tsv') {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        if (!aoa.length) throw new Error('Empty file');
        const cols = aoa[0].map((c) => String(c || '').trim() || 'Column');
        const dataRows = aoa.slice(1).map((r) => {
          const obj = {};
          cols.forEach((c, i) => { obj[c] = r[i] !== undefined ? String(r[i]) : ''; });
          return obj;
        }).filter((r) => Object.values(r).some((v) => v !== ''));
        setColumns(cols);
        setRows(dataRows);
      } else if (file.type.startsWith('image/')) {
        if (!window.pdfjsLib && ext === 'pdf') throw new Error('pdf-lib-not-ready');
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch('/api/data-analyst', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extractFromImage', images: [{ mimeType: file.type, data: dataUrl.split(',')[1] }] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not read this image.');
        setColumns(data.columns || []);
        setRows((data.rows || []).map((r) => { const o = {}; (data.columns || []).forEach((c) => { o[c] = String(r[c] ?? ''); }); return o; }));
      } else if (ext === 'pdf') {
        if (!window.pdfjsLib) throw new Error('Still loading — please wait a moment and try again.');
        const text = await extractPdfText(file);
        const res = await fetch('/api/data-analyst', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extractFromPdfText', text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not read this PDF.');
        setColumns(data.columns || []);
        setRows((data.rows || []).map((r) => { const o = {}; (data.columns || []).forEach((c) => { o[c] = String(r[c] ?? ''); }); return o; }));
      } else {
        throw new Error('Unsupported file type.');
      }
      setPhase('review');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not read this file. Please check it and try again.');
    } finally {
      setExtracting(false);
    }
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    const { columns: cols, rows: dataRows } = parseDelimitedText(pasteText);
    if (!cols.length) { setError('Could not parse this as a table. Make sure it has a header row.'); return; }
    setColumns(cols);
    setRows(dataRows);
    setFileName('Pasted data');
    setPhase('review');
  }

  function updateCell(rowIdx, col, value) {
    setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [col]: value } : r));
  }
  function renameColumn(oldName, newName) {
    if (!newName.trim() || newName === oldName) return;
    setColumns((prev) => prev.map((c) => c === oldName ? newName : c));
    setRows((prev) => prev.map((r) => { const { [oldName]: val, ...rest } = r; return { ...rest, [newName]: val }; }));
  }
  function deleteRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function removeEmptyRows() {
    setRows((prev) => prev.filter((r) => Object.values(r).some((v) => String(v).trim() !== '')));
  }

  async function handleUnderstand() {
    setUnderstandBusy(true);
    setError('');
    try {
      const stats = computeStats(columns, rows);
      const health = computeDatasetHealth(columns, rows, stats);
      setDatasetHealth(health);

      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'understand', columns, stats, sampleRows: rows, rowCount: rows.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not understand this dataset.');
      setUnderstanding(data);
      setPhase('understanding');
    } catch (err) {
      setError(err.message);
    } finally {
      setUnderstandBusy(false);
    }
  }

  function toggleIntent(intent) {
    setIntents((prev) => prev.includes(intent) ? prev.filter((i) => i !== intent) : [...prev, intent]);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    try {
      const stats = computeStats(columns, rows);
      const qualityWarnings = computeQualityWarnings(columns, rows, stats);
      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', columns, stats, sampleRows: rows, qualityWarnings, intents, industry, rowCount: rows.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not analyze this data.');
      data.qualityWarnings = qualityWarnings;
      data.stats = stats;
      setAnalysis(data);

      const prepared = {};
      (data.suggestedCharts || []).forEach((chart, i) => {
        const cd = prepareChartData(chart, rows, stats);
        if (cd) prepared[i] = cd;
      });
      setChartData(prepared);
      setPhase('report');
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatBusy(true);
    try {
      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', question, columns, stats: analysis.stats, sampleRows: rows, rowCount: rows.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not answer that.');
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: `Sorry — ${err.message}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------
  function downloadCSV() {
    const header = columns.join(',');
    const body = rows.map((r) => columns.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${fileName || 'data'}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${fileName || 'data'}.xlsx`);
  }

  function downloadChartsPNG() {
    Object.entries(chartRefs.current).forEach(([i, canvas], idx) => {
      if (!canvas) return;
      setTimeout(() => {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url; a.download = `chart-${Number(i) + 1}.png`; a.click();
      }, idx * 200);
    });
  }

  async function downloadPDFReport() {
    setDownloading('pdf');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const margin = 50;
      let y = 792;
      const blue = rgb(0.145, 0.396, 0.918);

      function newPage() { page = pdfDoc.addPage([595, 842]); y = 792; }
      function checkY(n) { if (y - n < 50) newPage(); }
      function heading(text) {
        checkY(30); y -= 10;
        page.drawText(text, { x: margin, y, size: 14, font: bold, color: blue }); y -= 20;
      }
      function wrapText(text, size, f) {
        const words = String(text).split(' ');
        let line = '';
        words.forEach((w) => {
          const test = line ? `${line} ${w}` : w;
          if (f.widthOfTextAtSize(test, size) > 495 && line) {
            checkY(size + 4);
            page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.2, 0.2, 0.2) }); y -= size + 3;
            line = w;
          } else line = test;
        });
        if (line) { checkY(size + 4); page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.2, 0.2, 0.2) }); y -= size + 3; }
      }
      function bulletList(items) {
        items.forEach((item) => { checkY(16); page.drawText('•', { x: margin, y, size: 11, font: bold, color: blue }); wrapText(item, 11, font); y -= 2; });
      }

      page.drawText('Data Analysis Report', { x: margin, y, size: 22, font: bold, color: rgb(0.06, 0.09, 0.16) }); y -= 34;

      heading('Executive Summary');
      wrapText(analysis.executiveSummary, 11, font); y -= 8;

      if (analysis.keyFindings?.length) { heading('Key Findings'); bulletList(analysis.keyFindings); y -= 8; }
      if (analysis.insights?.length) { heading('Insights'); bulletList(analysis.insights); y -= 8; }
      if (analysis.trends?.length) { heading('Trends'); bulletList(analysis.trends); y -= 8; }
      if (analysis.recommendations?.length) { heading('Recommendations'); bulletList(analysis.recommendations); y -= 8; }
      if (analysis.risks?.length) { heading('Risks & Caveats'); bulletList(analysis.risks); y -= 8; }
      if (analysis.qualityWarnings?.length) { heading('Data Quality Notes'); bulletList(analysis.qualityWarnings); y -= 8; }
      heading('Conclusion');
      wrapText(analysis.conclusion, 11, font);

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'data-analysis-report.pdf'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  async function downloadWordReport() {
    setDownloading('word');
    try {
      const docx = await import('docx');
      const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx;
      const sections = [];
      sections.push(new Paragraph({ text: 'Data Analysis Report', heading: HeadingLevel.TITLE }));
      sections.push(new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: analysis.executiveSummary }));

      const addBulletSection = (title, items) => {
        if (!items?.length) return;
        sections.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }));
        items.forEach((item) => sections.push(new Paragraph({ text: item, bullet: { level: 0 } })));
      };
      addBulletSection('Key Findings', analysis.keyFindings);
      addBulletSection('Insights', analysis.insights);
      addBulletSection('Trends', analysis.trends);
      addBulletSection('Recommendations', analysis.recommendations);
      addBulletSection('Risks & Caveats', analysis.risks);
      addBulletSection('Data Quality Notes', analysis.qualityWarnings);
      sections.push(new Paragraph({ text: 'Conclusion', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: analysis.conclusion }));

      const doc = new Document({ sections: [{ children: sections }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'data-analysis-report.docx'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  async function downloadPresentation() {
    setDownloading('pptx');
    try {
      const outline = {
        title: 'Data Analysis',
        subtitle: analysis.executiveSummary,
        slides: [
          { type: 'title', title: 'Data Analysis', subtitle: analysis.executiveSummary },
          analysis.keyFindings?.length && { type: 'content', title: 'Key Findings', bullets: analysis.keyFindings },
          analysis.insights?.length && { type: 'content', title: 'Insights', bullets: analysis.insights },
          analysis.trends?.length && { type: 'content', title: 'Trends', bullets: analysis.trends },
          analysis.recommendations?.length && { type: 'content', title: 'Recommendations', bullets: analysis.recommendations },
          analysis.risks?.length && { type: 'content', title: 'Risks & Caveats', bullets: analysis.risks },
          { type: 'closing', title: 'Thank You', subtitle: analysis.conclusion },
        ].filter(Boolean),
      };
      const pptx = await buildPptxFromOutline(outline, { themeKey: 'modern' });
      await pptx.writeFile({ fileName: 'data-analysis-presentation.pptx' });
    } finally {
      setDownloading('');
    }
  }

  function startOver() {
    setPhase('upload'); setColumns([]); setRows([]); setAnalysis(null); setChartData({});
    setChatMessages([]); setError(''); setFileName(''); setPasteText('');
    setUnderstanding(null); setDatasetHealth(null); setClarifyingAnswer('');
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (phase === 'upload') {
    return (
      <div className="panel">
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={chipBtn(inputMode === 'file')} onClick={() => setInputMode('file')}>Upload a file</button>
          <button style={chipBtn(inputMode === 'paste')} onClick={() => setInputMode('paste')}>Paste table data</button>
        </div>

        {inputMode === 'file' ? (
          <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload your data</p>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 14 }}>Excel, CSV, TSV, a PDF with a table, or a photo/screenshot of a spreadsheet or report.</p>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.pdf,image/*" onChange={handleFileUpload} disabled={extracting} />
            {extracting && <p style={{ fontSize: '0.82rem', color: '#2563EB', marginTop: 12, fontWeight: 600 }}>Reading your data…</p>}
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Paste your table (from Excel, Google Sheets, etc.)</label>
            <textarea style={{ ...inputStyle, minHeight: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Name\tRevenue\tRegion\nAcme Co\t12000\tWest'} />
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handlePasteSubmit}>Continue →</button>
          </div>
        )}
        {error && <p style={{ color: '#DC2626', fontSize: '0.82rem', marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (phase === 'review') {
    const previewCols = columns;
    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Review your data</p>
        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 14 }}>{rows.length} rows extracted from {fileName}. Edit anything that looks wrong before continuing.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={removeEmptyRows} style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Remove empty rows</button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 20 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {previewCols.map((col) => (
                  <th key={col} style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                    <input value={col} onChange={(e) => renameColumn(col, e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.78rem', width: '100%' }} />
                  </th>
                ))}
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  {previewCols.map((col) => (
                    <td key={col} style={{ padding: 6 }}>
                      <input value={row[col] ?? ''} onChange={(e) => updateCell(i, col, e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', width: '100%' }} />
                    </td>
                  ))}
                  <td><button onClick={() => deleteRow(i)} style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: -12, marginBottom: 16 }}>Showing first 100 of {rows.length} rows — all rows are still included in the analysis.</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={startOver}>Start Over</button>
          <button className="btn btn-primary" disabled={understandBusy} onClick={handleUnderstand}>{understandBusy ? 'Reading your dataset…' : 'Confirm & Continue →'}</button>
        </div>
      </div>
    );
  }

  if (phase === 'understanding' && understanding && datasetHealth) {
    const columnsByType = { date: [], numeric: [], categorical: [] };
    columns.forEach((c) => {
      const t = computeStats(columns, rows)[c]?.type;
      if (columnsByType[t]) columnsByType[t].push(c);
    });
    const healthColor = datasetHealth.health === 'Good' ? '#059669' : datasetHealth.health === 'Needs Attention' ? '#D97706' : '#DC2626';
    const healthBg = datasetHealth.health === 'Good' ? '#ECFDF5' : datasetHealth.health === 'Needs Attention' ? '#FFFBEB' : '#FEF2F2';

    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Dataset Understanding</p>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Dataset identified as</p>
          <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>{understanding.datasetType}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>Likely business area</p>
              <p style={{ fontSize: '0.85rem', color: '#334155' }}>{understanding.industry}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>Confidence</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: understanding.confidence >= 70 ? '#059669' : '#D97706' }}>{understanding.confidence}%</p>
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
          <input
            style={{ ...inputStyle, marginBottom: 4 }}
            value={understanding.description}
            onChange={(e) => setUnderstanding((u) => ({ ...u, description: e.target.value }))}
          />
          <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Not quite right? Edit the description above before continuing.</p>
        </div>

        {understanding.confidence < 70 && understanding.clarifyingQuestion && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>{understanding.clarifyingQuestion}</p>
            <input style={inputStyle} value={clarifyingAnswer} onChange={(e) => setClarifyingAnswer(e.target.value)} placeholder="Your answer helps improve the analysis" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[['Date columns', columnsByType.date], ['Numeric measures', columnsByType.numeric], ['Categories', columnsByType.categorical]].map(([label, cols]) => (
            <div key={label} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
              {cols.length ? cols.map((c) => <p key={c} style={{ fontSize: '0.78rem', color: '#334155', margin: '2px 0' }}>{c}</p>) : <p style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>None detected</p>}
            </div>
          ))}
        </div>

        {understanding.potentialKPIs?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Potential KPIs</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {understanding.potentialKPIs.map((k) => <span key={k} style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: 999, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>{k}</span>)}
            </div>
          </div>
        )}

        <div style={{ background: healthBg, border: `1px solid ${healthColor}33`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Dataset Health</p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: healthColor, background: 'white', padding: '3px 10px', borderRadius: 999, border: `1px solid ${healthColor}` }}>{datasetHealth.health}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: '0.75rem', color: '#475569' }}>
            <div><strong>{datasetHealth.totalRows}</strong> rows</div>
            <div><strong>{datasetHealth.totalColumns}</strong> columns</div>
            <div><strong>{datasetHealth.completeness}%</strong> complete</div>
            <div><strong>{datasetHealth.duplicateRows}</strong> duplicates</div>
            {datasetHealth.missingValues > 0 && <div><strong>{datasetHealth.missingValues}</strong> missing values</div>}
            {datasetHealth.emptyColumns > 0 && <div><strong>{datasetHealth.emptyColumns}</strong> empty columns</div>}
            {datasetHealth.invalidDates > 0 && <div><strong>{datasetHealth.invalidDates}</strong> invalid dates</div>}
            {datasetHealth.possibleOutliers > 0 && <div><strong>{datasetHealth.possibleOutliers}</strong> possible outliers</div>}
          </div>
          {datasetHealth.health !== 'Good' && (
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 10 }}>You can continue, but these issues may affect how confident the final analysis can be.</p>
          )}
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPhase('review')}>← Back</button>
          <button className="btn btn-primary" onClick={() => setPhase('intents')}>Continue →</button>
        </div>
      </div>
    );
  }

  if (phase === 'intents') {
    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What would you like to do?</p>
        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>Select all that apply.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {INTENT_OPTIONS.map((intent) => <button key={intent} style={chipBtn(intents.includes(intent))} onClick={() => toggleIntent(intent)}>{intent}</button>)}
        </div>

        <label style={labelStyle}>Industry context (optional — helps tailor the language)</label>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inputStyle, maxWidth: 300, marginBottom: 20 }}>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPhase('review')}>← Back</button>
          <button className="btn btn-primary" disabled={analyzing || !intents.length} onClick={handleAnalyze}>
            {analyzing ? '✨ Analyzing your data…' : '✨ Analyze'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'report' && analysis) {
    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Data Analysis Report</p>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>{fileName} · {rows.length} rows</p>
          </div>
          <button className="btn btn-ghost" onClick={startOver}>Analyze Different Data</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Charts */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Charts</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {(analysis.suggestedCharts || []).map((chart, i) => chartData[i] && (
                <ChartCanvas key={i} chart={chart} data={chartData[i]} chartRef={{ current: null, set current(v) { chartRefs.current[i] = v; } }} />
              ))}
            </div>
          </div>

          {/* Insights */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>AI Insights</p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, maxHeight: 560, overflowY: 'auto' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Executive Summary</p>
              <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>{analysis.executiveSummary}</p>

              {[['Key Findings', analysis.keyFindings], ['Insights', analysis.insights], ['Trends', analysis.trends], ['Recommendations', analysis.recommendations], ['Risks & Caveats', analysis.risks], ['Data Quality Notes', analysis.qualityWarnings]].map(([title, items]) => items?.length > 0 && (
                <div key={title} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{title}</p>
                  {items.map((item, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 4, display: 'flex', gap: 6, lineHeight: 1.5 }}>
                      <span style={{ color: '#2563EB', flexShrink: 0 }}>•</span>{item}
                    </div>
                  ))}
                </div>
              ))}

              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Conclusion</p>
              <p style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.6 }}>{analysis.conclusion}</p>
            </div>
          </div>
        </div>

        {/* Chat with data */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Ask a question about your data</p>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
            {chatMessages.length > 0 && (
              <div style={{ marginBottom: 12, maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.role === 'user' ? '#2563EB' : 'white', color: m.role === 'user' ? 'white' : '#1E293B', padding: '8px 12px', borderRadius: 10, fontSize: '0.8rem', border: m.role === 'ai' ? '1px solid #E2E8F0' : 'none' }}>
                    {m.text}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="e.g. Which region had the highest revenue?" disabled={chatBusy} />
              <button onClick={handleChatSend} disabled={chatBusy || !chatInput.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: chatBusy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: chatBusy ? 'default' : 'pointer' }}>
                {chatBusy ? '…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>

        {/* Downloads */}
        <div>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Download</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={downloadPDFReport} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'pdf' ? 'Building…' : '📄 PDF Report'}</button>
            <button onClick={downloadWordReport} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'word' ? 'Building…' : '📝 Word Report'}</button>
            {intents.includes('Create PowerPoint presentation') && (
              <button onClick={downloadPresentation} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'pptx' ? 'Building…' : '📊 PowerPoint'}</button>
            )}
            <button onClick={downloadExcel} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>📈 Excel (data)</button>
            <button onClick={downloadCSV} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>⬇ CSV</button>
            <button onClick={downloadChartsPNG} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>🖼 Charts (PNG)</button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 8 }}>Note: the Excel download includes your data only — native embedded Excel charts aren't supported yet.</p>
        </div>

        <p className="privacy-note" style={{ marginTop: 20 }}>Your data is sent securely to our AI engine for analysis only, never stored.</p>
      </div>
    );
  }

  return null;
}
