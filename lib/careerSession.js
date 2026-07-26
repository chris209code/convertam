// Career Session — a lightweight, localStorage-backed handoff so Career
// Studio tools (CV Improver, Cover Letter Writer, and future tools like an
// ATS Match checker) can share job context and the improved CV without
// re-asking the user for the same fields. Scoped to Career Studio only —
// unrelated to DocumentSessionProvider, which carries raw PDF bytes for the
// PDF-tool ecosystem and has no place for structured job-context fields.
const CAREER_SESSION_KEY = 'convertam_career_session';

// Sliding idle timeout, not a hard expiry from creation — every save
// refreshes it, so a session stays alive for as long as the user is
// actually working within Career Studio, per the "remain active while the
// user is working" requirement.
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours of inactivity

export function getCareerSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CAREER_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(CAREER_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// Merges `partial` into any existing session (creating one if none exists)
// and refreshes the idle-timeout expiry — so a tool can call this with just
// the fields it knows about without clobbering what an earlier tool saved.
export function saveCareerSession(partial) {
  if (typeof window === 'undefined') return null;
  const existing = getCareerSession() || { createdAt: Date.now() };
  const next = { ...existing, ...partial, updatedAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS };
  try {
    localStorage.setItem(CAREER_SESSION_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, quota) — the handoff
    // just won't persist; each tool still works fully standalone.
  }
  return next;
}

export function clearCareerSession() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CAREER_SESSION_KEY); } catch { /* no-op */ }
}

export function hasCareerSession() {
  return !!getCareerSession();
}
