const path = require('node:path');

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

describe('account activity APIs', () => {
  let fileStore;
  let readFileMock;
  let writeFileMock;
  let mkdirMock;
  let readSessionMock;

  const mockFsModule = () => ({
    readFile: readFileMock,
    writeFile: writeFileMock,
    mkdir: mkdirMock,
  });

  beforeEach(() => {
    fileStore = {};
    readSessionMock = jest.fn();
    readFileMock = jest.fn(async (filePath) => {
      if (Object.prototype.hasOwnProperty.call(fileStore, filePath)) {
        return JSON.stringify(fileStore[filePath]);
      }
      const error = new Error('Not found');
      error.code = 'ENOENT';
      throw error;
    });
    writeFileMock = jest.fn(async (filePath, value) => {
      fileStore[filePath] = JSON.parse(value);
    });
    mkdirMock = jest.fn(async () => {});
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('saved searches API', () => {
    const filePath = path.join(process.cwd(), 'data', 'saved-searches.json');

    test('requires authentication for GET requests', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('node:fs/promises', () => mockFsModule());
        jest.doMock('../lib/session.js', () => ({ readSession: readSessionMock }));
        readSessionMock.mockReturnValue(null);
        const handler = require('../pages/api/save-search.js');
        const req = { method: 'GET', headers: {} };
        const res = createMockRes();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      });
    });

    test('returns only the contact saved searches', async () => {
      fileStore[filePath] = {
        contactA: [
          { id: '1', params: { q: 'one' }, createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        contactB: [
          { id: '2', params: { q: 'two' }, createdAt: '2024-01-02T00:00:00.000Z' },
        ],
      };

      await jest.isolateModulesAsync(async () => {
        jest.doMock('node:fs/promises', () => mockFsModule());
        jest.doMock('../lib/session.js', () => ({ readSession: readSessionMock }));
        readSessionMock.mockReturnValue({ contactId: 'contactB' });
        const handler = require('../pages/api/save-search.js');
        const req = { method: 'GET', headers: {} };
        const res = createMockRes();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([
          { id: '2', params: { q: 'two' }, createdAt: '2024-01-02T00:00:00.000Z' },
        ]);
      });
    });

    test('stores saved searches per contact', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('node:fs/promises', () => mockFsModule());
        jest.doMock('../lib/session.js', () => ({ readSession: readSessionMock }));
        readSessionMock.mockReturnValue({ contactId: 'contactA' });
        const handler = require('../pages/api/save-search.js');
        const req = { method: 'POST', body: { minBeds: 2 } };
        const res = createMockRes();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(fileStore[filePath].contactA).toHaveLength(1);
        expect(fileStore[filePath].contactA[0]).toEqual(
          expect.objectContaining({
            params: { minBeds: 2 },
            createdAt: expect.any(String),
            id: expect.any(String),
          }),
        );
      });
    });
  });

  describe('favourites API', () => {
    const filePath = path.join(process.cwd(), 'data', 'favourites.json');

    test('requires authentication for GET requests', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('node:fs/promises', () => mockFsModule());
        jest.doMock('../lib/session.js', () => ({ readSession: readSessionMock }));
        readSessionMock.mockReturnValue(null);
        const handler = require('../pages/api/account/favourites.js');
        const req = { method: 'GET', headers: {} };
        const res = createMockRes();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      });
    });

    test('persists favourites per contact', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('node:fs/promises', () => mockFsModule());
        jest.doMock('../lib/session.js', () => ({ readSession: readSessionMock }));
        readSessionMock.mockReturnValue({ contactId: 'contactC' });
        const handler = require('../pages/api/account/favourites.js');
        const req = { method: 'POST', body: { propertyId: 'ABC123' } };
        const res = createMockRes();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(fileStore[filePath].contactC).toHaveLength(1);
        expect(fileStore[filePath].contactC[0]).toEqual(
          expect.objectContaining({
            propertyId: 'ABC123',
            createdAt: expect.any(String),
          }),
        );
      });
    });
  });
});
