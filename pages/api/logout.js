import { applyApiHeaders, handlePreflight } from '../../lib/api-helpers.js';
import { clearSession } from '../../lib/session.js';

export default function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['POST'] });

  if (handlePreflight(req, res)) {

    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  clearSession(res);
  res.status(200).json({ ok: true });
}

