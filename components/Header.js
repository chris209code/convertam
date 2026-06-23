import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Header() {
  return (
    <header className="flex items-center justify-between max-w-6xl mx-auto px-5 md:px-10 pt-6">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={28} />
        <span className="font-display font-bold text-xl">
          convertam<span className="text-stamp-amber">.</span>app
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/about" className="text-xs text-ink-soft hover:text-ink transition-colors hidden sm:block">
          About & Privacy
        </Link>
        <span className="hidden sm:block font-mono text-xs text-ink-soft tracking-wide">
          FREE · NO SIGN-UP
        </span>
      </div>
    </header>
  );
}
