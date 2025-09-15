export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');


  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }

  try {
    if (process.env.APEX27_API_KEY) {
      const body = { email };
      if (process.env.APEX27_BRANCH_ID) {
        body.branchId = process.env.APEX27_BRANCH_ID;
      }
      await fetch('https://api.apex27.co.uk/contacts', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.APEX27_API_KEY,
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to register contact', err);
    res.status(500).json({ error: 'Failed to register' });
  }
}
