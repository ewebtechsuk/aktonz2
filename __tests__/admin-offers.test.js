const path = require('path');
const { promises: fs } = require('fs');

const loadTs = require('./helpers/load-ts');
const agentsData = require('../data/agents.json');
const supportData = require('../data/ai-support.json');

const DATA_PATH = path.join(process.cwd(), 'data', 'offers.json');

function createMockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
}

describe('admin offers API', () => {
  let originalContent = '[]';

  beforeAll(async () => {
    try {
      originalContent = await fs.readFile(DATA_PATH, 'utf8');
    } catch {
      originalContent = '[]';
    }
  });

  afterAll(async () => {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, originalContent, 'utf8');
  });

  beforeEach(async () => {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, '[]', 'utf8');
    jest.resetModules();
  });

  test('returns persisted offers with deposit and payment details', async () => {
    const offersModule = loadTs('../lib/offers.js', __dirname);
    const savedOffer = await offersModule.addOffer({
      propertyId: 'SCRAYE-950002',
      propertyTitle: 'Stylish Four Bedroom Apartment',
      offerAmount: '1800',
      frequency: 'pcm',
      name: 'Test Tenant',
      email: 'tenant@example.com',
      depositAmount: '950',
    });

    const readSessionMock = jest.fn(() => ({ adminId: 'ops-admin', role: 'admin' }));
    const offersAdminModule = loadTs('../lib/offers-admin.mjs', __dirname, {
      overrides: {
        '../data/agents.json': agentsData,
        '../data/ai-support.json': supportData,
        './offers.js': offersModule,
        [require.resolve('../data/agents.json')]: agentsData,
        [require.resolve('../data/ai-support.json')]: supportData,
        [require.resolve('../lib/offers.js')]: offersModule,
      },
    });
    const handler = loadTs('../pages/api/admin/offers.js', __dirname, {
      overrides: {
        '../../../lib/session.js': { readSession: readSessionMock },
        '../../../lib/offers-admin.mjs': offersAdminModule,
        [require.resolve('../lib/session.js')]: { readSession: readSessionMock },
        [require.resolve('../lib/offers-admin.mjs')]: offersAdminModule,
      },
    }).default;

    const req = { method: 'GET', headers: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(1);

    const payload = res.json.mock.calls[0][0];
    expect(Array.isArray(payload.offers)).toBe(true);

    expect(payload.offers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: savedOffer.id,
          depositAmount: savedOffer.depositAmount,
          paymentStatus: savedOffer.paymentStatus,
          payments: savedOffer.payments,
          propertyTitle: savedOffer.propertyTitle,
          property: expect.objectContaining({
            id: 'SCRAYE-950002',
            title: 'Stylish Four Bedroom Apartment',
          }),
        }),
      ])
    );

    const savedEntry = payload.offers.find((entry) => entry.id === savedOffer.id);
    expect(savedEntry).toBeDefined();
    expect(savedEntry).toEqual(
      expect.objectContaining({
        amount: '£1,800 Per month',
        date: savedOffer.createdAt,
        type: 'rent',
        price: savedOffer.price,
        createdAt: savedOffer.createdAt,
      })
    );

  });

  test('falls back to submitter contact details when CRM lookup fails', async () => {
    const offersModule = loadTs('../lib/offers.js', __dirname);
    const savedOffer = await offersModule.addOffer({
      propertyId: 'AKT-NEW-001',
      propertyTitle: 'Unlisted Property',
      offerAmount: '2100',
      frequency: 'pcm',
      name: 'Fallback Tenant',
      email: 'fallback@example.com',
      phone: '+44 7700 900999',
      message: 'Interested in arranging a viewing.',
    });

    const offersAdminModule = loadTs('../lib/offers-admin.mjs', __dirname, {
      overrides: {
        '../data/agents.json': agentsData,
        '../data/ai-support.json': supportData,
        './offers.js': offersModule,
        [require.resolve('../data/agents.json')]: agentsData,
        [require.resolve('../data/ai-support.json')]: supportData,
        [require.resolve('../lib/offers.js')]: offersModule,
      },
    });

    const entries = await offersAdminModule.listOffersForAdmin();
    const entry = entries.find((item) => item.id === savedOffer.id);

    expect(entry).toBeDefined();
    expect(entry.contact).toEqual(
      expect.objectContaining({
        name: 'Fallback Tenant',
        email: 'fallback@example.com',
        phone: '+44 7700 900999',
      })
    );
  });

  test('provides fallback property details when CRM listing is missing', async () => {
    const offersModule = loadTs('../lib/offers.js', __dirname);
    const savedOffer = await offersModule.addOffer({
      propertyId: 'OFFMARKET-001',
      propertyTitle: 'Hidden Townhouse',
      propertyAddress: '123 Example Street, London',
      offerAmount: '575000',
      name: 'Interested Buyer',
      email: 'buyer@example.com',
    });

    const readSessionMock = jest.fn(() => ({ adminId: 'ops-admin', role: 'admin' }));
    const offersAdminModule = loadTs('../lib/offers-admin.mjs', __dirname, {
      overrides: {
        '../data/agents.json': agentsData,
        '../data/ai-support.json': supportData,
        './offers.js': offersModule,
        [require.resolve('../data/agents.json')]: agentsData,
        [require.resolve('../data/ai-support.json')]: supportData,
        [require.resolve('../lib/offers.js')]: offersModule,
      },
    });

    const handler = loadTs('../pages/api/admin/offers.js', __dirname, {
      overrides: {
        '../../../lib/session.js': { readSession: readSessionMock },
        '../../../lib/offers-admin.mjs': offersAdminModule,
        [require.resolve('../lib/session.js')]: { readSession: readSessionMock },
        [require.resolve('../lib/offers-admin.mjs')]: offersAdminModule,
      },
    }).default;

    const req = { method: 'GET', headers: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    const entry = payload.offers.find((item) => item.id === savedOffer.id);

    expect(entry).toBeDefined();
    expect(entry.property).toEqual(
      expect.objectContaining({
        id: savedOffer.propertyId,
        title: savedOffer.propertyTitle,
        address: savedOffer.propertyAddress,
      })
    );
  });
});
