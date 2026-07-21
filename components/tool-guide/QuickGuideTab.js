'use client';

import { useEffect, useState } from 'react';
import QuickGuidePanel from './QuickGuidePanel';

// Wraps a tool page's content and adds the "Quick Guide" assistant.
//
// Desktop (md+): true split-screen, like Claude's chat + artifact panel —
// the page content stays fully visible and simply narrows (flex-1), and the
// guide docks as a sticky in-flow column on the right. No backdrop, nothing
// dimmed, nothing covered.
//
// Mobile: there's no room for a side-by-side split, so the guide opens as a
// full-height bottom sheet over a dimmed backdrop instead.
//
// The trigger is a small horizontal pill fixed near the top of the viewport
// — deliberately not sharing FeedbackWidget's vertical-tab-at-mid-viewport
// position/shape, so the two can never visually collide.
export default function QuickGuideTab({ guide, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!guide) return children;

  return (
    <div className="md:flex md:items-start">
      <div className={open ? 'md:flex-1 md:min-w-0' : 'w-full'}>{children}</div>

      {/* Trigger pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed top-24 right-5 z-[999] flex items-center gap-2 bg-stamp-blue text-white border-none rounded-full cursor-pointer shadow-lg px-4 py-2.5 text-[13px] font-semibold hover:brightness-110 transition"
        >
          <span>📖</span>
          <span>Quick Guide</span>
        </button>
      )}

      {/* Desktop split-screen panel — a normal in-flow sticky column, no overlay.
          z-[1001] (sticky is itself a positioned element, so this is enough
          to render above FeedbackWidget's fixed z-1000 tab — no separate
          `relative` needed, and adding one here would just fight `sticky`
          for the `position` property and silently break the stickiness).
          top-16 (Header.js's own sticky nav is 64px tall) so this sticks
          just below the site header instead of racing it for the same
          top:0 spot and covering it while scrolling. */}
      {open && (
        <div className="hidden md:block md:sticky md:z-[1001] md:flex-shrink-0 md:w-[420px] md:border-l md:border-[#E2E6ED] md:top-16 md:self-start md:h-[calc(100vh-64px)]">
          <QuickGuidePanel guide={guide} onClose={() => setOpen(false)} />
        </div>
      )}

      {/* Mobile bottom sheet — overlay + backdrop, since there's no room to split */}
      <div className={`md:hidden fixed inset-0 z-[1001] ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`absolute left-0 right-0 bottom-0 max-h-[85vh] rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out
            ${open ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ background: '#fffefb' }}
        >
          <QuickGuidePanel guide={guide} onClose={() => setOpen(false)} />
        </div>
      </div>
    </div>
  );
}
