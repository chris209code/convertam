'use client';
import { useRef, useState } from 'react';
import CloudUploadButtons from './cloudUpload/CloudUploadButtons';

const DEFAULT_MAX_SIZE_MB = 100;

// maxSizeMB is optional — every existing caller keeps the original 100MB
// ceiling unchanged; only a caller that explicitly needs a different limit
// (e.g. Video Studio's larger video files) passes its own.
export default function UploadBox({ accept, multiple, onFiles, label, compact, compactLabel, maxSizeMB, oversizedHint }) {
  const MAX_SIZE_MB = maxSizeMB || DEFAULT_MAX_SIZE_MB;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [sizeError, setSizeError] = useState('');

  function pick() {
    inputRef.current?.click();
  }

  function validateFiles(files) {
    const oversized = files.filter(f => f.size > MAX_SIZE_BYTES);
    if (oversized.length) {
      setSizeError(
        <>File too large — maximum size is {MAX_SIZE_MB}MB. {oversizedHint || 'Please compress or split the file first.'}</>
      );
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

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      onChange={handleChange}
      hidden
    />
  );

  // Once a document is already loaded, the full dropzone would dominate the
  // interface for no reason — the workspace already knows which document is
  // active, so replacing it is a small affordance, not the primary action.
  if (compact) {
    return (
      <div>
        {input}
        <button type="button" onClick={pick} className="text-xs text-ink-soft underline" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
          {compactLabel || '⇄ Replace file'}
        </button>
        {sizeError && <div className="status error mt-2">{sizeError}</div>}
      </div>
    );
  }

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
        {input}
        <div className="dz-icon">[ {hint} ]</div>
        <div className="dz-main">{label || 'Click to choose a file, or drag it here'}</div>
        <div className="dz-sub">Max {MAX_SIZE_MB}MB per file.</div>
      </div>
      <CloudUploadButtons accept={accept} onFile={(file) => validateFiles([file]) && onFiles([file])} />
      {sizeError && (
        <div className="status error mt-2">{sizeError}</div>
      )}
    </div>
  );
}
