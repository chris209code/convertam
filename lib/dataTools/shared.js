// Tiny cross-tool utilities shared by the whole new Data Workspace tool
// family (SQL/CSV/XML Studio, Base64, URL Encoder) — deliberately separate
// from lib/smartParser/exporters.js's downloadBlob (same 10 lines) rather
// than importing across tool families, since these tools aren't otherwise
// coupled to Smart Parser.

export function downloadBlob(content, mime, filename) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// The session-storage handoff mechanism behind every "Open in..." cross-tool
// action (Smart Parser table -> CSV Studio, CSV Studio -> SQL Studio, XML
// Studio's JSON output -> CSV/SQL Studio, etc). Deliberately NOT a shared
// document/session engine like lib DocumentSession's IndexedDB store — that
// system is for uploaded file bytes (PDFs/images) that need auto-deletion
// bookkeeping; this is a same-tab, one-shot text/JSON payload that the next
// page reads once on mount and clears, so it never lingers or leaks across
// unrelated tabs/sessions.
const HANDOFF_KEY = 'cvt-data-tools-handoff';

export function sendToTool(payload) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...payload, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function receiveHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw);
    // Stale handoffs (tab left open, back button days later) shouldn't
    // silently repopulate a workspace — 5 minutes is generous for an
    // actual "click through to the next tool" flow.
    if (!parsed.at || Date.now() - parsed.at > 5 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
