// Central ad-slot registry — the ONE place that knows which network fills
// each logical ad slot Convertam uses, and the on/off switch for all of
// them. Every ad placement in the app goes through components/ads/AdSlot.js
// (or its ResponsiveAd/LeaderboardAd wrappers), which reads a slot by name
// from here — never hardcode a key, network, or script URL at a call site.
//
// Kept deliberately as slot-name -> {network, unit} rather than baking
// Adsterra in directly, so a second ad network can be added later (a
// specific slot repointed at it, or a brand-new slot added for it
// alongside these) without touching any page that already renders
// <LeaderboardAd/>/<ResponsiveAd/> — see lib/ads/adNetworks.js for where a
// second network's markup builder would go.

// Flip to false to pull every ad sitewide without touching a single page.
export const ADS_ENABLED = true;

export const AD_SLOTS = {
  '300x250': { network: 'adsterra', unit: { key: '79685470d7b30c39c6a2cf94a4a15257', width: 300, height: 250 } },
  '320x50': { network: 'adsterra', unit: { key: '2c12f566898a69e80a874311fc476232', width: 320, height: 50 } },
  '728x90': { network: 'adsterra', unit: { key: 'd2073e4cdba6ba5966abcf96cbe0ed39', width: 728, height: 90 } },
};
