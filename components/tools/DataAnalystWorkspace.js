'use client';

import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import { buildPptxFromOutline } from '@/lib/buildPptxFromOutline';
import { discoverKPIs, computeKpiCards, discoverCharts } from '@/lib/dataAnalysisEngine';
import { parsePastedTable, validateParsedTable } from '@/lib/tableParser';

// Superseded by OBJECTIVE_OPTIONS below — the old multi-select "what would
// you like to do" chips have been replaced by single-select objective cards
// per the Milestone 2 spec. As of Milestone 4, the objective is sent to the
// AI directly (via OBJECTIVE_FOCUS-style framing server-side) rather than
// mapped onto the old intents shape — that mapping is no longer needed.

// Objective cards shown after Dataset Understanding. Availability of some
// objectives depends on what the dataset actually supports (checked against
// already-computed stats — no new profiling logic, reusing Milestone 1's).
const OBJECTIVE_OPTIONS = [
  // General
  { key: 'Let AI Decide', group: 'General', recommended: true, blurb: 'The AI selects the most useful analysis based on your data.' },
  { key: 'Executive Management Report', group: 'General', blurb: 'Focus on KPIs, risks, major findings and recommendations.' },
  { key: 'Trend Analysis', group: 'General', blurb: 'Track how key measures change over time.', requiresDates: true },
  { key: 'Dashboard View', group: 'General', blurb: 'Focus on KPI cards, summary visuals and filterable charts.' },
  // Business Focus
  { key: 'Financial Performance', group: 'Business Focus', blurb: 'Focus on revenue, margins, profitability, cost and cash-related metrics.' },
  { key: 'Operational Analysis', group: 'Business Focus', blurb: 'Focus on process performance, recurring issues, efficiency and improvement opportunities.' },
  { key: 'Performance Comparison', group: 'Business Focus', blurb: 'Compare teams, categories, branches, products, departments or other groups.' },
  { key: 'Customer Insights', group: 'Business Focus', blurb: 'Focus on customer satisfaction, returns, retention and growth.' },
  { key: 'Risk Assessment', group: 'Business Focus', blurb: 'Focus on anomalies, operational risks, financial risks and quality issues.' },
  { key: 'Growth Opportunities', group: 'Business Focus', blurb: 'Focus on where the data points to expansion, upside, or untapped potential.' },
  // Deep Analysis
  { key: 'Root Cause Analysis', group: 'Deep Analysis', blurb: 'Focus on recurring problems, contributing factors and likely drivers.' },
  { key: 'Audit / Compliance Report', group: 'Deep Analysis', blurb: 'Focus on gaps, exceptions, missing records, non-compliance and data quality.' },
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
function ChartCanvas({ chart, data, chartRef, width = 380, height = 240, hideChrome = false }) {
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
  }, [chart, data, width, height]);

  return hideChrome ? (
    <canvas ref={(el) => { canvasRef.current = el; if (chartRef) chartRef.current = el; }} width={width} height={height} style={{ width: '100%', height: 'auto', maxWidth: width }} />
  ) : (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{chart.title}</p>
      <canvas ref={(el) => { canvasRef.current = el; if (chartRef) chartRef.current = el; }} width={width} height={height} style={{ width: '100%', height: 'auto', maxWidth: width }} />
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
  const [chatEnabled, setChatEnabled] = useState(false); // authoritative value always comes from the server
  const [usageInfo, setUsageInfo] = useState(null); // { isOwner, remaining, limit, resetInMs }
  const [parsingConfidence, setParsingConfidence] = useState(null);
  const [cooldown, setCooldown] = useState(null); // { seconds, action } - disables the relevant button and counts down
  const [aiNarrativeUnavailable, setAiNarrativeUnavailable] = useState(false);
  const analysisCacheRef = useRef({}); // key -> analysis result, avoids re-calling Gemini for unchanged dataset+objective+context
  const lastAnalysisInputsRef = useRef(null); // stores deterministic engine outputs so a narrative-only retry never re-runs parsing/stats/chart-selection
  const understandingCacheRef = useRef({ key: null, result: null });
  const [chatQuestionCount, setChatQuestionCount] = useState(0);
  const CHAT_QUESTION_LIMIT = 20;

  const [understanding, setUnderstanding] = useState(null);
  const [datasetHealth, setDatasetHealth] = useState(null);
  const [understandBusy, setUnderstandBusy] = useState(false);
  const [clarifyingAnswer, setClarifyingAnswer] = useState('');

  const [objective, setObjective] = useState('Let AI Decide');

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chartData, setChartData] = useState({});
  const [kpiCards, setKpiCards] = useState([]);
  const [omittedKpis, setOmittedKpis] = useState([]);
  const chartRefs = useRef({});

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatRole, setChatRole] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const presentationContainerRef = useRef(null);
  const [downloading, setDownloading] = useState('');
  const [presentationMode, setPresentationMode] = useState(false);
  const [fullscreenChartIdx, setFullscreenChartIdx] = useState(null);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setPresentationMode(false);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    fetch('/api/data-analyst', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'usageStatus' }),
    }).then((r) => r.json()).then((d) => {
      setChatEnabled(!!d.chatEnabled);
      setUsageInfo(d);
    }).catch(() => {});
  }, []);

  // Counts down a rate-limit cooldown once per second, clearing it (and
  // re-enabling whatever button it was blocking) when it reaches zero.
  useEffect(() => {
    if (!cooldown || cooldown.seconds <= 0) return;
    const id = setTimeout(() => {
      setCooldown((c) => (c && c.seconds > 1 ? { ...c, seconds: c.seconds - 1 } : null));
    }, 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function startCooldown(action, seconds) {
    setCooldown({ action, seconds: Math.max(1, Math.round(seconds || 30)) });
  }

  useEffect(() => {
    if (!presentationMode) return;
    function onKeyDown(e) {
      const el = presentationContainerRef.current;
      if (!el) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        el.scrollBy({ top: el.clientHeight * 0.92, behavior: 'smooth' });
      } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        el.scrollBy({ top: -el.clientHeight * 0.92, behavior: 'smooth' });
      } else if (e.key === 'Escape') {
        setPresentationMode(false);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [presentationMode]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    setFileName(file.name);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let cols, dataRows, rawConsistencyRatio = 1; // Excel/Gemini-extracted sources don't have a raw pre-normalization signal, so they default to full trust on that dimension — their underlying parser is already reliable

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'tsv') {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        if (!aoa.length) throw new Error('Empty file');
        cols = aoa[0].map((c) => String(c || '').trim() || 'Column');
        const rawLengths = aoa.slice(1).map((r) => r.length);
        rawConsistencyRatio = rawLengths.length ? rawLengths.filter((l) => l === cols.length).length / rawLengths.length : 1;
        dataRows = aoa.slice(1).map((r) => {
          const obj = {};
          cols.forEach((c, i) => { obj[c] = r[i] !== undefined ? String(r[i]) : ''; });
          return obj;
        }).filter((r) => Object.values(r).some((v) => v !== ''));
      } else if (file.type.startsWith('image/')) {
        if (!window.pdfjsLib && ext === 'pdf') throw new Error('pdf-lib-not-ready');
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch('/api/data-analyst', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extractFromImage', images: [{ mimeType: file.type, data: dataUrl.split(',')[1] }] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not read this image.');
        cols = data.columns || [];
        dataRows = (data.rows || []).map((r) => { const o = {}; cols.forEach((c) => { o[c] = String(r[c] ?? ''); }); return o; });
      } else if (ext === 'pdf') {
        if (!window.pdfjsLib) throw new Error('Still loading — please wait a moment and try again.');
        const text = await extractPdfText(file);
        const res = await fetch('/api/data-analyst', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extractFromPdfText', text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not read this PDF.');
        cols = data.columns || [];
        dataRows = (data.rows || []).map((r) => { const o = {}; cols.forEach((c) => { o[c] = String(r[c] ?? ''); }); return o; });
      } else {
        throw new Error('Unsupported file type.');
      }

      // Same validation standard applied regardless of source — a
      // low-confidence parse stops here rather than silently feeding a
      // wrong schema into analysis.
      const validation = validateParsedTable(cols, dataRows, rawConsistencyRatio);
      setParsingConfidence(validation);
      if (validation.rejected) {
        setError(validation.message);
        return;
      }

      setColumns(cols);
      setRows(dataRows);
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
    setError('');
    const { columns: cols, rows: dataRows, rawConsistencyRatio, skippedTitleRows, headerCountMismatch } = parsePastedTable(pasteText);
    const validation = validateParsedTable(cols, dataRows, rawConsistencyRatio, headerCountMismatch);
    setParsingConfidence(validation);
    if (validation.rejected) {
      setError(validation.message);
      return; // do not proceed into analysis on a low-confidence parse
    }
    setColumns(cols);
    setRows(dataRows);
    setFileName(skippedTitleRows > 0 ? 'Pasted data (title row detected and skipped)' : 'Pasted data');
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

      // Reuse a previous result for the exact same dataset content — going
      // back to review and forward again without changing anything should
      // never re-call Gemini.
      const cacheKey = JSON.stringify({ columns, rowCount: rows.length, sample: rows.slice(0, 3) });
      if (understandingCacheRef.current.key === cacheKey && understandingCacheRef.current.result) {
        setUnderstanding(understandingCacheRef.current.result);
        setPhase('understanding');
        return;
      }

      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'understand', columns, stats, sampleRows: rows, rowCount: rows.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'understanding_failed');
      understandingCacheRef.current = { key: cacheKey, result: data };
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

  function buildAnalysisCacheKey() {
    return JSON.stringify({ cols: columns, objective, desc: understanding?.description, industry: understanding?.industry, rowCount: rows.length });
  }

  function buildFallbackAnalysis(qualityWarnings, stats, engineCharts) {
    return {
      executiveSummary: '', keyFindings: [], rootCauseObservations: [], risks: [], opportunities: [],
      recommendations: [], actionPlan: [], confidenceStatement: null, conclusion: '',
      qualityWarnings, stats, suggestedCharts: engineCharts,
    };
  }

  async function handleAnalyze() {
    if (cooldown?.action === 'analyze') return; // button should already be disabled, but never send during an active cooldown regardless
    setAnalyzing(true);
    setError('');
    setAiNarrativeUnavailable(false);
    try {
      const stats = computeStats(columns, rows);
      const qualityWarnings = computeQualityWarnings(columns, rows, stats);
      const health = datasetHealth || computeDatasetHealth(columns, rows, stats);

      // Everything the engine can determine is computed here, client-side,
      // BEFORE the AI is ever called — the AI only ever receives the
      // finished numbers, never the raw dataset.
      const { kpis } = discoverKPIs(columns, stats, understanding);
      const { cards, omitted } = computeKpiCards(kpis, columns, rows, stats);
      setKpiCards(cards);
      setOmittedKpis(omitted);

      const engineCharts = discoverCharts(columns, stats, rows, objective);
      const prepared = {};
      engineCharts.forEach((chart, i) => {
        const cd = prepareChartData(chart, rows, stats);
        if (cd) prepared[i] = cd;
      });
      setChartData(prepared);

      const chartSummaries = engineCharts.map((chart, i) => summarizeChartForAI(chart, prepared[i]));
      lastAnalysisInputsRef.current = { stats, qualityWarnings, health, cards, chartSummaries, engineCharts };

      // Reuse a previous successful result for the exact same dataset +
      // objective + context — never re-call Gemini just because the user
      // navigated back and forward or clicked through again.
      const cacheKey = buildAnalysisCacheKey();
      if (analysisCacheRef.current[cacheKey]) {
        setAnalysis(analysisCacheRef.current[cacheKey]);
        setPhase('report');
        return;
      }

      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          understanding, objective, health, kpis: cards, chartSummaries,
          columns, stats, qualityWarnings, rowCount: rows.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.category === 'usage_limit_reached') {
          setUsageInfo((u) => ({ ...(u || {}), remaining: 0, resetInMs: data.resetInMs }));
          throw new Error(data.error || 'No AI reports remaining today.');
        }
        if (data.category === 'rate_limit' || data.category === 'quota_exhausted') {
          // The report is never made fully unusable just because the AI
          // narrative call is rate-limited — everything the deterministic
          // engine already computed (KPIs, charts, stats) still renders.
          startCooldown('analyze', data.retryAfterSeconds);
          setAiNarrativeUnavailable(true);
          data.qualityWarnings = qualityWarnings;
          data.stats = stats;
          setAnalysis(buildFallbackAnalysis(qualityWarnings, stats, engineCharts));
          setPhase('report');
          return;
        }
        throw new Error(data.error || 'Could not analyze this data.');
      }
      if (typeof data.usageRemaining === 'number') setUsageInfo((u) => ({ ...(u || {}), remaining: data.usageRemaining }));
      data.qualityWarnings = qualityWarnings;
      data.stats = stats;
      data.suggestedCharts = engineCharts;
      analysisCacheRef.current[cacheKey] = data;
      setAnalysis(data);
      setPhase('report');
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // Retries ONLY the AI narrative call, reusing everything the deterministic
  // engine already computed — never re-runs parsing, stats, KPI discovery,
  // or chart selection just to get a second try at the narrative.
  async function generateAiNarrativeOnly() {
    if (cooldown?.action === 'analyze' || !lastAnalysisInputsRef.current) return;
    setAnalyzing(true);
    setError('');
    try {
      const { stats, qualityWarnings, health, cards, chartSummaries, engineCharts } = lastAnalysisInputsRef.current;
      const cacheKey = buildAnalysisCacheKey();
      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', understanding, objective, health, kpis: cards, chartSummaries, columns, stats, qualityWarnings, rowCount: rows.length }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.category === 'usage_limit_reached') {
          setUsageInfo((u) => ({ ...(u || {}), remaining: 0, resetInMs: data.resetInMs }));
          throw new Error(data.error || 'No AI reports remaining today.');
        }
        if (data.category === 'rate_limit' || data.category === 'quota_exhausted') {
          startCooldown('analyze', data.retryAfterSeconds);
          return;
        }
        throw new Error(data.error || 'Could not generate the AI narrative.');
      }
      if (typeof data.usageRemaining === 'number') setUsageInfo((u) => ({ ...(u || {}), remaining: data.usageRemaining }));
      data.qualityWarnings = qualityWarnings;
      data.stats = stats;
      data.suggestedCharts = engineCharts;
      analysisCacheRef.current[cacheKey] = data;
      setAnalysis(data);
      setAiNarrativeUnavailable(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleChatSend(overrideQuestion, transformType) {
    if (chatBusy) return; // prevents a rapid double-click/double-Enter from firing two concurrent requests
    if (cooldown?.action === 'chat') return; // never send during an active rate-limit cooldown
    const question = (overrideQuestion ?? chatInput).trim();
    if (!question) return;
    if (chatQuestionCount >= CHAT_QUESTION_LIMIT) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: `You've reached this session's limit of ${CHAT_QUESTION_LIMIT} questions. Start a new analysis to continue asking questions.` }]);
      return;
    }
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatBusy(true);
    setChatQuestionCount((n) => n + 1);
    try {
      const res = await fetch('/api/data-analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat', question,
          history: chatMessages.slice(-10),
          understanding, objective, health: datasetHealth, kpis: kpiCards, analysis,
          chartSummaries: (analysis.suggestedCharts || []).map((chart, i) => summarizeChartForAI(chart, chartData[i])),
          role: chatRole || undefined, transformType: transformType || undefined,
          columns, stats: analysis.stats, sampleRows: rows, rowCount: rows.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.category === 'rate_limit' || data.category === 'quota_exhausted') {
          startCooldown('chat', data.retryAfterSeconds);
          setChatMessages((prev) => [...prev, { role: 'ai', text: data.error }]); // conversation is preserved, not cleared, even when rate-limited
          return;
        }
        throw new Error(data.error || 'Could not answer that.');
      }
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: `Sorry — ${err.message}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function downloadChatAsMarkdown() {
    const md = chatMessages.map((m) => `**${m.role === 'user' ? 'You' : 'Analyst'}:** ${m.text}`).join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analyst-conversation.md'; a.click();
    URL.revokeObjectURL(url);
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
        checkY(34); y -= 10;
        page.drawText(text, { x: margin, y, size: 14, font: bold, color: blue }); y -= 6;
        page.drawRectangle({ x: margin, y, width: 40, height: 2.5, color: blue }); y -= 16;
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

      // Subtle branding on every page — professional, not intrusive.
      pdfDoc.getPages().forEach((p) => {
        p.drawText('Generated by Convertam AI Business Analyst', { x: 50, y: 20, size: 8, font, color: rgb(0.6, 0.64, 0.68) });
      });

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
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Generated by Convertam AI Business Analyst', italics: true, size: 16, color: '9CA3AF' })], spacing: { before: 400 } }));

      const doc = new Document({ sections: [{ children: sections }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'data-analysis-report.docx'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  // Executive PowerPoint generator — genuinely redesigned per Milestone 6,
  // not the generic outline builder. This flow has slide types (KPI
  // dashboard, risk/recommendation cards, action-plan table, cover page)
  // that don't belong in the shared Presentation Generator's simpler schema,
  // so this builds native pptxgenjs slides directly. Reuses zero AI calls
  // and zero freshly-rendered charts — every chart image comes from the
  // canvases already drawn on screen in the report view.
  async function downloadPresentation() {
    setDownloading('pptx');
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.63 });
      pptx.layout = 'WIDE';

      const NAVY = '0C2D57', ACCENT = '2563EB', DARK = '1F2937', MUTED = '64748B', LIGHT = 'F1F5F9';
      const FONT = 'Calibri';

      function addBranding(slide) {
        slide.addText('Generated by Convertam AI Business Analyst', {
          x: 0.4, y: 5.4, w: 6, h: 0.25, fontFace: FONT, fontSize: 8, color: '9CA3AF',
        });
      }
      function sectionHeader(slide, title) {
        slide.addText(title, { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: FONT, fontSize: 24, bold: true, color: NAVY });
        slide.addShape('rect', { x: 0.5, y: 0.95, w: 9, h: 0.03, fill: { color: ACCENT } });
      }
      function findChart(type) {
        const idx = (analysis.suggestedCharts || []).findIndex((c) => c.type === type);
        if (idx === -1 || !chartRefs.current[idx]) return null;
        return { chart: analysis.suggestedCharts[idx], canvas: chartRefs.current[idx] };
      }

      // 1. Cover
      const cover = pptx.addSlide();
      cover.background = { color: NAVY };
      cover.addText('Data Analysis', { x: 0.7, y: 1.9, w: 8.6, h: 1, fontFace: FONT, fontSize: 40, bold: true, color: 'FFFFFF' });
      cover.addText(fileName || 'Uploaded Dataset', { x: 0.7, y: 2.9, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 18, color: 'BFDBFE' });
      cover.addText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), { x: 0.7, y: 3.4, w: 8.6, h: 0.4, fontFace: FONT, fontSize: 13, color: '93C5FD' });
      cover.addText('Generated by Convertam AI Business Analyst', { x: 0.7, y: 5.0, w: 8.6, h: 0.3, fontFace: FONT, fontSize: 11, color: '60A5FA' });

      // 2. Executive Brief
      const brief = buildExecutiveBrief();
      if (brief) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Executive Brief');
        s.addShape('rect', { x: 0.6, y: 1.3, w: 8.8, h: 3.2, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 1 } });
        s.addText(brief, { x: 1.0, y: 1.7, w: 8.0, h: 2.6, fontFace: FONT, fontSize: 20, color: DARK, valign: 'middle', lineSpacingMultiple: 1.3 });
        addBranding(s);
      }

      // 3. Business Context
      if (understanding) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Business Context');
        const rows = [
          ['Dataset Type', understanding.datasetType || '—'],
          ['Industry', understanding.industry || '—'],
          ['Business Process', understanding.businessProcess || '—'],
          ['Confidence', analysis.confidenceStatement?.level || '—'],
          ['Dataset Health', datasetHealth?.health || '—'],
        ];
        s.addTable(rows.map(([k, v]) => ([
          { text: k, options: { bold: true, color: MUTED, fontFace: FONT, fontSize: 13 } },
          { text: v, options: { color: DARK, fontFace: FONT, fontSize: 13 } },
        ])), { x: 0.6, y: 1.3, w: 8.8, colW: [3, 5.8], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: false });
        if (analysis.confidenceStatement?.reasoning) {
          s.addText(analysis.confidenceStatement.reasoning, { x: 0.6, y: 4.1, w: 8.8, h: 1, fontFace: FONT, fontSize: 12, italic: true, color: MUTED });
        }
        addBranding(s);
      }

      // 4. KPI Dashboard
      if (kpiCards.length) {
        const s = pptx.addSlide();
        sectionHeader(s, 'KPI Dashboard');
        const cols = Math.min(kpiCards.length, 4);
        const cardW = 8.6 / cols;
        kpiCards.slice(0, 8).forEach((kpi, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const x = 0.7 + col * cardW, y = 1.3 + row * 1.7;
          const displayValue = kpi.unit === '%' ? `${kpi.value}%` : kpi.unit ? `${kpi.unit}${kpi.value.toLocaleString()}` : kpi.value.toLocaleString();
          s.addShape('rect', { x, y, w: cardW - 0.15, h: 1.5, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
          s.addText(kpi.name, { x: x + 0.15, y: y + 0.12, w: cardW - 0.4, h: 0.35, fontFace: FONT, fontSize: 10, bold: true, color: MUTED });
          s.addText(displayValue, { x: x + 0.15, y: y + 0.5, w: cardW - 0.4, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: NAVY });
        });
        addBranding(s);
      }

      // 5. Trend Analysis
      const trend = findChart('line');
      if (trend) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Trend Analysis');
        s.addImage({ data: trend.canvas.toDataURL('image/png'), x: 0.9, y: 1.2, w: 8.2, h: 3.4 });
        s.addText(`${trend.chart.whatItShows || ''} ${trend.chart.whyItMatters || ''}`.trim(), { x: 0.7, y: 4.75, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 12, color: DARK });
        addBranding(s);
      }

      // 6. Performance Comparison
      const comparison = findChart('bar');
      if (comparison) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Performance Comparison');
        s.addImage({ data: comparison.canvas.toDataURL('image/png'), x: 0.9, y: 1.2, w: 8.2, h: 3.4 });
        s.addText(`${comparison.chart.whatItShows || ''} ${comparison.chart.whyItMatters || ''}`.trim(), { x: 0.7, y: 4.75, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 12, color: DARK });
        addBranding(s);
      }

      // 7. Pareto / Key Drivers
      const pareto = findChart('pareto');
      if (pareto) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Pareto / Key Drivers');
        s.addImage({ data: pareto.canvas.toDataURL('image/png'), x: 0.9, y: 1.2, w: 8.2, h: 3.4 });
        s.addText(`${pareto.chart.whatItShows || ''} ${pareto.chart.whyItMatters || ''}`.trim(), { x: 0.7, y: 4.75, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 12, color: DARK });
        addBranding(s);
      }

      // 8. Heatmap / Relationship (falls back to scatter if no heatmap exists)
      const relationship = findChart('heatmap') || findChart('scatter');
      if (relationship) {
        const s = pptx.addSlide();
        sectionHeader(s, relationship.chart.type === 'heatmap' ? 'Heatmap / Relationship' : 'Relationship Analysis');
        s.addImage({ data: relationship.canvas.toDataURL('image/png'), x: 0.9, y: 1.2, w: 8.2, h: 3.4 });
        s.addText(`${relationship.chart.whatItShows || ''} ${relationship.chart.whyItMatters || ''}`.trim(), { x: 0.7, y: 4.75, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 12, color: DARK });
        addBranding(s);
      }

      // 9. Risks
      if (analysis.risks?.length) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Risks');
        const shown = analysis.risks.slice(0, 4);
        const cardH = 3.6 / shown.length;
        shown.forEach((r, i) => {
          const y = 1.25 + i * cardH;
          s.addShape('rect', { x: 0.6, y, w: 8.8, h: cardH - 0.12, fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 } });
          s.addText([
            { text: `[${r.category}] `, options: { bold: true, color: 'DC2626', fontSize: 12 } },
            { text: r.description, options: { color: DARK, fontSize: 12 } },
            { text: `  (Likelihood: ${r.likelihood}, Impact: ${r.impact})`, options: { color: MUTED, fontSize: 10, italic: true } },
          ], { x: 0.8, y: y + 0.1, w: 8.4, h: cardH - 0.3, fontFace: FONT, valign: 'middle' });
        });
        addBranding(s);
      }

      // 10. Recommendations
      if (analysis.recommendations?.length) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Recommendations');
        const shown = analysis.recommendations.slice(0, 4);
        const cardH = 3.6 / shown.length;
        shown.forEach((r, i) => {
          const y = 1.25 + i * cardH;
          s.addShape('rect', { x: 0.6, y, w: 8.8, h: cardH - 0.12, fill: { color: 'F5F3FF' }, line: { color: 'DDD6FE', width: 1 } });
          s.addText([
            { text: `${r.recommendation}  `, options: { bold: true, color: NAVY, fontSize: 12 } },
            { text: `Impact: ${r.impact} · Effort: ${r.effort} · Priority: ${r.priority} · Owner: ${r.owner}`, options: { color: MUTED, fontSize: 10 } },
          ], { x: 0.8, y: y + 0.1, w: 8.4, h: cardH - 0.3, fontFace: FONT, valign: 'middle' });
        });
        addBranding(s);
      }

      // 11. Action Plan
      if (analysis.actionPlan?.length) {
        const s = pptx.addSlide();
        sectionHeader(s, 'Action Plan');
        const header = ['Priority', 'Action', 'Owner', 'Timeline', 'Success Measure'].map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontSize: 11 } }));
        const body = analysis.actionPlan.slice(0, 6).map((a) => [
          { text: a.priority, options: { fontSize: 10, color: DARK } },
          { text: a.action, options: { fontSize: 10, color: DARK } },
          { text: a.owner, options: { fontSize: 10, color: MUTED } },
          { text: a.timeline, options: { fontSize: 10, color: MUTED } },
          { text: a.successMeasure, options: { fontSize: 10, color: MUTED } },
        ]);
        s.addTable([header, ...body], { x: 0.5, y: 1.25, w: 9, colW: [1.1, 2.8, 1.5, 1.5, 2.1], border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: false, fontFace: FONT });
        addBranding(s);
      }

      // 12. Closing Summary
      const closing = pptx.addSlide();
      closing.background = { color: NAVY };
      closing.addText('Key Priorities & Next Actions', { x: 0.7, y: 0.6, w: 8.6, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: 'FFFFFF' });
      const topRecs = (analysis.recommendations || []).slice(0, 3);
      if (topRecs.length) {
        closing.addText(
          topRecs.map((r) => ({ text: r.recommendation, options: { bullet: { code: '25CF' }, color: 'E2E8F0', fontSize: 15, breakLine: true, paraSpaceAfter: 12 } })),
          { x: 0.9, y: 1.6, w: 8.2, h: 3 }
        );
      }
      closing.addText('Thank you', { x: 0.7, y: 4.9, w: 8.6, h: 0.4, fontFace: FONT, fontSize: 14, color: '93C5FD' });
      addBranding(closing);

      await pptx.writeFile({ fileName: 'data-analysis-presentation.pptx' });
    } finally {
      setDownloading('');
    }
  }


  // Constructed from existing Milestone 4 output — no new AI call. Exactly
  // 3 sentences: the top finding, its implication, then the highest-priority
  // recommendation (or first recommendation if none are marked Immediate).
  function buildExecutiveBrief() {
    if (!analysis?.keyFindings?.length) return null;
    const topFinding = analysis.keyFindings[0];
    const topRec = analysis.recommendations?.find((r) => r.priority === 'Immediate') || analysis.recommendations?.[0];
    const sentences = [topFinding.finding, topFinding.businessImplication];
    if (topRec) sentences.push(topRec.recommendation);
    return sentences.filter(Boolean).join('. ').replace(/\.\./g, '.').replace(/([^.])$/, '$1.');
  }

  async function downloadChartsZip() {
    setDownloading('zip');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      Object.entries(chartRefs.current).forEach(([i, canvas]) => {
        if (!canvas) return;
        const chart = analysis.suggestedCharts?.[i];
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        zip.file(`${(chart?.title || `chart-${i}`).replace(/[^a-z0-9]/gi, '-')}.png`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'charts.zip'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  async function downloadExecutiveSummaryOnly() {
    setDownloading('summary');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let y = 780;
      page.drawText('Executive Summary', { x: 50, y, size: 20, font: bold, color: rgb(0.06, 0.09, 0.16) }); y -= 34;
      const words = analysis.executiveSummary.split(' ');
      let line = '';
      words.forEach((w) => {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, 12) > 495 && line) {
          page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) }); y -= 18;
          line = w;
        } else line = test;
      });
      if (line) page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'executive-summary.pdf'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  function downloadRawJSON() {
    const payload = { understanding, datasetHealth, kpiCards, analysis };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'raw-findings.json'; a.click();
    URL.revokeObjectURL(url);
  }

  // Executive One-Pager — deliberately fits on a single page: brief, top
  // KPIs, top 3 findings, top 3 recommendations, confidence, health. Built
  // for a CEO who has 60 seconds, not the full report.
  async function downloadOnePager() {
    setDownloading('onepager');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const blue = rgb(0.145, 0.396, 0.918), dark = rgb(0.12, 0.16, 0.22), muted = rgb(0.42, 0.46, 0.52);
      const margin = 45;
      let y = 800;

      function wrap(text, size, f, color, maxWidth = 505) {
        const words = String(text).split(' ');
        let line = '';
        words.forEach((w) => {
          const test = line ? `${line} ${w}` : w;
          if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
            page.drawText(line, { x: margin, y, size, font: f, color }); y -= size + 3;
            line = w;
          } else line = test;
        });
        if (line) { page.drawText(line, { x: margin, y, size, font: f, color }); y -= size + 3; }
      }

      page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: rgb(0.047, 0.176, 0.341) });
      page.drawText('Executive One-Pager', { x: margin, y: 805, size: 20, font: bold, color: rgb(1, 1, 1) });
      page.drawText(fileName || 'Data Analysis', { x: margin, y: 788, size: 11, font, color: rgb(0.75, 0.85, 1) });
      y = 760;

      const brief = buildExecutiveBrief();
      if (brief) { wrap(brief, 12, bold, dark); y -= 8; }

      if (kpiCards.length) {
        y -= 6;
        const top = kpiCards.slice(0, 3);
        const colW = 500 / top.length;
        top.forEach((kpi, i) => {
          const x = margin + i * colW;
          const displayValue = kpi.unit === '%' ? `${kpi.value}%` : kpi.unit ? `${kpi.unit}${kpi.value.toLocaleString()}` : kpi.value.toLocaleString();
          page.drawText(kpi.name, { x, y, size: 9, font, color: muted });
          page.drawText(displayValue, { x, y: y - 20, size: 16, font: bold, color: blue });
        });
        y -= 45;
      }

      if (analysis.keyFindings?.length) {
        page.drawText('Top Findings', { x: margin, y, size: 12, font: bold, color: dark }); y -= 18;
        analysis.keyFindings.slice(0, 3).forEach((f) => { wrap(`• ${f.finding}`, 10, font, dark); });
        y -= 6;
      }

      if (analysis.recommendations?.length) {
        page.drawText('Top Recommendations', { x: margin, y, size: 12, font: bold, color: dark }); y -= 18;
        analysis.recommendations.slice(0, 3).forEach((r) => { wrap(`• ${r.recommendation}`, 10, font, dark); });
        y -= 6;
      }

      if (analysis.confidenceStatement) {
        page.drawText(`Confidence: ${analysis.confidenceStatement.level}`, { x: margin, y, size: 11, font: bold, color: dark }); y -= 16;
      }
      if (datasetHealth) {
        page.drawText(`Dataset Health: ${datasetHealth.health} (${datasetHealth.completeness}% complete, ${datasetHealth.totalRows} rows)`, { x: margin, y, size: 10, font, color: muted }); y -= 16;
      }

      page.drawText('Generated by Convertam AI Business Analyst', { x: margin, y: 20, size: 8, font, color: rgb(0.6, 0.64, 0.68) });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'executive-one-pager.pdf'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading('');
    }
  }

  // CSV export of the structured intelligence itself (not the raw dataset) —
  // KPIs, findings, recommendations, and action plan each as their own
  // section within one file, since these have different column shapes.
  function downloadFindingsCSV() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [];
    if (kpiCards.length) {
      lines.push('KPIs'); lines.push('Name,Value,Unit');
      kpiCards.forEach((k) => lines.push([esc(k.name), k.value, esc(k.unit)].join(',')));
      lines.push('');
    }
    if (analysis.keyFindings?.length) {
      lines.push('Key Findings'); lines.push('Finding,Evidence,Business Implication,Evidence Type');
      analysis.keyFindings.forEach((f) => lines.push([esc(f.finding), esc(f.evidence), esc(f.businessImplication), esc(f.evidenceType)].join(',')));
      lines.push('');
    }
    if (analysis.recommendations?.length) {
      lines.push('Recommendations'); lines.push('Recommendation,Evidence,Impact,Effort,Priority,Owner');
      analysis.recommendations.forEach((r) => lines.push([esc(r.recommendation), esc(r.evidence), esc(r.impact), esc(r.effort), esc(r.priority), esc(r.owner)].join(',')));
      lines.push('');
    }
    if (analysis.actionPlan?.length) {
      lines.push('Action Plan'); lines.push('Priority,Action,Owner,Timeline,Success Measure');
      analysis.actionPlan.forEach((a) => lines.push([esc(a.priority), esc(a.action), esc(a.owner), esc(a.timeline), esc(a.successMeasure)].join(',')));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'findings-and-recommendations.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadChartDataCSV(i) {
    const chart = analysis.suggestedCharts?.[i];
    const data = chartData[i];
    if (!chart || !data) return;
    let csv = '';
    if (data.labels && data.values) {
      csv = `${chart.xColumn || 'Category'},${chart.yColumn || 'Value'}\n` + data.labels.map((l, idx) => `"${l}",${data.values[idx]}`).join('\n');
    } else if (data.points) {
      csv = `${chart.xColumn},${chart.yColumn}\n` + data.points.map((p) => `${p.x},${p.y}`).join('\n');
    } else if (data.grid) {
      csv = [chart.xColumn, ...data.xLabels].join(',') + '\n' + data.grid.map((row, yi) => [data.yLabels[yi], ...row].join(',')).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(chart.title || 'chart-data').replace(/[^a-z0-9]/gi, '-')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function togglePresentationMode() {
    if (!presentationMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setPresentationMode(true);
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      setPresentationMode(false);
    }
  }

  function startOver() {
    setPhase('upload'); setColumns([]); setRows([]); setAnalysis(null); setChartData({});
    setChatMessages([]); setError(''); setFileName(''); setPasteText('');
    setUnderstanding(null); setDatasetHealth(null); setClarifyingAnswer('');
    setObjective('Let AI Decide'); setKpiCards([]); setChatRole(''); setOmittedKpis([]); setParsingConfidence(null);
    setCooldown(null); setAiNarrativeUnavailable(false); setChatQuestionCount(0);
    analysisCacheRef.current = {}; lastAnalysisInputsRef.current = null; understandingCacheRef.current = { key: null, result: null };
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
    const previewStats = computeStats(columns, rows);
    const numericCount = columns.filter((c) => previewStats[c]?.type === 'numeric').length;
    const categoricalCount = columns.filter((c) => previewStats[c]?.type === 'categorical').length;
    const dateCount = columns.filter((c) => previewStats[c]?.type === 'date').length;
    const confColor = parsingConfidence?.level === 'high' ? '#059669' : parsingConfidence?.level === 'medium' ? '#D97706' : '#DC2626';

    return (
      <div className="panel">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Review your data</p>
        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 14 }}>{rows.length} rows extracted from {fileName}. Edit anything that looks wrong before continuing.</p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
          <span style={{ fontSize: '0.78rem', color: '#475569' }}><strong>{rows.length}</strong> rows</span>
          <span style={{ fontSize: '0.78rem', color: '#475569' }}><strong>{columns.length}</strong> columns</span>
          <span style={{ fontSize: '0.78rem', color: '#475569' }}><strong>{numericCount}</strong> numeric</span>
          <span style={{ fontSize: '0.78rem', color: '#475569' }}><strong>{categoricalCount}</strong> categorical</span>
          <span style={{ fontSize: '0.78rem', color: '#475569' }}><strong>{dateCount}</strong> date/time</span>
          {parsingConfidence && (
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: confColor }}>Parsing confidence: {parsingConfidence.level} ({parsingConfidence.confidence}%)</span>
          )}
        </div>

        {parsingConfidence?.headerCountMismatch && (
          <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E', fontSize: '0.8rem', marginBottom: 16 }}>
            {parsingConfidence.message}
          </div>
        )}

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

        {['General', 'Business Focus', 'Deep Analysis'].map((groupName) => (
          <div key={groupName} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{groupName}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {OBJECTIVE_OPTIONS.filter((opt) => opt.group === groupName).map((opt) => {
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
          </div>
        ))}

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        {cooldown?.action === 'analyze' && (
          <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E', fontSize: '0.82rem', marginBottom: 16 }}>
            The AI service is temporarily rate-limited. You can retry in {cooldown.seconds} second{cooldown.seconds !== 1 ? 's' : ''}.
          </div>
        )}

        {usageInfo && (
          <p style={{ fontSize: '0.76rem', color: usageInfo.isOwner ? '#059669' : usageInfo.remaining === 0 ? '#DC2626' : '#64748B', fontWeight: usageInfo.isOwner ? 700 : 400, marginBottom: 12 }}>
            {usageInfo.isOwner ? 'Owner Testing Mode — Convertam limit disabled' : `AI reports remaining today: ${usageInfo.remaining} of ${usageInfo.limit}`}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setPhase('understanding')}>← Back</button>
          <button className="btn btn-primary" disabled={analyzing || cooldown?.action === 'analyze' || (usageInfo && !usageInfo.isOwner && usageInfo.remaining === 0)} onClick={handleAnalyze}>
            {analyzing ? '✨ Analyzing your data…' : cooldown?.action === 'analyze' ? `Retry in ${cooldown.seconds}s` : (usageInfo && !usageInfo.isOwner && usageInfo.remaining === 0) ? 'No reports remaining today' : 'Continue to Analysis →'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'report' && analysis) {
    const brief = buildExecutiveBrief();
    const hc = datasetHealth?.health === 'Good' ? '#059669' : datasetHealth?.health === 'Needs Attention' ? '#D97706' : '#DC2626';
    const hcBg = datasetHealth?.health === 'Good' ? '#ECFDF5' : datasetHealth?.health === 'Needs Attention' ? '#FFFBEB' : '#FEF2F2';
    const cc = analysis.confidenceStatement?.level === 'High' ? '#059669' : analysis.confidenceStatement?.level === 'Medium' ? '#D97706' : '#DC2626';
    const evidenceBadge = (t) => ({
      Observed: { bg: '#ECFDF5', color: '#059669' },
      Estimated: { bg: '#FFFBEB', color: '#D97706' },
      Suggested: { bg: '#EFF6FF', color: '#2563EB' },
    }[t] || { bg: '#F1F5F9', color: '#64748B' });

    const sectionStyle = presentationMode ? { minHeight: '92vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 0' } : { marginBottom: 32 };
    const sectionLabel = { fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 };
    const card = { background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 };

    return (
      <div ref={presentationMode ? presentationContainerRef : null} className={presentationMode ? '' : 'panel'} style={presentationMode ? { position: 'fixed', inset: 0, background: 'white', zIndex: 9999, overflowY: 'auto', scrollSnapType: 'y mandatory', padding: '0 6%' } : undefined}>
        <style>{`
          @media print { .no-print-report { display: none !important; } }
        `}</style>

        {/* Top bar — hidden entirely in Presentation Mode */}
        {!presentationMode && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Data Analysis Report</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>{fileName} · {rows.length} rows</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={togglePresentationMode} style={{ fontSize: '0.82rem', fontWeight: 700, padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>🎥 Presentation Mode</button>
              <button className="btn btn-ghost" onClick={startOver}>Analyze Different Data</button>
            </div>
          </div>
        )}

        {presentationMode && (
          <button onClick={togglePresentationMode} style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, fontSize: '0.82rem', fontWeight: 700, padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>✕ Exit Presentation</button>
        )}
        {presentationMode && (
          <p style={{ position: 'fixed', bottom: 16, right: 20, zIndex: 10000, fontSize: '0.72rem', color: '#94A3B8', background: 'white', padding: '6px 12px', borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>↑↓ or space to navigate · Esc to exit</p>
        )}

        {aiNarrativeUnavailable && !presentationMode && (
          <div style={{ ...card, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 24 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E', marginBottom: 6 }}>AI-written interpretation is temporarily unavailable because the service usage limit was reached.</p>
            <p style={{ fontSize: '0.8rem', color: '#78350F', marginBottom: 12 }}>Everything below — KPIs, charts, and computed statistics — is unaffected and fully available now. Only the written narrative (executive summary, findings, recommendations) is missing.</p>
            {cooldown?.action === 'analyze' ? (
              <button disabled style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#D9A441', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'default' }}>Retry in {cooldown.seconds}s</button>
            ) : (
              <button onClick={generateAiNarrativeOnly} disabled={analyzing} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#D97706', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: analyzing ? 'default' : 'pointer' }}>
                {analyzing ? 'Generating…' : '✨ Generate AI narrative'}
              </button>
            )}
          </div>
        )}

        {/* 1. Executive Brief */}
        {brief && (
          <div style={sectionStyle}>
            <div style={{ ...card, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', border: '1px solid #BFDBFE' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Executive Brief</p>
              <p style={{ fontSize: presentationMode ? '1.4rem' : '1rem', fontWeight: 600, color: '#0F172A', lineHeight: 1.6, margin: 0 }}>{brief}</p>
            </div>
          </div>
        )}

        {/* 2. KPI Dashboard */}
        {kpiCards.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>KPI Dashboard</p>
            <div style={{ display: 'grid', gridTemplateColumns: presentationMode ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {kpiCards.map((kpi) => <KpiCard key={kpi.name} kpi={kpi} />)}
            </div>
            {omittedKpis.length > 0 && (
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 10 }}>
                {omittedKpis.length} potential KPI{omittedKpis.length > 1 ? 's were' : ' was'} left out because the computed value didn't pass validation, rather than showing a number that couldn't be trusted.
              </p>
            )}
          </div>
        )}

        {/* 3. Dataset Health & Confidence */}
        {datasetHealth && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Dataset Health & Confidence</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div style={{ ...card, background: hcBg, borderColor: `${hc}33` }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: hc, textTransform: 'uppercase', marginBottom: 4 }}>Health</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.health}</p>
              </div>
              {analysis.confidenceStatement && (
                <div style={{ ...card, background: cc === '#059669' ? '#ECFDF5' : cc === '#D97706' ? '#FFFBEB' : '#FEF2F2', borderColor: `${cc}33` }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: cc, textTransform: 'uppercase', marginBottom: 4 }}>Confidence</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{analysis.confidenceStatement.level}</p>
                </div>
              )}
              <div style={card}><p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Rows</p><p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.totalRows}</p></div>
              <div style={card}><p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Columns</p><p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.totalColumns}</p></div>
              <div style={card}><p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Missing Values</p><p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.missingValues}</p></div>
              <div style={card}><p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Duplicates</p><p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.duplicateRows}</p></div>
              <div style={card}><p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Completeness</p><p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{datasetHealth.completeness}%</p></div>
            </div>
            {analysis.confidenceStatement?.reasoning && <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 12, lineHeight: 1.5 }}>{analysis.confidenceStatement.reasoning}</p>}
          </div>
        )}

        {/* 4. Executive Summary */}
        <div style={sectionStyle}>
          <p style={sectionLabel}>Executive Summary</p>
          <div style={{ ...card, maxWidth: 780 }}>
            <p style={{ fontSize: presentationMode ? '1.15rem' : '0.92rem', color: '#374151', lineHeight: 1.75, margin: 0 }}>{analysis.executiveSummary}</p>
          </div>
        </div>

        {/* 5. Key Findings — cards, not paragraphs */}
        {analysis.keyFindings?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Key Findings</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {analysis.keyFindings.map((f, i) => {
                const badge = evidenceBadge(f.evidenceType);
                return (
                  <div key={i} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: '1.3rem' }}>💡</span>
                      {f.evidenceType && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: badge.bg, color: badge.color }}>{f.evidenceType}</span>}
                    </div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: 8, lineHeight: 1.4 }}>{f.finding}</p>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 6, lineHeight: 1.5 }}>Evidence: {f.evidence}</p>
                    <p style={{ fontSize: '0.78rem', color: '#059669', margin: 0, lineHeight: 1.5 }}>→ {f.businessImplication}</p>
                  </div>
                );
              })}
            </div>
            {analysis.rootCauseObservations?.length > 0 && (
              <div style={{ ...card, marginTop: 14, background: '#FFFBEB', borderColor: '#FDE68A' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>Root Cause Observations</p>
                {analysis.rootCauseObservations.map((o, i) => <p key={i} style={{ fontSize: '0.8rem', color: '#78350F', marginBottom: 4, lineHeight: 1.5 }}>• {o}</p>)}
              </div>
            )}
          </div>
        )}

        {/* 6. Interactive Charts — one major chart per section */}
        {(analysis.suggestedCharts || []).map((chart, i) => chartData[i] && (
          <div key={i} style={sectionStyle}>
            <p style={sectionLabel}>Chart {i + 1} of {analysis.suggestedCharts.length}</p>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{chart.title}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { const c = chartRefs.current[i]; if (c) { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${chart.title.replace(/[^a-z0-9]/gi, '-')}.png`; a.click(); } }} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Export PNG</button>
                  <button onClick={() => setFullscreenChartIdx(i)} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Fullscreen</button>
                  <button onClick={() => downloadChartDataCSV(i)} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>Download Data</button>
                  {chatEnabled && <button onClick={() => handleChatSend(`Explain this chart: "${chart.title}" — what does it show, why does it matter, and what should management do about it?`)} disabled={chatBusy} style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#7C3AED', cursor: 'pointer' }}>Explain this chart</button>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ChartCanvas
                  chart={chart} data={chartData[i]} hideChrome
                  width={presentationMode ? 900 : 640} height={presentationMode ? 460 : 320}
                  chartRef={{ current: null, set current(v) { chartRefs.current[i] = v; } }}
                />
              </div>
              {(chart.whatItShows || chart.whyItMatters) && <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 12, lineHeight: 1.5 }}>{chart.whatItShows} {chart.whyItMatters}</p>}
              {chart.whySelected && <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4, fontStyle: 'italic' }}>{chart.whySelected}</p>}
            </div>
          </div>
        ))}

        {/* 7. Risks */}
        {analysis.risks?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Risks</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {analysis.risks.map((r, i) => (
                <div key={i} style={card}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>{r.category}</p>
                  <p style={{ fontSize: '0.85rem', color: '#0F172A', marginBottom: 8, lineHeight: 1.5 }}>{r.description}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Likelihood: {r.likelihood} · Impact: {r.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Opportunities */}
        {analysis.opportunities?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Opportunities</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {analysis.opportunities.map((o, i) => (
                <div key={i} style={card}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: o.priority === 'High' ? '#059669' : o.priority === 'Medium' ? '#D97706' : '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{o.priority} Priority</p>
                  <p style={{ fontSize: '0.85rem', color: '#0F172A', marginBottom: 6, lineHeight: 1.5 }}>{o.description}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>{o.whyItMatters}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. Recommendations — executive action cards */}
        {analysis.recommendations?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Recommendations</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {analysis.recommendations.map((r, i) => (
                <div key={i} style={{ ...card, borderLeft: '3px solid #7C3AED' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: 10, lineHeight: 1.4 }}>{r.recommendation}</p>
                  <p style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: 10, lineHeight: 1.5 }}>Evidence: {r.evidence}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: r.priority === 'Immediate' ? '#FEF2F2' : '#F1F5F9', color: r.priority === 'Immediate' ? '#DC2626' : '#475569' }}>{r.priority}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#2563EB' }}>Impact: {r.impact}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#F5F3FF', color: '#7C3AED' }}>Effort: {r.effort}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 10 }}>Owner: {r.owner}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. Action Plan — table */}
        {analysis.actionPlan?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Action Plan</p>
            <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Priority', 'Action', 'Owner', 'Timeline', 'Success Measure'].map((h) => (
                      <th key={h} style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.actionPlan.map((a, i) => (
                    <tr key={i} style={{ borderBottom: i < analysis.actionPlan.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: 12 }}><span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: a.priority === 'Immediate' ? '#FEF2F2' : '#F1F5F9', color: a.priority === 'Immediate' ? '#DC2626' : '#475569' }}>{a.priority}</span></td>
                      <td style={{ padding: 12, color: '#0F172A' }}>{a.action}</td>
                      <td style={{ padding: 12, color: '#64748B' }}>{a.owner}</td>
                      <td style={{ padding: 12, color: '#64748B' }}>{a.timeline}</td>
                      <td style={{ padding: 12, color: '#64748B' }}>{a.successMeasure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analysis.qualityWarnings?.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionLabel}>Data Quality Notes</p>
            <div style={card}>
              {analysis.qualityWarnings.map((w, i) => <p key={i} style={{ fontSize: '0.82rem', color: '#374151', marginBottom: 4 }}>• {w}</p>)}
            </div>
          </div>
        )}

        <div style={sectionStyle}>
          <p style={sectionLabel}>Conclusion</p>
          <div style={card}><p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>{analysis.conclusion}</p></div>
        </div>

        {/* 11. Download Centre */}
        <div style={sectionStyle} className="no-print-report">
          <p style={sectionLabel}>Downloads</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={downloadPDFReport} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'pdf' ? 'Building…' : '📄 Download PDF'}</button>
            <button onClick={downloadPresentation} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'pptx' ? 'Building…' : '📊 Download PowerPoint'}</button>
            <button onClick={downloadChartsZip} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'zip' ? 'Zipping…' : '🖼 Download Charts (ZIP)'}</button>
            <button onClick={downloadExecutiveSummaryOnly} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'summary' ? 'Building…' : '📋 Download Executive Summary'}</button>
            <button onClick={downloadOnePager} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'onepager' ? 'Building…' : '📄 Executive One-Pager'}</button>
            <button onClick={downloadRawJSON} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>🗂 Download Raw Findings (JSON)</button>
            <button onClick={downloadFindingsCSV} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>🗒 Findings & Recommendations (CSV)</button>
            <button onClick={downloadWordReport} disabled={!!downloading} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>{downloading === 'word' ? 'Building…' : '📝 Word Report'}</button>
            <button onClick={downloadExcel} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>📈 Excel (data)</button>
            <button onClick={downloadCSV} style={{ fontSize: '0.8rem', padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>⬇ CSV</button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 8 }}>Note: the Excel download includes your data only — native embedded Excel charts aren't supported yet. Charts export as PNG only — SVG export isn't available since charts are rendered on canvas, not as vector graphics.</p>
        </div>

        {/* 12. Ask the Analyst — behind ENABLE_ANALYST_CHAT, default/production off in V1 */}
        {chatEnabled && (
        <div style={sectionStyle} className="no-print-report">
          <p style={sectionLabel}>Ask the Analyst</p>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: 14 }}>Ask questions, request a different framing, or transform this report — I already know everything above.</p>
          <div style={card}>

            {/* Role selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Answer as if speaking to:</span>
              <select value={chatRole} onChange={(e) => setChatRole(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#334155' }}>
                <option value="">General / no specific audience</option>
                {['CEO', 'Operations Manager', 'Quality Manager', 'Finance Director', 'HR Manager', 'Sales Manager', 'Board Presentation', 'Frontline Team'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Adaptive suggested questions */}
            {chatMessages.length === 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  analysis.risks?.length && 'Explain the biggest risk',
                  analysis.recommendations?.length && 'Why is the top recommendation important?',
                  kpiCards.length && 'Which KPI deserves the most attention?',
                  'Summarize this for a CEO',
                  'Highlight quick wins',
                  'Which issue should we fix first?',
                ].filter(Boolean).map((ex) => (
                  <button key={ex} onClick={() => handleChatSend(ex)} disabled={chatBusy} style={{ fontSize: '0.76rem', padding: '6px 12px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', color: '#475569' }}>{ex}</button>
                ))}
              </div>
            )}

            {/* Report transformations */}
            {chatMessages.length === 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Or transform this report</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Summarize in 50 words', 'Create speaker notes', 'Rewrite as an email', 'Create a one-minute briefing', 'Create FAQs', 'Generate action checklist'].map((t) => (
                    <button key={t} onClick={() => handleChatSend(t, t)} disabled={chatBusy} style={{ fontSize: '0.76rem', padding: '6px 12px', borderRadius: 999, border: '1px solid #DDD6FE', background: '#F5F3FF', cursor: 'pointer', color: '#7C3AED' }}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.length > 0 && (
              <div style={{ marginBottom: 12, maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{ background: m.role === 'user' ? '#2563EB' : '#F8FAFC', color: m.role === 'user' ? 'white' : '#1E293B', padding: '9px 13px', borderRadius: 10, fontSize: '0.82rem', border: m.role === 'ai' ? '1px solid #E2E8F0' : 'none', whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </div>
                    {m.role === 'ai' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, paddingLeft: 4 }}>
                        <button onClick={() => copyToClipboard(m.text)} style={{ fontSize: '0.68rem', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Copy</button>
                        <button onClick={() => setAnalysis((a) => ({ ...a, executiveSummary: m.text }))} style={{ fontSize: '0.68rem', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Replace Executive Summary</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input aria-label="Ask a question about this report" style={{ ...inputStyle, flex: 1 }} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Ask a question about this report…" disabled={chatBusy} />
              <button onClick={() => handleChatSend()} disabled={chatBusy || !chatInput.trim()} aria-label="Send question" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: chatBusy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: chatBusy ? 'default' : 'pointer' }}>
                {chatBusy ? '…' : 'Ask'}
              </button>
            </div>
            {chatMessages.length > 0 && (
              <button onClick={downloadChatAsMarkdown} style={{ marginTop: 10, fontSize: '0.72rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>⬇ Download this conversation as Markdown</button>
            )}
          </div>
        </div>
        )}

        <p className="privacy-note no-print-report" style={{ marginBottom: presentationMode ? 60 : 0 }}>Your data is sent securely to our AI engine for analysis only, never stored.</p>

        {/* Chart fullscreen lightbox */}
        {fullscreenChartIdx !== null && chartData[fullscreenChartIdx] && (
          <div
            role="dialog" aria-label="Chart fullscreen view"
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}
            onClick={() => setFullscreenChartIdx(null)}
          >
            <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{analysis.suggestedCharts[fullscreenChartIdx].title}</p>
                <button onClick={() => setFullscreenChartIdx(null)} aria-label="Close fullscreen chart" style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
              </div>
              <canvas
                ref={(el) => {
                  if (!el) return;
                  const src = chartRefs.current[fullscreenChartIdx];
                  if (src) { el.width = src.width; el.height = src.height; el.getContext('2d').drawImage(src, 0, 0); }
                }}
                style={{ maxWidth: '80vw', maxHeight: '70vh', width: 'auto', height: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
