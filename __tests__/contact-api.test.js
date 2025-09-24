const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: mockCreateTransport,
  },
  createTransport: mockCreateTransport,
}));

const originalEnv = { ...process.env };

const resetEnv = () => {
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, originalEnv);
};

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
  let consoleErrorSpy;

  beforeEach(() => {
    mockSendMail.mockReset();
    mockCreateTransport.mockReset();
    mockCreateTransport.mockImplementation(() => ({ sendMail: mockSendMail }));
    resetEnv();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    resetEnv();
  });

  afterAll(() => {
    resetEnv();
  });

  test('sends messages to Aktonz and the visitor when SMTP accepts both', async () => {
    mockSendMail
      .mockResolvedValueOnce({ accepted: ['info@aktonz.com'] })
      .mockResolvedValueOnce({ accepted: ['buyer@example.com'] });

    Object.assign(process.env, {
      SMTP_HOST: 'smtp.office365.com',
      SMTP_USER: 'info@aktonz.com',
      SMTP_PASS: 'secret',
      SMTP_SECURE: 'false',
      AKTONZ_EMAIL: 'info@aktonz.com',
    });

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
      const { default: handler } = await import('../lib/api/contact-handler.mjs');
      await handler(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockSendMail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ['info@aktonz.com'],
        replyTo: 'buyer@example.com',
      })
    );
    expect(mockSendMail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'buyer@example.com',
      })
    );
  });

  test('returns 502 when the SMTP server rejects Aktonz recipients', async () => {
    mockSendMail.mockResolvedValueOnce({ accepted: [] });

    Object.assign(process.env, {
      SMTP_HOST: 'smtp.office365.com',
      SMTP_USER: 'info@aktonz.com',
      SMTP_PASS: 'secret',
      SMTP_SECURE: 'false',
      AKTONZ_EMAIL: 'info@aktonz.com',
    });

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
      const { default: handler } = await import('../lib/api/contact-handler.mjs');
      await handler(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email delivery failed.' });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
