let adminModule;

beforeAll(async () => {
  adminModule = await import('../lib/admin-users.mjs');
});

describe('admin users', () => {
  const validEmail = 'operations@aktonz.com';
  const validPassword = 'ValuationsR0cks!';

  test('authenticates valid admin credentials', () => {
    const { authenticateAdmin } = adminModule;
    const profile = authenticateAdmin({ email: validEmail, password: validPassword });
    expect(profile).toEqual(
      expect.objectContaining({
        email: validEmail,
        role: 'admin',
        contactId: expect.any(String),
      }),
    );
  });

  test('rejects invalid credentials', () => {
    const { authenticateAdmin } = adminModule;
    expect(authenticateAdmin({ email: validEmail, password: 'wrong' })).toBeNull();
    expect(authenticateAdmin({ email: 'unknown@example.com', password: validPassword })).toBeNull();
  });

  test('returns admin profile from session payload', () => {
    const { authenticateAdmin, createAdminSessionPayload, getAdminFromSession, isAdminSession } = adminModule;
    const profile = authenticateAdmin({ email: validEmail, password: validPassword });
    expect(profile).not.toBeNull();

    const sessionPayload = createAdminSessionPayload(profile);
    expect(sessionPayload).toEqual(
      expect.objectContaining({
        adminId: profile.id,
        role: 'admin',
      }),
    );

    expect(isAdminSession(sessionPayload)).toBe(true);
    const resolved = getAdminFromSession(sessionPayload);
    expect(resolved).toEqual(profile);
  });

  test('finds admin profile by id', () => {
    const { authenticateAdmin, getAdminProfileById } = adminModule;
    const profile = authenticateAdmin({ email: validEmail, password: validPassword });
    expect(profile).not.toBeNull();

    const lookup = getAdminProfileById(profile.id);
    expect(lookup).toEqual(profile);
  });
});
