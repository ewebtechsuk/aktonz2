import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMailGraph } from '../../lib/ms-graph';

type FormBody = {
  name?: string;
  email?: string;
  phone?: string;
  offerAmount?: string;
  propertyId?: string;
  message?: string;
  propertyTitle?: string;
  frequency?: string;
  depositAmount?: string | number;
  [key: string]: unknown;
};

const RECIPIENTS = ['info@aktonz.com'];
const FORM_TITLE = 'Offer submission';
const SUBJECT = 'aktonz.com offer submission';

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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatCurrency(value: unknown): string {
  const numeric = toNumber(value);
  if (numeric === null) {
    return String(value ?? '');
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(numeric);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}

function buildHtml(body: FormBody): string {
  const rows: Array<[string, unknown]> = [
    ['Name', body.name ?? ''],
    ['Email', body.email ?? ''],
  ];

  if (hasValue(body.phone)) {
    rows.push(['Phone', body.phone ?? '']);
  }

  if (hasValue(body.offerAmount)) {
    rows.push(['Offer amount', formatCurrency(body.offerAmount)]);
  }

  if (hasValue(body.frequency)) {
    rows.push(['Offer frequency', body.frequency ?? '']);
  }

  if (hasValue(body.depositAmount)) {
    rows.push(['Holding deposit', formatCurrency(body.depositAmount)]);
  }

  if (hasValue(body.propertyTitle)) {
    rows.push(['Property title', body.propertyTitle ?? '']);
  }

  rows.push(['Property ID', body.propertyId ?? '']);

  if (hasValue(body.message)) {
    rows.push(['Message', body.message ?? '']);
  }

  const additionalRows = Object.entries(body)
    .filter(
      ([key]) =>
        ![
          'name',
          'email',
          'phone',
          'offerAmount',
          'propertyId',
          'message',
          'propertyTitle',
          'frequency',
          'depositAmount',
        ].includes(key)
    )
    .map(([key, value]) => [key, value]);

  const allRows = [...rows, ...additionalRows]
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 8px;background:#f7f7f7;border:1px solid #ddd;">${escapeHtml(
          label,
        )}</th><td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `
    <h2 style="font-family:Arial,sans-serif;">${escapeHtml(FORM_TITLE)}</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${allRows}</table>
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
      subject: SUBJECT,
      html: buildHtml(body),
      to: RECIPIENTS,
      replyTo: resolveReplyTo(body.email),
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}
