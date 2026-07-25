'use client';

import { useState, useEffect } from 'react';

export default function OwnerAccessClient() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isOwner, setIsOwner] = useState(null); // null = checking, true/false once known

  useEffect(() => {
    fetch('/api/owner-login')
      .then((r) => r.json())
      .then((d) => setIsOwner(!!d.isOwner))
      .catch(() => setIsOwner(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/owner-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify password.');
      setIsOwner(true);
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch('/api/owner-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setIsOwner(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Owner Testing Mode</p>
        <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 24 }}>Private access — not linked from the site.</p>

        {isOwner === null && <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Checking status…</p>}

        {isOwner === true && (
          <div>
            <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #C9F1DE', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', margin: 0 }}>✓ Owner Testing Mode is active</p>
              <p style={{ fontSize: '0.78rem', color: '#475569', margin: '4px 0 0' }}>Convertam's report limit is disabled. Gemini provider quota still applies.</p>
            </div>
            <button onClick={handleLogout} disabled={busy} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Working…' : 'Exit Owner Testing Mode'}
            </button>
          </div>
        )}

        {isOwner === false && (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Owner password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem', marginBottom: 12, outline: 'none' }}
              autoFocus
            />
            {error && <p style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={busy || !password} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Verifying…' : 'Enter Owner Testing Mode'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
