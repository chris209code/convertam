'use client';

import { useState } from 'react';

// Reusable collapsible Q&A list — used both inside the Quick Guide slide-out
// (compact) and the full FAQ section below the tool (same look, more items).
export default function FaqAccordion({ items, variant = 'default' }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!items || items.length === 0) return null;

  const compact = variant === 'compact';

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.q}
            className="border border-[#E2E6ED] rounded-lg overflow-hidden bg-white"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={`w-full flex items-center justify-between gap-3 text-left font-medium text-ink ${compact ? 'px-3 py-2.5 text-[13px]' : 'px-4 py-3 text-sm'}`}
            >
              <span>{item.q}</span>
              <span
                className="flex-shrink-0 text-ink-soft transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {isOpen && (
              <div className={`text-ink-soft leading-relaxed ${compact ? 'px-3 pb-2.5 text-[12.5px]' : 'px-4 pb-3.5 text-[13.5px]'}`}>
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
