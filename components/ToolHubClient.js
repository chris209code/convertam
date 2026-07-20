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

function ToolCard({ tool }) {
  const disabled = tool.available === false;
  return (
    <Link href={disabled ? '#' : tool.href} className={`th-card${disabled ? ' th-card-soon' : ''}`} aria-disabled={disabled}>
      <span className="th-card-icon" aria-hidden="true">{tool.icon}</span>
      <div className="th-card-body">
        <div className="th-card-title-row">
          <span className="th-card-title">{tool.title}</span>
          {tool.badge && <span className={`th-badge th-badge-${tool.badge}`}>{BADGE_LABELS[tool.badge] || 'FREE'}</span>}
        </div>
        <p className="th-card-desc">{tool.desc}</p>
      </div>
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
    <main style={{ width: '100%', minHeight: '100vh', background: `linear-gradient(180deg, ${accent.pageBgTop} 0%, ${accent.pageBgBottom} 100%)` }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }

        .th-search-wrap { position: relative; max-width: 480px; margin-bottom: 16px; }
        .th-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }
        .th-search {
          width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
          border: 1px solid ${accent.borderColor}; background: white;
          font-size: 0.9rem; font-family: inherit; outline: none; color: #0F172A; box-sizing: border-box;
        }
        .th-search:focus { border-color: ${accent.accentText}; box-shadow: 0 0 0 3px ${accent.focusRing}; }
        .th-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .th-nav-btn {
          padding: 8px 16px; border-radius: 999px; border: 1px solid ${accent.borderColor}; background: white;
          color: ${accent.accentText}; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .th-nav-btn:hover { background: ${accent.pageBgTop}; border-color: ${accent.accentText}; }

        .th-featured {
          display: flex; align-items: center; gap: 18px; padding: 20px 24px; border-radius: 16px;
          background: ${accent.gradient}; color: white; text-decoration: none;
          box-shadow: 0 10px 30px ${accent.shadowTint}; margin-bottom: 40px; transition: transform 0.2s ease;
        }
        .th-featured:hover { transform: translateY(-2px); }
        .th-featured-icon { font-size: 2.2rem; flex-shrink: 0; }
        .th-featured-eyebrow { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin: 0 0 4px; }
        .th-featured-title { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; }
        .th-featured-desc { font-size: 0.85rem; opacity: 0.92; margin: 0; }
        .th-featured-cta { margin-left: auto; flex-shrink: 0; font-size: 0.85rem; font-weight: 700; white-space: nowrap; }
        .th-featured-soon { cursor: default; }
        .th-featured-soon:hover { transform: none; }
        .th-featured-badge { margin-left: auto; flex-shrink: 0; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em; background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.4); border-radius: 999px; padding: 5px 12px; white-space: nowrap; }

        .th-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .th-card {
          display: flex; align-items: flex-start; gap: 12px; padding: 18px; border-radius: 16px;
          border: 1px solid #E2E8F0; background: white; text-decoration: none;
          box-shadow: 0 2px 8px rgba(15,23,42,0.04); transition: all 0.2s ease;
        }
        .th-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px ${accent.shadowTint}; border-color: ${accent.borderColor}; }
        .th-card-icon { font-size: 1.5rem; flex-shrink: 0; line-height: 1; }
        .th-card-body { flex: 1; min-width: 0; }
        .th-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .th-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; }
        .th-card-desc { font-size: 0.78rem; color: #64748B; line-height: 1.45; margin: 0; }
        .th-badge { font-size: 0.6rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap; letter-spacing: 0.03em; }
        .th-badge-free { background: ${accent.badgeFreeBg}; color: ${accent.badgeFreeText}; }
        .th-badge-paid { background: #FEF3C7; color: #92400E; }
        .th-badge-soon { background: #E2E8F0; color: #64748B; }
        .th-badge-new { background: #DBEAFE; color: #1D4ED8; }
        .th-badge-popular { background: #FEF3C7; color: #92400E; }
        .th-card-soon { cursor: default; opacity: 0.65; }
        .th-card-soon:hover { transform: none; box-shadow: 0 2px 8px rgba(15,23,42,0.04); border-color: #E2E8F0; }

        .th-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; scroll-margin-top: 24px; font-size: 1.05rem; font-weight: 700; color: #152238; }
        .th-empty { text-align: center; padding: 48px 20px; color: #64748B; font-size: 0.9rem; }

        .th-header-icon { width: 56px; height: 56px; border-radius: 16px; background: ${accent.gradient}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 10px 24px ${accent.shadowTint}; }

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
      `}</style>

      <div style={{ background: 'white', borderBottom: `1px solid ${accent.borderColor}`, padding: '40px 0' }}>
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
                  {s.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
                </div>
              </div>
            )
          ))
        )}
      </div>
    </main>
  );
}
