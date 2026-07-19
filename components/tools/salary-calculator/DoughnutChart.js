'use client';

// Zero-dependency SVG doughnut chart — plain stacked stroke-dasharray
// circles, no charting library. Fully responsive (viewBox scales with
// its container) and re-renders instantly from whatever segments are
// passed in, since it's a pure function of props with no internal state.

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DoughnutChart({ segments, centerLabel, centerSubLabel }) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  let cumulative = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${centerLabel} ${centerSubLabel}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {total > 0 && segments.map((s) => {
              if (s.value <= 0) return null;
              const fraction = s.value / total;
              const length = fraction * CIRCUMFERENCE;
              const offset = cumulative;
              cumulative += length;
              return (
                <circle
                  key={s.label}
                  cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
                  stroke={s.color} strokeWidth={STROKE}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
            })}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>{centerLabel}</div>
          <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>{centerSubLabel}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180, flex: 1 }}>
        {segments.map((s) => {
          const pct = total > 0 ? (Math.max(0, s.value) / total) * 100 : 0;
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, rowGap: 2, flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155', minWidth: 0 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span>{s.label}</span>
              </span>
              <span style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                <span style={{ color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{s.displayValue}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
