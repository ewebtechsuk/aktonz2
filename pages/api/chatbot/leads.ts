import type { NextApiRequest, NextApiResponse } from 'next';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers';
import { appendChatbotLead } from '../../../lib/chatbot-storage';
import type { JsonValue } from '../../../lib/chatbot-storage';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  applyApiHeaders(req, res, { methods: ['POST'] });
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
  const preferences =
    body.preferences && typeof body.preferences === 'object'
      ? (body.preferences as JsonValue)
      : null;
  const properties = Array.isArray(body.properties)
    ? (body.properties as JsonValue)
    : null;

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  try {
    const record = await appendChatbotLead({
      name,
      email,
      phone: phone ?? null,
      source,
      preferences,
      properties,
    });

    res.status(200).json({ ok: true, record });
  } catch (error) {
    console.error('Failed to store chatbot lead', error);
    res.status(500).json({ error: 'Failed to store lead' });
  }
}
