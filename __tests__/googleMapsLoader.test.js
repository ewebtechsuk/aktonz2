describe('loadGoogleMaps', () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.window;
    delete global.document;
  });

  it('resolves to null on the server where window is undefined', async () => {
    const { loadGoogleMaps } = await import('../lib/googleMapsLoader.mjs');
    await expect(loadGoogleMaps('test-key')).resolves.toBeNull();
  });

  it('returns the existing google maps instance when already available', async () => {
    global.window = { google: { maps: { places: {} } } };
    const { loadGoogleMaps } = await import('../lib/googleMapsLoader.mjs');
    const google = await loadGoogleMaps('test-key');
    expect(google).toBe(global.window.google);
  });

  it('injects the Google Maps script when an API key is provided', async () => {
    let createdScript;
    global.window = {};
    global.document = {
      createElement: jest.fn(() => {
        createdScript = {
          async: false,
          defer: false,
          onload: null,
          onerror: null,
          remove: jest.fn(),
          set src(value) {
            this._src = value;
          },
          get src() {
            return this._src;
          },
        };
        return createdScript;
      }),
      head: {
        appendChild: jest.fn((script) => {
          createdScript = script;
        }),
      },
    };

    const { loadGoogleMaps } = await import('../lib/googleMapsLoader.mjs');
    const loadPromise = loadGoogleMaps('abc 123');

    expect(global.document.createElement).toHaveBeenCalledWith('script');
    expect(global.document.head.appendChild).toHaveBeenCalledWith(createdScript);
    expect(createdScript.async).toBe(true);
    expect(createdScript.defer).toBe(true);
    expect(createdScript.src).toContain('maps.googleapis.com/maps/api/js');
    expect(createdScript.src).toContain('libraries=places');
    expect(createdScript.src).toContain('abc%20123');

    global.window.google = { maps: { places: {} } };
    createdScript.onload();

    await expect(loadPromise).resolves.toBe(global.window.google);
  });
});
