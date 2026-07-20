'use client';

// Zero-dependency SVG break-even chart — same "plain function of props,
// no charting library" approach as DoughnutChart.js. Plots a Total Cost
// line and a Revenue line across a unit range, marks where they cross
// (break-even) and where expected sales fall relative to that crossing.

const W = 480;
const H = 240;
const PAD_L = 54;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

function toPoints(series, xKey, yKey, scaleX, scaleY) {
  return series.map((p) => `${scaleX(p[xKey])},${scaleY(p[yKey])}`).join(' ');
}

export default function BreakEvenChart({ data, currency }) {
  if (!data) return null;
  const { series, maxUnits, breakEvenUnits, breakEvenRevenue, expectedUnits, expectedRevenue } = data;

  const maxValue = Math.max(...series.map((p) => Math.max(p.totalCost, p.revenue)), 1);
  const scaleX = (units) => PAD_L + (units / maxUnits) * (W - PAD_L - PAD_R);
  const scaleY = (value) => H - PAD_B - (value / maxValue) * (H - PAD_T - PAD_B);

  const costPoints = toPoints(series, 'units', 'totalCost', scaleX, scaleY);
  const revPoints = toPoints(series, 'units', 'revenue', scaleX, scaleY);

  const beX = scaleX(breakEvenUnits);
  const beY = scaleY(breakEvenRevenue);
  const showExpected = expectedUnits > 0;
  const expX = scaleX(Math.min(expectedUnits, maxUnits));
  const expYRevenue = scaleY(Math.min(expectedRevenue, maxValue));

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PAD_T + f * (H - PAD_T - PAD_B));

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Break-even chart: total cost and revenue by units sold">
        {gridLines.map((y, i) => (
          <line key={i} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#E2E8F0" strokeWidth="1" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#E2E8F0" strokeWidth="1" />

        {showExpected && (
          <line x1={expX} y1={PAD_T} x2={expX} y2={H - PAD_B} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
        )}

        <polyline points={costPoints} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={revPoints} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={beX} cy={beY} r="5" fill="#059669" stroke="#fff" strokeWidth="1.5" />
        <text x={beX} y={beY - 10} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#059669">Break-even</text>

        {showExpected && (
          <circle cx={expX} cy={expYRevenue} r="4.5" fill="#7C3AED" stroke="#fff" strokeWidth="1.5" />
        )}

        <text x={PAD_L} y={H - 10} fontSize="9.5" fill="#94A3B8">0</text>
        <text x={W - PAD_R} y={H - 10} textAnchor="end" fontSize="9.5" fill="#94A3B8">{Math.round(maxUnits).toLocaleString()} units</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: '0.76rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 14, height: 2.5, background: '#F59E0B', display: 'inline-block' }} /> Total Cost</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 14, height: 2.5, background: '#2563EB', display: 'inline-block' }} /> Revenue</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: '#059669', display: 'inline-block' }} /> Break-even</span>
        {showExpected && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} /> Expected Sales</span>}
      </div>
      <p style={{ fontSize: '0.7rem', color: currency ? '#94A3B8' : 'transparent', margin: '4px 0 0' }}>
        Values in {currency}, rounded for display.
      </p>
    </div>
  );
}
