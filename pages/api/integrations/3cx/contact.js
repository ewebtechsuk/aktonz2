import { applyApiHeaders, handlePreflight } from '../../../../lib/api-helpers.js';
import { lookupContactByPhone } from '../../../../lib/apex27-portal.js';


const SECRET_HEADER = 'x-3cx-secret';

function readHeaderValue(req, name) {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function readAuthToken(req) {
  const headerToken = readHeaderValue(req, SECRET_HEADER);
  if (headerToken) {
    return String(headerToken).trim();
  }

  const authorization = readHeaderValue(req, 'authorization');
  if (!authorization) {
    return null;
  }

  const trimmed = String(authorization).trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }

  return trimmed || null;
}

function normalisePhoneDigits(value) {
  if (value == null) {
    return null;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  const digits = stringValue.replace(/\D+/g, '');
  if (!digits) {
    return null;
  }

  if (stringValue.startsWith('+')) {
    return `+${digits}`;
  }

  return digits;
}

function firstQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['GET'] });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const configuredSecret = process.env.THREECX_WEBHOOK_SECRET;
  if (!configuredSecret) {
    res.status(500).json({ error: '3CX integration is not configured' });
    return;
  }

  const providedSecret = readAuthToken(req);
  if (!providedSecret || providedSecret !== configuredSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const rawPhone = firstQueryValue(req.query.phone);
  const rawCountryCode = firstQueryValue(req.query.countryCode);

  const normalisedPhone = normalisePhoneDigits(rawPhone);
  if (!normalisedPhone && (!rawPhone || !String(rawPhone).trim())) {

    res.status(400).json({ error: 'Missing or invalid phone query parameter' });
    return;
  }

  const normalisedCountryCode = rawCountryCode == null ? null : String(rawCountryCode).trim() || null;

  let contact = null;
  try {
    contact = await lookupContactByPhone({
      phone: normalisedPhone ?? rawPhone,
      countryCode: normalisedCountryCode,
    });

  } catch (err) {
    console.error('Failed to query Apex27 contact by phone', err);
    res.status(502).json({ error: 'Failed to lookup contact' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  res.status(200).json({ contact });

}
