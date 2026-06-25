'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="text-center py-10 px-5">
      <p className="font-display font-semibold text-ink mb-4" style={{ fontSize: '15px' }}>
        No login. No nonsense.
      </p>
      <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
        <a
          href="https://paystack.com/pay/convertam-donate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: '#f0f5ff', color: '#3a63b8', border: '1px solid #3a63b8' }}
        >
          ❤️ Support Convertam
        </a>
        <button
          onClick={() => {
            const widget = document.querySelector('[aria-label="Give feedback"]');
            if (widget) widget.click();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: '#fffefb', color: '#e2962c', border: '1px solid #e2dcc9' }}
        >
          💡 Suggest a Tool
        </button>
      </div>
      <div className="flex items-center justify-center gap-4 mb-3 font-mono text-xs text-ink-soft flex-wrap">
        <Link href="/about" className="underline text-stamp-blue">About</Link>
        <span>·</span>
        <Link href="/about" className="underline text-stamp-blue">Privacy Policy</Link>
        <span>·</span>
        <a href="mailto:okekechris24@yahoo.com" className="inline-flex items-center gap-1.5 underline text-stamp-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a63b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          Contact
        </a>
        <span>·</span>
        <a href="https://x.com/chrisndz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline text-stamp-blue">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#3a63b8">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          @chrisndz
        </a>
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
