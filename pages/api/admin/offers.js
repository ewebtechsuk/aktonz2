import { listOffersForAdmin } from '../../../lib/offers-admin.mjs';

export default function handler(req, res) {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const offers = listOffersForAdmin();
      return res.status(200).json({ offers });
    } catch (error) {
      console.error('Failed to list offers for admin', error);
      return res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
