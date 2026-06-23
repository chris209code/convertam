import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="text-center py-10 px-5 font-mono text-xs text-ink-soft">
      <div className="mb-3">
        <a
          href="https://paystack.com/pay/convertam-donate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
          style={{ background: '#f0f5ff', color: '#3a63b8', border: '1px solid #3a63b8' }}
        >
          ❤️ Support Convertam
        </a>
      </div>
      <div className="flex items-center justify-center gap-4 mb-3">
        <Link href="/about" className="underline text-stamp-blue">About</Link>
        <span>·</span>
        <Link href="/about" className="underline text-stamp-blue">Privacy Policy</Link>
        <span>·</span>
        <a href="mailto:okekechris24@yahoo.com" className="underline text-stamp-blue">Contact</a>
      </div>
      convertam.app is free to use. If it&apos;s useful to you, support it by tolerating
      the ads, or{' '}
      <a href="https://paystack.com/pay/convertam-donate" target="_blank" rel="noopener noreferrer" className="underline text-stamp-blue">
        leave a tip
      </a>
      .
    </footer>
  );
}
