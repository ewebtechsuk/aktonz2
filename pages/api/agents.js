import agents from '../../data/agents.json';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (id) {
    const agent = agents.find((a) => String(a.id) === String(id));
    if (agent) {
      res.status(200).json(agent);
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
    return;
  }

  res.status(200).json(agents);
}
