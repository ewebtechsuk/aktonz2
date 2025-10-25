import {
  listValuationRequests,
  updateValuation,
  VALUATION_STATUSES,
  getValuationStatusOptions,
} from '../../../lib/acaboom.mjs';
import { getAdminFromSession } from '../../../lib/admin-users.mjs';
import { getGalleryOverview } from '../../../lib/gallery.mjs';
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

function formatDateKey(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildDailyCounts(valuations, days = 14) {
  if (!Array.isArray(valuations) || days <= 0) {
    return [];
  }

  const countsByDay = new Map();
  for (const valuation of valuations) {
    const key = formatDateKey(valuation?.createdAt);
    if (!key) {
      continue;
    }

    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });

  const timeline = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const dayUtc = todayUtc - index * dayMs;
    const date = new Date(dayUtc);
    const key = formatDateKey(date.toISOString());
    const count = countsByDay.get(key) ?? 0;

    timeline.push({
      date: new Date(dayUtc).toISOString(),
      count,
      label: formatter.format(date),
    });
  }

  return timeline;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const [valuations, galleryOverview] = await Promise.all([
        listValuationRequests(),
        getGalleryOverview(),
      ]);

      return res.status(200).json({
        valuations,
        statuses: VALUATION_STATUSES,
        statusOptions: getValuationStatusOptions(),
        dailyCounts: buildDailyCounts(valuations),
        gallery: {
          sections: galleryOverview.sections,
          available: galleryOverview.available,
        },
      });
    } catch (error) {
      console.error('Failed to list valuations', error);
      return res.status(500).json({ error: 'Failed to fetch valuations' });
    }
  }

  if (req.method === 'PATCH') {
    const {
      id,
      status,
      notes,
      appointmentAt,
      presentationId,
      presentationMessage,
    } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Valuation id is required' });
    }

    if (
      !Object.prototype.hasOwnProperty.call(req.body || {}, 'status') &&
      !Object.prototype.hasOwnProperty.call(req.body || {}, 'notes') &&
      !Object.prototype.hasOwnProperty.call(req.body || {}, 'appointmentAt') &&
      !Object.prototype.hasOwnProperty.call(req.body || {}, 'presentationId') &&
      !Object.prototype.hasOwnProperty.call(req.body || {}, 'presentationMessage')
    ) {
      return res.status(400).json({ error: 'No valuation updates provided' });
    }

    try {
      const valuation = await updateValuation(id, {
        status,
        notes,
        appointmentAt,
        presentationId,
        presentationMessage,
      });
      return res.status(200).json({ valuation });
    } catch (error) {
      if (error?.code === 'VALUATION_NOT_FOUND') {
        return res.status(404).json({ error: 'Valuation not found' });
      }

      if (error?.code === 'VALUATION_INVALID_STATUS') {
        return res.status(400).json({ error: 'Invalid valuation status' });
      }

      if (error?.code === 'VALUATION_VALIDATION_ERROR') {
        return res.status(400).json({ error: 'Valuation id is required' });
      }

      if (error?.code === 'VALUATION_PRESENTATION_NOT_FOUND') {
        return res.status(404).json({ error: 'Valuation style not found' });
      }

      if (error?.code === 'VALUATION_PRESENTATION_NOT_SELECTED') {
        return res.status(400).json({ error: 'Select a valuation style before adding a message' });
      }

      console.error('Failed to update valuation', error);
      return res.status(500).json({ error: 'Failed to update valuation' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
