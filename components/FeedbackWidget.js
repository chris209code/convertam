'use client';

import { useState } from 'react';

const FORMSPREE_URL = 'https://formspree.io/f/mrewedqe';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message,
          email: email || 'anonymous',
          page: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('');
        setEmail('');
        setTimeout(() => {
          setStatus('idle');
          setOpen(false);
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {/* Floating tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Give feedback"
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--cvt-color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--cvt-radius-sm) 0 0 var(--cvt-radius-sm)',
            padding: '14px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 1000,
            letterSpacing: '0.05em',
            boxShadow: 'var(--cvt-shadow-md)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span>
          <span>FEEDBACK</span>
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            bottom: 0,
            width: '320px',
            zIndex: 1000,
            borderRadius: 'var(--cvt-radius-lg) 0 0 0',
            overflow: 'hidden',
            boxShadow: 'var(--cvt-shadow-lg)',
          }}
        >
          {/* Header */}
          <div style={{ background: 'var(--cvt-color-primary)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>💬 Share your feedback</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Help us improve Convertam</div>
            </div>
            <button
              onClick={() => { setOpen(false); setStatus('idle'); }}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ background: 'var(--cvt-color-surface)', padding: '16px', border: '1px solid var(--cvt-color-rule)', borderTop: 'none' }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
                <div style={{ fontWeight: 700, color: 'var(--cvt-color-ink)', marginBottom: 4 }}>Thank you!</div>
                <div style={{ fontSize: 12, color: 'var(--cvt-color-ink-muted)' }}>Your feedback has been received.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--cvt-color-ink-muted)', display: 'block', marginBottom: 4 }}>
                    What's on your mind? *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Something broken? A feature you'd love? General thoughts..."
                    required
                    rows={4}
                    style={{
                      width: '100%', border: '1px solid var(--cvt-color-rule)', borderRadius: 'var(--cvt-radius-sm)',
                      padding: '8px 10px', fontSize: 12, resize: 'vertical',
                      background: 'var(--cvt-color-bg-soft)', color: 'var(--cvt-color-ink)', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--cvt-color-ink-muted)', display: 'block', marginBottom: 4 }}>
                    Your email <span style={{ fontWeight: 400 }}>(optional — if you want a reply)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%', border: '1px solid var(--cvt-color-rule)', borderRadius: 'var(--cvt-radius-sm)',
                      padding: '8px 10px', fontSize: 12, background: 'var(--cvt-color-bg-soft)',
                      color: 'var(--cvt-color-ink)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {status === 'error' && (
                  <div style={{ fontSize: 11, color: 'var(--cvt-color-danger)', marginBottom: 8 }}>
                    Something went wrong. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  style={{
                    width: '100%', background: 'var(--cvt-color-primary)', color: 'white',
                    border: 'none', borderRadius: 'var(--cvt-radius-sm)', padding: '10px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    opacity: status === 'sending' || !message.trim() ? 0.6 : 1,
                  }}
                >
                  {status === 'sending' ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
