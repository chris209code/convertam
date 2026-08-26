// Single source of truth for the Video Editor's export "quality" tiers.
// Used in TWO places that must never drift apart: the pre-export size
// estimate shown in the UI (VideoEditorWorkspace.js), and the actual
// encoder bitrate ceiling applied during export (timelineRender.js /
// ffmpegClient.js's remuxToMp4). Before this existed, the UI estimate was
// computed from these same-looking numbers but the encoder ran a bare CRF
// (quality-targeted, not size-targeted) with no ceiling at all — fine for
// typical camera footage, but a canvas-composited export (transitions,
// overlays, captions, text/shape layers, canvas noise/dithering) can need
// far more bits to hit the same CRF, so the actual file could land many
// times larger than what was promised before the user committed to an
// export that might run for hours. TARGET_VIDEO_KBPS is now also passed to
// the encoder as a -maxrate/-bufsize cap, so "small/balanced/high" means
// what it says regardless of how visually busy the composition is.
export const QUALITY_CRF = { small: 32, balanced: 23, high: 18 };
export const TARGET_VIDEO_KBPS = {
  '480p': { small: 800, balanced: 1200, high: 2000 },
  '720p': { small: 1500, balanced: 2500, high: 4000 },
  '1080p': { small: 3000, balanced: 5000, high: 8000 },
};
