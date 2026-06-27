'use client';

import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, mode, bg, isFree }) {
  return (
    <Link href={`/${slug}`}
      className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
      style={{
        background: 'white',
        borderColor: '#E2E8F0',
        boxShadow: '0 2px 8px rgba(2,6,23,0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(2,6,23,0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(2,6,23,0.05)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}>
        <ToolIcon slug={slug} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight" style={{ color: '#334155' }}>{title}</div>
      </div>
      {isFree && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: '#ECFDF5', color: '#10B981' }}>FREE</span>
      )}
      <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>›</span>
    </Link>
  );
}
