'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg }) {
  return (
    <Link href={`/${slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '12px',
        border: '1px solid #E2E8F0', background: 'white',
        textDecoration: 'none',
        boxShadow: '0 2px 8px rgba(2,6,23,0.04)',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(2,6,23,0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(2,6,23,0.04)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}>
      {/* Icon tile */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: bg || '#EFF6FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ToolIcon slug={slug} size={20} />
      </div>

      {/* Title */}
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0F172A', flex: 1 }}>{title}</span>

      {/* FREE badge */}
      {isFree && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px',
          borderRadius: '99px', background: '#ECFDF5', color: '#10B981',
          border: '1px solid #A7F3D0', flexShrink: 0,
        }}>FREE</span>
      )}

      {/* Arrow */}
      <span style={{ color: '#CBD5E1', fontSize: '0.9rem', flexShrink: 0 }}>›</span>
    </Link>
  );
}
