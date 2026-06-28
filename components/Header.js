import Link from 'next/link';

export default function Header() {
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
        .nav-cta {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 600; padding: 10px 20px;
          border-radius: 12px; color: white; text-decoration: none;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
        }
      `}</style>

      <div style={{
        maxWidth: '1600px', margin: '0 auto',
        padding: '0 48px', height: '64px',
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
          <Link href="/#tools" className="nav-cta">
            🚀 Start Converting
          </Link>
        </div>
      </div>
    </header>
  );
}
