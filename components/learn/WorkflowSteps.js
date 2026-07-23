import Link from 'next/link';
import { getTool } from '@/lib/tools-config';

// Visual, connected step-chain for Workflow Guides — per product direction,
// workflow articles should not read as ordinary text-heavy prose. Each step
// is {label, description, toolSlug?} — toolSlug is optional (a step can be
// a plain action like "Take a photo" with nothing to link to) and, when
// present, resolves to a real tool via getTool() and links straight there.
export default function WorkflowSteps({ intro, steps }) {
  return (
    <div className="lrn-workflow">
      {intro && <p className="lrn-workflow-intro">{intro}</p>}
      <div className="lrn-workflow-chain">
        {steps.map((step, i) => {
          const tool = step.toolSlug ? getTool(step.toolSlug) : null;
          const Wrapper = tool ? Link : 'div';
          const wrapperProps = tool ? { href: `/${tool.slug}` } : {};
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch' }}>
              <Wrapper {...wrapperProps} className="lrn-workflow-step">
                <span className="lrn-workflow-step-num">{i + 1}</span>
                <p className="lrn-workflow-step-label">{step.label}</p>
                {step.description && <p className="lrn-workflow-step-desc">{step.description}</p>}
                {tool && <span className="lrn-workflow-step-tool">{tool.title} →</span>}
              </Wrapper>
              {i < steps.length - 1 && <span className="lrn-workflow-arrow" aria-hidden="true">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
