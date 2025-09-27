const originalEnv = { ...process.env };

jest.mock('../lib/token-store', () => ({
  readTokens: jest.fn(),
  saveTokens: jest.fn(),
}));

describe('ms-graph refresh', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete global.fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
    delete global.fetch;
  });

  it('uses the dev redirect URI when only MS_DEV_REDIRECT_URI is configured', async () => {
    process.env.MS_CLIENT_ID = 'client-id';
    process.env.MS_CLIENT_SECRET = 'client-secret';
    delete process.env.MS_REDIRECT_URI;
    process.env.MS_DEV_REDIRECT_URI = 'http://localhost:3000/api/microsoft/callback';
    process.env.TOKEN_ENCRYPTION_KEY = 'unit-test-key';
    process.env.NODE_ENV = 'development';

    const tokenStore = require('../lib/token-store');
    tokenStore.readTokens.mockResolvedValue({
      access_token_enc: Buffer.from('expired-token', 'utf8').toString('base64'),
      refresh_token_enc: Buffer.from('refresh-token', 'utf8').toString('base64'),
      expires_in: 60,
      obtained_at: 0,
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }),
    });

    global.fetch = fetchMock;

    const { getValidAccessToken } = require('../lib/ms-graph');
    const token = await getValidAccessToken();

    expect(token).toBe('new-access-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.method).toBe('POST');
    expect(requestInit.body).toBeInstanceOf(URLSearchParams);
    expect(requestInit.body.get('redirect_uri')).toBe(process.env.MS_DEV_REDIRECT_URI);
  });
});
