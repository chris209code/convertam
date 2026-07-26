'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WORKFLOWS, totalEstimatedMinutes } from '@/lib/smartWorkflows/catalogue';
import { matchWorkflow, SUGGESTED_GOALS } from '@/lib/smartWorkflows/matcher';
import { startWorkflowProgress } from '@/lib/smartWorkflows/progress';
import { getTool } from '@/lib/tools-config';

function stepHref(step) {
  if (step.href) return step.href;
  if (step.toolSlug) {
    const tool = getTool(step.toolSlug);
    return tool?.basePath ? `/${tool.basePath}/${tool.slug}` : `/${step.toolSlug}`;
  }
  return null;
}

function StepRow({ step, index, onStart }) {
  const isInfo = !!step.info;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isInfo ? '#E2E8F0' : '#DBEAFE', color: isInfo ? '#64748B' : '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
        {isInfo ? '✓' : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{step.label || (step.toolSlug && getTool(step.toolSlug)?.title)}</p>
          {step.optional && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '1px 7px', borderRadius: 999 }}>OPTIONAL</span>}
          {step.estimatedMinutes && <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>~{step.estimatedMinutes} min</span>}
        </div>
        {step.reason && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>{step.reason}</p>}
        {index === 0 && !isInfo && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {step.options
              ? step.options.map((opt) => (
                  <button key={opt.toolSlug} onClick={() => onStart(opt.toolSlug)} style={startBtn}>{opt.label} →</button>
                ))
              : <button onClick={() => onStart(null)} style={startBtn}>Start Workflow →</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const startBtn = { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' };

function WorkflowCard({ workflow, onStart }) {
  const minutes = totalEstimatedMinutes(workflow);
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2563EB' }}>Recommended Workflow</p>
      <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0F172A' }}>{workflow.title}</h3>
      <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#64748B' }}>{workflow.description}</p>
      {minutes > 0 && <p style={{ margin: '0 0 10px', fontSize: '0.74rem', color: '#94A3B8' }}>Estimated total time: ~{minutes} minutes (including optional steps)</p>}
      <div>
        {workflow.steps.map((step, i) => <StepRow key={i} step={step} index={i} onStart={(slug) => onStart(workflow, step, slug)} />)}
      </div>
    </div>
  );
}

export default function SmartWorkflowLauncher({ compact = false }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [matched, setMatched] = useState(null);
  const [searched, setSearched] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);

  function runSearch(q) {
    setQuery(q);
    setSearched(true);
    setBrowseAll(false);
    setMatched(matchWorkflow(q));
  }

  function handleStart(workflow, firstStep, chosenSlug) {
    startWorkflowProgress(workflow.id, workflow.steps.length);
    const href = chosenSlug ? (getTool(chosenSlug)?.basePath ? `/${getTool(chosenSlug).basePath}/${chosenSlug}` : `/${chosenSlug}`) : stepHref(firstStep);
    if (href) router.push(href);
  }

  return (
    <div style={compact ? {} : { maxWidth: 720, margin: '0 auto' }}>
      {!compact && (
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563EB', margin: '0 0 6px' }}>Platform Feature</p>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 6px', color: '#0F172A' }}>What are you trying to accomplish?</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>Tell us your goal and we'll recommend the right tools, in the right order.</p>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Apply for a job, sign a contract, submit an assignment…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.88rem' }}
        />
        <button type="submit" style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Find Workflow</button>
      </form>

      {!searched && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {SUGGESTED_GOALS.map((g) => (
            <button key={g} onClick={() => runSearch(g)} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', fontSize: '0.76rem', color: '#475569', cursor: 'pointer' }}>{g}</button>
          ))}
        </div>
      )}

      {searched && matched && (
        <div style={{ marginTop: 14 }}>
          <WorkflowCard workflow={matched} onStart={handleStart} />
        </div>
      )}

      {searched && !matched && (
        <div style={{ marginTop: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14 }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400E' }}>We couldn't find an exact match for that goal — here are the workflows we support so far.</p>
        </div>
      )}

      {(browseAll || (searched && !matched)) && (
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {WORKFLOWS.map((w) => (
            <WorkflowCard key={w.id} workflow={w} onStart={handleStart} />
          ))}
        </div>
      )}

      {!browseAll && !(searched && !matched) && (
        <button onClick={() => setBrowseAll(true)} style={{ marginTop: 8, fontSize: '0.78rem', color: '#2563EB', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Browse all workflows</button>
      )}
    </div>
  );
}
