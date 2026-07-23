'use client';

// Sticky sidebar on desktop, plain block on mobile (the shared stylesheet's
// max-width:1024px rule drops `position: sticky` back to static there).
// `items` comes from lib/learn/index.js's getTableOfContents(article) — the
// same `id`s are used as real heading anchors in ArticleContent.js, so this
// is just anchor links + native smooth scroll (matching the
// scrollToSection convention already used on category hub pages).
export default function TableOfContents({ items }) {
  if (!items || items.length === 0) return null;

  function handleClick(e, id) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="lrn-toc" aria-label="Table of contents">
      <p className="lrn-toc-title">On this page</p>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className="lrn-toc-link" onClick={(e) => handleClick(e, item.id)}>
          {item.text}
        </a>
      ))}
    </nav>
  );
}
