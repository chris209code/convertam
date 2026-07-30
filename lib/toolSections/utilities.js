// Tool metadata for the Utilities hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
  {
    id: 'all',
    label: 'All Utilities',
    icon: '⚙️',
    tools: [
      { slug: 'qr-code-generator', title: 'QR Code Studio', desc: 'Create fully customizable QR codes with logos, gradients and scan validation', icon: '📱', badge: 'free' },
      { slug: 'password-generator', title: 'Password Studio', desc: 'Generate secure passwords with live strength and entropy analysis', icon: '🔐', badge: 'free' },
      { slug: 'text-case-converter', title: 'Text Case Converter', desc: 'Instantly convert text into UPPERCASE, camelCase, snake_case and more', icon: '🔤', badge: 'free' },
    ],
  },
];
