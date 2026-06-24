import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="text-center py-10 px-5">
      {/* Tagline */}
      <p className="font-display font-semibold text-ink mb-4" style={{ fontSize: '15px' }}>
        No login. No paywalls. No stress.
      </p>

      {/* Support + Suggest */}
      <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
        <a
          href="https://paystack.com/pay/convertam-donate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
          style={{ background: '#f0f5ff', color: '#3a63b8', border: '1px solid #3a63b8' }}
        >
          ❤️ Support Convertam
        </a>
        <button
          onClick={() => {
            const widget = document.querySelector('[aria-label="Give feedback"]');
            if (widget) widget.click();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
          style={{ background: '#fffefb', color: '#e2962c', border: '1px solid #e2dcc9' }}
        >
          💡 Suggest a Tool
        </button>
      </div>

      {/* Links */}
      <div className="flex items-center justify-center gap-4 mb-3 font-mono text-xs text-ink-soft flex-wrap">
        <Link href="/about" className="underline text-stamp-blue">About</Link>
        <span>·</span>
        <Link href="/about" className="underline text-stamp-blue">Privacy Policy</Link>
        <span>·</span>
        <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">Contact</a>
        <span>·</span>
        <a href="https://x.com/chrisndz" target="_blank" rel="noopener noreferrer" className="underline text-stamp-blue">𝕏 @chrisndz</a>
      </div>

      <p className="font-mono text-xs text-ink-soft">
        convertam.app is free to use. If it&apos;s useful to you, support it by tolerating
        the ads, or{' '}
        <a href="https://paystack.com/pay/convertam-donate" target="_blank" rel="noopener noreferrer" className="underline text-stamp-blue">
          leave a tip
        </a>.
      </p>
    </footer>
  );
}
