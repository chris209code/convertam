// Browser-native XML engine — DOMParser/XMLSerializer only, no dependency
// added. DOMParser is inherently safe against XXE/external-entity
// resolution (modern browsers never fetch external DTDs or SYSTEM
// entities from script-invoked DOMParser), but this module adds an
// explicit pre-parse guard against any DOCTYPE/ENTITY declaration at all
// — this is a data tool, not an XML-authoring tool, so there's no
// legitimate case here for DTD entities, and rejecting them outright
// (rather than trusting "the browser probably blocks it") also closes off
// internal-entity recursive-expansion ("billion laughs") payloads, which
// aren't a same-origin-fetch concern the browser sandbox would otherwise
// catch.
import { jsonToXml as jsonToXmlCore } from '@/components/tools/data-tools/jsonEngine';

const DOCTYPE_RE = /<!DOCTYPE[\s\S]*?>/i;
const ENTITY_RE = /<!ENTITY/i;

export function hasUnsafeDeclaration(text) {
  const doctypeMatch = text.match(DOCTYPE_RE);
  if (!doctypeMatch) return false;
  return ENTITY_RE.test(doctypeMatch[0]) || /SYSTEM|PUBLIC/i.test(doctypeMatch[0]);
}

function extractErrorLocation(message) {
  const m = message.match(/line[:\s]+(\d+)[,\s]+column[:\s]+(\d+)/i) || message.match(/(\d+):(\d+)/);
  if (m) return { line: Number(m[1]), column: Number(m[2]) };
  return { line: null, column: null };
}

export function parseXml(text) {
  if (!text || text.trim() === '') {
    return { valid: false, doc: null, error: { message: 'Input is empty.', line: 1, column: 1 } };
  }
  if (hasUnsafeDeclaration(text)) {
    return {
      valid: false,
      doc: null,
      error: { message: 'This document declares a DOCTYPE with an external or custom ENTITY, which XML Studio does not process for security reasons (protects against XXE and entity-expansion attacks). Remove the <!DOCTYPE ...> declaration and try again.', line: null, column: null },
    };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const errorNode = doc.getElementsByTagName('parsererror')[0];
  if (errorNode) {
    const raw = errorNode.textContent || 'Malformed XML.';
    const loc = extractErrorLocation(raw);
    return { valid: false, doc: null, error: { message: raw.split('\n').filter(Boolean)[0] || raw, line: loc.line, column: loc.column } };
  }
  if (!doc.documentElement) {
    return { valid: false, doc: null, error: { message: 'No root element found.', line: 1, column: 1 } };
  }
  return { valid: true, doc, error: null };
}

// ---------------------------------------------------------------------
// FORMAT / MINIFY — XMLSerializer produces valid but unindented XML, so
// pretty-printing is a manual recursive walk; minify is a whitespace strip
// between tags on the already-serialized text (safe: never touches text
// inside a tag's content since it only targets '>' + whitespace + '<').
// ---------------------------------------------------------------------

export function formatXml(doc, indent = '  ') {
  const serializer = new XMLSerializer();
  function serializeNode(node, depth) {
    const pad = indent.repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue.trim();
      return text ? pad + escapeText(text) : '';
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return `${pad}<!--${node.nodeValue}-->`;
    }
    if (node.nodeType === Node.CDATA_SECTION_NODE) {
      return `${pad}<![CDATA[${node.nodeValue}]]>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const attrs = Array.from(node.attributes || []).map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join('');
    const children = Array.from(node.childNodes).filter((c) => !(c.nodeType === Node.TEXT_NODE && !c.nodeValue.trim()));

    if (children.length === 0) return `${pad}<${node.tagName}${attrs}/>`;
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      return `${pad}<${node.tagName}${attrs}>${escapeText(children[0].nodeValue.trim())}</${node.tagName}>`;
    }
    const inner = children.map((c) => serializeNode(c, depth + 1)).filter(Boolean).join('\n');
    return `${pad}<${node.tagName}${attrs}>\n${inner}\n${pad}</${node.tagName}>`;
  }
  const decl = '<?xml version="1.0" encoding="UTF-8"?>';
  return `${decl}\n${serializeNode(doc.documentElement, 0)}`;
}

function escapeText(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return escapeText(s).replace(/"/g, '&quot;'); }

export function minifyXml(doc) {
  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(doc);
  return raw.replace(/>\s+</g, '><').trim();
}

// ---------------------------------------------------------------------
// TREE MODEL — {tagName, attributes, children, text, path} used by
// XmlTreeView, mirroring JsonTreeView's node shape/interaction pattern.
// ---------------------------------------------------------------------

export function buildTree(element, path = '') {
  const attributes = Array.from(element.attributes || []).map((a) => ({ name: a.name, value: a.value }));
  const childElements = Array.from(element.childNodes).filter((n) => n.nodeType === Node.ELEMENT_NODE);
  const textContent = Array.from(element.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.nodeValue)
    .join('')
    .trim();

  return {
    tagName: element.tagName,
    path: path || element.tagName,
    attributes,
    text: childElements.length === 0 ? textContent : '',
    children: childElements.map((c, i) => buildTree(c, `${path || element.tagName}/${c.tagName}[${i}]`)),
  };
}

// ---------------------------------------------------------------------
// XML -> JSON — attributes prefixed with "@", text content under "#text"
// when an element mixes attributes/children with text, repeated
// same-named children collapse into an array (the shape most XML->JSON
// converters use, and the one that round-trips cleanly back through
// jsonToXml for JSON -> XML).
// ---------------------------------------------------------------------

export function elementToJson(element) {
  const attributes = Array.from(element.attributes || []);
  const childElements = Array.from(element.childNodes).filter((n) => n.nodeType === Node.ELEMENT_NODE);
  const text = Array.from(element.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.nodeValue)
    .join('')
    .trim();

  if (childElements.length === 0 && attributes.length === 0) {
    return text;
  }

  const obj = {};
  for (const a of attributes) obj[`@${a.name}`] = a.value;
  if (text) obj['#text'] = text;

  for (const child of childElements) {
    const key = child.tagName;
    const value = elementToJson(child);
    if (obj[key] === undefined) obj[key] = value;
    else if (Array.isArray(obj[key])) obj[key].push(value);
    else obj[key] = [obj[key], value];
  }
  return obj;
}

export function xmlToJson(doc) {
  const root = doc.documentElement;
  return { [root.tagName]: elementToJson(root) };
}

export function jsonToXml(data, rootName = 'root') {
  return jsonToXmlCore(data, rootName);
}

// ---------------------------------------------------------------------
// XML -> CSV — only meaningful when the document actually contains a
// repeated-record structure (a parent with several same-named, similarly
// shallow children — the "<items><item/><item/></items>" shape). Anything
// else honestly reports that no tabular structure was found rather than
// forcing a nonsensical single-row CSV.
// ---------------------------------------------------------------------

export function findRepeatingElement(root) {
  // BFS for the first element with >=2 children sharing a tag name.
  const queue = [root];
  while (queue.length) {
    const el = queue.shift();
    const children = Array.from(el.childNodes).filter((n) => n.nodeType === Node.ELEMENT_NODE);
    const byTag = {};
    for (const c of children) (byTag[c.tagName] = byTag[c.tagName] || []).push(c);
    const repeated = Object.entries(byTag).find(([, list]) => list.length >= 2);
    if (repeated) return { parent: el, tagName: repeated[0], records: repeated[1] };
    for (const c of children) queue.push(c);
  }
  return null;
}

export function xmlToCsv(doc) {
  const found = findRepeatingElement(doc.documentElement);
  if (!found) {
    return { ok: false, csv: '', message: 'No repeated record structure was found — XML → CSV works best on documents shaped like a list of similar records (e.g. multiple <item> elements inside a parent).' };
  }
  const headerSet = new Set();
  const records = found.records.map((el) => {
    const row = {};
    for (const attr of Array.from(el.attributes || [])) row[`@${attr.name}`] = attr.value;
    const childEls = Array.from(el.childNodes).filter((n) => n.nodeType === Node.ELEMENT_NODE);
    if (childEls.length) {
      for (const c of childEls) row[c.tagName] = c.textContent.trim();
    } else {
      const text = el.textContent.trim();
      if (text) row[el.tagName] = text;
    }
    Object.keys(row).forEach((k) => headerSet.add(k));
    return row;
  });
  const headers = [...headerSet];
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const r of records) lines.push(headers.map((h) => escape(r[h] ?? '')).join(','));
  return { ok: true, csv: lines.join('\r\n'), rowCount: records.length, columns: headers };
}

// ---------------------------------------------------------------------
// HIGHLIGHT TOKENIZER — a separate, deliberately loose scanner used only
// for the editor's syntax-colour overlay (CodeEditor.js), not for parsing
// correctness — parseXml/DOMParser above is the source of truth for
// validity. Never throws: unrecognized input is emitted as plain text so
// mid-typing invalid XML still highlights instead of breaking the editor.
// ---------------------------------------------------------------------

export function tokenizeXmlForHighlight(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (/\s/.test(text[i])) {
      const start = i;
      while (i < n && /\s/.test(text[i])) i++;
      tokens.push({ type: 'ws', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const start = i;
      const end = text.indexOf('-->', i);
      i = end === -1 ? n : end + 3;
      tokens.push({ type: 'comment', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (text.startsWith('<?', i)) {
      const start = i;
      const end = text.indexOf('?>', i);
      i = end === -1 ? n : end + 2;
      tokens.push({ type: 'punct', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (text[i] === '<') {
      const isClose = text[i + 1] === '/';
      const start = i;
      i += isClose ? 2 : 1;
      tokens.push({ type: 'punct', start, end: i, text: text.slice(start, i) });
      // Tag name
      const nameStart = i;
      while (i < n && /[^\s/>]/.test(text[i])) i++;
      if (i > nameStart) tokens.push({ type: 'tag', start: nameStart, end: i, text: text.slice(nameStart, i) });
      // Attributes until '>' or '/>'
      while (i < n && text[i] !== '>') {
        if (/\s/.test(text[i])) { const s = i; while (i < n && /\s/.test(text[i])) i++; tokens.push({ type: 'ws', start: s, end: i, text: text.slice(s, i) }); continue; }
        if (text[i] === '/') { tokens.push({ type: 'punct', start: i, end: i + 1, text: '/' }); i++; continue; }
        if (text[i] === '=') { tokens.push({ type: 'punct', start: i, end: i + 1, text: '=' }); i++; continue; }
        if (text[i] === '"' || text[i] === "'") {
          const q = text[i]; const s = i; i++;
          while (i < n && text[i] !== q) i++;
          i = Math.min(i + 1, n);
          tokens.push({ type: 'string', start: s, end: i, text: text.slice(s, i) });
          continue;
        }
        const s = i;
        while (i < n && /[^\s=/>]/.test(text[i])) i++;
        if (i === s) { i++; continue; }
        tokens.push({ type: 'attr', start: s, end: i, text: text.slice(s, i) });
      }
      if (i < n && text[i] === '>') { tokens.push({ type: 'punct', start: i, end: i + 1, text: '>' }); i++; }
      continue;
    }
    const start = i;
    while (i < n && text[i] !== '<') i++;
    tokens.push({ type: 'ident', start, end: i, text: text.slice(start, i) });
  }
  return tokens;
}

// ---------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------

export function computeXmlStats(doc, text) {
  let elements = 0, attributes = 0, maxDepth = 0, textNodes = 0;
  function walk(el, depth) {
    elements++;
    if (depth > maxDepth) maxDepth = depth;
    attributes += (el.attributes || []).length;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) walk(child, depth + 1);
      else if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) textNodes++;
    }
  }
  if (doc && doc.documentElement) walk(doc.documentElement, 1);
  return {
    characters: text.length,
    lines: text === '' ? 0 : text.split('\n').length,
    elements, attributes, textNodes, maxDepth,
  };
}
