/** @jest-environment jsdom */

describe('offer frequency helpers', () => {
  test('defaults pcm rentals to per month cadence', async () => {
    const { resolveOfferFrequency } = await import('../lib/offer-frequency.mjs');

    const property = {
      id: 'SCRAYE-PCM',
      transactionType: 'rent',
      rentFrequency: 'M',
    };

    expect(resolveOfferFrequency(property)).toBe('pcm');
  });

  test('omits frequency for sale listings', async () => {
    const { resolveOfferFrequency } = await import('../lib/offer-frequency.mjs');

    const property = {
      id: 'AKT-SALE',
      transactionType: 'sale',
      rentFrequency: 'M',
    };

    expect(resolveOfferFrequency(property)).toBe('');
  });

  test('maps quarterly rentals to per quarter cadence', async () => {
    const { resolveOfferFrequency } = await import('../lib/offer-frequency.mjs');

    const property = {
      id: 'AKT-QUARTER',
      transactionType: 'rent',
      rentFrequency: 'Q',
    };

    expect(resolveOfferFrequency(property)).toBe('pq');
  });
});

describe('OfferDrawer frequency selection', () => {
  test('preselects quarterly frequency and preserves submission token', async () => {
    const property = {
      id: 'Q-RENT',
      title: 'Quarterly rental property',
      transactionType: 'rent',
      rentFrequency: 'Q',
    };

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = fetchMock;

    const previousActEnv = global.IS_REACT_ACT_ENVIRONMENT;
    try {
      jest.resetModules();
      global.IS_REACT_ACT_ENVIRONMENT = true;
      await jest.isolateModulesAsync(async () => {
        jest.doMock('next/router', () => ({
          useRouter: () => ({ basePath: '' }),
        }));
        jest.doMock('../lib/offer-frequency.mjs', () => ({
          isSaleListing: () => false,
          resolveOfferFrequency: () => 'pq',
          OFFER_FREQUENCY_OPTIONS: [
            { value: 'pw', label: 'Per week' },
            { value: 'pcm', label: 'Per month' },
            { value: 'pq', label: 'Per quarter' },
            { value: 'pa', label: 'Per annum' },
          ],
        }));
        jest.doMock('../lib/format.mjs', () => ({
          formatRentFrequency: (value) => value,
        }));
        jest.doMock('../lib/property-type.mjs', () => ({
          formatPropertyTypeLabel: () => '',
        }));
        jest.doMock('../styles/OfferDrawer.module.css', () => ({}));
        jest.doMock('../styles/PropertyActionDrawer.module.css', () => ({}));

        const React = await import('react');
        const { act } = React;
        const { createRoot } = await import('react-dom/client');
        const OfferDrawerModule = await import('../components/OfferDrawer.jsx');
        const offerDrawerExport = OfferDrawerModule.default ?? OfferDrawerModule;
        const OfferDrawer =
          typeof offerDrawerExport === 'object' && offerDrawerExport !== null
            ? offerDrawerExport.default ?? offerDrawerExport
            : offerDrawerExport;

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(React.createElement(OfferDrawer, { property }));
        });

        const trigger = container.querySelector('button');
        expect(trigger).toBeTruthy();

        await act(async () => {
          trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const select = container.querySelector('#offer-frequency');
        expect(select).toBeTruthy();
        expect(select.value).toBe('pq');
        expect(select.options[select.selectedIndex].textContent).toBe('Per quarter');

        const offerInput = container.querySelector('#offer-price');
        const nameInput = container.querySelector('#offer-name');
        const emailInput = container.querySelector('#offer-email');
        expect(offerInput).toBeTruthy();
        expect(nameInput).toBeTruthy();
        expect(emailInput).toBeTruthy();

        const setInputValue = (element, value) => {
          const prototype = Object.getPrototypeOf(element);
          const descriptor =
            Object.getOwnPropertyDescriptor(prototype, 'value') || {};
          if (typeof descriptor.set === 'function') {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
        };

        await act(async () => {
          setInputValue(offerInput, '1750');
        });

        await act(async () => {
          setInputValue(nameInput, 'Quarter Tenant');
        });

        await act(async () => {
          setInputValue(emailInput, 'tenant@example.com');
        });

        const form = container.querySelector('form');
        expect(form).toBeTruthy();

        await act(async () => {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        });

        act(() => {
          root.unmount();
        });
        container.remove();
      });
    } finally {
      if (originalFetch) {
        global.fetch = originalFetch;
      } else {
        delete global.fetch;
      }
      global.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/offers');
    const payload = JSON.parse(requestInit.body);
    expect(payload.frequency).toBe('pq');
    expect(payload.offerAmount).toBe('1750');
    expect(payload.propertyId).toBe(property.id);
  });
});
