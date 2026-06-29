'use client';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      width: '100%',
      background: '#F8FBFF',
      borderTop: '1px solid #E5EDF8',
      padding: '48px 0 32px',
    }}>
      <style>{`
        .footer-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        @media (max-width: 768px) {
          .footer-inner { padding: 0 24px; }
        }
      `}</style>

      <div className="footer-inner">

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam" style={{ height: '40px', width: 'auto', marginBottom: '12px' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            No login. No nonsense.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <a href="https://paystack.com/pay/convertam-donate"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '99px',
              fontSize: '0.85rem', fontWeight: 600,
              background: '#EFF6FF', color: '#2563EB',
              border: '1px solid #BFDBFE', textDecoration: 'none',
            }}>
            ❤️ Support Convertam
          </a>
          <button
            onClick={() => {
              const widget = document.querySelector('[aria-label="Give feedback"]');
              if (widget) widget.click();
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '99px',
              fontSize: '0.85rem', fontWeight: 600,
              background: '#FFFBEB', color: '#D97706',
              border: '1px solid #FDE68A', cursor: 'pointer',
            }}>
            💡 Suggest a Tool
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {[
            { label: 'About', href: '/about', internal: true },
            { label: 'Privacy Policy', href: '/about', internal: true },
            { label: 'Contact', href: 'mailto:okekechris24@yahoo.com', internal: false },
            { label: '𝕏 @chrisndz', href: 'https://x.com/chrisndz', internal: false },
          ].map(({ label, href, internal }, i) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {i > 0 && <span style={{ color: '#CBD5E1', fontSize: '0.7rem' }}>·</span>}
              {internal ? (
                <Link href={href} style={{ fontSize: '0.85rem', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
              ) : (
                <a href={href} target={label.includes('𝕏') ? '_blank' : undefined} rel="noopener noreferrer"
                  style={{ fontSize: '0.85rem', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>{label}</a>
              )}
            </span>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #E5EDF8', paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
            convertam.app is free to use. If it&apos;s useful to you, support it by tolerating the ads, or{' '}
            <a href="https://paystack.com/pay/convertam-donate" target="_blank" rel="noopener noreferrer"
              style={{ color: '#2563EB', textDecoration: 'underline' }}>
              leave a tip
            </a>.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '8px' }}>
            © {new Date().getFullYear()} Convertam · Files deleted after processing. We never keep copies.
          </p>
        </div>

      </div>
    </footer>
  );
}
