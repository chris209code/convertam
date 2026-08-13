'use client';

import { useMemo, useRef, useState } from 'react';

// A generic version of Smart Parser's sibling JsonEditor.js — same
// textarea+overlay-<pre> architecture (line-number gutter, tokenized
// syntax-highlight overlay synced to the transparent-text textarea below
// it), just parameterized by a `tokenize` function and a token-type ->
// CSS-class map instead of being hardwired to JSON. SQL Studio and XML
// Studio both use this rather than each hand-rolling their own editor.
const HIGHLIGHT_MAX_BYTES = 200 * 1024;

export default function CodeEditor({ value, onChange, readOnly, placeholder, id, tokenize, tokenClass, minHeight = 260 }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);

  const tooLargeForHighlight = value.length > HIGHLIGHT_MAX_BYTES;

  const lineNumbers = useMemo(() => {
    if (tooLargeForHighlight) return null;
    const lineCount = value === '' ? 1 : value.split('\n').length;
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [value, tooLargeForHighlight]);

  const tokens = useMemo(() => {
    if (tooLargeForHighlight) return null;
    try { return tokenize(value); } catch { return null; }
  }, [value, tooLargeForHighlight, tokenize]);

  function syncScroll() {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  return (
    <div className="ce-wrap" style={{ '--ce-min-h': `${minHeight}px` }}>
      {!tooLargeForHighlight && lineNumbers && (
        <div ref={gutterRef} className="ce-gutter" aria-hidden="true">
          {lineNumbers.map((n) => <div key={n} className="ce-gutter-line">{n}</div>)}
        </div>
      )}
      <div className="ce-editor-area">
        {!tooLargeForHighlight && tokens && (
          <pre ref={preRef} className="ce-highlight" aria-hidden="true">
            {tokens.length === 0 ? '​' : tokens.map((t, i) => {
              if (t.type === 'ws') return t.text;
              return <span key={i} className={tokenClass[t.type] || ''}>{t.text}</span>;
            })}
          </pre>
        )}
        <textarea
          id={id}
          ref={textareaRef}
          className={`ce-textarea ${tooLargeForHighlight ? 'ce-textarea-plain' : 'ce-textarea-overlay'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
      {tooLargeForHighlight && (
        <p className="ce-note">Syntax highlighting is off for documents over 200 KB to keep things fast.</p>
      )}
      <style jsx>{`
        .ce-wrap { display: flex; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; background: #F8FAFC; }
        .ce-gutter { flex-shrink: 0; padding: 14px 8px; text-align: right; background: #F1F5F9; color: #94A3B8; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; line-height: 1.55; overflow: hidden; height: var(--ce-min-h); user-select: none; }
        .ce-gutter-line { }
        .ce-editor-area { position: relative; flex: 1; min-width: 0; }
        .ce-highlight, .ce-textarea { margin: 0; padding: 14px; width: 100%; height: var(--ce-min-h); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; line-height: 1.55; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; }
        .ce-highlight { position: absolute; inset: 0; overflow: auto; color: #0F172A; pointer-events: none; }
        .ce-textarea { position: relative; border: none; outline: none; resize: vertical; background: transparent; overflow: auto; }
        .ce-textarea-overlay { color: transparent; caret-color: #0F172A; }
        .ce-textarea-plain { color: #0F172A; background: #F8FAFC; }
        .ce-textarea:focus { box-shadow: inset 0 0 0 2px #0891B2; }
        .ce-note { font-size: 0.7rem; color: #94A3B8; padding: 6px 10px 0; }
        :global(.ce-keyword) { color: #0E7490; font-weight: 700; }
        :global(.ce-string) { color: #059669; }
        :global(.ce-number) { color: #7C3AED; }
        :global(.ce-comment) { color: #94A3B8; font-style: italic; }
        :global(.ce-ident) { color: #0F172A; }
        :global(.ce-punct) { color: #64748B; }
        :global(.ce-tag) { color: #0E7490; font-weight: 600; }
        :global(.ce-attr) { color: #B45309; }
        @media (max-width: 640px) {
          .ce-gutter, .ce-highlight, .ce-textarea { height: 220px; }
        }
      `}</style>
    </div>
  );
}
