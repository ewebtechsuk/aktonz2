import { listContacts } from '../../../lib/apex27-portal.js';
import { getAdminFromSession } from '../../../lib/admin-users.mjs';
import { readSession } from '../../../lib/session.js';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function pickFirstString(value) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parsePositiveInteger(value, fallback) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { page, pageSize, name, email, phone } = req.query || {};

    const filters = {
      page: parsePositiveInteger(page, 1),
      pageSize: parsePositiveInteger(pageSize, undefined),
      name: pickFirstString(name),
      email: pickFirstString(email),
      phone: pickFirstString(phone),
    };

    try {
      const result = await listContacts(filters);
      const resolvedPageSize =
        Number.isFinite(result.pageSize) && result.pageSize > 0
          ? result.pageSize
          : filters.pageSize || 25;
      return res.status(200).json({
        contacts: Array.isArray(result.contacts) ? result.contacts : [],
        totalCount: Number.isFinite(result.totalCount) && result.totalCount >= 0 ? result.totalCount : 0,
        pageCount: Number.isFinite(result.pageCount) && result.pageCount >= 0 ? result.pageCount : 0,
        page: Number.isFinite(result.page) && result.page > 0 ? result.page : filters.page || 1,
        pageSize: resolvedPageSize,
        hasNextPage: Boolean(result.hasNextPage),
        hasPreviousPage: Boolean(result.hasPreviousPage),
        filters: {
          name: filters.name || '',
          email: filters.email || '',
          phone: filters.phone || '',
        },
      });
    } catch (error) {
      console.error('Failed to list Apex27 contacts', error);
      return res.status(500).json({ error: 'Failed to load contacts' });
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
