const { resolveMicrosoftRedirectUri } = require("../../../lib/ms-redirect");
const { resolveTenantId, MS_CLIENT_ID, SCOPES } = require("../../../lib/ms-graph");

module.exports = function handler(req, res) {
  const clientId = MS_CLIENT_ID;
  const scopes = SCOPES;
  const tenant = resolveTenantId();

  let redirectUri;
  try {
    redirectUri = resolveMicrosoftRedirectUri(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_redirect_uri';
    console.error('Microsoft connect redirect URI error', message);
    res.status(500).json({ error: "invalid_redirect_uri" });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: scopes,
    state: "aktonz-ms-auth",
  });
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  res.writeHead(302, { Location: url });
  res.end();
};
