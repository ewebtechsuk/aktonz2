import Stripe from 'stripe';
import {
  getOfferById,
  updateOffer,
  updatePaymentBySession,
} from '../../../lib/offers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return res.status(500).json({ error: 'Stripe is not configured.' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge'],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const offerId = session.metadata?.offerId;
    if (offerId) {
      const paymentStatus = session.payment_status || 'pending';
      const paymentIntentId = session.payment_intent?.id || null;
      const latestCharge = session.payment_intent?.latest_charge;
      const charge =
        latestCharge && typeof latestCharge === 'object' ? latestCharge : null;
      const receiptUrl = charge?.receipt_url || null;

      if (paymentStatus === 'paid') {
        await updatePaymentBySession(session.id, {
          status: 'paid',
          paymentIntentId,
          receiptUrl,
        });
        await updateOffer(offerId, {
          paymentStatus: 'paid',
        });
      } else if (paymentStatus === 'unpaid' || paymentStatus === 'no_payment_required') {
        await updatePaymentBySession(session.id, {
          status: paymentStatus,
          paymentIntentId,
        });
        await updateOffer(offerId, {
          paymentStatus,
        });
      }

      const offer = await getOfferById(offerId);
      return res.status(200).json({ session, offer });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error('Failed to retrieve Stripe session', error);
    return res.status(500).json({ error: 'Failed to retrieve session.' });
  }
}
