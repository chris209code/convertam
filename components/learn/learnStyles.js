// Shared stylesheet for every /learn page — one injected string (via
// dangerouslySetInnerHTML, same reasoning as CategoryLandingClient.js: a
// <style> tag is a raw-text element per the HTML spec, so a JSX text child
// would get HTML-escaped by react-dom/server and never decoded back by the
// browser, which is a guaranteed hydration mismatch for any rule with a
// quote character). Follows the exact card/shadow/color language already
// established by CategoryLandingClient.js and the homepage category cards,
// so Learn reads as part of the same site, not a bolted-on section.
export const LEARN_CSS = `
  .lrn-shell { width: 100%; min-height: 100vh; background: #F8FAFC; }
  .lrn-inner { width: 100%; padding: 0 4%; }
  .lrn-back { font-size: 0.78rem; text-decoration: none; margin-bottom: 8px; display: inline-block; }

  .lrn-section-label { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #94A3B8; margin: 0 0 10px; }

  /* Hero (homepage) */
  .lrn-hero { background: linear-gradient(120deg, #1E293B 0%, #0F172A 100%); padding: 48px 0 40px; }
  .lrn-hero-title { font-size: clamp(1.7rem, 4vw, 2.5rem); font-weight: 800; color: white; margin: 0 0 10px; letter-spacing: -0.01em; }
  .lrn-hero-sub { font-size: 1rem; color: #CBD5E1; margin: 0 0 26px; max-width: 620px; line-height: 1.5; }

  /* Search */
  .lrn-search-wrap { position: relative; max-width: 560px; }
  .lrn-search-input {
    width: 100%; padding: 14px 18px; border-radius: 12px; border: none; font-size: 0.92rem;
    font-family: inherit; box-shadow: 0 8px 24px rgba(0,0,0,0.18); outline: none;
  }
  .lrn-search-results {
    position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: white; border-radius: 12px;
    box-shadow: 0 12px 32px rgba(15,23,42,0.18); overflow: hidden; z-index: 20; text-align: left;
  }
  .lrn-search-result { display: flex; align-items: center; gap: 10px; padding: 12px 16px; text-decoration: none; border-bottom: 1px solid #F1F5F9; }
  .lrn-search-result:last-child { border-bottom: none; }
  .lrn-search-result:hover { background: #F8FAFC; }
  .lrn-search-result-title { font-size: 0.85rem; font-weight: 700; color: #0F172A; margin: 0; }
  .lrn-search-result-cat { font-size: 0.72rem; color: #94A3B8; margin: 0; }

  /* Article/guide card grid */
  .lrn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .lrn-card {
    display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; text-decoration: none;
    border: 1px solid #EEF1F5; background: #FEFEFE;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.06);
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
  }
  .lrn-card:hover {
    transform: translateY(-3px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.06), 0 18px 36px rgba(15,23,42,0.10);
  }
  .lrn-card-banner { height: 92px; display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; flex-shrink: 0; }
  .lrn-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }
  .lrn-card-cat { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 6px; }
  .lrn-card-title { font-size: 0.94rem; font-weight: 700; color: #0F172A; margin: 0 0 6px; line-height: 1.3; }
  .lrn-card-excerpt { font-size: 0.8rem; color: #64748B; margin: 0; line-height: 1.45; flex: 1; }
  .lrn-card-meta { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 0.72rem; color: #94A3B8; }

  /* Category browse cards (homepage) */
  .lrn-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .lrn-cat-card {
    display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 14px; text-decoration: none;
    border: 1px solid #EEF1F5; background: #FEFEFE;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.05);
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
  }
  .lrn-cat-card:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.06), 0 14px 28px rgba(15,23,42,0.09); }
  .lrn-cat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lrn-cat-title { font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
  .lrn-cat-count { font-size: 0.72rem; color: #94A3B8; margin: 0; }

  /* Category page header */
  .lrn-cat-header { padding: 22px 0 18px; border-bottom: 1px solid #EEF0F3; background: white; }
  .lrn-cat-header-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lrn-cat-header-title { font-size: clamp(1.3rem, 2.6vw, 1.7rem); font-weight: 800; color: #152238; margin: 0; }
  .lrn-cat-header-sub { font-size: 0.86rem; color: #64748B; margin: 2px 0 0; }

  /* Article hero */
  .lrn-article-hero { padding: 40px 0 28px; position: relative; overflow: hidden; }
  .lrn-article-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .lrn-article-illustration { flex-shrink: 0; color: rgba(255,255,255,0.92); filter: drop-shadow(0 6px 16px rgba(0,0,0,0.12)); }
  .lrn-article-hero-title { font-size: clamp(1.5rem, 3.4vw, 2.15rem); font-weight: 800; color: white; margin: 0; line-height: 1.2; letter-spacing: -0.01em; }
  .lrn-article-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: rgba(255,255,255,0.18); color: white; font-size: 0.72rem; font-weight: 700; margin-bottom: 10px; text-decoration: none; }

  .lrn-meta-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 14px 0; font-size: 0.8rem; color: #64748B; }
  .lrn-meta-item { display: flex; align-items: center; gap: 6px; }
  .lrn-difficulty { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
  .lrn-difficulty-Beginner { background: #D1FAE5; color: #065F46; }
  .lrn-difficulty-Intermediate { background: #FEF3C7; color: #92400E; }
  .lrn-difficulty-Advanced { background: #FEE2E2; color: #991B1B; }

  /* Article layout: content + sticky TOC sidebar */
  .lrn-article-layout { display: grid; grid-template-columns: 1fr 260px; gap: 40px; align-items: start; padding: 8px 0 48px; }
  .lrn-toc { position: sticky; top: 90px; border: 1px solid #EEF0F3; border-radius: 14px; padding: 16px; background: white; }
  .lrn-toc-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #94A3B8; margin: 0 0 10px; }
  .lrn-toc-link { display: block; font-size: 0.82rem; color: #475569; text-decoration: none; padding: 6px 0; line-height: 1.35; border-left: 2px solid transparent; padding-left: 10px; margin-left: -1px; }
  .lrn-toc-link:hover { color: #0F172A; border-left-color: #CBD5E1; }

  /* Article body typography */
  .lrn-content { font-size: 1rem; line-height: 1.75; color: #334155; max-width: 720px; }
  .lrn-content h2 { font-size: 1.35rem; font-weight: 800; color: #0F172A; margin: 34px 0 14px; scroll-margin-top: 90px; letter-spacing: -0.01em; }
  .lrn-content p { margin: 0 0 16px; }
  .lrn-content ul, .lrn-content ol { margin: 0 0 16px; padding-left: 22px; }
  .lrn-content li { margin-bottom: 6px; }
  .lrn-callout { border-radius: 12px; padding: 14px 18px; margin: 0 0 18px; font-size: 0.92rem; line-height: 1.55; }
  .lrn-callout-info { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E3A8A; }
  .lrn-callout-tip { background: #F0FDF4; border: 1px solid #BBF7D0; color: #14532D; }
  .lrn-callout-warning { background: #FFFBEB; border: 1px solid #FDE68A; color: #78350F; }

  /* Workflow steps (Workflow Guides only) */
  .lrn-workflow { margin: 8px 0 26px; }
  .lrn-workflow-intro { font-size: 0.95rem; color: #475569; margin: 0 0 18px; line-height: 1.6; }
  .lrn-workflow-chain { display: flex; align-items: stretch; gap: 0; flex-wrap: wrap; }
  .lrn-workflow-step {
    flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 8px; padding: 16px;
    border-radius: 14px; border: 1.5px solid #E0E7FF; background: linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%);
    text-decoration: none; position: relative;
  }
  .lrn-workflow-step-num { width: 26px; height: 26px; border-radius: 8px; background: #4F46E5; color: white; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .lrn-workflow-step-label { font-size: 0.86rem; font-weight: 700; color: #0F172A; margin: 0; }
  .lrn-workflow-step-desc { font-size: 0.76rem; color: #64748B; margin: 0; line-height: 1.4; }
  .lrn-workflow-step-tool { font-size: 0.74rem; font-weight: 700; color: #4F46E5; margin-top: auto; }
  .lrn-workflow-arrow { display: flex; align-items: center; justify-content: center; width: 32px; flex-shrink: 0; color: #A5B4FC; font-size: 1.2rem; }

  /* Common mistakes */
  .lrn-mistakes { display: flex; flex-direction: column; gap: 10px; }
  .lrn-mistake { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; background: #FFF7ED; border: 1px solid #FED7AA; }
  .lrn-mistake-icon { flex-shrink: 0; font-size: 1rem; }
  .lrn-mistake-title { font-size: 0.86rem; font-weight: 700; color: #7C2D12; margin: 0 0 3px; }
  .lrn-mistake-why { font-size: 0.8rem; color: #9A3412; margin: 0; line-height: 1.5; }

  /* Primary CTA */
  .lrn-primary-cta {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 22px 26px; border-radius: 16px; margin: 8px 0 30px; text-decoration: none;
  }
  .lrn-primary-cta-title { font-size: 1.05rem; font-weight: 800; color: white; margin: 0 0 4px; }
  .lrn-primary-cta-desc { font-size: 0.84rem; color: rgba(255,255,255,0.85); margin: 0; }
  .lrn-primary-cta-btn { flex-shrink: 0; padding: 11px 20px; border-radius: 10px; background: white; font-weight: 700; font-size: 0.85rem; white-space: nowrap; }

  /* Related articles */
  .lrn-related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

  @media (max-width: 1024px) {
    .lrn-grid { grid-template-columns: repeat(2, 1fr); }
    .lrn-cat-grid { grid-template-columns: repeat(2, 1fr); }
    .lrn-article-layout { grid-template-columns: 1fr; }
    .lrn-toc { position: static; margin-bottom: 24px; }
    .lrn-related-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .lrn-inner { padding: 0 5%; }
    .lrn-grid { grid-template-columns: 1fr; }
    .lrn-cat-grid { grid-template-columns: 1fr; }
    .lrn-related-grid { grid-template-columns: 1fr; }
    .lrn-workflow-chain { flex-direction: column; }
    .lrn-workflow-arrow { transform: rotate(90deg); width: 100%; height: 24px; }
  }
`;
