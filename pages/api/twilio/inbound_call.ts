// pages/api/twilio/inbound_call.ts

import type { NextApiRequest, NextApiResponse } from 'next';

import { verifyVapiSecret } from '../../../lib/verifyVapiSecret';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers so the VAPI dashboard test & Twilio calls can connect
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // pre-flight check
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Authentication
  if (!verifyVapiSecret(req, res)) {
    return;
  }

  // Parse body
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

    if (!toolCallId || !toolName) continue;

    let resultOutput: unknown;

    if (toolName === 'inbound_call') {
      resultOutput = "Hello, thank you for calling Aktonz. This is James speaking. How can I assist you today?";
    } else {
      resultOutput = `Sorry — the tool "${toolName}" is not implemented.`;
    }

    results.push({ toolCallId, result: resultOutput });
  }

  res.status(200).json({ results });
}
