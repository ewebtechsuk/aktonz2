import nodemailer from 'nodemailer';

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

  const { name, email, phone, date, time, propertyTitle } = req.body || {};
  if (!email || !propertyTitle) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    if (process.env.APEX27_API_KEY) {
      await fetch('https://api.apex27.co.uk/viewings', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.APEX27_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          property: propertyTitle,
          date,
          time,
        }),
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.FROM_EMAIL || 'no-reply@aktonz.com';

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Welcome to Aktonz',
      text: `Hi ${name || ''}, welcome to Aktonz!`,
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Viewing request received',
      text: `We have received your request to view ${propertyTitle} on ${date} at ${time}. We'll be in touch soon.`,
    });

    await transporter.sendMail({
      from,
      to: 'info@aktonz.com',
      subject: 'New viewing request',
      text: `${name || 'Someone'} has requested a viewing for ${propertyTitle} on ${date} at ${time}. Contact: ${email} ${phone || ''}`,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to book viewing', err);
    res.status(500).json({ error: 'Failed to book viewing' });
  }
}
