'use client';

import { formatMoney } from '@/lib/invoice-studio/moneyFormat';
import { fontCss } from '@/lib/invoice-studio/styleTokens';

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

export function ClientInfoSection({ data, style: tokens }) {
  if (!data.visible) return null;
  const head = fontCss(tokens.headingFont), body = fontCss(tokens.bodyFont);
  return (
    <Section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
      <div>
        <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: tokens.brandAccent, marginBottom: 6 }}>BILLED TO</div>
        <div style={{ fontFamily: head, fontWeight: 600, fontSize: 16, color: tokens.textDark }}>{data.clientName}</div>
        {data.clientAddress && <div style={{ fontFamily: body, fontSize: 12, color: tokens.textGray, marginTop: 4, maxWidth: 260 }}>{data.clientAddress}</div>}
        {data.clientPhone && <div style={{ fontFamily: body, fontSize: 12, color: tokens.textGray }}>{data.clientPhone}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: head, fontWeight: 700, fontSize: 24, color: tokens.textDark, marginBottom: 8 }}>INVOICE</div>
        {[['Invoice No.', data.invoiceNo], ['Invoice Date', data.invoiceDate], ['Due Date', data.dueDate], ['Status', data.status]].map(([label, value]) => (
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
  const showImages = data.showImages && data.rows.some((r) => r.img);

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

export function TotalsSection({ data, style: tokens, currency, totals, wordsText }) {
  if (!data.visible) return null;
  const body = fontCss(tokens.bodyFont), head = fontCss(tokens.headingFont);
  const bg = tokens.totalsBg === 'tan' ? '#FBF3E3' : tokens.totalsBg === 'plain' ? 'transparent' : '#F7F8FA';
  const line = (label, value, big) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: body, fontSize: big ? 15 : 12.5, fontWeight: big ? 700 : 400, color: big ? tokens.brandPrimary : tokens.textGray, marginTop: big ? 10 : 6, paddingTop: big ? 10 : 0, borderTop: big ? `1px solid ${tokens.divider}` : 'none' }}>
      <span>{label}</span><span style={{ color: big ? tokens.brandPrimary : tokens.textDark }}>{value}</span>
    </div>
  );
  return (
    <Section style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: body, fontSize: 10.5, color: tokens.textMuted, letterSpacing: '.05em', textTransform: 'uppercase' }}>Total in words</div>
        <div style={{ fontFamily: head, fontWeight: 600, fontSize: 13, color: tokens.textDark, marginTop: 4, lineHeight: 1.5 }}>{wordsText}</div>
      </div>
      <div style={{ width: 230, flexShrink: 0, background: bg, borderRadius: 10, padding: '14px 16px' }}>
        {line('Subtotal', formatMoney(totals.subtotal, currency))}
        {line('VAT', formatMoney(totals.vat, currency))}
        {totals.discount > 0 && line('Discount', `-${formatMoney(totals.discount, currency)}`)}
        {line('Total Due', formatMoney(totals.total, currency), true)}
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

const PAYMENT_ICONS = { 'Bank Transfer': '🏦', POS: '💳', USSD: '📱', Cash: '💵' };

export function PaymentBankSection({ payment, bank, style: tokens }) {
  if (!payment.visible && !bank.visible) return null;
  const body = fontCss(tokens.bodyFont);
  return (
    <Section style={{ display: 'flex', gap: 32 }}>
      {payment.visible && (
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: tokens.brandAccent, marginBottom: 8 }}>PAYMENT METHODS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {payment.methods.map((m) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, border: `1px solid ${tokens.divider}`, fontFamily: body, fontSize: 12, color: tokens.textDark }}>
                <span>{PAYMENT_ICONS[m]}</span>{m}
              </div>
            ))}
          </div>
        </div>
      )}
      {bank.visible && (
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
    </Section>
  );
}

export function SignatureSection({ data, style: tokens }) {
  if (!data.visible) return null;
  const head = fontCss(tokens.headingFont), body = fontCss(tokens.bodyFont);
  const isTyped = data.mode === 'typed' || !data.mode;
  return (
    <Section style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 200, textAlign: 'left' }}>
        <div style={{ minHeight: 40, display: 'flex', alignItems: 'flex-end' }}>
          {isTyped && data.text && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: tokens.textDark }}>{data.text}</div>}
          {!isTyped && data.src && <img src={data.src} alt="Signature" style={{ maxHeight: 40, objectFit: 'contain' }} />}
        </div>
        <div style={{ borderTop: '1.5px solid #CBD5E1', marginTop: 4 }} />
        {data.approvedName && (
          <>
            <div style={{ fontFamily: body, fontSize: 10, color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 8 }}>Approved By</div>
            <div style={{ fontFamily: head, fontWeight: 600, fontSize: 13, color: tokens.textDark, marginTop: 2 }}>{data.approvedName}</div>
            <div style={{ fontFamily: body, fontSize: 11.5, color: tokens.textGray }}>{data.approvedRole}</div>
          </>
        )}
      </div>
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
