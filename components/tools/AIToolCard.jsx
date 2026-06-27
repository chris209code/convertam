'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function AIToolCard({ slug, title, description }) {
  return (
    <Link href={`/${slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '20px',
        borderRadius: '18px', border: '1px solid #DCE7F5',
        background: '#FAFCFF', textDecoration: 'none',
        boxShadow: '0 8px 24px rgba(37,99,235,0.06)',
        transition: 'all 0.25s ease', cursor: 'pointer',
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
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToolIcon slug={slug} size={26} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: '#EAF2FF', color: '#2563EB', flexShrink: 0 }}>
        ✦ AI · FREE
      </span>
    </Link>
  );
}
