import { listMaintenanceTasksForAdmin } from '../../../../lib/maintenance-admin.mjs';
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

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const tasks = await listMaintenanceTasksForAdmin();
      res.status(200).json({ tasks });
      return;
    } catch (error) {
      console.error('Failed to fetch maintenance tasks for admin', error);
      res.status(200).json({ tasks: [], error: 'Failed to fetch maintenance tasks' });
      return;
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD']);
  res.status(405).end('Method Not Allowed');
}
