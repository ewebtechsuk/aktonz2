import { loginPortalAccount, resolvePortalContact } from '../../lib/apex27-portal.js';
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
    const auth = await loginPortalAccount({ email, password });
    const resolved = await resolvePortalContact({
      contact: auth?.contact || null,
      contactId: auth?.contactId || null,
      token: auth?.token || null,
      email: auth?.email || email || null,
    });

    const contactId = resolved.contactId || auth?.contactId || null;
    if (!contactId) {
      res.status(502).json({ error: 'Login failed' });
      return;
    }

    const sessionEmail = resolved.email || auth?.email || email || null;
    const responseContact = resolved.contact || auth?.contact || { contactId };

    try {
      writeSession(res, { contactId, token: auth?.token || null, email: sessionEmail });
    } catch (sessionError) {
      console.error('Failed to persist session during login', sessionError);
      clearSession(res);
      res.status(500).json({ error: 'Unable to persist session' });
      return;
    }

    res.status(200).json({ ok: true, contact: responseContact, token: auth?.token || null, email: sessionEmail });
  } catch (err) {
    console.error('Failed to authenticate contact', err);
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(502).json({ error: message });
  }
}

