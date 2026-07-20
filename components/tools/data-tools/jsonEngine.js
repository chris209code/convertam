// Reusable, dependency-free JSON processing engine — pure functions only.
// This is the shared core JSON Studio is built on, and the same core
// future Data Tools (CSV Studio, XML Studio, API Response Viewer, JSON
// Compare, Data Cleaner) are meant to import from: parsing with real
// error locations, the recursive data transforms, the conversions, and
// the stats walker are all generic enough to sit underneath more than
// just this one tool.

// ---------------------------------------------------------------------
// PARSE — wraps native JSON.parse (fast, battle-tested, handles 10MB+
// input without breaking a sweat) and turns its error message into a
// precise line/column, since JSON.parse itself only ever throws a
// message string with a character offset baked in.
// ---------------------------------------------------------------------

function offsetToLineColumn(text, offset) {
  let line = 1;
  let lastNewline = -1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') { line++; lastNewline = i; }
  }
  return { line, column: offset - lastNewline };
}

export function parseJson(text) {
  if (text.trim() === '') {
    return { valid: false, data: undefined, error: { message: 'Input is empty.', line: 1, column: 1 } };
  }
  try {
    const data = JSON.parse(text);
    return { valid: true, data, error: null };
  } catch (e) {
    const msg = e.message || 'Invalid JSON';
    const posMatch = msg.match(/position (\d+)/);
    if (posMatch) {
      const { line, column } = offsetToLineColumn(text, Number(posMatch[1]));
      return { valid: false, data: undefined, error: { message: friendlyMessage(msg), line, column } };
    }
    // "Unexpected end of JSON input" carries no position — point at the
    // very end of the document, which is where truncated/incomplete
    // JSON always fails.
    const { line, column } = offsetToLineColumn(text, text.length);
    return { valid: false, data: undefined, error: { message: friendlyMessage(msg), line, column } };
  }
}

// Native error text is accurate but terse ("Unexpected token } in JSON at
// position 45") — this adds one plain-language line describing the most
// likely cause for the common cases the spec calls out, without ever
// claiming a diagnosis the message doesn't actually support.
function friendlyMessage(nativeMessage) {
  if (/Unexpected end of JSON input/i.test(nativeMessage)) {
    return `${nativeMessage} — the JSON looks incomplete (a closing "}" or "]" may be missing).`;
  }
  if (/Unexpected token ,/i.test(nativeMessage) || /trailing comma/i.test(nativeMessage)) {
    return `${nativeMessage} — likely a trailing comma before a closing "}" or "]".`;
  }
  if (/Unexpected token/i.test(nativeMessage) && /property name/i.test(nativeMessage)) {
    return `${nativeMessage} — object keys must be double-quoted strings.`;
  }
  if (/Unexpected token/i.test(nativeMessage)) {
    return `${nativeMessage} — check for a missing comma, colon, or quote nearby.`;
  }
  return nativeMessage;
}

// ---------------------------------------------------------------------
// DUPLICATE KEYS — native JSON.parse silently keeps the last occurrence
// of a repeated key and never reports it, so this is a dedicated linear
// scan (only meaningful — and only run — on text that already parses
// successfully). It tracks object/array nesting with a stack and only
// treats a string as a "key" when it's immediately followed by a colon
// inside an object at "expecting a member" position, so string VALUES
// that happen to repeat are never misreported as duplicate keys.
// ---------------------------------------------------------------------

// Above this size, duplicate-key scanning is skipped — see the note on
// JsonEditor's own HIGHLIGHT_MAX_BYTES for why a per-character scan,
// however cheap per character, isn't worth running unconditionally on
// documents in the tens of megabytes.
export const DUPLICATE_KEY_SCAN_MAX_BYTES = 5 * 1024 * 1024;

export function findDuplicateKeys(text) {
  if (text.length > DUPLICATE_KEY_SCAN_MAX_BYTES) return [];
  const duplicates = [];
  const stack = [];
  const n = text.length;
  let i = 0;

  // Line/column are only ever computed lazily, for an actual duplicate —
  // scanning millions of characters through a line/col-tracking function
  // call on *every single character* (the original implementation) is
  // what turned a multi-MB document into a multi-second freeze. This
  // version advances with plain index arithmetic and reads whole strings
  // with a single native .slice() instead of building them one character
  // at a time.
  while (i < n) {
    const code = text.charCodeAt(i);
    if (code === 32 || code === 9 || code === 10 || code === 13) { i++; continue; } // space, tab, \n, \r
    const ch = text[i];
    if (ch === '{') { stack.push({ type: 'object', seenKeys: new Set(), expectKey: true }); i++; continue; }
    if (ch === '[') { stack.push({ type: 'array' }); i++; continue; }
    if (ch === '}' || ch === ']') { stack.pop(); i++; continue; }
    if (ch === ',') {
      i++;
      const top = stack[stack.length - 1];
      if (top && top.type === 'object') top.expectKey = true;
      continue;
    }
    if (ch === ':') {
      i++;
      const top = stack[stack.length - 1];
      if (top && top.type === 'object') top.expectKey = false;
      continue;
    }
    if (ch === '"') {
      const start = i;
      i++;
      while (i < n && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      i = Math.min(i + 1, n);
      const top = stack[stack.length - 1];
      if (top && top.type === 'object' && top.expectKey) {
        const value = text.slice(start + 1, Math.max(start + 1, i - 1));
        if (top.seenKeys.has(value)) {
          const { line, column } = offsetToLineColumn(text, start);
          duplicates.push({ key: value, line, column });
        } else {
          top.seenKeys.add(value);
        }
      }
      continue;
    }
    i++;
  }
  return duplicates;
}

// ---------------------------------------------------------------------
// STRINGIFY — native JSON.stringify for the hot path (fast on huge
// input); a hand-rolled recursive serializer only for the one thing
// native stringify structurally cannot do: per-array compact-vs-pretty
// formatting independent of the surrounding object indentation.
// ---------------------------------------------------------------------

export function stringifyPretty(data, indent = 2) {
  return JSON.stringify(data, null, indent);
}

export function stringifyMinified(data) {
  return JSON.stringify(data);
}

export function stringifyCustom(data, { indent = 2, arrayStyle = 'pretty' } = {}) {
  const pad = (n) => ' '.repeat(indent * n);
  function ser(node, depth) {
    if (node === null || node === undefined) return 'null';
    if (Array.isArray(node)) {
      if (node.length === 0) return '[]';
      if (arrayStyle === 'compact') {
        return `[${node.map((v) => ser(v, depth)).join(', ')}]`;
      }
      const items = node.map((v) => pad(depth + 1) + ser(v, depth + 1));
      return `[\n${items.join(',\n')}\n${pad(depth)}]`;
    }
    if (typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 0) return '{}';
      const items = keys.map((k) => `${pad(depth + 1)}${JSON.stringify(k)}: ${ser(node[k], depth + 1)}`);
      return `{\n${items.join(',\n')}\n${pad(depth)}}`;
    }
    return JSON.stringify(node);
  }
  return ser(data, 0);
}

// ---------------------------------------------------------------------
// TRANSFORMS — data in, new data out. Every one rebuilds fresh
// objects/arrays rather than mutating, so a pipeline step can never
// corrupt a value an earlier or later step also reads.
// ---------------------------------------------------------------------

export function sortKeysDeep(node) {
  if (Array.isArray(node)) return node.map(sortKeysDeep);
  if (node !== null && typeof node === 'object') {
    const sorted = {};
    for (const k of Object.keys(node).sort()) sorted[k] = sortKeysDeep(node[k]);
    return sorted;
  }
  return node;
}

function isEmptyValue(v) {
  if (v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

export function removeEmptyFields(node) {
  if (Array.isArray(node)) return node.map(removeEmptyFields).filter((v) => !isEmptyValue(v));
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) {
      const v = removeEmptyFields(node[k]);
      if (!isEmptyValue(v)) out[k] = v;
    }
    return out;
  }
  return node;
}

export function removeNullValues(node) {
  if (Array.isArray(node)) return node.map(removeNullValues).filter((v) => v !== null);
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) {
      if (node[k] === null) continue;
      out[k] = removeNullValues(node[k]);
    }
    return out;
  }
  return node;
}

// Deep-equality dedupe (order-preserving, first occurrence wins) applied
// to every array found at any depth, not just the top level.
export function removeDuplicateObjects(node) {
  if (Array.isArray(node)) {
    const mapped = node.map(removeDuplicateObjects);
    const seen = new Set();
    const out = [];
    for (const item of mapped) {
      const key = JSON.stringify(item);
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return out;
  }
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = removeDuplicateObjects(node[k]);
    return out;
  }
  return node;
}

// ---------------------------------------------------------------------
// CONVERSIONS
// ---------------------------------------------------------------------

function csvEscape(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function jsonToCsv(data) {
  const rows = Array.isArray(data) ? data : [data];
  const isObjectRows = rows.length > 0 && rows.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r));
  if (!isObjectRows) {
    const lines = ['value', ...rows.map((r) => csvEscape(r !== null && typeof r === 'object' ? JSON.stringify(r) : r))];
    return lines.join('\r\n');
  }
  const headerSet = new Set();
  for (const r of rows) for (const k of Object.keys(r)) headerSet.add(k);
  const headers = [...headerSet];
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => {
      const v = r[h];
      if (v === undefined) return '';
      return csvEscape(v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
    }).join(','));
  }
  return lines.join('\r\n');
}

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeTagName(name) {
  const cleaned = String(name).replace(/[^a-zA-Z0-9_-]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}
function valueToXml(tag, value, depth) {
  const pad = '  '.repeat(depth);
  const safeTag = safeTagName(tag);
  if (Array.isArray(value)) {
    return value.map((v) => valueToXml(safeTag, v, depth)).join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const inner = Object.entries(value).map(([k, v]) => valueToXml(k, v, depth + 1)).join('\n');
    return `${pad}<${safeTag}>\n${inner}\n${pad}</${safeTag}>`;
  }
  return `${pad}<${safeTag}>${value === null || value === undefined ? '' : xmlEscape(value)}</${safeTag}>`;
}
export function jsonToXml(data, rootName = 'root') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${valueToXml(rootName, data, 0)}`;
}

export function jsonToText(data) {
  const lines = [];
  function walk(node, path) {
    if (Array.isArray(node)) {
      if (node.length === 0) { lines.push(`${path} = []`); return; }
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node !== null && typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 0) { lines.push(`${path} = {}`); return; }
      for (const k of keys) walk(node[k], path ? `${path}.${k}` : k);
    } else {
      lines.push(`${path} = ${JSON.stringify(node)}`);
    }
  }
  walk(data, '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------

export function computeJsonStats(data, text) {
  let objects = 0, arrays = 0, keys = 0, values = 0, maxDepth = 0;
  function walk(node, depth) {
    if (depth > maxDepth) maxDepth = depth;
    if (Array.isArray(node)) {
      arrays++;
      for (const item of node) walk(item, depth + 1);
    } else if (node !== null && typeof node === 'object') {
      objects++;
      const ks = Object.keys(node);
      keys += ks.length;
      for (const k of ks) walk(node[k], depth + 1);
    } else {
      values++;
    }
  }
  if (data !== undefined) walk(data, 1);
  const fileSizeBytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length;
  return {
    characters: text.length,
    lines: text === '' ? 0 : text.split('\n').length,
    objects, arrays, keys, values, maxDepth,
    fileSizeBytes,
  };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------
// JSON PATH — the path shape used both for "Copy JSON Path" in the tree
// and as the path column in Compare Mode's diff report.
// ---------------------------------------------------------------------

export function formatPath(segments) {
  if (segments.length === 0) return '$';
  let out = '$';
  for (const s of segments) {
    out += typeof s === 'number' ? `[${s}]` : `.${s}`;
  }
  return out;
}

// ---------------------------------------------------------------------
// COMPARE — a flat list of {path, status, before, after} rather than a
// merged visual tree-diff, so two documents of any shape can be compared
// without a much heavier diff-rendering engine.
// ---------------------------------------------------------------------

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === 'object') {
    const aKeys = Object.keys(a), bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

// ---------------------------------------------------------------------
// TOKENIZER — one linear scan producing {type, start, end, text} tokens,
// shared by the input editor's syntax highlighting and its bracket
// matching (finding a bracket's pair is just a depth-counted walk over
// these tokens). Never throws on malformed input — an unrecognized
// character is simply emitted as a generic 'punct' token — so a
// mid-typing invalid document still highlights instead of breaking.
// ---------------------------------------------------------------------

export function tokenizeJson(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  const stack = [];

  while (i < n) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      const start = i;
      while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++;
      tokens.push({ type: 'ws', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (ch === '{' || ch === '[') {
      tokens.push({ type: 'punct-open', start: i, end: i + 1, text: ch });
      stack.push({ type: ch === '{' ? 'object' : 'array', expectKey: ch === '{' });
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      tokens.push({ type: 'punct-close', start: i, end: i + 1, text: ch });
      stack.pop();
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'punct', start: i, end: i + 1, text: ch });
      const top = stack[stack.length - 1];
      if (top && top.type === 'object') top.expectKey = true;
      i++;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'punct', start: i, end: i + 1, text: ch });
      const top = stack[stack.length - 1];
      if (top) top.expectKey = false;
      i++;
      continue;
    }
    if (ch === '"') {
      const start = i;
      i++;
      while (i < n && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      i = Math.min(i + 1, n);
      const top = stack[stack.length - 1];
      const isKey = !!(top && top.type === 'object' && top.expectKey);
      tokens.push({ type: isKey ? 'key' : 'string', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (/[-\d]/.test(ch)) {
      const start = i;
      while (i < n && /[-+.\deE\d]/.test(text[i])) i++;
      tokens.push({ type: 'number', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (text.startsWith('true', i)) { tokens.push({ type: 'boolean', start: i, end: i + 4, text: 'true' }); i += 4; continue; }
    if (text.startsWith('false', i)) { tokens.push({ type: 'boolean', start: i, end: i + 5, text: 'false' }); i += 5; continue; }
    if (text.startsWith('null', i)) { tokens.push({ type: 'null', start: i, end: i + 4, text: 'null' }); i += 4; continue; }
    tokens.push({ type: 'punct', start: i, end: i + 1, text: ch });
    i++;
  }
  return tokens;
}

// Given a cursor offset sitting right next to a bracket token, returns
// the [openToken, closeToken] pair it belongs to, or null.
export function findMatchingBracket(tokens, cursorOffset) {
  let targetIdx = -1;
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if ((t.type === 'punct-open' || t.type === 'punct-close') && (t.start === cursorOffset || t.end === cursorOffset)) {
      targetIdx = idx;
      break;
    }
  }
  if (targetIdx === -1) return null;
  const target = tokens[targetIdx];
  let depth = 0;
  if (target.type === 'punct-open') {
    for (let j = targetIdx; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.type === 'punct-open') depth++;
      else if (t.type === 'punct-close') { depth--; if (depth === 0) return [target, t]; }
    }
  } else {
    for (let j = targetIdx; j >= 0; j--) {
      const t = tokens[j];
      if (t.type === 'punct-close') depth++;
      else if (t.type === 'punct-open') { depth--; if (depth === 0) return [t, target]; }
    }
  }
  return null;
}

export function diffJson(a, b) {
  const results = [];
  function walk(nodeA, nodeB, segments) {
    const path = formatPath(segments);
    const aIsObj = nodeA !== null && typeof nodeA === 'object';
    const bIsObj = nodeB !== null && typeof nodeB === 'object';

    if (nodeA === undefined) { results.push({ path, status: 'added', before: undefined, after: nodeB }); return; }
    if (nodeB === undefined) { results.push({ path, status: 'removed', before: nodeA, after: undefined }); return; }

    if (aIsObj && bIsObj && Array.isArray(nodeA) === Array.isArray(nodeB)) {
      if (Array.isArray(nodeA)) {
        const max = Math.max(nodeA.length, nodeB.length);
        for (let i = 0; i < max; i++) walk(nodeA[i], nodeB[i], [...segments, i]);
      } else {
        const keys = new Set([...Object.keys(nodeA), ...Object.keys(nodeB)]);
        for (const k of keys) walk(nodeA[k], nodeB[k], [...segments, k]);
      }
      return;
    }

    if (deepEqual(nodeA, nodeB)) {
      results.push({ path, status: 'unchanged', before: nodeA, after: nodeB });
    } else {
      results.push({ path, status: 'modified', before: nodeA, after: nodeB });
    }
  }
  walk(a, b, []);
  return results;
}

// ---------------------------------------------------------------------
// PIPELINE — the JSON equivalent of textEngine's OPERATIONS/applyPipeline:
// a registry driving both the button grid and execution order. Two kinds
// of step: 'transform' actually rebuilds the data; 'format' only updates
// how the (unchanged) data gets serialized at the end, since array style/
// indentation/minification aren't properties of the data itself.
// ---------------------------------------------------------------------

export const JSON_OPERATIONS = [
  { id: 'sort-keys', label: 'Sort Object Keys', kind: 'transform', apply: sortKeysDeep },
  { id: 'remove-empty', label: 'Remove Empty Fields', kind: 'transform', apply: removeEmptyFields },
  { id: 'remove-null', label: 'Remove Null Values', kind: 'transform', apply: removeNullValues },
  { id: 'remove-duplicates', label: 'Remove Duplicate Objects', kind: 'transform', apply: removeDuplicateObjects },
  { id: 'compact-arrays', label: 'Compact Arrays', kind: 'format', format: { arrayStyle: 'compact' } },
  { id: 'pretty-arrays', label: 'Pretty Arrays', kind: 'format', format: { arrayStyle: 'pretty' } },
  { id: 'beautify', label: 'Beautify', kind: 'format', format: { arrayStyle: 'pretty', indent: 2, minify: false } },
  { id: 'minify', label: 'Minify', kind: 'format', format: { minify: true } },
  { id: 'normalize', label: 'Normalize Formatting', kind: 'format', format: { arrayStyle: 'pretty', indent: 2, minify: false } },
];

export function jsonOperationById(id) {
  return JSON_OPERATIONS.find((op) => op.id === id);
}

export function applyJsonPipeline(data, pipeline) {
  let current = data;
  let format = { indent: 2, arrayStyle: 'pretty', minify: false };
  for (const step of pipeline) {
    const op = jsonOperationById(step.opId);
    if (!op) continue;
    if (op.kind === 'transform') current = op.apply(current);
    else format = { ...format, ...op.format };
  }
  return { data: current, format };
}

export function stringifyWithFormat(data, format) {
  if (format.minify) return stringifyMinified(data);
  if (format.arrayStyle === 'compact') return stringifyCustom(data, { indent: format.indent, arrayStyle: 'compact' });
  return stringifyPretty(data, format.indent);
}
