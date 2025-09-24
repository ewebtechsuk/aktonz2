import nodemailer from 'nodemailer';

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

  const { propertyId, propertyTitle, price, frequency, name, email } = req.body || {};

  if (!propertyId || !price || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const aktonz = process.env.AKTONZ_EMAIL || 'info@aktonz.com';

    await transporter.sendMail({
      to: aktonz,
      from,
      subject: `New offer for ${propertyTitle}`,
      text: `${name} <${email}> offered £${price} ${frequency} for property ${propertyId}.`,
    });

    await transporter.sendMail({
      to: email,
      from,
      subject: 'We received your offer',
      text: `Thank you for your offer on ${propertyTitle}.`,
    });
  } catch (err) {
    console.error('Failed to send email notifications', err);
  }

  return res.status(200).json({ ok: true });
}
