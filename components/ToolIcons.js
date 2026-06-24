// Format-accurate SVG icons for document types
// Colors match the widely-recognized format standards used across the web

export function PdfIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#E53935"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial">PDF</text>
    </svg>
  );
}

export function WordIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1565C0"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="Arial">W</text>
    </svg>
  );
}

export function ExcelIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#2E7D32"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="Arial">X</text>
    </svg>
  );
}

export function PowerPointIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#D84315"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="Arial">P</text>
    </svg>
  );
}

export function JpgIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#F57C00"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial">JPG</text>
    </svg>
  );
}

export function PngIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#6A1B9A"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial">PNG</text>
    </svg>
  );
}

// Generic tool icons
export function MergeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1565C0"/>
      <path d="M5 8h4v8H5V8zm10 0h4v8h-4V8zM9 12h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function SplitIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#0277BD"/>
      <path d="M12 5v14M5 8h7M12 8h7M5 16h7M12 16h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function CompressIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#558B2F"/>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  );
}

export function RotateIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#00838F"/>
      <path d="M12 5a7 7 0 0 1 7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 8l0 4-4 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="7" y="10" width="7" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

export function ExtractIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#4527A0"/>
      <rect x="5" y="5" width="9" height="12" rx="1" stroke="white" strokeWidth="1.5"/>
      <rect x="10" y="8" width="9" height="12" rx="1" fill="#4527A0" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

export function SignIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1B5E20"/>
      <path d="M6 17c1-3 3-7 5-8s2 3 1 5 3-3 5-4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function ReorderIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#4E342E"/>
      <path d="M7 8h10M7 12h10M7 16h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 10l-2-2 2-2M4 18l-2-2 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function WatermarkIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#37474F"/>
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Arial" opacity="0.5" transform="rotate(-25 12 12)">DRAFT</text>
      <rect x="4" y="5" width="16" height="14" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export function InvoiceIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#E65100"/>
      <rect x="5" y="4" width="14" height="16" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M8 8h8M8 11h8M8 14h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ReceiptIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#00695C"/>
      <rect x="5" y="3" width="14" height="18" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M5 19l2-2 2 2 2-2 2 2 2-2 2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 8h8M8 11h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function AIIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1565C0"/>
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5"/>
      <path d="M12 4v2M12 18v2M4 12H2M22 12h-2M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="6" fontWeight="800" fontFamily="Arial">AI</text>
    </svg>
  );
}

export function FillPdfIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0277BD"/>
      <rect x="7" y="6" width="14" height="19" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
      <line x1="10" y1="12" x2="18" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="16" x2="18" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="20" x2="14" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="6" fill="#e2962c"/>
      <path d="M21.5 24l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
export function ToolIcon({ slug, size = 22 }) {
  const map = {
    'pdf-to-word': <><PdfIcon size={size}/></>,
    'word-to-pdf': <><WordIcon size={size}/></>,
    'pdf-to-excel': <><PdfIcon size={size}/></>,
    'excel-to-pdf': <><ExcelIcon size={size}/></>,
    'pdf-to-powerpoint': <><PdfIcon size={size}/></>,
    'powerpoint-to-pdf': <><PowerPointIcon size={size}/></>,
    'jpg-to-pdf': <><JpgIcon size={size}/></>,
    'png-to-pdf': <><PngIcon size={size}/></>,
    'pdf-to-jpg': <><JpgIcon size={size}/></>,
    'pdf-to-png': <><PngIcon size={size}/></>,
    'merge-pdf': <><MergeIcon size={size}/></>,
    'split-pdf': <><SplitIcon size={size}/></>,
    'compress-pdf': <><CompressIcon size={size}/></>,
    'rotate-pdf': <><RotateIcon size={size}/></>,
    'extract-pdf-pages': <><ExtractIcon size={size}/></>,
    'fill-pdf': <><FillPdfIcon size={size}/></>,
    'sign-pdf': <><SignIcon size={size}/></>,
    'reorder-pdf': <><ReorderIcon size={size}/></>,
    'watermark-pdf': <><WatermarkIcon size={size}/></>,
    'invoice-generator': <><InvoiceIcon size={size}/></>,
    'receipt-scanner': <><ReceiptIcon size={size}/></>,
    'smart-converter': <><AIIcon size={size}/></>,
  };
  return map[slug] || <PdfIcon size={size}/>;
}
