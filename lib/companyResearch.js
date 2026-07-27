// Best-effort, zero-hallucination company research for Cover Letter Writer.
// Only ever surfaces text that was actually fetched from a real page — if
// nothing reliable can be found, this returns null and the caller falls
// back to a general letter with no company-specific claims. Never throws:
// every failure mode (blocked host, timeout, 404, no matching pages) is
// swallowed here so a flaky or hostile site can never break cover letter
// generation, only skip the enrichment.
import { safeFetchText } from './jobImport/safeUrlFetch';
import { extractMetaContent, extractTitleTag, extractVisibleBodyText, decodeHtmlEntities } from './jobImport/htmlJobExtract';

const FETCH_TIMEOUT_MS = 5000;
const MAX_CANDIDATE_PAGES = 2;
const MAX_TEXT_LENGTH = 4000;

const LEGAL_SUFFIXES = /\b(ltd|limited|inc|incorporated|llc|llp|plc|corp|corporation|co|company|group|gmbh|holdings|international|technologies|technology|tech)\b\.?/gi;

function normalizeForCompare(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugifyCompanyName(name) {
  return name.toLowerCase().replace(LEGAL_SUFFIXES, '').replace(/[^a-z0-9]+/g, '').trim();
}

// Regex-based (no DOM dependency, same approach as the rest of the
// job-import pipeline) — good enough to find nav/footer links to pages
// like "About Us" or "Careers" without needing a full HTML parser.
function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')).trim();
    try {
      links.push({ href: new URL(m[1], baseUrl).toString(), text });
    } catch { /* malformed href — skip */ }
  }
  return links;
}

const PAGE_KEYWORDS = ['about', 'mission', 'vision', 'values', 'culture', 'careers', 'why-work', 'why us', 'who we are'];

function pickCandidatePages(links, origin) {
  const seen = new Set();
  const picked = [];
  for (const { href, text } of links) {
    let u;
    try { u = new URL(href); } catch { continue; }
    if (u.origin !== origin) continue; // same-origin only — never follow off-site
    const haystack = `${u.pathname} ${text}`.toLowerCase();
    if (!PAGE_KEYWORDS.some((k) => haystack.includes(k))) continue;
    const key = u.origin + u.pathname.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(key);
    if (picked.length >= MAX_CANDIDATE_PAGES) break;
  }
  return picked;
}

async function findHomepage({ companyName, companyUrl }) {
  if (companyUrl) {
    try {
      const u = new URL(companyUrl);
      const baseUrl = `${u.protocol}//${u.host}`;
      const html = await safeFetchText(baseUrl, { timeoutMs: FETCH_TIMEOUT_MS });
      return { baseUrl, html };
    } catch {
      // A companyUrl sourced from the job posting itself is already
      // trusted — if it fails to fetch there's nothing safe to fall back
      // to (guessing from the name here could attribute the wrong
      // company's site to this application), so give up cleanly.
      return null;
    }
  }

  if (!companyName?.trim()) return null;
  const slug = slugifyCompanyName(companyName);
  if (slug.length < 3) return null;

  const guess = `https://www.${slug}.com`;
  try {
    const html = await safeFetchText(guess, { timeoutMs: FETCH_TIMEOUT_MS });
    // A name-only guess is never trusted outright — the fetched page must
    // actually identify itself as this company before its content is used,
    // otherwise a wrong-but-real company's mission statement could get
    // attributed to this application, which is worse than saying nothing.
    const siteName = extractMetaContent(html, 'og:site_name') || extractTitleTag(html);
    const wanted = normalizeForCompare(companyName);
    const got = normalizeForCompare(siteName);
    const wantedPrefix = wanted.slice(0, Math.min(6, wanted.length));
    if (wanted.length >= 3 && wantedPrefix && got.includes(wantedPrefix)) {
      return { baseUrl: guess, html };
    }
    return null;
  } catch {
    return null;
  }
}

export async function researchCompany({ companyName, companyUrl }) {
  try {
    const homepage = await findHomepage({ companyName, companyUrl });
    if (!homepage) return null;

    const { baseUrl, html } = homepage;
    const sections = [];
    const homeDesc = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description');
    if (homeDesc) sections.push(`Homepage summary: ${homeDesc}`);

    const origin = new URL(baseUrl).origin;
    const candidates = pickCandidatePages(extractLinks(html, baseUrl), origin);
    const sourceUrls = [baseUrl];

    const pageResults = await Promise.allSettled(
      candidates.map((pageUrl) => safeFetchText(pageUrl, { timeoutMs: FETCH_TIMEOUT_MS }))
    );
    pageResults.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      const text = extractVisibleBodyText(result.value, 1500);
      if (text && text.length > 60) {
        sections.push(`From ${candidates[i]}:\n${text}`);
        sourceUrls.push(candidates[i]);
      }
    });

    const combined = sections.join('\n\n').trim();
    if (combined.length < 80) return null; // nothing substantial actually found

    return { text: combined.slice(0, MAX_TEXT_LENGTH), sourceUrls };
  } catch {
    return null;
  }
}
