// Per-network ad markup builders. Each entry knows how to turn one of ITS
// OWN ad units into the HTML that goes inside AdSlot's isolated iframe —
// adding a second network later (Google AdSense, etc.) means adding one
// more entry here and pointing the relevant slot(s) in lib/ads/adSlots.js
// at it. No page that renders an ad (they only ever call AdSlot/
// ResponsiveAd/LeaderboardAd by slot name) needs to change.
export const AD_NETWORKS = {
  adsterra: {
    // unit: { key, width, height } — see lib/ads/adSlots.js.
    buildMarkup(unit) {
      const atOptions = { key: unit.key, format: 'iframe', height: unit.height, width: unit.width, params: {} };
      return `<script>atOptions=${JSON.stringify(atOptions)};</script>
<script src="https://www.highrevenueformat.com/${unit.key}/invoke.js"></script>`;
    },
  },
  // google: { buildMarkup(unit) { ... } } — add once real AdSense ad-unit
  // codes exist; until then no slot references this and nothing renders.
};
