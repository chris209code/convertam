'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const defaults = {
  companyName: 'Convertam',
  tagline: 'One platform, endless possibilities',
  certificateType: 'Completion',
  recipientName: 'Recipient Name',
  programTitle: 'Program or Achievement Title',
  description: 'Description text goes here and remains editable.',
  issueDate: 'Date',
  certificateId: 'Certificate ID',
  verificationUrl: '',
  issuerName: 'Issuer Name',
  issuerPosition: 'Issuer Position',
  secondIssuerName: 'Second Issuer',
  secondIssuerPosition: 'Second Position',
  brandColor: '#0f766e',
  accentColor: '#c9932d',
};

const templateNames = {
  classic: 'Classic Prestige',
  modern: 'Modern Professional',
  executive: 'Executive Signature',
  split: 'Contemporary Split',
};

const templateDefaults = {
  classic: { certificateType: 'Achievement', programTitle: 'Program or Achievement Title', description: 'In recognition of outstanding performance and dedication.', brandColor: '#0b1d49', accentColor: '#c9932d' },
  modern: { certificateType: 'Completion', programTitle: 'Program or Course Title', description: 'For successfully completing the program.', brandColor: '#0f766e', accentColor: '#10b981' },
  executive: { certificateType: 'Appreciation', programTitle: 'Award Reason or Recognition Title', description: 'Citation text goes here and remains editable.', brandColor: '#111827', accentColor: '#d4a74f' },
  split: { certificateType: 'Participation', programTitle: 'Program or Event Title', description: 'Description text goes here and remains editable.', brandColor: '#2443d8', accentColor: '#6d28d9' },
};

function titleCase(value) {
  return String(value || '').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

// Content-aware shrink-to-fit: clamp() alone only responds to viewport width,
// not to how long a specific person's name actually is. This measures the
// rendered text and scales font-size down until it fits its container,
// so "Christopher Okonkwo-Adeyemi III" doesn't overflow or wrap awkwardly.
function useAutoFit(deps) {
  const refs = useRef([]);
  refs.current = [];
  const register = useCallback((el) => {
    if (el) refs.current.push(el);
  }, []);

  useEffect(() => {
    refs.current.forEach((el) => {
      if (!el) return;
      const baseSize = parseFloat(el.dataset.baseFontSize || getComputedStyle(el).fontSize);
      if (!el.dataset.baseFontSize) el.dataset.baseFontSize = String(baseSize);
      el.style.fontSize = `${baseSize}px`;
      let size = baseSize;
      const minSize = baseSize * 0.42;
      let guard = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > minSize && guard < 40) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
        guard++;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return register;
}

const emptyToDefault = (state, key) => state[key] || defaults[key] || '';

export default function CertificateGeneratorWorkspace() {
  const [template, setTemplate] = useState('classic');
  const [state, setState] = useState({ ...defaults, ...templateDefaults.classic });

  const update = (key, val) => setState((s) => ({ ...s, [key]: val }));

  function handleTemplateChange(next) {
    setTemplate(next);
    setState((s) => ({ ...s, ...templateDefaults[next] }));
  }

  function resetSample() {
    setState({ ...defaults, ...templateDefaults[template] });
  }

  function handlePrint() {
    window.print();
  }

  const hasVerification = Boolean(state.verificationUrl);
  const certType = titleCase(emptyToDefault(state, 'certificateType'));

  const registerFit = useAutoFit([template, state.recipientName, state.programTitle]);

  const cssVars = { '--brand': state.brandColor, '--accent': state.accentColor };

  return (
    <div className="cert-app-shell">
      <style>{`
        .cert-app-shell {
          --ink: #0b1530; --muted: #65708a; --panel: #ffffff; --page: #edf1f7; --line: #d8deea;
          --brand: #0f766e; --accent: #c9932d; --certificate-ratio: 1.4142;
          display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
          min-height: 720px; color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          border-radius: 16px; overflow: hidden; background: #0a1020;
        }
        .cert-app-shell * { box-sizing: border-box; }
        .cert-app-shell button, .cert-app-shell input, .cert-app-shell select, .cert-app-shell textarea { font: inherit; }
        .cert-controls { background: #f7f9fc; border-right: 1px solid var(--line); padding: 22px; overflow-y: auto; }
        .cert-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .cert-brand-mark, .cert-logo-mark {
          display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, var(--brand), #2563eb); color: #fff; font-weight: 900;
        }
        .cert-brand h1, .cert-preview-toolbar h2 { margin: 0; font-size: 20px; line-height: 1.1; }
        .cert-brand p, .cert-preview-toolbar p { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
        .cert-control-section { padding: 18px 0; border-top: 1px solid var(--line); }
        .cert-control-section h2 { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #3d4960; }
        .cert-template-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .cert-template-tab, .cert-actions button {
          min-height: 42px; border: 1px solid #cbd4e3; border-radius: 8px; background: #fff; color: #192238; cursor: pointer;
        }
        .cert-template-tab.is-active { border-color: var(--brand); background: var(--brand); color: #fff; font-weight: 750; }
        .cert-fields { display: grid; gap: 12px; }
        .cert-controls label { display: grid; gap: 6px; color: #3d4960; font-size: 12px; font-weight: 700; }
        .cert-controls input, .cert-controls select, .cert-controls textarea {
          width: 100%; border: 1px solid #cbd4e3; border-radius: 7px; background: #fff; color: #101827; padding: 10px 11px; outline: none;
        }
        .cert-controls textarea { resize: vertical; }
        .cert-controls input:focus, .cert-controls select:focus, .cert-controls textarea:focus {
          border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
        }
        .cert-two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cert-color-field { height: 42px; padding: 4px; }
        .cert-actions { display: grid; gap: 10px; }
        .cert-actions button:first-child { background: #111827; color: #fff; }
        .cert-preview-panel {
          min-width: 0; padding: 26px;
          background: radial-gradient(circle at top left, rgba(20, 184, 166, 0.18), transparent 34%), linear-gradient(135deg, #0b1225, #101a33);
        }
        .cert-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 1180px; margin: 0 auto 20px; color: #fff; }
        .cert-preview-toolbar p { color: #aab5cc; }
        .cert-preview-toolbar span { border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 7px 12px; color: #d7deec; font-size: 12px; }
        .cert-stage { display: grid; place-items: center; min-height: 560px; }
        .certificate { position: relative; width: min(100%, 1120px); aspect-ratio: var(--certificate-ratio); background: #fff; box-shadow: 0 30px 80px rgba(0,0,0,0.34); overflow: hidden; }
        .cert-logo-row { display: flex; align-items: center; gap: 9px; font-weight: 900; }
        .cert-logo-row.center { justify-content: center; }
        .cert-description, .cert-recipient, .cert-program, .cert-highlight, .cert-quote { overflow-wrap: anywhere; }
        .cert-signature-block { display: grid; gap: 4px; min-width: 150px; text-align: center; }
        .cert-signature-block.right { text-align: right; }
        .cert-signature-line { min-height: 22px; border-bottom: 1px solid currentColor; font-family: "Brush Script MT", "Segoe Script", cursive; font-size: clamp(14px, 1.55vw, 24px); opacity: 0.92; }
        .cert-signature-block strong, .cert-date-block strong, .cert-modern-footer strong, .cert-info-rail strong { font-size: clamp(8px, 0.9vw, 13px); }
        .cert-signature-block span, .cert-date-block span, .cert-modern-footer span, .cert-info-rail span, .cert-qr-wrap span { font-size: clamp(7px, 0.72vw, 10px); text-transform: uppercase; letter-spacing: 0.04em; }
        .cert-qr-box {
          width: clamp(30px, 4vw, 54px); aspect-ratio: 1;
          background: linear-gradient(90deg, #111 44%, transparent 44% 56%, #111 56%) 0 0/35% 35%, linear-gradient(#111 44%, transparent 44% 56%, #111 56%) 100% 100%/35% 35%, repeating-linear-gradient(45deg, #111 0 4px, transparent 4px 8px);
          border: 4px solid #fff; outline: 1px solid rgba(0,0,0,0.2);
        }
        .cert-qr-wrap.is-hidden { visibility: hidden; }

        /* Classic Prestige */
        .classic-template { background: linear-gradient(rgba(255,255,255,0.52), rgba(255,255,255,0.52)), repeating-linear-gradient(35deg, #f7ecd8 0 8px, #fbf3e5 8px 16px); color: #081842; padding: 5.4%; text-align: center; height: 100%; position: relative; }
        .classic-template .cert-inner-border { position: absolute; inset: 4%; border: 3px double var(--accent); pointer-events: none; }
        .cert-corner { position: absolute; width: 12%; aspect-ratio: 1; border-color: var(--accent); opacity: 0.9; }
        .cert-corner::before, .cert-corner::after { content: ""; position: absolute; border: 1px solid var(--accent); border-radius: 50%; }
        .cert-corner::before { inset: 18% 4% 38% 38%; }
        .cert-corner::after { inset: 40% 40% 10% 10%; }
        .cert-corner-tl { top: 5%; left: 5%; border-top: 2px solid; border-left: 2px solid; }
        .cert-corner-tr { top: 5%; right: 5%; border-top: 2px solid; border-right: 2px solid; transform: scaleX(-1); }
        .cert-corner-bl { bottom: 5%; left: 5%; border-bottom: 2px solid; border-left: 2px solid; transform: scaleY(-1); }
        .cert-corner-br { right: 5%; bottom: 5%; border-right: 2px solid; border-bottom: 2px solid; transform: scale(-1); }
        .classic-head p { margin: 0.8% 0 2.5%; font-size: clamp(8px, 0.85vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; }
        .classic-content h3 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(38px, 6vw, 76px); font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; }
        .classic-content h4 { margin: -0.5% 0 2%; color: var(--accent); font-family: Georgia, "Times New Roman", serif; font-size: clamp(16px, 2.35vw, 32px); font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; }
        .classic-content .cert-intro { margin: 0 0 1.1%; font-size: clamp(8px, 0.9vw, 12px); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .classic-content .cert-recipient { margin: 0 auto; max-width: 76%; font-size: clamp(38px, 5.7vw, 72px); line-height: 1.05; white-space: nowrap; display: block; }
        .cert-script { font-family: "Brush Script MT", "Segoe Script", Georgia, serif; }
        .cert-ornament-line { width: 58%; height: 1px; margin: 1.4% auto 2%; background: linear-gradient(90deg, transparent, var(--accent), transparent); }
        .classic-content .cert-description { width: 58%; margin: 0 auto 0.9%; font-size: clamp(9px, 1vw, 14px); line-height: 1.45; text-transform: uppercase; }
        .classic-content .cert-program { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(16px, 2vw, 28px); font-weight: 800; }
        .classic-footer { position: absolute; left: 16%; right: 16%; bottom: 9%; display: flex; align-items: end; justify-content: space-between; }
        .cert-seal { display: grid; place-items: center; width: clamp(54px, 8vw, 94px); aspect-ratio: 1; border: 6px double var(--accent); border-radius: 50%; color: var(--accent); font-family: Georgia, "Times New Roman", serif; font-weight: 900; text-transform: uppercase; }
        .classic-meta { position: absolute; right: 8%; bottom: 4.8%; display: flex; gap: 16px; font-size: clamp(7px, 0.75vw, 10px); text-transform: uppercase; }

        /* Modern Professional */
        .modern-template { display: grid; grid-template-columns: 25% 75%; background: #f8fafc; height: 100%; }
        .modern-rail { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8%; padding: 8% 7%; color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--brand), #081827 32%), #062a36), var(--brand); overflow: hidden; }
        .modern-rail::after { content: ""; position: absolute; inset: auto -18% -10% 22%; height: 48%; background: rgba(255,255,255,0.06); transform: skewX(-26deg); }
        .modern-rail p, .cert-split-brand p { margin: 0; font-size: clamp(7px, 0.8vw, 11px); line-height: 1.35; text-transform: uppercase; }
        .cert-rail-title { display: grid; gap: 8px; margin-top: 8%; }
        .cert-rail-title span { font-size: clamp(10px, 1vw, 14px); text-transform: uppercase; }
        .cert-rail-title strong { font-size: clamp(22px, 3vw, 42px); line-height: 1; text-transform: uppercase; }
        .cert-line-icon { display: grid; place-items: center; width: clamp(52px, 7vw, 86px); aspect-ratio: 1; margin-top: auto; border: 2px solid #45f0c2; border-radius: 50%; color: #45f0c2; font-size: clamp(8px, 0.9vw, 12px); text-transform: uppercase; }
        .modern-body { position: relative; padding: 13% 8% 6%; overflow: hidden; height: 100%; }
        .cert-geo-mark { position: absolute; top: -12%; right: -4%; width: 36%; aspect-ratio: 1; border: 1px solid rgba(15,118,110,0.18); transform: rotate(45deg); }
        .cert-geo-mark::before, .cert-geo-mark::after { content: ""; position: absolute; inset: 18%; border: 1px solid rgba(15,118,110,0.15); }
        .modern-body .cert-intro, .cert-split-body .cert-intro { margin: 0 0 1.6%; font-size: clamp(10px, 1.1vw, 15px); text-transform: uppercase; }
        .modern-body h3, .cert-split-body h3 { margin: 0; max-width: 78%; font-size: clamp(38px, 5vw, 68px); line-height: 1.05; white-space: nowrap; }
        .cert-accent-line { width: 8%; height: 3px; margin: 2.2% 0 4.5%; background: var(--brand); }
        .modern-body p { margin: 0 0 1.6%; font-size: clamp(11px, 1.2vw, 17px); }
        .cert-highlight { display: inline-block; max-width: 68%; padding: 1.3% 3%; border-radius: 7px; background: color-mix(in srgb, var(--brand) 18%, white); font-size: clamp(19px, 2vw, 30px) !important; font-weight: 850; white-space: nowrap; }
        .modern-body .cert-description { max-width: 66%; font-size: clamp(10px, 1vw, 14px); line-height: 1.55; }
        .modern-footer { position: absolute; left: 8%; right: 7%; bottom: 7%; display: grid; grid-template-columns: 1fr 1.1fr 0.9fr 1.6fr; align-items: end; gap: 3%; }
        .modern-footer > div { display: grid; gap: 6px; }

        /* Executive Signature */
        .executive-template { display: grid; grid-template-rows: auto 1fr auto; padding: 4.5% 7%; color: #ffe7b5; background: radial-gradient(circle at 74% 34%, rgba(201,147,45,0.13), transparent 28%), linear-gradient(135deg, #071424, #0b1728 56%, #151414); text-align: center; height: 100%; position: relative; }
        .cert-gold-frame { position: absolute; inset: 3.2%; border: 2px solid var(--accent); pointer-events: none; }
        .cert-monogram { position: absolute; top: 22%; right: 14%; color: rgba(255,231,181,0.06); font-size: clamp(150px, 22vw, 310px); font-weight: 900; }
        .executive-template header { position: relative; z-index: 1; }
        .executive-template header p { margin: 0.8% 0 0; font-size: clamp(7px, 0.8vw, 10px); letter-spacing: 0.18em; text-transform: uppercase; }
        .executive-template .cert-gold .cert-logo-mark { background: linear-gradient(135deg, var(--accent), #f5df9b); color: #0c1424; }
        .executive-template section { position: relative; z-index: 1; align-self: center; }
        .cert-distinction { margin: 0 0 1.2%; color: #e6bc62; font-size: clamp(11px, 1.15vw, 16px); letter-spacing: 0.16em; text-transform: uppercase; }
        .executive-template h3 { margin: 0 0 2.3%; font-family: Georgia, "Times New Roman", serif; font-size: clamp(34px, 4.4vw, 62px); font-weight: 500; text-transform: uppercase; }
        .executive-template .cert-recipient { margin: 0 auto 2.1%; max-width: 76%; color: #ffd17d; font-family: Georgia, "Times New Roman", serif; font-size: clamp(44px, 6vw, 82px); line-height: 1.05; white-space: nowrap; display: block; }
        .executive-template .cert-description { max-width: 70%; margin: 0 auto 2%; color: #fff6e4; font-size: clamp(13px, 1.35vw, 19px); line-height: 1.45; }
        .cert-quote { display: inline-block; max-width: 70%; margin: 0; color: #ffdd8a; font-family: Georgia, "Times New Roman", serif; font-size: clamp(15px, 1.7vw, 25px); font-style: italic; }
        .executive-template footer { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 8%; color: #fff6e4; }
        .executive-template .cert-qr-wrap { display: grid; justify-items: end; gap: 6px; }

        /* Contemporary Split */
        .split-template { display: grid; grid-template-columns: 39% 61%; background: #fff; height: 100%; }
        .cert-split-brand { position: relative; padding: 9%; color: #fff; background: #101a62; overflow: hidden; }
        .cert-split-shape { position: absolute; inset: -18% -18% -12% -26%; background: radial-gradient(circle at 12% 24%, rgba(20,184,166,0.32), transparent 24%), linear-gradient(135deg, #1446d8, #6724b8 58%, #1a267e); clip-path: polygon(0 0, 88% 0, 67% 45%, 90% 100%, 0 100%); }
        .cert-split-brand .cert-logo-row, .cert-split-brand p, .cert-split-brand .cert-rail-title, .cert-dot-grid { position: relative; z-index: 1; }
        .cert-split-brand p { margin-top: 5%; }
        .cert-split-brand .cert-rail-title { margin-top: 28%; }
        .cert-dot-grid { position: absolute; left: 8%; bottom: 8%; width: 26%; aspect-ratio: 1; background-image: radial-gradient(rgba(255,255,255,0.65) 1.2px, transparent 1.2px); background-size: 10px 10px; }
        .cert-split-body { position: relative; padding: 14% 8% 7% 10%; height: 100%; }
        .cert-split-body .cert-program { max-width: 84%; margin: 0 0 1.3%; color: #5f22b4; font-size: clamp(21px, 2.35vw, 35px); font-weight: 850; white-space: nowrap; }
        .cert-split-body .cert-description { max-width: 78%; font-size: clamp(11px, 1.1vw, 16px); line-height: 1.5; }
        .cert-split-body .cert-signature-block { position: absolute; right: 9%; bottom: 28%; color: #0f172a; }
        .cert-info-rail { position: absolute; left: -8%; right: 8%; bottom: 6%; display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: center; gap: 2%; padding: 2.4% 4%; border: 1px solid #ccd3df; border-radius: 999px; background: rgba(248,250,252,0.95); }
        .cert-info-rail > div { display: grid; gap: 5px; }
        .cert-info-rail .cert-qr-wrap { display: flex; align-items: center; gap: 8px; }

        @media (max-width: 960px) {
          .cert-app-shell { grid-template-columns: 1fr; }
          .cert-preview-panel { padding: 18px; }
        }
        @media (max-width: 620px) {
          .cert-two-fields { grid-template-columns: 1fr; }
        }
        @media print {
          .cert-controls, .cert-preview-toolbar, .cert-preview-panel { background: #fff !important; }
          .cert-controls { display: none; }
          .certificate { width: 297mm; height: 210mm; box-shadow: none; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      <aside className="cert-controls">
        <div className="cert-brand">
          <div className="cert-brand-mark">C</div>
          <div>
            <h1>Certificate Generator</h1>
            <p>Editable certificate templates</p>
          </div>
        </div>

        <section className="cert-control-section">
          <h2>Template</h2>
          <div className="cert-template-tabs">
            {Object.keys(templateNames).map((key) => (
              <button key={key} type="button" className={`cert-template-tab ${template === key ? 'is-active' : ''}`} onClick={() => handleTemplateChange(key)}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section className="cert-control-section cert-fields">
          <h2>Editable Fields</h2>
          <label>Issuing company / institution
            <input value={state.companyName} onChange={(e) => update('companyName', e.target.value)} />
          </label>
          <label>Tagline
            <input value={state.tagline} onChange={(e) => update('tagline', e.target.value)} />
          </label>
          <label>Certificate type
            <select value={state.certificateType} onChange={(e) => update('certificateType', e.target.value)}>
              {['Achievement', 'Completion', 'Appreciation', 'Participation', 'Recognition', 'Training', 'Membership', 'Award', 'Custom'].map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label>Recipient name
            <input value={state.recipientName} onChange={(e) => update('recipientName', e.target.value)} placeholder="Full name of the recipient" />
          </label>
          <label>Program, course, event, or achievement
            <input value={state.programTitle} onChange={(e) => update('programTitle', e.target.value)} />
          </label>
          <label>Description
            <textarea rows={3} value={state.description} onChange={(e) => update('description', e.target.value)} />
          </label>
          <div className="cert-two-fields">
            <label>Issue date
              <input value={state.issueDate} onChange={(e) => update('issueDate', e.target.value)} />
            </label>
            <label>Certificate ID
              <input value={state.certificateId} onChange={(e) => update('certificateId', e.target.value)} />
            </label>
          </div>
          <label>Verification URL
            <input value={state.verificationUrl} onChange={(e) => update('verificationUrl', e.target.value)} placeholder="Optional verification URL" />
          </label>
          <div className="cert-two-fields">
            <label>Signature 1 — Name
              <input value={state.issuerName} onChange={(e) => update('issuerName', e.target.value)} />
            </label>
            <label>Signature 1 — Position
              <input value={state.issuerPosition} onChange={(e) => update('issuerPosition', e.target.value)} />
            </label>
          </div>
          <div className="cert-two-fields">
            <label>Signature 2 — Name
              <input value={state.secondIssuerName} onChange={(e) => update('secondIssuerName', e.target.value)} />
            </label>
            <label>Signature 2 — Position
              <input value={state.secondIssuerPosition} onChange={(e) => update('secondIssuerPosition', e.target.value)} />
            </label>
          </div>
          <div className="cert-two-fields">
            <label>Brand color
              <input className="cert-color-field" type="color" value={state.brandColor} onChange={(e) => update('brandColor', e.target.value)} />
            </label>
            <label>Accent color
              <input className="cert-color-field" type="color" value={state.accentColor} onChange={(e) => update('accentColor', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="cert-control-section cert-actions">
          <button type="button" onClick={handlePrint}>Print or Save PDF</button>
          <button type="button" onClick={resetSample}>Reset Sample Text</button>
        </section>
      </aside>

      <section className="cert-preview-panel">
        <div className="cert-preview-toolbar">
          <div>
            <h2>{templateNames[template]}</h2>
            <p>Live editable preview</p>
          </div>
          <span>A4 landscape</span>
        </div>

        <div className="cert-stage">
          <article className="certificate" style={cssVars}>
            {template === 'classic' && (
              <div className="classic-template">
                <div className="cert-corner cert-corner-tl" />
                <div className="cert-corner cert-corner-tr" />
                <div className="cert-corner cert-corner-bl" />
                <div className="cert-corner cert-corner-br" />
                <div className="cert-inner-border" />
                <header className="classic-head">
                  <div className="cert-logo-row center">
                    <span className="cert-logo-mark">C</span>
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  <p>{emptyToDefault(state, 'tagline')}</p>
                </header>
                <section className="classic-content">
                  <h3>Certificate</h3>
                  <h4>of {certType}</h4>
                  <p className="cert-intro">This certificate is proudly presented to</p>
                  <p ref={registerFit} className="cert-recipient cert-script">{emptyToDefault(state, 'recipientName')}</p>
                  <div className="cert-ornament-line" />
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <p className="cert-program">{emptyToDefault(state, 'programTitle')}</p>
                </section>
                <footer className="classic-footer">
                  <div className="cert-signature-block">
                    <div className="cert-signature-line">Signature</div>
                    <strong>{emptyToDefault(state, 'issuerName')}</strong>
                    <span>{emptyToDefault(state, 'issuerPosition')}</span>
                  </div>
                  <div className="cert-seal">Seal</div>
                  <div className="cert-signature-block">
                    <div className="cert-signature-line">Signature</div>
                    <strong>{emptyToDefault(state, 'secondIssuerName')}</strong>
                    <span>{emptyToDefault(state, 'secondIssuerPosition')}</span>
                  </div>
                </footer>
                <div className="classic-meta">
                  <span>{emptyToDefault(state, 'certificateId')}</span>
                  <span>{emptyToDefault(state, 'issueDate')}</span>
                </div>
              </div>
            )}

            {template === 'modern' && (
              <div className="modern-template">
                <aside className="modern-rail">
                  <div className="cert-logo-row">
                    <span className="cert-logo-mark">C</span>
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  <p>{emptyToDefault(state, 'tagline')}</p>
                  <div className="cert-rail-title">
                    <span>Certificate of</span>
                    <strong>{certType}</strong>
                  </div>
                  <div className="cert-line-icon">Award</div>
                </aside>
                <section className="modern-body">
                  <div className="cert-geo-mark" />
                  <p className="cert-intro">This certificate is proudly presented to</p>
                  <h3 ref={registerFit}>{emptyToDefault(state, 'recipientName')}</h3>
                  <div className="cert-accent-line" />
                  <p>For successfully completing</p>
                  <p ref={registerFit} className="cert-highlight">{emptyToDefault(state, 'programTitle')}</p>
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <footer className="modern-footer">
                    <div><span>Date issued</span><strong>{emptyToDefault(state, 'issueDate')}</strong></div>
                    <div><span>Certificate ID</span><strong>{emptyToDefault(state, 'certificateId')}</strong></div>
                    <div className={`cert-qr-wrap ${!hasVerification ? 'is-hidden' : ''}`}><span>QR / URL</span><div className="cert-qr-box" /></div>
                    <div className="cert-signature-block right">
                      <div className="cert-signature-line">Signature</div>
                      <strong>{emptyToDefault(state, 'issuerName')}</strong>
                      <span>{emptyToDefault(state, 'issuerPosition')}</span>
                    </div>
                  </footer>
                </section>
              </div>
            )}

            {template === 'executive' && (
              <div className="executive-template">
                <div className="cert-gold-frame" />
                <div className="cert-monogram">C</div>
                <header>
                  <div className="cert-logo-row center cert-gold">
                    <span className="cert-logo-mark">C</span>
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  <p>{emptyToDefault(state, 'tagline')}</p>
                </header>
                <section>
                  <p className="cert-distinction">Presented with distinction</p>
                  <h3>Certificate of {certType}</h3>
                  <p ref={registerFit} className="cert-recipient">{emptyToDefault(state, 'recipientName')}</p>
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <p ref={registerFit} className="cert-quote">{emptyToDefault(state, 'programTitle')}</p>
                </section>
                <footer>
                  <div className="cert-signature-block">
                    <div className="cert-signature-line">Signature</div>
                    <strong>{emptyToDefault(state, 'issuerName')}</strong>
                    <span>{emptyToDefault(state, 'issuerPosition')}</span>
                  </div>
                  <div className="cert-date-block">
                    <span>Date</span>
                    <strong>{emptyToDefault(state, 'issueDate')}</strong>
                  </div>
                  <div className={`cert-qr-wrap ${!hasVerification ? 'is-hidden' : ''}`}>
                    <div className="cert-qr-box" />
                    <span>{emptyToDefault(state, 'certificateId')}</span>
                  </div>
                </footer>
              </div>
            )}

            {template === 'split' && (
              <div className="split-template">
                <aside className="cert-split-brand">
                  <div className="cert-split-shape" />
                  <div className="cert-dot-grid" />
                  <div className="cert-logo-row">
                    <span className="cert-logo-mark">C</span>
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  <p>{emptyToDefault(state, 'tagline')}</p>
                  <div className="cert-rail-title">
                    <span>Certificate of</span>
                    <strong>{certType}</strong>
                  </div>
                </aside>
                <section className="cert-split-body">
                  <p className="cert-intro">This certificate is proudly presented to</p>
                  <h3 ref={registerFit}>{emptyToDefault(state, 'recipientName')}</h3>
                  <div className="cert-accent-line" />
                  <p ref={registerFit} className="cert-program">{emptyToDefault(state, 'programTitle')}</p>
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <div className="cert-signature-block right">
                    <div className="cert-signature-line">Signature</div>
                    <strong>{emptyToDefault(state, 'issuerName')}</strong>
                    <span>{emptyToDefault(state, 'issuerPosition')}</span>
                  </div>
                  <footer className="cert-info-rail">
                    <div><span>Date issued</span><strong>{emptyToDefault(state, 'issueDate')}</strong></div>
                    <div><span>Certificate ID</span><strong>{emptyToDefault(state, 'certificateId')}</strong></div>
                    <div className={`cert-qr-wrap ${!hasVerification ? 'is-hidden' : ''}`}><div className="cert-qr-box" /><span>QR / URL</span></div>
                  </footer>
                </section>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
