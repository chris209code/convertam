'use client';
import Link from 'next/link';
import { ToolIcon } from '@/components/ToolIcons';

export default function AIToolCard({ slug, title, description }) {
  return (
    <>
      <style>{`
        .ai-card { 
          display: flex; align-items: center; gap: 16px; padding: 20px;
          border-radius: 18px; border: 1px solid #BFDBFE;
          border-left: 4px solid #10B981;
          background: #EBF3FF;
          text-decoration: none; cursor: pointer;
          box-shadow: 0 2px 8px rgba(37,99,235,0.08);
          transition: all 0.25s ease;
          overflow: hidden; min-width: 0;
        }
        .ai-card:hover {
          transform: translateY(-3px);
          background: #DBEAFE;
          box-shadow: 0 12px 28px rgba(37,99,235,0.18);
        }
        .ai-card-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: #D1FAE5;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ai-card-title {
          font-size: 1.05rem; font-weight: 800; color: #0F172A;
          margin-bottom: 4px;
        }
        .ai-card-desc {
          font-size: 0.82rem; font-weight: 400; color: #475569;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ai-card-badge {
          font-size: 0.68rem; font-weight: 700;
          padding: 4px 10px; border-radius: 99px;
          background: #10B981; color: white;
          flex-shrink: 0; white-space: nowrap;
        }
        @media (max-width: 768px) {
          .ai-card { gap: 12px; padding: 12px 14px; }
          .ai-card-icon { width: 36px; height: 36px; border-radius: 10px; }
          .ai-card-title {
            font-size: 0.82rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          }
          .ai-card-desc { font-size: 0.72rem; }
          .ai-card-badge { font-size: 0.6rem; padding: 3px 7px; }
        }
      `}</style>
      <Link href={`/${slug}`} className="ai-card">
        <div className="ai-card-icon">
          <ToolIcon slug={slug} size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ai-card-title">{title}</div>
          <div className="ai-card-desc">{description}</div>
        </div>
        <span className="ai-card-badge">✦ AI · FREE</span>
      </Link>
    </>
  );
}
