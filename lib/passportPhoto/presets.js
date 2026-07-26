// Country/document photo presets — dimensions and head-position guidance
// reflect commonly published official guidance as of this writing. Photo
// requirements do change over time and vary by exact document/visa type, so
// every preset carries its own disclaimer and the tool never claims a photo
// is "officially accepted" — only that it matches the dimensions, head
// position, and background shown here. Always confirm against the current
// official requirement for your destination before submitting.
const STANDARD_DPI = 300;

function mmToPx(mm, dpi = STANDARD_DPI) {
  return Math.round((mm / 25.4) * dpi);
}

// headHeightMinPct/MaxPct: chin-to-crown height as a percentage of the total
// photo height — the single most consistently published requirement across
// these specs, and the one this tool can genuinely verify from how the user
// positions the guide. Background is checked by sampling the final
// composited output, not assumed.
export const PRESETS = [
  {
    id: 'nigeria-passport',
    country: 'Nigeria',
    documentLabel: 'Passport Photo',
    widthMm: 51, heightMm: 51,
    headHeightMinPct: 50, headHeightMaxPct: 69,
    background: { label: 'Plain white', hex: '#FFFFFF' },
    notes: 'Commonly published Nigerian passport photo guidance: 2×2in (51×51mm), plain white background, neutral expression, no glasses glare.',
  },
  {
    id: 'uk-passport',
    country: 'United Kingdom',
    documentLabel: 'Passport / ID Photo',
    widthMm: 35, heightMm: 45,
    headHeightMinPct: 64, headHeightMaxPct: 76,
    background: { label: 'Light grey / cream', hex: '#F1F0EC' },
    notes: 'UK guidance calls for a plain light grey or cream background — not pure white — with no shadows on the face or background.',
  },
  {
    id: 'us-passport',
    country: 'United States',
    documentLabel: 'Passport / Visa Photo',
    widthMm: 51, heightMm: 51,
    headHeightMinPct: 49, headHeightMaxPct: 69,
    background: { label: 'Plain white', hex: '#FFFFFF' },
    notes: 'US Department of State guidance: 2×2in (51×51mm), plain white or off-white background, head height 1 to 1⅜in.',
  },
  {
    id: 'canada-passport',
    country: 'Canada',
    documentLabel: 'Passport Photo',
    widthMm: 50, heightMm: 70,
    headHeightMinPct: 44, headHeightMaxPct: 51,
    background: { label: 'Plain white / light', hex: '#FFFFFF' },
    notes: 'Canadian guidance: 50×70mm, plain white or light-coloured background, head height 31–36mm from chin to crown.',
  },
  {
    id: 'australia-passport',
    country: 'Australia',
    documentLabel: 'Passport / Visa Photo',
    widthMm: 35, heightMm: 45,
    headHeightMinPct: 71, headHeightMaxPct: 80,
    background: { label: 'Plain white / light grey', hex: '#FFFFFF' },
    notes: 'Australian guidance: 35×45mm, plain white or light grey background, even lighting with no shadows.',
  },
  {
    id: 'schengen-visa',
    country: 'Schengen Area',
    documentLabel: 'Visa Photo',
    widthMm: 35, heightMm: 45,
    headHeightMinPct: 71, headHeightMaxPct: 80,
    background: { label: 'Light / off-white', hex: '#F5F5F5' },
    notes: 'ICAO-aligned Schengen visa guidance: 35×45mm, plain light or off-white background, neutral expression.',
  },
  {
    id: 'india-passport',
    country: 'India',
    documentLabel: 'Passport / Visa Photo',
    widthMm: 51, heightMm: 51,
    headHeightMinPct: 70, headHeightMaxPct: 80,
    background: { label: 'Plain white', hex: '#FFFFFF' },
    notes: 'Commonly published Indian passport/visa guidance: 2×2in (51×51mm), plain white background, face covering 70–80% of the photo.',
  },
  {
    id: 'south-africa-id',
    country: 'South Africa',
    documentLabel: 'ID / Passport Photo',
    widthMm: 35, heightMm: 45,
    headHeightMinPct: 65, headHeightMaxPct: 75,
    background: { label: 'Plain white / light grey', hex: '#FFFFFF' },
    notes: 'Commonly published South African guidance: 35×45mm, plain white or light grey background, neutral expression.',
  },
  {
    id: 'generic-visa',
    country: 'Generic',
    documentLabel: 'Visa / ID Photo (2×2in)',
    widthMm: 51, heightMm: 51,
    headHeightMinPct: 50, headHeightMaxPct: 75,
    background: { label: 'Plain white', hex: '#FFFFFF' },
    notes: 'A general-purpose 2×2in template for visas and ID documents that don\'t have a dedicated preset here — check the specific requirement before submitting.',
  },
  {
    id: 'driver-licence',
    country: 'Generic',
    documentLabel: "Driver's Licence Photo",
    widthMm: 35, heightMm: 45,
    headHeightMinPct: 60, headHeightMaxPct: 75,
    background: { label: 'Plain white / light', hex: '#FFFFFF' },
    notes: "Driver's licence photo requirements vary by issuing authority — this uses a common 35×45mm ID-photo template.",
  },
  {
    id: 'green-card',
    country: 'United States',
    documentLabel: 'Green Card (Immigrant Visa) Photo',
    widthMm: 51, heightMm: 51,
    headHeightMinPct: 49, headHeightMaxPct: 69,
    background: { label: 'Plain white', hex: '#FFFFFF' },
    notes: 'US immigrant visa / Green Card photos follow the same 2×2in specification as US passport photos.',
  },
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

export function presetPixelSize(preset, dpi = STANDARD_DPI) {
  return { width: mmToPx(preset.widthMm, dpi), height: mmToPx(preset.heightMm, dpi), dpi };
}

export { STANDARD_DPI, mmToPx };
