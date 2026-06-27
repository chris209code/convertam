'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg, accent }) {
  return (
    <Link href={`/${slug}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{ background: 'white', borderColor: '#E2E8F0', boxShadow: '0 1px 4px rgba(2,6,23,0.05)' }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(2,6,23,0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(2,6,23,0.05)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: bg || '#EFF6FF' }}>
        <ToolIcon slug={slug} size={18} />
      </div>
      <span className="text-sm font-medium flex-1" style={{ color: '#334155' }}>{title}</span>
      {isFree && (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>FREE</span>
      )}
      <span style={{ color: '#CBD5E1', fontSize: '0.85rem', marginLeft: '4px' }}>›</span>
    </Link>
  );
}
