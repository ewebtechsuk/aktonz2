import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMailGraph } from '../../lib/ms-graph';
import { addOffer } from '../../lib/offers.js';

type FormBody = {
  name?: string;
  email?: string;
  phone?: string;
  offerAmount?: string | number;
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

function normaliseString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

type ValidatedOffer = {
  propertyId: string;
  propertyTitle?: string;
  offerAmount: number;
  frequency?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  depositAmount?: string | number;
};

function validateBody(body: FormBody): { data?: ValidatedOffer; errors?: string[] } {
  const errors: string[] = [];

  const propertyId = normaliseString(body.propertyId);
  if (!propertyId) {
    errors.push('Property reference is required.');
  }

  const offerAmount = toNumber(body.offerAmount);
  if (offerAmount === null || offerAmount <= 0) {
    errors.push('Offer amount must be a positive number.');
  }

  const name = normaliseString(body.name);
  if (!name) {
    errors.push('Name is required.');
  }

  const email = normaliseString(body.email);
  if (!email) {
    errors.push('Email is required.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const frequency = normaliseString(body.frequency);
  const propertyTitle = normaliseString(body.propertyTitle);
  const phone = normaliseString(body.phone);
  const message = normaliseString(body.message);

  return {
    data: {
      propertyId,
      propertyTitle,
      offerAmount: offerAmount!,
      frequency: frequency || undefined,
      name: name!,
      email: email!,
      phone: phone || undefined,
      message: message || undefined,
      depositAmount: body.depositAmount,
    },
  };
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

function resolveSubject(body: FormBody): string {
  if (body.propertyId) {
    return `Offer for ${body.propertyId}: ${hasValue(body.offerAmount) ? formatCurrency(body.offerAmount) : 'N/A'}`;
  }

  return SUBJECT;
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
    const { data, errors } = validateBody(body);
    if (!data || errors) {
      res.status(400).json({
        error: 'Invalid request body',
        details: errors,
      });
      return;
    }

    const offer = await addOffer({
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      offerAmount: data.offerAmount,
      frequency: data.frequency,
      name: data.name,
      email: data.email,
      depositAmount: data.depositAmount,
    });

    const emailBody: FormBody = {
      ...body,
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      offerAmount: offer.price ?? data.offerAmount,
      frequency: data.frequency,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      depositAmount: offer.depositAmount,
    };

    await sendMailGraph({
      subject: resolveSubject(emailBody),
      html: buildHtml(emailBody),
      to: RECIPIENTS,
      replyTo: resolveReplyTo(data.email),
    });

    res.status(200).json({ offer });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}
