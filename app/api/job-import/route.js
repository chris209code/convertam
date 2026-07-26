export const runtime = 'nodejs';
export const maxDuration = 20;

import { extractJobPosting } from '@/lib/jobImport/extractJobPosting';

// Deliberately makes NO AI call — this route only fetches and parses the
// page's own structured data. The extracted description text flows into
// the exact same manual-paste fields CV Improver / Cover Letter Writer
// already accept, so importing from a URL never costs more AI usage than
// pasting the same text by hand would.
export async function POST(request) {
  let url;
  try {
    ({ url } = await request.json());
  } catch {
    return Response.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  if (!url || typeof url !== 'string' || !url.trim()) {
    return Response.json({ success: false, error: 'Please paste a job posting URL.' }, { status: 400 });
  }

  try {
    const result = await extractJobPosting(url.trim());
    if (!result.success) {
      // An unreachable/unreadable posting is an expected, common outcome —
      // not a server error — so this still returns 200 and lets the client
      // fail over to manual paste rather than treating it as exceptional.
      return Response.json({ success: false, error: "We couldn't automatically read this job posting.", reason: result.reason, provider: result.provider });
    }
    return Response.json(result);
  } catch (err) {
    console.error('Job import error:', err);
    return Response.json({ success: false, error: "We couldn't automatically read this job posting." });
  }
}
