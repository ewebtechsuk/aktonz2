import { loginPortalAccount, registerPortalAccount } from '../../lib/apex27-portal.js';
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
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Missing password' });
    return;
  }

  try {
    const registration = await registerPortalAccount({ email, password });

    let token = null;
    let contact = null;

    try {
      const loginResult = await loginPortalAccount({ email, password });
      token = loginResult?.token || loginResult?.data?.token || null;
      contact = loginResult?.contact || loginResult?.data?.contact || registration?.contact || null;
      if (!contact) {
        contact = registration?.contact || registration || null;
      }
    } catch (loginError) {
      // Registration succeeded but login failed. We still create a session with minimal context.
      contact = registration?.contact || registration || null;
      console.warn('Registration succeeded but login failed', loginError);
    }

    if (contact?.id || contact?.contactId) {
      const contactId = contact.id || contact.contactId;
      try {
        writeSession(res, { contactId, token: token || null, email });
      } catch (sessionError) {
        console.error('Failed to persist session after registration', sessionError);
        clearSession(res);
      }
    }

    res.status(200).json({ ok: true, contact: contact || null, token: token || null });
  } catch (err) {
    console.error('Failed to register contact', err);
    const message = err instanceof Error ? err.message : 'Failed to register';
    res.status(502).json({ error: message });
  }
}
