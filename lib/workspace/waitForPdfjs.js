// A handful of older tool workspaces load pdf.js via a plain <Script
// src="…pdf.min.js"> tag and read the resulting `window.pdfjsLib` global
// directly, rather than the newer `await import('pdfjs-dist')` pattern —
// their own manual "Continue with {name}" button is safe because a human
// click always arrives well after the script has had time to load, but a
// Workspace Handoff's auto-continue (useAutoContinueSession) can fire the
// instant the destination workspace mounts, before that script tag has
// necessarily finished. This gives those call sites something to await
// first so the handoff doesn't race a script that hasn't loaded yet.
export function waitForPdfjs(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.pdfjsLib) { resolve(true); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.pdfjsLib) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}
