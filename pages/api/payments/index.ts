import type { NextApiRequest, NextApiResponse } from 'next';

import {
  PaymentSession,
  createPaymentSession,
  listPaymentSessions,
} from '../../../lib/landlordServices/payments';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(listPaymentSessions());
  }

  if (req.method === 'POST') {
    const { bookingId, amount, currency, serviceName, customerEmail } =
      req.body || {};

    if (!bookingId || !amount) {
      return res
        .status(400)
        .json({ error: 'bookingId and amount are required for payments' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const session: PaymentSession = createPaymentSession({
      bookingId,
      amount: numericAmount,
      currency,
      serviceName,
      customerEmail,
    });

    return res.status(200).json(session);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
