'use client';

import Link from 'next/link';

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

export default function ToolHubClient({ accent, icon, title, subtitle, sections }) {
  const showNav = sections.length > 1;

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

        .th-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .th-nav-btn {
          padding: 7px 15px; border-radius: 999px; border: 1.5px solid #E5E7EB; background: white;
          color: #475569; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .th-nav-btn:hover { color: ${accent.accentText}; border-color: ${accent.borderColor}; background: ${accent.pageBgTop}; }

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

        .th-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; scroll-margin-top: 24px; font-size: 1.05rem; font-weight: 700; color: #152238; }

        .th-header-icon { width: 46px; height: 46px; border-radius: 14px; background: ${accent.gradient}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 20px ${accent.shadowTint}; font-size: 1.3rem; }

        @media (max-width: 860px) {
          .th-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .page-inner { padding: 0 5%; }
          .th-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      <div style={{ background: 'white', borderBottom: '1px solid #EEF0F3', padding: '20px 0 16px' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.78rem', color: accent.accentText, textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="th-header-icon" aria-hidden="true">{icon}</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.3rem, 2.6vw, 1.7rem)', fontWeight: 800, color: '#152238', margin: 0 }}>{title}</h1>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '2px 0 0' }}>{subtitle}</p>
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

      <div className="page-inner" style={{ padding: '18px 4% 56px' }}>
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
