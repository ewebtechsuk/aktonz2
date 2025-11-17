import type { NextApiRequest, NextApiResponse } from 'next';

import { landlordServices } from '../../../data/services/landlordServices';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(landlordServices);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
