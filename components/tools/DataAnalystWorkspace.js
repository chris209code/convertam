'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { buildPptxFromOutline } from '@/lib/buildPptxFromOutline';
import { discoverKPIs, computeKpiCards, discoverCharts } from '@/lib/dataAnalysisEngine';

// Superseded by OBJECTIVE_OPTIONS below — the old multi-select "what would
// you like to do" chips have been replaced by single-select objective cards
// per the Milestone 2 spec. As of Milestone 4, the objective is sent to the
// AI directly (via OBJECTIVE_FOCUS-style framing server-side) rather than
// mapped onto the old intents shape — that mapping is no longer needed.

// Objective cards shown after Dataset Understanding. Availability of some
// objectives depends on what the dataset actually supports (checked against
// already-computed stats — no new profiling logic, reusing Milestone 1's).
const OBJECTIVE_OPTIONS = [
  { key: 'Let AI Decide', recommended: true, blurb: 'The AI selects the most useful analysis based on your data.' },
  { key: 'Executive Management Report', blurb: 'Focus on KPIs, risks, major findings and recommendations.' },
  { key: 'Root Cause Analysis', blurb: 'Focus on recurring problems, contributing factors and likely drivers.' },
  { key: 'Performance Comparison', blurb: 'Compare teams, categories, branches, products, departments or other groups.' },
  { key: 'Operational Analysis', blurb: 'Focus on process performance, recurring issues, efficiency and improvement opportunities.' },
  { key: 'Audit / Compliance Report', blurb: 'Focus on gaps, exceptions, missing records, non-compliance and data quality.' },
  { key: 'Trend Analysis', blurb: 'Track how key measures change over time.', requiresDates: true },
  { key: 'Dashboard View', blurb: 'Focus on KPI cards, summary visuals and filterable charts.' },
];

// Maps the new single-select objective back onto the existing multi-select
// intents shape the current /api/data-analyst "analyze" action already
// expects — keeps that endpoint's prompt logic completely unchanged for
// this milestone (deeper objective-aware prompt rework is a later milestone).
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
// Compact, already-computed summary per chart — this is what actually gets
// sent to the AI (never the raw dataset), satisfying "never send the raw
// dataset if deterministic statistics already exist."
function summarizeChartForAI(chart, data) {
  const base = { type: chart.type, title: chart.title, whatItShows: chart.whatItShows, whyItMatters: chart.whyItMatters };
  if (!data) return base;

  if (chart.type === 'pareto') {
    const total = data.values.reduce((a, b) => a + b, 0);
    const contributorsFor80 = data.cumulativePercents.findIndex((p) => p >= 80) + 1;
    return { ...base, topContributors: data.labels.slice(0, 3), topValues: data.values.slice(0, 3), totalCategories: data.labels.length, contributorsFor80Percent: contributorsFor80 || data.labels.length, total: Math.round(total * 100) / 100 };
  }
  if (chart.type === 'heatmap') {
    let max = 0, maxX = '', maxY = '';
    data.grid.forEach((row, yi) => row.forEach((count, xi) => { if (count > max) { max = count; maxX = data.xLabels[xi]; maxY = data.yLabels[yi]; } }));
    return { ...base, highestCombination: { [chart.xColumn]: maxX, [chart.yColumn]: maxY, count: max } };
  }
  if (chart.type === 'scatter') {
    return { ...base, xColumn: chart.xColumn, yColumn: chart.yColumn, pointCount: data.points.length };
  }
  if (chart.type === 'histogram') {
    const maxBinIdx = data.values.indexOf(Math.max(...data.values));
    return { ...base, mostCommonRange: data.labels[maxBinIdx], totalCount: data.values.reduce((a, b) => a + b, 0) };
  }
  if (chart.type === 'line') {
    const first = data.values[0], last = data.values[data.values.length - 1];
    return { ...base, firstValue: first, lastValue: last, direction: last >= first ? 'increased' : 'decreased', min: Math.min(...data.values), max: Math.max(...data.values) };
  }
  // bar / pie
  return { ...base, topCategories: data.labels.slice(0, 5), topValues: data.values.slice(0, 5), totalCategories: data.labels.length };
}

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

  if (type === 'pareto') {
    // Reuse the engine's already-sorted entries rather than recomputing —
    // avoids duplicate work between chart selection and chart rendering.
    const entries = chart._entries || Object.entries(rows.reduce((acc, r) => {
      const key = String(r[xColumn] ?? 'Unknown');
      acc[key] = (acc[key] || 0) + (yColumn ? toNumber(r[yColumn]) || 0 : 1);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    let cumulative = 0;
    const cumulativePercents = entries.map(([, v]) => { cumulative += v; return Math.round((cumulative / total) * 1000) / 10; });
    return { labels: entries.map((e) => e[0]), values: entries.map((e) => Math.round(e[1] * 100) / 100), cumulativePercents };
  }

  if (type === 'heatmap') {
    const xVals = [...new Set(rows.map((r) => String(r[xColumn] ?? 'Unknown')))].slice(0, 10);
    const yVals = [...new Set(rows.map((r) => String(r[yColumn] ?? 'Unknown')))].slice(0, 10);
    const grid = yVals.map((yv) => xVals.map((xv) => rows.filter((r) => String(r[xColumn]) === xv && String(r[yColumn]) === yv).length));
    return { xLabels: xVals, yLabels: yVals, grid };
  }

  // bar / line / pie — reuse engine-provided entries when available, otherwise aggregate here
  let entries = chart._entries;
  if (!entries) {
    const groups = {};
    rows.forEach((r) => {
      const key = String(r[xColumn] ?? 'Unknown');
      const yVal = yColumn ? toNumber(r[yColumn]) : 1;
      if (!groups[key]) groups[key] = 0;
      groups[key] += (yColumn && !isNaN(yVal)) ? yVal : 1;
    });
    entries = Object.entries(groups);
  }
  if (entries.length > 12) {
    entries = [...entries].sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const otherSum = entries.slice(10).reduce((s, [, v]) => s + v, 0);
    entries = [...top, ['Others', otherSum]];
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

    if (chart.type === 'pareto') {
      const n = data.values.length;
      const maxVal = Math.max(...data.values, 1);
      const plotW = W - padding.left - padding.right, plotH = H - padding.top - padding.bottom;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, H - padding.bottom); ctx.lineTo(W - padding.right, H - padding.bottom); ctx.stroke();

      const barWidth = (plotW / n) * 0.65;
      data.values.forEach((v, i) => {
        const x = padding.left + (i / n) * plotW + ((plotW / n) - barWidth) / 2;
        const barH = (v / maxVal) * plotH;
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(x, H - padding.bottom - barH, barWidth, barH);
      });

      // Cumulative percentage line, right-hand scale (0-100%)
      ctx.beginPath();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      data.cumulativePercents.forEach((pct, i) => {
        const x = padding.left + (i / Math.max(n - 1, 1)) * plotW;
        const y = H - padding.bottom - (pct / 100) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      // 80% reference line
      const y80 = H - padding.bottom - 0.8 * plotH;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath(); ctx.moveTo(padding.left, y80); ctx.lineTo(W - padding.right, y80); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('80%', W - padding.right + 2, y80 + 3);

      ctx.fillStyle = '#475569';
      ctx.font = '10px Inter, sans-serif';
      data.labels.forEach((label, i) => {
        const x = padding.left + (i / n) * plotW + (plotW / n) / 2;
        const short = String(label).length > 10 ? String(label).slice(0, 9) + '…' : label;
        ctx.save();
        ctx.translate(x, H - padding.bottom + 14);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'right';
        ctx.fillText(short, 0, 0);
        ctx.restore();
      });
      return;
    }

    if (chart.type === 'heatmap') {
      const { xLabels, yLabels, grid } = data;
      const cellW = (W - padding.left - 10) / xLabels.length;
      const cellH = (H - padding.top - padding.bottom) / yLabels.length;
      const maxCount = Math.max(...grid.flat(), 1);
      grid.forEach((row, yi) => {
        row.forEach((count, xi) => {
          const intensity = count / maxCount;
          const x = padding.left + xi * cellW, y = padding.top + yi * cellH;
          ctx.fillStyle = `rgba(37, 99, 235, ${0.08 + intensity * 0.82})`;
          ctx.fillRect(x, y, cellW - 2, cellH - 2);
          if (count > 0) {
            ctx.fillStyle = intensity > 0.5 ? '#fff' : '#1E293B';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + cellW / 2, y + cellH / 2 + 3);
          }
        });
      });
      ctx.fillStyle = '#475569';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      xLabels.forEach((label, xi) => {
        const short = String(label).length > 8 ? String(label).slice(0, 7) + '…' : label;
        ctx.fillText(short, padding.left + xi * cellW + cellW / 2, H - padding.bottom + 12);
      });
      ctx.textAlign = 'right';
      yLabels.forEach((label, yi) => {
        const short = String(label).length > 8 ? String(label).slice(0, 7) + '…' : label;
        ctx.fillText(short, padding.left - 6, padding.top + yi * cellH + cellH / 2 + 3);
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
      {(chart.whatItShows || chart.whyItMatters) && (
        <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: 8, lineHeight: 1.4 }}>{chart.whatItShows} {chart.whyItMatters}</p>
      )}
      {chart.whySelected && <p style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 4, fontStyle: 'italic' }}>{chart.whySelected}</p>}
    </div>
  );
}

function KpiCard({ kpi }) {
  const displayValue = kpi.unit === '%' ? `${kpi.value}%` : kpi.unit ? `${kpi.unit}${kpi.value.toLocaleString()}` : kpi.value.toLocaleString();
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{kpi.name}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{displayValue}</p>
      <p style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: kpi.comparison ? 6 : 0 }}>{kpi.interpretation}</p>
      {kpi.comparison && (
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: kpi.comparison.goodDirection ? '#059669' : '#DC2626' }}>
          {kpi.comparison.direction === 'up' ? '▲' : '▼'} {kpi.comparison.pctChange}% vs. earlier period
        </p>
      )}
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

  const [objective, setObjective] = useState('Let AI Decide');

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chartData, setChartData] = useState({});
  const [kpiCards, setKpiCards] = useState([]);
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
      if (!res.ok) throw new Error(data.error || 'understanding_failed');
      setUnderstanding(data);
    } catch (err) {
      // Fall back to deterministic profiling only — the workflow keeps
      // going, it just can't offer an inferred business-context guess.
      setUnderstanding({
        datasetType: 'Uploaded Dataset', industry: '', businessProcess: '', description: '',
        potentialKPIs: [], confidence: null, clarifyingQuestion: '', fallback: true,
      });
    } finally {
      setPhase('understanding');
      setUnderstandBusy(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    try {
      const stats = computeStats(columns, rows);
      const qualityWarnings = computeQualityWarnings(columns, rows, stats);
      const health = datasetHealth || computeDatasetHealth(columns, rows, stats);

      // Everything the engine can determine is computed here, client-side,
      // BEFORE the AI is ever called — the AI only ever receives the
      // finished numbers, never the raw dataset.
      const { kpis } = discoverKPIs(columns, stats, understanding);
      const cards = computeKpiCards(kpis, columns, rows, stats);
      setKpiCards(cards);

      const engineCharts = discoverCharts(columns, stats, rows, objective);
      const prepared = {};
      engineCharts.forEach((chart, i) => {
        const cd = prepareChartData(chart, rows, stats);
        if (cd) prepared[i] = cd;
      });
      setChartData(prepared);

      const chartSummaries = engineCharts.map((chart, i) => summarizeChartForAI(chart, prepared[i]));

      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          understanding, objective, health, kpis: cards, chartSummaries,
          columns, stats, qualityWarnings, rowCount: rows.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not analyze this data.');
      data.qualityWarnings = qualityWarnings;
      data.stats = stats;
      data.suggestedCharts = engineCharts;
      setAnalysis(data);
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

      if (kpiCards.length) {
        heading('KPI Highlights');
        kpiCards.forEach((kpi) => {
          const displayValue = kpi.unit === '%' ? `${kpi.value}%` : kpi.unit ? `${kpi.unit}${kpi.value.toLocaleString()}` : kpi.value.toLocaleString();
          checkY(16);
          page.drawText(`${kpi.name}: ${displayValue}`, { x: margin, y, size: 11, font: bold, color: rgb(0.06, 0.09, 0.16) }); y -= 16;
        });
        y -= 8;
      }

      // Embed actual chart images — not just paragraphs describing them.
      const chartEntries = Object.entries(chartRefs.current).filter(([, canvas]) => canvas);
      if (chartEntries.length) {
        heading('Charts');
        for (const [i, canvas] of chartEntries) {
          const chart = analysis.suggestedCharts?.[i];
          if (!chart) continue;
          checkY(200);
          const pngDataUrl = canvas.toDataURL('image/png');
          const pngBytes = await (await fetch(pngDataUrl)).arrayBuffer();
          const embeddedImg = await pdfDoc.embedPng(pngBytes);
          const imgW = 400, imgH = (imgW / canvas.width) * canvas.height;
          checkY(imgH + 30);
          page.drawText(chart.title, { x: margin, y, size: 11, font: bold, color: rgb(0.06, 0.09, 0.16) }); y -= 16;
          page.drawImage(embeddedImg, { x: margin, y: y - imgH, width: imgW, height: imgH });
          y -= imgH + 10;
          if (chart.whatItShows) { wrapText(`${chart.whatItShows} ${chart.whyItMatters || ''}`, 9, font); }
          y -= 10;
        }
      }

      if (analysis.confidenceStatement) {
        heading('Confidence in Findings');
        wrapText(`${analysis.confidenceStatement.level} — ${analysis.confidenceStatement.reasoning}`, 11, font); y -= 8;
      }
      if (analysis.keyFindings?.length) {
        heading('Key Findings');
        analysis.keyFindings.forEach((f) => {
          wrapText(`Finding: ${f.finding}`, 11, bold);
          wrapText(`Evidence: ${f.evidence}`, 10, font);
          wrapText(`Business implication: ${f.businessImplication}`, 10, font);
          y -= 6;
        });
        y -= 4;
      }
      if (analysis.rootCauseObservations?.length) { heading('Root Cause Observations'); bulletList(analysis.rootCauseObservations); y -= 8; }
      if (analysis.risks?.length) {
        heading('Risks');
        analysis.risks.forEach((r) => { wrapText(`[${r.category}] ${r.description} (Likelihood: ${r.likelihood}, Impact: ${r.impact})`, 10, font); });
        y -= 8;
      }
      if (analysis.opportunities?.length) {
        heading('Opportunities');
        analysis.opportunities.forEach((o) => { wrapText(`[${o.priority}] ${o.description} — ${o.whyItMatters}`, 10, font); });
        y -= 8;
      }
      if (analysis.recommendations?.length) {
        heading('Recommendations');
        analysis.recommendations.forEach((r) => {
          wrapText(`Recommendation: ${r.recommendation}`, 11, bold);
          wrapText(`Evidence: ${r.evidence} | Impact: ${r.impact} | Effort: ${r.effort} | Priority: ${r.priority} | Owner: ${r.owner}`, 10, font);
          y -= 6;
        });
        y -= 4;
      }
      if (analysis.actionPlan?.length) {
        heading('Action Plan');
        analysis.actionPlan.forEach((a) => { wrapText(`[${a.priority}] ${a.action} — Owner: ${a.owner}, Timeline: ${a.timeline}, Success: ${a.successMeasure}`, 10, font); });
        y -= 8;
      }
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

      if (analysis.confidenceStatement) {
        sections.push(new Paragraph({ text: 'Confidence in Findings', heading: HeadingLevel.HEADING_1 }));
        sections.push(new Paragraph({ text: `${analysis.confidenceStatement.level} — ${analysis.confidenceStatement.reasoning}` }));
      }

      if (analysis.keyFindings?.length) {
        sections.push(new Paragraph({ text: 'Key Findings', heading: HeadingLevel.HEADING_1 }));
        analysis.keyFindings.forEach((f) => {
          sections.push(new Paragraph({ children: [new TextRun({ text: f.finding, bold: true })] }));
          sections.push(new Paragraph({ text: `Evidence: ${f.evidence}` }));
          sections.push(new Paragraph({ text: `Business implication: ${f.businessImplication}` }));
        });
      }

      addBulletSection('Root Cause Observations', analysis.rootCauseObservations);

      if (analysis.risks?.length) {
        sections.push(new Paragraph({ text: 'Risks', heading: HeadingLevel.HEADING_1 }));
        analysis.risks.forEach((r) => sections.push(new Paragraph({ text: `[${r.category}] ${r.description} (Likelihood: ${r.likelihood}, Impact: ${r.impact}) — Evidence: ${r.evidence}` })));
      }

      if (analysis.opportunities?.length) {
        sections.push(new Paragraph({ text: 'Opportunities', heading: HeadingLevel.HEADING_1 }));
        analysis.opportunities.forEach((o) => sections.push(new Paragraph({ text: `[${o.priority}] ${o.description} — ${o.whyItMatters}` })));
      }

      if (analysis.recommendations?.length) {
        sections.push(new Paragraph({ text: 'Recommendations', heading: HeadingLevel.HEADING_1 }));
        analysis.recommendations.forEach((r) => {
          sections.push(new Paragraph({ children: [new TextRun({ text: r.recommendation, bold: true })] }));
          sections.push(new Paragraph({ text: `Evidence: ${r.evidence} | Impact: ${r.impact} | Effort: ${r.effort} | Priority: ${r.priority} | Owner: ${r.owner}` }));
        });
      }

      if (analysis.actionPlan?.length) {
        sections.push(new Paragraph({ text: 'Action Plan', heading: HeadingLevel.HEADING_1 }));
        analysis.actionPlan.forEach((a) => sections.push(new Paragraph({ text: `[${a.priority}] ${a.action} — Owner: ${a.owner}, Timeline: ${a.timeline}, Success: ${a.successMeasure}` })));
      }

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
      const chartSlides = Object.entries(chartRefs.current)
        .filter(([, canvas]) => canvas)
        .map(([i, canvas]) => {
          const chart = analysis.suggestedCharts?.[i];
          if (!chart) return null;
          return {
            type: 'chart', title: chart.title, imageDataUrl: canvas.toDataURL('image/png'),
            caption: `${chart.whatItShows || ''} ${chart.whyItMatters || ''}`.trim(),
          };
        }).filter(Boolean);

      const outline = {
        title: 'Data Analysis',
        subtitle: analysis.executiveSummary,
        slides: [
          { type: 'title', title: 'Data Analysis', subtitle: analysis.executiveSummary },
          kpiCards.length && {
            type: 'content', title: 'KPI Highlights',
            bullets: kpiCards.map((k) => `${k.name}: ${k.unit === '%' ? `${k.value}%` : k.unit ? `${k.unit}${k.value.toLocaleString()}` : k.value.toLocaleString()}`),
          },
          ...chartSlides,
          analysis.keyFindings?.length && {
            type: 'content', title: 'Key Findings',
            bullets: analysis.keyFindings.map((f) => `${f.finding} (${f.evidence}) → ${f.businessImplication}`),
          },
          analysis.rootCauseObservations?.length && { type: 'content', title: 'Root Cause Observations', bullets: analysis.rootCauseObservations },
          analysis.risks?.length && {
            type: 'content', title: 'Risks',
            bullets: analysis.risks.map((r) => `[${r.category}] ${r.description} — Likelihood: ${r.likelihood}, Impact: ${r.impact}`),
          },
          analysis.opportunities?.length && {
            type: 'content', title: 'Opportunities',
            bullets: analysis.opportunities.map((o) => `[${o.priority}] ${o.description}`),
          },
          analysis.recommendations?.length && {
            type: 'content', title: 'Recommendations',
            bullets: analysis.recommendations.map((r) => `${r.recommendation} — Impact: ${r.impact}, Effort: ${r.effort}, Priority: ${r.priority}, Owner: ${r.owner}`),
          },
          analysis.actionPlan?.length && {
            type: 'content', title: 'Action Plan',
            bullets: analysis.actionPlan.map((a) => `[${a.priority}] ${a.action} — ${a.owner}, ${a.timeline}`),
          },
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
    setObjective('Let AI Decide'); setKpiCards([]);
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

    const confidenceLabel = understanding.confidence == null ? 'Confidence unavailable'
      : understanding.confidence >= 80 ? 'High confidence'
      : understanding.confidence >= 60 ? 'Medium confidence'
      : 'Low confidence';
    const confidenceColor = understanding.confidence == null ? '#94A3B8'
      : understanding.confidence >= 80 ? '#059669'
      : understanding.confidence >= 60 ? '#D97706'
      : '#DC2626';

    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Dataset Understanding</p>

        {understanding.fallback && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: '0.8rem', color: '#92400E', margin: 0 }}>We could not fully identify the business context, but you can describe the dataset below.</p>
          </div>
        )}

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          {!understanding.fallback && (
            <>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Dataset identified as</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>{understanding.datasetType}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Likely industry</p>
                  <input style={inputStyle} value={understanding.industry} onChange={(e) => setUnderstanding((u) => ({ ...u, industry: e.target.value }))} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Business process</p>
                  <input style={inputStyle} value={understanding.businessProcess} onChange={(e) => setUnderstanding((u) => ({ ...u, businessProcess: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Confidence</p>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: confidenceColor }}>{confidenceLabel}{understanding.confidence != null ? ` (${understanding.confidence}%)` : ''}</span>
              </div>
            </>
          )}

          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Describe this dataset in your own words</p>
          <input
            style={{ ...inputStyle, marginBottom: 4 }}
            value={understanding.description}
            onChange={(e) => setUnderstanding((u) => ({ ...u, description: e.target.value }))}
            placeholder="e.g. Weekly sales figures by region and product line"
          />
          <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Not quite right? Correct any of the fields above before continuing — nothing needs to be rewritten from scratch.</p>
        </div>

        {!understanding.fallback && understanding.confidence != null && understanding.confidence < 70 && understanding.clarifyingQuestion && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>{understanding.clarifyingQuestion}</p>
            <input style={inputStyle} value={clarifyingAnswer} onChange={(e) => setClarifyingAnswer(e.target.value)} placeholder="Your answer helps improve the analysis (optional)" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[['Date columns', columnsByType.date], ['Numeric measures', columnsByType.numeric], ['Categories', columnsByType.categorical]].map(([label, cols]) => (
            <div key={label} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {cols.length ? cols.map((c) => <span key={c} style={{ fontSize: '0.72rem', color: '#334155', background: '#F1F5F9', padding: '2px 8px', borderRadius: 999 }}>{c}</span>) : <p style={{ fontSize: '0.78rem', color: '#CBD5E1', margin: 0 }}>None detected</p>}
              </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, fontSize: '0.75rem', color: '#475569' }}>
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
    const hasDateColumns = columns.some((c) => computeStats(columns, rows)[c]?.type === 'date');
    const hasCategoricalColumns = columns.some((c) => computeStats(columns, rows)[c]?.type === 'categorical');

    function isDisabled(opt) {
      return opt.requiresDates && !hasDateColumns;
    }
    function helperText(opt) {
      if (opt.requiresDates && !hasDateColumns) return 'A valid date or sequential field is required.';
      if (opt.key === 'Root Cause Analysis' && !hasCategoricalColumns) return 'This dataset may not have enough categorical detail for a strong root-cause analysis.';
      return '';
    }

    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>What would you like to achieve with this data?</p>
        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 16 }}>Pick one — "Let AI Decide" works well if you're not sure.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
          {OBJECTIVE_OPTIONS.map((opt) => {
            const disabled = isDisabled(opt);
            const helper = helperText(opt);
            const selected = objective === opt.key;
            return (
              <button
                key={opt.key}
                disabled={disabled}
                onClick={() => setObjective(opt.key)}
                style={{
                  textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  border: selected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                  background: disabled ? '#F8FAFC' : selected ? '#EFF6FF' : 'white',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: selected ? '#1D4ED8' : '#0F172A' }}>{opt.key}</span>
                  {opt.recommended && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 999 }}>RECOMMENDED</span>}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>{opt.blurb}</p>
                {helper && <p style={{ fontSize: '0.7rem', color: disabled ? '#94A3B8' : '#D97706', margin: '6px 0 0' }}>{helper}</p>}
              </button>
            );
          })}
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPhase('understanding')}>← Back</button>
          <button className="btn btn-primary" disabled={analyzing} onClick={handleAnalyze}>
            {analyzing ? '✨ Analyzing your data…' : 'Continue to Analysis →'}
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

        {kpiCards.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>KPI Highlights</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {kpiCards.map((kpi) => <KpiCard key={kpi.name} kpi={kpi} />)}
            </div>
          </div>
        )}

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
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Executive Intelligence</p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, maxHeight: 700, overflowY: 'auto' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Executive Summary</p>
              <p style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>{analysis.executiveSummary}</p>

              {analysis.confidenceStatement && (
                <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: analysis.confidenceStatement.level === 'High' ? '#ECFDF5' : analysis.confidenceStatement.level === 'Medium' ? '#FFFBEB' : '#FEF2F2' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: analysis.confidenceStatement.level === 'High' ? '#059669' : analysis.confidenceStatement.level === 'Medium' ? '#D97706' : '#DC2626', marginBottom: 2 }}>Confidence in Findings: {analysis.confidenceStatement.level}</p>
                  <p style={{ fontSize: '0.76rem', color: '#475569', margin: 0 }}>{analysis.confidenceStatement.reasoning}</p>
                </div>
              )}

              {analysis.keyFindings?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Key Findings</p>
                  {analysis.keyFindings.map((f, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: '2px solid #BFDBFE' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{f.finding}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0' }}>Evidence: {f.evidence}</p>
                      <p style={{ fontSize: '0.75rem', color: '#059669', margin: 0 }}>→ {f.businessImplication}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.rootCauseObservations?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Root Cause Observations</p>
                  {analysis.rootCauseObservations.map((o, i) => <p key={i} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 4, lineHeight: 1.5 }}>• {o}</p>)}
                </div>
              )}

              {analysis.risks?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Risks</p>
                  {analysis.risks.map((r, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>[{r.category}] </span>
                      <span style={{ color: '#374151' }}>{r.description}</span>
                      <span style={{ color: '#94A3B8' }}> — Likelihood: {r.likelihood}, Impact: {r.impact}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.opportunities?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Opportunities</p>
                  {analysis.opportunities.map((o, i) => (
                    <div key={i} style={{ marginBottom: 6, fontSize: '0.78rem', color: '#374151' }}>
                      <span style={{ fontWeight: 700, color: o.priority === 'High' ? '#059669' : o.priority === 'Medium' ? '#D97706' : '#94A3B8' }}>[{o.priority}] </span>
                      {o.description} — {o.whyItMatters}
                    </div>
                  ))}
                </div>
              )}

              {analysis.recommendations?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Recommendations</p>
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: '2px solid #DDD6FE' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{r.recommendation}</p>
                      <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0' }}>Evidence: {r.evidence}</p>
                      <p style={{ fontSize: '0.74rem', color: '#7C3AED', margin: 0 }}>Impact: {r.impact} · Effort: {r.effort} · Priority: {r.priority} · Owner: {r.owner}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.actionPlan?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Action Plan</p>
                  {analysis.actionPlan.map((a, i) => (
                    <div key={i} style={{ marginBottom: 6, fontSize: '0.76rem', color: '#374151' }}>
                      <strong>[{a.priority}]</strong> {a.action} — Owner: {a.owner}, Timeline: {a.timeline}, Success: {a.successMeasure}
                    </div>
                  ))}
                </div>
              )}

              {analysis.qualityWarnings?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Data Quality Notes</p>
                  {analysis.qualityWarnings.map((w, i) => <p key={i} style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 4 }}>• {w}</p>)}
                </div>
              )}

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
            <button onClick={downloadPresentation} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'pptx' ? 'Building…' : '📊 PowerPoint'}</button>
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
