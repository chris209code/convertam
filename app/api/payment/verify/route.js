export const runtime = 'nodejs';

import { ensurePaymentVerified } from '@/lib/paymentIdempotency';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function POST(request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { error: 'Payment system not configured yet.' },
      { status: 500 }
    );
  }
  try {
    const { reference } = await request.json();
    if (!reference) {
      return Response.json({ error: 'Missing payment reference.' }, { status: 400 });
    }

    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return Response.json({ error: 'Could not verify payment.' }, { status: 502 });
    }

    const transaction = data.data;

    if (transaction.status !== 'success') {
      return Response.json({ error: 'Payment was not completed.' }, { status: 402 });
    }

    // Registers this reference in the idempotency store so /api/convert/start
    // can later refuse to create more than one CloudConvert job for it — see
    // lib/paymentIdempotency.js. If this reference was already verified
    // before (a replayed verify call), this does NOT reset an already-
    // consumed/completed record back to "verified".
    const record = await ensurePaymentVerified(transaction.reference);

    return Response.json({
      verified: true,
      token: transaction.reference,
      currency: transaction.currency,
      amount: transaction.amount,
      // Lets the client recognize immediately that this exact reference
      // already produced a completed conversion (e.g. a stale reference
      // somehow reused) without needing to attempt /api/convert/start first.
      alreadyCompleted: record?.status === 'completed' ? record.result : null,
    });

  } catch (err) {
    console.error('Payment verify error:', err);
    return Response.json({ error: 'Something went wrong verifying payment.' }, { status: 500 });
  }
}
