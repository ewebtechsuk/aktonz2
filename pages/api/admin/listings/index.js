import {
  filterLettingsListings,
  getLettingsSummary,
  listLettingsListings,
  serializeListings,
} from '../../../../lib/admin-listings.mjs';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import { readSession } from '../../../../lib/session.js';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function normalizeQueryArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const [listings, summary] = await Promise.all([
      listLettingsListings(),
      getLettingsSummary(),
    ]);

    const view = typeof req.query.view === 'string' ? req.query.view : 'available';
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const statuses = normalizeQueryArray(req.query.status);

    const filtered = filterLettingsListings(listings, { view, statuses, search });

    res.status(200).json({
      listings: serializeListings(filtered),
      summary,
      filters: {
        view,
        search,
        statuses: statuses.map((status) => (typeof status === 'string' ? status : '')).filter(Boolean),
      },
      meta: {
        total: listings.length,
        filtered: filtered.length,
      },
    });
  } catch (error) {
    console.error('Failed to load lettings listings for admin', error);
    res.status(500).json({ error: 'Failed to load lettings listings' });
  }
}
