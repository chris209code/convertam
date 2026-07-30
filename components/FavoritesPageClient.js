'use client';

import Link from 'next/link';
import { ToolCard } from './CategoryLandingClient';
import { useFavoriteTools } from '../lib/favoriteTools';
import { getToolCards } from '../lib/allToolCards';
import StarIcon from './icons/StarIcon';

export default function FavoritesPageClient() {
  const { slugs, isFavorite, toggle } = useFavoriteTools();
  const tools = getToolCards(slugs);

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fav-page-inner { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 4%; }

        .fav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, 1fr)); gap: 12px; }
        .th-card {
          position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 15px; border-radius: 16px;
          max-width: 340px; width: 100%; margin: 0 auto;
          border: 1px solid #EEF1F5; background: #FEFEFE; text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.06);
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
        }
        .th-card:hover {
          transform: translateY(-3px); background: #FFFFFF; border-color: var(--card-border, #E2E8F0);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.06), 0 18px 36px rgba(15,23,42,0.10);
        }
        .th-card:hover .th-card-arrow { opacity: 1; transform: translateY(-50%) translateX(0); }
        .th-card-icon {
          font-size: 1.2rem; flex-shrink: 0; line-height: 1; width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; background: #F1F5F9;
        }
        .th-card-body { flex: 1; min-width: 0; padding-right: 30px; }
        .th-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .th-card-title { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
        .th-card-desc { font-size: 0.77rem; color: #64748B; line-height: 1.42; margin: 0; }
        .th-card-arrow {
          position: absolute; right: 14px; top: 50%; color: var(--card-accent, #2563EB); font-size: 0.9rem;
          opacity: 0; transform: translateY(-50%) translateX(-4px); transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .th-card-fav {
          position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 7px; z-index: 2;
          display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0;
          color: #B9C2CF; cursor: pointer; transition: color 0.18s ease, background 0.18s ease, transform 0.12s ease;
        }
        .th-card-fav:hover { color: #94A3B8; background: #F1F5F9; }
        .th-card-fav:active { transform: scale(0.9); }
        .th-card-fav:focus-visible { outline: 2px solid var(--card-accent, #2563EB); outline-offset: 1px; }
        .th-card-fav-active { color: #F5B300; }
        .th-card-fav-active:hover { color: #D99400; background: #FEF3C7; }
        .th-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.63rem; font-weight: 700; letter-spacing: 0.02em; color: #64748B; white-space: nowrap; }
        .th-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .th-badge-free { color: var(--card-accent, #2563EB); }
        .th-badge-paid { color: #B45309; }
        .th-badge-new { color: #2563EB; }
        .th-badge-popular { color: #B45309; }

        .fav-empty {
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
          padding: 64px 20px; border: 1.5px dashed #E2E8F0; border-radius: 18px; background: #FEFEFE;
        }
        .fav-empty-icon {
          width: 56px; height: 56px; border-radius: 16px; background: #FEF3C7; color: #D99400;
          display: flex; align-items: center; justify-content: center; margin-bottom: 6px;
        }
        .fav-empty h2 { font-size: 1.15rem; font-weight: 800; color: #152238; margin: 0; }
        .fav-empty p { font-size: 0.88rem; color: #64748B; margin: 0; max-width: 360px; }
        .fav-browse-btn {
          margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 999px;
          background: #152238; color: white; font-size: 0.86rem; font-weight: 700; text-decoration: none;
          transition: transform 0.18s ease, background 0.18s ease;
        }
        .fav-browse-btn:hover { background: #0B1220; transform: translateY(-2px); }

        @media (max-width: 640px) {
          .fav-page-inner { padding: 0 5%; }
          .fav-grid { grid-template-columns: 1fr; }
          .th-card { max-width: none; }
        }
      ` }} />

      <div style={{ background: 'white', borderBottom: '1px solid #EEF0F3', padding: '20px 0 16px' }}>
        <div className="fav-page-inner">
          <Link href="/" style={{ fontSize: '0.78rem', color: '#2563EB', textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#F5B300,#D99400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 20px rgba(217,148,0,0.28)' }}>
              <StarIcon filled size={22} />
            </span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.3rem, 2.6vw, 1.7rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Your Favorite Tools</h1>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '2px 0 0' }}>Quick access to the Convertam tools you use most.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fav-page-inner" style={{ padding: '24px 4% 56px' }}>
        {tools.length === 0 ? (
          <div className="fav-empty">
            <span className="fav-empty-icon"><StarIcon size={26} /></span>
            <h2>No favorite tools yet</h2>
            <p>Select the star on any tool to save it here for quick access.</p>
            <Link href="/" className="fav-browse-btn">Browse all tools</Link>
          </div>
        ) : (
          <div className="fav-grid">
            {tools.map((tool) => (
              <ToolCard
                key={tool.slug}
                tool={tool}
                accent={tool.accent}
                isFavorite={isFavorite(tool.slug)}
                onToggleFavorite={toggle}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
