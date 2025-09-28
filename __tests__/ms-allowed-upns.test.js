const ORIGINAL_ENV = process.env;

describe('allowed microsoft accounts', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MS_ALLOWED_UPNS;
    delete process.env.MS_ALLOWED_UPN;
    delete process.env.MICROSOFT_ALLOWED_UPNS;
    delete process.env.MICROSOFT_ALLOWED_UPN;
    delete process.env.AZURE_AD_ALLOWED_UPNS;
    delete process.env.AZURE_AD_ALLOWED_UPN;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('falls back to the default account when no env override is present', () => {
    const graph = require('../lib/ms-graph.js');
    expect(graph.ALLOWED_UPNS).toEqual(['info@aktonz.com']);
    expect(graph.ALLOWED_UPN).toBe('info@aktonz.com');
    expect(graph.isUpnAllowed('info@aktonz.com')).toBe(true);
    expect(graph.isUpnAllowed('operations@aktonz.com')).toBe(false);
  });

  test('parses a comma-separated list of allowed accounts', () => {
    process.env.MS_ALLOWED_UPNS = 'operations@aktonz.com, info@aktonz.com';
    const graph = require('../lib/ms-graph.js');
    expect(graph.ALLOWED_UPNS).toEqual([
      'operations@aktonz.com',
      'info@aktonz.com',
    ]);
    expect(graph.ALLOWED_UPN).toBe('operations@aktonz.com');
    expect(graph.isUpnAllowed('OPERATIONS@AKTONZ.COM')).toBe(true);
    expect(graph.isUpnAllowed('info@aktonz.com')).toBe(true);
  });

  test('ignores empty entries and supports semicolon/newline separators', () => {
    process.env.MS_ALLOWED_UPNS = '\n;  sales@aktonz.com ;\nops@aktonz.com\n';
    const graph = require('../lib/ms-graph.js');
    expect(graph.ALLOWED_UPNS).toEqual(['sales@aktonz.com', 'ops@aktonz.com']);
    expect(graph.isUpnAllowed('sales@aktonz.com')).toBe(true);
    expect(graph.isUpnAllowed('unknown@aktonz.com')).toBe(false);
  });
});
