const mockSendMailGraph = jest.fn();

const loadTs = require('./helpers/load-ts');

const msGraphRequest = '../../lib/ms-graph';
const resolvedMsGraphPath = require.resolve('../lib/ms-graph');

const createOverrides = () => ({
  [msGraphRequest]: { sendMailGraph: (...args) => mockSendMailGraph(...args) },
  [resolvedMsGraphPath]: { sendMailGraph: (...args) => mockSendMailGraph(...args) },
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
};

describe('contact API email delivery', () => {
  beforeEach(() => {
    mockSendMailGraph.mockReset();
  });

  test('sends contact submissions to Microsoft Graph', async () => {
    mockSendMailGraph.mockResolvedValueOnce(undefined);

    const req = {
      method: 'POST',
      body: {
        name: 'Buyer',
        email: 'buyer@example.com',
        message: 'I would like to know more.',
      },
    };
    const res = createMockRes();

    const handler = loadTs('../pages/api/contact.ts', __dirname, {
      overrides: createOverrides(),
    }).default;

    await handler(req, res);

    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockSendMailGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['info@aktonz.com'],
        subject: 'aktonz.com contact form',
      })
    );
  });

  test('returns 500 when Microsoft Graph fails', async () => {
    mockSendMailGraph.mockRejectedValueOnce(new Error('Graph error'));

    const req = {
      method: 'POST',
      body: {
        name: 'Buyer',
        email: 'buyer@example.com',
        message: 'I would like to know more.',
      },
    };
    const res = createMockRes();

    const handler = loadTs('../pages/api/contact.ts', __dirname, {
      overrides: createOverrides(),
    }).default;

    await handler(req, res);

    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send email' });
  });
});
