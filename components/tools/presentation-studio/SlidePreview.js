'use client';

import { SLIDE_W, SLIDE_H, PX_PER_INCH } from '@/lib/presentation/layoutEngine';
import { contentFor } from './objectTypes';

// Read-only render of one slide's positioned object array — used for the
// Phase B preview, Sidebar thumbnails, and anywhere else a slide needs to
// be shown without editing. Shares the exact same per-type Content
// renderers as the editable Stage.js (Phase C) via objectTypes/index.js,
// so a thumbnail and the live canvas never visually disagree. Geometry is
// inches -> px via PX_PER_INCH, matching the PPTX/PDF export math.
function inToPx(v) { return v * PX_PER_INCH; }

export default function SlidePreview({ objects, theme, scale = 1 }) {
  const w = SLIDE_W * PX_PER_INCH * scale;
  const h = SLIDE_H * PX_PER_INCH * scale;
  return (
    <div style={{ position: 'relative', width: w, height: h, background: `#${theme.colors.background}`, overflow: 'hidden', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: SLIDE_W * PX_PER_INCH, height: SLIDE_H * PX_PER_INCH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {objects.map((obj) => {
          const Content = contentFor(obj.type);
          if (!Content) return null;
          return (
            <div key={obj.id} style={{ position: 'absolute', left: inToPx(obj.x), top: inToPx(obj.y), width: inToPx(obj.w), height: inToPx(obj.h) }}>
              <Content obj={obj} isEditing={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
