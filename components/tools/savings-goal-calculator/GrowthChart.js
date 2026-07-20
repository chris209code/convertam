'use client';

// Zero-dependency SVG growth chart — same plain-function-of-props approach
// as DoughnutChart.js and the Break-even Calculator's BreakEvenChart.js.
// Stacks Contributions (principal saved, including the starting balance)
// beneath Interest Earned, and draws a Goal reference line, across the
// life of the plan.

const W = 480;
const H = 220;
const PAD_L = 54;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;
const MAX_POINTS = 30;

// Long schedules (multi-year monthly plans) are sampled down to a fixed
// number of points for a smooth, legible line — always keeping the very
// first and last month so the chart's start and end are exact.
function sampleSchedule(schedule, maxPoints) {
  if (schedule.length <= maxPoints) return schedule;
  const step = (schedule.length - 1) / (maxPoints - 1);
  const sampled = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(schedule[Math.round(i * step)]);
  }
  return sampled;
}

export default function GrowthChart({ schedule, goalAmount, presentValue }) {
  if (!schedule || schedule.length < 2) return null;
  const points = sampleSchedule(schedule, MAX_POINTS);
  const maxMonth = points[points.length - 1].month;
  const maxValue = Math.max(goalAmount, ...points.map((p) => p.balance), 1);

  const scaleX = (month) => PAD_L + (maxMonth > 0 ? (month / maxMonth) * (W - PAD_L - PAD_R) : 0);
  const scaleY = (value) => H - PAD_B - (value / maxValue) * (H - PAD_T - PAD_B);

  const principalPoints = points.map((p) => `${scaleX(p.month)},${scaleY(presentValue + p.totalContributions)}`).join(' ');
  const balancePoints = points.map((p) => `${scaleX(p.month)},${scaleY(p.balance)}`).join(' ');
  const principalArea = `${scaleX(0)},${H - PAD_B} ${principalPoints} ${scaleX(maxMonth)},${H - PAD_B}`;
  const balanceArea = `${scaleX(0)},${scaleY(presentValue)} ${balancePoints} ${scaleX(maxMonth)},${scaleY(points[points.length - 1].balance - points[points.length - 1].totalInterest)}`;

  const goalY = scaleY(goalAmount);
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PAD_T + f * (H - PAD_T - PAD_B));

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Savings growth chart: contributions and interest over time, against your goal">
        {gridLines.map((y, i) => (
          <line key={i} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#E2E8F0" strokeWidth="1" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#E2E8F0" strokeWidth="1" />

        <polygon points={balanceArea} fill="#F59E0B" opacity="0.28" />
        <polygon points={principalArea} fill="#2563EB" opacity="0.35" />
        <polyline points={principalPoints} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={balancePoints} fill="none" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />

        {goalY >= PAD_T && goalY <= H - PAD_B && (
          <>
            <line x1={PAD_L} y1={goalY} x2={W - PAD_R} y2={goalY} stroke="#059669" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - PAD_R} y={goalY - 5} textAnchor="end" fontSize="9.5" fontWeight="700" fill="#059669">Goal</text>
          </>
        )}

        <text x={PAD_L} y={H - 8} fontSize="9.5" fill="#94A3B8">Month 0</text>
        <text x={W - PAD_R} y={H - 8} textAnchor="end" fontSize="9.5" fill="#94A3B8">Month {maxMonth}</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: '0.76rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB', opacity: 0.6, display: 'inline-block' }} /> Contributions</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: '#F59E0B', opacity: 0.6, display: 'inline-block' }} /> Interest</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}><span aria-hidden="true" style={{ width: 14, height: 0, borderTop: '2px dashed #059669', display: 'inline-block' }} /> Goal</span>
      </div>
    </div>
  );
}
