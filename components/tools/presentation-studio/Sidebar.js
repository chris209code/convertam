'use client';

import SlidePreview from './SlidePreview';
import { buildSlideObjects } from '@/lib/presentation/layoutEngine';

// Slide thumbnail rail: select/reorder/duplicate/delete/add. Thumbnails
// reuse SlidePreview so they never visually disagree with the main Stage —
// but they render from the CURRENT edited object array (objects prop),
// not a re-run of the layout engine, so user edits show up immediately.
export default function Sidebar({ slidesMeta, objects, theme, selectedIndex, onSelect, onAdd, onDelete, onDuplicate, onMove }) {
  return (
    <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflowY: 'auto', paddingRight: 4 }}>
      {slidesMeta.map((meta, i) => {
        const slideObjects = objects.filter((o) => o.slideIndex === i);
        return (
          <div key={meta.id} style={{ border: i === selectedIndex ? '2px solid #2563EB' : '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={() => onSelect(i)}>
            <div style={{ pointerEvents: 'none' }}>
              <SlidePreview objects={slideObjects} theme={theme} scale={180 / (10 * 96)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#F8FAFC', fontSize: '0.65rem' }}>
              <span style={{ fontWeight: 700, color: '#475569' }}>{i + 1}. {meta.title}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button title="Move up" onClick={(e) => { e.stopPropagation(); onMove(i, -1); }} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === 0 ? '#CBD5E1' : '#475569' }}>↑</button>
                <button title="Move down" onClick={(e) => { e.stopPropagation(); onMove(i, 1); }} disabled={i === slidesMeta.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: i === slidesMeta.length - 1 ? '#CBD5E1' : '#475569' }}>↓</button>
                <button title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(i); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB' }}>⧉</button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(i); }} disabled={slidesMeta.length <= 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: slidesMeta.length <= 1 ? '#CBD5E1' : '#DC2626' }}>✕</button>
              </div>
            </div>
          </div>
        );
      })}
      <button onClick={() => onAdd(slidesMeta.length - 1)} style={{ padding: 10, borderRadius: 8, border: '1px dashed #CBD5E1', background: 'white', color: '#2563EB', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
        + Add slide
      </button>
    </div>
  );
}
