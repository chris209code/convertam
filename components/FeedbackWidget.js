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
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'right center',
            background: '#3a63b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 1000,
            letterSpacing: '0.03em',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
          }}
        >
          💬 Feedback
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
            borderRadius: '12px 0 0 0',
            overflow: 'hidden',
            boxShadow: '-4px -4px 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <div style={{ background: '#3a63b8', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ background: '#fffefb', padding: '16px' }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
                <div style={{ fontWeight: 700, color: '#1c2333', marginBottom: 4 }}>Thank you!</div>
                <div style={{ fontSize: 12, color: '#6b6560' }}>Your feedback has been received.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b6560', display: 'block', marginBottom: 4 }}>
                    What's on your mind? *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Something broken? A feature you'd love? General thoughts..."
                    required
                    rows={4}
                    style={{
                      width: '100%', border: '1px solid #e2dcc9', borderRadius: 8,
                      padding: '8px 10px', fontSize: 12, resize: 'vertical',
                      background: '#f7f4ec', color: '#1c2333', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b6560', display: 'block', marginBottom: 4 }}>
                    Your email <span style={{ fontWeight: 400 }}>(optional — if you want a reply)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%', border: '1px solid #e2dcc9', borderRadius: 8,
                      padding: '8px 10px', fontSize: 12, background: '#f7f4ec',
                      color: '#1c2333', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {status === 'error' && (
                  <div style={{ fontSize: 11, color: '#cc4444', marginBottom: 8 }}>
                    Something went wrong. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  style={{
                    width: '100%', background: '#3a63b8', color: 'white',
                    border: 'none', borderRadius: 8, padding: '10px',
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
