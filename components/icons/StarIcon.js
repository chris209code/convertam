// Shared favorite-tool star glyph — outlined neutral by default, filled
// gold when a tool is saved. Used by the tool-card favorite toggle, the
// "Your Favorite Tools" shortcut row, and the /favorites page.
export default function StarIcon({ filled = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? '#F5B300' : 'none'} stroke={filled ? '#D99400' : 'currentColor'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 16.9l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
    </svg>
  );
}
