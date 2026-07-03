export const runtime = 'nodejs';

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

    return Response.json({
      verified: true,
      token: transaction.reference,
      currency: transaction.currency,
      amount: transaction.amount,
    });

  } catch (err) {
    console.error('Payment verify error:', err);
    return Response.json({ error: 'Something went wrong verifying payment.' }, { status: 500 });
  }
}
