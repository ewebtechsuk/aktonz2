import { createValuationRequest } from '../../lib/acaboom.mjs';
import {
  createSmtpTransport,
  getMissingSmtpConfig,
  resolveFromAddress,
} from '../../lib/mailer.js';

function resolveSiteUrl(req) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

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

  let activationUrl = null;
  let accountUrl = null;
  let notifications = { sent: false };

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

    const siteUrl = resolveSiteUrl(req);
    activationUrl = `${siteUrl}/register?email=${encodeURIComponent(valuation.email)}`;
    accountUrl = `${siteUrl}/account`;

    const missingSmtpConfig = getMissingSmtpConfig();

    if (missingSmtpConfig.length > 0) {
      console.warn(
        'Skipping valuation notification emails due to missing SMTP configuration',
        missingSmtpConfig
      );

      notifications = {
        sent: false,
        reason: 'smtp_configuration_missing',
        missing: missingSmtpConfig,
      };
    } else {
      try {
        const transporter = createSmtpTransport();
        const from = resolveFromAddress();
        const aktonz =
          process.env.AKTONZ_VALUATIONS_EMAIL || process.env.AKTONZ_EMAIL || 'valuations@aktonz.com';

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
          subject: 'Activate your Aktonz account',
          text: [
            `Hi ${valuation.firstName},`,
            '',
            'Thanks for booking a valuation with Aktonz. To access your personalised dashboard and manage your request, please activate your account using the link below.',
            '',
            activationUrl,
            '',
            'Once activated you can review your valuation details at any time:',
            accountUrl,
            '',
            'If you were not expecting this message you can ignore it.',
            '',
            'Aktonz Team',
          ].join('\n'),
        });

        notifications = { sent: true };
      } catch (error) {
        console.error('Failed to send valuation notifications', error);
        return res.status(500).json({ error: 'Failed to send valuation notifications' });
      }
    }

    return res.status(201).json({ valuation, activationUrl, accountUrl, notifications });
  } catch (error) {
    if (error?.code === 'VALUATION_VALIDATION_ERROR') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.error('Failed to store valuation request', error);
    return res.status(500).json({ error: 'Failed to store valuation request' });
  }
}
