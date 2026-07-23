// The Convertam Learn homepage hero scene, ported from a provided design
// package (flat vector, soft dark atmospheric shapes, no gradients/glass/
// 3D on the shapes themselves). Ported from raw SVG into a plain JS/JSX
// component: SVG presentation attributes needed converting from HTML's
// kebab-case (stroke-width, text-anchor) to JSX's required camelCase, and
// this project has no TypeScript config (jsconfig.json, not tsconfig.json).
export default function LearnHeroIllustration({ width = 420 }) {
  const height = width * (340 / 560);
  return (
    <svg width={width} height={height} viewBox="0 0 560 340" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="400" cy="170" rx="190" ry="145" fill="#1E3A5F" opacity="0.35" />
      <ellipse cx="450" cy="210" rx="110" ry="90" fill="#0F172A" opacity="0.25" />

      <g transform="translate(175, 195)">
        <rect x="0" y="42" width="78" height="15" rx="2.5" fill="#059669" />
        <rect x="3" y="44" width="72" height="3.5" fill="#10B981" />
        <rect x="4" y="27" width="74" height="15" rx="2.5" fill="#2563EB" />
        <rect x="7" y="29" width="68" height="3.5" fill="#3B82F6" />
        <rect x="7" y="12" width="70" height="15" rx="2.5" fill="#D97706" />
        <rect x="10" y="14" width="64" height="3.5" fill="#F59E0B" />
      </g>

      <g transform="translate(250, 145)">
        <path d="M0 22 Q42 4 84 22 L84 98 Q42 114 0 98 Z" fill="#E0F2FE" />
        <path d="M84 22 Q126 4 168 22 L168 98 Q126 114 84 98 Z" fill="#DBEAFE" />
        <path d="M78 24 L90 24 L90 100 L78 100 Z" fill="#93C5FD" opacity="0.55" />
        <line x1="16" y1="38" x2="70" y2="38" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="50" x2="64" y2="50" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="62" x2="70" y2="62" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="74" x2="58" y2="74" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="86" x2="66" y2="86" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="100" y1="38" x2="154" y2="38" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="106" y1="50" x2="154" y2="50" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="100" y1="62" x2="148" y2="62" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="106" y1="74" x2="154" y2="74" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="100" y1="86" x2="146" y2="86" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      <g transform="translate(320, 165)">
        <rect x="0" y="0" width="150" height="95" rx="7" fill="#1E293B" />
        <rect x="7" y="7" width="136" height="76" rx="3.5" fill="#0F172A" />
        <g transform="translate(55, 24)">
          <rect x="0" y="0" width="40" height="40" rx="9" fill="#06B6D4" />
          <text x="20" y="28" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="22" fill="white">C</text>
        </g>
        <path d="M-10 95 L160 95 L172 115 L-22 115 Z" fill="#334155" />
        <rect x="-5" y="99" width="160" height="5" rx="1.5" fill="#475569" />
      </g>

      <g transform="translate(480, 210)">
        <path d="M10 32 L36 32 L31 58 L15 58 Z" fill="#EA580C" />
        <rect x="8" y="28" width="30" height="7" rx="2.5" fill="#F97316" />
        <ellipse cx="23" cy="18" rx="9" ry="15" fill="#22C55E" transform="rotate(-18 23 18)" />
        <ellipse cx="14" cy="12" rx="8" ry="13" fill="#16A34A" transform="rotate(-38 14 12)" />
        <ellipse cx="32" cy="14" rx="7" ry="12" fill="#4ADE80" transform="rotate(22 32 14)" />
      </g>

      <g transform="translate(115, 35)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#FEE2E2" />
        <rect x="9" y="9" width="30" height="30" rx="5" fill="#EF4444" />
        <text x="24" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="11" fill="white">PDF</text>
      </g>

      <g transform="translate(295, 18)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#EDE9FE" />
        <rect x="9" y="9" width="30" height="30" rx="5" fill="#7C3AED" />
        <text x="24" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="13" fill="white">AI</text>
      </g>

      <g transform="translate(420, 48)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#DBEAFE" />
        <rect x="9" y="9" width="30" height="30" rx="5" fill="#2563EB" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" fill="white" />
        <rect x="22" y="13" width="7" height="7" rx="1.5" fill="white" />
        <rect x="31" y="13" width="7" height="7" rx="1.5" fill="white" />
        <rect x="13" y="22" width="7" height="7" rx="1.5" fill="white" />
        <rect x="22" y="22" width="7" height="7" rx="1.5" fill="white" />
        <rect x="31" y="22" width="7" height="7" rx="1.5" fill="white" />
        <rect x="13" y="31" width="22" height="5" rx="1.5" fill="white" />
      </g>

      <g transform="translate(490, 125)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#FFEDD5" />
        <rect x="9" y="9" width="30" height="30" rx="5" fill="#F59E0B" />
        <path d="M13 33 L21 20 L27 27 L33 15 L39 33 Z" fill="white" />
        <circle cx="17" cy="17" r="3.5" fill="white" />
      </g>

      <path d="M163 59 Q230 28 295 42" stroke="#64748B" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M343 42 Q380 28 420 72" stroke="#64748B" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M444 96 Q475 115 490 148" stroke="#64748B" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M139 83 Q170 130 250 155" stroke="#64748B" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.45" />
    </svg>
  );
}
