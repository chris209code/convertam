import Link from 'next/link';

export default function Header() {
  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam"
            style={{ height: '56px', width: 'auto', display: 'block' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link href="/#tools" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6B7280', textDecoration: 'none' }}>Tools</Link>
          <Link href="/#ai-tools" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6B7280', textDecoration: 'none' }}>AI Tools</Link>
          <Link href="/about" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6B7280', textDecoration: 'none' }}>About</Link>
          <Link href="/#tools" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '0.875rem', fontWeight: 600, padding: '10px 20px',
            borderRadius: '12px', color: 'white', textDecoration: 'none',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            boxShadow: '0 10px 24px rgba(37,99,235,0.25)',
          }}>
            🚀 Start Converting
          </Link>
        </div>
      </div>
    </header>
  );
}
