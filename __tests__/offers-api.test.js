const loadTs = require('./helpers/load-ts');
const mockSendMailGraph = jest.fn();

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

describe('offer API email delivery', () => {
  beforeEach(() => {
    mockSendMailGraph.mockReset();
  });

  it('sends offer submissions with amount and contact details', async () => {
    mockSendMailGraph.mockResolvedValueOnce(undefined);

    const req = {
      method: 'POST',
      body: {
        name: 'Buyer Example',
        email: 'buyer@example.com',
        phone: '+44 7700 900123',
        offerAmount: '450000',
        frequency: 'pcm',
        depositAmount: '1200',
        propertyId: 'AKT-123',
        propertyTitle: 'Sample Property',
        message: 'Please consider my offer.',
      },
    };
    const res = createMockRes();

    const handler = loadTs('../pages/api/offers.ts', __dirname, {
      overrides: createOverrides(),
    }).default;

    await handler(req, res);

    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });

    const call = mockSendMailGraph.mock.calls[0][0];
    expect(call.to).toEqual(['info@aktonz.com']);
    expect(call.subject).toBe('Offer for AKT-123: £450,000.00');
    expect(call.html).toContain('Offer amount');
    expect(call.html).toContain('£450,000.00');
    expect(call.html).toContain('+44 7700 900123');
    expect(call.html).toContain('Offer frequency');
    expect(call.html).toContain('pcm');
    expect(call.html).toContain('Holding deposit');
    expect(call.html).toContain('£1,200.00');
    expect(call.html).toContain('Please consider my offer.');
  });
});
