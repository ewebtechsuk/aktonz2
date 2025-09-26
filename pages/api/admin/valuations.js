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
