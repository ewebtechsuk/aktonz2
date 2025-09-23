import { loginPortalAccount, registerPortalAccount } from '../../lib/apex27-portal.js';
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
    let contact = registration?.contact || registration || null;

    try {
      const loginResult = await loginPortalAccount({ email, password });
      token = loginResult?.token || loginResult?.data?.token || null;
      contact =
        loginResult?.contact ||
        loginResult?.data?.contact ||
        contact ||
        loginResult?.data ||
        loginResult ||
        null;
    } catch (loginError) {
      console.warn('Registration succeeded but login failed', loginError);
    }

    const contactId =
      contact?.id ||
      contact?.contactId ||
      contact?.contactID ||
      registration?.contactId ||
      registration?.contactID ||
      registration?.id ||
      token?.contactId ||
      null;

    if (contactId) {
      try {
        writeSession(res, { contactId, token: token || null, email });
      } catch (sessionError) {
        console.error('Failed to persist session after registration', sessionError);
        clearSession(res);
      }
    }

    const responseContact = contact || (contactId ? { contactId } : null);
    res.status(200).json({ ok: true, contact: responseContact, token: token || null });
  } catch (err) {
    console.error('Failed to register contact', err);
    const message = err instanceof Error ? err.message : 'Failed to register';
    res.status(502).json({ error: message });
  }
}
