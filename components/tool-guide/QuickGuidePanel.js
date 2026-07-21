import Link from 'next/link';
import { getTool } from '@/lib/tools-config';
import FaqAccordion from './FaqAccordion';

const H3 = 'font-display text-[15px] font-bold text-ink mb-3';

export default function QuickGuidePanel({ guide, onClose }) {
  const recTool = guide.recommendation ? getTool(guide.recommendation.slug) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-stamp-blue px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📖</span>
          <span className="text-white font-display font-bold text-[15px]">{guide.title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close guide"
          className="text-white/90 hover:text-white text-xl leading-none px-1"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-7 bg-paper">
        {/* Intro */}
        {guide.what && (
          <p className="text-[14px] text-ink leading-relaxed">{guide.what}</p>
        )}

        {/* Step-by-step guide */}
        {guide.steps && guide.steps.length > 0 && (
          <div>
            <p className={H3}>Step-by-step guide</p>
            <ol className="flex flex-col gap-4">
              {guide.steps.map((step, i) => {
                const title = typeof step === 'string' ? step : step.title;
                const body = typeof step === 'string' ? null : step.body;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stamp-blue text-white text-[12px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] text-ink leading-relaxed">
                      <span className="font-semibold">{title}</span>
                      {body && <span className="text-ink-soft">{' '}{body}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* What kind of files convert best */}
        {guide.pdfTypes && guide.pdfTypes.length > 0 && (
          <div>
            <p className={H3}>What kind of files convert best</p>
            <ul className="flex flex-col gap-3">
              {guide.pdfTypes.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-ink leading-relaxed">
                  <span className="text-stamp-blue flex-shrink-0 mt-0.5">●</span>
                  <span>
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-ink-soft">{' '}{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips — only shown for tools using the simpler string-list shape */}
        {guide.tips && guide.tips.length > 0 && (
          <div>
            <p className={H3}>Tips for best results</p>
            <ul className="flex flex-col gap-2">
              {guide.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px] text-ink leading-relaxed">
                  <span className="text-success flex-shrink-0">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Common Questions */}
        {guide.quickFaqs && guide.quickFaqs.length > 0 && (
          <div>
            <p className={H3}>Common questions</p>
            <FaqAccordion items={guide.quickFaqs} />
          </div>
        )}

        {/* When to use this tool */}
        {guide.whenToUse && (
          <div>
            <p className={H3}>When to use this tool</p>
            <p className="text-[13.5px] text-ink-soft leading-relaxed">{guide.whenToUse}</p>
          </div>
        )}

        {/* Related tool recommendation */}
        {recTool && guide.recommendation && (
          <div>
            <p className={H3}>Related tool</p>
            <Link
              href={`/${recTool.slug}`}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#E2E6ED] bg-white hover:border-stamp-blue transition-colors no-underline"
            >
              <span className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ background: '#EFF3FC' }}>
                {guide.recommendation.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] text-ink-soft leading-snug">{guide.recommendation.prompt}</span>
                <span className="block text-[13px] font-semibold text-stamp-blue">{guide.recommendation.label}</span>
              </span>
              <span className="text-stamp-blue flex-shrink-0">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
