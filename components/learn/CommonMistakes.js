// "Common mistakes" section — visually distinct "watch out" cards, not the
// FAQ accordion, since these are warnings to read once, not collapsible Q&As.
export default function CommonMistakes({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginBottom: 30 }}>
      <p className="lrn-section-label">Common Mistakes</p>
      <div className="lrn-mistakes">
        {items.map((item, i) => (
          <div key={i} className="lrn-mistake">
            <span className="lrn-mistake-icon" aria-hidden="true">⚠️</span>
            <div>
              <p className="lrn-mistake-title">{item.mistake}</p>
              <p className="lrn-mistake-why">{item.why}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
