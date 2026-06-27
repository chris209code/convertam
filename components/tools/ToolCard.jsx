'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg }) {
  return (
    <Link href={`/${slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '18px 16px', borderRadius: '14px',
        border: '1px solid #BFDBFE',
        borderLeft: '3px solid #2563EB',
        background: '#EBF3FF',
        textDecoration: 'none', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.background = '#DBEAFE';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(37,99,235,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.background = '#EBF3FF';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)';
      }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: bg || '#BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToolIcon slug={slug} size={24} />
      </div>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1E3A5F', flex: 1, lineHeight: 1.3 }}>{title}</span>
      {isFree && (
        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: '#2563EB', color: 'white', flexShrink: 0 }}>FREE</span>
      )}
    </Link>
  );
}
