import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import AIToolCard from '@/components/tools/AIToolCard';

export default function AIToolsPage() {
  const aiTools = tools.filter(t => t.category === 'Smart Converter');

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)' }}>
      <style>{`
        .ai-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        .ai-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 16px; }
        @media (max-width: 768px) {
          .ai-inner { padding: 0 16px; }
          .ai-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #A7F3D0', padding: '32px 0' }}>
        <div className="ai-inner">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '99px', background: '#ECFDF5', color: '#10B981', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', border: '1px solid #A7F3D0' }}>
            ✦ AI Powered
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', marginBottom: '8px' }}>
            Smart AI Tools
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748B' }}>
            AI-powered tools for smart document processing. Free to use.
          </p>
        </div>
      </div>

      {/* AI Tools */}
      <div className="ai-inner" style={{ padding: '48px 64px' }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid #A7F3D0',
          borderRadius: '28px', padding: '36px',
          boxShadow: '0 15px 45px rgba(16,185,129,0.06)',
        }}>
          <div className="ai-grid">
            {aiTools.map(t => (
              <AIToolCard key={t.slug} slug={t.slug} title={t.title} description={t.description} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
