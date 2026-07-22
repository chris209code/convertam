'use client';

import { useState, useRef } from 'react';

const MODES = [
  { id: 'math', label: 'Math', icon: '√x', color: '#059669' },
  { id: 'general', label: 'General', icon: '💬', color: '#2563EB' },
];

const DEPTHS = [
  { id: 'quick', label: 'Quick answer' },
  { id: 'step-by-step', label: 'Step-by-step' },
  { id: 'detailed', label: 'Detailed' },
];

export default function AskSolveAIWorkspace() {
  const [mode, setMode] = useState('general');
  const [depth, setDepth] = useState('step-by-step');
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function callApi({ askedMode, askedQuestion, askedImage, askedDepth, continueFrom }) {
    if (askedImage) {
      const formData = new FormData();
      formData.append('mode', askedMode);
      formData.append('question', askedQuestion);
      formData.append('depth', askedDepth);
      formData.append('image', askedImage);
      return fetch('/api/ask-solve-ai', { method: 'POST', body: formData });
    }
    return fetch('/api/ask-solve-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: askedMode, question: askedQuestion, depth: askedDepth, continueFrom }),
    });
  }

  async function handleAsk() {
    if (busy) return; // prevents duplicate concurrent requests from a rapid double-click/double-Enter
    if (!question.trim() && !image) return;
    setError('');
    setBusy(true);

    const askedMode = mode, askedDepth = depth;
    const userMessage = { role: 'user', text: question, imagePreview, mode: askedMode };
    setMessages((m) => [...m, userMessage]);
    const askedQuestion = question;
    const askedImage = image;
    setQuestion('');
    clearImage();

    try {
      const res = await callApi({ askedMode, askedQuestion, askedImage, askedDepth });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      // Truncated responses are never silently shown as complete — they're
      // flagged so Continue/Retry/Shorter can be offered instead.
      setMessages((m) => [...m, {
        role: 'assistant', text: data.answer, mode: askedMode, depth: askedDepth,
        originalQuestion: askedQuestion, truncated: !!data.truncated,
      }]);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Continuation appends to the existing message rather than replacing it —
  // uses a functional state update so it's never built from a stale closure
  // value, the same principle that matters for chunk-by-chunk streaming,
  // just applied to a two-request continue instead.
  async function handleContinue(index) {
    if (busy) return;
    setBusy(true);
    setError('');
    const msg = messages[index];
    try {
      const res = await callApi({ askedMode: msg.mode, askedQuestion: msg.originalQuestion, askedImage: null, askedDepth: msg.depth, continueFrom: msg.text });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setMessages((prev) => prev.map((m, i) => i === index
        ? { ...m, text: `${m.text} ${data.answer}`.trim(), truncated: !!data.truncated }
        : m));
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry(index) {
    if (busy) return;
    const msg = messages[index];
    setBusy(true);
    setError('');
    try {
      const res = await callApi({ askedMode: msg.mode, askedQuestion: msg.originalQuestion, askedImage: null, askedDepth: msg.depth });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setMessages((prev) => prev.map((m, i) => i === index
        ? { ...m, text: data.answer, truncated: !!data.truncated }
        : m));
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShorter(index) {
    if (busy) return;
    const msg = messages[index];
    setBusy(true);
    setError('');
    try {
      const res = await callApi({ askedMode: msg.mode, askedQuestion: msg.originalQuestion, askedImage: null, askedDepth: 'quick' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setMessages((prev) => prev.map((m, i) => i === index
        ? { ...m, text: data.answer, truncated: !!data.truncated, depth: 'quick' }
        : m));
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              border: mode === m.id ? `2px solid ${m.color}` : '1px solid #E2E8F0',
              background: mode === m.id ? `${m.color}12` : 'white',
            }}
          >
            <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: mode === m.id ? m.color : '#475569' }}>{m.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Answer depth:</span>
        {DEPTHS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDepth(d.id)}
            style={{
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              border: depth === d.id ? `1px solid ${activeMode.color}` : '1px solid #E2E8F0',
              background: depth === d.id ? `${activeMode.color}12` : 'white',
              color: depth === d.id ? activeMode.color : '#64748B',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 260, maxHeight: 440, overflowY: 'auto', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', padding: '40px 20px' }}>
            {activeMode.label === 'Math' && 'Type a math problem, or upload/scan a photo of one, and get a clear step-by-step solution.'}
            {activeMode.label === 'General' && 'Ask anything — type your question below, or scan a photo of it.'}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 14,
              background: msg.role === 'user' ? '#2563EB' : 'white',
              color: msg.role === 'user' ? 'white' : '#1E293B',
              border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
              fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {msg.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.imagePreview} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: msg.text ? 8 : 0, display: 'block' }} />
              )}
              {msg.text}
            </div>
            {msg.role === 'assistant' && msg.truncated && (
              <div style={{ marginTop: 6, maxWidth: '85%' }}>
                <p style={{ fontSize: '0.76rem', color: '#D97706', fontWeight: 600, marginBottom: 6 }}>The answer was interrupted before completion.</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => handleContinue(i)} disabled={busy} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 999, border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', cursor: 'pointer', fontWeight: 600 }}>Continue</button>
                  <button onClick={() => handleRetry(i)} disabled={busy} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer' }}>Retry</button>
                  <button onClick={() => handleShorter(i)} disabled={busy} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 999, border: '1px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer' }}>Generate shorter answer</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: 14, background: 'white', border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: '0.85rem' }}>Thinking…</div>
          </div>
        )}
      </div>

      {error && <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.8rem', marginBottom: 10 }}>{error}</div>}

      {imagePreview && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
          <span style={{ fontSize: '0.78rem', color: '#1E3A8A', flex: 1 }}>Image attached — will be read as part of your question</span>
          <button onClick={clearImage} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Remove</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <label style={{ padding: '10px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', flexShrink: 0 }}>
          📷
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything…"
          rows={1}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
        />
        <button
          onClick={handleAsk}
          disabled={busy || (!question.trim() && !image)}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : activeMode.color, color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: busy ? 'default' : 'pointer', flexShrink: 0 }}
        >
          {busy ? '…' : 'Ask'}
        </button>
      </div>

      <p className="privacy-note">Your questions and photos are sent securely to our AI engine and never stored.</p>
    </div>
  );
}
