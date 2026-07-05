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
    .section-head.centered {
      display: block;
      text-align: center;
    }
    #solutions .section-head.centered h2 {
      font-size: clamp(24px, 2.1vw, 30px);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    #solutions .section-copy {
      margin-top: 6px;
      font-size: 15px;
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
    .view-link { color: #1267f1; font-weight: 850; font-size: 14px; white-space: nowrap; }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 18px;
    }
    .category-card,
    .tool-card,
    .persona-card,
    .step-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255,255,255,0.88);
      box-shadow: var(--shadow-sm);
      transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
    }
    .category-card:hover,
    .tool-card:hover,
    .persona-card:hover {
      transform: translateY(-6px);
      border-color: rgba(38,132,255,0.28);
      box-shadow: 0 24px 54px rgba(15,23,42,0.13);
    }
    .category-card {
      min-height: 222px;
      padding: 22px 18px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .tile-icon {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      box-shadow: 0 14px 30px rgba(15,23,42,0.16);
    }
    .tile-icon svg { width: 27px; height: 27px; }
    .category-card h3, .tool-card h3, .persona-card h3, .step-card h3 { margin: 16px 0 0; font-size: 18px; letter-spacing: -0.02em; }
    .count {
      display: inline-flex;
      align-items: center;
      min-height: 25px;
      margin-top: 9px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 850;
      background: color-mix(in srgb, var(--accent) 12%, #fff);
      color: var(--accent);
    }
    .card-copy { color: #2f3a4f; margin: 14px 0 0; font-size: 13px; line-height: 1.55; }
    .card-link { margin-top: auto; padding-top: 18px; color: var(--accent); font-size: 13px; font-weight: 850; }

    .persona-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 18px;
    }
    .persona-card {
      position: relative;
      overflow: hidden;
      min-height: 166px;
      padding: 20px 16px 18px;
      text-align: center;
    }
    .persona-top { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .persona-icon {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, #fff);
    }
    .persona-card h3 { margin-top: 0; font-size: 15px; line-height: 1.25; }
    .persona-card .card-copy { margin-top: 9px; color: #111827; font-size: 12px; }

    .stats-band {
      padding: 30px;
      border-radius: var(--radius);
      background:
        radial-gradient(circle at 4% 0%, rgba(38,132,255,0.30), transparent 28%),
        radial-gradient(circle at 72% 120%, rgba(255,79,146,0.18), transparent 34%),
        linear-gradient(135deg, #041020, #07172c 56%, #020713);
      color: #fff;
      box-shadow: var(--shadow-lg);
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border: 1px solid rgba(255,255,255,0.10);
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 24px;
      border-right: 1px solid rgba(255,255,255,0.10);
    }
    .stat-card:last-child { border-right: 0; }
    .stat-icon {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent) 34%, #08111f);
      color: var(--accent);
      flex: none;
    }
    .stat-value { display: block; color: var(--accent); font-size: 29px; line-height: 1; font-weight: 950; letter-spacing: -0.03em; }
    .stat-label { display: block; margin-top: 6px; color: rgba(255,255,255,0.82); font-size: 13px; line-height: 1.35; font-weight: 700; }

    .steps {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      gap: 24px;
      align-items: center;
      max-width: 1050px;
      margin: 34px auto 0;
    }
    .step-card {
      position: relative;
      min-height: 136px;
      padding: 24px 24px 22px 114px;
      background: linear-gradient(135deg, #fff, color-mix(in srgb, var(--accent) 8%, #fff));
    }
    .step-number {
      position: absolute;
      top: 18px;
      left: 18px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: var(--accent);
      font-weight: 900;
      box-shadow: 0 12px 26px color-mix(in srgb, var(--accent) 28%, transparent);
    }
    .step-icon {
      position: absolute;
      left: 54px;
      top: 38px;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, #fff);
    }
    .arrow { color: #9ab0d5; }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 18px;
    }
    .tool-card {
      position: relative;
      min-height: 218px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .tool-icon {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 950;
      background: var(--accent);
      box-shadow: 0 12px 26px color-mix(in srgb, var(--accent) 26%, transparent);
    }
    .badge {
      position: absolute;
      top: 20px;
      right: 18px;
      padding: 5px 8px;
      border-radius: 999px;
      color: #b85f00;
      background: #fff1df;
      font-size: 9px;
      font-weight: 950;
      text-transform: uppercase;
    }
    .rating { margin-top: 8px; color: #cc7200; font-size: 12px; font-weight: 850; }

    .footer {
      color: rgba(255,255,255,0.74);
      background:
        radial-gradient(circle at 10% 0%, rgba(38,132,255,0.24), transparent 25%),
        linear-gradient(135deg, #020713, #07172c);
      padding: 56px 0 28px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.6fr repeat(3, 1fr) 1.45fr;
      gap: 42px;
    }
    .footer p { margin: 16px 0 0; max-width: 310px; color: rgba(255,255,255,0.72); line-height: 1.65; font-size: 14px; }
    .footer h4 { margin: 0 0 17px; color: #fff; font-size: 14px; }
    .footer ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 11px; font-size: 14px; }
    .socials { display: flex; gap: 10px; margin-top: 20px; }
    .socials a {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.16);
      color: #fff;
      font-size: 12px;
      font-weight: 850;
    }
    .subscribe { display: flex; min-height: 46px; margin-top: 14px; border: 1px solid rgba(255,255,255,0.14); border-radius: var(--radius); overflow: hidden; background: rgba(255,255,255,0.05); }
    .subscribe input { min-width: 0; flex: 1; border: 0; outline: 0; color: #fff; padding: 0 14px; background: transparent; }
    .subscribe input::placeholder { color: rgba(255,255,255,0.54); }
    .subscribe button { border: 0; color: #fff; padding: 0 18px; font-weight: 850; background: linear-gradient(135deg, #704dff, #2684ff); }
    .footer-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-top: 44px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.55);
      font-size: 13px;
    }
    .legal { display: flex; gap: 28px; }

    .bg-blue { --accent: #2684ff; }
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
      .category-grid, .persona-grid, .tools-grid { grid-template-columns: repeat(3, 1fr); }
      .stats-band { grid-template-columns: repeat(2, 1fr); row-gap: 22px; }
      .stat-card:nth-child(2) { border-right: 0; }
      .footer-grid { grid-template-columns: 1.5fr repeat(2, 1fr); }
      .nav-links { display: none; }
    }

    @media (max-width: 820px) {
      .shell { width: min(100% - 32px, 720px); }
      .nav { min-height: 74px; }
      .brand-name { font-size: 20px; }
      .brand-line { font-size: 11px; }
      .nav-actions .primary-button { display: none; }
      .hero { min-height: auto; }
      .hero-grid { padding: 42px 0 100px; gap: 20px; }
      h1 { font-size: clamp(46px, 13vw, 64px); }
      .hero-copy { font-size: 17px; }
      .search-wrap { height: 58px; }
      .device-stage { min-height: 360px; transform: scale(0.82); transform-origin: top center; width: 122%; margin-left: -11%; }
      .laptop { left: 50px; width: 500px; }
      .phone { right: 32px; }
      .section { padding: 46px 0; }
      .section-head { display: block; }
      .view-link { display: inline-block; margin-top: 14px; }
      .category-grid, .persona-grid, .tools-grid { grid-template-columns: repeat(2, 1fr); }
      .steps { grid-template-columns: 1fr; }
      .arrow { display: none; }
      .step-card { padding-left: 106px; }
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .footer-grid > div:first-child, .footer-grid > div:last-child { grid-column: 1 / -1; }
      .footer-bottom { align-items: flex-start; flex-direction: column; }
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
      .device-stage { min-height: 292px; transform: scale(0.64); width: 156%; margin-left: -28%; }
      .category-grid, .persona-grid, .tools-grid, .stats-band, .footer-grid { grid-template-columns: 1fr; }
      .stat-card { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.10); padding: 10px 0 22px; }
      .stat-card:last-child { border-bottom: 0; }
      .category-card { min-height: 198px; }
      .persona-card { padding: 22px; }
      .subscribe { flex-direction: column; }
      .subscribe input, .subscribe button { min-height: 44px; }
      .legal { flex-wrap: wrap; gap: 16px; }
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

    <section className="section" id="tools">
      <div className="shell">
        <div className="section-head">
          <div>
            <div className="eyebrow">Tool categories</div>
            <h2>Everything you need in one workspace.</h2>
            <p className="section-copy">Six focused categories. Same fast Convertam workflow.</p>
          </div>
        </div>
        <div className="category-grid">
          <article className="category-card bg-blue"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2"/><path d="M14 3v5h5M9.5 13h5M9.5 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><h3>PDF Tools</h3><span className="count">12+ Tools</span><p className="card-copy">Convert, merge, split, compress and secure PDFs.</p><a className="card-link" href="/pdf-tools">Explore all →</a></article>
          <article className="category-card bg-green"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 9h16v10H4V9Z" stroke="currentColor" strokeWidth="2"/><path d="M4 13h16" stroke="currentColor" strokeWidth="2"/></svg></div><h3>Business Tools</h3><span className="count">8+ Tools</span><p className="card-copy">Invoices, receipts, quotes, ID cards and more.</p><a className="card-link" href="/business">Explore all →</a></article>
          <article className="category-card bg-purple"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" fill="currentColor"/></svg></div><h3>AI Tools</h3><span className="count">10+ Tools</span><p className="card-copy">AI-powered features for smarter everyday work.</p><a className="card-link" href="/ai-tools">Explore all →</a></article>
          <article className="category-card bg-orange"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 9 9l4 5 3-3 3 8H5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M7.5 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></div><h3>Image Tools</h3><span className="count">9+ Tools</span><p className="card-copy">Convert, edit, resize and optimize images.</p><a className="card-link" href="/image-tools">Explore all →</a></article>
          <article className="category-card bg-cyan"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18H6V3Z" stroke="currentColor" strokeWidth="2"/><path d="M9 8h6M9 12h2M13 12h2M9 16h2M13 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><h3>Calculators</h3><span className="count">25+ Tools</span><p className="card-copy">Finance, health, business and practical calculators.</p><a className="card-link" href="/calculators">Explore all →</a></article>
          <article className="category-card bg-slate"><div className="tile-icon" style={{ background: 'var(--accent)' }}><svg viewBox="0 0 24 24" fill="none"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="2"/><path d="m19.4 15 .4 3-2.7 1.6-2.4-1.8a8 8 0 0 1-2.7 0l-2.4 1.8L6.9 18l.4-3a8.5 8.5 0 0 1-1.4-2.3L3.2 11l.9-3 3-.5a8.5 8.5 0 0 1 1.8-1.6L9.2 3h5.6l.3 2.9a8.5 8.5 0 0 1 1.8 1.6l3 .5.9 3-2.7 1.7a8.5 8.5 0 0 1-1.4 2.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></div><h3>Utilities</h3><span className="count">20+ Tools</span><p className="card-copy">Everyday tools to make life easier.</p><a className="card-link" href="/utilities">Explore all →</a></article>
        </div>
      </div>
    </section>

    <section className="section soft" id="solutions">
      <div className="shell">
        <div className="section-head centered">
          <div>
            <h2>Built for everyone doing the work.</h2>
            <p className="section-copy">Six kinds of people. Same 63+ tools.</p>
          </div>
        </div>
        <div className="persona-grid">
          <article className="persona-card bg-purple"><div className="persona-top"><div className="persona-icon"><svg width="27" height="27" viewBox="0 0 24 24" fill="none"><path d="M22 10 12 5 2 10l10 5 10-5Z" stroke="currentColor" strokeWidth="2"/><path d="M6 12.5V17c3.5 2 8.5 2 12 0v-4.5" stroke="currentColor" strokeWidth="2"/></svg></div><h3>For Students</h3></div><p className="card-copy">Convert assignments, summarize PDFs, build resumes.</p></article>
          <article className="persona-card bg-blue"><div className="persona-top"><div className="persona-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 9h16v10H4V9Z" stroke="currentColor" strokeWidth="2"/></svg></div><h3>For Professionals</h3></div><p className="card-copy">Edit PDFs, sign documents, compress files.</p></article>
          <article className="persona-card bg-green"><div className="persona-top"><div className="persona-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M4 10h16v10H4V10Z" stroke="currentColor" strokeWidth="2"/><path d="M7 10V6h10v4M8 14h2M14 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><h3>For Small Businesses</h3></div><p className="card-copy">Create invoices, quotes, receipts.</p></article>
          <article className="persona-card bg-orange"><div className="persona-top"><div className="persona-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><h3>For Developers</h3></div><p className="card-copy">JSON formatter, Base64, UUID generator.</p></article>
          <article className="persona-card bg-pink"><div className="persona-top"><div className="persona-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M5 8h3l1.5-2h5L16 8h3v11H5V8Z" stroke="currentColor" strokeWidth="2"/><path d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/></svg></div><h3>For Creators</h3></div><p className="card-copy">Image tools, watermarking, resizing.</p></article>
          <article className="persona-card bg-cyan"><div className="persona-top"><div className="persona-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a6 6 0 0 1 12 0M10 21a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><h3>For Everyone</h3></div><p className="card-copy">AI summaries, OCR, file conversions.</p></article>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="shell">
        <div className="stats-band">
          <div className="stat-card bg-blue"><div className="stat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="2"/></svg></div><div><span className="stat-value">100K+</span><span className="stat-label">Files Processed</span></div></div>
          <div className="stat-card bg-green"><div className="stat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 12v8H4v-8M2 7h20v5H2V7ZM12 7v13M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Zm0 0h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></div><div><span className="stat-value">63+</span><span className="stat-label">Tools</span></div></div>
          <div className="stat-card bg-purple"><div className="stat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2M21 12a9 9 0 1 1-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><div><span className="stat-value">99.9%</span><span className="stat-label">Success Rate</span></div></div>
          <div className="stat-card bg-orange"><div className="stat-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2"/><path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div><span className="stat-value">24 Hours</span><span className="stat-label">Auto Delete</span></div></div>
        </div>
      </div>
    </section>

    <section className="section soft">
      <div className="shell">
        <div className="section-head">
          <div>
            <div className="eyebrow">Workflow</div>
            <h2>How Convertam works</h2>
            <p className="section-copy">Three simple steps to get your work done.</p>
          </div>
        </div>
        <div className="steps">
          <article className="step-card bg-blue"><span className="step-number">1</span><span className="step-icon"><svg width="31" height="31" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><h3>Upload</h3><p className="card-copy">Upload your file securely from your device.</p></article>
          <div className="arrow"><svg width="46" height="24" viewBox="0 0 46 24" fill="none"><path d="M2 12h40m0 0-9-9m9 9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
          <article className="step-card bg-green"><span className="step-number">2</span><span className="step-icon"><svg width="31" height="31" viewBox="0 0 24 24" fill="none"><path d="M4 7h10M18 7h2M10 17h10M4 17h2M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span><h3>Choose Tool</h3><p className="card-copy">Select the right tool and customize it if needed.</p></article>
          <div className="arrow"><svg width="46" height="24" viewBox="0 0 46 24" fill="none"><path d="M2 12h40m0 0-9-9m9 9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
          <article className="step-card bg-purple"><span className="step-number">3</span><span className="step-icon"><svg width="31" height="31" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><h3>Download</h3><p className="card-copy">Get your result instantly. Fast, easy, secure.</p></article>
        </div>
      </div>
    </section>

    <section className="section" id="resources">
      <div className="shell">
        <div className="section-head">
          <div>
            <div className="eyebrow">Featured tools</div>
            <h2>Most loved tools</h2>
            <p className="section-copy">Hand-picked tools that Convertam users reach for every day.</p>
          </div>
          <a className="view-link" href="#">View all tools →</a>
        </div>
        <div className="tools-grid">
          <article className="tool-card bg-green"><span className="badge">Most popular</span><div className="tool-icon">Inv</div><h3>Invoice Generator</h3><div className="rating">4.8 / 5.0</div><p className="card-copy">Create professional invoices instantly.</p><a className="card-link" href="/invoice-generator">Launch Tool →</a></article>
          <article className="tool-card bg-cyan"><div className="tool-icon">CV</div><h3>Resume Builder</h3><div className="rating">4.9 / 5.0</div><p className="card-copy">Create a professional resume in minutes.</p><a className="card-link" href="/resume-builder">Launch Tool →</a></article>
          <article className="tool-card bg-purple"><div className="tool-icon">OCR</div><h3>OCR PDF</h3><div className="rating">4.8 / 5.0</div><p className="card-copy">Extract text from scanned PDFs and images.</p><a className="card-link" href="/ocr-pdf">Launch Tool →</a></article>
          <article className="tool-card bg-orange"><div className="tool-icon">Qt</div><h3>Quotation Generator</h3><div className="rating">4.7 / 5.0</div><p className="card-copy">Send clean quotes for client work.</p><a className="card-link" href="/quotation-generator">Launch Tool →</a></article>
          <article className="tool-card bg-blue"><div className="tool-icon">PDF</div><h3>Compress PDF</h3><div className="rating">4.7 / 5.0</div><p className="card-copy">Reduce PDF file size without losing quality.</p><a className="card-link" href="/compress-pdf">Launch Tool →</a></article>
          <article className="tool-card bg-pink"><div className="tool-icon">ID</div><h3>ID Card Generator</h3><div className="rating">4.8 / 5.0</div><p className="card-copy">Design sharp ID cards for teams and groups.</p><a className="card-link" href="/id-card-generator">Launch Tool →</a></article>
        </div>
      </div>
    </section>

    <footer className="footer" id="story">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <a className="brand" href="/" aria-label="Convertam home">
              <span>
                <span className="brand-name">Convertam</span>
                <span className="brand-line">One platform. Endless possibilities.</span>
              </span>
            </a>
            <p>Powerful tools for PDFs, AI, images, documents, and business essentials. Built with care in Nigeria.</p>
            <div className="socials"><a href="#">f</a><a href="#">X</a><a href="#">ig</a><a href="#">in</a></div>
          </div>
          <div><h4>Tools</h4><ul><li>PDF Tools</li><li>Business Tools</li><li>AI Tools</li><li>Image Tools</li><li>Calculators</li><li>Utilities</li></ul></div>
          <div><h4>Resources</h4><ul><li>Blog</li><li>Guides</li><li>Templates</li><li>Use Cases</li><li>API</li></ul></div>
          <div><h4>Company</h4><ul><li>Our Story</li><li>Careers</li><li>Press</li><li>Contact Us</li><li>Partner Program</li></ul></div>
          <div><h4>Stay updated</h4><p>Get new tools and productivity tips.</p><form className="subscribe"><input type="email" placeholder="Enter your email" aria-label="Email address" /><button type="submit">Subscribe</button></form><p>No spam. Unsubscribe anytime.</p></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Convertam. All rights reserved.</span><div className="legal"><a href="#">Terms of Service</a><a href="#">Privacy Policy</a></div></div>
      </div>
    </footer>
  </main>
    </>
  );
}
