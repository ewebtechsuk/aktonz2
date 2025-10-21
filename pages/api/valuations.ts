import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMailGraph } from '../../lib/ms-graph';
import { verifyVapiSecret } from '../../lib/verifyVapiSecret';

type FormBody = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string;
  address?: string;
  message?: string;
  notes?: string;
  details?: string;
  [key: string]: unknown;
};

const RECIPIENTS = ['valuations@aktonz.com'];
const FORM_TITLE = 'Valuation request';
const SUBJECT = 'aktonz.com valuation form';

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

function resolveName(body: FormBody): string {
  if (typeof body.name === 'string' && body.name.trim() !== '') {
    return body.name;
  }

  const parts = [body.firstName, body.lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '');

  return parts.join(' ');
}

function resolvePropertyAddress(body: FormBody): string {
  const candidates = [body.propertyAddress, body.address];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return '';
}

function resolveMessage(body: FormBody): string {
  const candidates = [body.message, body.notes, body.details];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return '';
}

function formatLabel(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  if (spaced === '') {
    return key;
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function normaliseLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildHtml(body: FormBody): string {
  const rows: Array<[string, unknown]> = [];
  const seenLabels = new Set<string>();

  const addRow = (label: string, value: unknown) => {
    if (label.trim() === '') {
      return;
    }

    const normalised = normaliseLabel(label);
    if (normalised !== '' && seenLabels.has(normalised)) {
      return;
    }

    if (normalised !== '') {
      seenLabels.add(normalised);
    }

    rows.push([label, value ?? '']);
  };

  addRow('Name', resolveName(body));
  addRow('Email', body.email ?? '');
  addRow('Phone', body.phone ?? '');
  addRow('Property address', resolvePropertyAddress(body));
  addRow('Message', resolveMessage(body));

  const excludedKeys = new Set([
    'name',
    'firstName',
    'lastName',
    'email',
    'phone',
    'propertyAddress',
    'address',
    'message',
    'notes',
    'details',
  ]);

  Object.entries(body)
    .filter(([key]) => !excludedKeys.has(key))
    .forEach(([key, value]) => {
      const label = formatLabel(key);
      addRow(label, value);
    });

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 8px;background:#f7f7f7;border:1px solid #ddd;">${escapeHtml(
          label,
        )}</th><td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `
    <h2 style="font-family:Arial,sans-serif;">${escapeHtml(FORM_TITLE)}</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${htmlRows}</table>
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
  if (!verifyVapiSecret(req, res)) {
    return;
  }

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

  const simulateParam = Array.isArray(req.query.__simulate)
    ? req.query.__simulate[0]
    : req.query.__simulate;

  if (process.env.NODE_ENV !== 'production' && typeof simulateParam === 'string') {
    if (simulateParam === 'outage') {
      res.status(202).json({
        ok: true,
        delivered: false,
        reason: 'simulated_outage',
        result: {
          notifications: [
            {
              channel: 'email',
              delivered: false,
              reason: 'simulated_outage',
            },
          ],
        },
      });
      return;
    }

    if (simulateParam === 'delivered') {
      res.status(200).json({
        ok: true,
        delivered: true,
        result: {
          notifications: [
            {
              channel: 'email',
              delivered: true,
            },
          ],
        },
      });
      return;
    }
  }

  try {
    await sendMailGraph({
      subject: SUBJECT,
      html: buildHtml(body),
      to: RECIPIENTS,
      replyTo: resolveReplyTo(body.email),
    });

    res.status(200).json({
      ok: true,
      delivered: true,
      result: {
        notifications: [
          {
            channel: 'email',
            delivered: true,
          },
        ],
      },
    });
  } catch (error) {
    if (isGraphConnectorNotConfiguredError(error)) {
      console.warn('Valuation email skipped: Microsoft Graph connector not configured.');
      res.status(202).json({
        ok: true,
        delivered: false,
        reason: 'graph_not_configured',
        result: {
          notifications: [
            {
              channel: 'email',
              delivered: false,
              reason: 'graph_not_configured',
            },
          ],
        },
      });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}

function isGraphConnectorNotConfiguredError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('microsoft graph connector is not yet configured') ||
    message.includes('not_connected') ||
    message.includes('missing_ms_config')
  );
}
