import type { NextApiRequest, NextApiResponse } from 'next';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers';
import { verifyVapiSecret } from '../../../lib/verifyVapiSecret';

/**
 * API handler for Twilio inbound calls via Vapi.
 * 
 * This endpoint enables the AI assistant (James) to handle incoming phone calls 
 * as a senior Sales & Lettings Consultant. It verifies requests using a secret, 
 * processes the call data from Vapi, and returns a response for James to speak.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Apply standard headers (e.g. CORS) and allow only POST and OPTIONS methods.
  applyApiHeaders(req, res, { methods: ['POST'] as const });
  if (handlePreflight(req, res)) {
    // If this is a preflight OPTIONS request (for CORS), respond OK and exit.
    return;
  }

  // Security check: ensure the request includes the correct secret key.
  // The secret is expected in the "x-aktonz-secret" header (or as a Bearer token).
  if (!verifyVapiSecret(req, res)) {
    // verifyVapiSecret will respond with 401 Unauthorized if the secret is missing or wrong.
    return;
  }

  // Only accept POST requests for this endpoint.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Helper to safely parse the JSON body (handles cases where body might be a string).
  function parseBody(request: NextApiRequest): Record<string, unknown> {
    if (request.body && typeof request.body === 'object') {
      return request.body as Record<string, unknown>;
    }
    if (typeof request.body === 'string') {
      try {
        return JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        throw new Error('Invalid JSON payload');
      }
    }
    return {}; // Return empty object if no body or unrecognized format.
  }

  // Parse the request body to get the message data.
  let body: Record<string, unknown>;
  try {
    body = parseBody(req);
  } catch (err) {
    // If JSON parsing fails, respond with a 400 Bad Request.
    const msg = err instanceof Error ? err.message : 'Invalid request body';
    res.status(400).json({ error: msg });
    return;
  }

  // Expect the body to contain a "message" object with the tool call details from Vapi.
  const message = body.message;
  if (!message || typeof message !== 'object') {
    res.status(400).json({ error: 'Invalid request: missing message data' });
    return;
  }

  // Extract the list of tool calls from the message.
  // Vapi can send multiple tool calls in one request (toolCallList array).
  const toolCalls = Array.isArray((message as any).toolCallList)
    ? (message as any).toolCallList 
    : [];
  if (toolCalls.length === 0) {
    res.status(400).json({ error: 'No tool calls provided in the request' });
    return;
  }

  // Prepare an array to collect results for each tool call.
  const results: { toolCallId: string; result: unknown }[] = [];

  // Process each tool call in the request.
  for (const toolCall of toolCalls) {
    // Ensure the toolCall item has the expected structure.
    if (!toolCall || typeof toolCall !== 'object') continue;
    const toolCallId: string | undefined = (toolCall as any).id || (toolCall as any).toolCallId;
    const toolName: string | undefined = (toolCall as any).name;
    if (!toolCallId || !toolName) {
      // Skip malformed entries (should not happen under normal conditions).
      console.warn('Malformed tool call data:', toolCall);
      continue;
    }

    let resultData: unknown;
    switch (toolName) {
      case 'inbound_call': {
        // Handle inbound call tool: generate a greeting and prompt for the caller.
        const args = (toolCall as any).arguments || {};  // Incoming call details (if any).
        // (Optional) We could use args (e.g., caller ID or name) to personalize the greeting.
        // Compose a polite greeting and inquiry as a senior consultant:
        resultData = "Hello, thank you for calling Aktonz. This is James speaking. How can I assist you today?";
        // ^ James introduces himself and the company, then invites the caller to explain their needs.
        break;
      }
      default: {
        // Handle any other tools if integrated in the future (e.g., viewings, leads, properties).
        // For now, return a generic message for unsupported tool names.
        resultData = `Sorry, I cannot handle the "${toolName}" request.`;
        // (In practice, we might throw an error or implement the tool's logic here.)
        break;
      }
    }

    // Add the result for this tool call, including the original toolCallId for correlation.
    results.push({ toolCallId: toolCallId, result: resultData });
  }

  // Return the results in the format expected by Vapi:
  // { results: [ { toolCallId: <ID>, result: <Output> }, ... ] }
  res.status(200).json({ results });
}
