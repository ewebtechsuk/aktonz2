require('./helpers/register-ts');

const mockSendMailGraph = jest.fn();

jest.mock('../lib/ms-graph', () => ({
  sendMailGraph: (...args) => mockSendMailGraph(...args),
}));

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

    await jest.isolateModulesAsync(async () => {
      const handler = require('../pages/api/contact.ts').default;
      await handler(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
    expect(mockSendMailGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['info@aktonz.com'],
        subject: 'New contact from Buyer',
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

    await jest.isolateModulesAsync(async () => {
      const handler = require('../pages/api/contact.ts').default;
      await handler(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Graph error' });
    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
  });
});
