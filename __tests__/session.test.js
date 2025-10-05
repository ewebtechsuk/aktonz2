const ORIGINAL_ENV = process.env;

function createResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

describe('session secret fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.SESSION_SECRET;
    delete process.env.APEX27_SESSION_SECRET;
    delete process.env.APEX27_API_KEY;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test('generates an ephemeral secret outside production', async () => {
    process.env.NODE_ENV = 'development';
    const session = await import('../lib/session.js');

    const res = createResponse();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      session.writeSession(res, { foo: 'bar' }, { maxAge: 60 });
    } finally {
      warnSpy.mockRestore();
    }

    expect(res.headers['Set-Cookie']).toContain('aktonz_session=');

    const cookieValue = res.headers['Set-Cookie'].split(';')[0].split('=')[1];
    const req = { headers: { cookie: `aktonz_session=${cookieValue}` } };
    const data = session.readSession(req);

    expect(data).toEqual(expect.objectContaining({ foo: 'bar' }));
  });

  test('throws in production when no secret is configured', async () => {
    process.env.NODE_ENV = 'production';
    const session = await import('../lib/session.js');
    const res = createResponse();

    expect(() => session.writeSession(res, { foo: 'bar' }, { maxAge: 60 })).toThrow(
      'Session secret not configured',
    );
  });
});
