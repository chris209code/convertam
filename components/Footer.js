'use client';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      width: '100%',
      background: '#F8FBFF',
      borderTop: '1px solid #E5EDF8',
      padding: '24px 0',
    }}>
      <style>{`
        .footer-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        @media (max-width: 768px) {
          .footer-inner { padding: 0 24px; }
        }
      `}</style>

      <div className="footer-inner">

        {/* All in one compact row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <a href="https://paystack.com/pay/convertam-donate"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '99px',
              fontSize: '0.78rem', fontWeight: 600,
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
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '99px',
              fontSize: '0.78rem', fontWeight: 600,
              background: '#FFFBEB', color: '#D97706',
              border: '1px solid #FDE68A', cursor: 'pointer',
            }}>
            💡 Suggest a Tool
          </button>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[
            { label: 'About', href: '/about', internal: true },
            { label: 'Privacy Policy', href: '/about', internal: true },
            { label: 'Contact', href: 'mailto:okekechris24@yahoo.com', internal: false },
            { label: '𝕏 @chrisndz', href: 'https://x.com/chrisndz', internal: false },
          ].map(({ label, href, internal }, i) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span style={{ color: '#CBD5E1', fontSize: '0.65rem' }}>·</span>}
              {internal ? (
                <Link href={href} style={{ fontSize: '0.78rem', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
              ) : (
                <a href={href} target={label.includes('𝕏') ? '_blank' : undefined} rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>{label}</a>
              )}
            </span>
          ))}
        </div>

        {/* Bottom line */}
        <div style={{ borderTop: '1px solid #E5EDF8', paddingTop: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0 }}>
            convertam.app is free to use. Tolerate the ads or{' '}
            <a href="https://paystack.com/pay/convertam-donate" target="_blank" rel="noopener noreferrer"
              style={{ color: '#2563EB', textDecoration: 'underline' }}>leave a tip</a>.
            {' '}· © {new Date().getFullYear()} Convertam · Files deleted after processing.
          </p>
        </div>

      </div>
    </footer>
  );
}
