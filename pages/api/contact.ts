import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMailGraph } from '../../lib/ms-graph';

type FormBody = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  [key: string]: unknown;
};

const RECIPIENTS = ['info@aktonz.com'];

function normaliseBody(req: NextApiRequest): FormBody {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as FormBody;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  return req.body as FormBody;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(body: FormBody): string {
  const baseRows = [
    ['Name', body.name ?? ''],
    ['Email', body.email ?? ''],
    ['Phone', body.phone ?? ''],
    ['Message', body.message ?? ''],
  ];

  const additionalRows = Object.entries(body)
    .filter(([key]) => !['name', 'email', 'phone', 'message'].includes(key))
    .map(([key, value]) => [key, value]);

  const rows = [...baseRows, ...additionalRows]
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 8px;background:#f7f7f7;border:1px solid #ddd;">${escapeHtml(
          label,
        )}</th><td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `
    <h2 style="font-family:Arial,sans-serif;">New contact form submission</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${rows}</table>
  `;
}

function resolveReplyTo(email: unknown): string | undefined {
  if (typeof email !== 'string') {
    return undefined;
  }

  const trimmed = email.trim();
  return trimmed.includes('@') ? trimmed : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body: FormBody;

  try {
    body = normaliseBody(req);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request body' });
    return;
  }

  try {
    await sendMailGraph({
      subject: 'aktonz.com contact form',
      html: buildHtml(body),
      to: RECIPIENTS,
      replyTo: resolveReplyTo(body.email),
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}
