import { WORKFLOWS } from './catalogue';

// Rule-based only, by design — the brief is explicit that a reliable
// predefined workflow should answer the request without spending an AI
// call. This does exact-phrase and word-overlap scoring against each
// workflow's goalKeywords; free-text goals that don't match anything
// reasonably well fall through to the "browse all workflows" list rather
// than guessing (no AI fallback is wired up in this first release).
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchWorkflow(query) {
  const q = normalize(query);
  if (!q) return null;

  let best = null;
  let bestScore = 0;
  for (const workflow of WORKFLOWS) {
    let score = 0;
    for (const kw of workflow.goalKeywords) {
      const nkw = normalize(kw);
      if (q === nkw) score += 10;
      else if (q.includes(nkw) || nkw.includes(q)) score += 6;
      else {
        const qWords = new Set(q.split(' '));
        const kwWords = nkw.split(' ');
        const overlap = kwWords.filter((w) => qWords.has(w)).length;
        if (overlap >= 2) score += overlap;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = workflow;
    }
  }
  return bestScore >= 2 ? best : null;
}

export const SUGGESTED_GOALS = [
  'Apply for a job',
  'Prepare a business document',
  'Sign and submit a contract',
  'Submit an assignment',
  'Translate a scanned document',
  'Prepare passport photographs',
  'Compare two document versions',
];
