'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function AIToolCard({ slug, title, description }) {
  return (
    <Link href={`/${slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '22px',
        borderRadius: '18px',
        border: '1px solid #BFDBFE',
        borderLeft: '4px solid #10B981',
        background: '#EBF3FF',
        textDecoration: 'none', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(37,99,235,0.10)',
        transition: 'all 0.25s ease',
        overflow: 'hidden', minWidth: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.background = '#DBEAFE';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(37,99,235,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.background = '#EBF3FF';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.10)';
      }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToolIcon slug={slug} size={28} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '5px' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: '99px', background: '#10B981', color: 'white', flexShrink: 0, whiteSpace: 'nowrap' }}>
        ✦ AI · FREE
      </span>
    </Link>
  );
}
