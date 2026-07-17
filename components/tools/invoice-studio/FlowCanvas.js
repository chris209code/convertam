'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  LetterheadSection, HeaderSection, ClientInfoSection, ItemsTableSection, TotalsSection,
  NotesSection, PaymentBankSection, TermsSection, FooterSection, QrOverlay,
} from './sections/SectionComponents';

// A4 at 96dpi. Same physical page size used throughout this rewrite and
// the PDF path, so the editor's page breaks land in approximately the
// same place the PDF's real pagination will.
const PAGE_W = 794;
const PAGE_H = 1123;
const PAGE_PADDING = 40; // matches the invoice's own internal margin, same reasoning as the earlier double-margin fix
const USABLE_H = PAGE_H - PAGE_PADDING * 2;
const FOOTER_H = 56; // footer is fixed-height and always reserved on every page

// Ordered as they render — this order IS the document flow, exactly as
// approved. Watermark/stamp/QR are overlays (see below), not part of flow.
const FLOW_KEYS = ['letterhead', 'header', 'clientInfo', 'itemsTable', 'totals', 'notes', 'paymentBank', 'terms'];

function SectionByKey({ sectionKey, doc, style, totals, wordsText }) {
  const s = doc.sections;
  switch (sectionKey) {
    case 'letterhead': return <LetterheadSection data={s.letterhead} />;
    case 'header': return <HeaderSection data={s.header} style={style} />;
    case 'clientInfo': return <ClientInfoSection data={s.clientInfo} style={style} />;
    case 'itemsTable': return <ItemsTableSection data={s.itemsTable} style={style} currency={doc.currency} />;
    case 'totals': return <TotalsSection data={s.totals} style={style} currency={doc.currency} totals={totals} wordsText={wordsText} />;
    case 'notes': return <NotesSection data={s.notes} style={style} />;
    case 'paymentBank': return <PaymentBankSection payment={s.payment} bank={s.bank} signature={s.signature} style={style} />;
    case 'terms': return <TermsSection data={s.terms} style={style} />;
    default: return null;
  }
}

export default function FlowCanvas({ doc, style, totals, wordsText, zoom, onFitZoomChange }) {
  const containerRef = useRef(null);
  const measureRefs = useRef({});
  const [pages, setPages] = useState(null); // null while un-measured yet; array of arrays of section keys once computed

  // Pass 1: render every section once, unpaginated, purely to measure real
  // heights. Pass 2 (below) re-renders using those measurements, grouped
  // into actual page containers. This is the only reliable way to know
  // how tall a section is — asking the browser, not guessing a number.
  useLayoutEffect(() => {
    const heights = FLOW_KEYS.map((key) => {
      const el = measureRefs.current[key];
      return { key, height: el ? el.getBoundingClientRect().height : 0 };
    }).filter((s) => s.height > 0 || doc.sections[s.key === 'paymentBank' ? 'payment' : s.key]?.visible !== false);

    const grouped = [[]];
    let currentH = 0;
    for (const { key, height } of heights) {
      if (height === 0) continue; // section rendered nothing (hidden/empty) - takes no page space at all
      if (currentH + height > USABLE_H - FOOTER_H && grouped[grouped.length - 1].length > 0) {
        grouped.push([]);
        currentH = 0;
      }
      grouped[grouped.length - 1].push(key);
      currentH += height;
    }
    setPages(grouped.length ? grouped : [[]]);
    // Re-measure whenever the actual content changes - a new row, a longer
    // note, a template swap all change real heights, so pagination has to
    // be recomputed from scratch each time, not cached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(doc.sections), doc.currency, doc.discount, doc.vatRate, style]);

  // Fit-to-page zoom, same principle as the earlier single-page version:
  // measure the actual available container space and report the ideal
  // zoom upward, applied unless the person has manually zoomed since.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const compute = () => {
      const availW = el.clientWidth - 64;
      const availH = el.clientHeight - 64;
      if (availW <= 0 || availH <= 0) return;
      onFitZoomChange(Math.max(0.1, Math.min(availW / PAGE_W, availH / PAGE_H)));
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    return () => obs.disconnect();
  }, [onFitZoomChange]);

  const pageStyle = {
    width: PAGE_W, minHeight: PAGE_H, background: '#fff', padding: PAGE_PADDING,
    boxShadow: '0 8px 30px rgba(15,23,42,.12)', position: 'relative', flexShrink: 0,
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  };

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, background: '#EEF1F5', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        {/* Invisible measurement pass — same content, unpaginated, used only to compute real heights before the real (visible) pass below. */}
        <div aria-hidden style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: PAGE_W - PAGE_PADDING * 2 }}>
          {FLOW_KEYS.map((key) => (
            <div key={key} ref={(node) => { measureRefs.current[key] = node; }}>
              <SectionByKey sectionKey={key} doc={doc} style={style} totals={totals} wordsText={wordsText} />
            </div>
          ))}
        </div>

        {/* Real, visible, paginated output — separate A4 sheets with a
            genuine visible gap between them, not one continuous scroll. */}
        {(() => {
          const allPages = pages || [FLOW_KEYS];
          // QR is payment-related, so it belongs on whichever page the
          // payment/bank/signature row actually landed on — falls back to
          // the last page if that section is hidden.
          const qrPageIndex = Math.max(0, allPages.findIndex((keys) => keys.includes('paymentBank')));
          return allPages.map((pageKeys, pageIndex) => (
            <div key={pageIndex} style={{ ...pageStyle, marginBottom: pageIndex < allPages.length - 1 ? 40 : 0 }}>
              <div style={{ minHeight: USABLE_H - FOOTER_H }}>
                {pageKeys.map((key) => <SectionByKey key={key} sectionKey={key} doc={doc} style={style} totals={totals} wordsText={wordsText} />)}
              </div>
              {pageIndex === qrPageIndex && <QrOverlay data={doc.sections.qr} footerHeight={FOOTER_H} />}
              <FooterSection data={doc.sections.footer} style={style} pageLabel={`Page ${pageIndex + 1} of ${allPages.length}`} />
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
