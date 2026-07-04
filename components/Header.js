'use client';
import Link from 'next/link';
import { useState } from 'react';

const CATEGORIES = [
  { slug: 'pdf-tools', icon: '📄', title: 'PDF Tools' },
  { slug: 'business', icon: '🧾', title: 'Business Tools' },
  { slug: 'ai-tools', icon: '🤖', title: 'AI Tools' },
  { slug: 'image-tools', icon: '🖼️', title: 'Image Tools' },
  { slug: 'calculator', icon: '🧮', title: 'Calculators' },
  { slug: 'utilities', icon: '⚙️', title: 'Utilities' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <header style={{
      width: '100%',
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <style>{`
        .nav-links { display: flex; align-items: center; gap: 24px; }
        .nav-link { font-size: 0.875rem; font-weight: 500; color: #6B7280; text-decoration: none; }
        .nav-link:hover { color: #111827; }
        .nav-cta {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 600; padding: 10px 20px;
          border-radius: 12px; color: white; text-decoration: none;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .tools-dropdown-btn {
          font-size: 0.875rem; font-weight: 500; color: #6B7280;
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          font-family: inherit; padding: 0;
        }
        .tools-dropdown-btn:hover { color: #111827; }
        .dropdown-wrapper { position: relative; }
        .dropdown-menu {
          position: absolute; top: calc(100% + 12px); left: 50%;
          transform: translateX(-50%);
          background: white; border-radius: 16px;
          box-shadow: 0 20px 48px rgba(0,0,0,0.12);
          border: 1px solid #E5E7EB;
          padding: 8px; min-width: 220px;
          z-index: 100;
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          text-decoration: none; color: #374151;
          font-size: 0.875rem; font-weight: 500;
          transition: background 0.15s ease;
        }
        .dropdown-item:hover { background: #F3F4F6; color: #111827; }
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
        .mobile-section-title {
          font-size: 0.7rem; font-weight: 700; color: #9CA3AF;
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 8px 0 4px;
        }
        .mobile-nav-link {
          font-size: 0.95rem; font-weight: 500; color: #374151;
          text-decoration: none; padding: 10px 0;
          border-bottom: 1px solid #F3F4F6;
          display: flex; align-items: center; gap: 8px;
        }
        .mobile-nav-link:last-child { border-bottom: none; }
        .mobile-cta {
          display: flex; align-items: center; justify-content: center;
          margin-top: 8px; padding: 14px; border-radius: 12px;
          color: white; text-decoration: none;
          font-size: 0.95rem; font-weight: 700;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
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

        {/* Desktop nav */}
        <div className="nav-links">
          <Link href="/" className="nav-link">Home</Link>

          {/* Tools dropdown */}
          <div className="dropdown-wrapper"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}>
            <button className="tools-dropdown-btn">
              Tools ▾
            </button>
            {toolsOpen && (
              <div className="dropdown-menu">
                {CATEGORIES.map(({ slug, icon, title }) => (
                  <Link key={slug} href={`/${slug}`} className="dropdown-item"
                    onClick={() => setToolsOpen(false)}>
                    <span>{icon}</span>
                    <span>{title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/about" className="nav-link">Our Story</Link>
          <Link href="/" className="nav-cta">🚀 Start Free</Link>
        </div>

        {/* Mobile menu button */}
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-section-title">Categories</div>
        {CATEGORIES.map(({ slug, icon, title }) => (
          <Link key={slug} href={`/${slug}`} className="mobile-nav-link"
            onClick={() => setMenuOpen(false)}>
            <span>{icon}</span>
            <span>{title}</span>
          </Link>
        ))}
        <div className="mobile-section-title" style={{ marginTop: '8px' }}>More</div>
        <Link href="/about" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
          Our Story
        </Link>
        <Link href="/" className="mobile-cta" onClick={() => setMenuOpen(false)}>
          🚀 Start Free
        </Link>
      </div>
    </header>
  );
}
