#!/usr/bin/env node
import process from 'node:process';

const CLIENT_ID_ENV_KEYS = [
  'MS_CLIENT_ID',
  'MICROSOFT_CLIENT_ID',
  'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
  'AZURE_AD_CLIENT_ID',
  'MSAL_CLIENT_ID',
];

const REDIRECT_URI_ENV_KEYS = [
  'MS_REDIRECT_URI',
  'MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URL',
  'AZURE_AD_REDIRECT_URI',
  'AZURE_AD_REDIRECT_URL',
];

const DEV_REDIRECT_URI_ENV_KEYS = ['MS_DEV_REDIRECT_URI'];

const TENANT_ID_ENV_KEYS = [
  'MS_TENANT_ID',
  'MICROSOFT_TENANT_ID',
  'NEXT_PUBLIC_MICROSOFT_TENANT_ID',
  'AZURE_AD_TENANT_ID',
  'AZURE_TENANT_ID',
  'AZURE_DIRECTORY_ID',
  'MSAL_TENANT_ID',
];

function resolveEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return { key, value: value.trim() };
    }
  }
  return null;
}

function formatAliases(keys) {
  if (keys.length === 1) {
    return keys[0];
  }
  return `${keys[0]} (aliases: ${keys.slice(1).join(', ')})`;
}

function reportGroup(label, keys, { optional = false, fallback = null } = {}) {
  const resolved = resolveEnvValue(keys);

  if (resolved) {
    return {
      label,
      status: 'present',
      message: `${label} resolved from ${resolved.key}.`,
      value: resolved.value,
    };
  }

  if (fallback) {
    return {
      label,
      status: 'fallback',
      message: `${label} will fall back to ${fallback}.`,
    };
  }

  return {
    label,
    status: optional ? 'optional-missing' : 'missing',
    message: `${label} missing — set ${formatAliases(keys)}.`,
  };
}

const DEFAULTS = {
  clientId: '04651e3a-82c5-4e03-ba50-574b2bb79cac',
  redirectUri: 'https://aktonz.com/api/microsoft/callback',
  devRedirectUri: 'http://localhost:3000/api/admin/email/microsoft/callback',
  tenantId: '60737a1b-9707-4d7f-9909-0ee943a1ffff',
  scopes: 'offline_access Mail.Send User.Read',
};

const results = [
  reportGroup('Microsoft client ID', CLIENT_ID_ENV_KEYS, {
    fallback: `built-in default (${DEFAULTS.clientId})`,
  }),
  reportGroup('Redirect URI', REDIRECT_URI_ENV_KEYS, {
    fallback: `built-in default (${DEFAULTS.redirectUri})`,
  }),
  reportGroup('Local redirect URI', DEV_REDIRECT_URI_ENV_KEYS, {
    fallback: `built-in default (${DEFAULTS.devRedirectUri})`,
    optional: true,
  }),
  reportGroup('Tenant ID', TENANT_ID_ENV_KEYS, {
    optional: true,
    fallback: `built-in default (${DEFAULTS.tenantId})`,
  }),
  reportGroup('Scopes', ['MS_SCOPES', 'MICROSOFT_SCOPES'], {
    optional: true,
    fallback: DEFAULTS.scopes,
  }),
  reportGroup('Client secret', ['MS_CLIENT_SECRET'], {
    optional: false,
  }),
];

let exitCode = 0;

for (const result of results) {
  const symbol =
    result.status === 'present'
      ? '✅'
      : result.status === 'fallback'
      ? 'ℹ️'
      : result.status === 'optional-missing'
      ? '⚠️'
      : '❌';
  console.log(`${symbol} ${result.message}`);
  if (result.status === 'missing') {
    exitCode = 1;
  }
}

if (exitCode !== 0) {
  console.error('\nThe Microsoft 365 connect button will remain disabled until required settings are provided.');
}

process.exit(exitCode);
