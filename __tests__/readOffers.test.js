const loadTs = require('./helpers/load-ts');

function createFsError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function createFsMock(overrides = {}) {
  const promises = {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    ...overrides,
  };

  return { promises };
}

describe('readOffers', () => {
  const callerDir = __dirname;

  afterEach(() => {
    jest.resetModules();
  });

  test('returns an empty array when the data file is missing', async () => {
    const fsMock = createFsMock({
      access: jest.fn().mockRejectedValue(createFsError('ENOENT')),
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(''),
    });

    const offersModule = loadTs('../lib/offers.js', callerDir, {
      overrides: { fs: fsMock },
    });

    await expect(offersModule.readOffers()).resolves.toEqual([]);
    expect(fsMock.promises.mkdir).toHaveBeenCalled();
    expect(fsMock.promises.writeFile).toHaveBeenCalled();
    expect(fsMock.promises.readFile).toHaveBeenCalled();
  });

  test('returns an empty array when the data directory is read-only', async () => {
    const fsMock = createFsMock({
      access: jest.fn().mockRejectedValue(createFsError('ENOENT')),
      mkdir: jest.fn().mockRejectedValue(createFsError('EROFS')),
    });

    const offersModule = loadTs('../lib/offers.js', callerDir, {
      overrides: { fs: fsMock },
    });

    await expect(offersModule.readOffers()).resolves.toEqual([]);
    expect(fsMock.promises.writeFile).not.toHaveBeenCalled();
    expect(fsMock.promises.readFile).not.toHaveBeenCalled();
  });

  test('returns an empty array when writing the offers file fails with EROFS', async () => {
    const fsMock = createFsMock({
      access: jest.fn().mockRejectedValue(createFsError('ENOENT')),
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockRejectedValue(createFsError('EROFS')),
    });

    const offersModule = loadTs('../lib/offers.js', callerDir, {
      overrides: { fs: fsMock },
    });

    await expect(offersModule.readOffers()).resolves.toEqual([]);
    expect(fsMock.promises.readFile).not.toHaveBeenCalled();
  });
});
