import type { NextApiRequest, NextApiResponse } from 'next';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers';
import { appendChatbotViewing } from '../../../lib/chatbot-storage';
import { sendMailGraph } from '../../../lib/ms-graph';
import { verifyVapiSecret } from '../../../lib/verifyVapiSecret';

const RECIPIENTS = ['info@aktonz.com'];
const SUBJECT = 'Chatbot viewing request';

function parseBody(req: NextApiRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  return {};
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

function buildHtml(payload: {
  name: string;
  email: string;
  phone?: string | null;
  propertyTitle: string;
  propertyAddress?: string | null;
  propertyLink?: string | null;
  transactionType?: string | null;
  scheduledAt: string;
}): string {
  const rows = [
    ['Name', payload.name],
    ['Email', payload.email],
    ['Phone', payload.phone ?? ''],
    ['Property', payload.propertyTitle],
    ['Address', payload.propertyAddress ?? ''],
    ['Transaction type', payload.transactionType ?? ''],
    ['Scheduled for', formatDate(payload.scheduledAt)],
    ['Link', payload.propertyLink ?? ''],
  ];

  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;">${label}</th>` +
        `<td style="padding:6px 10px;border:1px solid #e2e8f0;">${value ?? ''}</td></tr>`,
    )
    .join('');

  return `
    <h2 style="font-family:Arial,sans-serif;color:#0f172a;">New chatbot viewing request</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${cells}</table>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  applyApiHeaders(req, res, { methods: ['POST'] as const });
  if (handlePreflight(req, res)) {
    return;
  }

  if (!verifyVapiSecret(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = parseBody(req);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request body' });
    return;
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const phone = normalizeText(body.phone);
  const propertyTitle = normalizeText(body.propertyTitle);
  const propertyAddress = normalizeText(body.propertyAddress);
  const propertyLink = normalizeText(body.propertyLink);
  const transactionType = normalizeText(body.transactionType);
  const propertyId = normalizeText(body.propertyId);
  const scheduledAtRaw = normalizeText(body.scheduledAt);

  if (!name || !email || !propertyTitle || !scheduledAtRaw) {
    res.status(400).json({ error: 'Name, email, property title and scheduled time are required' });
    return;
  }

  const parsedDate = Date.parse(scheduledAtRaw);
  if (Number.isNaN(parsedDate)) {
    res.status(400).json({ error: 'Invalid scheduledAt value' });
    return;
  }

  const scheduledAt = new Date(parsedDate).toISOString();

  try {
    const record = await appendChatbotViewing({
      propertyId,
      propertyTitle,
      propertyAddress,
      propertyLink,
      transactionType,
      scheduledAt,
      name,
      email,
      phone,
    });

    let emailSent = false;
    try {
      await sendMailGraph({
        subject: SUBJECT,
        html: buildHtml({
          name,
          email,
          phone,
          propertyTitle,
          propertyAddress,
          propertyLink,
          transactionType,
          scheduledAt,
        }),
        to: RECIPIENTS,
      });
      emailSent = true;
    } catch (error) {
      console.error('Failed to dispatch viewing notification email', error);
    }

    res.status(200).json({ ok: true, record, emailSent });
  } catch (error) {
    console.error('Failed to store chatbot viewing', error);
    res.status(500).json({ error: 'Failed to schedule viewing' });
  }
}
