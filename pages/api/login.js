import { loginPortalAccount } from '../../lib/apex27-portal.js';
import { applyApiHeaders, handlePreflight } from '../../lib/api-helpers.js';
import { clearSession, writeSession } from '../../lib/session.js';

export default async function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['POST'] });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await loginPortalAccount({ email, password });
    const token = result?.token || result?.data?.token || null;
    let contact = result?.contact || result?.data?.contact || result?.data || null;

    const contactId =
      contact?.id ||
      contact?.contactId ||
      contact?.contactID ||
      result?.contactId ||
      result?.contactID ||
      result?.id ||
      result?.data?.contactId ||
      result?.data?.contactID ||
      null;

    if (!contact && contactId) {
      contact = { contactId };
    }

    if (!contactId) {
      res.status(502).json({ error: 'Login failed' });
      return;
    }

    try {
      writeSession(res, { contactId, token: token || null, email });
    } catch (sessionError) {
      console.error('Failed to persist session during login', sessionError);
      clearSession(res);
    }

    res.status(200).json({ ok: true, contact, token: token || null });
  } catch (err) {
    console.error('Failed to authenticate contact', err);
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(502).json({ error: message });
  }
}

