'use client';

import { useRef } from 'react';

export function createDefaults({ placeholderLabel = 'Add an image', fill = 'E2E8F0' } = {}) {
  return { placeholderLabel, fill, dataUrl: null };
}

// Placeholder-first: AI never fetches or hallucinates an image (no stock
// photo/image-generation integration exists anywhere in this codebase to
// reuse, and building one is out of Phase 1 scope) — the user fills the
// placeholder themselves via double-click upload, same "you complete the
// slot" pattern as a Canva image placeholder.
export function Content({ obj, isEditing, onCommitImage }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCommitImage(reader.result);
    reader.readAsDataURL(file);
  }

  if (obj.dataUrl) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }} onDoubleClick={() => inputRef.current?.click()}>
        <img src={obj.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => inputRef.current?.click()}
      style={{
        width: '100%', height: '100%', background: `#${obj.fill}`, border: '2px dashed rgba(148,163,184,0.6)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8, color: '#64748B', fontSize: 11, cursor: 'pointer',
      }}
    >
      🖼 {obj.placeholderLabel} (double-click to upload)
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
