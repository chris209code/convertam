// Export leads with a destination, not a file format — choosing one sets
// the canvas size and format together. An "Advanced" toggle in the
// workspace still exposes the underlying canvas-size and format controls
// directly, for anyone who wants them.
export const EXPORT_PRESETS = [
  { id: 'website', label: 'Website', canvasPresetId: 'auto', format: 'png' },
  { id: 'blog', label: 'Blog', canvasPresetId: 'widescreen', format: 'jpg' },
  { id: 'twitter', label: 'Twitter / X', canvasPresetId: 'social-og', format: 'png' },
  { id: 'linkedin', label: 'LinkedIn', canvasPresetId: 'social-og', format: 'png' },
  { id: 'documentation', label: 'Documentation', canvasPresetId: 'auto', format: 'png' },
];

export function getExportPreset(id) {
  return EXPORT_PRESETS.find((p) => p.id === id) || EXPORT_PRESETS[0];
}
