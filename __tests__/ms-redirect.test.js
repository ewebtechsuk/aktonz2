const { resolveMicrosoftRedirectUri, _internal } = require('../lib/ms-redirect');

describe('resolveMicrosoftRedirectUri', () => {
  const originalEnv = { ...process.env };
  const redirectEnvKeys = [
    'MS_REDIRECT_URI',
    'MICROSOFT_REDIRECT_URI',
    'MICROSOFT_REDIRECT_URL',
    'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
    'NEXT_PUBLIC_MICROSOFT_REDIRECT_URL',
    'AZURE_AD_REDIRECT_URI',
    'AZURE_AD_REDIRECT_URL',
    'MS_DEV_REDIRECT_URI',
    'MICROSOFT_DEV_REDIRECT_URI',
    'MICROSOFT_DEV_REDIRECT_URL',
    'NEXT_PUBLIC_MICROSOFT_DEV_REDIRECT_URI',
    'NEXT_PUBLIC_MICROSOFT_DEV_REDIRECT_URL',
  ];

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    for (const key of redirectEnvKeys) {
      delete process.env[key];
    }
  });

  function buildRequest({ host = 'aktonz.com', proto = 'https', headers = {} } = {}) {
    return {
      headers: {
        host,
        'x-forwarded-proto': proto,
        ...headers,
      },
    };
  }

  it('returns configured absolute production redirect', () => {
    process.env.MS_REDIRECT_URI = 'https://example.com/callback';
    const req = buildRequest();
    expect(resolveMicrosoftRedirectUri(req)).toBe('https://example.com/callback');
  });

  it('resolves relative production redirect using host', () => {
    process.env.MS_REDIRECT_URI = '/api/microsoft/callback';
    const req = buildRequest({ host: 'aktonz.com' });
    expect(resolveMicrosoftRedirectUri(req)).toBe('https://aktonz.com/api/microsoft/callback');
  });

  it('falls back to default local redirect', () => {
    delete process.env.MS_DEV_REDIRECT_URI;
    const req = buildRequest({ host: 'localhost:3000', proto: 'http' });
    expect(resolveMicrosoftRedirectUri(req)).toBe('http://localhost:3000/api/microsoft/callback');
  });

  it('uses forwarded host header when provided', () => {
    process.env.MS_REDIRECT_URI = '/api/microsoft/callback';
    const req = buildRequest({
      host: 'internal:3000',
      headers: { 'x-forwarded-host': 'preview.aktonz.com' },
    });
    expect(resolveMicrosoftRedirectUri(req)).toBe('https://preview.aktonz.com/api/microsoft/callback');
  });

  it('throws when no host for relative URL', () => {
    process.env.MS_REDIRECT_URI = '/api/microsoft/callback';
    const req = buildRequest({ host: '' });
    expect(() => resolveMicrosoftRedirectUri(req)).toThrow('MS_REDIRECT_URI');
  });
});

describe('ensureAbsoluteUrl', () => {
  const { ensureAbsoluteUrl } = _internal;

  it('returns absolute url unchanged', () => {
    expect(
      ensureAbsoluteUrl('https://aktonz.com/api/microsoft/callback', {
        host: 'aktonz.com',
        isLocal: false,
        label: 'TEST_REDIRECT',
      }),
    ).toBe('https://aktonz.com/api/microsoft/callback');
  });

  it('resolves relative paths with https by default', () => {
    expect(
      ensureAbsoluteUrl('/api/microsoft/callback', {
        host: 'aktonz.com',
        isLocal: false,
        label: 'TEST_REDIRECT',
      }),
    ).toBe('https://aktonz.com/api/microsoft/callback');
  });

  it('uses http for local relative paths', () => {
    expect(
      ensureAbsoluteUrl('/api/microsoft/callback', {
        host: 'localhost:3000',
        isLocal: true,
        label: 'TEST_REDIRECT',
      }),
    ).toBe('http://localhost:3000/api/microsoft/callback');
  });

  it('prefers forwarded protocol when provided', () => {
    expect(
      ensureAbsoluteUrl('/api/microsoft/callback', {
        host: 'preview.aktonz.com',
        isLocal: false,
        label: 'TEST_REDIRECT',
        protocol: 'http',
      }),
    ).toBe('http://preview.aktonz.com/api/microsoft/callback');
  });

  it('throws for invalid values', () => {
    expect(() =>
      ensureAbsoluteUrl('not-a-valid-url', {
        host: 'aktonz.com',
        isLocal: false,
        label: 'TEST_REDIRECT',
      }),
    ).toThrow('TEST_REDIRECT');
  });
});
