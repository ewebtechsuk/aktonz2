import { resolvePortalContact } from '../../../lib/apex27-portal.js';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers.js';
import { readSession } from '../../../lib/session.js';

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

  const session = readSession(req);
  if (!session?.contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const resolved = await resolvePortalContact({
      contactId: session.contactId,
      token: session.token || null,
      email: session.email || null,
    });

    const contact = resolved.contact || { contactId: resolved.contactId || session.contactId };
    const email = resolved.email || session.email || contact?.email || null;

    res.status(200).json({ contact, email });
  } catch (err) {
    console.error('Failed to load Apex27 profile', err);
    const message = err instanceof Error ? err.message : 'Failed to load profile';
    res.status(502).json({ error: message });
  }
}

