const TENANT_ENV_KEYS = [
  'MS_TENANT_ID',
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_TENANT',
  'AZURE_TENANT_ID',
  'AZURE_DIRECTORY_ID',
  'AZURE_AD_TENANT_ID',
  'MS_DIRECTORY_ID',
  'MS_TENANT',
  'NEXT_PUBLIC_MS_TENANT_ID',
  'NEXT_PUBLIC_MICROSOFT_TENANT_ID',
];

const DEFAULT_TENANT = '60737a1b-9707-4d7f-9909-0ee943a1ffff';
const COMMON_TENANT = 'common';
const ORIGINAL_ENV = process.env;

function clearTenantEnv() {
  for (const key of TENANT_ENV_KEYS) {
    delete process.env[key];
  }
  delete process.env.MS_CLIENT_ID;
}

function loadResolver() {
  return require('../lib/ms-graph.js').resolveTenantId;
}

describe('resolveTenantId', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    clearTenantEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('defaults to bundled tenant when tenant is not provided', () => {
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe(DEFAULT_TENANT);
  });

  test('defaults to common when using a custom client ID', () => {
    process.env.MS_CLIENT_ID = 'custom-client-id';
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe(COMMON_TENANT);
  });

  test('trims whitespace around tenant values', () => {
    process.env.MS_TENANT_ID = '  contoso.onmicrosoft.com  ';
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe('contoso.onmicrosoft.com');
  });

  test('treats the literal string "undefined" as unset', () => {
    process.env.MS_TENANT_ID = 'undefined';
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe(DEFAULT_TENANT);
  });

  test('treats the literal string "null" as unset', () => {
    process.env.AZURE_DIRECTORY_ID = 'null';
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe(DEFAULT_TENANT);
  });

  test('supports alternative environment variable names', () => {
    process.env.AZURE_AD_TENANT_ID = 'tenant-from-alias';
    const resolveTenantId = loadResolver();
    expect(resolveTenantId()).toBe('tenant-from-alias');
  });
});
