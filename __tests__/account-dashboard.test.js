/**
 * @jest-environment jsdom
 */

import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';


jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ pathname: '/account', push: jest.fn() })),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }) => (
    <a {...props}>{children}</a>
  ),
}));


jest.mock('../components/account/AccountLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="account-layout">{children}</div>,
}));

jest.mock('../styles/Account.module.css', () => ({
  pageSections: 'pageSections',
  panel: 'panel',
  mapPanel: 'mapPanel',
  sectionHeader: 'sectionHeader',
  ghostButton: 'ghostButton',
  mapShell: 'mapShell',
  mapSurface: 'mapSurface',
  mapToolbar: 'mapToolbar',
  mapMode: 'mapMode',
  mapModeActive: 'mapModeActive',
  mapActionButton: 'mapActionButton',
  mapCanvas: 'mapCanvas',
  mapStatus: 'mapStatus',
  mapFootnote: 'mapFootnote',
  mapSaving: 'mapSaving',
  mapError: 'mapError',
  mapSearch: 'mapSearch',
  searchInput: 'searchInput',
  searchIcon: 'searchIcon',
  searchField: 'searchField',
  helperText: 'helperText',
  searchStatus: 'searchStatus',
  searchError: 'searchError',
  searchResults: 'searchResults',
  searchResultOption: 'searchResultOption',
  searchResultButton: 'searchResultButton',
  searchResultLabel: 'searchResultLabel',
  areaChips: 'areaChips',
  areaChip: 'areaChip',
  areaChipActive: 'areaChipActive',
  areaChipLabel: 'areaChipLabel',
  areaChipActions: 'areaChipActions',
  areaChipButton: 'areaChipButton',
  areaChipEmpty: 'areaChipEmpty',
  primaryCta: 'primaryCta',
  panelHeader: 'panelHeader',
  registerGrid: 'registerGrid',
  formGroup: 'formGroup',
  groupLabel: 'groupLabel',
  rangeControls: 'rangeControls',
  selectWrap: 'selectWrap',
  selectCaption: 'selectCaption',
  select: 'select',
  selectFull: 'selectFull',
  pillRow: 'pillRow',
  pillOption: 'pillOption',
  pillOptionActive: 'pillOptionActive',
  chipRow: 'chipRow',
  chipOption: 'chipOption',
  chipOptionActive: 'chipOptionActive',
  flexOptions: 'flexOptions',
  flexOption: 'flexOption',
  flexOptionActive: 'flexOptionActive',
  textArea: 'textArea',
}), { virtual: true });

function createLeafletMock() {
  const noop = () => {};
  let lastMapInstance = null;
  const mapInstance = {
    on(event, handler) {
      if (event === 'click') {
        mapInstance.__clickHandler = handler;
      }
      return mapInstance;
    },
    off: noop,
    remove: noop,
    __clickHandler: null,
  };
  const markerInstance = {
    addTo: () => markerInstance,
    setLatLng: noop,
    remove: noop,
    bindPopup: noop,
  };
  const polygonInstance = {
    addTo: () => polygonInstance,
    setLatLngs: noop,
    setStyle: noop,
    remove: noop,
  };
  const polylineInstance = {
    addTo: () => polylineInstance,
    setLatLngs: noop,
    remove: noop,
  };

  const module = {
    __esModule: true,
    default: {
      map: () => ({
        setView: () => {
          lastMapInstance = mapInstance;
          return mapInstance;
        },
      }),
      tileLayer: () => ({ addTo: noop }),
      marker: () => markerInstance,
      polygon: () => polygonInstance,
      polyline: () => polylineInstance,
      Icon: { Default: { mergeOptions: noop } },
      divIcon: () => ({}),
      __TESTING: {
        getLastMap: () => lastMapInstance,
      },
    },
    map: () => ({
      setView: () => {
        lastMapInstance = mapInstance;
        return mapInstance;
      },
    }),
    tileLayer: () => ({ addTo: noop }),
    marker: () => markerInstance,
    polygon: () => polygonInstance,
    polyline: () => polylineInstance,
    Icon: { Default: { mergeOptions: noop } },
    divIcon: () => ({}),
    __TESTING: {
      getLastMap: () => lastMapInstance,
    },
    __reset: () => {
      lastMapInstance = null;
      mapInstance.__clickHandler = null;
    },
  };

  return module;
}

const mockLeafletModule = createLeafletMock();

jest.mock('leaflet', () => mockLeafletModule);

function createJsonResponse(data) {
  return {
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

describe('Account dashboard area management', () => {
  let container;
  let root;
  const putBodies = [];
  let AccountDashboard;
  const fetchCalls = [];

  async function flushPromises() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function waitForPutCount(target) {
    const deadline = Date.now() + 2000;
    while (putBodies.length < target && Date.now() < deadline) {
      await flushPromises();
    }
  }

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const loadAccountDashboard = () => {
      const module = require('../pages/account/index.js');
      return module.default || module;
    };
    try {
      AccountDashboard = loadAccountDashboard();
    } catch (error) {
      console.error('Failed to load AccountDashboard', error);
    }
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    putBodies.length = 0;
    fetchCalls.length = 0;
    mockLeafletModule.__reset?.();
    global.fetch = jest.fn((url, options = {}) => {
      fetchCalls.push([url, options]);
      if (url === '/api/account/areas' && options.method === 'PUT') {
        const body = options.body ? JSON.parse(options.body) : {};
        putBodies.push(body);
        return Promise.resolve(createJsonResponse({ ok: true, areas: body.areas || [] }));
      }
      if (url === '/api/account/areas') {
        return Promise.resolve(
          createJsonResponse({
            areas: [
              {
                id: 'existing-pin',
                type: 'pin',
                label: 'My favourite area',
                coordinates: [{ lat: 51.5, lng: -0.09 }],
              },
            ],
          })
        );
      }
      if (typeof url === 'string' && url.startsWith('/api/account/area-search')) {
        const { searchParams } = new URL(url, 'http://localhost');
        const query = searchParams.get('query');
        if (!query) {
          return Promise.resolve(createJsonResponse({ results: [] }));
        }
        return Promise.resolve(
          createJsonResponse({
            results: [
              { id: 'shoreditch', label: 'Shoreditch, London', lat: 51.5245, lng: -0.0782 },
              { id: 'clerkenwell', label: 'Clerkenwell, London', lat: 51.5225, lng: -0.1021 },
            ],
          })
        );
      }
      return Promise.resolve(createJsonResponse({}));
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    document.body.removeChild(container);
    container = null;
    root = null;
    delete global.fetch;
  });

  it('saves new selections and removal changes through the API', async () => {
    if (typeof AccountDashboard !== 'function') {
      throw new Error('AccountDashboard component was not initialised');
    }

    await act(async () => {
      root = createRoot(container);
      root.render(<AccountDashboard />);
    });

    await flushPromises();

    expect(container.textContent).toContain('My favourite area');

    const dropPinButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Drop pin'
    );
    expect(dropPinButton).toBeDefined();

    const mapCanvas = container.querySelector('[data-testid="area-map-canvas"]');
    expect(mapCanvas).toBeTruthy();
    mapCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 320, right: 400, bottom: 320 });

    await act(async () => {
      dropPinButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      mapCanvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 160 }));
      const leaflet = require('leaflet');
      const testingApi = leaflet.__TESTING || leaflet.default?.__TESTING;
      const mapInstance = testingApi?.getLastMap?.();
      mapInstance?.__clickHandler?.({ latlng: { lat: 51.5074, lng: -0.1278 } });
    });

    await waitForPutCount(1);

    expect(putBodies.length).toBeGreaterThanOrEqual(1);
    const firstSave = putBodies[0];
    expect(Array.isArray(firstSave.areas)).toBe(true);
    expect(firstSave.areas).toHaveLength(2);
    const newArea = firstSave.areas.find((area) => area.id !== 'existing-pin');
    expect(newArea).toBeTruthy();
    expect(newArea.type).toBe('pin');
    expect(newArea.coordinates[0].lat).toBeCloseTo(51.5074, 3);
    expect(newArea.coordinates[0].lng).toBeCloseTo(-0.1278, 3);

    const removeButtons = Array.from(container.querySelectorAll('button')).filter(
      (btn) => btn.textContent === 'Remove'
    );
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      removeButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await waitForPutCount(2);

    expect(putBodies.length).toBeGreaterThanOrEqual(2);
    const latestSave = putBodies[putBodies.length - 1];
    expect(latestSave.areas).toHaveLength(1);
    expect(latestSave.areas[0].id).toBe('existing-pin');
  });

  it('allows selecting a suggested area from the search box and persists it', async () => {
    if (typeof AccountDashboard !== 'function') {
      throw new Error('AccountDashboard component was not initialised');
    }

    await act(async () => {
      root = createRoot(container);
      root.render(<AccountDashboard />);
    });

    await flushPromises();

    const input = container.querySelector('input[aria-label="Search areas, stations or postcodes"]');
    expect(input).toBeTruthy();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      nativeInputValueSetter.call(input, 'Shoreditch');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    await flushPromises();

    expect(input.value).toBe('Shoreditch');

    expect(
      fetchCalls.some(([url]) => typeof url === 'string' && url.startsWith('/api/account/area-search'))
    ).toBe(true);

    let attempts = 0;
    while (!container.textContent.includes('Shoreditch, London') && attempts < 10) {
      // allow pending microtasks and renders to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      await flushPromises();
      attempts += 1;
    }

    expect(container.textContent).toContain('Shoreditch, London');

    const suggestionButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Shoreditch, London')
    );
    expect(suggestionButton).toBeDefined();

    await act(async () => {
      suggestionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await flushPromises();

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.textContent).toContain('Shoreditch, London');

    await waitForPutCount(1);

    const persisted = putBodies[putBodies.length - 1];
    expect(persisted.areas).toHaveLength(2);
    const savedSuggestion = persisted.areas.find((area) => area.label === 'Shoreditch, London');
    expect(savedSuggestion).toBeTruthy();
    expect(savedSuggestion.type).toBe('pin');
    expect(savedSuggestion.coordinates[0].lat).toBeCloseTo(51.5245, 3);
    expect(savedSuggestion.coordinates[0].lng).toBeCloseTo(-0.0782, 3);
  });
});
