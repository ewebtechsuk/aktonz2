const crypto = require("crypto");
const { resolveMicrosoftRedirectUriFromEnv } = require("./ms-redirect");
const { readTokens, saveTokens } = require("./token-store");

const DEFAULT_CLIENT_ID = "28c9d37b-2c2b-4d49-9ac4-4c180967bc7c";
const DEFAULT_SCOPES = "offline_access Mail.Send User.Read";

const MS_CLIENT_ID = process.env.MS_CLIENT_ID || DEFAULT_CLIENT_ID;
const SCOPES = process.env.MS_SCOPES || DEFAULT_SCOPES;

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length === 0) {
    throw new Error("missing_token_key");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptToken(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptToken(b64) {
  try {
    const raw = Buffer.from(b64, "base64");
    if (raw.length < 29) {
      return raw.toString("utf8");
    }
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (error) {
    const raw = Buffer.from(b64, "base64");
    return raw.toString("utf8");
  }
}

const TENANT_ENV_KEYS = [
  "MS_TENANT_ID",
  "MICROSOFT_TENANT_ID",
  "MICROSOFT_TENANT",
  "AZURE_TENANT_ID",
  "AZURE_DIRECTORY_ID",
  "AZURE_AD_TENANT_ID",
  "MS_DIRECTORY_ID",
  "MS_TENANT",
  "NEXT_PUBLIC_MS_TENANT_ID",
  "NEXT_PUBLIC_MICROSOFT_TENANT_ID",
];

const DEFAULT_TENANT_ID = "common";

function pickEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function resolveTenantId() {
  const raw = pickEnvValue(TENANT_ENV_KEYS);
  if (!raw) {
    return DEFAULT_TENANT_ID;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return DEFAULT_TENANT_ID;
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    return DEFAULT_TENANT_ID;
  }
  return trimmed;
}

async function refresh(access) {
  const clientId = MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const redirectUri = resolveMicrosoftRedirectUriFromEnv();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("missing_ms_config");
  }
  const tenant = resolveTenantId();
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: decryptToken(access.refresh_token_enc),
    redirect_uri: redirectUri,
    scope: SCOPES,
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("refresh_failed");
  }
  const payload = await response.json();
  const now = Math.floor(Date.now() / 1000);
  await saveTokens({
    access_token_enc: encryptToken(payload.access_token),
    refresh_token_enc: encryptToken(payload.refresh_token),
    expires_in: payload.expires_in,
    obtained_at: now,
    account: "info@aktonz.com",
  });
  return payload.access_token;
}

async function getValidAccessToken() {
  const tokens = await readTokens();
  if (!tokens) {
    throw new Error("not_connected");
  }
  const accessToken = decryptToken(tokens.access_token_enc);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = tokens.obtained_at + (tokens.expires_in - 90);
  if (now < expiresAt) {
    return accessToken;
  }
  return refresh(tokens);
}

async function sendMailGraph({ to, subject, html, text }) {
  const token = await getValidAccessToken();
  const body = {
    message: {
      subject,
      body: {
        contentType: html ? "HTML" : "Text",
        content: html || text || "",
      },
      toRecipients: to.map((address) => ({
        emailAddress: { address },
      })),
    },
    saveToSentItems: true,
  };
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

const MS_TENANT_ID = resolveTenantId();

module.exports = {
  encryptToken,
  decryptToken,
  getValidAccessToken,
  sendMailGraph,
  resolveTenantId,
  MS_CLIENT_ID,
  MS_TENANT_ID,
  SCOPES,
};
