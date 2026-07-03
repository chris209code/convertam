'use client';
import { useRef, useState } from 'react';

const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function UploadBox({ accept, multiple, onFiles, label }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [sizeError, setSizeError] = useState('');

  function pick() {
    inputRef.current?.click();
  }

  function validateFiles(files) {
    const oversized = files.filter(f => f.size > MAX_SIZE_BYTES);
    if (oversized.length) {
      setSizeError(`File too large — maximum size is ${MAX_SIZE_MB}MB. Please compress or split the file first.`);
      return false;
    }
    setSizeError('');
    return true;
  }

  function handleChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length && validateFiles(files)) onFiles(files);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length && validateFiles(files)) onFiles(files);
  }

  const hint = accept?.includes('pdf')
    ? 'PDF'
    : accept?.includes('image')
    ? 'JPG · PNG'
    : accept || 'any file';

  return (
    <div>
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
        <div className="dz-sub">Max {MAX_SIZE_MB}MB per file.</div>
      </div>
      {sizeError && (
        <div className="status error mt-2">{sizeError}</div>
      )}
    </div>
  );
}
