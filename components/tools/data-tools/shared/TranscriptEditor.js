'use client';

// Shared, time-aware transcript editor — used by both Audio Studio and
// Video Studio (Phase 3) so the editing experience is identical regardless
// of which media type produced the transcript. Segment click seeks the
// caller's media element via onSeek; the currently-playing segment is
// highlighted via currentTime.

import { useState } from 'react';
import { T } from '../smart-parser/theme';
import { editSegmentText, deleteSegment, mergeSegments, searchTranscript } from '@/lib/media/transcript';
import { formatDuration } from '@/lib/media/metadata';

export default function TranscriptEditor({ transcript, onTranscriptChange, currentTime = 0, onSeek }) {
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [query, setQuery] = useState('');

  const matchIds = query.trim() ? new Set(searchTranscript(transcript, query)) : null;

  function startEdit(seg) {
    setEditingId(seg.id);
    setDraftText(seg.text);
  }
  function commitEdit() {
    if (editingId) onTranscriptChange(editSegmentText(transcript, editingId, draftText));
    setEditingId(null);
  }
  function handleDelete(id) {
    onTranscriptChange(deleteSegment(transcript, id));
  }
  function handleMergeWithNext(id) {
    const idx = transcript.segments.findIndex((s) => s.id === id);
    const next = transcript.segments[idx + 1];
    if (!next) return;
    onTranscriptChange(mergeSegments(transcript, id, next.id));
  }

  if (!transcript.segments.length) {
    return <div style={{ fontFamily: T.font, textAlign: 'center', padding: '32px 16px', color: T.muted, fontSize: '0.85rem' }}>No speech was detected in this audio.</div>;
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search transcript…"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: '0.84rem', marginBottom: 12, fontFamily: T.font, boxSizing: 'border-box' }}
      />
      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {transcript.segments.map((seg, i) => {
          const isActive = currentTime >= seg.start && currentTime < seg.end;
          const isMatch = matchIds && matchIds.has(seg.id);
          const isEditing = editingId === seg.id;
          return (
            <div
              key={seg.id}
              style={{
                display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10,
                background: isEditing ? T.accentTint : isActive ? '#F0FDFA' : 'transparent',
                border: isMatch ? `1px solid ${T.accent}` : '1px solid transparent',
              }}
            >
              <button
                onClick={() => onSeek?.(seg.start)}
                style={{ flexShrink: 0, width: 52, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.font, fontSize: '0.72rem', fontWeight: 700, color: isActive ? T.accentDark : T.muted, marginTop: 3 }}
              >
                {formatDuration(seg.start)}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === 'Escape') setEditingId(null); }}
                    style={{ width: '100%', minHeight: 40, padding: '6px 8px', borderRadius: 8, border: `1px solid ${T.accent}`, fontSize: '0.85rem', fontFamily: T.font, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                ) : (
                  <p onClick={() => startEdit(seg)} style={{ margin: 0, fontSize: '0.85rem', color: T.inkSecondary, cursor: 'text', lineHeight: 1.5 }}>{seg.text}</p>
                )}
              </div>
              {!isEditing && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {i < transcript.segments.length - 1 && (
                    <button onClick={() => handleMergeWithNext(seg.id)} title="Merge with next segment" style={iconBtn}>⤵</button>
                  )}
                  <button onClick={() => handleDelete(seg.id)} title="Delete segment" style={iconBtn}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconBtn = { width: 26, height: 26, borderRadius: 7, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', cursor: 'pointer', color: T.mutedDark, padding: 0 };
