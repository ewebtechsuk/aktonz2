const { saveTokens } = require("./token-store");
const { encryptToken } = require("./ms-graph");

function redirect(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}

function redirectWithError(res, message) {
  redirect(res, `/admin?connect_error=${encodeURIComponent(message)}`);
}

async function handleMicrosoftCallback(req, res) {
  const codeParam = req.query.code;
  const errorParam = req.query.error;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  if (error) {
    return redirectWithError(res, error);
  }
  if (!code) {
    return redirectWithError(res, "missing_code");
  }

  const tenant = process.env.MS_TENANT_ID || 'common';
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const redirectUri = process.env.MS_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithError(res, "missing_ms_config");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    return redirectWithError(
      res,
      `token_exchange_failed#${encodeURIComponent(detail)}`,
    );
  }

  const payload = await response.json();

  try {
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${payload.access_token}` },
    });
    const profile = await profileResponse.json();
    const upn = (profile?.userPrincipalName || profile?.mail || "").toLowerCase();
    if (upn !== "info@aktonz.com") {
      return redirectWithError(res, "only_info@aktonz.com_allowed");
    }
  } catch {
    return redirectWithError(res, "profile_fetch_failed");
  }

  const now = Math.floor(Date.now() / 1000);
  await saveTokens({
    access_token_enc: encryptToken(payload.access_token),
    refresh_token_enc: encryptToken(payload.refresh_token),
    expires_in: payload.expires_in,
    obtained_at: now,
    account: "info@aktonz.com",
  });

  return redirect(res, "/admin?connected=1");
}

module.exports = handleMicrosoftCallback;
