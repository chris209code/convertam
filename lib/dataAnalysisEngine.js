// Deterministic KPI discovery + chart-selection engine for AI Data Analyst.
// Nothing here calls the AI — "the application discovers the findings, the
// AI explains them." This file also carries the three trust-critical fixes
// from the manufacturing-dataset review: value-based KPI type classification
// with impossible-value omission, unit detection that never guesses currency
// without real evidence, and a hardening rule that keeps near-continuous
// columns out of Pareto/bar/pie/heatmap grouping regardless of why they were
// classified as categorical in the first place.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function toNumber(val) {
  return parseFloat(String(val).replace(/,/g, ''));
}

// ---------------------------------------------------------------------------
// Unit detection — explicit signals only, never a keyword-based guess.
// Checked in order: recognized non-currency unit suffix > recognized
// currency signal > explicit "%" mention > nothing (no unit shown at all
// rather than an unsupported guess). This directly fixes labeling a
// "Sales_HL" column as ₦ — the _HL suffix is real evidence; the word
// "sales" alone is not.
// ---------------------------------------------------------------------------
const UNIT_PATTERNS = [
  { re: /(^|[_\s(])hl([_\s)]|$)/i, unit: 'HL' },
  { re: /(^|[_\s(])kg([_\s)]|$)/i, unit: 'kg' },
  { re: /(^|[_\s(])g([_\s)]|$)/i, unit: 'g' },
  { re: /(^|[_\s(])ml([_\s)]|$)/i, unit: 'mL' },
  { re: /(^|[_\s(])l([_\s)]|$)/i, unit: 'L' },
  { re: /(^|[_\s(])tons?([_\s)]|$)/i, unit: 'tons' },
  { re: /(^|[_\s(])units?([_\s)]|$)/i, unit: 'units' },
  { re: /(^|[_\s(])pcs([_\s)]|$)/i, unit: 'pcs' },
  { re: /(^|[_\s(])hrs?([_\s)]|$)/i, unit: 'hrs' },
  { re: /(^|[_\s(])min([_\s)]|$)/i, unit: 'min' },
  { re: /(^|[_\s(])days?([_\s)]|$)/i, unit: 'days' },
];

const CURRENCY_PATTERNS = [
  { re: /(₦|naira|(^|[_\s(])ngn([_\s)]|$))/i, unit: '₦' },
  { re: /(\$|(^|[_\s(])usd([_\s)]|$)|dollar)/i, unit: '$' },
  { re: /(€|(^|[_\s(])eur([_\s)]|$))/i, unit: '€' },
  { re: /(£|(^|[_\s(])gbp([_\s)]|$))/i, unit: '£' },
];

export function detectUnit(columnName) {
  for (const { re, unit } of UNIT_PATTERNS) {
    if (re.test(columnName)) return unit;
  }
  for (const { re, unit } of CURRENCY_PATTERNS) {
    if (re.test(columnName)) return unit;
  }
  if (/%|percent/i.test(columnName)) return '%';
  return ''; // no confident signal — show no unit rather than guess one
}

// ---------------------------------------------------------------------------
// KPI type classification — decides aggregation method. Value range is the
// primary signal (this is what fixes "OEE" being summed into 23,369%: OEE
// never matches a "rate/efficiency" keyword by name, but its actual values
// sit in 0-100, which is real evidence a keyword list can't provide).
// ---------------------------------------------------------------------------
const RATE_NAME_HINTS = /rate|percent|%|efficiency|\boee\b|yield|margin|ratio|utili[sz]ation|availability/i;
const INVENTORY_NAME_HINTS = /inventory|stock\s*level|on\s*hand|balance/i;
const NEGATIVE_METRIC_HINTS = /downtime|defects?|rejects?|blocked|complaints?|issues?|non-?conformance|errors?|delay|waiting/i;

export function classifyKpiType(columnName, numericValues) {
  const unit = detectUnit(columnName);
  if (unit === '%') return 'percentage';

  // A strong name-based rate/percentage hint is checked BEFORE the
  // value-range heuristic. This matters specifically for corrupt data: if
  // "Reject_Rate" contains one impossible value like 250, that single bad
  // value can throw off a value-range check enough that the column no
  // longer "looks like" a percentage by range alone — but the name itself
  // is still strong, unambiguous evidence, and classifying it correctly
  // is what lets the validation step actually catch and omit the bad value,
  // rather than the column silently falling through to an uncapped "count".
  if (RATE_NAME_HINTS.test(columnName)) return 'percentage';

  if (numericValues.length) {
    const inPercentRange = numericValues.filter((v) => v >= 0 && v <= 100).length;
    const mostlyInRange = inPercentRange / numericValues.length >= 0.9;
    const hasDecimals = numericValues.some((v) => Math.abs(v % 1) > 0.0001);
    // No name hint available (e.g. an acronym not on the list) — fall back
    // to value range plus decimal-ness as corroborating evidence. Value
    // range alone is deliberately not sufficient, so a small whole-number
    // headcount column doesn't get misclassified just for being under 100.
    if (mostlyInRange && hasDecimals) return 'percentage';
  }

  if (unit) return 'currency';
  if (INVENTORY_NAME_HINTS.test(columnName)) return 'inventory';
  return 'count';
}

function isNegativeMetric(columnName) {
  return NEGATIVE_METRIC_HINTS.test(columnName);
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
    const aiMatch = aiSuggested.has(col.toLowerCase());
    const nameMatched = RATE_NAME_HINTS.test(col) || INVENTORY_NAME_HINTS.test(col) || NEGATIVE_METRIC_HINTS.test(col) || detectUnit(col) !== '';
    let tier = 'Supporting';
    if (aiMatch && nameMatched) tier = 'Primary';
    else if (aiMatch || nameMatched) tier = 'Secondary';
    return { column: col, tier, aiMatch };
  });

  const order = { Primary: 0, Secondary: 1, Supporting: 2 };
  scored.sort((a, b) => order[a.tier] - order[b.tier]);

  return { kpis: scored.slice(0, 6), message: '' };
}

// Sanity bounds per KPI type — if a computed value falls outside what's
// mathematically possible for that type, the KPI is omitted rather than
// displayed. This is the direct fix for "OEE = 23,369.58%": whatever the
// classification or aggregation choice, a percentage-type result over ~100
// is impossible and must never reach the screen.
function validateKpiValue(type, value) {
  if (type === 'percentage') {
    if (value < -0.5 || value > 100.5) return { valid: false, reason: `Computed value (${Math.round(value * 10) / 10}%) is outside the possible 0-100% range for a percentage metric — likely an aggregation or unit mismatch, so this KPI was omitted rather than shown incorrectly.` };
    return { valid: true };
  }
  if (type === 'count' || type === 'currency' || type === 'inventory') {
    if (value < 0) return { valid: false, reason: `Computed value is negative, which isn't possible for this kind of metric — omitted rather than shown incorrectly.` };
    return { valid: true };
  }
  return { valid: true };
}

export function computeKpiCards(kpiList, columns, rows, stats) {
  const dateCol = columns.find((c) => stats[c]?.type === 'date');
  const cards = [];
  const omitted = [];

  kpiList.forEach(({ column, tier }) => {
    const s = stats[column];
    const nonEmpty = rows.map((r) => r[column]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const numericValues = nonEmpty.filter((v) => !isNaN(toNumber(v))).map(toNumber);
    if (!numericValues.length) { omitted.push({ column, reason: 'No numeric values found.' }); return; }

    const type = classifyKpiType(column, numericValues);
    const unit = detectUnit(column);
    const negative = isNegativeMetric(column);

    // Individual-value check for percentage-type columns — a single corrupt
    // value (e.g. one row of "250%") can otherwise hide inside a perfectly
    // plausible-looking average and never get caught by validating the
    // aggregate alone. If any raw value is impossible, the whole KPI is
    // omitted rather than silently deciding which rows to trust.
    if (type === 'percentage') {
      const impossibleValue = numericValues.find((v) => v < -0.5 || v > 100.5);
      if (impossibleValue !== undefined) {
        omitted.push({ column, reason: `Contains at least one value (${impossibleValue}) outside the possible 0-100% range for a percentage metric — omitted rather than averaging over a value that can't be trusted.` });
        return;
      }
    }

    let value;
    if (type === 'percentage') {
      value = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    } else if (type === 'inventory') {
      // Latest value, not sum/average — a stock level should reflect the
      // most recent count, not an accumulation across every row.
      if (dateCol) {
        const dated = rows.map((r) => ({ d: Date.parse(r[dateCol]), v: toNumber(r[column]) })).filter((r) => !isNaN(r.d) && !isNaN(r.v)).sort((a, b) => a.d - b.d);
        value = dated.length ? dated[dated.length - 1].v : numericValues[numericValues.length - 1];
      } else {
        value = numericValues[numericValues.length - 1];
      }
    } else {
      value = numericValues.reduce((a, b) => a + b, 0);
    }

    const validation = validateKpiValue(type, value);
    if (!validation.valid) { omitted.push({ column, reason: validation.reason }); return; }

    let comparison = null;
    if (dateCol) {
      const withDates = rows.map((r) => ({ date: Date.parse(r[dateCol]), val: toNumber(r[column]) })).filter((r) => !isNaN(r.date) && !isNaN(r.val)).sort((a, b) => a.date - b.date);
      if (withDates.length >= 4) {
        const mid = Math.floor(withDates.length / 2);
        const avg = (arr) => arr.reduce((s, r) => s + r.val, 0) / arr.length;
        const firstAvg = avg(withDates.slice(0, mid)), secondAvg = avg(withDates.slice(mid));
        if (firstAvg !== 0) {
          const pctChange = Math.round(((secondAvg - firstAvg) / Math.abs(firstAvg)) * 1000) / 10;
          comparison = { direction: pctChange >= 0 ? 'up' : 'down', pctChange: Math.abs(pctChange), goodDirection: negative ? pctChange < 0 : pctChange >= 0 };
        }
      }
    }

    cards.push({
      name: column, tier, value: Math.round(value * 100) / 100, unit, type,
      interpretation: type === 'percentage' ? `Average ${column.toLowerCase()} across ${numericValues.length} records`
        : type === 'inventory' ? `Most recent recorded ${column.toLowerCase()}`
        : `Total ${column.toLowerCase()} across ${numericValues.length} records`,
      comparison,
    });
  });

  return { cards, omitted };
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

// Hardening rule: a column that technically passed the numeric/categorical
// type check can still be unsuitable for grouping if most of its values are
// unique — that's a continuous-like column, not a genuine set of categories,
// regardless of why it ended up classified as categorical in the first
// place. This is the general-rule fix for the Production_HL / fake
// "Others 55%" Pareto chart, not a one-off patch for that one column name.
export function isGenuinelyCategorical(catCol, stats, rowCount) {
  const s = stats[catCol];
  if (!s || s.type !== 'categorical' || !rowCount) return false;
  const uniqueRatio = s.uniqueCount / rowCount;
  if (s.uniqueCount > 15 && uniqueRatio > 0.3) return false;
  return true;
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
  // Only genuinely categorical columns are eligible for grouping-based
  // charts (bar/Pareto/pie/heatmap) — a near-continuous column never is,
  // regardless of its raw type classification.
  const groupableCols = categoricalCols.filter((c) => isGenuinelyCategorical(c, stats, rows.length));
  const charts = [];

  // Rule: date + numeric measure -> line chart (trend)
  if (dateCols.length && numericCols.length) {
    const dateCol = dateCols[0], measure = numericCols[0];
    const dated = rows.map((r) => ({ d: Date.parse(r[dateCol]), v: toNumber(r[measure]) })).filter((r) => !isNaN(r.d) && !isNaN(r.v)).sort((a, b) => a.d - b.d);
    let directionPhrase = `how ${measure.toLowerCase()} has moved across the recorded period`;
    if (dated.length >= 4) {
      const mid = Math.floor(dated.length / 2);
      const firstAvg = dated.slice(0, mid).reduce((s, r) => s + r.v, 0) / mid;
      const secondAvg = dated.slice(mid).reduce((s, r) => s + r.v, 0) / (dated.length - mid);
      directionPhrase = secondAvg >= firstAvg ? `an overall upward trend in ${measure.toLowerCase()}` : `an overall downward trend in ${measure.toLowerCase()}`;
    }
    charts.push({
      type: 'line', xColumn: dateCol, yColumn: measure,
      title: `${measure} Over Time`,
      whatItShows: `This chart traces ${directionPhrase}.`,
      whyItMatters: `The direction of this trend determines whether current performance is sustainable or needs intervention.`,
      whySelected: `Selected because "${dateCol}" gives a genuine time sequence to track.`,
      priorityKey: 'line',
    });
  }

  // Rule: categorical + numeric -> ranked bar chart (one per reasonable categorical/numeric pairing, capped)
  groupableCols.slice(0, 3).forEach((catCol) => {
    const measure = numericCols[0];
    const entries = topNGroup(aggregateByCategory(catCol, measure, rows), 10);
    if (entries.length < 2) return;
    const sortedEntries = [...entries].sort((a, b) => b[1] - a[1]);
    const leader = sortedEntries[0];
    const total = sortedEntries.reduce((s, [, v]) => s + v, 0);
    const leaderShare = total > 0 ? Math.round((leader[1] / total) * 100) : 0;
    charts.push({
      type: 'bar', xColumn: catCol, yColumn: measure,
      title: measure ? `${measure} by ${catCol}` : `Frequency by ${catCol}`,
      whatItShows: `"${leader[0]}" leads all ${catCol.toLowerCase()} categories, accounting for approximately ${leaderShare}% of the total.`,
      whyItMatters: `Where the concentration sits determines where attention or resources should go first.`,
      whySelected: `Selected because "${catCol}" is categorical${measure ? ` with "${measure}" as a comparable measure` : ''}.`,
      priorityKey: 'bar',
      _entries: entries,
    });

    // Rule: one category contributes >60% -> Pareto
    const sorted = sortedEntries;
    if (total > 0 && sorted[0][1] / total > 0.6 || sorted.length >= 4) {
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
          whatItShows: `${sorted[0][0]} and a small number of other categories account for the bulk of the total — the bars beyond the 80% line contribute comparatively little.`,
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
      whatItShows: `Each point pairs a ${numericCols[0].toLowerCase()} value against a ${numericCols[1].toLowerCase()} value from the same record.`,
      whyItMatters: `If the points trend in a clear direction, it signals these two measures may move together — worth investigating before assuming they're independent.`,
      whySelected: `A scatter plot was chosen because both "${numericCols[0]}" and "${numericCols[1]}" are numeric measures.`,
      priorityKey: 'scatter',
    });
  }

  // Rule: categorical x categorical -> heatmap (only genuinely categorical columns)
  if (groupableCols.length >= 2) {
    const [c1, c2] = groupableCols;
    charts.push({
      type: 'heatmap', xColumn: c1, yColumn: c2,
      title: `${c1} vs ${c2}`,
      whatItShows: `Darker cells mark ${c1.toLowerCase()}/${c2.toLowerCase()} pairings that occur most often.`,
      whyItMatters: `A concentrated dark cell points to a specific combination worth examining — a pattern a flat table would bury in rows.`,
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
        whatItShows: `Where most ${col.toLowerCase()} values cluster, and whether any values sit far outside that range.`,
        whyItMatters: `A single average can hide a cluster of extreme values — this shows whether that's happening here.`,
        whySelected: `A histogram was chosen because "${col}" is a numeric measure with meaningful spread.`,
        priorityKey: 'histogram',
      });
    }
  });

  // Rule: small proportion count + measure -> pie/donut, only when genuinely appropriate (<=6 categories)
  groupableCols.forEach((catCol) => {
    if (stats[catCol].uniqueCount >= 2 && stats[catCol].uniqueCount <= 6) {
      const measure = numericCols[0];
      const entries = aggregateByCategory(catCol, measure, rows);
      charts.push({
        type: 'pie', xColumn: catCol, yColumn: measure,
        title: `${catCol} Share`,
        whatItShows: `How the total splits across ${stats[catCol].uniqueCount} ${catCol.toLowerCase()} categories.`,
        whyItMatters: `A single slice dominating the total changes the story from "balanced" to "concentrated" — worth knowing before drawing conclusions.`,
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
