const loadTs = require('./helpers/load-ts');
const mockSendMailGraph = jest.fn();
const mockAddOffer = jest.fn();

const msGraphRequest = '../../lib/ms-graph';
const resolvedMsGraphPath = require.resolve('../lib/ms-graph');
const offersModulePath = '../../lib/offers.js';
const resolvedOffersPath = require.resolve('../lib/offers.js');

const createOverrides = () => ({
  [msGraphRequest]: { sendMailGraph: (...args) => mockSendMailGraph(...args) },
  [resolvedMsGraphPath]: { sendMailGraph: (...args) => mockSendMailGraph(...args) },
  [offersModulePath]: { addOffer: (...args) => mockAddOffer(...args) },
  [resolvedOffersPath]: { addOffer: (...args) => mockAddOffer(...args) },
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
    mockAddOffer.mockReset();
  });

  it('sends offer submissions with amount and contact details', async () => {
    mockSendMailGraph.mockResolvedValueOnce(undefined);
    const savedOffer = {
      id: 'offer-123',
      propertyId: 'AKT-123',
      propertyTitle: 'Sample Property',
      price: 450000,
      frequency: 'pcm',
      name: 'Buyer Example',
      email: 'buyer@example.com',
      phone: '+44 7700 900123',
      message: 'Please consider my offer.',
      status: 'new',
      paymentStatus: 'pending',
      depositAmount: 1200,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      notes: '',
      payments: [],
    };
    mockAddOffer.mockResolvedValueOnce(savedOffer);

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
    expect(mockAddOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 'AKT-123',
        offerAmount: 450000,
        depositAmount: '1200',
        phone: '+44 7700 900123',
        message: 'Please consider my offer.',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ offer: savedOffer });

    const call = mockSendMailGraph.mock.calls[0][0];
    expect(call.to).toEqual(['info@aktonz.com']);
    expect(call.subject).toBe('Offer for AKT-123: £450,000.00');
    expect(call.html).toContain('Offer amount');
    expect(call.html).toContain('£450,000.00');
    expect(call.html).toContain('+44 7700 900123');
    expect(call.html).toContain('Offer frequency');
    expect(call.html).toContain('Per month');
    expect(call.html).toContain('Holding deposit');
    expect(call.html).toContain('£1,200.00');
    expect(call.html).toContain('Please consider my offer.');
  });
});
