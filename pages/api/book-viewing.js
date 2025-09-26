import {
  createSmtpTransport,
  getNotificationRecipients,
  resolveFromAddress,
  sendMailOrThrow,
} from '../../lib/mailer.mjs';


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ status: 'ready' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    name,
    email,
    phone,
    date,
    time,
    propertyId,
    propertyTitle,
  } = req.body || {};
  if (!email || !propertyId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    if (process.env.APEX27_API_KEY) {
      await fetch(`https://api.apex27.co.uk/listings/${propertyId}/viewings`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.APEX27_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ name, email, phone, date, time }),
      });
    }

    const transporter = createSmtpTransport();
    const from = resolveFromAddress();
    const aktonzRecipients = getNotificationRecipients();


    await sendMailOrThrow(
      transporter,
      {
        from,
        to: email,
        subject: 'Welcome to Aktonz',
        text: `Hi ${name || ''}, welcome to Aktonz!`,
      },
      { context: 'viewing:welcome', expectedRecipients: [email] }
    );

    await sendMailOrThrow(
      transporter,
      {
        from,
        to: email,
        subject: 'Viewing request received',
        text: `We have received your request to view ${propertyTitle} on ${date} at ${time}. We'll be in touch soon.`,
      },
      { context: 'viewing:confirmation', expectedRecipients: [email] }
    );

    await sendMailOrThrow(
      transporter,
      {
        from,
        to: aktonzRecipients,
        replyTo: email,
        subject: 'New viewing request',
        text: `${
          name || 'Someone'
        } has requested a viewing for ${propertyTitle} on ${date} at ${time}. Contact: ${email} ${
          phone || ''
        }`,
      },
      { context: 'viewing:internal', expectedRecipients: aktonzRecipients }
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    if (err?.code === 'SMTP_CONFIG_MISSING') {
      console.error('SMTP configuration missing for viewing route', err.missing);
      res.status(500).json({ error: 'Email service is not configured.' });
      return;
    }

    if (err?.code === 'SMTP_DELIVERY_FAILED') {
      console.error('SMTP rejected viewing request notification', err.missing, err.info);
      res.status(502).json({ error: 'Email delivery failed.' });
      return;
    }


    console.error('Failed to book viewing', err);
    res.status(500).json({ error: 'Failed to book viewing' });
  }
}
