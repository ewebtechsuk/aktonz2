import { loginPortalAccount } from '../../lib/apex27-portal.js';
import { clearSession, writeSession } from '../../lib/session.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
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
    const contact = result?.contact || result?.data?.contact || result?.data || null;

    if (!contact) {
      res.status(502).json({ error: 'Login failed' });
      return;
    }

    const contactId = contact.id || contact.contactId || contact.contactID || null;
    if (contactId) {
      try {
        writeSession(res, { contactId, token: token || null, email });
      } catch (sessionError) {
        console.error('Failed to persist session during login', sessionError);
        clearSession(res);
      }
    }

    res.status(200).json({ ok: true, contact, token: token || null });
  } catch (err) {
    console.error('Failed to authenticate contact', err);
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(502).json({ error: message });
  }
}

