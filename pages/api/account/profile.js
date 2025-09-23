import { fetchPortalProfile, updatePortalProfile } from '../../../lib/apex27-portal.js';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers.js';
import { readSession, writeSession } from '../../../lib/session.js';

export default async function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['GET', 'PUT'] });

  if (handlePreflight(req, res)) {

    return;
  }

  const session = readSession(req);
  if (!session?.contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const profile = await fetchPortalProfile({ token: session.token || null, contactId: session.contactId });
      res.status(200).json({ contact: profile });
    } catch (err) {
      console.error('Failed to load Apex27 profile for editing', err);
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      res.status(502).json({ error: message });
    }
    return;
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const updated = await updatePortalProfile({
      token: session.token || null,
      contactId: session.contactId,
      input: req.body || {},
    });

    if (session.email && req.body?.email && req.body.email !== session.email) {
      // Refresh the session to include the updated email value.
      try {
        writeSession(res, { ...session, email: req.body.email });
      } catch (sessionError) {
        console.warn('Failed to update session email after profile update', sessionError);
      }
    }

    res.status(200).json({ ok: true, contact: updated || null });
  } catch (err) {
    console.error('Failed to update Apex27 profile', err);
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(502).json({ error: message });
  }
}

