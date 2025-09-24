import {
  createSmtpTransport,
  getNotificationRecipients,
  resolveFromAddress,
  sendMailOrThrow,
} from '../../lib/mailer.mjs';
import { addOffer } from '../../lib/offers.js';


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

  const {
    propertyId,
    propertyTitle,
    price,
    frequency,
    name,
    email,
    depositAmount,
  } = req.body || {};

  if (!propertyId || !price || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const offer = await addOffer({
    propertyId,
    propertyTitle,
    price,
    frequency,
    name,
    email,
    depositAmount,
  });

  try {
    if (process.env.APEX27_API_KEY) {
      await fetch('https://api.apex27.co.uk/offers', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.APEX27_API_KEY,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          price,
          frequency,
          buyer: { name, email },
        }),
      });
    }
  } catch (err) {
    console.error('Failed to add offer to Apex27', err);
  }

  try {
    const transporter = createSmtpTransport();
    const from = resolveFromAddress();
    const aktonzRecipients = getNotificationRecipients();
    const frequencyLabel = frequency ? ` ${frequency}` : '';
    const depositNote =
      offer.depositAmount > 0
        ? ` Holding deposit: £${offer.depositAmount}.`
        : '';

    await transporter.sendMail({
      to: aktonzRecipients,
      from,
      subject: `New offer for ${propertyTitle}`,
      text: `${name} <${email}> offered £${price}${frequencyLabel} for property ${propertyId}.${depositNote}`,
    });

    await sendMailOrThrow(
      transporter,
      {
        to: email,
        from,
        subject: 'We received your offer',
        text: `Thank you for your offer on ${propertyTitle}.`,
      },
      { context: 'offers:visitor', expectedRecipients: [email] }
    );
  } catch (err) {
    if (err?.code === 'SMTP_CONFIG_MISSING') {
      console.error('SMTP configuration missing for offers route', err.missing);
      return res
        .status(500)
        .json({ error: 'Email service is not configured.' });
    }


    if (err?.code === 'SMTP_DELIVERY_FAILED') {
      console.error('SMTP rejected offer notification', err.missing, err.info);
      return res
        .status(502)
        .json({ error: 'Email delivery failed.' });
    }


    console.error('Failed to send email notifications', err);
    return res
      .status(500)
      .json({ error: 'Failed to send offer notifications' });
  }

  return res.status(200).json({ ok: true, offer });
}
