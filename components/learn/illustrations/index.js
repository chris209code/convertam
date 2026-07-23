// Contextual per-article hero illustrations for Convertam Learn — a small,
// reusable motif library in the exact same visual language as
// components/categoryVisuals.js's existing category icons: flat 2-3 color
// shapes, white on the accent gradient with one small colored accent
// detail, no gradients/glass/soft-3D within the artwork itself. Each
// article picks one motif via its `illustration` key; several articles
// legitimately share a motif — that's intentional reuse, not a gap.
//
// All motifs are self-contained SVGs (no image assets), sized via `size`
// (default matches the hero banner's illustration slot).

export function DocumentStackIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="22" y="14" width="38" height="50" rx="4" fill="#fff" opacity="0.25" transform="rotate(-6 41 39)" />
      <rect x="26" y="18" width="38" height="52" rx="4" fill="#fff" />
      <path d="M26 18h28l10 10v42a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V18z" fill="none" />
      <path d="M54 18l10 10H58a4 4 0 0 1-4-4z" fill="#000" opacity="0.08" />
      <rect x="32" y="38" width="26" height="2.6" rx="1.3" fill="#000" opacity="0.14" />
      <rect x="32" y="45" width="26" height="2.6" rx="1.3" fill="#000" opacity="0.14" />
      <rect x="32" y="52" width="17" height="2.6" rx="1.3" fill="#000" opacity="0.14" />
      <circle cx="60" cy="60" r="8" fill="#fff" />
      <path d="M56.5 60l2.4 2.6 4.6-5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function SignaturePenIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="16" y="16" width="48" height="56" rx="4" fill="#fff" />
      <rect x="24" y="28" width="32" height="2.4" rx="1.2" fill="#000" opacity="0.12" />
      <rect x="24" y="35" width="32" height="2.4" rx="1.2" fill="#000" opacity="0.12" />
      <rect x="24" y="42" width="22" height="2.4" rx="1.2" fill="#000" opacity="0.12" />
      <path d="M22 58c4-6 8-8 11-4s5 4 8-1 7-6 11-1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <g transform="translate(52 46) rotate(45)">
        <rect x="0" y="0" width="6" height="22" rx="2" fill="#fff" />
        <path d="M0 22h6l-3 6z" fill="#fff" />
        <rect x="0" y="0" width="6" height="6" rx="2" fill="currentColor" />
      </g>
    </svg>
  );
}

export function AiSparkIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <ellipse cx="44" cy="44" rx="30" ry="14" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.35" transform="rotate(-16 44 44)" />
      <ellipse cx="44" cy="44" rx="30" ry="14" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.25" transform="rotate(24 44 44)" />
      <path d="M42 20l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#fff" />
      <path d="M64 56l2.6 6.4L73 65l-6.4 2.6L64 74l-2.6-6.4L55 65l6.4-2.6z" fill="currentColor" />
    </svg>
  );
}

export function ResumeDocIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="18" y="14" width="46" height="58" rx="4" fill="#fff" />
      <circle cx="31" cy="30" r="6" fill="currentColor" opacity="0.85" />
      <rect x="40" y="26" width="18" height="2.4" rx="1.2" fill="#000" opacity="0.14" />
      <rect x="40" y="32" width="14" height="2.4" rx="1.2" fill="#000" opacity="0.14" />
      <rect x="25" y="44" width="33" height="2.2" rx="1.1" fill="#000" opacity="0.1" />
      <rect x="25" y="50" width="33" height="2.2" rx="1.1" fill="#000" opacity="0.1" />
      <rect x="25" y="56" width="24" height="2.2" rx="1.1" fill="#000" opacity="0.1" />
      <rect x="25" y="64" width="20" height="2.2" rx="1.1" fill="#000" opacity="0.1" />
    </svg>
  );
}

export function InvoiceLedgerIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="18" y="12" width="46" height="60" rx="4" fill="#fff" />
      <rect x="26" y="22" width="24" height="3" rx="1.5" fill="#000" opacity="0.16" />
      <g stroke="#000" strokeOpacity="0.12" strokeWidth="1.2">
        <line x1="26" y1="34" x2="56" y2="34" />
        <line x1="26" y1="41" x2="56" y2="41" />
        <line x1="26" y1="48" x2="56" y2="48" />
      </g>
      <rect x="26" y="56" width="30" height="1.6" fill="#000" opacity="0.14" />
      <rect x="26" y="61" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.85" />
      <circle cx="64" cy="60" r="10" fill="#fff" />
      <text x="64" y="64" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fill="currentColor" textAnchor="middle">$</text>
    </svg>
  );
}

export function ImageFrameIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="14" y="18" width="52" height="42" rx="4" fill="none" stroke="#fff" strokeWidth="2.4" />
      <circle cx="26" cy="30" r="4.4" fill="#fff" />
      <path d="M18 54l12-14 9 9 8-11 17 16z" fill="#fff" opacity="0.55" />
      <rect x="34" y="66" width="20" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

export function CompressArrowIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="14" y="14" width="26" height="26" rx="4" fill="#fff" opacity="0.9" />
      <rect x="48" y="48" width="26" height="26" rx="4" fill="#fff" opacity="0.9" />
      <path d="M40 34l10 10M50 34v10h-10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M48 54l-10-10M38 54v-10h10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function PhoneScanIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="26" y="10" width="36" height="62" rx="7" fill="#fff" />
      <rect x="31" y="18" width="26" height="40" rx="2" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.4" />
      <circle cx="44" cy="66" r="2.6" fill="#000" opacity="0.14" />
      <rect x="31" y="32" width="26" height="2" fill="currentColor" opacity="0.85" />
      <rect x="31" y="44" width="26" height="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function CalculatorChartIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="16" y="12" width="34" height="46" rx="4" fill="#fff" />
      <rect x="21" y="18" width="24" height="9" rx="1.5" fill="currentColor" opacity="0.85" />
      <g fill="#000" opacity="0.14">
        <rect x="21" y="31" width="6.4" height="5" rx="1" /><rect x="30" y="31" width="6.4" height="5" rx="1" /><rect x="39" y="31" width="6.4" height="5" rx="1" />
        <rect x="21" y="39" width="6.4" height="5" rx="1" /><rect x="30" y="39" width="6.4" height="5" rx="1" /><rect x="39" y="39" width="6.4" height="5" rx="1" />
        <rect x="21" y="47" width="24" height="5" rx="1" />
      </g>
      <g transform="translate(48 44)">
        <rect x="0" y="18" width="6" height="14" rx="1.5" fill="#fff" />
        <rect x="9" y="10" width="6" height="22" rx="1.5" fill="#fff" />
        <rect x="18" y="0" width="6" height="32" rx="1.5" fill="#fff" />
      </g>
    </svg>
  );
}

export function LockShieldIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path d="M44 12l22 8v18c0 16-10 26-22 32-12-6-22-16-22-32V20z" fill="#fff" />
      <rect x="36" y="42" width="16" height="13" rx="2.4" fill="currentColor" />
      <path d="M39 42v-5a5 5 0 0 1 10 0v5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="44" cy="47.5" r="2" fill="#fff" />
    </svg>
  );
}

export function QrGridIllustration({ size = 88 }) {
  const cells = [
    [1,1,1,0,0,1,1,1],[1,0,1,0,1,0,0,1],[1,0,1,0,0,1,0,1],[1,1,1,0,1,0,1,1],
    [0,0,0,0,0,1,0,0],[1,1,0,1,1,0,1,1],[1,0,1,0,0,0,0,1],[1,1,1,0,1,1,1,1],
  ];
  const cell = 6.5, offset = 12;
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="8" y="8" width="72" height="72" rx="6" fill="#fff" />
      {cells.map((row, y) => row.map((v, x) => v ? (
        <rect key={`${x}-${y}`} x={offset + x * cell} y={offset + y * cell} width={cell - 1} height={cell - 1} rx="1" fill="currentColor" opacity="0.85" />
      ) : null))}
    </svg>
  );
}

export function WorkflowChainIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path d="M20 24 L44 44 L68 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <path d="M20 64 L44 44 L68 64" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <circle cx="20" cy="24" r="8" fill="#fff" />
      <circle cx="68" cy="24" r="8" fill="#fff" />
      <circle cx="20" cy="64" r="8" fill="#fff" />
      <circle cx="68" cy="64" r="8" fill="#fff" />
      <circle cx="44" cy="44" r="10" fill="#fff" />
      <circle cx="44" cy="44" r="4" fill="currentColor" />
    </svg>
  );
}

// Three separate pages converging into one — the specific "merge" action,
// not just "a document" like DocumentStackIllustration. Deliberately kept
// upright and evenly spaced (not fanned/rotated) so it still reads clearly
// at small card-banner sizes, not just in the larger article hero.
export function MergeArrowsIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="10" y="10" width="18" height="24" rx="3" fill="#fff" />
      <rect x="35" y="10" width="18" height="24" rx="3" fill="#fff" />
      <rect x="60" y="10" width="18" height="24" rx="3" fill="#fff" />
      <path d="M19 34v8M44 34v8M69 34v8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19 42q0 10 25 10t25-10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <rect x="26" y="56" width="36" height="24" rx="4" fill="#fff" />
      <rect x="32" y="63" width="24" height="2.6" rx="1.3" fill="#000" opacity="0.16" />
      <rect x="32" y="70" width="16" height="2.6" rx="1.3" fill="#000" opacity="0.16" />
      <circle cx="66" cy="72" r="10" fill="currentColor" />
      <path d="M61.5 72l3 3.2 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// A scanned page transforming into recognized, selectable text — the OCR
// concept specifically, distinct from AiSparkIllustration's generic "AI".
export function OcrScanIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="10" y="18" width="28" height="36" rx="4" fill="#fff" />
      <path d="M15 26h18M15 32h18M15 38h12" stroke="#000" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 36h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M40 30l10 6-10 6z" fill="#fff" opacity="0.7" />
      <rect x="58" y="18" width="24" height="36" rx="4" fill="#fff" />
      <text x="70" y="42" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="800" fill="currentColor" textAnchor="middle">T</text>
      <path d="M14 62h60" stroke="#fff" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" opacity="0.5" />
      <circle cx="14" cy="62" r="2.4" fill="#fff" /><circle cx="74" cy="62" r="2.4" fill="#fff" />
    </svg>
  );
}

// Three distinct document types (invoice/quotation/delivery note) fanned
// out with a pen — the "compare these document types" concept, not a
// single generic invoice like InvoiceLedgerIllustration.
export function DocumentTypesCompareIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="12" y="20" width="30" height="40" rx="4" fill="#fff" opacity="0.7" transform="rotate(-10 27 40)" />
      <rect x="29" y="14" width="30" height="40" rx="4" fill="#fff" opacity="0.85" />
      <rect x="46" y="20" width="30" height="40" rx="4" fill="#fff" transform="rotate(10 61 40)" />
      <rect x="35" y="22" width="18" height="2.6" rx="1.3" fill="#000" opacity="0.16" />
      <rect x="35" y="29" width="18" height="2" rx="1" fill="#000" opacity="0.1" />
      <rect x="35" y="34" width="14" height="2" rx="1" fill="#000" opacity="0.1" />
      <rect x="35" y="39" width="16" height="2" rx="1" fill="#000" opacity="0.1" />
      <g transform="translate(60 58) rotate(45)">
        <rect x="0" y="0" width="5.5" height="20" rx="2" fill="currentColor" />
        <path d="M0 20h5.5l-2.75 6z" fill="currentColor" />
      </g>
    </svg>
  );
}

// Two overlapping image swatches, each labeled with its format — the
// specific "compare these two file types" concept for the JPG vs PNG guide.
export function ImageFormatCompareIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="12" y="18" width="38" height="38" rx="6" fill="#fff" opacity="0.9" />
      <path d="M16 46l9-11 7 7 6-8 9 10v6a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill="currentColor" opacity="0.35" />
      <text x="31" y="66" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">JPG</text>
      <rect x="38" y="30" width="38" height="38" rx="6" fill="#fff" />
      <rect x="42" y="34" width="30" height="30" rx="4" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.6" />
      <circle cx="52" cy="44" r="4" fill="currentColor" opacity="0.5" />
      <text x="57" y="78" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="800" fill="currentColor" textAnchor="middle">PNG</text>
    </svg>
  );
}

export function FolderOrganizeIllustration({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <path d="M14 26a3 3 0 0 1 3-3h16l5 6h30a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#fff" />
      <rect x="14" y="30" width="60" height="4" fill="#000" opacity="0.1" />
      <rect x="24" y="44" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.85" />
      <rect x="24" y="52" width="34" height="2.4" rx="1.2" fill="#000" opacity="0.12" />
      <rect x="24" y="59" width="18" height="2.4" rx="1.2" fill="#000" opacity="0.12" />
    </svg>
  );
}

export const LEARN_ILLUSTRATIONS = {
  documentStack: DocumentStackIllustration,
  signaturePen: SignaturePenIllustration,
  aiSpark: AiSparkIllustration,
  resumeDoc: ResumeDocIllustration,
  invoiceLedger: InvoiceLedgerIllustration,
  imageFrame: ImageFrameIllustration,
  compressArrow: CompressArrowIllustration,
  phoneScan: PhoneScanIllustration,
  calculatorChart: CalculatorChartIllustration,
  lockShield: LockShieldIllustration,
  qrGrid: QrGridIllustration,
  workflowChain: WorkflowChainIllustration,
  folderOrganize: FolderOrganizeIllustration,
  mergeArrows: MergeArrowsIllustration,
  ocrScan: OcrScanIllustration,
  documentTypesCompare: DocumentTypesCompareIllustration,
  imageFormatCompare: ImageFormatCompareIllustration,
};
