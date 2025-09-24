import { createValuationRequest } from '../../lib/acaboom.mjs';
import { createSmtpTransport, resolveFromAddress } from '../../lib/mailer.js';

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ready' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET', 'HEAD']);
    return res.status(405).end('Method Not Allowed');
  }

  const { firstName, lastName, email, phone, address, notes } = req.body || {};

  try {
    const valuation = await createValuationRequest({
      firstName,
      lastName,
      email,
      phone,
      address,
      notes,
      source: 'aktonz.co.uk valuation form',
    });

    try {
      const transporter = createSmtpTransport();
      const from = resolveFromAddress();
      const aktonz = process.env.AKTONZ_VALUATIONS_EMAIL || process.env.AKTONZ_EMAIL || 'valuations@aktonz.com';

      await transporter.sendMail({
        to: aktonz,
        from,
        subject: `New valuation request from ${valuation.firstName} ${valuation.lastName}`,
        text: [
          `${valuation.firstName} ${valuation.lastName} requested a valuation.`,
          '',
          `Email: ${valuation.email}`,
          `Phone: ${valuation.phone}`,
          `Address: ${valuation.address}`,
          valuation.notes ? `Notes: ${valuation.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      });

      await transporter.sendMail({
        to: valuation.email,
        from,
        subject: 'Thanks for booking an Aktonz valuation',
        text:
          'Thanks for booking a valuation with Aktonz. Our valuations team will be in touch shortly to confirm the appointment.',
      });
    } catch (error) {
      if (error?.code === 'SMTP_CONFIG_MISSING') {
        console.error('SMTP configuration missing for valuations route', error.missing);
        return res.status(500).json({ error: 'Email service is not configured.' });
      }

      console.error('Failed to send valuation notifications', error);
      return res.status(500).json({ error: 'Failed to send valuation notifications' });
    }

    return res.status(201).json({ valuation });
  } catch (error) {
    if (error?.code === 'VALUATION_VALIDATION_ERROR') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.error('Failed to store valuation request', error);
    return res.status(500).json({ error: 'Failed to store valuation request' });
  }
}
