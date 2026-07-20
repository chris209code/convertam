'use client';

import { useMemo, useRef, useState } from 'react';
import { tokenizeJson, findMatchingBracket } from './jsonEngine';

// Above this size, syntax highlighting/line numbers/bracket matching are
// skipped in favour of a plain fast textarea. Tokenizing into one <span>
// per token is what makes a highlighted editor feel instant on a typical
// paste — it's also exactly what would turn a 10MB document into
// millions of DOM nodes and freeze the tab, which is the one thing this
// tool is explicitly required not to do. 200KB comfortably covers the
// JSON someone is actually hand-editing; a multi-MB dump is something
// people paste once and then run through the pipeline/tree view, not
// something they need syntax colour on while typing.
const HIGHLIGHT_MAX_BYTES = 200 * 1024;

const TOKEN_CLASS = { key: 'je-key', string: 'je-string', number: 'je-number', boolean: 'je-boolean', null: 'je-null', 'punct-open': 'je-punct', 'punct-close': 'je-punct', punct: 'je-punct' };

export default function JsonEditor({ value, onChange, readOnly, placeholder, id }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);
  const [cursorOffset, setCursorOffset] = useState(null);

  const tooLargeForHighlight = value.length > HIGHLIGHT_MAX_BYTES;

  const lineNumbers = useMemo(() => {
    if (tooLargeForHighlight) return null;
    const lineCount = value === '' ? 1 : value.split('\n').length;
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [value, tooLargeForHighlight]);

  const tokens = useMemo(() => (tooLargeForHighlight ? null : tokenizeJson(value)), [value, tooLargeForHighlight]);
  const bracketPair = useMemo(() => {
    if (!tokens || cursorOffset == null) return null;
    return findMatchingBracket(tokens, cursorOffset);
  }, [tokens, cursorOffset]);

  function syncScroll() {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }
  function updateCursor() {
    setCursorOffset(textareaRef.current ? textareaRef.current.selectionStart : null);
  }

  return (
    <div className="je-wrap">
      {!tooLargeForHighlight && lineNumbers && (
        <div ref={gutterRef} className="je-gutter" aria-hidden="true">
          {lineNumbers.map((n) => <div key={n} className="je-gutter-line">{n}</div>)}
        </div>
      )}
      <div className="je-editor-area">
        {!tooLargeForHighlight && tokens && (
          <pre ref={preRef} className="je-highlight" aria-hidden="true">
            {tokens.length === 0 ? (
              // A lone leading '\n' as the *first* rendered content of a
              // <pre> is silently stripped by the browser's HTML parser
              // when parsing server-rendered markup (a longstanding HTML
              // spec quirk), but React's client-side tree still expects
              // that text node — a guaranteed hydration mismatch on empty
              // input. A zero-width space isn't subject to that rule.
              '​'
            ) : (
              tokens.map((t, i) => {
                const isBracketMatch = bracketPair && (t === bracketPair[0] || t === bracketPair[1]);
                if (t.type === 'ws') return t.text;
                return (
                  <span key={i} className={`${TOKEN_CLASS[t.type] || ''} ${isBracketMatch ? 'je-bracket-match' : ''}`}>{t.text}</span>
                );
              })
            )}
          </pre>
        )}
        {readOnly && tooLargeForHighlight ? (
          // A read-only <textarea> still pays the full editable-text-widget
          // cost (internal text-run building, undo buffer, etc.) just to
          // set a multi-MB .value — measured as the dominant cost when
          // applying a pipeline step to a 10MB+ document. Nothing here
          // needs editing, so a plain <pre> (which browsers treat as
          // ordinary read-only content) sidesteps that cost entirely.
          <pre id={id} className="je-textarea je-textarea-plain">{value}</pre>
        ) : (
          <textarea
            id={id}
            ref={textareaRef}
            className={`je-textarea ${tooLargeForHighlight ? 'je-textarea-plain' : 'je-textarea-overlay'}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyUp={updateCursor}
            onClick={updateCursor}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
          />
        )}
      </div>
      {tooLargeForHighlight && (
        <p className="je-note">Syntax highlighting is off for documents over 200 KB to keep things fast.</p>
      )}
    </div>
  );
}
