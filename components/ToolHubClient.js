'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

// Generic premium "category hub" template — same pattern as the Calculator
// Hub (search, quick-nav pills, optional featured card, sectioned grid of
// cards with icon/title/desc/badge). Built so PDF Tools, Business Tools,
// AI Tools and Image Tools all get the same treatment instead of four
// separate hand-rolled pages, without changing any tool's slug, href or
// copy — presentation only.

// Additive labels only — 'free'/'paid'/'soon' (used by the PDF/Business/
// AI/Image hubs) keep their exact original text; 'new'/'popular' are new
// values a hub can opt into (e.g. Data Tools) without touching those.
const BADGE_LABELS = { paid: 'PAID', soon: 'COMING SOON', new: 'NEW', popular: 'POPULAR' };

function ToolCard({ tool, accent }) {
  const disabled = tool.available === false;
  return (
    <Link href={disabled ? '#' : tool.href} className={`th-card${disabled ? ' th-card-soon' : ''}`} aria-disabled={disabled}>
      <span className="th-card-icon" aria-hidden="true" style={disabled ? undefined : { background: accent.badgeFreeBg }}>{tool.icon}</span>
      <div className="th-card-body">
        <div className="th-card-title-row">
          <span className="th-card-title">{tool.title}</span>
          {tool.badge && <span className={`th-badge th-badge-${tool.badge}`}>{BADGE_LABELS[tool.badge] || 'FREE'}</span>}
        </div>
        <p className="th-card-desc">{tool.desc}</p>
      </div>
      {!disabled && <span className="th-card-arrow" aria-hidden="true">→</span>}
    </Link>
  );
}

export default function ToolHubClient({ accent, icon, title, subtitle, searchPlaceholder, featured, sections }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const showNav = sections.length > 1;

  const matches = (tool) => tool.title.toLowerCase().includes(q) || tool.desc.toLowerCase().includes(q);

  const filteredSections = useMemo(
    () => sections.map((s) => ({ ...s, tools: isSearching ? s.tools.filter(matches) : s.tools })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, sections]
  );
  const noResults = isSearching && filteredSections.every((s) => s.tools.length === 0);

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: '#ffffff' }}>
      {/* dangerouslySetInnerHTML, not a JSX text child: react-dom/server HTML-escapes
          text children (e.g. ' -> &#x27;) but <style> is a raw-text element per the
          HTML spec, so the browser never decodes that entity back — a guaranteed
          hydration mismatch for any rule here with a quote character, like
          .th-badge::before's content: ''. dangerouslySetInnerHTML sets raw HTML
          identically on the server and the client, so there's nothing to mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .page-inner { width: 100%; padding: 0 4%; }

        .th-search-wrap { position: relative; max-width: 480px; margin-bottom: 16px; }
        .th-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }
        .th-search {
          width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
          border: 1.5px solid #E5E7EB; background: #FAFAFA;
          font-size: 0.9rem; font-family: inherit; outline: none; color: #0F172A; box-sizing: border-box;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .th-search:focus { border-color: ${accent.accentText}; background: white; box-shadow: 0 0 0 3px ${accent.focusRing}; }
        .th-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .th-nav-btn {
          padding: 7px 15px; border-radius: 999px; border: 1.5px solid #E5E7EB; background: white;
          color: #475569; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .th-nav-btn:hover { color: ${accent.accentText}; border-color: ${accent.borderColor}; background: ${accent.pageBgTop}; }

        .th-featured {
          display: flex; align-items: center; gap: 18px; padding: 18px 22px; border-radius: 16px;
          background: white; border: 1.5px solid #EEF0F3; text-decoration: none;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04); margin-bottom: 40px; transition: all 0.2s ease;
        }
        .th-featured:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.08); border-color: ${accent.borderColor}; }
        .th-featured-icon {
          font-size: 1.7rem; flex-shrink: 0; width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; background: ${accent.badgeFreeBg};
        }
        .th-featured-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${accent.accentText}; margin: 0 0 4px; }
        .th-featured-title { font-size: 1.15rem; font-weight: 800; margin: 0 0 3px; color: #0F172A; }
        .th-featured-desc { font-size: 0.83rem; color: #64748B; margin: 0; }
        .th-featured-cta {
          margin-left: auto; flex-shrink: 0; font-size: 0.8rem; font-weight: 700; white-space: nowrap;
          color: white; background: ${accent.gradient}; padding: 9px 18px; border-radius: 999px;
        }
        .th-featured-soon { cursor: default; }
        .th-featured-soon:hover { transform: none; box-shadow: 0 2px 10px rgba(15,23,42,0.04); border-color: #EEF0F3; }
        .th-featured-badge { margin-left: auto; flex-shrink: 0; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.04em; background: #F1F5F9; color: #64748B; border-radius: 999px; padding: 6px 14px; white-space: nowrap; }

        .th-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .th-card {
          position: relative; display: flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: 16px;
          border: 1.5px solid #EEF0F3; background: white; text-decoration: none;
          box-shadow: 0 1px 2px rgba(15,23,42,0.03); transition: all 0.18s ease;
        }
        .th-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(15,23,42,0.08); border-color: ${accent.borderColor}; }
        .th-card:hover .th-card-arrow { opacity: 1; transform: translateX(0); }
        .th-card-icon {
          font-size: 1.3rem; flex-shrink: 0; line-height: 1; width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; background: #F1F5F9;
        }
        .th-card-body { flex: 1; min-width: 0; padding-right: 14px; }
        .th-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .th-card-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; }
        .th-card-desc { font-size: 0.78rem; color: #64748B; line-height: 1.45; margin: 0; }
        .th-card-arrow { position: absolute; right: 16px; top: 18px; color: ${accent.accentText}; font-size: 0.9rem; opacity: 0; transform: translateX(-4px); transition: all 0.18s ease; }
        .th-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.63rem; font-weight: 700; letter-spacing: 0.02em; color: #64748B; white-space: nowrap; }
        .th-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .th-badge-free { color: ${accent.accentText}; }
        .th-badge-paid { color: #B45309; }
        .th-badge-soon { color: #94A3B8; }
        .th-badge-new { color: #2563EB; }
        .th-badge-popular { color: #B45309; }
        .th-card-soon { cursor: default; }
        .th-card-soon .th-card-icon { background: #F1F5F9; filter: grayscale(0.4); opacity: 0.7; }
        .th-card-soon .th-card-title { color: #94A3B8; }
        .th-card-soon .th-card-desc { color: #B0B8C4; }
        .th-card-soon:hover { transform: none; box-shadow: 0 1px 2px rgba(15,23,42,0.03); border-color: #EEF0F3; }

        .th-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; scroll-margin-top: 24px; font-size: 1.05rem; font-weight: 700; color: #152238; }
        .th-empty { text-align: center; padding: 48px 20px; color: #64748B; font-size: 0.9rem; }

        .th-header-icon { width: 56px; height: 56px; border-radius: 16px; background: ${accent.gradient}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 20px ${accent.shadowTint}; }

        @media (max-width: 860px) {
          .th-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .page-inner { padding: 0 5%; }
          .th-grid { grid-template-columns: 1fr; }
          .th-featured { flex-wrap: wrap; }
          .th-featured-cta { margin-left: 0; }
          .th-search-wrap { max-width: 100%; }
        }
      ` }} />

      <div style={{ background: 'white', borderBottom: '1px solid #EEF0F3', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: accent.accentText, textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <span className="th-header-icon" aria-hidden="true">{icon}</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>{title}</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>{subtitle}</p>
            </div>
          </div>

          <div className="th-search-wrap">
            <svg className="th-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="th-search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>

          {showNav && (
            <nav className="th-nav" aria-label={`${title} categories`}>
              {sections.map((s) => (
                <button key={s.id} className="th-nav-btn" onClick={() => scrollToSection(s.id)}>{s.label}</button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="page-inner" style={{ padding: '40px 4% 64px' }}>
        {!isSearching && featured && (
          featured.comingSoon ? (
            <div className="th-featured th-featured-soon" aria-disabled="true">
              <span className="th-featured-icon">{featured.icon}</span>
              <div>
                <p className="th-featured-eyebrow">Featured Tool</p>
                <p className="th-featured-title">{featured.title}</p>
                <p className="th-featured-desc">{featured.desc}</p>
              </div>
              <span className="th-featured-badge">Coming Soon</span>
            </div>
          ) : (
            <Link href={featured.href} className="th-featured">
              <span className="th-featured-icon">{featured.icon}</span>
              <div>
                <p className="th-featured-eyebrow">Featured Tool</p>
                <p className="th-featured-title">{featured.title}</p>
                <p className="th-featured-desc">{featured.desc}</p>
              </div>
              <span className="th-featured-cta">Open Tool →</span>
            </Link>
          )
        )}

        {noResults ? (
          <div className="th-empty">No tools match "{query}". Try a different search term.</div>
        ) : (
          filteredSections.map((s) => (
            (isSearching ? s.tools.length > 0 : true) && (
              <div key={s.id} style={{ marginBottom: 40 }}>
                <h2 id={s.id} className="th-section-title">{s.icon} {s.label}</h2>
                <div className="th-grid">
                  {s.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} accent={accent} />)}
                </div>
              </div>
            )
          ))
        )}
      </div>
    </main>
  );
}
