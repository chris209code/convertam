'use client';

import { useEffect, useState } from 'react';
import QuickGuidePanel from './QuickGuidePanel';

// Floating "Quick Guide" tab + slide-out panel. Modeled on the existing
// FeedbackWidget: a fixed vertical tab that opens a panel without leaving
// the page. Desktop slides in from the right; mobile opens as a full-height
// bottom sheet. Positioned above FeedbackWidget's fixed top:50% tab so the
// two never overlap.
export default function QuickGuideTab({ guide }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!guide) return null;

  return (
    <>
      {/* Floating tab */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open quick guide"
          className="fixed right-0 z-[999] bg-stamp-blue text-white border-none rounded-l-lg cursor-pointer flex flex-col items-center gap-1.5 shadow-[-3px_0_12px_rgba(0,0,0,0.2)]"
          style={{
            top: 180,
            padding: '14px 10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 16 }}>📖</span>
          <span>QUICK GUIDE</span>
        </button>
      )}

      {/* Backdrop + slide-out panel — always mounted so the open/close
          transform transition actually animates, visibility toggled via
          opacity/pointer-events instead of conditional rendering.
          z-[1001] (one above FeedbackWidget's z-1000) so the panel fully
          covers the Feedback tab while open instead of it poking through. */}
      <div className={`fixed inset-0 z-[1001] ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`absolute left-0 right-0 bottom-0 max-h-[85vh] rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out
            md:top-0 md:bottom-0 md:left-auto md:right-0 md:max-h-none md:h-full md:w-[400px] md:rounded-t-none md:rounded-l-2xl
            ${open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
          style={{ background: '#fffefb' }}
        >
          <QuickGuidePanel guide={guide} onClose={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
