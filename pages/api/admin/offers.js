import { listOffers, updateOffer } from '../../../lib/offers.js';

function authorize(req, res) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Admin token is not configured.' });
    return false;
  }

  const header = req.headers.authorization || '';
  const provided = header.replace(/^Bearer\s+/i, '').trim();

  if (!provided || provided !== token) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end('Method Not Allowed');
  }

  if (!authorize(req, res)) return;

  if (req.method === 'GET') {
    const offers = await listOffers();
    return res.status(200).json({ offers });
  }

  const { id, status, paymentStatus, notes } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Missing offer id' });
  }

  const updates = {};
  if (status) updates.status = status;
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (typeof notes === 'string') updates.notes = notes;

  const offer = await updateOffer(id, updates);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  return res.status(200).json({ offer });
}
