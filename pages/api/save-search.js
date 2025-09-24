import fs from 'node:fs/promises';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'saved-searches.json');

async function readSearches() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeSearches(data) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const searches = await readSearches();
    return res.status(200).json(searches);
  }

  if (req.method === 'POST') {
    const params = req.body || {};
    const searches = await readSearches();
    const id = Date.now().toString();
    searches.push({ id, params });
    await writeSearches(searches);

    // Placeholder for scheduling a notification job
    console.log('Schedule notification job for search', params);

    return res.status(200).json({ id });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    const searches = await readSearches();
    const filtered = searches.filter((s) => s.id !== id);
    await writeSearches(filtered);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
