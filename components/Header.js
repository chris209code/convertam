'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      width: '100%',
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <style>{`
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-link { font-size: 0.875rem; font-weight: 500; color: #6B7280; text-decoration: none; }
        .nav-link:hover { color: #111827; }
        .menu-btn {
          display: none;
          background: #EBF3FF; border: 1px solid #BFDBFE;
          color: #2563EB; font-size: 0.875rem; font-weight: 700;
          padding: 8px 16px; border-radius: 10px; cursor: pointer;
        }
        .mobile-menu {
          display: none; flex-direction: column;
          background: white; border-top: 1px solid #E5E7EB;
          padding: 16px 5%; gap: 4px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-nav-link {
          font-size: 0.95rem; font-weight: 500; color: #374151;
          text-decoration: none; padding: 10px 0;
          border-bottom: 1px solid #F3F4F6;
          display: flex; align-items: center; gap: 8px;
        }
        .mobile-nav-link:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .menu-btn { display: block; }
        }
      `}</style>

      <div style={{
        width: '100%', padding: '0 4%', height: '64px',
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
