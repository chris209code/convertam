// Active-workflow progress, mirroring lib/careerSession.js's shape and
// storage pattern: a single localStorage record, sliding idle TTL, no
// server round-trip. This only tracks WHICH step the user is on — the
// actual data handoff between tools is already handled by Career Session
// and the Document Workspace session, so there's nothing to duplicate here.
const STORAGE_KEY = 'convertam_smart_workflow';
const IDLE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours, matching Career Session

function now() { return Date.now(); }

export function getActiveWorkflow() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.expiresAt || data.expiresAt < now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function startWorkflowProgress(workflowId, stepCount) {
  const data = {
    workflowId,
    currentStepIndex: 0,
    completedSteps: [],
    skippedSteps: [],
    stepCount,
    createdAt: now(),
    updatedAt: now(),
    expiresAt: now() + IDLE_TTL_MS,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function persist(data) {
  const updated = { ...data, updatedAt: now(), expiresAt: now() + IDLE_TTL_MS };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function advanceWorkflow({ skipped = false } = {}) {
  const data = getActiveWorkflow();
  if (!data) return null;
  const list = skipped ? 'skippedSteps' : 'completedSteps';
  const updated = {
    ...data,
    [list]: [...data[list], data.currentStepIndex],
    currentStepIndex: data.currentStepIndex + 1,
  };
  return persist(updated);
}

export function clearWorkflowProgress() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
