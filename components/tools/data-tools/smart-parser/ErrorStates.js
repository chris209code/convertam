'use client';
import { T } from './theme';

// One shared component for every failure mode Smart Parser can hit — never
// a silent failure or a bare "something went wrong." Each entry explains
// what happened in plain language and gives the one next useful action,
// per the product brief's explicit error-handling requirement.
const ERROR_COPY = {
  unsupported: {
    title: 'Unsupported file type',
    body: 'Smart Parser accepts PDF, Word (DOCX), CSV, Excel (XLSX/XLS), TXT, and image files (JPG/PNG/WebP).',
    action: 'Choose a different file',
  },
  oversized: {
    title: 'File too large',
    body: 'This file is larger than the 100MB limit. Please compress or split it first.',
    action: 'Choose a smaller file',
  },
  corrupt: {
    title: 'This file could not be opened',
    body: 'It may be corrupted, or saved in a format Smart Parser cannot read.',
    action: 'Try a different file',
  },
  password_protected: {
    title: 'This PDF is password-protected',
    body: 'Remove the password first — Unlock PDF can do this if you know the password — then upload the unlocked file here.',
    action: 'Go to Unlock PDF',
    href: '/unlock-pdf',
  },
  empty: {
    title: 'This document appears to be empty',
    body: 'No readable content was found in this file.',
    action: 'Choose a different file',
  },
  read_failed: {
    title: 'Could not read this file',
    body: 'An unexpected error occurred while reading it. It may be corrupted or in an unexpected format.',
    action: 'Try again',
  },
  ocr_failed: {
    title: 'Could not read this scanned document',
    body: 'The AI reading step could not extract text from this image or scan — it may be too low-resolution or unclear.',
    action: 'Try a clearer scan, or a different file',
  },
  table_detection_failed: {
    title: 'No tables detected',
    body: 'Smart Parser could not confidently find a table structure in this document. It may not contain a real table, or the layout is too irregular to detect automatically.',
    action: 'Try Extract Text instead, or Analyze with AI',
  },
  ai_unavailable: {
    title: 'AI enhancement is not available right now',
    body: 'The deterministic extraction above is unaffected — this only applies to the optional "Analyze with AI" step.',
    action: 'Continue without AI',
  },
  ai_timeout: {
    title: 'AI took too long to respond',
    body: 'This can happen with a very large document. The deterministic extraction above is unaffected.',
    action: 'Try again',
  },
  ai_error: {
    title: 'AI enhancement failed',
    body: 'The deterministic extraction above is unaffected — you can still review, edit, and export it.',
    action: 'Try again',
  },
};

export function ErrorPanel({ code, message, onRetry, onDismiss }) {
  const copy = ERROR_COPY[code] || { title: 'Something went wrong', body: message || 'Please try again.', action: 'Try again' };
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: 24, fontFamily: T.font, textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: '1rem', color: T.ink, marginBottom: 6 }}>{copy.title}</div>
      <div style={{ fontSize: '0.85rem', color: T.inkSecondary, marginBottom: 16, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>{message && code === 'unexpected' ? message : copy.body}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {copy.href ? (
          <a href={copy.href} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: 'white', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>{copy.action}</a>
        ) : onRetry ? (
          <button onClick={onRetry} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: T.font }}>{copy.action}</button>
        ) : null}
        {onDismiss && (
          <button onClick={onDismiss} style={{ padding: '10px 20px', borderRadius: 10, background: 'white', color: T.inkSecondary, border: `1px solid ${T.border}`, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: T.font }}>Dismiss</button>
        )}
      </div>
    </div>
  );
}

// A softer, non-blocking banner for "partially extracted" — the document
// still loaded and produced some result, this just flags that it may be
// incomplete rather than stopping the flow entirely.
export function WarningBanner({ children }) {
  return (
    <div style={{ background: T.warningTint, border: `1px solid #FDE68A`, borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#92400E', fontFamily: T.font, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span>⚠️</span>
      <span>{children}</span>
    </div>
  );
}
