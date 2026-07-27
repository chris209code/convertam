// Shared handoff convention other Convertam tools use to hand a finished
// visual straight to Screenshot Studio: store the rendered image, then link
// to `/screenshot-studio?ws=<workspace>&handoff=1`. Screenshot Studio reads
// and clears it on load — a handoff is one-shot, not a persistent bridge —
// and skips both the entry question and the upload step, since a handoff
// already answers "what are you creating?" and "with what?"
const HANDOFF_KEY = 'convertam.handoff.screenshotStudio';

export function setHandoffImage(dataUrl) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(HANDOFF_KEY, dataUrl);
}

export function consumeHandoffImage() {
  if (typeof window === 'undefined') return null;
  const dataUrl = window.sessionStorage.getItem(HANDOFF_KEY);
  if (dataUrl) window.sessionStorage.removeItem(HANDOFF_KEY);
  return dataUrl;
}
