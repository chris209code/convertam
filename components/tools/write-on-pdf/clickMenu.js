'use client';

// Shown when the Text tool is clicked near an existing text item (tier 2/3
// territory — no real AcroForm field there; see formFields.js for tier 1,
// which always wins before this menu is ever considered). Presents three
// honestly-labeled choices rather than silently picking one behavior — see
// the project plan's "click-to-replace honesty" requirement. None of these
// options remove or modify the original PDF's own text object; only
// "Cover and replace visually" is even visually close to "replacing" it,
// and it does so by painting over it, which the label says plainly.
export default function ClickMenu({ x, y, onAddTextHere, onMatchNearbyStyle, onCoverAndReplace, onDismiss }) {
  return (
    <>
      {/* Absolute (not fixed) so it covers exactly the page area it's
          rendered inside, which already sits inside a CSS `transform:
          scale()` wrapper — a fixed-position backdrop would be sized
          against that transformed ancestor's box instead of the real
          viewport, per how CSS treats `position: fixed` under a
          transformed ancestor. */}
      <div
        onClick={onDismiss}
        style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'transparent', pointerEvents: 'auto' }}
      />
      <div
        style={{
          position: 'absolute', left: x, top: y, zIndex: 41, pointerEvents: 'auto',
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(15,23,42,0.18)', padding: 6, minWidth: 210,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}
      >
        <MenuItem icon="✏️" label="Add text here" sub="Places new text next to this line" onClick={onAddTextHere} />
        <MenuItem icon="🎯" label="Match nearby style" sub="Same, but keeps the style match visible" onClick={onMatchNearbyStyle} />
        <MenuItem icon="🩹" label="Cover and replace visually" sub="Paints over this text — doesn't edit it" onClick={onCoverAndReplace} />
      </div>
    </>
  );
}

function MenuItem({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
        padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
        <span aria-hidden="true" style={{ marginRight: 6 }}>{icon}</span>{label}
      </span>
      <span style={{ fontSize: '0.7rem', color: '#64748B', paddingLeft: 20 }}>{sub}</span>
    </button>
  );
}
