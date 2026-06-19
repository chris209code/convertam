'use client';

import { useRef, useState } from 'react';

export default function UploadBox({ accept, multiple, onFiles, label }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  function handleChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  }

  const hint = accept?.includes('pdf')
    ? 'PDF'
    : accept?.includes('image')
    ? 'JPG · PNG'
    : accept || 'any file';

  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        hidden
      />
      <div className="dz-icon">[ {hint} ]</div>
      <div className="dz-main">{label || 'Click to choose a file, or drag it here'}</div>
      <div className="dz-sub">Max 100MB for now.</div>
    </div>
  );
}
