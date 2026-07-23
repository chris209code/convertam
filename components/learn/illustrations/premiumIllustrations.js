// Card-corner illustrations for 6 specific Learn guides, sourced from a
// provided design package (flat vector, soft pastel accents, subtle
// layered shadows — no gradients/glass/3D, per that package's style
// rules). Ported from the package's raw SVG markup into plain JS/JSX
// components: SVG presentation attributes needed converting from HTML's
// kebab-case (stroke-width, text-anchor) to JSX's required camelCase
// (strokeWidth, textAnchor), and this project has no TypeScript config
// (jsconfig.json, not tsconfig.json), so these are .js, not .tsx.
//
// Each keeps its native 200x150 (4:3) viewBox rather than being forced
// into the square 88x88 system the rest of components/learn/illustrations
// uses — they're a deliberately more detailed, multi-element scene per
// card, not a single small motif.

export function MergePdfIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#FEE2E2" opacity="0.45" />
      <ellipse cx="100" cy="132" rx="28" ry="5" fill="#FECACA" opacity="0.5" />

      <g transform="translate(22, 28) rotate(-8)">
        <rect x="1" y="2" width="42" height="56" rx="4" fill="#FECACA" opacity="0.6" />
        <rect x="0" y="0" width="42" height="56" rx="4" fill="white" />
        <rect x="0" y="0" width="42" height="12" rx="4" fill="#EF4444" />
        <rect x="0" y="8" width="42" height="4" fill="#EF4444" />
        <text x="21" y="9" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="8" fill="white">PDF</text>
        <line x1="7" y1="22" x2="35" y2="22" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="30" x2="32" y2="30" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="38" x2="35" y2="38" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="46" x2="28" y2="46" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <g transform="translate(79, 12)">
        <rect x="1" y="2" width="42" height="56" rx="4" fill="#FECACA" opacity="0.5" />
        <rect x="0" y="0" width="42" height="56" rx="4" fill="white" />
        <rect x="0" y="0" width="42" height="12" rx="4" fill="#EF4444" />
        <rect x="0" y="8" width="42" height="4" fill="#EF4444" />
        <text x="21" y="9" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="8" fill="white">PDF</text>
        <line x1="7" y1="22" x2="35" y2="22" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="30" x2="32" y2="30" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="38" x2="35" y2="38" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="46" x2="28" y2="46" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <g transform="translate(136, 28) rotate(8)">
        <rect x="1" y="2" width="42" height="56" rx="4" fill="#FECACA" opacity="0.6" />
        <rect x="0" y="0" width="42" height="56" rx="4" fill="white" />
        <rect x="0" y="0" width="42" height="12" rx="4" fill="#EF4444" />
        <rect x="0" y="8" width="42" height="4" fill="#EF4444" />
        <text x="21" y="9" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="8" fill="white">PDF</text>
        <line x1="7" y1="22" x2="35" y2="22" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="30" x2="32" y2="30" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="38" x2="35" y2="38" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="46" x2="28" y2="46" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <path d="M52 70 Q70 95 85 115" stroke="#F87171" strokeWidth="1.8" strokeDasharray="4 3" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M148 70 Q130 95 115 115" stroke="#F87171" strokeWidth="1.8" strokeDasharray="4 3" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M100 68 L100 95" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M93 88 L100 98 L107 88" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      <g transform="translate(79, 100)">
        <rect x="1" y="2" width="42" height="40" rx="4" fill="#FECACA" opacity="0.5" />
        <rect x="0" y="0" width="42" height="40" rx="4" fill="white" stroke="#EF4444" strokeWidth="1.8" />
        <rect x="0" y="0" width="42" height="11" rx="4" fill="#EF4444" />
        <rect x="0" y="7" width="42" height="4" fill="#EF4444" />
        <text x="21" y="8.5" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="8" fill="white">PDF</text>
        <line x1="7" y1="19" x2="35" y2="19" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="26" x2="32" y2="26" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="33" x2="30" y2="33" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function OcrIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#EDE9FE" opacity="0.4" />
      <ellipse cx="140" cy="128" rx="32" ry="5" fill="#C4B5FD" opacity="0.35" />

      <g transform="translate(18, 30) rotate(-5)">
        <rect x="2" y="3" width="58" height="78" rx="5" fill="#DDD6FE" opacity="0.5" />
        <rect x="0" y="0" width="58" height="78" rx="5" fill="#F5F3FF" />
        <rect x="0" y="0" width="58" height="78" rx="5" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
        <path d="M6 6 L14 6 L14 14" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M52 6 L44 6 L44 14" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 72 L14 72 L14 64" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M52 72 L44 72 L44 64" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="10" y1="22" x2="48" y2="22" stroke="#C4B5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <line x1="10" y1="32" x2="44" y2="32" stroke="#C4B5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <line x1="10" y1="42" x2="48" y2="42" stroke="#C4B5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <line x1="10" y1="52" x2="40" y2="52" stroke="#C4B5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <line x1="10" y1="62" x2="46" y2="62" stroke="#C4B5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      </g>

      <path d="M85 72 L108 72" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M100 65 L112 72 L100 79" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <g transform="translate(112, 25)">
        <rect x="2" y="3" width="60" height="82" rx="5" fill="#C4B5FD" opacity="0.35" />
        <rect x="0" y="0" width="60" height="82" rx="5" fill="white" />
        <rect x="0" y="0" width="60" height="82" rx="5" fill="none" stroke="#7C3AED" strokeWidth="1.8" />
        <rect x="32" y="-8" width="32" height="16" rx="5" fill="#7C3AED" />
        <text x="48" y="3.5" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="9" fill="white">OCR</text>
        <line x1="10" y1="22" x2="50" y2="22" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="32" x2="46" y2="32" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="42" x2="50" y2="42" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="52" x2="42" y2="52" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="62" x2="48" y2="62" stroke="#5B21B6" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="10" y="70" width="2.5" height="8" rx="1" fill="#7C3AED" />
      </g>
    </svg>
  );
}

export function InvoiceQuotationIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#D1FAE5" opacity="0.4" />
      <ellipse cx="105" cy="135" rx="55" ry="6" fill="#A7F3D0" opacity="0.4" />

      <g transform="translate(22, 22) rotate(-4)">
        <rect x="2" y="3" width="55" height="75" rx="4" fill="#A7F3D0" opacity="0.45" />
        <rect x="0" y="0" width="55" height="75" rx="4" fill="white" />
        <rect x="0" y="0" width="55" height="14" rx="4" fill="#10B981" />
        <rect x="0" y="10" width="55" height="4" fill="#10B981" />
        <text x="27.5" y="10" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="8" fill="white">INVOICE</text>
        <line x1="8" y1="26" x2="47" y2="26" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="35" x2="42" y2="35" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="44" x2="47" y2="44" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="53" x2="38" y2="53" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="8" y="62" width="22" height="7" rx="2" fill="#D1FAE5" />
      </g>

      <g transform="translate(55, 32) rotate(1)">
        <rect x="2" y="3" width="55" height="75" rx="4" fill="#6EE7B7" opacity="0.35" />
        <rect x="0" y="0" width="55" height="75" rx="4" fill="white" />
        <rect x="0" y="0" width="55" height="14" rx="4" fill="#059669" />
        <rect x="0" y="10" width="55" height="4" fill="#059669" />
        <text x="27.5" y="10" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="7.5" fill="white">QUOTATION</text>
        <line x1="8" y1="26" x2="47" y2="26" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="35" x2="42" y2="35" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="44" x2="47" y2="44" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="53" x2="38" y2="53" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="8" y="62" width="26" height="7" rx="2" fill="#A7F3D0" />
      </g>

      <g transform="translate(90, 40) rotate(3)">
        <rect x="2" y="3" width="55" height="75" rx="4" fill="#34D399" opacity="0.3" />
        <rect x="0" y="0" width="55" height="75" rx="4" fill="white" stroke="#10B981" strokeWidth="1.6" />
        <rect x="0" y="0" width="55" height="14" rx="4" fill="#047857" />
        <rect x="0" y="10" width="55" height="4" fill="#047857" />
        <text x="27.5" y="10" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="7" fill="white">DELIVERY</text>
        <line x1="8" y1="26" x2="47" y2="26" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="35" x2="42" y2="35" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="44" x2="47" y2="44" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="53" x2="38" y2="53" stroke="#6EE7B7" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="8" y="62" width="28" height="7" rx="2" fill="#D1FAE5" />
      </g>

      <g transform="translate(155, 85) rotate(28)">
        <rect x="0" y="0" width="7" height="32" rx="1.5" fill="#1E293B" />
        <rect x="1" y="0" width="5" height="7" rx="1" fill="#F59E0B" />
        <path d="M1.5 32 L3.5 40 L5.5 32 Z" fill="#334155" />
        <rect x="1.5" y="8" width="4" height="2" fill="#475569" />
      </g>
    </svg>
  );
}

export function JpgPngIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#FFEDD5" opacity="0.4" />

      <g transform="translate(22, 28)">
        <rect x="2" y="3" width="68" height="90" rx="8" fill="#FED7AA" opacity="0.4" />
        <rect x="0" y="0" width="68" height="90" rx="8" fill="white" stroke="#FDBA74" strokeWidth="1.5" />
        <rect x="8" y="10" width="52" height="42" rx="4" fill="#FED7AA" />
        <path d="M8 44 L22 26 L32 36 L44 18 L60 44 Z" fill="#FB923C" />
        <circle cx="18" cy="20" r="6" fill="#FBBF24" />
        <rect x="14" y="62" width="40" height="16" rx="5" fill="#F59E0B" />
        <text x="34" y="74" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="11" fill="white">JPG</text>
      </g>

      <g transform="translate(110, 28)">
        <rect x="2" y="3" width="68" height="90" rx="8" fill="#FED7AA" opacity="0.4" />
        <rect x="0" y="0" width="68" height="90" rx="8" fill="white" stroke="#FDBA74" strokeWidth="1.5" />
        <rect x="8" y="10" width="13" height="13" fill="#E5E7EB" />
        <rect x="21" y="10" width="13" height="13" fill="#F3F4F6" />
        <rect x="34" y="10" width="13" height="13" fill="#E5E7EB" />
        <rect x="47" y="10" width="13" height="13" fill="#F3F4F6" />
        <rect x="8" y="23" width="13" height="13" fill="#F3F4F6" />
        <rect x="21" y="23" width="13" height="13" fill="#E5E7EB" />
        <rect x="34" y="23" width="13" height="13" fill="#F3F4F6" />
        <rect x="47" y="23" width="13" height="13" fill="#E5E7EB" />
        <rect x="8" y="36" width="13" height="13" fill="#E5E7EB" />
        <rect x="21" y="36" width="13" height="13" fill="#F3F4F6" />
        <rect x="34" y="36" width="13" height="13" fill="#E5E7EB" />
        <rect x="47" y="36" width="13" height="13" fill="#F3F4F6" />
        <path d="M14 48 L26 28 L36 38 L48 18 L60 48 Z" fill="#FB923C" opacity="0.9" />
        <circle cx="20" cy="24" r="6" fill="#FBBF24" opacity="0.95" />
        <rect x="14" y="62" width="40" height="16" rx="5" fill="#EA580C" />
        <text x="34" y="74" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="11" fill="white">PNG</text>
      </g>
    </svg>
  );
}

export function LoanAmortizationIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#DBEAFE" opacity="0.4" />
      <ellipse cx="55" cy="130" rx="35" ry="5" fill="#93C5FD" opacity="0.35" />

      <g transform="translate(20, 25)">
        <rect x="2" y="3" width="70" height="100" rx="8" fill="#1E40AF" opacity="0.3" />
        <rect x="0" y="0" width="70" height="100" rx="8" fill="#1E40AF" />
        <rect x="7" y="8" width="56" height="22" rx="4" fill="#0F172A" />
        <text x="58" y="24" textAnchor="end" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" fontSize="13" fill="#60A5FA">1,250.00</text>
        <rect x="8" y="38" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="27" y="38" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="46" y="38" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="8" y="54" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="27" y="54" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="46" y="54" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="8" y="70" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="27" y="70" width="15" height="12" rx="2.5" fill="#3B82F6" />
        <rect x="46" y="70" width="15" height="12" rx="2.5" fill="#60A5FA" />
        <rect x="8" y="86" width="34" height="10" rx="2.5" fill="#93C5FD" />
        <rect x="46" y="86" width="15" height="10" rx="2.5" fill="#60A5FA" />
      </g>

      <g transform="translate(105, 22)">
        <rect x="2" y="3" width="70" height="55" rx="5" fill="#BFDBFE" opacity="0.35" />
        <rect x="0" y="0" width="70" height="55" rx="5" fill="white" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="22" cy="28" r="15" fill="#BFDBFE" />
        <path d="M22 28 L22 13 A15 15 0 0 1 35 35 Z" fill="#2563EB" />
        <path d="M22 28 L35 35 A15 15 0 0 1 12 38 Z" fill="#3B82F6" />
        <rect x="48" y="32" width="6" height="15" fill="#2563EB" />
        <rect x="56" y="24" width="6" height="23" fill="#3B82F6" />
        <rect x="64" y="18" width="6" height="29" fill="#60A5FA" />
      </g>

      <g transform="translate(115, 70)">
        <rect x="2" y="3" width="62" height="58" rx="4" fill="#93C5FD" opacity="0.3" />
        <rect x="0" y="0" width="62" height="58" rx="4" fill="white" stroke="#2563EB" strokeWidth="1.5" />
        <line x1="7" y1="12" x2="55" y2="12" stroke="#BFDBFE" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="7" y1="22" x2="50" y2="22" stroke="#BFDBFE" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="7" y1="32" x2="55" y2="32" stroke="#BFDBFE" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="7" y1="42" x2="48" y2="42" stroke="#BFDBFE" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="7" y1="52" x2="52" y2="52" stroke="#BFDBFE" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function PasswordSecurityIllustration({ width = 200 }) {
  const height = width * 0.75;
  return (
    <svg width={width} height={height} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="75" r="68" fill="#F1F5F9" opacity="0.55" />
      <ellipse cx="70" cy="125" rx="45" ry="5" fill="#CBD5E1" opacity="0.4" />

      <g transform="translate(25, 30)">
        <rect x="2" y="3" width="95" height="85" rx="8" fill="#E2E8F0" opacity="0.5" />
        <rect x="0" y="0" width="95" height="85" rx="8" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="0" y="0" width="95" height="16" rx="8" fill="#E2E8F0" />
        <rect x="0" y="8" width="95" height="8" fill="#E2E8F0" />
        <circle cx="12" cy="8" r="3.5" fill="#F87171" />
        <circle cx="22" cy="8" r="3.5" fill="#FBBF24" />
        <circle cx="32" cy="8" r="3.5" fill="#34D399" />
        <rect x="12" y="36" width="71" height="18" rx="4" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.4" />
        <circle cx="24" cy="45" r="3" fill="#64748B" />
        <circle cx="34" cy="45" r="3" fill="#64748B" />
        <circle cx="44" cy="45" r="3" fill="#64748B" />
        <circle cx="54" cy="45" r="3" fill="#64748B" />
        <circle cx="64" cy="45" r="3" fill="#64748B" />
        <circle cx="74" cy="45" r="3" fill="#64748B" />
        <rect x="12" y="62" width="71" height="14" rx="4" fill="#64748B" />
      </g>

      <g transform="translate(125, 35)">
        <path d="M30 6 L52 15 L52 42 Q52 60 30 70 Q8 60 8 42 L8 15 Z" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
        <path d="M30 14 L44 20 L44 40 Q44 52 30 59 Q16 52 16 40 L16 20 Z" fill="#F8FAFC" />
        <rect x="23" y="38" width="14" height="12" rx="2.5" fill="#64748B" />
        <path d="M25 38 L25 33 Q25 28 30 28 Q35 28 35 33 L35 38" fill="none" stroke="#64748B" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="48" cy="58" r="12" fill="#10B981" />
        <path d="M42 58 L46 62 L55 51" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
