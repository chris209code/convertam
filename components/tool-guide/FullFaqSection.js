import FaqAccordion from './FaqAccordion';

// "Frequently Asked Questions" card shown below the tool. Reusable across
// any tool that provides a `fullFaqs` list in lib/toolGuides.js.
export default function FullFaqSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border border-[#E2E6ED] rounded-2xl p-5 bg-paper">
      <h2 className="font-display text-base font-bold text-ink mb-3.5">Frequently Asked Questions</h2>
      <FaqAccordion items={items} />
    </div>
  );
}
