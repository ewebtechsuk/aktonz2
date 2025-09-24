import {
  listValuationRequests,
  updateValuationStatus,
  VALUATION_STATUSES,
} from '../../../lib/acaboom.mjs';

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const valuations = await listValuationRequests();
      return res.status(200).json({ valuations, statuses: VALUATION_STATUSES });
    } catch (error) {
      console.error('Failed to list valuations', error);
      return res.status(500).json({ error: 'Failed to fetch valuations' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ error: 'Valuation id and status are required' });
    }

    try {
      const valuation = await updateValuationStatus(id, status);
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

      console.error('Failed to update valuation status', error);
      return res.status(500).json({ error: 'Failed to update valuation status' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
