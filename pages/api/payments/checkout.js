import Stripe from 'stripe';
import {
  getOfferById,
  upsertOfferPayment,
  updateOffer,
} from '../../../lib/offers.js';

function resolveSiteUrl(req) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return res.status(500).json({ error: 'Stripe is not configured.' });
  }

  const { offerId } = req.body || {};
  if (!offerId) {
    return res.status(400).json({ error: 'Missing offer id' });
  }

  const offer = await getOfferById(offerId);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const amount = Math.round(Number(offer.depositAmount || 0) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Deposit amount must be greater than zero.' });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });

  const siteUrl = resolveSiteUrl(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: offer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amount,
            product_data: {
              name: `Holding deposit for ${offer.propertyTitle || 'property'}`,
              description: `Offer reference ${offer.id}`,
            },
          },
        },
      ],
      metadata: {
        offerId: offer.id,
        propertyId: offer.propertyId,
      },
      success_url: `${siteUrl}/offers/${offer.id}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/offers/${offer.id}/payment-cancelled`,
    });

    await upsertOfferPayment(offer.id, {
      provider: 'stripe',
      sessionId: session.id,
      status: session.payment_status,
      amount,
      currency: session.currency,
      checkoutUrl: session.url,
    });

    await updateOffer(offer.id, {
      paymentStatus: session.payment_status || 'pending',
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Failed to create Stripe Checkout session', error);
    return res.status(500).json({ error: 'Unable to start payment session.' });
  }
}
