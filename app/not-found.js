import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{
      width: '100%',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)',
      padding: '40px 20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>

        {/* Big 404 */}
        <div style={{
          fontSize: 'clamp(5rem, 15vw, 8rem)',
          fontWeight: 900,
          color: '#2563EB',
          lineHeight: 1,
          marginBottom: '16px',
          opacity: 0.15,
        }}>
          404
        </div>

        {/* Icon */}
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>

        <h1 style={{
          fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
          fontWeight: 800,
          color: '#152238',
          marginBottom: '12px',
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#64748B',
          lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          The page you are looking for doesn&apos;t exist or may have been moved.
          Head back to the homepage and find the tool you need.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: 700,
            color: 'white', textDecoration: 'none',
            background: '#2563EB',
            boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
          }}>
            🏠 Back to Homepage
          </Link>
          <Link href="/#tools" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: 600,
            color: '#2563EB', textDecoration: 'none',
            background: 'white', border: '1.5px solid #BFDBFE',
          }}>
            🛠️ Browse Tools
          </Link>
        </div>

      </div>
    </main>
  );
}
