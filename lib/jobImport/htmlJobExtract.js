// Pure, network-free HTML/JSON-LD parsing helpers for the job-posting
// importer. Deliberately regex/string-based rather than a full DOM parser
// (no new dependency) — the two things this needs to pull out of arbitrary
// HTML (script tag contents, and plain text from a marked-up description)
// are narrow, well-bounded problems that don't need a real DOM.

const JSON_LD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractJsonLdBlocks(html) {
  const blocks = [];
  let match;
  JSON_LD_RE.lastIndex = 0;
  while ((match = JSON_LD_RE.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Malformed JSON-LD (trailing commas, HTML-escaped quotes, etc.) —
      // skip this block rather than fail the whole extraction over it.
    }
  }
  return blocks;
}

// A JobPosting can appear as a top-level object, inside an array, or
// nested inside a @graph array (a common pattern for sites that emit
// several schema.org types in one script tag) — @type can also itself be
// an array (e.g. ["JobPosting", "Thing"]).
function isJobPostingNode(node) {
  if (!node || typeof node !== 'object') return false;
  const type = node['@type'];
  if (Array.isArray(type)) return type.some((t) => String(t).toLowerCase() === 'jobposting');
  return String(type || '').toLowerCase() === 'jobposting';
}

export function findJobPostingJsonLd(html) {
  const blocks = extractJsonLdBlocks(html);
  for (const block of blocks) {
    const candidates = Array.isArray(block) ? block : [block];
    for (const candidate of candidates) {
      if (isJobPostingNode(candidate)) return candidate;
      if (Array.isArray(candidate?.['@graph'])) {
        const found = candidate['@graph'].find(isJobPostingNode);
        if (found) return found;
      }
    }
  }
  return null;
}

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

export function decodeHtmlEntities(text) {
  return (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

// Converts a marked-up description (schema.org JobPosting.description is
// typically HTML) into readable plain text: block-level tags become line
// breaks before their content is dropped, so paragraphs/list items don't
// collapse into one run-on sentence.
export function stripHtmlToText(html) {
  if (!html) return '';
  const withBreaks = html
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');
  const textOnly = withBreaks.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(textOnly)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

export function extractMetaContent(html, propertyOrName) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`, 'i');
  const reReversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyOrName}["']`, 'i');
  const match = html.match(re) || html.match(reReversed);
  return match ? decodeHtmlEntities(match[1]).trim() : '';
}

export function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : '';
}

// Last-resort fallback when no structured data exists at all: strip
// non-content tags entirely (their text is usually navigation/boilerplate,
// not the posting itself), then the rest of the tags, and cap the length —
// good enough to seed a job description field for the candidate to review
// and trim, never meant to be a perfect single-pass extraction.
export function extractVisibleBodyText(html, maxLen = 6000) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ' ');
  const text = stripHtmlToText(cleaned);
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
  VOLUNTEER: 'Volunteer',
  PER_DIEM: 'Per diem',
  OTHER: 'Other',
};

export function normalizeEmploymentType(raw) {
  if (!raw) return '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  const key = String(value).toUpperCase().replace(/[\s-]+/g, '_');
  return EMPLOYMENT_TYPE_LABELS[key] || (typeof value === 'string' ? value.replace(/_/g, ' ') : '');
}

// jobLocation can be a single Place, an array of Places, or (rarely) a
// bare string. Each Place's address may itself be a string or a
// PostalAddress object — every branch here is something real job boards
// actually emit.
export function normalizeLocation(jobLocation, jobLocationType) {
  const places = Array.isArray(jobLocation) ? jobLocation : [jobLocation].filter(Boolean);
  const parts = places.map((place) => {
    if (typeof place === 'string') return place;
    const address = place?.address;
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      return [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', ');
    }
    return '';
  }).filter(Boolean);
  if (parts.length) return parts.join(' / ');
  if (String(jobLocationType || '').toUpperCase() === 'TELECOMMUTE') return 'Remote';
  return '';
}

// experienceRequirements is either a plain string, or an
// OccupationalExperienceRequirements object giving months of experience —
// converted to a friendly "X+ years" rather than exposing raw months.
export function normalizeExperienceLevel(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.monthsOfExperience) {
    const years = Math.floor(Number(raw.monthsOfExperience) / 12);
    return years >= 1 ? `${years}+ years of experience` : `${raw.monthsOfExperience}+ months of experience`;
  }
  return '';
}
