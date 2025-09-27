module.exports = function handler(req, res) {
  const clientId = process.env.MS_CLIENT_ID;
  const redirectUri = process.env.MS_REDIRECT_URI;
  const scopes = process.env.MS_SCOPES || 'offline_access Mail.Send User.Read';
  const tenant = process.env.MS_TENANT_ID || 'common';

  if (!clientId || !redirectUri) {
    res.status(500).json({ error: "missing_ms_config" });
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
