/**
 * Validates inbound VAPI requests against the configured shared secret.
 *
 * The request is authorised when either the legacy `x-aktonz-secret` header or
 * the standard `Authorization: Bearer <token>` header matches the configured
 * secret. When no secret is configured we allow the request so that local test
 * environments continue to function while still logging a warning for
 * visibility.
 *
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 * @returns {boolean}
 */
export function verifyVapiSecret(req, res) {
  const expected = process.env.VAPI_ACCESS_SECRET?.trim();

  if (!expected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Skipping VAPI secret verification because VAPI_ACCESS_SECRET is not set.');
    }
    return true;
  }

  const headerSecret = (req.headers['x-aktonz-secret'] ?? '').toString().trim();
  const authHeader = (req.headers['authorization'] ?? '').toString().trim();
  const bearerSecret = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (headerSecret === expected || bearerSecret === expected) {
    return true;
  }

  res.status(401).json({ error: 'Unauthorized: missing or invalid VAPI secret' });
  return false;
}
