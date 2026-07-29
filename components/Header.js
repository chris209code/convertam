'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      width: '100%',
      background: 'rgba(255,255,255,0.94)',
      borderBottom: '1px solid var(--cvt-color-rule)',
      boxShadow: 'var(--cvt-shadow-xs)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <style>{`
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-link { font-size: 0.875rem; font-weight: 600; color: var(--cvt-color-ink-muted); text-decoration: none; padding: 8px 2px; border-radius: var(--cvt-radius-xs); }
        .nav-link:hover { color: var(--cvt-color-ink); }
        .menu-btn {
          display: none;
          background: var(--cvt-color-primary-soft); border: 1px solid var(--cvt-color-primary-rule);
          color: var(--cvt-color-primary); font-size: 0.875rem; font-weight: 700;
          padding: 8px 16px; border-radius: var(--cvt-radius-md); cursor: pointer;
        }
        .menu-btn:hover { background: #DBEAFE; border-color: #93C5FD; }
        .menu-btn:active { transform: translateY(1px); }
        .mobile-menu {
          display: none; flex-direction: column;
          background: var(--cvt-color-surface); border-top: 1px solid var(--cvt-color-rule);
          padding: 12px 5% 16px; gap: 2px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-nav-link {
          font-size: 0.95rem; font-weight: 600; color: var(--cvt-color-ink-muted);
          text-decoration: none; padding: 11px 10px;
          border-bottom: 1px solid #F3F6FA;
          border-radius: var(--cvt-radius-sm);
          display: flex; align-items: center; gap: 8px;
        }
        .mobile-nav-link:hover { background: var(--cvt-color-bg-soft); color: var(--cvt-color-ink); }
        .mobile-nav-link:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .menu-btn { display: block; }
        }
      `}</style>

      <div style={{
        width: '100%', padding: '0 var(--cvt-space-page-x)', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam" style={{ height: '44px', width: 'auto', display: 'block' }} />
        </Link>

        {/* Desktop nav — deliberately just Home/Learn/Our Story; every tool
            and category is still reachable from the homepage grid, the
            footer, and internal links throughout the site, so this stays
            a simple, uncluttered nav rather than a dropdown mega-menu. */}
        <div className="nav-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/learn" className="nav-link">Learn</Link>
          <Link href="/about" className="nav-link">Our Story</Link>
        </div>

        {/* Mobile menu button */}
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
        <Link href="/learn" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
          📚 Learn
        </Link>
        <Link href="/about" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
          Our Story
        </Link>
      </div>
    </header>
  );
}
