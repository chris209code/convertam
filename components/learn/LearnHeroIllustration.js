// The Convertam Learn homepage hero scene — an open book (the "knowledge
// base" idea) flanked by a laptop showing the Convertam mark, with the
// four main category badges (PDF/AI/Calculator/Image) floating on dashed
// connector lines above it, plus a small plant and a stack of closed books
// for warmth. Flat vector shapes with a single soft drop-shadow layer per
// object (not gradients/glass/soft-3D on the shapes themselves) — kept in
// the same 2-3-color-per-shape language as categoryVisuals.js and the
// per-article illustration library, just composed into one larger scene.
export default function LearnHeroIllustration({ width = 420 }) {
  return (
    <svg width={width} height={width * 0.62} viewBox="0 0 420 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lrnHeroShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* connector lines from badges down to the book */}
      <g stroke="#94A3B8" strokeWidth="1.6" strokeDasharray="3 5" fill="none" opacity="0.55">
        <path d="M108 78c-4 20-2 34 14 46" />
        <path d="M196 58v52" />
        <path d="M292 66c8 18 8 34-4 48" />
        <path d="M352 108c10 12 12 24 6 38" />
      </g>

      {/* stack of closed books, bottom-left */}
      <g filter="url(#lrnHeroShadow)">
        <rect x="18" y="196" width="70" height="14" rx="3" fill="#2563EB" />
        <rect x="22" y="184" width="62" height="13" rx="3" fill="#F59E0B" />
        <rect x="26" y="173" width="54" height="12" rx="3" fill="#16A34A" />
      </g>

      {/* potted plant, right of the book */}
      <g filter="url(#lrnHeroShadow)">
        <path d="M366 214c-14-4-22-14-22-28h44c0 14-8 24-22 28z" fill="#16A34A" />
        <path d="M366 214c-8-10-8-24 0-36" stroke="#15803D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M366 190c6-8 16-10 24-6" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M352 214h28l-4 24h-20z" fill="#F1F5F9" />
        <path d="M352 214h28" stroke="#CBD5E1" strokeWidth="2" />
      </g>

      {/* open book, center */}
      <g filter="url(#lrnHeroShadow)">
        <path d="M210 118c-26-10-52-12-78-4v88c26-8 52-6 78 4z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <path d="M210 118c26-10 52-12 78-4v88c-26-8-52-6-78 4z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <path d="M210 118v88" stroke="#CBD5E1" strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={148 - i * 1} y={132 + i * 16} width="50" height="3" rx="1.5" fill="#CBD5E1" opacity={0.9 - i * 0.12} />
            <rect x={222 + i * 1} y={132 + i * 16} width="50" height="3" rx="1.5" fill="#CBD5E1" opacity={0.9 - i * 0.12} />
          </g>
        ))}
      </g>

      {/* laptop with Convertam mark, front-right of the book */}
      <g filter="url(#lrnHeroShadow)">
        <rect x="238" y="150" width="96" height="62" rx="6" fill="#0F172A" />
        <rect x="244" y="156" width="84" height="46" rx="2" fill="#1E293B" />
        <circle cx="286" cy="179" r="14" fill="#2563EB" />
        <path d="M281 179a5 5 0 0 1 8.6-3.4M280.6 182a5 5 0 0 0 8.7 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M226 212l12-10h96l12 10z" fill="#334155" />
        <path d="M226 212h120v4a3 3 0 0 1-3 3H229a3 3 0 0 1-3-3z" fill="#1E293B" />
      </g>

      {/* floating category badges */}
      {[
        { x: 92, y: 48, bg: '#DC2626', label: 'pdf' },
        { x: 178, y: 30, bg: '#7C3AED', label: 'ai' },
        { x: 274, y: 40, bg: '#2563EB', label: 'calc' },
        { x: 342, y: 84, bg: '#EA580C', label: 'img' },
      ].map((b) => (
        <g key={b.label} filter="url(#lrnHeroShadow)">
          <rect x={b.x} y={b.y} width="34" height="34" rx="10" fill={b.bg} />
          {b.label === 'pdf' && <path d="M8 6h13l5 5v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" transform={`translate(${b.x} ${b.y})`} fill="none" stroke="#fff" strokeWidth="2" />}
          {b.label === 'ai' && <path d="M17 7l2.2 6.8L26 16l-6.8 2.2L17 25l-2.2-6.8L8 16l6.8-2.2z" transform={`translate(${b.x - 8} ${b.y - 8})`} fill="#fff" />}
          {b.label === 'calc' && <rect x={b.x + 9} y={b.y + 8} width="16" height="18" rx="2" fill="none" stroke="#fff" strokeWidth="2" />}
          {b.label === 'calc' && <rect x={b.x + 12} y={b.y + 12} width="10" height="3" fill="#fff" />}
          {b.label === 'img' && <rect x={b.x + 7} y={b.y + 9} width="20" height="16" rx="2" fill="none" stroke="#fff" strokeWidth="2" />}
          {b.label === 'img' && <circle cx={b.x + 13} cy={b.y + 14} r="1.8" fill="#fff" />}
          {b.label === 'img' && <path d={`M${b.x + 9} ${b.y + 22}l5-5 3 3 4-5 6 7z`} fill="#fff" opacity="0.8" />}
        </g>
      ))}
    </svg>
  );
}
