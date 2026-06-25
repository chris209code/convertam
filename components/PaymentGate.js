'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

const PAYSTACK_PUBLIC_KEY = 'pk_test_d0ce0abc4daa9a22429362cdc4457fff2b5dbffd';

function detectCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language || '';
    if (tz.startsWith('Africa/Lagos') || tz.startsWith('Africa/Abuja') || lang.includes('en-NG')) {
      return 'NGN';
    }
  } catch {}
  return 'USD';
}

function formatPrice(currency) {
  return currency === 'NGN' ? '₦500' : '$1.00';
}

function getAmount(currency) {
  return currency === 'NGN' ? 50000 : 100; // kobo / cents
}

export default function PaymentGate({ children, toolName }) {
  const [paid, setPaid] = useState(false);
  const [currency, setCurrency] = useState('NGN');
  const [paystackReady, setPaystackReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrency(detectCurrency());
    const sessionKey = `convertam_paid_${toolName}`;
    if (sessionStorage.getItem(sessionKey) === 'true') {
      setPaid(true);
    }
  }, [toolName]);

  function handlePay() {
    if (!window.PaystackPop) {
      setError('Payment system still loading. Please wait a moment and try again.');
      return;
    }
    setError('');

    const email = `user_${Date.now()}@convertam.app`;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: getAmount(currency),
      currency,
      metadata: { tool: toolName },
      callback: async (response) => {
        setVerifying(true);
        try {
          const res = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference }),
          });
          const data = await res.json();

          if (data.verified) {
            sessionStorage.setItem(`convertam_paid_${toolName}`, 'true');
            setPaid(true);
          } else {
            setError(data.error || 'Payment verification failed. Please contact support.');
          }
        } catch {
          setError('Could not verify payment. Please try again.');
        } finally {
          setVerifying(false);
        }
      },
      onClose: () => {
        setError('Payment was cancelled.');
      },
    });

    handler.openIframe();
  }

  if (paid) {
    return <>{children}</>;
  }

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        onLoad={() => setPaystackReady(true)}
      />

      <div className="panel text-center py-10">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-display text-xl font-bold mb-2">One-time payment required</h2>
        <p className="text-ink-soft text-sm max-w-sm mx-auto mb-6">
          This conversion tool requires a small fee per use. Your file is processed securely and deleted immediately after download.
        </p>

        <div
          className="inline-block rounded-2xl px-8 py-4 mb-6"
          style={{ background: '#f0f5ff', border: '2px solid #3a63b8' }}
        >
          <div className="text-4xl font-bold font-display" style={{ color: '#3a63b8' }}>
            {formatPrice(currency)}
          </div>
          <div className="text-xs text-ink-soft mt-1">per conversion · secure payment</div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            className="btn btn-primary px-10 py-3 text-base"
            onClick={handlePay}
            disabled={!paystackReady || verifying}
          >
            {verifying ? 'Verifying payment…' : paystackReady ? `Pay ${formatPrice(currency)} & Convert` : 'Loading payment…'}
          </button>

          {error && <div className="status error">{error}</div>}

          <div className="flex items-center gap-4 mt-2 text-xs text-ink-soft">
            <span>🔒 Secured by Paystack</span>
            <span>💳 Cards, Bank Transfer, USSD</span>
          </div>
        </div>

        <p className="text-xs text-ink-soft mt-6 max-w-xs mx-auto">
          Payment is per conversion. Your browser remembers your payment for this session — no account needed.
        </p>
      </div>
    </>
  );
}
