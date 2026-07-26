// Provider registry for the job-posting importer — used only to label
// where an imported posting came from (a small "Detected: LinkedIn Jobs"
// badge) and, if a source ever genuinely needs one, a per-host quirk (e.g.
// a different request header). The actual extraction logic in
// extractJobPosting.js is intentionally the same generic
// JSON-LD/Open-Graph parser for every provider here — none of them get
// bespoke scraping logic, so adding a new provider to this list is just
// adding one entry, never new extraction code.
const PROVIDERS = [
  { id: 'linkedin', name: 'LinkedIn Jobs', hostPatterns: ['linkedin.com'] },
  { id: 'indeed', name: 'Indeed', hostPatterns: ['indeed.com'] },
  { id: 'glassdoor', name: 'Glassdoor', hostPatterns: ['glassdoor.com'] },
  { id: 'greenhouse', name: 'Greenhouse', hostPatterns: ['greenhouse.io', 'grnh.se'] },
  { id: 'lever', name: 'Lever', hostPatterns: ['lever.co'] },
  { id: 'workday', name: 'Workday', hostPatterns: ['myworkdayjobs.com', 'workday.com'] },
  { id: 'ashby', name: 'Ashby', hostPatterns: ['ashbyhq.com'] },
  { id: 'smartrecruiters', name: 'SmartRecruiters', hostPatterns: ['smartrecruiters.com'] },
  { id: 'bamboohr', name: 'BambooHR', hostPatterns: ['bamboohr.com'] },
  { id: 'wellfound', name: 'Wellfound (AngelList)', hostPatterns: ['wellfound.com', 'angel.co'] },
];

// Every host not matched above is still fully supported — just labeled
// generically — since the generic extractor works on any page that
// publishes standard JobPosting/Open-Graph markup, which most company
// career pages do.
const GENERIC_PROVIDER = { id: 'generic', name: 'Company career page' };

export function detectProvider(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return GENERIC_PROVIDER;
  }
  const match = PROVIDERS.find((p) => p.hostPatterns.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`)));
  return match || GENERIC_PROVIDER;
}
