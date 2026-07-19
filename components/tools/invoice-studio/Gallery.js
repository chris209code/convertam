'use client';

import { useMemo } from 'react';
import { FileClock } from 'lucide-react';
import { TEMPLATE_GALLERY, stylesFor, GOOGLE_FONTS_HREF } from '@/lib/invoice-studio/styleTokens';
import { emptyDoc } from '@/lib/invoice-studio/sectionsModel';
import { computeInvoiceTotals } from '@/lib/invoice-studio/calculations';
import { amountInWords } from '@/lib/invoice-studio/numberToWords';
import { renderInvoiceHtml } from '@/lib/invoice-studio/htmlRenderer';

const cardStyle = {
  background: '#fff', borderRadius: 14, border: '1px solid #E7EAF0', overflow: 'hidden', cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15,23,42,.03)', textAlign: 'left', padding: 0, font: 'inherit',
};

// Real invoice content on sample data (the same shape every new invoice
// starts from), rendered through the exact same function that produces the
// live editor's canvas and the downloaded PDF — so a card can never show a
// template that looks different from what opening it actually gives you,
// the same "one source of truth" reasoning behind not hand-porting a
// second copy of the CV templates earlier in this codebase.
const PREVIEW_DOC = emptyDoc();
const PREVIEW_ROWS = PREVIEW_DOC.sections.itemsTable.rows;
const PREVIEW_TOTALS = computeInvoiceTotals(PREVIEW_ROWS, PREVIEW_DOC.discount);
const PREVIEW_WORDS = amountInWords(PREVIEW_TOTALS.total, PREVIEW_DOC.currency);

// renderInvoiceHtml's canvas is a fixed 714px-wide box; scaling it down to
// this card's preview width and letting the fixed-height wrapper clip the
// rest gives a "peek from the top" thumbnail — showing the header, colors,
// and layout style, which is exactly the part that differs most between
// templates, without needing the card grid to grow tall enough to fit an
// entire A4-shaped page.
const PREVIEW_SOURCE_WIDTH = 714;
const PREVIEW_WIDTH = 210;
const PREVIEW_HEIGHT = 130;
const PREVIEW_SCALE = PREVIEW_WIDTH / PREVIEW_SOURCE_WIDTH;

export default function Gallery({ onSelectTemplate, hasSavedDraft, savedDraftTemplateName, onResumeDraft }) {
  const previewHtmlByTemplate = useMemo(() => {
    const map = {};
    for (const card of TEMPLATE_GALLERY) {
      map[card.id] = renderInvoiceHtml(PREVIEW_DOC, stylesFor(card.id), PREVIEW_TOTALS, PREVIEW_WORDS);
    }
    return map;
  }, []);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
      {/* Same font source the PDF export path already loads (see
          htmlRenderer.js) — the preview reuses renderInvoiceHtml's raw HTML
          output as-is, which sets font-family by literal name rather than
          the app's next/font CSS variables, so it needs this to render in
          the real Poppins/Inter/Caveat instead of falling back silently. */}
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Invoice Studio</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Pick a template to open the canvas. Every layout is genuinely different, not just a colour swap.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
        {hasSavedDraft && (
          <button onClick={onResumeDraft} style={cardStyle}>
            <div style={{ position: 'relative', height: PREVIEW_HEIGHT, background: '#F3F5F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileClock size={28} color="#94A3B8" strokeWidth={1.6} />
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Continue Draft</div>
              <div style={{ fontSize: 11, color: '#8891A0', marginTop: 2 }}>{savedDraftTemplateName}</div>
            </div>
          </button>
        )}
        {TEMPLATE_GALLERY.map((card) => (
          <button key={card.id} onClick={() => onSelectTemplate(card.id)} style={cardStyle}>
            <div style={{ height: PREVIEW_HEIGHT, overflow: 'hidden', position: 'relative', background: '#F8FAFC' }}>
              <div
                style={{ width: PREVIEW_SOURCE_WIDTH, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: previewHtmlByTemplate[card.id] }}
              />
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{card.name}</div>
              <div style={{ fontSize: 11, color: '#8891A0', marginTop: 2 }}>{card.category}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
