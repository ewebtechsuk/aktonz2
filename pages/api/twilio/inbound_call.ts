// pages/api/twilio/inbound_call.ts

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Verifies that the incoming request contains the correct VAPI secret.
 * Checks Authorization Bearer header or x-aktonz-secret custom header.
 */
function verifyVapiSecret(req: NextApiRequest, res: NextApiResponse): boolean {
  const expected = process.env.VAPI_ACCESS_SECRET?.trim();
  if (!expected) {
    console.error('VAPI_ACCESS_SECRET is not set');
    res.status(500).json({ error: 'Internal server error: missing configuration' });
    return false;
  }

  // Get provided token from Authorization header
  const authHeader = (req.headers['authorization'] ?? '').toString().trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  // Also check custom header x-aktonz-secret if used
  const providedCustom = (req.headers['x-aktonz-secret'] ?? '').toString().trim();

  // Compare case-insensitive to avoid mismatches in hex string casing
  if (
    providedCustom.toLowerCase() === expected.toLowerCase() ||
    bearerToken.toLowerCase() === expected.toLowerCase()
  ) {
    return true;
  }

  res.status(401).json({ error: 'Unauthorized: missing or invalid VAPI secret' });
  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST
  if (req.method === 'OPTIONS') {
    // CORS pre-flight
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Authenticate
  if (!verifyVapiSecret(req, res)) {
    return;
  }

  // Parse JSON body
  let body: any;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  const message = body.message;
  if (!message || !Array.isArray(message.toolCallList) || message.toolCallList.length === 0) {
    res.status(400).json({ error: 'Invalid request: missing message/toolCallList' });
    return;
  }

  const results: { toolCallId: string; result: unknown }[] = [];

  for (const call of message.toolCallList) {
    const toolCallId = call.id || '';
    const toolName = call.name || '';

    if (!toolCallId || !toolName) {
      continue;
    }

    let resultOutput: unknown;

    switch (toolName) {
      case 'inbound_call':
        // Provide the assistant introduction from James
        resultOutput = "Hello, thank you for calling Aktonz. This is James speaking. How can I assist you today?";
        break;

      default:
        resultOutput = `Sorry — the tool "${toolName}" is not implemented.`;
        break;
    }

    results.push({ toolCallId, result: resultOutput });
  }

  res.status(200).json({ results });
}
