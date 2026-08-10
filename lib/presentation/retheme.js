// Re-themes an already-edited object array in place: instant, local,
// zero AI. Rather than rebuilding every slide from scratch (which would
// discard user edits — moved/resized objects, edited text, manually added
// shapes), this does a reverse-lookup re-color/re-font/re-size pass: any
// value on an object that exactly matches one of the OLD theme's tokens
// gets swapped for the NEW theme's corresponding token. Values that don't
// match any known token (e.g. a user-picked custom color, once a color
// picker exists) are left untouched — this only ever touches values that
// are clearly theme-derived.

function buildReverseMap(theme) {
  const colorRoles = {};
  Object.entries(theme.colors).forEach(([role, hex]) => { colorRoles[hex] = role; });
  const fontRoles = {};
  Object.entries(theme.fonts).forEach(([role, face]) => { fontRoles[face] = role; });
  const sizeRoles = {};
  Object.entries(theme.fontSizes).forEach(([role, size]) => { sizeRoles[size] = role; });
  return { colorRoles, fontRoles, sizeRoles };
}

function remapColor(hex, reverse, newTheme) {
  const role = reverse.colorRoles[hex];
  return role ? newTheme.colors[role] : hex;
}

export function rethemeObjects(objects, oldTheme, newTheme) {
  const reverse = buildReverseMap(oldTheme);
  return objects.map((obj) => {
    const next = { ...obj };
    if (next.color) next.color = remapColor(next.color, reverse, newTheme);
    if (next.fill) next.fill = remapColor(next.fill, reverse, newTheme);
    if (next.outline) next.outline = remapColor(next.outline, reverse, newTheme);
    if (next.fontFace) {
      const role = reverse.fontRoles[next.fontFace];
      if (role) next.fontFace = newTheme.fonts[role];
    }
    if (next.fontSize) {
      const role = reverse.sizeRoles[next.fontSize];
      if (role) next.fontSize = newTheme.fontSizes[role];
    }
    if (next.type === 'chart' && Array.isArray(next.colors)) {
      next.colors = next.colors.map((hex) => remapColor(hex, reverse, newTheme));
    }
    return next;
  });
}
