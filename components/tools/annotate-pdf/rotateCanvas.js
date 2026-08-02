// Rotates an already-composed canvas (page bitmap + drawn annotations) by a
// multiple of 90 degrees, used at export time to bake a page's chosen
// rotation into the flattened output. Annotations are always authored in
// the page's original, unrotated coordinate space — Stage.js disables
// pointer interaction on a page while it has an active rotation, so this
// function only ever needs to rotate a finished bitmap, never live
// annotation coordinates or hit-testing math (seeing "rotate + resize
// together" flagged as a hard pivot-math problem in redact-edit/geometry.js
// is why this simpler, discrete-transform approach was chosen instead).
export function rotateCanvas(source, degrees) {
  if (!degrees) return source;
  const rad = (degrees * Math.PI) / 180;
  const swapped = degrees === 90 || degrees === 270;
  const width = swapped ? source.height : source.width;
  const height = swapped ? source.width : source.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
