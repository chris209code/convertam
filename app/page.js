'use client';

import { useEffect, useRef } from 'react';

export default function HomePage() {
  const searchRef = useRef(null);

  useEffect(() => {
    const examples = ['PDF to Word', 'Invoice Generator', 'Resume Builder', 'OCR PDF', 'Compress PDF', 'ID Card Generator'];
    let exampleIndex = 0;
    const interval = setInterval(() => {
      const input = searchRef.current;
      if (!input) return;
      if (document.activeElement === input || input.value) return;
      exampleIndex = (exampleIndex + 1) % examples.length;
      input.placeholder = `Search 63+ tools (${examples[exampleIndex]})`;
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
    :root {
      --navy-950: #020713;
      --navy-900: #06101f;
      --navy-850: #09172b;
      --navy-800: #0c1c36;
      --ink: #07111f;
      --muted: #5e687c;
      --line: #e6ebf3;
      --blue: #2684ff;
      --purple: #7c4dff;
      --pink: #ff4f92;
      --green: #18b869;
      --cyan: #12b9c5;
      --orange: #ff8617;
      --radius: 8px;
      --shadow-sm: 0 10px 24px rgba(15, 23, 42, 0.08);
      --shadow-lg: 0 34px 90px rgba(3, 9, 25, 0.45);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: #f7f9fc;
      font-family: var(--font, Inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: inherit; text-decoration: none; }
    button, input { font: inherit; }

    .page { min-height: 100vh; overflow: hidden; background: #fff; }
    .shell { width: min(1320px, calc(100% - 48px)); margin: 0 auto; }

    .hero {
      position: relative;
      min-height: 640px;
      color: #fff;
      background:
        radial-gradient(circle at 77% 16%, rgba(53, 102, 255, 0.40), transparent 29%),
        radial-gradient(circle at 52% 37%, rgba(144, 64, 255, 0.17), transparent 32%),
        radial-gradient(circle at 9% 82%, rgba(23, 185, 197, 0.14), transparent 26%),
        linear-gradient(149deg, #030712 0%, #071326 46%, #081a33 72%, #050813 100%);
      isolation: isolate;
    }
    .hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: linear-gradient(to bottom, black, transparent 82%);
      opacity: 0.48;
      pointer-events: none;
    }
    .hero::after {
      content: "";
      position: absolute;
      left: -4%;
      right: -4%;
      bottom: -1px;
      height: 112px;
      background: #fff;
      clip-path: ellipse(64% 82% at 50% 100%);
      z-index: 0;
    }

    .nav {
      position: relative;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 86px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 220px;
    }
    .brand-name { display: block; font-size: 23px; font-weight: 850; letter-spacing: -0.02em; line-height: 1; }
    .brand-line { display: block; margin-top: 5px; color: rgba(255,255,255,0.74); font-size: 13px; letter-spacing: -0.01em; }
    .nav-links { display: flex; align-items: center; gap: 44px; color: rgba(255,255,255,0.90); font-size: 14px; font-weight: 750; }
    .nav-link { display: inline-flex; align-items: center; gap: 7px; }
    .chevron { width: 7px; height: 7px; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; transform: rotate(45deg) translateY(-2px); opacity: 0.84; }
    .nav-actions { display: flex; align-items: center; gap: 16px; }
    .icon-button {
      width: 47px;
      height: 47px;
      display: grid;
      place-items: center;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.17);
      border-radius: var(--radius);
      background: rgba(255,255,255,0.035);
      backdrop-filter: blur(12px);
    }
    .primary-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 47px;
      padding: 0 28px;
      border-radius: var(--radius);
      color: #fff;
      font-weight: 800;
      border: 1px solid rgba(255,255,255,0.18);
      background: linear-gradient(135deg, #7b4dff 0%, #2a83ff 100%);
      box-shadow: 0 16px 34px rgba(65, 78, 255, 0.34);
    }

    .hero-grid {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: minmax(600px, 0.98fr) minmax(500px, 1.02fr);
      gap: 24px;
      align-items: center;
      padding: 58px 0 106px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 8px 16px;
      border-radius: 999px;
      color: #5ff09c;
      font-size: 13px;
      font-weight: 850;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      background: rgba(24,184,105,0.13);
      border: 1px solid rgba(95,240,156,0.22);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .status-dot { width: 9px; height: 9px; border-radius: 50%; background: #29e67d; box-shadow: 0 0 18px #29e67d; }
    h1 {
      margin: 22px 0 0;
      font-size: clamp(50px, 5.35vw, 74px);
      line-height: 0.98;
      letter-spacing: -0.045em;
      font-weight: 900;
    }
    .gradient-text {
      display: inline-block;
      padding-right: 4px;
      white-space: nowrap;
      background: linear-gradient(91deg, #3a9cff 0%, #8d5cff 49%, #ff4e86 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hero-copy {
      margin: 26px 0 0;
      max-width: 610px;
      color: rgba(255,255,255,0.84);
      font-size: 20px;
      line-height: 1.55;
      letter-spacing: -0.01em;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      margin-top: 34px;
      width: min(560px, 100%);
      height: 62px;
      padding: 6px;
      border-radius: var(--radius);
      background: #fff;
      box-shadow: 0 24px 56px rgba(0,0,0,0.34);
    }
    .search-wrap input {
      flex: 1;
      width: 100%;
      height: 100%;
      border: 0;
      outline: 0;
      color: #1d2940;
      padding: 0 20px;
      font-size: 15px;
      background: transparent;
    }
    .search-wrap input::placeholder { color: #6c768b; opacity: 1; }
    .search-button {
      width: 58px;
      height: 50px;
      border: 0;
      border-radius: 7px;
      display: grid;
      place-items: center;
      color: #fff;
      cursor: pointer;
      background: linear-gradient(135deg, #3188ff, #704dff);
      box-shadow: 0 12px 24px rgba(51,101,255,0.35);
    }
    .trending {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 25px;
      color: rgba(255,255,255,0.82);
      font-size: 13px;
      font-weight: 750;
    }
    .chip {
      padding: 7px 13px;
      border-radius: 999px;
      color: #fff;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.13);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      font-weight: 700;
    }

    .device-stage {
      position: relative;
      min-height: 420px;
      perspective: 1100px;
    }
    .halo {
      position: absolute;
      inset: 60px 42px 10px 16px;
      background: radial-gradient(ellipse at center, rgba(38,132,255,0.42), rgba(124,77,255,0.13) 42%, transparent 70%);
      filter: blur(12px);
      opacity: 0.75;
    }
    .device-css-render {
      position: absolute;
      inset: 0;
    }
    .laptop {
      position: absolute;
      right: 62px;
      top: 42px;
      width: 500px;
      height: 342px;
      transform: rotateX(2deg) rotateY(-7deg) rotateZ(-2deg);
      transform-origin: center;
      filter: drop-shadow(0 40px 60px rgba(0,0,0,0.55));
    }
    .laptop-lid {
      height: 274px;
      padding: 16px;
      border-radius: 18px 18px 10px 10px;
      background: linear-gradient(145deg, #202b45, #0b1222 42%, #040914);
      border: 1px solid rgba(196,212,255,0.48);
      box-shadow: inset 0 0 0 5px #101a2e;
    }
    .screen {
      height: 100%;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.07);
      background:
        radial-gradient(circle at 82% 0%, rgba(39,132,255,0.18), transparent 42%),
        linear-gradient(135deg, #0b1426, #07101e);
      display: grid;
      grid-template-columns: 120px 1fr;
    }
    .mock-sidebar {
      padding: 24px 18px;
      background: rgba(0,0,0,0.20);
      border-right: 1px solid rgba(255,255,255,0.06);
    }
    .mock-title { font-size: 17px; font-weight: 850; margin-bottom: 20px; color: #fff; }
    .mock-menu { display: grid; gap: 15px; color: rgba(255,255,255,0.78); font-size: 11px; font-weight: 750; }
    .mock-menu span { display: flex; align-items: center; gap: 8px; }
    .mock-dot { width: 7px; height: 7px; border-radius: 2px; background: currentColor; opacity: 0.82; }
    .mock-tools {
      padding: 36px 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      align-content: start;
    }
    .mock-tool {
      min-height: 92px;
      padding: 15px 12px;
      border-radius: 8px;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
    }
    .mock-tool svg { width: 24px; height: 24px; }
    .mock-tool span { font-size: 11px; font-weight: 850; line-height: 1.15; }
    .laptop-base {
      width: 542px;
      height: 43px;
      margin-left: -22px;
      border-radius: 0 0 42px 42px;
      background: linear-gradient(180deg, #192238, #0d1320 58%, #2f3f5a);
      transform: skewX(-18deg);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
    }
    .laptop-base::after {
      content: "";
      display: block;
      width: 146px;
      height: 8px;
      margin: 4px auto 0;
      border-radius: 0 0 999px 999px;
      background: rgba(255,255,255,0.13);
    }
    .phone {
      position: absolute;
      right: 4px;
      top: 146px;
      z-index: 5;
      width: 142px;
      height: 272px;
      padding: 12px 9px 11px;
      border-radius: 28px;
      background: #050911;
      border: 1px solid rgba(208,222,255,0.65);
      box-shadow: 0 28px 58px rgba(0,0,0,0.58), inset 0 0 0 5px #10182a;
    }
    .phone-screen {
      height: 100%;
      border-radius: 21px;
      padding: 13px 10px;
      overflow: hidden;
      background: linear-gradient(160deg, #081325, #030814);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .phone-bar { display:flex; justify-content:space-between; align-items:center; color:rgba(255,255,255,0.82); font-size:8px; font-weight:800; }
    .phone-title { margin-top:16px; font-size:14px; font-weight:900; color:#fff; }
    .phone-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-top:13px; }
    .phone-card { min-height:58px; border-radius:8px; color:#fff; padding:8px; font-size:8px; font-weight:850; display:flex; flex-direction:column; justify-content:space-between; }
    .phone-card svg { width:17px; height:17px; }
    .phone-tabs { position:absolute; left:20px; right:20px; bottom:21px; display:flex; justify-content:space-between; color:rgba(255,255,255,0.72); font-size:11px; }

    .section {
      position: relative;
      padding: 50px 0;
      background: #fff;
    }
    .section.soft { background: linear-gradient(180deg, #fff 0%, #f7f9fd 100%); }
    .section-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }
    .eyebrow {
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 8px;
    }
    h2 {
      margin: 0;
      font-size: clamp(30px, 3.1vw, 44px);
      line-height: 1.05;
      letter-spacing: -0.035em;
      font-weight: 900;
    }
    .section-copy { margin: 10px 0 0; color: var(--muted); font-size: 16px; line-height: 1.55; }

    /* ------------------------------------------------------------------ */
    /* Benefits strip — compact, embossed, sits directly beneath the hero */
    /* ------------------------------------------------------------------ */
    .benefits-section { padding: 26px 0 8px; background: #fff; }
    .benefits-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #fdfdfe;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: 0 14px 34px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.7);
      padding: 18px 6px;
    }
    .benefit-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 4px 22px;
      border-right: 1px solid var(--line);
    }
    .benefit-item:last-child { border-right: 0; }
    .benefit-icon {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--accent) 12%, #fff);
      color: var(--accent);
    }
    .benefit-title { margin: 0 0 2px; font-size: 14.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .benefit-copy { margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.4; }

    /* ------------------------------------------------------------------ */
    /* Category cards — reuses the existing embossed card treatment below */
    /* (.category-card / .tile-icon / .count / .card-link already existed */
    /* for the old simple version; this adds the tool-list + left-aligned */
    /* modifier needed for the new detailed version only).                */
    /* ------------------------------------------------------------------ */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 18px;
    }
    .category-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255,255,255,0.88);
      box-shadow: var(--shadow-sm);
      transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
      min-height: 222px;
      padding: 22px 18px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .category-card:hover {
      transform: translateY(-6px);
      border-color: rgba(38,132,255,0.28);
      box-shadow: 0 24px 54px rgba(15,23,42,0.13);
    }
    .category-card.is-detailed {
      align-items: flex-start;
      text-align: left;
      padding: 20px 18px 18px;
    }
    .tile-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      box-shadow: 0 14px 30px rgba(15,23,42,0.16);
      flex-shrink: 0;
    }
    .tile-icon svg { width: 24px; height: 24px; }
    .category-card h3 { margin: 14px 0 0; font-size: 16.5px; letter-spacing: -0.02em; }
    .card-copy { color: #64748b; margin: 6px 0 0; font-size: 12.5px; line-height: 1.5; }
    .card-link { margin-top: auto; padding-top: 14px; color: var(--accent); font-size: 13px; font-weight: 850; display: inline-block; }

    .tool-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 1px; width: 100%; }
    .tool-list li a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 5px 4px;
      border-radius: 6px;
      font-size: 12.5px;
      color: #334155;
    }
    .tool-list li a:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, transparent); }
    .tool-list li a .chev { opacity: 0.45; font-size: 12px; flex-shrink: 0; }

    .bg-blue { --accent: #2684ff; }
    .bg-red { --accent: #DC2626; }
    .bg-green { --accent: #18b869; }
    .bg-purple { --accent: #7c4dff; }
    .bg-orange { --accent: #ff8617; }
    .bg-pink { --accent: #ff4f92; }
    .bg-cyan { --accent: #12b9c5; }
    .bg-slate { --accent: #5f6b7c; }

    @media (max-width: 1180px) {
      .hero-grid { grid-template-columns: minmax(0, 1fr); padding-top: 52px; }
      .hero-grid > * { min-width: 0; }
      .device-stage { min-height: 430px; }
      .laptop { left: 8%; right: auto; }
      .phone { right: 12%; }
      .category-grid { grid-template-columns: repeat(3, 1fr); }
      .nav-links { display: none; }
    }

    .only-desktop { display: block; }
    .only-mobile { display: none; }

    @media (max-width: 820px) {
      .shell { width: min(100% - 32px, 720px); }
      .nav { min-height: 74px; }
      .brand-name { font-size: 20px; }
      .only-desktop { display: none; }
      .only-mobile { display: block; }
      .brand-line { font-size: 11px; }
      .nav-actions .primary-button { display: none; }
      .hero { min-height: auto; }
      .hero-grid { padding: 42px 0 100px; gap: 20px; }
      h1 { font-size: clamp(46px, 13vw, 64px); }
      .hero-copy { font-size: 17px; }
      .search-wrap { height: 58px; }
      .device-stage { display: none; }
      .section { padding: 46px 0; }
      .section-head { display: block; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
      .tool-list li:not(.featured) { display: none; }
      .tool-list li a { padding: 8px 4px; font-size: 12.5px; }
      .category-card.is-detailed { padding: 16px 14px 14px; }
      .benefits-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .benefit-item {
        min-width: 0;
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 10px 12px;
      }
      .benefit-item:nth-child(2n) { border-right: 0; }
      .benefit-item:nth-child(3), .benefit-item:nth-child(4) { border-bottom: 0; }
    }

    @media (max-width: 560px) {
      .shell { width: min(100% - 24px, 520px); }
      .icon-button { width: 42px; height: 42px; }
      .hero-grid { padding-top: 34px; }
      .status-pill { font-size: 11px; }
      h1 { letter-spacing: -0.04em; }
      .gradient-text { white-space: normal; }
      .hero-copy { font-size: 16px; }
      .search-wrap { margin-top: 28px; }
      .trending { font-size: 12px; }
      .category-card { min-height: 0; }
      .benefits-strip { padding: 4px; }
      .benefit-item { padding: 10px 10px; gap: 8px; }
      .benefit-icon { width: 34px; height: 34px; }
      .benefit-icon svg { width: 16px; height: 16px; }
      .benefit-title { font-size: 13px; }
      .benefit-copy { font-size: 11.5px; }
    }

    /* Only collapse category cards to a single column on genuinely tiny
       screens — normal mobile widths (360–430px) stay 2-column per spec. */
    @media (max-width: 340px) {
      .category-grid { grid-template-columns: 1fr; }
    }
  `}</style>
<main className="page">
    <section className="hero">
      <div className="shell">
        <div className="hero-grid">
          <div>
            <div className="status-pill"><span className="status-dot"></span>100% free to start</div>
            <h1>One platform,<br /><span className="gradient-text">endless possibilities.</span></h1>
            <p className="hero-copy">Convert, edit, scan, generate, calculate and organize documents, images and business essentials in seconds.</p>
            <form className="search-wrap" action="#tools">
              <input ref={searchRef} id="toolSearch" type="search" aria-label="Search Convertam tools" placeholder="Search 63+ tools (PDF to Word, Invoice Generator...)" />
              <button className="search-button" type="submit" aria-label="Submit search">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              </button>
            </form>
            <div className="trending">
              <span>Trending now:</span>
              <a className="chip" href="/pdf-to-word">PDF to Word</a>
              <a className="chip" href="/invoice-generator">Invoice Generator</a>
              <a className="chip" href="/ocr-pdf">OCR PDF</a>
              <a className="chip" href="/id-card-generator">ID Card Generator</a>
              <a className="chip" href="/resume-builder">Resume Builder</a>
            </div>
          </div>

          <div className="device-stage" aria-label="Convertam app preview">
            <div className="halo"></div>
            <div className="device-css-render">
              <div className="laptop">
                <div className="laptop-lid">
                  <div className="screen">
                    <aside className="mock-sidebar">
                      <div className="mock-title">All Tools</div>
                      <div className="mock-menu">
                        <span><i className="mock-dot"></i>PDF Tools</span>
                        <span><i className="mock-dot"></i>Business Tools</span>
                        <span><i className="mock-dot"></i>AI Tools</span>
                        <span><i className="mock-dot"></i>Image Tools</span>
                        <span><i className="mock-dot"></i>Calculators</span>
                        <span><i className="mock-dot"></i>Utilities</span>
                      </div>
                    </aside>
                    <div className="mock-tools">
                      <div className="mock-tool" style={{ background: '#1267f1' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2"/><path d="M14 3v5h5M9.5 13h5M9.5 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>PDF to Word</span></div>
                      <div className="mock-tool" style={{ background: '#16a95d' }}><svg viewBox="0 0 24 24" fill="none"><path d="M8 3h8v18H8V3Z" stroke="currentColor" strokeWidth="2"/><path d="M10 8h4M10 12h4M10 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>Invoice Generator</span></div>
                      <div className="mock-tool" style={{ background: '#7148df' }}><svg viewBox="0 0 24 24" fill="none"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>OCR PDF</span></div>
                      <div className="mock-tool" style={{ background: '#f27d13' }}><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 9 9l4 5 3-3 3 8H5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M7.5 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><span>Compress PDF</span></div>
                      <div className="mock-tool" style={{ background: '#e6438d' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 5h8l2 2v12H7V5Z" stroke="currentColor" strokeWidth="2"/><path d="M10 12h5M10 15h5M14 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>Merge PDF</span></div>
                      <div className="mock-tool" style={{ background: '#10aeb9' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="2"/><path d="M9.5 9h5M9.5 13h5M9.5 17h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>Resume Builder</span></div>
                    </div>
                  </div>
                </div>
                <div className="laptop-base"></div>
              </div>

              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-bar"><span>9:41</span><span>5G</span></div>
                  <div className="phone-title">All Tools</div>
                  <div className="phone-grid">
                    <div className="phone-card" style={{ background: '#1267f1' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="2"/></svg>PDF to Word</div>
                    <div className="phone-card" style={{ background: '#16a95d' }}><svg viewBox="0 0 24 24" fill="none"><path d="M8 3h8v18H8V3Z" stroke="currentColor" strokeWidth="2"/><path d="M10 8h4M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Invoice Gen</div>
                    <div className="phone-card" style={{ background: '#f27d13' }}><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 9 9l4 5 3-3 3 8H5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>Compress</div>
                    <div className="phone-card" style={{ background: '#e6438d' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 5h8l2 2v12H7V5Z" stroke="currentColor" strokeWidth="2"/><path d="M10 12h5M14 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Merge PDF</div>
                  </div>
                  <div className="phone-tabs"><span>Home</span><span>Tools</span><span>Saved</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="benefits-section">
      <div className="shell">
        <div className="benefits-strip">
          <div className="benefit-item bg-green">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/></svg></div>
            <div>
              <p className="benefit-title only-desktop">100% Free to Use</p>
              <p className="benefit-title only-mobile">100% Free</p>
              <p className="benefit-copy only-desktop">Most tools are free<br />No hidden charges</p>
              <p className="benefit-copy only-mobile">Most tools are free</p>
            </div>
          </div>
          <div className="benefit-item bg-blue">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
            <div>
              <p className="benefit-title">Secure &amp; Private</p>
              <p className="benefit-copy only-desktop">Your files are encrypted<br />and never stored</p>
              <p className="benefit-copy only-mobile">Files never stored</p>
            </div>
          </div>
          <div className="benefit-item bg-purple">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg></div>
            <div>
              <p className="benefit-title">Super Fast</p>
              <p className="benefit-copy only-desktop">Results in seconds,<br />not minutes</p>
              <p className="benefit-copy only-mobile">Results in seconds</p>
            </div>
          </div>
          <div className="benefit-item bg-pink">
            <div className="benefit-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/></svg></div>
            <div>
              <p className="benefit-title">Works Anywhere</p>
              <p className="benefit-copy only-desktop">On any device,<br />anytime, anywhere</p>
              <p className="benefit-copy only-mobile">Any device, anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section" id="tools" style={{ paddingTop: 22 }}>
      <div className="shell">
        <div className="category-grid">

          <article className="category-card is-detailed bg-red">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-label="PDF">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/>
                <path d="M14 2v6h6"/>
                <text x="12" y="17.3" fontSize="6.6" fontWeight="800" fontFamily="Arial, sans-serif" textAnchor="middle" fill="currentColor" stroke="none">PDF</text>
              </svg>
            </div>
            <h3>PDF Tools</h3>
            <p className="card-copy only-desktop">Convert, edit, merge, split and secure PDFs.</p>
            <p className="card-copy only-mobile">Convert, merge and secure PDFs.</p>
            <ul className="tool-list">
              <li className="featured"><a href="/pdf-to-word">PDF to Word <span className="chev">›</span></a></li>
              <li><a href="/word-to-pdf">Word to PDF <span className="chev">›</span></a></li>
              <li className="featured"><a href="/merge-pdf">Merge PDF <span className="chev">›</span></a></li>
              <li><a href="/split-pdf">Split PDF <span className="chev">›</span></a></li>
              <li className="featured"><a href="/compress-pdf">Compress PDF <span className="chev">›</span></a></li>
              <li><a href="/ocr-pdf">OCR PDF <span className="chev">›</span></a></li>
              <li><a href="/fill-pdf">Fill PDF Forms <span className="chev">›</span></a></li>
              <li><a href="/protect-pdf">Protect PDF <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/pdf-tools">View all PDF tools →</a>
          </article>

          <article className="category-card is-detailed bg-green">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/></svg></div>
            <h3>Business Tools</h3>
            <p className="card-copy only-desktop">Generate invoices, quotes, certificates and more.</p>
            <p className="card-copy only-mobile">Invoices, quotes and more.</p>
            <ul className="tool-list">
              <li className="featured"><a href="/invoice-generator">Invoice Generator <span className="chev">›</span></a></li>
              <li className="featured"><a href="/quotation-generator">Quotation Generator <span className="chev">›</span></a></li>
              <li><a href="/delivery-note-waybill">Delivery Note &amp; Waybill <span className="chev">›</span></a></li>
              <li className="featured"><a href="/certificate-generator">Certificate Generator <span className="chev">›</span></a></li>
              <li><a href="/id-card-generator">ID Card Generator <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/business">View all Business tools →</a>
          </article>

          <article className="category-card is-detailed bg-purple">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/></svg></div>
            <h3>AI Tools</h3>
            <p className="card-copy only-desktop">Smart AI tools to automate and simplify your work.</p>
            <p className="card-copy only-mobile">Smart tools for everyday work.</p>
            <ul className="tool-list">
              <li className="featured"><a href="/summarize-pdf">Summarize PDF <span className="chev">›</span></a></li>
              <li className="featured"><a href="/smart-converter">Smart AI Converter <span className="chev">›</span></a></li>
              <li><a href="/receipt-scanner">Receipt &amp; Invoice Scanner <span className="chev">›</span></a></li>
              <li className="featured"><a href="/cv-improver">CV Improver <span className="chev">›</span></a></li>
              <li><a href="/resume-builder">Resume Builder <span className="chev">›</span></a></li>
              <li><a href="/cover-letter">Cover Letter Writer <span className="chev">›</span></a></li>
              <li><a href="/contract-summarizer">Contract Summarizer <span className="chev">›</span></a></li>
              <li><a href="/ask-solve-ai">Ask &amp; Solve AI <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/ai-tools">View all AI tools →</a>
          </article>

          <article className="category-card is-detailed bg-orange">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>
            <h3>Image Tools</h3>
            <p className="card-copy only-desktop">Edit, convert and enhance your images easily.</p>
            <p className="card-copy only-mobile">Edit and enhance images.</p>
            <ul className="tool-list">
              <li><a href="/jpg-to-pdf">JPG to PDF <span className="chev">›</span></a></li>
              <li><a href="/png-to-pdf">PNG to PDF <span className="chev">›</span></a></li>
              <li><a href="/pdf-to-jpg">PDF to JPG <span className="chev">›</span></a></li>
              <li><a href="/pdf-to-png">PDF to PNG <span className="chev">›</span></a></li>
              <li className="featured"><a href="/image-compressor">Image Compressor <span className="chev">›</span></a></li>
              <li className="featured"><a href="/resize-image">Image Resizer &amp; Cropper <span className="chev">›</span></a></li>
              <li className="featured"><a href="/watermark-image">Watermark Image <span className="chev">›</span></a></li>
              <li><a href="/document-enhancer">Document Enhancer <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/image-tools">View all Image tools →</a>
          </article>

          <article className="category-card is-detailed bg-cyan">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg></div>
            <h3>Calculators</h3>
            <p className="card-copy">Calculate anything instantly.</p>
            <ul className="tool-list">
              <li className="featured"><a href="/calculator-hub">Salary Calculator <span className="chev">›</span></a></li>
              <li className="featured"><a href="/calculator-hub">VAT Calculator <span className="chev">›</span></a></li>
              <li className="featured"><a href="/calculator-hub">Loan Calculator <span className="chev">›</span></a></li>
              <li><a href="/calculator-hub">BMI Calculator <span className="chev">›</span></a></li>
              <li><a href="/calculator-hub">Age Calculator <span className="chev">›</span></a></li>
              <li><a href="/calculator-hub">Profit Margin Calculator <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/calculator-hub">View all Calculators →</a>
          </article>

          <article className="category-card is-detailed bg-slate">
            <div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
            <h3>Utilities</h3>
            <p className="card-copy">Everyday tools to boost your productivity.</p>
            <ul className="tool-list">
              <li className="featured"><a href="/utilities-hub">QR Code Generator <span className="chev">›</span></a></li>
              <li className="featured"><a href="/utilities-hub">Password Generator <span className="chev">›</span></a></li>
              <li className="featured"><a href="/utilities-hub">Word Counter <span className="chev">›</span></a></li>
              <li><a href="/utilities-hub">Text Case Converter <span className="chev">›</span></a></li>
            </ul>
            <a className="card-link" href="/utilities-hub">View all Utilities →</a>
          </article>

        </div>
      </div>
    </section>
  </main>
    </>
  );
}
