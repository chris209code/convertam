'use client';

import Image from 'next/image';
import Link from 'next/link';
import { TOOL_CARD_ARTWORK } from './toolCardArtwork';

// Generic premium "category hub" template — same pattern as the Calculator
// Hub (quick-nav pills, sectioned grid of cards with icon/title/desc/badge).
// Built so PDF Tools, Business Tools, AI Tools and Image Tools all get the
// same treatment instead of four separate hand-rolled pages, without
// changing any tool's slug, href or copy — presentation only.
//
// Deliberately a launcher, not a landing page: no search bar and no
// Featured Tool card — both were redundant with the tool grid sitting right
// below them, and pushed it out of view on a normal desktop screen. The
// category chips stay because they're the one navigation aid that actually
// helps (jumping straight to a group of tools).

// Additive labels only — 'free'/'paid'/'soon' (used by the PDF/Business/
// AI/Image hubs) keep their exact original text; 'new'/'popular' are new
// values a hub can opt into (e.g. Data Tools) without touching those.
const BADGE_LABELS = { paid: 'PAID', soon: 'COMING SOON', new: 'NEW', popular: 'POPULAR' };

function ToolCard({ tool, accent }) {
  const disabled = tool.available === false;
  const artwork = TOOL_CARD_ARTWORK[tool.slug];
  return (
    <Link href={disabled ? '#' : tool.href} className={`th-card${disabled ? ' th-card-soon' : ''}`} aria-disabled={disabled}>
      {artwork ? (
        <span className="th-card-art" aria-hidden="true">
          <Image src={artwork.src} alt={artwork.alt} width={112} height={112} sizes="(max-width: 640px) 48px, 56px" loading="lazy" />
        </span>
      ) : (
        <span className="th-card-icon" aria-hidden="true" style={disabled ? undefined : { background: accent.badgeFreeBg }}>{tool.icon}</span>
      )}
      <div className="th-card-body">
        <div className="th-card-title-row">
          <span className="th-card-title">{tool.title}</span>
          {/* Pricing (free/paid) is deliberately never shown here — only inside
              the tool itself — so the category grid stays about discovery,
              not evaluation. Functional/discovery badges still show. */}
          {tool.badge && tool.badge !== 'free' && tool.badge !== 'paid' && (
            <span className={`th-badge th-badge-${tool.badge}`}>{BADGE_LABELS[tool.badge]}</span>
          )}
        </div>
        <p className="th-card-desc">{tool.desc}</p>
      </div>
      {!disabled && <span className="th-card-arrow" aria-hidden="true">→</span>}
    </Link>
  );
}

export default function ToolHubClient({ accent, icon, title, subtitle, sections }) {
  const showNav = sections.length > 1;

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'var(--cvt-color-bg)' }}>
      {/* dangerouslySetInnerHTML, not a JSX text child: react-dom/server HTML-escapes
          text children (e.g. ' -> &#x27;) but <style> is a raw-text element per the
          HTML spec, so the browser never decodes that entity back — a guaranteed
          hydration mismatch for any rule here with a quote character, like
          .th-badge::before's content: ''. dangerouslySetInnerHTML sets raw HTML
          identically on the server and the client, so there's nothing to mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .page-inner { width: 100%; padding: 0 var(--cvt-space-page-x); }

        .th-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .th-nav-btn {
          padding: 7px 15px; border-radius: var(--cvt-radius-pill); border: 1px solid var(--cvt-color-rule); background: var(--cvt-color-surface);
          color: var(--cvt-color-ink-muted); font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .th-nav-btn:hover { color: ${accent.accentText}; border-color: ${accent.borderColor}; background: ${accent.pageBgTop}; }
        .th-nav-btn:active { transform: translateY(1px); }

        .th-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .th-card {
          position: relative; display: flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: var(--cvt-radius-xl);
          border: 1px solid var(--cvt-color-rule); background: var(--cvt-color-surface-raised); text-decoration: none;
          box-shadow: var(--cvt-shadow-sm);
        }
        .th-card:hover {
          transform: translateY(-2px); background: var(--cvt-color-surface); border-color: ${accent.borderColor};
          box-shadow: var(--cvt-shadow-md);
        }
        .th-card:hover .th-card-arrow { opacity: 1; transform: translateX(0); }
        .th-card-icon {
          font-size: 1.3rem; flex-shrink: 0; line-height: 1; width: 40px; height: 40px; border-radius: var(--cvt-radius-md);
          display: flex; align-items: center; justify-content: center; background: var(--cvt-color-surface-tint);
        }
        .th-card-art {
          flex-shrink: 0; width: 56px; height: 56px; border-radius: var(--cvt-radius-lg); overflow: hidden;
          display: flex; align-items: center; justify-content: center; background: var(--cvt-color-surface-tint);
          border: 1px solid rgba(15, 23, 42, 0.06); box-shadow: var(--cvt-shadow-xs);
        }
        .th-card-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .th-card-body { flex: 1; min-width: 0; padding-right: 14px; }
        .th-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .th-card-title { font-size: 0.9rem; font-weight: 700; color: var(--cvt-color-ink); }
        .th-card-desc { font-size: 0.78rem; color: var(--cvt-color-ink-muted); line-height: 1.45; margin: 0; }
        .th-card-arrow { position: absolute; right: 16px; top: 18px; color: ${accent.accentText}; font-size: 0.9rem; opacity: 0; transform: translateX(-4px); transition: all 0.18s ease; }
        .th-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.63rem; font-weight: 700; letter-spacing: 0.02em; color: var(--cvt-color-ink-muted); white-space: nowrap; }
        .th-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .th-badge-free { color: ${accent.accentText}; }
        .th-badge-paid { color: var(--cvt-color-warning); }
        .th-badge-soon { color: var(--cvt-color-ink-soft); }
        .th-badge-new { color: var(--cvt-color-primary); }
        .th-badge-popular { color: var(--cvt-color-warning); }
        .th-card-soon { cursor: default; }
        .th-card-soon .th-card-icon { background: var(--cvt-color-surface-tint); filter: grayscale(0.4); opacity: 0.7; }
        .th-card-soon .th-card-art { filter: grayscale(0.35); opacity: 0.72; }
        .th-card-soon .th-card-title { color: var(--cvt-color-ink-soft); }
        .th-card-soon .th-card-desc { color: #B0B8C4; }
        .th-card-soon:hover {
          transform: none; background: var(--cvt-color-surface-raised); border-color: var(--cvt-color-rule);
          box-shadow: var(--cvt-shadow-sm);
        }

        .th-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; scroll-margin-top: 24px; font-size: 1.05rem; font-weight: 700; color: var(--cvt-color-ink); }

        .th-header-icon { width: 46px; height: 46px; border-radius: var(--cvt-radius-lg); background: ${accent.gradient}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: var(--cvt-shadow-sm); font-size: 1.3rem; }

        @media (max-width: 860px) {
          .th-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .page-inner { padding: 0 var(--cvt-space-page-x); }
          .th-grid { grid-template-columns: 1fr; }
          .th-card-art { width: 48px; height: 48px; border-radius: var(--cvt-radius-md); }
        }
      ` }} />

      <div style={{ background: 'var(--cvt-color-surface)', borderBottom: '1px solid var(--cvt-color-rule)', padding: '20px 0 16px' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.78rem', color: accent.accentText, textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="th-header-icon" aria-hidden="true">{icon}</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.3rem, 2.6vw, 1.7rem)', fontWeight: 800, color: 'var(--cvt-color-ink)', margin: 0 }}>{title}</h1>
              <p style={{ fontSize: '0.86rem', color: 'var(--cvt-color-ink-muted)', margin: '2px 0 0' }}>{subtitle}</p>
            </div>
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

      <div className="page-inner" style={{ paddingTop: 18, paddingBottom: 56 }}>
        {sections.map((s) => (
          <div key={s.id} style={{ marginBottom: 28 }}>
            <h2 id={s.id} className="th-section-title">{s.icon} {s.label}</h2>
            <div className="th-grid">
              {s.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} accent={accent} />)}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
