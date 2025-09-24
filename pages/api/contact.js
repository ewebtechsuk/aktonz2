import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
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
      subject: `New enquiry from ${name}`,
      text: `${name} <${email}> says: ${message}`,
    });

    await transporter.sendMail({
      to: email,
      from,
      subject: 'We received your message',
      text: 'Thank you for contacting us. We will be in touch soon.',
    });
  } catch (err) {
    console.error('Failed to send enquiry emails', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }

  return res.status(200).json({ ok: true });
}
