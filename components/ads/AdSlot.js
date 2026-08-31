'use client';

// Reusable Adsterra banner ad unit. Every ad placement across Convertam
// renders through this one component (or the ResponsiveAd/LeaderboardAd
// wrappers below) rather than pasting Adsterra's script tags into pages
// directly — see lib/ads/adsterraConfig.js for the actual keys/sizes and
// the sitewide on/off switch.
//
// Adsterra's invoke.js uses `document.write` to insert its ad markup at
// the script tag's own position in the DOM — that's incompatible with
// React (which owns the DOM and re-renders around it) if loaded directly
// on the page, and two ad units on the same page would also clobber each
// other's global `atOptions` variable. Rendering each unit inside its own
// <iframe srcDoc=...> sidesteps both problems: it's a fresh, isolated
// document where document.write works exactly as the ad network expects,
// and each iframe has its own global scope.

import { useEffect, useState } from 'react';
import { ADS_ENABLED, AD_UNITS } from '@/lib/ads/adsterraConfig';

function buildAdSrcDoc(unit) {
  const atOptions = { key: unit.key, format: 'iframe', height: unit.height, width: unit.width, params: {} };
  return `<!doctype html><html><head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body>
<script>atOptions=${JSON.stringify(atOptions)};</script>
<script src="https://www.highrevenueformat.com/${unit.key}/invoke.js"></script>
</body></html>`;
}

// size: '300x250' | '320x50' | '728x90' — one of AD_UNITS' keys.
// Renders a fixed-size reserved space immediately (even before the ad
// itself loads) so the page never jumps once the ad appears.
export function AdSlot({ size, style, className }) {
  const unit = AD_UNITS[size];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!ADS_ENABLED || !unit) return null;

  const containerStyle = { width: unit.width, height: unit.height, maxWidth: '100%', overflow: 'hidden', ...style };

  // Deferring the actual iframe (with its remote script) to after mount
  // keeps the ad off the very first paint/SSR output — the reserved-space
  // placeholder alone is enough to avoid layout shift once it does load.
  if (!mounted) return <div aria-hidden className={className} style={containerStyle} />;

  return (
    <div className={className} style={containerStyle}>
      <iframe
        title="Advertisement"
        srcDoc={buildAdSrcDoc(unit)}
        width={unit.width}
        height={unit.height}
        scrolling="no"
        style={{ border: 'none', display: 'block', width: unit.width, height: unit.height, maxWidth: '100%' }}
      />
    </div>
  );
}

// Desktop/tablet gets the 300x250 rectangle; phones get the 320x50 banner
// instead of the same rectangle squeezed into a much narrower viewport.
// Picks exactly one size to actually request (never both), so switching
// between them on resize doesn't double up on ad calls.
export function ResponsiveAd({ style, className }) {
  const [isMobile, setIsMobile] = useState(null); // null = not yet determined; avoids a flash of the wrong size

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    setIsMobile(mq.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (isMobile === null) return <div aria-hidden className={className} style={{ width: 300, height: 250, maxWidth: '100%', ...style }} />;
  return <AdSlot size={isMobile ? '320x50' : '300x250'} style={style} className={className} />;
}

// 728x90 only makes sense on a genuinely wide desktop viewport — renders
// nothing at all below the breakpoint rather than stretching/shrinking a
// leaderboard to fit, which is why this is a separate component from
// ResponsiveAd instead of a third case inside it.
export function LeaderboardAd({ style, className }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    setShow(mq.matches);
    const onChange = (e) => setShow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!show) return null;
  return <AdSlot size="728x90" style={style} className={className} />;
}
