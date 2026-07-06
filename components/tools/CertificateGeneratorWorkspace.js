'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const defaults = {
  companyName: 'Convertam',
  tagline: '',
  certificateType: 'Completion',
  recipientName: 'Recipient Name',
  programTitle: 'Program or Achievement Title',
  description: 'Description text goes here and remains editable.',
  issueDate: 'Date',
  dateSentence: 'Awarded this day',
  certificateId: '',
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
// Parses an <input type="date"> value (YYYY-MM-DD) into the display formats
// used across the certificate — avoids timezone-shift bugs from `new Date(str)`.
function formatDateNice(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}
function formatDateSentence(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `Awarded this ${ordinal(d)} day of ${MONTH_NAMES[m - 1]}, ${y}`;
}

function fitElementToWidth(el, scale = 1, manualPx = null) {
  if (!el) return;
  const naturalBase = parseFloat(el.dataset.baseFontSize || getComputedStyle(el).fontSize);
  if (!el.dataset.baseFontSize) el.dataset.baseFontSize = String(naturalBase);
  const baseSize = manualPx != null ? manualPx * scale : naturalBase * scale;
  // Reset to normal single-line mode first, in case a previous pass wrapped it
  // and the text has since gotten shorter again.
  el.style.whiteSpace = 'nowrap';
  el.style.overflow = 'hidden';
  el.style.fontSize = `${baseSize}px`;
  let size = baseSize;
  const minSize = baseSize * 0.15;
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 1 && size > minSize && guard < 40) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
    guard++;
  }
  // Shrinking alone couldn't make it fit on one line even at the size floor —
  // wrap to a second line instead of silently clipping the rest of the text.
  if (el.scrollWidth > el.clientWidth + 1) {
    el.style.whiteSpace = 'normal';
    el.style.overflow = 'visible';
    el.style.wordBreak = 'break-word';
  }
}

// Content-aware shrink-to-fit: clamp() alone only responds to viewport width,
// not to how long a specific person's name actually is. This measures the
// rendered text and scales font-size down until it fits its container,
// so "Christopher Okonkwo-Adeyemi III" doesn't overflow or wrap awkwardly.
// Also exposes the raw refs so the fit can be re-run manually right before a
// PDF capture — html2canvas doesn't reliably wait for custom fonts to finish
// loading, so text sized against a fallback font can end up wrong-width by
// the time the actual snapshot happens unless we re-measure after fonts load.
function useAutoFit(deps, scale, manualSizes) {
  const refs = useRef([]);
  refs.current = [];
  const register = useCallback((key) => (el) => {
    if (el) refs.current.push({ el, key });
  }, []);

  useEffect(() => {
    refs.current.forEach(({ el, key }) => {
      const manualPx = manualSizes && manualSizes[key] != null ? manualSizes[key] : null;
      fitElementToWidth(el, scale, manualPx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, scale, JSON.stringify(manualSizes)]);

  return [register, refs];
}

const emptyToDefault = (state, key) => state[key] || defaults[key] || '';

export default function CertificateGeneratorWorkspace() {
  const [template, setTemplate] = useState('classic');
  const [state, setState] = useState({ ...defaults, ...templateDefaults.classic });
  const [logoImg, setLogoImg] = useState(null);
  const [customSealImg, setCustomSealImg] = useState(null);
  const [ornamentLevel, setOrnamentLevel] = useState('Ornate');
  const [sealStyle, setSealStyle] = useState('As Designed');
  const [nameStyle, setNameStyle] = useState('As Designed');
  const [issueDateRaw, setIssueDateRaw] = useState('');
  const [hasSecondIssuer, setHasSecondIssuer] = useState(true);
  const [quoteStyle, setQuoteStyle] = useState('None');
  const [customQuoteText, setCustomQuoteText] = useState('');
  const [customQuoteAttribution, setCustomQuoteAttribution] = useState('');
  const [textScale, setTextScale] = useState(1);
  const [manualSizes, setManualSizes] = useState({
    orgName: 21,
    recipientName: 50,
    programTitle: 27,
    certTitle: 30,
    sigName1: 14,
    sigTitle1: 10,
    sigName2: 14,
    sigTitle2: 10,
  });
  function setFieldSize(key, px) {
    setManualSizes((m) => ({ ...m, [key]: px }));
  }

  function handleDatePick(e) {
    const iso = e.target.value;
    setIssueDateRaw(iso);
    if (!iso) return;
    setState((s) => ({ ...s, issueDate: formatDateNice(iso), dateSentence: formatDateSentence(iso) }));
  }

  const update = (key, val) => setState((s) => ({ ...s, [key]: val }));

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoImg(reader.result);
    reader.readAsDataURL(file);
  }

  function handleCustomSealUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomSealImg(reader.result);
    reader.readAsDataURL(file);
  }

  function handleTemplateChange(next) {
    setTemplate(next);
    setState((s) => ({ ...s, ...templateDefaults[next] }));
  }

  function resetSample() {
    setState({ ...defaults, ...templateDefaults[template] });
  }

  const [downloading, setDownloading] = useState(false);
  const [highRes, setHighRes] = useState(false);

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // don't block the download on a failed preload
      img.src = src;
    });
  }

  // Captures ONLY the certificate element (not the whole browser page — that
  // was the bug with window.print()) and saves a real PDF directly, matching
  // every other tool's one-click download instead of opening a print dialog.
  async function handleDownload() {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // html2canvas re-implements CSS rendering in JS and has known gaps with
      // modern units like cqw (container queries), which this whole design
      // is built on — it may not size text the same way a real browser does.
      // Rather than guess which fields need protecting, lock EVERY element's
      // font-size to its already-resolved pixel value right before capture
      // (getComputedStyle always resolves clamp()/cqw down to real px), so
      // html2canvas never has to interpret those units itself.
      function lockComputedFontSizes(root) {
        if (!root) return;
        root.querySelectorAll('*').forEach((el) => {
          const resolvedPx = getComputedStyle(el).fontSize;
          if (resolvedPx) el.style.fontSize = resolvedPx;
        });
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // The editor shows small, fast-loading preview images to keep editing
      // snappy. For export, preload the real high-res assets first (so the
      // swap is instant, already cached), then wait for the swap to paint
      // before capturing — so the download is always full quality.
      if (template === 'classic') {
        await Promise.all([
          preloadImage('/certificates/border-classic.png'),
          preloadImage(customSealImg || '/certificates/seal-custom.png'),
        ]);
        setHighRes(true);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      if (template === 'executive') {
        const sealSrc = sealStyle === 'Royal Seal' ? (customSealImg || '/certificates/seal-custom.png') : '/certificates/seal-executive.png';
        await Promise.all([
          preloadImage('/certificates/border-executive.png'),
          preloadImage(sealSrc),
        ]);
        setHighRes(true);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      // Final pass, in this exact order, right before capture: shrink any
      // long text to fit, then lock every resulting size to plain pixels.
      fitRefs.current.forEach(({ el, key }) => {
        const manualPx = manualSizes && manualSizes[key] != null ? manualSizes[key] : null;
        fitElementToWidth(el, textScale, manualPx);
      });
      lockComputedFontSizes(certRef.current);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(certRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
      const fileName = `${(state.recipientName || 'certificate').trim().replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Certificate PDF export failed:', err);
      window.alert('Something went wrong generating the PDF. Please try again.');
    } finally {
      setHighRes(false);
      setDownloading(false);
    }
  }

  const hasVerification = Boolean(state.verificationUrl);
  const hasCertId = Boolean(state.certificateId);
  const certType = titleCase(emptyToDefault(state, 'certificateType'));

  const [registerFit, fitRefs] = useAutoFit([template, state.recipientName, state.programTitle, state.issuerName, state.secondIssuerName, state.issuerPosition, state.secondIssuerPosition, state.companyName], textScale, manualSizes);
  const certRef = useRef(null);

  const cssVars = { '--brand': state.brandColor, '--accent': state.accentColor };
  const logoInitial = (state.companyName || 'C').trim().charAt(0).toUpperCase();

  // Exact token mapping per the Classic Prestige design spec's "Name Style" enum
  const nameFonts = {
    'As Designed': { fontFamily: "'Great Vibes', cursive", fontWeight: 400, fontStyle: 'normal', letterSpacing: '0px' },
    'Elegant Script': { fontFamily: "'Great Vibes', cursive", fontWeight: 400, fontStyle: 'normal', letterSpacing: '0px' },
    'Classic Serif': { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontStyle: 'italic', letterSpacing: '0px' },
    'Bold Modern': { fontFamily: "'Inter', sans-serif", fontWeight: 800, fontStyle: 'normal', letterSpacing: '-1px' },
  };
  const classicNameStyle = nameFonts[nameStyle] || nameFonts['As Designed'];

  // Executive Signature uses the same name-style enum, but its own default
  // (Playfair Display italic, per the exec spec) when "As Designed" is chosen.
  const execNameStyle = nameStyle === 'As Designed'
    ? { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontStyle: 'italic', letterSpacing: '0px' }
    : classicNameStyle;

  const QUOTE_PRESETS = {
    'Excellence (Aristotle)': { text: 'Excellence is not an act, but a habit.', author: 'ARISTOTLE' },
    'Getting Started (Walt Disney)': { text: 'The way to get started is to quit talking and begin doing.', author: 'WALT DISNEY' },
    'Courage to Continue (Churchill)': { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'WINSTON CHURCHILL' },
    'Love What You Do (Steve Jobs)': { text: 'The only way to do great work is to love what you do.', author: 'STEVE JOBS' },
    'Impossible Until Done (Mandela)': { text: "It always seems impossible until it's done.", author: 'NELSON MANDELA' },
    'Believe (Roosevelt)': { text: "Believe you can and you're halfway there.", author: 'THEODORE ROOSEVELT' },
    'Hard Work (Tim Notke)': { text: "Hard work beats talent when talent doesn't work hard.", author: 'TIM NOTKE' },
    'Together (Helen Keller)': { text: 'Alone we can do so little; together we can do so much.', author: 'HELEN KELLER' },
    'Create the Future (Drucker)': { text: 'The best way to predict the future is to create it.', author: 'PETER DRUCKER' },
    'Beauty of Dreams (Eleanor Roosevelt)': { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'ELEANOR ROOSEVELT' },
    'Keep Going (Confucius)': { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'CONFUCIUS' },
    'Within Us (Emerson)': { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'RALPH WALDO EMERSON' },
    'No Limit to Tomorrow (FDR)': { text: 'The only limit to our realization of tomorrow will be our doubts of today.', author: 'FRANKLIN D. ROOSEVELT' },
    'Disappointed by What You Didn\'t Do (Twain)': { text: "Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did do.", author: 'MARK TWAIN' },
    'Never Let Yourself Be Defeated (Angelou)': { text: 'You will face many defeats in life, but never let yourself be defeated.', author: 'MAYA ANGELOU' },
  };
  const showQuote = quoteStyle !== 'None';
  const activeQuote = quoteStyle === 'Custom'
    ? { text: customQuoteText, author: customQuoteAttribution }
    : (QUOTE_PRESETS[quoteStyle] || QUOTE_PRESETS['Excellence (Aristotle)']);

  function ExecHexLogo({ letter }) {
    return (
      <svg className="ce-hexmark" viewBox="0 0 100 100">
        <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="none" stroke="#C9A227" strokeWidth="4" />
        <text x="50" y="63" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="42" fill="#E9C874" textAnchor="middle">{letter}</text>
      </svg>
    );
  }

  const execLaurelTransforms = laurelTransforms; // same 24-leaf geometry, recolored
  function ExecLaurelMedallion({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="ce-seal-svg ce-seal-wrap">
        <defs><path id="ceLeaf" d="M0,0 C2.4,-4.8 2.4,-11.2 0,-16 C-2.4,-11.2 -2.4,-4.8 0,0 Z" /></defs>
        <circle cx="50" cy="50" r="16" fill="none" stroke="#E9C874" strokeWidth="1" />
        <text x="50" y="57" fontFamily="Playfair Display, serif" fontWeight="700" fontStyle="italic" fontSize="20" fill="#E9C874" textAnchor="middle">{letter}</text>
        <g fill="#E9C874">
          {execLaurelTransforms.map(([x, y, r], i) => (
            <use key={i} href="#ceLeaf" transform={`translate(${x},${y}) rotate(${r}) scale(0.6)`} />
          ))}
        </g>
      </svg>
    );
  }
  function ExecRosette({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="ce-seal-rosette ce-seal-wrap">
        <polygon points="50,8 57.7,23.5 74,18 68.5,34.3 84,42 68.5,49.7 74,66 57.7,60.5 50,76 42.3,60.5 26,66 31.5,49.7 16,42 31.5,34.3 26,18 42.3,23.5" fill="#C9A227" />
        <circle cx="50" cy="42" r="15" fill="#0B0F1A" stroke="#E9C874" strokeWidth="1.5" />
        <text x="50" y="48" fontFamily="Playfair Display, serif" fontWeight="700" fontStyle="italic" fontSize="16" fill="#E9C874" textAnchor="middle">{letter}</text>
        <path d="M40,56 L46,56 L46,90 L43,82 L40,90 Z" fill="#C9A227" />
        <path d="M54,56 L60,56 L60,90 L57,82 L54,90 Z" fill="#C9A227" />
      </svg>
    );
  }
  function ExecEngraved({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="ce-seal-engraved ce-seal-wrap">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#E9C874" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#C9A227" strokeWidth="4" strokeDasharray="1.6 3.2" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#E9C874" strokeWidth="0.75" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="#E9C874" strokeWidth="1" />
        <text x="50" y="59" fontFamily="Playfair Display, serif" fontWeight="700" fontStyle="italic" fontSize="26" fill="#E9C874" textAnchor="middle">{letter}</text>
        <polygon points="50,6 51.8,10.5 56.5,10.8 52.8,13.7 54.1,18.2 50,15.6 45.9,18.2 47.2,13.7 43.5,10.8 48.2,10.5" fill="#E9C874" />
      </svg>
    );
  }
  function renderExecSeal() {
    if (sealStyle === 'As Designed') {
      const size = highRes ? '/certificates/seal-executive.png' : '/certificates/seal-executive-preview.png';
      return <img className="ce-seal-wrap ce-seal-as-designed" src={size} alt="Seal" />;
    }
    if (sealStyle === 'Laurel Medallion') return <ExecLaurelMedallion letter={logoInitial} />;
    if (sealStyle === 'Rosette Ribbon') return <ExecRosette letter={logoInitial} />;
    if (sealStyle === 'Engraved Seal') return <ExecEngraved letter={logoInitial} />;
    if (sealStyle === 'Royal Seal') {
      return <img className="ce-seal-wrap ce-seal-custom-img" src={customSealImg || '/certificates/seal-custom.png'} alt="Organization seal" />;
    }
    return null;
  }

  // Exact Classic Prestige seal variants, reproduced from the design spec's literal
  // coordinates — a distinct set from LaurelSeal (which Executive uses; untouched).
  const laurelTransforms = [
    [86, 50, 90], [84.8, 59.3, 105], [81.2, 68, 120], [75.5, 75.5, 135], [68, 81.2, 150],
    [59.3, 84.8, 165], [50, 86, 180], [40.7, 84.8, 195], [32, 81.2, 210], [24.5, 75.5, 225],
    [18.8, 68, 240], [15.2, 59.3, 255], [14, 50, 270], [15.2, 40.7, 285], [18.8, 32, 300],
    [24.5, 24.5, 315], [32, 18.8, 330], [40.7, 15.2, 345], [50, 14, 0], [59.3, 15.2, 15],
    [68, 18.8, 30], [75.5, 24.5, 45], [81.2, 32, 60], [84.8, 40.7, 75],
  ];
  function ClassicLaurelMedallion({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="cp-seal-svg cp-seal-wrap">
        <defs><path id="cpLeaf" d="M0,0 C2.4,-4.8 2.4,-11.2 0,-16 C-2.4,-11.2 -2.4,-4.8 0,0 Z" /></defs>
        <circle cx="50" cy="50" r="16" fill="none" stroke="#B08D3F" strokeWidth="1" />
        <text x="50" y="57" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="20" fill="#B08D3F" textAnchor="middle">{letter}</text>
        <g fill="#B08D3F">
          {laurelTransforms.map(([x, y, r], i) => (
            <use key={i} href="#cpLeaf" transform={`translate(${x},${y}) rotate(${r}) scale(0.6)`} />
          ))}
        </g>
      </svg>
    );
  }
  function ClassicRosette({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="cp-seal-rosette cp-seal-wrap">
        <polygon points="50,8 57.7,23.5 74,18 68.5,34.3 84,42 68.5,49.7 74,66 57.7,60.5 50,76 42.3,60.5 26,66 31.5,49.7 16,42 31.5,34.3 26,18 42.3,23.5" fill="#B08D3F" />
        <circle cx="50" cy="42" r="15" fill="#FBF6EA" stroke="#B08D3F" strokeWidth="1.5" />
        <text x="50" y="48" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="16" fill="#B08D3F" textAnchor="middle">{letter}</text>
        <path d="M40,56 L46,56 L46,90 L43,82 L40,90 Z" fill="#B08D3F" />
        <path d="M54,56 L60,56 L60,90 L57,82 L54,90 Z" fill="#B08D3F" />
      </svg>
    );
  }
  function ClassicEngraved({ letter }) {
    return (
      <svg viewBox="0 0 100 100" className="cp-seal-engraved cp-seal-wrap">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#B08D3F" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#B08D3F" strokeWidth="4" strokeDasharray="1.6 3.2" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#B08D3F" strokeWidth="0.75" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="#B08D3F" strokeWidth="1" />
        <text x="50" y="59" fontFamily="Playfair Display, serif" fontWeight="700" fontStyle="italic" fontSize="26" fill="#B08D3F" textAnchor="middle">{letter}</text>
        <polygon points="50,6 51.8,10.5 56.5,10.8 52.8,13.7 54.1,18.2 50,15.6 45.9,18.2 47.2,13.7 43.5,10.8 48.2,10.5" fill="#B08D3F" />
      </svg>
    );
  }
  function renderClassicSeal() {
    if (sealStyle === 'As Designed') {
      return (
        <div className="cp-seal-wrap cp-seal-as-designed">
          <div className="cp-seal-as-designed-inner">{logoInitial}</div>
        </div>
      );
    }
    if (sealStyle === 'Laurel Medallion') return <ClassicLaurelMedallion letter={logoInitial} />;
    if (sealStyle === 'Rosette Ribbon') return <ClassicRosette letter={logoInitial} />;
    if (sealStyle === 'Engraved Seal') return <ClassicEngraved letter={logoInitial} />;
    if (sealStyle === 'Royal Seal') {
      return <img className="cp-seal-wrap cp-seal-custom-img" src={customSealImg || (highRes ? '/certificates/seal-custom.png' : '/certificates/seal-custom-preview.png')} alt="Organization seal" />;
    }
    return null;
  }

  function LogoMark({ extraClass = '' }) {
    return (
      <span className={`cert-logo-mark ${logoImg ? 'cert-logo-mark-img' : ''} ${extraClass}`}>
        {logoImg ? <img src={logoImg} alt="" /> : logoInitial}
      </span>
    );
  }

  function LaurelSeal({ size = 84 }) {
    const Leaf = ({ cx, cy, len, angleDeg }) => (
      <path
        d={`M ${cx} ${cy} C ${cx + len * 0.15} ${cy - len * 0.4}, ${cx + len * 0.75} ${cy - len * 0.32}, ${cx + len} ${cy} C ${cx + len * 0.75} ${cy + len * 0.32}, ${cx + len * 0.15} ${cy + len * 0.4}, ${cx} ${cy} Z`}
        fill="currentColor"
        transform={`rotate(${angleDeg} ${cx} ${cy})`}
      />
    );
    const branch = (side) => {
      const leaves = [];
      const count = 6;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const leftAngle = 200 - t * 80; // sweeps lower-left to upper-left, degrees
        const theta = side === 'l' ? leftAngle : 180 - leftAngle;
        const rad = (theta * Math.PI) / 180;
        const r = 30;
        const x = 50 + r * Math.cos(rad);
        const y = 50 - r * Math.sin(rad);
        const leafLen = 10 + t * 6;
        const leafAngle = side === 'l' ? theta - 90 : theta + 90;
        leaves.push(<Leaf key={`${side}-${i}`} cx={x} cy={y} len={leafLen} angleDeg={leafAngle} />);
      }
      return leaves;
    };
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="cert-laurel-seal">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        {branch('l')}
        {branch('r')}
        <path d="M50 30 L55 43 L69 43 L57.5 51.5 L62 65 L50 56.5 L38 65 L42.5 51.5 L31 43 L45 43 Z" fill="currentColor" />
      </svg>
    );
  }

  // Best-effort stylistic reconstruction of an ornate corner flourish (curling
  // vine + leaves) — traced by hand from a raster reference, not vector source,
  // so treat as a close match in the same spirit rather than a pixel trace.
  function CornerFlourish({ corner }) {
    const transforms = { tl: '', tr: 'translate(64,0) scale(-1,1)', bl: 'translate(0,64) scale(1,-1)', br: 'translate(64,64) scale(-1,-1)' };
    // A proper almond-shaped leaf, not a squashed dot — recognizable at a distance.
    const Leaf = ({ cx, cy, len, angleDeg }) => (
      <path
        d={`M ${cx} ${cy} C ${cx + len * 0.15} ${cy - len * 0.35}, ${cx + len * 0.75} ${cy - len * 0.28}, ${cx + len} ${cy} C ${cx + len * 0.75} ${cy + len * 0.28}, ${cx + len * 0.15} ${cy + len * 0.35}, ${cx} ${cy} Z`}
        fill="currentColor"
        transform={`rotate(${angleDeg} ${cx} ${cy})`}
      />
    );
    return (
      <svg width="64" height="64" viewBox="0 0 64 64" className={`cert-corner-flourish cert-corner-flourish-${corner}`}>
        <g transform={transforms[corner]}>
          <path d="M6 6 C6 22 10 38 24 48 C34 55 44 54 52 47" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <Leaf cx={9} cy={9} len={13} angleDeg={35} />
          <Leaf cx={14} cy={22} len={12} angleDeg={65} />
          <Leaf cx={19} cy={35} len={11} angleDeg={95} />
          <Leaf cx={28} cy={45} len={10} angleDeg={125} />
          <Leaf cx={40} cy={50} len={9} angleDeg={155} />
        </g>
      </svg>
    );
  }

  return (
    <div className="cert-app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&family=Great+Vibes&family=Dancing+Script:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
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
          overflow: hidden;
        }
        .cert-logo-mark-img { background: #fff; padding: 2px; }
        .cert-logo-mark-img img { width: 100%; height: 100%; object-fit: contain; }
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
        .certificate { position: relative; width: min(100%, 1120px); aspect-ratio: var(--certificate-ratio); background: #fff; box-shadow: 0 30px 80px rgba(0,0,0,0.34); overflow: hidden; container-type: inline-size; }
        .cert-logo-row { display: flex; align-items: center; gap: 9px; font-weight: 900; }
        .cert-logo-row.center { justify-content: center; }
        .cert-description, .cert-recipient, .cert-program, .cert-highlight, .cert-quote { overflow-wrap: anywhere; }
        .cert-signature-block { display: grid; gap: 4px; min-width: 150px; text-align: center; }
        .cert-signature-block.right { text-align: right; }
        .cert-signature-line { min-height: 22px; border-bottom: 1px solid currentColor; font-family: "Brush Script MT", "Segoe Script", cursive; font-size: clamp(14px, 1.55cqw, 24px); opacity: 0.92; }
        .cert-signature-block strong, .cert-date-block strong, .cert-modern-footer strong, .cert-info-rail strong { font-size: clamp(8px, 0.9cqw, 13px); }
        .cert-signature-block span, .cert-date-block span, .cert-modern-footer span, .cert-info-rail span, .cert-qr-wrap span { font-size: clamp(7px, 0.72cqw, 10px); text-transform: uppercase; letter-spacing: 0.04em; }
        .cert-qr-box {
          width: clamp(30px, 4cqw, 54px); aspect-ratio: 1;
          background: linear-gradient(90deg, #111 44%, transparent 44% 56%, #111 56%) 0 0/35% 35%, linear-gradient(#111 44%, transparent 44% 56%, #111 56%) 100% 100%/35% 35%, repeating-linear-gradient(45deg, #111 0 4px, transparent 4px 8px);
          border: 4px solid #fff; outline: 1px solid rgba(0,0,0,0.2);
        }
        .cert-qr-wrap.is-hidden { visibility: hidden; }
        .is-hidden { visibility: hidden; }

        /* Classic Prestige — exact positions converted proportionally from the spec's 1200×849 canvas */
        .classic-template { background: #FBF6EA; color: #1B2A4A; height: 100%; position: relative; text-align: center; }
        .cp-border-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
        .cp-border-minimal { position: absolute; inset: 4.712%; border: 1px solid #B08D3F; pointer-events: none; }
        .cp-logo-box { position: absolute; top: 7.774%; left: 50%; transform: translateX(-50%); width: 12.5%; height: 6.125%; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .cp-logo-box img { width: 100%; height: 100%; object-fit: contain; }
        .cp-org-name { position: absolute; top: 15.783%; left: 10%; right: 10%; font-size: clamp(13px, 1.8cqw, 21px); letter-spacing: clamp(2px, 0.417cqw, 5px); font-weight: 700; white-space: nowrap; overflow: hidden; line-height: 1.5; padding-bottom: 4px; }
        .cp-title { position: absolute; top: 20.024%; left: 0; right: 0; font-family: 'Playfair Display', serif; font-weight: 800; font-size: clamp(28px, 5.667cqw, 68px); letter-spacing: clamp(2px, 0.5cqw, 6px); }
        .cp-subtitle { position: absolute; top: 30.624%; left: 0; right: 0; font-family: 'Playfair Display', serif; font-weight: 600; font-size: clamp(13px, 2.25cqw, 27px); color: var(--accent); letter-spacing: clamp(3px, 0.75cqw, 9px); }
        .cp-intro { position: absolute; top: 37.456%; left: 0; right: 0; font-size: clamp(8px, 1.083cqw, 13px); letter-spacing: clamp(1px, 0.25cqw, 3px); color: #8A8262; }
        .cp-recipient { position: absolute; top: 40.99%; left: 0; right: 0; font-size: clamp(24px, 5.5cqw, 66px); max-width: 88%; margin: 0 auto; white-space: nowrap; overflow: visible; }
        .cp-divider { position: absolute; top: 52.6%; left: 50%; transform: translateX(-50%); width: 23.333%; height: 1px; background: #B08D3F; }
        .cp-citation { position: absolute; top: 53.239%; left: 50%; transform: translateX(-50%); width: 58.333%; font-size: clamp(9px, 1.125cqw, 13.5px); letter-spacing: clamp(1px, 0.125cqw, 1.5px); line-height: 1.8; color: #7D765E; }
        .cp-course { position: absolute; top: 59.835%; left: 0; right: 0; font-family: 'Playfair Display', serif; font-weight: 700; font-size: clamp(13px, 2.25cqw, 27px); overflow-wrap: anywhere; }
        .cp-date-sentence { position: absolute; top: 64.782%; left: 0; right: 0; font-family: 'Playfair Display', serif; font-style: italic; font-size: clamp(9px, 1.25cqw, 15px); color: #7D765E; }
        .cp-sig-block { position: absolute; top: 76.325%; width: 24%; text-align: center; }
        .cp-sig-block.left { left: 6%; }
        .cp-sig-block.right { right: 6%; }
        .cp-sig-block.cp-sig-solo { left: 50%; right: auto; transform: translateX(-50%); }
        .cp-sig-line { height: 26px; border-bottom: 1px solid #B0A98C; margin-bottom: 6px; }
        .cp-sig-printed-name { font-family: 'Playfair Display', serif; font-weight: 600; font-size: clamp(10px, 1.3cqw, 15px); white-space: nowrap; overflow: visible; }
        .cp-sig-title { margin-top: 4px; padding-top: 4px; font-size: clamp(7px, 0.875cqw, 10.5px); letter-spacing: clamp(1px, 0.125cqw, 1.5px); color: #8A8262; text-transform: uppercase; white-space: nowrap; overflow: visible; }
        .cp-meta { position: absolute; bottom: 11.779%; font-size: clamp(7px, 0.917cqw, 11px); letter-spacing: clamp(0.5px, 0.083cqw, 1px); color: #8A8262; }
        .cp-meta.left { left: 9.167%; }
        .cp-meta.right { right: 9.167%; }
        .cp-meta.center { left: 50%; transform: translateX(-50%); white-space: nowrap; }
        .cp-seal-wrap { position: absolute; left: 50%; transform: translateX(-50%); color: var(--accent); }
        .cp-seal-as-designed { top: 79.741%; width: 7.667cqw; height: 7.667cqw; border-radius: 50%; border: 1.5px solid #B08D3F; display: flex; align-items: center; justify-content: center; }
        .cp-seal-as-designed-inner { width: 78%; height: 78%; border-radius: 50%; border: 1px solid #B08D3F; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 2.833cqw; }
        .cp-seal-diamond { position: absolute; top: 84.57%; width: 6px; height: 6px; background: #B08D3F; transform: rotate(45deg); }
        .cp-seal-diamond.left { left: 46%; }
        .cp-seal-diamond.right { right: 46%; }
        .cp-seal-svg { top: 78.328%; width: 10cqw; height: 10cqw; }
        .cp-seal-rosette { top: 77.503%; width: 8cqw; height: 10.333cqw; }
        .cp-seal-engraved { top: 78.563%; width: 9.333cqw; height: 9.333cqw; }
        .cp-seal-custom-img { top: 76.325%; width: 12cqw; height: auto; filter: drop-shadow(0 10px 16px rgba(0,0,0,.3)); }

        /* Modern Professional */
        .modern-template { display: grid; grid-template-columns: 25% 75%; background: #f8fafc; height: 100%; }
        .modern-rail { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8%; padding: 8% 7%; color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--brand), #081827 32%), #062a36), var(--brand); overflow: hidden; }
        .modern-rail::after { content: ""; position: absolute; inset: auto -18% -10% 22%; height: 48%; background: rgba(255,255,255,0.06); transform: skewX(-26deg); }
        .modern-rail p, .cert-split-brand p { margin: 0; font-size: clamp(7px, 0.8cqw, 11px); line-height: 1.35; text-transform: uppercase; }
        .cert-rail-title { display: grid; gap: 8px; margin-top: 8%; }
        .cert-rail-title span { font-size: clamp(10px, 1cqw, 14px); text-transform: uppercase; }
        .cert-rail-title strong { font-size: clamp(22px, 3cqw, 42px); line-height: 1; text-transform: uppercase; }
        .cert-line-icon { display: grid; place-items: center; width: clamp(52px, 7cqw, 86px); aspect-ratio: 1; margin-top: auto; border: 2px solid #45f0c2; border-radius: 50%; color: #45f0c2; font-size: clamp(8px, 0.9cqw, 12px); text-transform: uppercase; }
        .modern-body { position: relative; padding: 13% 8% 6%; overflow: hidden; height: 100%; }
        .cert-geo-mark { position: absolute; top: -12%; right: -4%; width: 36%; aspect-ratio: 1; border: 1px solid rgba(15,118,110,0.18); transform: rotate(45deg); }
        .cert-geo-mark::before, .cert-geo-mark::after { content: ""; position: absolute; inset: 18%; border: 1px solid rgba(15,118,110,0.15); }
        .modern-body .cert-intro, .cert-split-body .cert-intro { margin: 0 0 1.6%; font-size: clamp(10px, 1.1cqw, 15px); text-transform: uppercase; }
        .modern-body h3, .cert-split-body h3 { margin: 0; max-width: 78%; font-size: clamp(38px, 5cqw, 68px); line-height: 1.05; white-space: nowrap; }
        .cert-accent-line { width: 8%; height: 3px; margin: 2.2% 0 4.5%; background: var(--brand); }
        .modern-body p { margin: 0 0 1.6%; font-size: clamp(11px, 1.2cqw, 17px); }
        .cert-highlight { display: inline-block; max-width: 68%; padding: 1.3% 3%; border-radius: 7px; background: color-mix(in srgb, var(--brand) 18%, white); font-size: clamp(19px, 2cqw, 30px) !important; font-weight: 850; white-space: nowrap; }
        .modern-body .cert-description { max-width: 66%; font-size: clamp(10px, 1cqw, 14px); line-height: 1.55; }
        .modern-footer { position: absolute; left: 8%; right: 7%; bottom: 7%; display: grid; grid-template-columns: 1fr 1.1fr 0.9fr 1.6fr; align-items: end; gap: 3%; }
        .modern-footer > div { display: grid; gap: 6px; }

        /* Executive Signature */
        /* Executive Signature — exact positions converted proportionally from the spec's 1200×849 canvas */
        .executive-template { background: #0B0F1A; color: #E9C874; height: 100%; position: relative; text-align: center; }
        .ce-border-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; z-index: 1; }
        .ce-border-minimal { position: absolute; inset: 4.005%; border: 1px solid rgba(201,162,39,.6); pointer-events: none; }
        .ce-concentric { position: absolute; top: 49.94%; left: 50%; border-radius: 50%; transform: translate(-50%,-50%); }
        .ce-concentric.outer { width: 43.333cqw; height: 43.333cqw; border: 1px solid rgba(201,162,39,.16); }
        .ce-concentric.inner { width: 33.333cqw; height: 33.333cqw; border: 1px solid rgba(201,162,39,.12); }
        .ce-header { position: absolute; top: 19.3%; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 12px; z-index: 2; }
        .ce-hexmark { width: clamp(20px, 2.667cqw, 32px); height: clamp(20px, 2.667cqw, 32px); }
        .ce-orgname { font-family: 'Playfair Display', serif; font-weight: 700; font-size: clamp(16px, 2.083cqw, 25px); color: #E9C874; letter-spacing: 1px; white-space: nowrap; overflow: hidden; max-width: 52cqw; min-width: 0; line-height: 1.5; padding-bottom: 4px; }
        .ce-tagline { position: absolute; top: 23.3%; left: 10%; right: 10%; text-align: center; font-size: clamp(7px, 0.792cqw, 9.5px); letter-spacing: 3px; color: #8B8464; z-index: 2; }
        .ce-distinction { position: absolute; top: 27.3%; left: 10%; right: 10%; text-align: center; font-size: clamp(9px, 1cqw, 12px); letter-spacing: 3px; color: #C9BE9A; z-index: 2; }
        .ce-title { position: absolute; top: 34.3%; left: 7.5%; right: 7.5%; text-align: center; font-family: 'Playfair Display', serif; font-weight: 700; font-size: clamp(18px, 2.75cqw, 33px); color: #E9C874; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; line-height: 1.5; padding-bottom: 4px; z-index: 2; }
        .ce-rule { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; z-index: 2; }
        .ce-rule-line { height: 1px; background: rgba(201,162,39,.6); }
        .ce-underline { position: absolute; left: 50%; transform: translateX(-50%); height: 2px; background: #C9A227; z-index: 2; }
        .ce-intro { position: absolute; top: 42.3%; left: 10%; right: 10%; text-align: center; font-size: clamp(9px, 1.083cqw, 13px); letter-spacing: 3px; color: #C9BE9A; z-index: 2; }
        .ce-recipient { position: absolute; top: 46.3%; left: 0; right: 0; text-align: center; font-size: clamp(20px, 4.833cqw, 58px); color: #F3E4B8; white-space: nowrap; overflow: hidden; max-width: 84%; margin: 0 auto; line-height: 1.5; padding-bottom: 6px; z-index: 2; }
        .ce-citation { position: absolute; top: 55.3%; left: 50%; transform: translateX(-50%); width: 53.333%; text-align: center; font-size: clamp(9px, 1.25cqw, 15px); line-height: 1.8; color: #D9D3C0; z-index: 2; }
        .ce-quote { position: absolute; top: 63.3%; left: 0; right: 0; text-align: center; font-family: 'Playfair Display', serif; font-style: italic; font-size: clamp(11px, 1.417cqw, 17px); color: #E9C874; z-index: 2; }
        .ce-quote-author { position: absolute; top: 67.3%; left: 0; right: 0; text-align: center; font-size: clamp(8px, 1.042cqw, 12.5px); letter-spacing: 1.5px; color: #C9BE9A; z-index: 2; }
        .ce-sig-block { position: absolute; top: 73%; left: 11%; width: 24%; text-align: center; z-index: 2; }
        .ce-sig-line { height: 24px; border-bottom: 1px solid rgba(201,162,39,.5); margin-bottom: 6px; }
        .ce-sig-name { font-family: 'Playfair Display', serif; font-weight: 600; font-size: clamp(9px, 1.25cqw, 15px); color: #F3E4B8; white-space: nowrap; overflow: hidden; line-height: 1.5; padding-bottom: 3px; }
        .ce-sig-title { margin-top: 4px; padding-top: 4px; font-size: clamp(7px, 0.875cqw, 10.5px); letter-spacing: 1.5px; color: #C9BE9A; text-transform: uppercase; white-space: nowrap; overflow: hidden; line-height: 1.5; padding-bottom: 3px; }
        .ce-seal-wrap { position: absolute; left: 50%; transform: translateX(-50%); z-index: 2; }
        .ce-seal-as-designed { top: 74.912%; width: 12.8cqw; height: auto; }
        .ce-seal-svg { top: 77.739%; width: 12.8cqw; height: 12.8cqw; }
        .ce-seal-rosette { top: 77.267%; width: 10cqw; height: 13cqw; }
        .ce-seal-engraved { top: 78.092%; width: 11.8cqw; height: 11.8cqw; }
        .ce-seal-custom-img { top: 75.618%; width: 15.2cqw; height: auto; filter: drop-shadow(0 10px 18px rgba(0,0,0,.5)); }
        .ce-date-verify { position: absolute; top: 73%; right: 11%; display: flex; align-items: flex-end; gap: 3.667%; z-index: 2; }
        .ce-date-block { text-align: center; white-space: nowrap; }
        .ce-date-value { font-size: clamp(9px, 1.25cqw, 15px); color: #F3E4B8; font-weight: 600; white-space: nowrap; overflow: hidden; line-height: 1.5; padding-bottom: 3px; }
        .ce-date-value.ce-date-aligned { margin-top: 20px; }
        .ce-date-label { border-top: 1px solid rgba(201,162,39,.5); margin-top: 6px; padding-top: 6px; font-size: clamp(7px, 0.875cqw, 10.5px); letter-spacing: 1.5px; color: #C9BE9A; }
        .ce-verify-block { text-align: center; white-space: nowrap; }
        .ce-qr-box { width: clamp(44px, 5.5cqw, 66px); height: clamp(44px, 5.5cqw, 66px); background: #FFFFFF; border-radius: 8px; padding: 6px; box-sizing: border-box; margin: 0 auto; }
        .ce-verify-label { font-size: clamp(7px, 0.875cqw, 10.5px); letter-spacing: 1.5px; color: #C9BE9A; margin-top: 8px; }

        /* Contemporary Split */
        .split-template { display: grid; grid-template-columns: 39% 61%; background: #fff; height: 100%; }
        .cert-split-brand { position: relative; padding: 9%; color: #fff; background: #101a62; overflow: hidden; }
        .cert-split-shape { position: absolute; inset: -18% -18% -12% -26%; background: radial-gradient(circle at 12% 24%, rgba(20,184,166,0.32), transparent 24%), linear-gradient(135deg, #1446d8, #6724b8 58%, #1a267e); clip-path: polygon(0 0, 88% 0, 67% 45%, 90% 100%, 0 100%); }
        .cert-split-brand .cert-logo-row, .cert-split-brand p, .cert-split-brand .cert-rail-title, .cert-dot-grid { position: relative; z-index: 1; }
        .cert-split-brand p { margin-top: 5%; }
        .cert-split-brand .cert-rail-title { margin-top: 28%; }
        .cert-dot-grid { position: absolute; left: 8%; bottom: 8%; width: 26%; aspect-ratio: 1; background-image: radial-gradient(rgba(255,255,255,0.65) 1.2px, transparent 1.2px); background-size: 10px 10px; }
        .cert-split-body { position: relative; padding: 14% 8% 7% 10%; height: 100%; }
        .cert-split-body .cert-program { max-width: 84%; margin: 0 0 1.3%; color: #5f22b4; font-size: clamp(21px, 2.35cqw, 35px); font-weight: 850; white-space: nowrap; }
        .cert-split-body .cert-description { max-width: 78%; font-size: clamp(11px, 1.1cqw, 16px); line-height: 1.5; }
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

        <section className="cert-control-section">
          <h2>Text Size — Per Field</h2>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 10px' }}>
            Drag any slider to set that field's size directly. If a name is still too long to fit at your chosen size, it'll automatically shrink further or wrap to a second line — but your slider value is always the starting point, not a suggestion that gets overridden.
          </p>
          {[
            { key: 'orgName', label: 'Institution name', min: 8, max: 32 },
            { key: 'recipientName', label: 'Recipient name', min: 16, max: 80 },
            { key: 'certTitle', label: 'Certificate title (Executive)', min: 14, max: 44 },
            { key: 'programTitle', label: 'Program / achievement title', min: 12, max: 40 },
            { key: 'sigName1', label: 'Signature 1 — name', min: 8, max: 26 },
            { key: 'sigTitle1', label: 'Signature 1 — title', min: 6, max: 18 },
            { key: 'sigName2', label: 'Signature 2 — name', min: 8, max: 26 },
            { key: 'sigTitle2', label: 'Signature 2 — title', min: 6, max: 18 },
          ].map(({ key, label, min, max }) => (
            <label key={key} style={{ fontSize: '11px', display: 'block', marginBottom: 10 }}>
              {label} — {manualSizes[key]}px
              <input type="range" min={min} max={max} step="1" value={manualSizes[key]} onChange={(e) => setFieldSize(key, Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
            </label>
          ))}
        </section>

        <section className="cert-control-section">
          <h2>Overall Text Scale</h2>
          <label style={{ fontSize: '11px' }}>
            {Math.round(textScale * 100)}% — scales every field above together, on top of their individual sizes
            <input type="range" min="0.7" max="1.3" step="0.02" value={textScale} onChange={(e) => setTextScale(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
          </label>
          {textScale !== 1 && (
            <button type="button" onClick={() => setTextScale(1)} style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: 4 }}>
              Reset to 100%
            </button>
          )}
        </section>

        <section className="cert-control-section cert-fields">
          <h2>Editable Fields</h2>
          <label>Issuing company / institution
            <input value={state.companyName} onChange={(e) => update('companyName', e.target.value)} />
          </label>
          <label>Company logo (optional)
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </label>
          {logoImg && (
            <button type="button" onClick={() => setLogoImg(null)} style={{ justifySelf: 'start', background: 'none', border: 'none', color: '#0f766e', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Remove logo — use "{logoInitial}" mark instead
            </button>
          )}
          <label>Tagline (optional)
            <input value={state.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="Leave blank for none" />
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
            <label>Issue date <span style={{ fontWeight: 400, color: '#94A3B8' }}>(pick a date, or type below)</span>
              <input type="date" value={issueDateRaw} onChange={handleDatePick} />
            </label>
            <label>Certificate ID (optional)
              <input value={state.certificateId} onChange={(e) => update('certificateId', e.target.value)} placeholder="Leave blank if you don't use one" />
            </label>
          </div>
          <label>Date text shown on certificate
            <input value={state.issueDate} onChange={(e) => update('issueDate', e.target.value)} />
          </label>

          {template === 'classic' && (
            <label>Date line (Classic Prestige only)
              <input value={state.dateSentence} onChange={(e) => update('dateSentence', e.target.value)} placeholder="e.g. Awarded this 5th day of July, 2026" />
            </label>
          )}

          {(template === 'classic' || template === 'executive') && (
            <>
              <div className="cert-two-fields">
                <label>Border style
                  <select value={ornamentLevel} onChange={(e) => setOrnamentLevel(e.target.value)}>
                    <option>Ornate</option>
                    <option>Minimal</option>
                  </select>
                </label>
                <label>Name style
                  <select value={nameStyle} onChange={(e) => setNameStyle(e.target.value)}>
                    <option>As Designed</option>
                    <option>Elegant Script</option>
                    <option>Classic Serif</option>
                    <option>Bold Modern</option>
                  </select>
                </label>
              </div>
              <label>Seal style
                <select value={sealStyle} onChange={(e) => setSealStyle(e.target.value)}>
                  <option>As Designed</option>
                  <option>Laurel Medallion</option>
                  <option>Rosette Ribbon</option>
                  <option>Engraved Seal</option>
                  <option>Royal Seal</option>
                </select>
              </label>
              {sealStyle === 'Royal Seal' && (
                <label>Upload your seal image
                  <input type="file" accept="image/*" onChange={handleCustomSealUpload} />
                </label>
              )}
            </>
          )}

          {template === 'executive' && (
            <>
              <label>Quote (Executive Signature only, optional)
                <select value={quoteStyle} onChange={(e) => setQuoteStyle(e.target.value)}>
                  <option>None</option>
                  <option>Excellence (Aristotle)</option>
                  <option>Getting Started (Walt Disney)</option>
                  <option>Courage to Continue (Churchill)</option>
                  <option>Love What You Do (Steve Jobs)</option>
                  <option>Impossible Until Done (Mandela)</option>
                  <option>Believe (Roosevelt)</option>
                  <option>Hard Work (Tim Notke)</option>
                  <option>Together (Helen Keller)</option>
                  <option>Create the Future (Drucker)</option>
                  <option>Beauty of Dreams (Eleanor Roosevelt)</option>
                  <option>Keep Going (Confucius)</option>
                  <option>Within Us (Emerson)</option>
                  <option>No Limit to Tomorrow (FDR)</option>
                  <option>Disappointed by What You Didn't Do (Twain)</option>
                  <option>Never Let Yourself Be Defeated (Angelou)</option>
                  <option>Custom</option>
                </select>
              </label>
              {quoteStyle === 'Custom' && (
                <>
                  <label>Custom quote
                    <input value={customQuoteText} onChange={(e) => setCustomQuoteText(e.target.value)} placeholder="Your organization's own quote" />
                  </label>
                  <label>Attribution
                    <input value={customQuoteAttribution} onChange={(e) => setCustomQuoteAttribution(e.target.value)} placeholder="e.g. YOUR FOUNDER'S NAME" />
                  </label>
                </>
              )}
            </>
          )}

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
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', fontWeight: 600, fontSize: '0.8rem', color: '#334155', margin: '4px 0' }}>
            <input type="checkbox" checked={hasSecondIssuer} onChange={(e) => setHasSecondIssuer(e.target.checked)} style={{ width: 'auto' }} />
            Include a second signatory
          </label>
          {hasSecondIssuer && (
            <div className="cert-two-fields">
              <label>Signature 2 — Name
                <input value={state.secondIssuerName} onChange={(e) => update('secondIssuerName', e.target.value)} />
              </label>
              <label>Signature 2 — Position
                <input value={state.secondIssuerPosition} onChange={(e) => update('secondIssuerPosition', e.target.value)} />
              </label>
            </div>
          )}
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
          <button type="button" onClick={handleDownload} disabled={downloading}>{downloading ? 'Preparing PDF…' : 'Download PDF'}</button>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>
            The signature area leaves a blank line for a real pen signature if you're printing. Sending this digitally instead? Use <strong>Sign PDF</strong> (under PDF Editor) after downloading to add an actual signature without printing.
          </p>
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
          <article ref={certRef} className="certificate" style={cssVars}>
            {template === 'classic' && (
              <div className="classic-template">
                {ornamentLevel === 'Ornate'
                  ? <img src={highRes ? '/certificates/border-classic.png' : '/certificates/border-classic-preview.png'} alt="" className="cp-border-img" />
                  : <div className="cp-border-minimal" />}

                {logoImg && (
                  <div className="cp-logo-box"><img src={logoImg} alt="" /></div>
                )}
                <div ref={registerFit('orgName')} className="cp-org-name">{emptyToDefault(state, 'companyName').toUpperCase()}</div>

                <div className="cp-title">CERTIFICATE</div>
                <div className="cp-subtitle">OF {certType.toUpperCase()}</div>

                <div className="cp-intro">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
                <div ref={registerFit('recipientName')} className="cp-recipient" style={classicNameStyle}>{emptyToDefault(state, 'recipientName')}</div>

                <div className="cp-divider" />

                <div className="cp-citation">{emptyToDefault(state, 'description')}</div>
                <div ref={registerFit('programTitle')} className="cp-course">{emptyToDefault(state, 'programTitle')}</div>
                <div className="cp-date-sentence">{emptyToDefault(state, 'dateSentence')}</div>

                <div className={`cp-sig-block left ${!hasSecondIssuer ? 'cp-sig-solo' : ''}`}>
                  <div className="cp-sig-line" />
                  <div ref={registerFit('sigName1')} className="cp-sig-printed-name">{emptyToDefault(state, 'issuerName')}</div>
                  <div ref={registerFit('sigTitle1')} className="cp-sig-title">{emptyToDefault(state, 'issuerPosition')}</div>
                </div>
                {renderClassicSeal()}
                {sealStyle === 'As Designed' && (
                  <>
                    <div className="cp-seal-diamond left" />
                    <div className="cp-seal-diamond right" />
                  </>
                )}
                {hasSecondIssuer && (
                  <div className="cp-sig-block right">
                    <div className="cp-sig-line" />
                    <div ref={registerFit('sigName2')} className="cp-sig-printed-name">{emptyToDefault(state, 'secondIssuerName')}</div>
                    <div ref={registerFit('sigTitle2')} className="cp-sig-title">{emptyToDefault(state, 'secondIssuerPosition')}</div>
                  </div>
                )}

                {hasCertId && <div className="cp-meta left">CERTIFICATE ID: {state.certificateId}</div>}
                <div className="cp-meta center">DATE ISSUED: {emptyToDefault(state, 'issueDate')}</div>
              </div>
            )}

            {template === 'modern' && (
              <div className="modern-template">
                <aside className="modern-rail">
                  <div className="cert-logo-row">
                    <LogoMark />
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  {state.tagline && <p>{state.tagline}</p>}
                  <div className="cert-rail-title">
                    <span>Certificate of</span>
                    <strong>{certType}</strong>
                  </div>
                  <div className="cert-line-icon">Award</div>
                </aside>
                <section className="modern-body">
                  <div className="cert-geo-mark" />
                  <p className="cert-intro">This certificate is proudly presented to</p>
                  <h3 ref={registerFit('recipientName')}>{emptyToDefault(state, 'recipientName')}</h3>
                  <div className="cert-accent-line" />
                  <p>For successfully completing</p>
                  <p ref={registerFit('programTitle')} className="cert-highlight">{emptyToDefault(state, 'programTitle')}</p>
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <footer className="modern-footer">
                    <div><span>Date issued</span><strong>{emptyToDefault(state, 'issueDate')}</strong></div>
                    <div className={!hasCertId ? 'is-hidden' : ''}><span>Certificate ID</span><strong>{state.certificateId}</strong></div>
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
                {ornamentLevel === 'Ornate' ? (
                  <>
                    <div className="ce-concentric outer" />
                    <div className="ce-concentric inner" />
                    <img src={highRes ? '/certificates/border-executive.png' : '/certificates/border-executive-preview.png'} alt="" className="ce-border-img" />
                  </>
                ) : (
                  <div className="ce-border-minimal" />
                )}

                <div className="ce-header">
                  {logoImg ? <img src={logoImg} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <ExecHexLogo letter={logoInitial} />}
                  <span ref={registerFit('orgName')} className="ce-orgname">{emptyToDefault(state, 'companyName')}</span>
                </div>
                <div className="ce-distinction">◆&nbsp;&nbsp;PRESENTED WITH DISTINCTION&nbsp;&nbsp;◆</div>

                <div ref={registerFit('certTitle')} className="ce-title">CERTIFICATE OF {certType.toUpperCase()}</div>

                <div className="ce-intro">◆&nbsp;&nbsp;PROUDLY PRESENTED TO&nbsp;&nbsp;◆</div>
                <div ref={registerFit('recipientName')} className="ce-recipient" style={execNameStyle}>{emptyToDefault(state, 'recipientName')}</div>

                <div className="ce-citation">{emptyToDefault(state, 'description')}</div>

                {showQuote && (
                  <>
                    <div className="ce-quote">"{activeQuote.text}"</div>
                    <div className="ce-quote-author">— {activeQuote.author}</div>
                  </>
                )}

                <div className="ce-sig-block">
                  <div className="ce-sig-line" />
                  <div ref={registerFit('sigName1')} className="ce-sig-name">{emptyToDefault(state, 'issuerName')}</div>
                  <div ref={registerFit('sigTitle1')} className="ce-sig-title">{emptyToDefault(state, 'issuerPosition')}</div>
                </div>

                {renderExecSeal()}

                <div className="ce-date-verify">
                  <div className="ce-date-block">
                    <div className={`ce-date-value ${hasVerification ? 'ce-date-aligned' : ''}`}>{emptyToDefault(state, 'issueDate')}</div>
                    <div className="ce-date-label">DATE</div>
                  </div>
                  {hasVerification && (
                    <div className="ce-verify-block">
                      <div className="ce-qr-box">
                        <svg viewBox="0 0 10 10" width="100%" height="100%">
                          <rect width="10" height="10" fill="#FFFFFF" />
                          <g fill="#0B0F1A">
                            <rect x="0" y="0" width="3" height="3" /><rect x="1" y="1" width="1" height="1" fill="#FFFFFF" />
                            <rect x="7" y="0" width="3" height="3" /><rect x="8" y="1" width="1" height="1" fill="#FFFFFF" />
                            <rect x="0" y="7" width="3" height="3" /><rect x="1" y="8" width="1" height="1" fill="#FFFFFF" />
                            <rect x="4" y="0" width="1" height="1" /><rect x="5" y="1" width="1" height="1" />
                            <rect x="4" y="4" width="1" height="1" /><rect x="5" y="4" width="1" height="1" /><rect x="6" y="4" width="1" height="1" />
                            <rect x="4" y="5" width="1" height="1" /><rect x="6" y="5" width="1" height="1" />
                            <rect x="4" y="6" width="1" height="1" /><rect x="5" y="6" width="1" height="1" />
                            <rect x="8" y="4" width="1" height="1" /><rect x="8" y="6" width="1" height="1" />
                            <rect x="6" y="8" width="1" height="1" /><rect x="8" y="8" width="1" height="1" /><rect x="4" y="8" width="1" height="1" />
                          </g>
                        </svg>
                      </div>
                      <div className="ce-verify-label">VERIFY CERTIFICATE</div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {template === 'split' && (
              <div className="split-template">
                <aside className="cert-split-brand">
                  <div className="cert-split-shape" />
                  <div className="cert-dot-grid" />
                  <div className="cert-logo-row">
                    <LogoMark />
                    <span>{emptyToDefault(state, 'companyName')}</span>
                  </div>
                  {state.tagline && <p>{state.tagline}</p>}
                  <div className="cert-rail-title">
                    <span>Certificate of</span>
                    <strong>{certType}</strong>
                  </div>
                </aside>
                <section className="cert-split-body">
                  <p className="cert-intro">This certificate is proudly presented to</p>
                  <h3 ref={registerFit('recipientName')}>{emptyToDefault(state, 'recipientName')}</h3>
                  <div className="cert-accent-line" />
                  <p ref={registerFit('programTitle')} className="cert-program">{emptyToDefault(state, 'programTitle')}</p>
                  <p className="cert-description">{emptyToDefault(state, 'description')}</p>
                  <div className="cert-signature-block right">
                    <div className="cert-signature-line">Signature</div>
                    <strong>{emptyToDefault(state, 'issuerName')}</strong>
                    <span>{emptyToDefault(state, 'issuerPosition')}</span>
                  </div>
                  <footer className="cert-info-rail">
                    <div><span>Date issued</span><strong>{emptyToDefault(state, 'issueDate')}</strong></div>
                    <div className={!hasCertId ? 'is-hidden' : ''}><span>Certificate ID</span><strong>{state.certificateId}</strong></div>
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
