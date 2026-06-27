'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg }) {
  return (
    <Link href={`/${slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', borderRadius: '18px',
        border: '1px solid #DCE7F5', background: '#FAFCFF',
        textDecoration: 'none', cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(37,99,235,0.06)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = '#2563EB';
        e.currentTarget.style.boxShadow = '0 18px 40px rgba(37,99,235,0.14)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = '#DCE7F5';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.06)';
      }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bg || '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToolIcon slug={slug} size={23} />
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#152238', flex: 1, lineHeight: 1.3 }}>{title}</span>
      {isFree && (
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: '#EAF2FF', color: '#2563EB', flexShrink: 0 }}>FREE</span>
      )}
    </Link>
  );
}
