import WorkflowSteps from './WorkflowSteps';

// Renders an article's `body` array (see lib/learn/articles/*.js for the
// shape) into real semantic HTML. Deliberately small — 5 block types, not a
// general-purpose page builder — matching the codebase's established
// preference for plain, purpose-built data over a heavier system.
export default function ArticleContent({ body }) {
  return (
    <div className="lrn-content">
      {body.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <h2 key={i} id={block.id}>{block.text}</h2>;
          case 'paragraph':
            return <p key={i}>{block.text}</p>;
          case 'list':
            return block.ordered ? (
              <ol key={i}>{block.items.map((item, j) => <li key={j}>{item}</li>)}</ol>
            ) : (
              <ul key={i}>{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            );
          case 'callout':
            return (
              <div key={i} className={`lrn-callout lrn-callout-${block.tone || 'info'}`}>
                {block.text}
              </div>
            );
          case 'workflow-steps':
            return <WorkflowSteps key={i} intro={block.intro} steps={block.steps} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
