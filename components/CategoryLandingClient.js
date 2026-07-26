'use client';

import { useState } from 'react';
import Link from 'next/link';
import SmartWorkflowPrompt from './smart-workflows/SmartWorkflowPrompt';
import SmartWorkflowStepBanner from './smart-workflows/SmartWorkflowStepBanner';

// Reusable Category Landing Page framework — one layout, driven entirely by
// props, meant to power every category hub (PDF Tools, Business Documents,
// Image Studio, AI Workspace, Calculators, Utilities) without forking the
// page for each one. Only the content passed in changes; the structure and
// design language stay identical everywhere it's used:
//
//   Back to Home -> Title -> Description -> Tool Listings -> FAQ ->
//   Related Categories
//
// Deliberately keeps the "get to the tools fast" philosophy from the plain
// launcher version (no search bar, no single Featured Tool card, no
// Popular Workflows block) — the editorial intro leads straight into the
// tool grid so it's reachable with minimal scrolling.

function ToolCard({ tool, accent }) {
  const disabled = tool.available === false;
  return (
    <Link href={disabled ? '#' : tool.href} className={`th-card${disabled ? ' th-card-soon' : ''}`} aria-disabled={disabled}>
      <span className="th-card-icon" aria-hidden="true" style={disabled ? undefined : { background: accent.badgeFreeBg }}>{tool.icon}</span>
      <div className="th-card-body">
        <div className="th-card-title-row">
          <span className="th-card-title">{tool.title}</span>
          {/* Pricing (free/paid) is deliberately never shown here — only inside
              the tool itself — so the category grid stays about discovery,
              not evaluation. Functional/discovery badges still show. */}
          {tool.badge && tool.badge !== 'free' && tool.badge !== 'paid' && (
            <span className={`th-badge th-badge-${tool.badge}`}>{{ soon: 'COMING SOON', new: 'NEW', popular: 'POPULAR' }[tool.badge]}</span>
          )}
        </div>
        <p className="th-card-desc">{tool.desc}</p>
      </div>
      {!disabled && <span className="th-card-arrow" aria-hidden="true">→</span>}
    </Link>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cl-faq-item">
      <button type="button" className="cl-faq-q" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <span className="cl-faq-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && <div className="cl-faq-a">{a}</div>}
    </div>
  );
}

export default function CategoryLandingClient({ accent, icon, title, subtitle, editorial, sections, faqs, relatedCategories }) {
  const showNav = sections.length > 1;

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* dangerouslySetInnerHTML, not a JSX text child: react-dom/server HTML-escapes
          text children (e.g. ' -> &#x27;) but <style> is a raw-text element per the
          HTML spec, so the browser never decodes that entity back — a guaranteed
          hydration mismatch for any rule here with a quote character. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .page-inner { width: 100%; padding: 0 4%; }

        .th-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .th-nav-btn {
          padding: 7px 15px; border-radius: 999px; border: 1.5px solid #E5E7EB; background: white;
          color: #475569; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .th-nav-btn:hover { color: ${accent.accentText}; border-color: ${accent.borderColor}; background: ${accent.pageBgTop}; }

        .th-header-icon { width: 46px; height: 46px; border-radius: 14px; background: ${accent.gradient}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 20px ${accent.shadowTint}; font-size: 1.3rem; }

        .cl-section-label { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #94A3B8; margin: 0 0 8px; }

        .th-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .th-card {
          position: relative; display: flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: 16px;
          border: 1px solid #EEF1F5; background: #FEFEFE; text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.06);
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
        }
        .th-card:hover {
          transform: translateY(-3px); background: #FFFFFF; border-color: ${accent.borderColor};
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.06), 0 18px 36px rgba(15,23,42,0.10);
        }
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
        .th-card-soon:hover {
          transform: none; background: #FEFEFE; border-color: #EEF1F5;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.06);
        }

        .th-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; scroll-margin-top: 24px; font-size: 1.05rem; font-weight: 700; color: #152238; }

        .cl-faq-list { display: flex; flex-direction: column; gap: 10px; max-width: 100%; }
        .cl-faq-item { border: 1.5px solid #EEF0F3; border-radius: 12px; background: white; overflow: hidden; }
        .cl-faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 14px 16px; background: none; border: none; text-align: left; cursor: pointer;
          font-family: inherit; font-size: 0.86rem; font-weight: 600; color: #0F172A;
        }
        .cl-faq-chevron { color: #94A3B8; transition: transform 0.2s ease; flex-shrink: 0; }
        .cl-faq-a { padding: 0 16px 14px; font-size: 0.82rem; color: #64748B; line-height: 1.55; }
        .cl-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }

        .cl-related-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .cl-related-card {
          border: 1px solid #EEF1F5; border-radius: 14px; padding: 16px; background: #FEFEFE;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.05);
          text-decoration: none; transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease;
          display: flex; flex-direction: column; gap: 8px;
        }
        .cl-related-card:hover {
          transform: translateY(-3px); background: #FFFFFF;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.06), 0 16px 32px rgba(15,23,42,0.09);
        }
        .cl-related-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .cl-related-title { font-size: 0.86rem; font-weight: 700; color: #0F172A; margin: 0; }
        .cl-related-desc { font-size: 0.76rem; color: #64748B; margin: 0; line-height: 1.4; }
        .cl-related-cta { font-size: 0.76rem; font-weight: 700; margin-top: auto; }

        .cl-editorial { display: grid; grid-template-columns: 1.6fr 1fr; gap: 28px; margin-bottom: 18px; align-items: start; }
        .cl-editorial-intro p { font-size: 0.88rem; color: #334155; line-height: 1.65; margin: 0 0 12px; }
        .cl-editorial-intro p:last-child { margin-bottom: 0; }
        .cl-editorial-side { display: flex; flex-direction: column; gap: 16px; }
        .cl-editorial-card { border: 1px solid #EEF1F5; border-radius: 14px; padding: 14px 16px; background: #FEFEFE; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04); }
        .cl-editorial-card h3 { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #94A3B8; margin: 0 0 10px; }
        .cl-whofor-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
        .cl-whofor-list li { font-size: 0.8rem; color: #334155; line-height: 1.4; padding-left: 18px; position: relative; }
        .cl-whofor-list li::before { content: '✓'; position: absolute; left: 0; color: ${accent.accentText}; font-weight: 700; }
        .cl-learn-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .cl-learn-link { font-size: 0.8rem; font-weight: 600; text-decoration: none; color: #0F172A; display: block; line-height: 1.4; }
        .cl-learn-link:hover { color: ${accent.accentText}; text-decoration: underline; }

        @media (max-width: 1024px) {
          .cl-related-grid { grid-template-columns: repeat(3, 1fr); }
          .cl-editorial { grid-template-columns: 1fr; }
        }
        @media (max-width: 860px) {
          .th-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .page-inner { padding: 0 5%; }
          .th-grid { grid-template-columns: 1fr; }
          .cl-faq-grid { grid-template-columns: 1fr; }
          .cl-related-grid { grid-template-columns: repeat(2, 1fr); }
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

      <div className="page-inner" style={{ padding: '10px 4% 56px' }}>

        <SmartWorkflowStepBanner />
        <SmartWorkflowPrompt />

        {editorial && (
          <div className="cl-editorial">
            <div className="cl-editorial-intro">
              {editorial.intro.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="cl-editorial-side">
              {editorial.whoFor && editorial.whoFor.length > 0 && (
                <div className="cl-editorial-card">
                  <h3>Who This Is For</h3>
                  <ul className="cl-whofor-list">
                    {editorial.whoFor.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {editorial.learnLinks && editorial.learnLinks.length > 0 && (
                <div className="cl-editorial-card">
                  <h3>From the Learn Center</h3>
                  <ul className="cl-learn-list">
                    {editorial.learnLinks.map((l) => (
                      <li key={l.href}><Link href={l.href} className="cl-learn-link">{l.title} →</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="cl-section-label">All {title}</p>
        {sections.map((s) => (
          <div key={s.id} style={{ marginBottom: 28 }}>
            <h2 id={s.id} className="th-section-title">{s.icon} {s.label}</h2>
            <div className="th-grid">
              {s.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} accent={accent} />)}
            </div>
          </div>
        ))}

        {faqs && faqs.length > 0 && (
          <div style={{ marginBottom: 36, marginTop: 40 }}>
            <p className="cl-section-label">Frequently Asked Questions</p>
            <div className="cl-faq-grid">
              {faqs.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </div>
        )}

        {relatedCategories && relatedCategories.length > 0 && (
          <div>
            <p className="cl-section-label">Explore Related Categories</p>
            <div className="cl-related-grid">
              {relatedCategories.map((c) => (
                <Link key={c.slug} href={c.href} className="cl-related-card">
                  <span className="cl-related-icon" style={{ background: c.badgeBg }}>{c.icon}</span>
                  <p className="cl-related-title">{c.title}</p>
                  <p className="cl-related-desc">{c.desc}</p>
                  <span className="cl-related-cta" style={{ color: c.accentText }}>Explore →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
