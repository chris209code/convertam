import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import ToolCard from '@/components/tools/ToolCard';
import AIToolCard from '@/components/tools/AIToolCard';

const toolCategories = [
  { key: 'PDF Editor', label: 'PDF Editor', desc: 'Edit, sign, annotate and manage your PDFs', icon: '✍️', accent: '#2563EB', bg: '#EFF6FF' },
  { key: 'PDF Utilities', label: 'PDF Utilities', desc: 'Organize, edit and optimize your PDF documents', icon: '📄', accent: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'Image Tools', label: 'Image Tools', desc: 'Convert and optimize image files', icon: '🖼️', accent: '#F59E0B', bg: '#FFFBEB' },
  { key: 'Document Conversion', label: 'Document Conversion', desc: 'Convert between documents and formats', icon: '📑', accent: '#2563EB', bg: '#EFF6FF' },
];

const isFreeMode = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

export default function ToolsPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)' }}>
      <style>{`
        .tools-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        .tools-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 768px) {
          .tools-inner { padding: 0 16px; }
          .tools-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5EDF8', padding: '32px 0' }}>
        <div className="tools-inner">
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', marginBottom: '8px' }}>
            All Tools
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748B' }}>
            Everything you need to work with PDFs, images and documents.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="tools-inner" style={{ padding: '48px 64px' }}>
        {toolCategories.map(({ key, label, desc, icon, accent, bg }) => {
          const items = tools.filter(t => t.category === key);
          if (!items.length) return null;
          return (
            <div key={key} style={{
              background: '#FFFFFF', border: '1px solid #E5EDF8',
              borderRadius: '28px', padding: '36px', marginBottom: '32px',
              boxShadow: '0 15px 45px rgba(30,64,175,0.06)',
            }}>
              <div style={{ borderBottom: '1px solid #E6EEF9', paddingBottom: '16px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <span style={{ color: accent }}>{icon}</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#152238', margin: 0 }}>{label}</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>{desc}</p>
                  </div>
                </div>
              </div>
              <div className="tools-grid">
                {items.map(t => (
                  <ToolCard key={t.slug} slug={t.slug} title={t.title} mode={t.mode} bg={bg} isFree={isFreeMode(t.mode)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
