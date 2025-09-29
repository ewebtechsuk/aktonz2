import handler from '../pages/api/integrations/3cx/contact.js';
import * as portal from '../lib/apex27-portal.js';

function createMockRes() {
  const headers = new Map();

  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.finished = true;
      return this;
    },
    end(payload) {
      this.body = payload ?? null;
      this.finished = true;
      return this;
    },
    setHeader(name, value) {
      headers.set(name, value);
    },
    getHeader(name) {
      return headers.get(name);
    },
    headers,
  };
}

function createRequest({ method = 'GET', headers = {}, query = {} } = {}) {
  return {
    method,
    headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    ),
    query,
  };
}

describe('3CX contact lookup API', () => {
  const SECRET = 'shared-secret';

  beforeEach(() => {
    process.env.THREECX_WEBHOOK_SECRET = SECRET;
    jest.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.THREECX_WEBHOOK_SECRET;
  });

  test('rejects requests with a missing or invalid secret', async () => {
    const req = createRequest({ query: { phone: '01234' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 for requests without a phone number', async () => {
    const req = createRequest({
      query: {},
      headers: { 'x-3cx-secret': SECRET },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing or invalid phone query parameter' });
  });

  test('looks up contacts and returns the normalised response', async () => {
    const lookup = jest
      .spyOn(portal, 'lookupContactByPhone')
      .mockResolvedValue({ contactId: 'abc', firstName: 'Ada' });

    const req = createRequest({
      query: { phone: '+44 1234 567890', countryCode: '44' },
      headers: { 'x-3cx-secret': SECRET },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(lookup).toHaveBeenCalledWith({
      phone: '+441234567890',
      countryCode: '44',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ contact: { contactId: 'abc', firstName: 'Ada' } });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  test('propagates not-found responses when no contact exists', async () => {
    jest.spyOn(portal, 'lookupContactByPhone').mockResolvedValue(null);

    const req = createRequest({
      query: { phone: '01234 567890' },
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Contact not found' });
  });
});
