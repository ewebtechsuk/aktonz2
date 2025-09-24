import {
  getValuationById,
  updateValuation,
  getValuationStatusOptions,
} from '../../../../lib/acaboom.mjs';
import { listGallerySections } from '../../../../lib/gallery.mjs';

function resolveId(param) {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

export default async function handler(req, res) {
  const valuationId = resolveId(req.query?.id);

  if (!valuationId) {
    return res.status(400).json({ error: 'Valuation id is required' });
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const [valuation, gallerySections] = await Promise.all([
        getValuationById(valuationId),
        listGallerySections(),
      ]);

      if (!valuation) {
        return res.status(404).json({ error: 'Valuation not found' });
      }

      return res.status(200).json({
        valuation,
        statusOptions: getValuationStatusOptions(),
        gallery: {
          sections: gallerySections,
        },
      });
    } catch (error) {
      console.error('Failed to fetch valuation', error);
      return res.status(500).json({ error: 'Failed to fetch valuation' });
    }
  }

  if (req.method === 'PATCH') {
    const {
      status,
      notes,
      appointmentAt,
      presentationId,
      presentationMessage,
    } = req.body || {};

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
      const valuation = await updateValuation(valuationId, {
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
