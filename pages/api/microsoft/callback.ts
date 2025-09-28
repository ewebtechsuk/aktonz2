import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveMicrosoftRedirectUri } from '../../../lib/ms-redirect';
import { handleOAuthCallback } from '../../../lib/ms-oauth';

const DEFAULT_ERROR_TITLE = 'Microsoft connection error';
const DEFAULT_ERROR_HEADING = 'We could not complete the Microsoft sign-in';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendHtmlError(
  res: NextApiResponse,
  status: number,
  {
    title = DEFAULT_ERROR_TITLE,
    heading = DEFAULT_ERROR_HEADING,
    description,
  }: { title?: string; heading?: string; description?: string },
): void {
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeDescription = escapeHtml(description ?? 'Please close this window and try again.');

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
          Arial, sans-serif;
        margin: 0;
        padding: 3rem 1.5rem;
        background: #f4f5f7;
        color: #1f2933;
      }
      main {
        max-width: 38rem;
        margin: 0 auto;
        padding: 2.5rem 2rem;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin-top: 0;
        font-size: 1.75rem;
        line-height: 1.3;
      }
      p {
        font-size: 1rem;
        line-height: 1.6;
        margin: 1rem 0 0;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #0f172a;
          color: #f8fafc;
        }
        main {
          background: #111827;
          box-shadow: 0 18px 45px rgba(2, 6, 23, 0.65);
        }
      }
    </style>
  </head>
  <body>
    <main role="alert" aria-live="assertive">
      <h1>${safeHeading}</h1>
      <p>${safeDescription}</p>
    </main>
  </body>
</html>`;

  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(body);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendHtmlError(res, 405, {
      title: 'Method not allowed',
      heading: 'Unsupported request method',
      description: 'This endpoint only accepts GET requests from Microsoft during sign-in.',
    });
    return;
  }

  const { code, error, error_description: errorDescription } = req.query;

  if (error) {
    const description =
      typeof errorDescription === 'string' && errorDescription.trim().length > 0
        ? errorDescription
        : `Azure Active Directory returned "${String(error)}".`;

    sendHtmlError(res, 400, {
      heading: 'Microsoft reported a problem while signing in',
      description,
    });
    return;
  }

  if (typeof code !== 'string' || !code) {
    sendHtmlError(res, 400, {
      heading: 'The Microsoft response was missing a code',
      description: 'Please restart the connection from the Aktonz admin area.',
    });
    return;
  }

  let redirectUri: string;
  try {
    redirectUri = resolveMicrosoftRedirectUri(req);
  } catch (resolveError) {
    const message = resolveError instanceof Error ? resolveError.message : 'invalid_redirect_uri';
    console.error('Microsoft callback redirect URI error', message);
    sendHtmlError(res, 500, {
      heading: 'We could not verify the redirect URI',
      description: 'Check the Aktonz environment configuration for the Microsoft connector.',
    });
    return;
  }

  try {
    await handleOAuthCallback(code, redirectUri);
    res.redirect(302, '/admin?connected=1');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Microsoft Graph connection failed';
    console.error('Microsoft callback error', message);
    sendHtmlError(res, 500, {
      description: message,
    });
  }
}
