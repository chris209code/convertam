import Link from 'next/link';
import { getTool } from '@/lib/tools-config';
import FaqAccordion from './FaqAccordion';

const SECTION_LABEL = 'text-[11px] font-bold uppercase tracking-wider mb-2.5';

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
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6 bg-paper">
        {/* What this tool does */}
        {guide.what && (
          <div>
            <p className={`${SECTION_LABEL} text-stamp-blue`}>What This Tool Does</p>
            <p className="text-[13.5px] text-ink leading-relaxed">{guide.what}</p>
          </div>
        )}

        {/* How it works */}
        {guide.steps && guide.steps.length > 0 && (
          <div>
            <p className={`${SECTION_LABEL} text-stamp-blue`}>How It Works</p>
            <ol className="flex flex-col gap-2.5">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stamp-blue text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] text-ink leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tips */}
        {guide.tips && guide.tips.length > 0 && (
          <div>
            <p className={`${SECTION_LABEL} text-success`}>Tips For Best Results</p>
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
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: '#7C3AED' }}>
              Common Questions
            </p>
            <FaqAccordion items={guide.quickFaqs} variant="compact" />
          </div>
        )}

        {/* Related tool recommendation */}
        {recTool && guide.recommendation && (
          <div>
            <p className={`${SECTION_LABEL} text-stamp-blue`}>Related Tool</p>
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
