'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg }) {
  return (
    <Link href={`/${slug}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{
        background: 'white',
        borderColor: '#E2E8F0',
        boxShadow: '0 2px 8px rgba(2,6,23,0.04)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(2,6,23,0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(2,6,23,0.04)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: bg || '#EFF6FF' }}>
        <ToolIcon slug={slug} size={18} />
      </div>
      <span className="text-sm font-medium flex-1 leading-tight" style={{ color: '#0F172A' }}>{title}</span>
      {isFree && (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>FREE</span>
      )}
      <span style={{ color: '#CBD5E1', fontSize: '0.85rem', marginLeft: '2px' }}>›</span>
    </Link>
  );
}
