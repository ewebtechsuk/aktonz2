const loadTs = require('./helpers/load-ts');

const createMockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
};

const adminListingsRequest = '../../../../lib/admin-listings.mjs';
const resolvedAdminListingsPath = require.resolve('../lib/admin-listings.mjs');
const offersAdminRequest = '../../../../lib/offers-admin.mjs';
const resolvedOffersAdminPath = require.resolve('../lib/offers-admin.mjs');
const maintenanceAdminRequest = '../../../../lib/maintenance-admin.mjs';
const resolvedMaintenanceAdminPath = require.resolve('../lib/maintenance-admin.mjs');
const propertyIdRequest = '../../../../lib/property-id.mjs';
const resolvedPropertyIdPath = require.resolve('../lib/property-id.mjs');
const adminUsersRequest = '../../../../lib/admin-users.mjs';
const resolvedAdminUsersPath = require.resolve('../lib/admin-users.mjs');
const sessionRequest = '../../../../lib/session.js';
const resolvedSessionPath = require.resolve('../lib/session.js');

describe('admin listing details API', () => {
  const mockGetLettingsListingById = jest.fn();
  const mockSerializeListing = jest.fn();
  const mockListOffersForAdmin = jest.fn();
  const mockListMaintenanceForAdmin = jest.fn();
  const mockGetAdminFromSession = jest.fn();
  const mockReadSession = jest.fn();

  const createOverrides = () => ({
    [adminListingsRequest]: {
      getLettingsListingById: mockGetLettingsListingById,
      serializeListing: mockSerializeListing,
      updateLettingsListingById: jest.fn(),
      AdminListingValidationError: class extends Error {},
    },
    [resolvedAdminListingsPath]: {
      getLettingsListingById: mockGetLettingsListingById,
      serializeListing: mockSerializeListing,
      updateLettingsListingById: jest.fn(),
      AdminListingValidationError: class extends Error {},
    },
    [offersAdminRequest]: { listOffersForAdmin: mockListOffersForAdmin },
    [resolvedOffersAdminPath]: { listOffersForAdmin: mockListOffersForAdmin },
    [maintenanceAdminRequest]: {
      listMaintenanceTasksForAdmin: mockListMaintenanceForAdmin,
    },
    [resolvedMaintenanceAdminPath]: {
      listMaintenanceTasksForAdmin: mockListMaintenanceForAdmin,
    },
    [propertyIdRequest]: {
      normalizePropertyIdentifierForComparison: (value) =>
        value ? String(value).toLowerCase() : null,
    },
    [resolvedPropertyIdPath]: {
      normalizePropertyIdentifierForComparison: (value) =>
        value ? String(value).toLowerCase() : null,
    },
    [adminUsersRequest]: { getAdminFromSession: mockGetAdminFromSession },
    [resolvedAdminUsersPath]: { getAdminFromSession: mockGetAdminFromSession },
    [sessionRequest]: { readSession: mockReadSession },
    [resolvedSessionPath]: { readSession: mockReadSession },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns listing data when companion lookups fail', async () => {
    mockReadSession.mockReturnValue({ id: 'session' });
    mockGetAdminFromSession.mockReturnValue({ id: 'admin-1' });
    const listing = { id: 'listing-123', raw: { id: 'listing-123' } };
    mockGetLettingsListingById.mockResolvedValue(listing);
    mockSerializeListing.mockReturnValue({ id: 'listing-123', reference: 'L-123' });
    mockListOffersForAdmin.mockRejectedValue(new Error('offers down'));
    mockListMaintenanceForAdmin.mockRejectedValue(new Error('maintenance down'));

    const handler = loadTs('../pages/api/admin/listings/[id].js', __dirname, {
      overrides: createOverrides(),
    }).default;

    const req = { method: 'GET', query: { id: 'listing-123' } };
    const res = createMockRes();

    await handler(req, res);

    expect(mockGetLettingsListingById).toHaveBeenCalledWith('listing-123');
    expect(mockSerializeListing).toHaveBeenCalledWith(listing);
    expect(mockListOffersForAdmin).toHaveBeenCalledTimes(1);
    expect(mockListMaintenanceForAdmin).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      listing: expect.objectContaining({
        id: 'listing-123',
        reference: 'L-123',
        offers: [],
        maintenanceTasks: [],
      }),
    });
  });
});
