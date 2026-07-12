// Deterministic KPI discovery + chart-selection engine for AI Data Analyst.
// Nothing here calls the AI — this is exactly what Milestone 3 asks for:
// "The application discovers the findings. The AI explains them."
// Milestone 4 will feed this engine's output into the AI narrative prompt.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function toNumber(val) {
  return parseFloat(String(val).replace(/,/g, ''));
}

const KPI_KEYWORDS = {
  currency: ['revenue', 'sales', 'profit', 'income', 'cost', 'expense', 'price', 'amount', 'value', 'fee', 'salary', 'payroll'],
  count: ['count', 'quantity', 'total', 'number', 'units', 'items', 'volume', 'production', 'stock', 'inventory'],
  rate: ['rate', 'margin', 'yield', 'efficiency', 'attendance', 'satisfaction', 'score', 'ratio', 'percent', '%'],
  negative: ['downtime', 'defects', 'rejects', 'blocked', 'complaints', 'issues', 'non-conformance', 'nonconformance', 'errors', 'delay', 'waiting'],
};

function detectUnit(columnName) {
  const lower = columnName.toLowerCase();
  if (/(₦|naira)/.test(lower)) return '₦';
  if (/(\$|usd|dollar)/.test(lower)) return '$';
  if (/(€|eur)/.test(lower)) return '€';
  if (/%|percent|rate|margin/.test(lower)) return '%';
  if (KPI_KEYWORDS.currency.some((k) => lower.includes(k))) return '₦'; // Convertam's primary currency context; a generic numeric fallback would be less useful than a best-guess default
  return '';
}

function kpiKeywordScore(columnName) {
  const lower = columnName.toLowerCase();
  for (const [category, words] of Object.entries(KPI_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return { matched: true, category };
  }
  return { matched: false, category: null };
}

// ---------------------------------------------------------------------------
// KPI Discovery Engine
// ---------------------------------------------------------------------------
// KPIs are only ever drawn from columns that are actually numeric — never
// invented, never guessed from categorical data. Prioritized in three tiers:
// Primary (AI's own inference + strong keyword match), Secondary (keyword
// match only), Supporting (numeric but no clear business-KPI signal).
export function discoverKPIs(columns, stats, understanding) {
  const numericCols = columns.filter((c) => stats[c]?.type === 'numeric');
  if (!numericCols.length) return { kpis: [], message: 'No numeric measures were found in this dataset, so no KPIs could be identified.' };

  const aiSuggested = new Set((understanding?.potentialKPIs || []).map((k) => k.toLowerCase()));

  const scored = numericCols.map((col) => {
    const { matched, category } = kpiKeywordScore(col);
    const aiMatch = aiSuggested.has(col.toLowerCase());
    let tier = 'Supporting';
    if (aiMatch && matched) tier = 'Primary';
    else if (aiMatch || matched) tier = 'Secondary';
    return { column: col, tier, category, aiMatch };
  });

  // Primary first, then Secondary, then Supporting; cap at 6 to keep the
  // report focused rather than listing every numeric column as a "KPI".
  const order = { Primary: 0, Secondary: 1, Supporting: 2 };
  scored.sort((a, b) => order[a.tier] - order[b.tier]);

  return { kpis: scored.slice(0, 6), message: '' };
}

export function computeKpiCards(kpiList, columns, rows, stats) {
  return kpiList.map(({ column, tier, category }) => {
    const s = stats[column];
    const unit = detectUnit(column);
    const isRateLike = category === 'rate';
    const value = isRateLike ? s.avg : s.sum;
    const isNegativeMetric = category === 'negative';

    let comparison = null;
    const dateCol = columns.find((c) => stats[c]?.type === 'date');
    if (dateCol) {
      const withDates = rows.map((r) => ({ date: Date.parse(r[dateCol]), val: toNumber(r[column]) })).filter((r) => !isNaN(r.date) && !isNaN(r.val)).sort((a, b) => a.date - b.date);
      if (withDates.length >= 4) {
        const mid = Math.floor(withDates.length / 2);
        const firstHalf = withDates.slice(0, mid);
        const secondHalf = withDates.slice(mid);
        const avg = (arr) => arr.reduce((s, r) => s + r.val, 0) / arr.length;
        const firstAvg = avg(firstHalf), secondAvg = avg(secondHalf);
        if (firstAvg !== 0) {
          const pctChange = Math.round(((secondAvg - firstAvg) / Math.abs(firstAvg)) * 1000) / 10;
          comparison = { direction: pctChange >= 0 ? 'up' : 'down', pctChange: Math.abs(pctChange), goodDirection: isNegativeMetric ? pctChange < 0 : pctChange >= 0 };
        }
      }
    }

    return {
      name: column, tier, value: Math.round(value * 100) / 100, unit,
      interpretation: isRateLike ? `Average ${column.toLowerCase()} across ${s.count} records` : `Total ${column.toLowerCase()} across ${s.count} records`,
      comparison,
    };
  });
}

// ---------------------------------------------------------------------------
// Chart Decision Engine — pure rules, no AI call
// ---------------------------------------------------------------------------
function topNGroup(entries, n = 10) {
  if (entries.length <= n) return entries;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, n);
  const otherSum = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  return [...top, ['Others', otherSum]];
}

function aggregateByCategory(catCol, valCol, rows) {
  const groups = {};
  rows.forEach((r) => {
    const key = String(r[catCol] ?? 'Unknown');
    const v = valCol ? toNumber(r[valCol]) : 1;
    groups[key] = (groups[key] || 0) + (valCol && !isNaN(v) ? v : 1);
  });
  return Object.entries(groups);
}

// Objective-aware priority weighting — determines which chart TYPES get
// shown first for a given objective, not which specific charts exist.
const OBJECTIVE_CHART_PRIORITY = {
  'Executive Management Report': ['kpi', 'pareto', 'bar'],
  'Performance Comparison': ['bar', 'heatmap'],
  'Root Cause Analysis': ['heatmap', 'pareto', 'bar'],
  'Operational Analysis': ['bar', 'histogram', 'line'],
  'Audit / Compliance Report': ['bar', 'pareto'],
  'Trend Analysis': ['line', 'bar'],
  'Dashboard View': ['kpi', 'bar', 'line', 'pareto', 'heatmap', 'histogram', 'scatter', 'pie'],
  'Let AI Decide': ['bar', 'line', 'pareto', 'heatmap', 'histogram', 'scatter', 'pie'],
};

export function discoverCharts(columns, stats, rows, objective) {
  const dateCols = columns.filter((c) => stats[c]?.type === 'date');
  const numericCols = columns.filter((c) => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter((c) => stats[c]?.type === 'categorical');
  const charts = [];

  // Rule: date + numeric measure -> line chart (trend)
  if (dateCols.length && numericCols.length) {
    const dateCol = dateCols[0], measure = numericCols[0];
    charts.push({
      type: 'line', xColumn: dateCol, yColumn: measure,
      title: `${measure} Over Time`,
      whatItShows: `How ${measure.toLowerCase()} has changed across the recorded dates.`,
      whyItMatters: `Trends over time reveal whether performance is improving or declining.`,
      whySelected: `A line chart was chosen because "${dateCol}" is a date sequence.`,
      priorityKey: 'line',
    });
  }

  // Rule: categorical + numeric -> ranked bar chart (one per reasonable categorical/numeric pairing, capped)
  categoricalCols.slice(0, 3).forEach((catCol) => {
    const measure = numericCols[0];
    const entries = topNGroup(aggregateByCategory(catCol, measure, rows), 10);
    if (entries.length < 2) return;
    charts.push({
      type: 'bar', xColumn: catCol, yColumn: measure,
      title: measure ? `${measure} by ${catCol}` : `Frequency by ${catCol}`,
      whatItShows: `${measure ? `Total ${measure.toLowerCase()}` : 'Count'} broken down by ${catCol.toLowerCase()}.`,
      whyItMatters: `Shows which ${catCol.toLowerCase()} categories contribute most.`,
      whySelected: `A ranked bar chart was chosen because "${catCol}" is categorical${measure ? ` and "${measure}" is a measurable quantity` : ''}.`,
      priorityKey: 'bar',
      _entries: entries,
    });

    // Rule: one category contributes >60% -> Pareto
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    if (total > 0 && sorted[0][1] / total > 0.6 || sorted.length >= 4) {
      // Also applies the standard 80/20 case even when no single category
      // dominates at 60% — Pareto is useful whenever a small number of
      // categories account for most of the total, which is the more common
      // real-world case.
      let cumulative = 0;
      let contributorsFor80 = 0;
      for (const [, v] of sorted) {
        cumulative += v;
        contributorsFor80++;
        if (cumulative / total >= 0.8) break;
      }
      if (contributorsFor80 <= Math.ceil(sorted.length * 0.6)) {
        charts.push({
          type: 'pareto', xColumn: catCol, yColumn: measure,
          title: `${catCol} — Pareto Analysis`,
          whatItShows: `${catCol} categories ranked by contribution, with cumulative percentage.`,
          whyItMatters: `${contributorsFor80} of ${sorted.length} categories contribute approximately 80% of the observed outcome — these deserve the most attention.`,
          whySelected: `A Pareto chart was chosen because a small number of categories account for most of the total.`,
          priorityKey: 'pareto',
          _entries: sorted,
        });
      }
    }
  });

  // Rule: two numeric columns -> scatter
  if (numericCols.length >= 2) {
    charts.push({
      type: 'scatter', xColumn: numericCols[0], yColumn: numericCols[1],
      title: `${numericCols[0]} vs ${numericCols[1]}`,
      whatItShows: `The relationship between ${numericCols[0].toLowerCase()} and ${numericCols[1].toLowerCase()}.`,
      whyItMatters: `Reveals whether these two measures move together.`,
      whySelected: `A scatter plot was chosen because both "${numericCols[0]}" and "${numericCols[1]}" are numeric measures.`,
      priorityKey: 'scatter',
    });
  }

  // Rule: categorical x categorical -> heatmap
  if (categoricalCols.length >= 2) {
    const [c1, c2] = categoricalCols;
    charts.push({
      type: 'heatmap', xColumn: c1, yColumn: c2,
      title: `${c1} vs ${c2}`,
      whatItShows: `How ${c1.toLowerCase()} and ${c2.toLowerCase()} combinations relate to frequency.`,
      whyItMatters: `Highlights which combinations occur most often, which a table alone makes hard to spot.`,
      whySelected: `A heatmap was chosen because both "${c1}" and "${c2}" are categorical.`,
      priorityKey: 'heatmap',
    });
  }

  // Rule: numeric distribution -> histogram (only when there's genuine spread)
  numericCols.slice(0, 1).forEach((col) => {
    const s = stats[col];
    if (s.max > s.min) {
      charts.push({
        type: 'histogram', xColumn: col,
        title: `Distribution of ${col}`,
        whatItShows: `How ${col.toLowerCase()} values are spread across their range.`,
        whyItMatters: `Reveals clustering and possible outliers that a single average would hide.`,
        whySelected: `A histogram was chosen because "${col}" is a numeric measure with meaningful spread.`,
        priorityKey: 'histogram',
      });
    }
  });

  // Rule: small proportion count + measure -> pie/donut, only when genuinely appropriate (<=6 categories)
  categoricalCols.forEach((catCol) => {
    if (stats[catCol].uniqueCount >= 2 && stats[catCol].uniqueCount <= 6) {
      const measure = numericCols[0];
      const entries = aggregateByCategory(catCol, measure, rows);
      charts.push({
        type: 'pie', xColumn: catCol, yColumn: measure,
        title: `${catCol} Share`,
        whatItShows: `The proportional share each ${catCol.toLowerCase()} category represents.`,
        whyItMatters: `Useful for seeing part-to-whole relationships at a glance.`,
        whySelected: `A pie chart was chosen because "${catCol}" has a small, readable number of categories (${stats[catCol].uniqueCount}).`,
        priorityKey: 'pie',
        _entries: entries,
      });
    }
  });

  // Objective-aware prioritization — sort by the objective's preferred chart
  // types, then cap the count (Dashboard gets more charts than an executive report).
  const priority = OBJECTIVE_CHART_PRIORITY[objective] || OBJECTIVE_CHART_PRIORITY['Let AI Decide'];
  charts.sort((a, b) => {
    const ai = priority.indexOf(a.priorityKey), bi = priority.indexOf(b.priorityKey);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const cap = objective === 'Dashboard View' ? 8 : 5;
  return charts.slice(0, cap);
}
