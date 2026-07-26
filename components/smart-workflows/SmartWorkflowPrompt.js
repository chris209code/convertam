import Link from 'next/link';

// A small, clearly-labeled link to the Smart Workflows platform feature —
// deliberately NOT styled as a tool card, so it never reads as "one more
// tool" in a suite's tool grid.
export default function SmartWorkflowPrompt() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', margin: '0 0 24px' }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E3A8A' }}>
        <strong>Not sure where to start?</strong> Tell Smart Workflows what you're trying to accomplish and get the right tools, in order.
      </p>
      <Link href="/smart-workflows" style={{ padding: '8px 16px', borderRadius: 8, background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Try Smart Workflows →
      </Link>
    </div>
  );
}
