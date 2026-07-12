'use client';

import { useState, useRef } from 'react';

const MODES = [
  { id: 'math', label: 'Math', icon: '√x', color: '#059669' },
  { id: 'general', label: 'General', icon: '💬', color: '#2563EB' },
  { id: 'translate', label: 'Translate', icon: '🌐', color: '#7C3AED' },
];

const LANGUAGES = ['English', 'French', 'Spanish', 'Portuguese', 'German', 'Arabic', 'Hausa', 'Yoruba', 'Igbo', 'Swahili', 'Chinese', 'Pidgin English'];

export default function AskSolveAIWorkspace() {
  const [mode, setMode] = useState('general');
  const [targetLanguage, setTargetLanguage] = useState('English');
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

  async function handleAsk() {
    if (!question.trim() && !image) return;
    setError('');
    setBusy(true);

    const userMessage = { role: 'user', text: question, imagePreview, mode };
    setMessages((m) => [...m, userMessage]);
    const askedQuestion = question;
    const askedImage = image;
    setQuestion('');
    clearImage();

    try {
      let res;
      if (askedImage) {
        const formData = new FormData();
        formData.append('mode', mode);
        formData.append('question', askedQuestion);
        formData.append('targetLanguage', targetLanguage);
        formData.append('image', askedImage);
        res = await fetch('/api/ask-solve-ai', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/ask-solve-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, question: askedQuestion, targetLanguage }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      setMessages((m) => [...m, { role: 'assistant', text: data.answer, mode }]);
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

      {mode === 'translate' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Translate into</label>
          <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit' }}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>Source language is detected automatically.</p>
        </div>
      )}

      <div style={{ minHeight: 260, maxHeight: 440, overflowY: 'auto', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', padding: '40px 20px' }}>
            {activeMode.label === 'Math' && 'Type a math problem, or upload/scan a photo of one, and get a clear step-by-step solution.'}
            {activeMode.label === 'General' && 'Ask anything — type your question below, or scan a photo of it.'}
            {activeMode.label === 'Translate' && 'Type or scan text, pick a target language above, and get an accurate translation.'}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
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
