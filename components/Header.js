import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex items-center justify-between max-w-6xl mx-auto px-5 md:px-10 pt-6">
      <Link href="/" className="font-display font-bold text-xl">
        convertam<span className="text-stamp-amber">.</span>app
      </Link>
      <span className="hidden sm:block font-mono text-xs text-ink-soft tracking-wide">
        FREE · NO SIGN-UP
      </span>
    </header>
  );
}
