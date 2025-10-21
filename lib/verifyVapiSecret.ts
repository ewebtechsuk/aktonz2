import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Verifies that the request contains the correct secret.
 * It checks both the "x-aktonz-secret" header and the "Authorization: Bearer <secret>" header.
 *
 * If the secret is missing or invalid, it sends a 401 response and returns false.
 */
export function verifyVapiSecret(req: NextApiRequest, res: NextApiResponse): boolean {
  const expected = process.env.VAPI_ACCESS_SECRET;
  // Extract the secret from headers
  const provided = (req.headers['x-aktonz-secret'] ?? '') as string;
  const authHeader = (req.headers['authorization'] ?? '') as string;
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  // Validate the secret
  if (!expected || (provided !== expected && bearer !== expected)) {
    res.status(401).json({ error: 'Unauthorized: missing or invalid VAPI secret' });
    return false;
  }
  return true;
}
