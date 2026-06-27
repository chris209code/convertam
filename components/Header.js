import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between">

        {/* Logo only — no text */}
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Convertam" className="h-11 w-auto" />
        </Link>

        <div className="flex items-center gap-8">
          <Link href="/#tools"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">
            Tools
          </Link>
          <Link href="/#ai-tools"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">
            AI Tools
          </Link>
          <Link href="/about"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">
            About
          </Link>
          <Link href="/#tools"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            Start Converting
          </Link>
        </div>
      </div>
    </header>
  );
}
