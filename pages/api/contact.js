import { createSmtpTransport, resolveFromAddress } from '../../lib/mailer.js';

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
    const transporter = createSmtpTransport();
    const from = resolveFromAddress();
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
    if (err?.code === 'SMTP_CONFIG_MISSING') {
      console.error('SMTP configuration missing for contact form', err.missing);
      return res
        .status(500)
        .json({ error: 'Email service is not configured.' });
    }

    console.error('Failed to send enquiry emails', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }

  return res.status(200).json({ ok: true });
}
