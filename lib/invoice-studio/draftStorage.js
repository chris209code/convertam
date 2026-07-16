import { DRAFT_STORAGE_PREFIX, DRAFT_SCHEMA_VERSION } from './constants';

const DRAFT_KEY = `${DRAFT_STORAGE_PREFIX}_draft_v${DRAFT_SCHEMA_VERSION}`;

// Versioned so a future schema change can add a migration branch here
// instead of silently breaking (or discarding) an old saved draft.
export function saveDraft({ templateId, doc }) {
  try {
    const payload = { version: DRAFT_SCHEMA_VERSION, templateId, doc, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== DRAFT_SCHEMA_VERSION || !parsed.doc || !parsed.templateId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
