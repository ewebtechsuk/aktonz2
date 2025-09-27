import {
  createSmtpTransport,
  getNotificationRecipients,
  resolveFromAddress,
  sendMailOrThrow,
} from '../mailer.mjs';

function setCommonHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, max-age=0, s-maxage=0');
}

function respondJson(res, statusCode, payload) {
  setCommonHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json(payload);
}

export default async function handleContact(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    setCommonHeaders(res);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return respondJson(res, 400, { error: 'Missing required fields' });
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
      return respondJson(res, 500, {
        error: 'Email service is not configured.',
      });
    }

    if (err?.code === 'SMTP_DELIVERY_FAILED') {
      console.error('SMTP rejected contact form message', err.missing, err.info);
      return respondJson(res, 502, { error: 'Email delivery failed.' });
    }

    console.error('Failed to send enquiry emails', err);
    return respondJson(res, 500, { error: 'Failed to send message' });
  }

  return respondJson(res, 200, { ok: true });
}
