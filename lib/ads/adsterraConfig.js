// Central Adsterra ad-unit registry — the ONE place that knows about ad
// keys, sizes, and whether ads are on at all. Every ad placement in the app
// goes through components/ads/AdSlot.js (or its ResponsiveAd/LeaderboardAd
// wrappers), which reads from here — never hardcode a key or invoke.js URL
// at a call site, so a key rotation, a size swap, or a full ads kill-switch
// is a one-line change here instead of a site-wide search-and-replace.

// Flip to false to pull every Adsterra ad sitewide without touching a
// single page — AdSlot checks this before rendering anything.
export const ADS_ENABLED = true;

export const AD_UNITS = {
  '300x250': { key: '79685470d7b30c39c6a2cf94a4a15257', width: 300, height: 250 },
  '320x50': { key: '2c12f566898a69e80a874311fc476232', width: 320, height: 50 },
  '728x90': { key: 'd2073e4cdba6ba5966abcf96cbe0ed39', width: 728, height: 90 },
};
