'use client';

import { formatMoney } from '@/lib/invoice-studio/moneyFormat';
import { fontCss } from '@/lib/invoice-studio/styleTokens';
import { docTypeConfig } from '@/lib/invoice-studio/docTypes';

// Every section here is a normal block in document flow — no position,
// no absolute coordinates, no manually-assigned height. Margin-top spacing
// between sections is the only "layout" decision made here; everything
// else (how tall a section is) is simply whatever its content needs.
const SECTION_GAP = 22;

function Section({ children, style }) {
  return <div style={{ marginTop: SECTION_GAP, ...style }}>{children}</div>;
}

function companyAbbreviation(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function LetterheadSection({ data }) {
  if (!data.visible || !data.src) return null;
  return <div style={{ width: '100%' }}><img src={data.src} alt="Letterhead" style={{ width: '100%', display: 'block' }} /></div>;
}

export function HeaderSection({ data, style: tokens }) {
  if (!data.visible) return null;
  const centered = tokens.headerLayout === 'centered';
  const head = fontCss(tokens.headingFont), body = fontCss(tokens.bodyFont);

  const logo = (
    <div style={{ width: 56, height: 56, borderRadius: data.logoShape === 'rounded' ? 14 : '50%', flexShrink: 0, overflow: 'hidden' }}>
      {data.logoSrc
        ? <img src={data.logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <div style={{ width: '100%', height: '100%', background: tokens.brandPrimary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: head, fontWeight: 700, fontSize: 22 }}>{companyAbbreviation(data.companyName)}</div>}
    </div>
  );

  const companyBlock = (
    <div style={{ textAlign: centered ? 'center' : 'left' }}>
      <div style={{ fontFamily: head, fontWeight: 700, fontSize: 22, color: tokens.textDark }}>{data.companyName}</div>
      {data.tagline && <div style={{ fontFamily: body, fontSize: 12.5, color: tokens.textGray, marginTop: 2 }}>{data.tagline}</div>}
    </div>
  );

  const contactLines = [data.phone, data.email, data.website, data.address].filter(Boolean);
  const contactBlock = (
    <div style={{ textAlign: centered ? 'center' : 'right' }}>
      {contactLines.map((l, i) => <div key={i} style={{ fontFamily: body, fontSize: 12, color: tokens.textGray, lineHeight: 1.6 }}>{l}</div>)}
    </div>
  );

  return (
    <Section style={{ marginTop: 0 }}>
      {centered ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {logo}{companyBlock}{contactBlock}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{logo}{companyBlock}</div>
          {contactBlock}
        </div>
      )}
      <div style={{ height: 3, background: tokens.brandPrimary, marginTop: 18 }} />
    </Section>
  );
}

export function ClientInfoSection({ data, style: tokens, docType }) {
  if (!data.visible) return null;
  const config = docTypeConfig(docType);
  const head = fontCss(tokens.headingFont), body = fontCss(tokens.bodyFont);
  const metaRows = [
    [config.numberLabel, data.docNo],
    [config.dateLabel, data.docDate],
    config.secondaryDateLabel ? [config.secondaryDateLabel, data.secondaryDate] : null,
    config.statusLabel ? [config.statusLabel, data.status] : null,
  ].filter(Boolean);
  return (
    <Section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
      <div>
        <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: tokens.brandAccent, marginBottom: 6, textTransform: 'uppercase' }}>{config.partyLabel}</div>
        <div style={{ fontFamily: head, fontWeight: 600, fontSize: 16, color: tokens.textDark }}>{data.clientName}</div>
        {data.clientAddress && <div style={{ fontFamily: body, fontSize: 12, color: tokens.textGray, marginTop: 4, maxWidth: 260 }}>{data.clientAddress}</div>}
        {data.clientPhone && <div style={{ fontFamily: body, fontSize: 12, color: tokens.textGray }}>{data.clientPhone}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: head, fontWeight: 700, fontSize: 24, color: tokens.textDark, marginBottom: 8 }}>{config.documentTitle}</div>
        {metaRows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 4 }}>
            <span style={{ fontFamily: body, fontSize: 11.5, color: tokens.textMuted }}>{label}</span>
            <span style={{ fontFamily: body, fontSize: 12.5, fontWeight: 600, color: tokens.textDark, minWidth: 90, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// A real <table> with <thead>/<tbody> — the entire point of this rewrite
// for the items list. Fixed column widths mean Qty/Rate/VAT/Amount cannot
// physically overlap regardless of content; descriptions wrap naturally
// inside their own cell; row height is whatever the browser decides a row
// needs, never a guessed number; borders live on the row itself via
// border-bottom, so a divider is always exactly as long as its row.
export function ItemsTableSection({ data, style: tokens, currency }) {
  if (!data.visible) return null;
  const body = fontCss(tokens.bodyFont);
  const outline = tokens.tableHeaderStyle === 'outline';
  // The image column shows automatically whenever at least one row has an
  // uploaded product image — there's no separate manual toggle to forget
  // to flip on, so an uploaded image is never silently invisible.
  const showImages = data.rows.some((r) => r.img);

  const headCellStyle = {
    fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
    padding: '10px 8px', color: outline ? tokens.brandPrimary : '#fff', textAlign: 'left',
    borderBottom: outline ? `2px solid ${tokens.brandPrimary}` : 'none',
  };

  return (
    <Section>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: outline ? `1px solid ${tokens.brandPrimary}` : `1px solid ${tokens.divider}`, borderRadius: 10, overflow: 'hidden' }}>
        <colgroup>
          <col style={{ width: 28 }} />
          {showImages && <col style={{ width: 44 }} />}
          <col />
          <col style={{ width: 55 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 60 }} />
          <col style={{ width: 105 }} />
        </colgroup>
        <thead style={{ background: outline ? '#fff' : tokens.brandPrimary }}>
          <tr>
            <th style={headCellStyle}>#</th>
            {showImages && <th style={headCellStyle}></th>}
            <th style={headCellStyle}>Item / Description</th>
            <th style={{ ...headCellStyle, textAlign: 'right' }}>Qty</th>
            <th style={{ ...headCellStyle, textAlign: 'right' }}>Rate</th>
            <th style={{ ...headCellStyle, textAlign: 'right' }}>VAT</th>
            <th style={{ ...headCellStyle, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => {
            const qty = parseFloat(row.qty) || 0, rate = parseFloat(row.rate) || 0, vat = parseFloat(row.vat) || 0;
            const amount = qty * rate * (1 + vat / 100);
            const cellStyle = { padding: '10px 8px', borderBottom: i === data.rows.length - 1 ? 'none' : `1px solid ${tokens.divider}`, verticalAlign: 'top' };
            return (
              <tr key={i}>
                <td style={{ ...cellStyle, fontFamily: body, fontSize: 12, color: tokens.textMuted }}>{i + 1}</td>
                {showImages && (
                  <td style={cellStyle}>
                    {row.img && <img src={row.img} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />}
                  </td>
                )}
                <td style={cellStyle}>
                  <div style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: tokens.textDark, wordBreak: 'break-word' }}>{row.name}</div>
                  {row.desc && <div style={{ fontFamily: body, fontSize: 11, color: tokens.textMuted, marginTop: 2, wordBreak: 'break-word' }}>{row.desc}</div>}
                </td>
                <td style={{ ...cellStyle, fontFamily: body, fontSize: 13, color: tokens.textDark, textAlign: 'right' }}>{qty}</td>
                <td style={{ ...cellStyle, fontFamily: body, fontSize: 13, color: tokens.textDark, textAlign: 'right' }}>{formatMoney(rate, currency)}</td>
                <td style={{ ...cellStyle, fontFamily: body, fontSize: 12, color: tokens.textMuted, textAlign: 'right' }}>{vat}%</td>
                <td style={{ ...cellStyle, fontFamily: body, fontSize: 13, fontWeight: 600, color: tokens.textDark, textAlign: 'right' }}>{formatMoney(amount, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

// QR renders in the gap between "Total in words" and the totals box when
// Bank Details is showing (per the approved layout) — the totals box
// itself never moves or changes size, it's still the same fixed-width
// flexShrink:0 element anchored at the end of the row; QR just becomes a
// new sibling before it, occupying white space that was previously empty.
// When Bank Details is off, QR moves down into BankSignatureSection
// instead so this space stays clean rather than showing QR with nothing
// next to it.
export function TotalsSection({ data, style: tokens, currency, totals, wordsText, qr, bank, docType }) {
  const config = docTypeConfig(docType);
  if (!data.visible || !config.showFinancials) return null;
  const body = fontCss(tokens.bodyFont), head = fontCss(tokens.headingFont);
  const bg = tokens.totalsBg === 'tan' ? '#FBF3E3' : tokens.totalsBg === 'plain' ? 'transparent' : '#F7F8FA';
  const showQrHere = bank?.visible && qr?.visible && qr.src;
  const line = (label, value, big) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: body, fontSize: big ? 15 : 12.5, fontWeight: big ? 700 : 400, color: big ? tokens.brandPrimary : tokens.textGray, marginTop: big ? 10 : 6, paddingTop: big ? 10 : 0, borderTop: big ? `1px solid ${tokens.divider}` : 'none' }}>
      <span>{label}</span><span style={{ color: big ? tokens.brandPrimary : tokens.textDark }}>{value}</span>
    </div>
  );
  return (
    <Section style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: body, fontSize: 10.5, color: tokens.textMuted, letterSpacing: '.05em', textTransform: 'uppercase' }}>Total in words</div>
        <div style={{ fontFamily: head, fontWeight: 600, fontSize: 13, color: tokens.textDark, marginTop: 4, lineHeight: 1.5 }}>{wordsText}</div>
      </div>
      {showQrHere && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr.src} alt="Payment QR code" style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
      )}
      <div style={{ width: 230, flexShrink: 0, background: bg, borderRadius: 10, padding: '14px 16px' }}>
        {line('Subtotal', formatMoney(totals.subtotal, currency))}
        {line('VAT', formatMoney(totals.vat, currency))}
        {totals.discount > 0 && line('Discount', `-${formatMoney(totals.discount, currency)}`)}
        {line(config.totalLabel, formatMoney(totals.total, currency), true)}
      </div>
    </Section>
  );
}

export function NotesSection({ data, style: tokens }) {
  if (!data.visible || !data.content) return null;
  const body = fontCss(tokens.bodyFont);
  return (
    <Section>
      <div style={{ fontFamily: body, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: tokens.textMuted, textTransform: 'uppercase' }}>Notes</div>
      <div style={{ fontFamily: body, fontSize: 11.5, color: tokens.textGray, marginTop: 4, lineHeight: 1.5 }}>{data.content}</div>
    </Section>
  );
}

// Bank Details and Signature render as columns of ONE flex row (one
// <Section>), not separately-stacked sections — that keeps them from ever
// splitting across a page break from each other during pagination. QR only
// appears here (filling Bank's spot) when Bank Details is turned off —
// otherwise it renders up in TotalsSection instead, per the approved
// layout, so it's never shown in both places at once.
export function BankSignatureSection({ bank, signature, qr, style: tokens, docType }) {
  const config = docTypeConfig(docType);
  const bankVisible = bank.visible && config.showBank;
  const showQrHere = !bankVisible && qr?.visible && qr.src;
  if (!bankVisible && !signature?.visible && !showQrHere) return null;
  const head = fontCss(tokens.headingFont), body = fontCss(tokens.bodyFont);
  const isTyped = signature && (signature.mode === 'typed' || !signature.mode);
  const signatureSize = signature?.size ?? 40;
  const signatureLabel = config.signatureSlots[0]?.label || 'Approved By';
  return (
    <Section style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      {bankVisible && (
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: tokens.brandAccent, marginBottom: 8 }}>BANK DETAILS</div>
          {bank.rows.map((r, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>
              <div style={{ fontFamily: body, fontSize: 10, color: tokens.textMuted }}>{r.k}</div>
              <div style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: tokens.textDark, wordBreak: 'break-word' }}>{r.v}</div>
            </div>
          ))}
        </div>
      )}
      {showQrHere && (
        <div style={{ flex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.src} alt="Payment QR code" style={{ width: 72, height: 72, objectFit: 'contain' }} />
        </div>
      )}
      {signature?.visible && (
        // Fixed width + marginLeft:auto (not flex:1) so this column is
        // always exactly as wide as the signature area itself and always
        // anchored to the row's right edge — flex:1 previously made it
        // stretch to share the row equally with Bank Details (or take the
        // whole row alone when Bank Details is off), which is what pushed
        // the underline out toward the middle of the page instead of
        // hugging the signature.
        <div style={{ width: 200, flexShrink: 0, marginLeft: 'auto', textAlign: 'left' }}>
          {signature.approvedName && (
            <div style={{ fontFamily: body, fontSize: 10, color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{signatureLabel}</div>
          )}
          <div style={{ minHeight: signatureSize, display: 'flex', alignItems: 'flex-end' }}>
            {isTyped && signature.text && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: tokens.textDark }}>{signature.text}</div>}
            {!isTyped && signature.src && (
              // height (not maxHeight) so the slider always has a visible
              // effect even on a small/low-res source image, not just
              // capping large ones — width stays auto with objectFit:
              // contain so the aspect ratio is preserved either way.
              <img src={signature.src} alt="Signature" style={{ height: signatureSize, width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
            )}
          </div>
          <div style={{ borderTop: '1.5px solid #CBD5E1', marginTop: 4 }} />
          {signature.approvedName && (
            <>
              <div style={{ fontFamily: head, fontWeight: 600, fontSize: 13, color: tokens.textDark, marginTop: 8 }}>{signature.approvedName}</div>
              <div style={{ fontFamily: body, fontSize: 11.5, color: tokens.textGray }}>{signature.approvedRole}</div>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

export function TermsSection({ data, style: tokens }) {
  if (!data.visible || !data.content) return null;
  const body = fontCss(tokens.bodyFont);
  return (
    <Section>
      <div style={{ fontFamily: body, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: tokens.textMuted, textTransform: 'uppercase' }}>Terms &amp; Conditions</div>
      <div style={{ fontFamily: body, fontSize: 10.5, color: tokens.textMuted, marginTop: 4, lineHeight: 1.5 }}>{data.content}</div>
    </Section>
  );
}

export function FooterSection({ data, style: tokens, pageLabel }) {
  const bg = tokens.footerStyle === 'bar' ? tokens.brandPrimary : 'transparent';
  const body = fontCss(tokens.bodyFont);
  return (
    <div style={{ marginTop: SECTION_GAP + 10, background: bg, padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: tokens.footerStyle === 'bar' ? '#fff' : tokens.textGray }}>{data.content}</div>
      <div style={{ fontFamily: body, fontSize: 11.5, color: tokens.footerStyle === 'bar' ? 'rgba(255,255,255,.75)' : tokens.textMuted }}>{pageLabel}</div>
    </div>
  );
}

// Full-page background layer, not flow content — sits behind every
// section (negative z-index within the page's own positioned containing
// block) so it can never overlap or block readable content the way a
// foreground element would. Renders nothing without real text, same rule
// every optional section here follows.
export function WatermarkLayer({ data, style: tokens }) {
  if (!data?.visible || !data.content) return null;
  const head = fontCss(tokens.headingFont);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
        fontFamily: head, fontWeight: 700, fontSize: 96, color: tokens.textDark, whiteSpace: 'nowrap',
        letterSpacing: '.05em', textTransform: 'uppercase', opacity: (data.opacity ?? 12) / 100,
        transform: `rotate(${data.rotation ?? -28}deg)`,
      }}>
        {data.content}
      </div>
    </div>
  );
}
