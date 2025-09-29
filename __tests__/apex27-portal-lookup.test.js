import * as portal from '../lib/apex27-portal.js';

describe('lookupContactByPhone', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns null and avoids network when phone is missing', async () => {
    const spy = jest.spyOn(portal.phoneLookupInternals, 'fetch');

    const result = await portal.lookupContactByPhone();

    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  test('normalises digits before performing lookup', async () => {
    const spy = jest
      .spyOn(portal.phoneLookupInternals, 'fetch')
      .mockResolvedValue({ data: { contactId: 123, firstName: 'Ada' } });

    const contact = await portal.lookupContactByPhone({
      phone: '+44 (0)1234 567890',
      countryCode: '44',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [endpoints] = spy.mock.calls[0];

    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBeGreaterThan(0);
    for (const url of endpoints) {
      expect(url).not.toMatch(/\s/);
    }
    expect(endpoints).toContain('/contacts?phone=%2B4401234567890');

    expect(contact).toMatchObject({ contactId: 123, firstName: 'Ada' });
  });

  test('propagates null when no contact matches are found', async () => {
    jest.spyOn(portal.phoneLookupInternals, 'fetch').mockResolvedValue({ data: null });

    const result = await portal.lookupContactByPhone({ phone: '01234 567890' });

    expect(result).toBeNull();
  });
});
