'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function ToolCard({ slug, title, isFree, bg }) {
  return (
    <>
      <style>{`
        .tool-card-link {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 16px; border-radius: var(--cvt-radius-lg);
          border: 1px solid var(--cvt-color-primary-rule);
          border-left: 3px solid var(--cvt-color-primary);
          background: var(--cvt-color-primary-soft);
          text-decoration: none; cursor: pointer;
          box-shadow: var(--cvt-shadow-sm);
          overflow: hidden; min-width: 0;
        }
        .tool-card-link:hover {
          transform: translateY(-2px);
          background: #DBEAFE;
          box-shadow: var(--cvt-shadow-md);
        }
        .tool-card-link:active { transform: translateY(0); }
        .tool-card-icon {
          width: 42px; height: 42px; border-radius: var(--cvt-radius-md);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tool-card-title {
          font-size: 1rem; font-weight: 700; color: var(--cvt-color-ink);
          flex: 1; line-height: 1.3;
        }
        .tool-card-badge {
          font-size: 0.7rem; font-weight: 700;
          padding: 4px 10px; border-radius: var(--cvt-radius-pill);
          background: var(--cvt-color-primary); color: white;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .tool-card-link { gap: 10px; padding: 12px 12px; border-radius: 12px; }
          .tool-card-icon { width: 32px; height: 32px; border-radius: 8px; }
          .tool-card-title {
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .tool-card-badge { font-size: 0.6rem; padding: 3px 7px; }
        }
      `}</style>
      <Link href={`/${slug}`} className="tool-card-link">
        <div className="tool-card-icon" style={{ background: bg || '#BFDBFE' }}>
          <ToolIcon slug={slug} size={22} />
        </div>
        <span className="tool-card-title">{title}</span>
        {isFree && <span className="tool-card-badge">FREE</span>}
      </Link>
    </>
  );
}
