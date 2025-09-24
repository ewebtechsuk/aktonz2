import {
  createSmtpTransport,
  getNotificationRecipients,
  resolveFromAddress,
  sendMailOrThrow,
} from '../mailer.mjs';

export default async function handleContact(req, res) {
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
    const aktonzRecipients = getNotificationRecipients();

    await sendMailOrThrow(
      transporter,
      {
        to: aktonzRecipients,
        from,
        replyTo: email,
        subject: `New enquiry from ${name}`,
        text: `${name} <${email}> says: ${message}`,
      },
      { context: 'contact:internal', expectedRecipients: aktonzRecipients }
    );

    await sendMailOrThrow(
      transporter,
      {
        to: email,
        from,
        subject: 'We received your message',
        text: 'Thank you for contacting us. We will be in touch soon.',
      },
      { context: 'contact:visitor', expectedRecipients: [email] }
    );
  } catch (err) {
    if (err?.code === 'SMTP_CONFIG_MISSING') {
      console.error('SMTP configuration missing for contact form', err.missing);
      return res
        .status(500)
        .json({ error: 'Email service is not configured.' });
    }

    if (err?.code === 'SMTP_DELIVERY_FAILED') {
      console.error('SMTP rejected contact form message', err.missing, err.info);
      return res.status(502).json({ error: 'Email delivery failed.' });
    }

    console.error('Failed to send enquiry emails', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }

  return res.status(200).json({ ok: true });
}
