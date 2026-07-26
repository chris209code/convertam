// Provider-agnostic job posting extraction. One pipeline handles every
// source in the supported-providers list (and any unlisted company career
// page) because the vast majority of job boards and ATS platforms —
// LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, Ashby,
// SmartRecruiters, BambooHR, Wellfound, and most company career pages —
// publish the same schema.org JobPosting structured data for Google for
// Jobs / SEO, whether or not the page needs JavaScript to render its own
// UI. No per-provider scraping logic exists or should be added here — a
// new provider just needs an entry in providers.js for labeling.
//
// This module makes zero AI calls. Everything here is deterministic HTML
// parsing; the extracted description text is handed to the caller exactly
// as manually-pasted text would be, so it enters the same downstream AI
// pipeline (CV Improver, Cover Letter Writer) without adding a request.
import { safeFetchText } from './safeUrlFetch';
import { detectProvider } from './providers';
import {
  findJobPostingJsonLd, stripHtmlToText, extractMetaContent, extractTitleTag,
  extractVisibleBodyText, normalizeEmploymentType, normalizeLocation, normalizeExperienceLevel,
} from './htmlJobExtract';

const MAX_DESCRIPTION_LENGTH = 8000;

function truncate(text, maxLen) {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export async function extractJobPosting(url) {
  const provider = detectProvider(url);

  let html;
  try {
    html = await safeFetchText(url);
  } catch (err) {
    return { success: false, provider: provider.id, reason: err.reason || 'network' };
  }

  const jsonLd = findJobPostingJsonLd(html);
  if (jsonLd) {
    const title = (jsonLd.title || '').trim();
    const company = (jsonLd.hiringOrganization?.name || '').trim();
    const description = truncate(stripHtmlToText(jsonLd.description || ''), MAX_DESCRIPTION_LENGTH);
    if (title && description) {
      return {
        success: true,
        provider: provider.id,
        providerName: provider.name,
        job: {
          title,
          company,
          location: normalizeLocation(jsonLd.jobLocation, jsonLd.jobLocationType),
          employmentType: normalizeEmploymentType(jsonLd.employmentType),
          industry: (jsonLd.industry || '').toString().trim(),
          experienceLevel: normalizeExperienceLevel(jsonLd.experienceRequirements),
          description,
        },
      };
    }
  }

  // No usable JobPosting structured data — fall back to Open Graph tags,
  // which almost every page sets for link-preview purposes, plus a raw
  // visible-text scrape as a last resort so the candidate still gets a
  // starting point to review rather than nothing at all.
  const ogTitle = extractMetaContent(html, 'og:title') || extractTitleTag(html);
  const ogDescription = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description');
  const bodyText = extractVisibleBodyText(html, MAX_DESCRIPTION_LENGTH);
  const fallbackDescription = ogDescription && bodyText.length < ogDescription.length + 40 ? ogDescription : bodyText;

  if (ogTitle && fallbackDescription && fallbackDescription.length > 60) {
    return {
      success: true,
      provider: provider.id,
      providerName: provider.name,
      job: {
        title: ogTitle,
        company: extractMetaContent(html, 'og:site_name'),
        location: '',
        employmentType: '',
        industry: '',
        experienceLevel: '',
        description: truncate(fallbackDescription, MAX_DESCRIPTION_LENGTH),
      },
    };
  }

  return { success: false, provider: provider.id, reason: 'no-content' };
}
