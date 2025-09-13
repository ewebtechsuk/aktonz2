import fs from 'fs/promises';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'price-alerts.json');

async function readAlerts() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeAlerts(data) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const alerts = await readAlerts();
    return res.status(200).json(alerts);
  }

  if (req.method === 'POST') {
    const { email, propertyId } = req.body || {};
    if (!email || !propertyId) {
      return res.status(400).json({ error: 'Missing email or propertyId' });
    }
    const alerts = await readAlerts();
    const list = new Set(alerts[propertyId] || []);
    list.add(email);
    alerts[propertyId] = Array.from(list);
    await writeAlerts(alerts);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { email, propertyId } = req.body || {};
    if (!email || !propertyId) {
      return res.status(400).json({ error: 'Missing email or propertyId' });
    }
    const alerts = await readAlerts();
    const list = alerts[propertyId] || [];
    alerts[propertyId] = list.filter((e) => e !== email);
    if (alerts[propertyId].length === 0) {
      delete alerts[propertyId];
    }
    await writeAlerts(alerts);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
