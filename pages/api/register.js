import { loginPortalAccount, registerPortalAccount, resolvePortalContact } from '../../lib/apex27-portal.js';

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

    const aggregate = {
      contact: registration?.contact || null,
      contactId: registration?.contactId || null,
      token: registration?.token || null,
      email: registration?.email || email || null,
    };

    try {
      const loginResult = await loginPortalAccount({ email, password });
      if (loginResult?.contact) {
        aggregate.contact = loginResult.contact;
      }
      if (loginResult?.contactId) {
        aggregate.contactId = loginResult.contactId;
      }
      if (loginResult?.token) {
        aggregate.token = loginResult.token;
      }
      if (loginResult?.email) {
        aggregate.email = loginResult.email;
      }

    } catch (loginError) {
      console.warn('Registration succeeded but login failed', loginError);
    }

    const resolved = await resolvePortalContact(aggregate);
    const contactId = resolved.contactId || aggregate.contactId || null;

    if (!contactId) {
      res.status(502).json({ error: 'Failed to register' });
      return;
    }

    const sessionEmail = resolved.email || aggregate.email || email || null;
    const responseContact = resolved.contact || aggregate.contact || { contactId };

    try {
      writeSession(res, { contactId, token: aggregate.token || null, email: sessionEmail });
    } catch (sessionError) {
      console.error('Failed to persist session after registration', sessionError);
      clearSession(res);
      res.status(500).json({ error: 'Unable to persist session' });
      return;
    }

    res.status(200).json({ ok: true, contact: responseContact, token: aggregate.token || null, email: sessionEmail });

  } catch (err) {
    console.error('Failed to register contact', err);
    const message = err instanceof Error ? err.message : 'Failed to register';
    res.status(502).json({ error: message });
  }
}
