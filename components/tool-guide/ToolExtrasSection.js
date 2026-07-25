import FaqAccordion from './FaqAccordion';

const cardStyle = { background: '#fffefb', border: '1px solid #e2dcc9' };

// Compact search-intent content block shown below a tool — Supported
// Formats / Best For / Common Uses / Pro Tip / Questions People Ask.
// Reads from lib/toolExtras.js. Deliberately separate from the Quick
// Guide/FAQ system in lib/toolGuides.js (which covers "how to use this
// tool"), so the two never repeat the same ground.
export default function ToolExtrasSection({ extras }) {
  if (!extras) return null;
  const { supportedFormats, bestFor, commonUses, proTip, questionsPeopleAsk } = extras;

  return (
    <div className="mt-10 flex flex-col gap-4">
      {(supportedFormats || bestFor) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {supportedFormats && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-1.5">Supported Formats</p>
              <p className="text-sm text-ink">{supportedFormats}</p>
            </div>
          )}
          {bestFor && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-1.5">Best For</p>
              <p className="text-sm text-ink">{bestFor}</p>
            </div>
          )}
        </div>
      )}

      {commonUses?.length > 0 && (
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-2">Common Uses</p>
          <div className="flex flex-col gap-1.5">
            {commonUses.map((use, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="text-ink-soft" style={{ flexShrink: 0 }}>•</span>
                <span>{use}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {proTip && (
        <div className="p-4 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#92400E' }}>💡 Pro Tip</p>
          <p className="text-sm" style={{ color: '#78350F' }}>{proTip}</p>
        </div>
      )}

      {questionsPeopleAsk?.length > 0 && (
        <div className="border border-[#E2E6ED] rounded-2xl p-5 bg-paper">
          <h2 className="font-display text-base font-bold text-ink mb-3.5">Questions People Ask</h2>
          <FaqAccordion items={questionsPeopleAsk} />
        </div>
      )}
    </div>
  );
}
