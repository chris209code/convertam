export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 560 340"
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="Illustration of a document converting between formats"
    >
      {/* back document */}
      <g transform="rotate(-8 230 170)">
        <rect x="150" y="70" width="160" height="200" rx="16" fill="#3a63b8" fillOpacity="0.10" stroke="#3a63b8" strokeWidth="2" />
      </g>

      {/* front document */}
      <g transform="rotate(6 330 170)">
        <rect x="250" y="70" width="160" height="200" rx="16" fill="#fffefb" stroke="#e2dcc9" strokeWidth="2" />
        <path d="M 370 70 L 410 70 L 410 110 Z" fill="#e2962c" fillOpacity="0.85" />
        <rect x="270" y="112" width="100" height="8" rx="4" fill="#d8d2bd" />
        <rect x="270" y="130" width="80" height="8" rx="4" fill="#d8d2bd" />
        <rect x="270" y="148" width="90" height="8" rx="4" fill="#d8d2bd" />
        <rect x="270" y="180" width="100" height="60" rx="4" fill="none" stroke="#d8d2bd" strokeWidth="1.5" />
        <line x1="270" y1="200" x2="370" y2="200" stroke="#d8d2bd" strokeWidth="1.5" />
        <line x1="270" y1="220" x2="370" y2="220" stroke="#d8d2bd" strokeWidth="1.5" />
        <line x1="303" y1="180" x2="303" y2="240" stroke="#d8d2bd" strokeWidth="1.5" />
        <line x1="336" y1="180" x2="336" y2="240" stroke="#d8d2bd" strokeWidth="1.5" />
      </g>

      {/* conversion loop icon */}
      <g transform="translate(280,170)">
        <circle r="32" fill="#fffefb" stroke="#e2962c" strokeWidth="2.5" />
        <path d="M -14,-7 A 16 16 0 1 1 -14,7" fill="none" stroke="#e2962c" strokeWidth="3" strokeLinecap="round" />
        <polygon points="-14,-15 -6,-7 -19,-3" fill="#e2962c" />
        <path d="M 14,7 A 16 16 0 1 1 14,-7" fill="none" stroke="#e2962c" strokeWidth="3" strokeLinecap="round" />
        <polygon points="14,15 6,7 19,3" fill="#e2962c" />
      </g>

      {/* scattered format chips */}
      <g transform="translate(56,36) rotate(-8)">
        <rect width="64" height="28" rx="6" fill="#fffefb" stroke="#3a63b8" strokeWidth="1.5" />
        <text x="32" y="19" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#3a63b8" fontWeight="600">PDF</text>
      </g>
      <g transform="translate(434,26) rotate(10)">
        <rect width="74" height="28" rx="6" fill="#fffefb" stroke="#3a63b8" strokeWidth="1.5" />
        <text x="37" y="19" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#3a63b8" fontWeight="600">DOCX</text>
      </g>
      <g transform="translate(38,252) rotate(6)">
        <rect width="62" height="28" rx="6" fill="#fffefb" stroke="#2f8f5b" strokeWidth="1.5" />
        <text x="31" y="19" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#2f8f5b" fontWeight="600">XLS</text>
      </g>
      <g transform="translate(452,250) rotate(-10)">
        <rect width="62" height="28" rx="6" fill="#fffefb" stroke="#e2962c" strokeWidth="1.5" />
        <text x="31" y="19" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#e2962c" fontWeight="600">JPG</text>
      </g>

      {/* stamp */}
      <g transform="translate(196,292) rotate(-4)">
        <rect width="168" height="32" rx="6" fill="none" stroke="#e2962c" strokeWidth="2.5" />
        <text x="84" y="21" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#e2962c" fontWeight="700" letterSpacing="2">
          CONVERTED
        </text>
      </g>
    </svg>
  );
}
