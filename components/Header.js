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
        .nav-cta {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 600; padding: 10px 20px;
          border-radius: 12px; color: white; text-decoration: none;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .menu-btn {
          display: none;
          background: #EBF3FF;
          border: 1px solid #BFDBFE;
          color: #2563EB;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
        }
        .mobile-menu {
          display: none;
          flex-direction: column;
          background: white;
          border-top: 1px solid #E5E7EB;
          padding: 16px 5%;
          gap: 4px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-nav-link {
          font-size: 0.95rem; font-weight: 500; color: #374151;
          text-decoration: none; padding: 12px 0;
          border-bottom: 1px solid #F3F4F6;
        }
        .mobile-nav-link:last-child { border-bottom: none; }
        .mobile-cta {
          display: flex; align-items: center; justify-content: center;
          margin-top: 8px; padding: 14px;
          border-radius: 12px; color: white; text-decoration: none;
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
        <div className="nav-links">
          <Link href="/#tools" className="nav-link">Tools</Link>
          <Link href="/#ai-tools" className="nav-link">AI Tools</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/#tools" className="nav-cta">🚀 Start Converting</Link>
        </div>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/#tools" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Tools</Link>
        <Link href="/#ai-tools" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>AI Tools</Link>
        <Link href="/about" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>About</Link>
        <Link href="/#tools" className="mobile-cta" onClick={() => setMenuOpen(false)}>🚀 Start Converting</Link>
      </div>
    </header>
  );
}
