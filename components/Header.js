import Link from 'next/link';

export default function Header() {
  return (
    <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      className="sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam" style={{ height: '44px', width: 'auto' }} />
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/#tools" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">Tools</Link>
          <Link href="/#ai-tools" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">AI Tools</Link>
          <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">About</Link>
          <Link href="/#tools"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
            🚀 Start Converting
          </Link>
        </div>
      </div>
    </header>
  );
}
