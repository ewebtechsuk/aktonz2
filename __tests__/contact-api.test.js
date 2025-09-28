const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

const mockSendMailGraph = jest.fn();

jest.mock('../lib/ms-graph', () => ({
  sendMailGraph: (...args) => mockSendMailGraph(...args),
}));

const loadTypeScriptModule = (relativePath) => {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filename,
  });

  const module = { exports: {} };
  const moduleRequire = createRequire(filename);
  const wrapper = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    outputText,
  );
  wrapper(module.exports, moduleRequire, module, filename, path.dirname(filename));
  return module.exports;
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
      const { default: handler } = loadTypeScriptModule('../pages/api/contact.ts');
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
      const { default: handler } = loadTypeScriptModule('../pages/api/contact.ts');
      await handler(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Graph error' });
    expect(mockSendMailGraph).toHaveBeenCalledTimes(1);
  });
});
