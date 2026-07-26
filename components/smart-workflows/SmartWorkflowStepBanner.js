'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getWorkflow } from '@/lib/smartWorkflows/catalogue';
import { getActiveWorkflow, advanceWorkflow, clearWorkflowProgress } from '@/lib/smartWorkflows/progress';
import { getTool } from '@/lib/tools-config';

function toolHref(slug) {
  const tool = getTool(slug);
  return tool?.basePath ? `/${tool.basePath}/${tool.slug}` : `/${slug}`;
}

function stepHref(step) {
  if (!step) return null;
  if (step.href) return step.href;
  if (step.toolSlug) return toolHref(step.toolSlug);
  return null;
}

// True if the CURRENT URL is one this step could plausibly be completed
// from — its own href/toolSlug, or (for a choice step) any of its options.
// Matching on the real path rather than a slug passed down the tree means
// this works identically for ordinary [tool] pages and for steps that
// point at a hub/panel page (e.g. "Import Job Posting" -> /career-studio).
function stepMatchesPath(step, pathname) {
  if (!step) return false;
  if (stepHref(step) === pathname) return true;
  if (step.options) return step.options.some((o) => toolHref(o.toolSlug) === pathname);
  return false;
}

// Renders nothing unless a Smart Workflow is actively in progress — this is
// the "show progress through the active workflow" + "available from the
// workspace after completing a tool" requirement, wired once into the
// shared tool-page and category-hub layouts rather than duplicated per page.
export default function SmartWorkflowStepBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [progress, setProgress] = useState(null);

  useEffect(() => { setProgress(getActiveWorkflow()); }, [pathname]);

  if (!progress) return null;
  const workflow = getWorkflow(progress.workflowId);
  if (!workflow) return null;
  const currentStep = workflow.steps[progress.currentStepIndex];
  if (!currentStep) return null; // finished, nothing left to show

  function goTo(href) {
    if (href) router.push(href);
  }

  function handleContinue() {
    const next = advanceWorkflow();
    if (!next) return;
    const nextStep = workflow.steps[next.currentStepIndex];
    if (!nextStep) { setProgress(null); return; }
    setProgress(next);
    if (nextStep.info || nextStep.options) return; // shown in place, no auto-navigation
    goTo(stepHref(nextStep));
  }

  function handleSkip() {
    const next = advanceWorkflow({ skipped: true });
    if (!next) return;
    const nextStep = workflow.steps[next.currentStepIndex];
    setProgress(next);
    if (nextStep && !nextStep.info && !nextStep.options) goTo(stepHref(nextStep));
  }

  function handleFinish() {
    clearWorkflowProgress();
    setProgress(null);
  }

  // A choice step has no single "home" page to be "on" — showing the
  // choice IS the action, so it renders directly rather than behind an
  // off-path reminder (which would otherwise just point at the first option).
  const isOnStep = stepMatchesPath(currentStep, pathname) || !!currentStep.options;
  const stepNum = progress.currentStepIndex + 1;

  if (currentStep.info) {
    return (
      <div style={bannerStyle('#F0FDF4', '#BBF7D0')}>
        <div>
          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>🎉 {workflow.title} — almost done</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>{currentStep.label}</p>
        </div>
        <button onClick={handleFinish} style={pillBtn('#166534', '#DCFCE7')}>Finish Workflow</button>
      </div>
    );
  }

  if (!isOnStep) {
    return (
      <div style={bannerStyle('#EFF6FF', '#BFDBFE')}>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A' }}>{workflow.title} — Step {stepNum} of {workflow.steps.length}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#1E3A8A' }}>Next: {currentStep.label}</p>
        </div>
        <button onClick={() => goTo(stepHref(currentStep) || (currentStep.options && toolHref(currentStep.options[0].toolSlug)))} style={pillBtn('#1E3A8A', '#DBEAFE')}>Go →</button>
      </div>
    );
  }

  return (
    <div style={{ ...bannerStyle('#EFF6FF', '#BFDBFE'), flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A' }}>{workflow.title} — Step {stepNum} of {workflow.steps.length}</p>
          {currentStep.reason && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#1E3A8A' }}>{currentStep.reason}</p>}
        </div>
        <button onClick={handleFinish} style={{ fontSize: '0.72rem', color: '#64748B', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Exit workflow</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {currentStep.options ? (
          currentStep.options.map((opt) => (
            <button key={opt.toolSlug} onClick={() => { advanceWorkflow(); goTo(toolHref(opt.toolSlug)); }} style={pillBtn('#1E3A8A', '#FFFFFF', true)}>{opt.label} →</button>
          ))
        ) : (
          <button onClick={handleContinue} style={pillBtn('#1E3A8A', '#FFFFFF', true)}>Mark Complete &amp; Continue →</button>
        )}
        {currentStep.optional && <button onClick={handleSkip} style={pillBtn('#1E3A8A', '#DBEAFE')}>Skip This Step</button>}
      </div>
    </div>
  );
}

function bannerStyle(bg, border) {
  return { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, flexWrap: 'wrap' };
}
function pillBtn(color, bg, solid = false) {
  return { padding: '7px 13px', borderRadius: 8, border: solid ? 'none' : `1px solid ${bg}`, background: solid ? color : bg, color: solid ? bg : color, fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' };
}
