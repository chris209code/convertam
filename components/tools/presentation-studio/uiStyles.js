// Shared inline-style tokens for the presentation-studio step components —
// matches the existing Convertam tool-panel visual language (same palette/
// radii/type scale already used across PresentationGeneratorWorkspace.js's
// predecessor and sibling AI tools) rather than introducing a new look.

export const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
export const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 };
export const chipBtn = (active) => ({ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: active ? '2px solid #2563EB' : '1px solid #E2E8F0', background: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#475569' });
export const errorBox = { padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', marginBottom: 16 };
