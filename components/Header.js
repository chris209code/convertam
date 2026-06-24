import Link from 'next/link';

export default function Header() {
  return (
    <header>
      <div className="flex items-center justify-between max-w-6xl mx-auto px-5 md:px-10 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam logo" width="30" height="30" style={{ borderRadius: '8px' }} />
          <span className="font-display font-bold text-xl">
            convertam<span className="text-stamp-amber">.</span>app
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium" style={{ color: '#2f8f5b' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f8f5b', display: 'inline-block' }}></span>
            All services operational
          </span>
          <Link href="/about" className="text-xs text-ink-soft hover:text-ink transition-colors hidden sm:block">
            About & Privacy
          </Link>
        </div>
      </div>
    </header>
  );
}
