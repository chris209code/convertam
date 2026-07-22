'use client';

import Link from 'next/link';
import { getTool } from '@/lib/tools-config';

const H2 = 'font-display text-lg font-bold text-ink mb-3';

// The always-visible "genuine educational resource" section shown below
// every tool's working area — complementary to the Quick Guide panel, not a
// restatement of it (see lib/toolEducation.js for the framing). Renders
// nothing if a tool has no entry yet, so it's safe to mount unconditionally
// while content is rolled out tool by tool.
export default function ToolEducationSection({ toolSlug, data }) {
  if (!data) return null;

  const { about, whyUseThis, bestPractices, commonMistakes, whatNext } = data;

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="border border-[#E2E6ED] rounded-2xl p-6 md:p-7 bg-paper flex flex-col gap-8">
        {about?.paragraphs?.length > 0 && (
          <div>
            <h2 className={H2}>About this Tool</h2>
            <div className="flex flex-col gap-3.5">
              {about.paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] text-ink leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        )}

        {whyUseThis?.length > 0 && (
          <div>
            <h2 className={H2}>Why Use This Tool?</h2>
            <ul className="flex flex-col gap-2">
              {whyUseThis.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink leading-relaxed">
                  <span className="text-stamp-blue flex-shrink-0 mt-0.5">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {bestPractices?.length > 0 && (
          <div>
            <h2 className={H2}>Best Practices</h2>
            <ul className="flex flex-col gap-2.5">
              {bestPractices.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink leading-relaxed">
                  <span className="text-success flex-shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {commonMistakes?.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold mb-3" style={{ color: '#B45309' }}>Common Mistakes</h2>
            <ul className="flex flex-col gap-2.5">
              {commonMistakes.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink leading-relaxed">
                  <span className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }}>⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {whatNext?.length > 0 && <WhatNextChain steps={whatNext} />}
    </div>
  );
}

// Numbered rather than arrow-connected: a horizontal chain of arrows breaks
// visually the moment it wraps to a second row (an arrow pointing at
// nothing), which is the common case at normal content widths once there
// are more than 3-4 steps. Numbering communicates the same sequence and
// holds up at any width — and matches the step-numbering style already
// used in the Quick Guide panel.
function WhatNextChain({ steps }) {
  return (
    <div className="border border-[#E2E6ED] rounded-2xl p-6 md:p-7 bg-paper">
      <h2 className={H2}>What Next?</h2>
      <div className="flex flex-wrap items-stretch gap-2.5">
        {steps.map((step, i) => {
          const tool = step.slug ? getTool(step.slug) : null;
          const content = (
            <>
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stamp-blue text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-ink">{step.label}</span>
                {step.body && <span className="block text-[12px] text-ink-soft mt-0.5 leading-snug">{step.body}</span>}
              </span>
            </>
          );
          return tool ? (
            <Link
              key={i}
              href={`/${step.slug}`}
              className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#E2E6ED] bg-white hover:border-stamp-blue transition-colors no-underline w-[200px]"
            >
              {content}
            </Link>
          ) : (
            <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-[#D8DCE3] w-[200px]" style={{ background: '#F8F9FB' }}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
