export function applyApiHeaders(req, res, { methods = [] } = {}) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const existingVary = res.getHeader('Vary');
    if (existingVary) {
      const varyValues = new Set(String(existingVary).split(/,\s*/).filter(Boolean));
      varyValues.add('Origin');
      res.setHeader('Vary', Array.from(varyValues).join(', '));
    } else {
      res.setHeader('Vary', 'Origin');
    }
  }

  const allowMethods = new Set(methods.map((method) => method.toUpperCase()));
  allowMethods.add('OPTIONS');

  res.setHeader('Access-Control-Allow-Methods', Array.from(allowMethods).join(','));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
