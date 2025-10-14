import type { NextApiRequest, NextApiResponse } from 'next';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers';
import { appendLandlordEnquiry } from '../../../lib/chatbot-storage';

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

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return Math.trunc(numeric);
    }
  }

  return null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  applyApiHeaders(req, res, { methods: ['POST'] as const });
  if (handlePreflight(req, res)) {
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
  const source = normalizeText(body.source) ?? 'chat-widget';
  const propertyAddress = normalizeText(body.propertyAddress) ?? normalizeText(body.address);
  const propertyType = normalizeText(body.propertyType);
  const bedrooms = parseInteger(body.bedrooms);
  const expectedRent = parseInteger(body.expectedRent ?? body.rent);
  const availableFrom = parseDate(body.availableFrom ?? body.availability);
  const notes = normalizeText(body.notes ?? body.additionalInfo ?? body.message);

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  try {
    const record = await appendLandlordEnquiry({
      name,
      email,
      phone: phone ?? null,
      source,
      propertyAddress,
      propertyType,
      bedrooms,
      expectedRent,
      availableFrom,
      notes,
    });

    res.status(200).json({ ok: true, record });
  } catch (error) {
    console.error('Failed to store landlord enquiry', error);
    res.status(500).json({ error: 'Failed to store landlord enquiry' });
  }
}
