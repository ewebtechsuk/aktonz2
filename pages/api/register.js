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
    const apiKey = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY;
    const branchId = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID;
    if (!apiKey) {
      // In environments without a configured API key we treat registration as
      // successful to avoid server errors on static deployments.
      res.status(200).json({ ok: true });
      return;
    }

    const body = { email };
    if (branchId) {
      body.branchId = branchId;
    }

    const response = await fetch('https://api.apex27.co.uk/contacts', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (_) {}
      res
        .status(response.status)
        .json({ error: data.error || data.message || 'Failed to register' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to register contact', err);
    res.status(500).json({ error: 'Failed to register' });
  }
}
