/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

jest.mock('../styles/ListingFilters.module.css', () => ({}), { virtual: true });

import ListingFilters from '../components/ListingFilters.js';

const previousActEnv = global.IS_REACT_ACT_ENVIRONMENT;
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('ListingFilters rental preferences', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  afterAll(() => {
    if (typeof previousActEnv === 'undefined') {
      delete global.IS_REACT_ACT_ENVIRONMENT;
    } else {
      global.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    }
  });

  it('submits boolean flag selections as part of the form state', () => {
    const onApply = jest.fn();

    act(() => {
      root.render(
        <ListingFilters
          totalResults={2}
          initialFilters={{
            search: '',
            minPrice: '',
            maxPrice: '',
            bedrooms: '',
            propertyType: '',
            petsAllowed: true,
            allBillsIncluded: false,
            hasPorterSecurity: false,
            hasAccessibilityFeatures: false,
          }}
          onApply={onApply}
          onReset={jest.fn()}
        />
      );
    });

    const form = container.querySelector('form');
    const petsCheckbox = container.querySelector('input[name="petsAllowed"]');
    const billsCheckbox = container.querySelector('input[name="allBillsIncluded"]');

    expect(petsCheckbox.checked).toBe(true);
    expect(billsCheckbox.checked).toBe(false);

    act(() => {
      petsCheckbox.click();
      billsCheckbox.click();
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toMatchObject({
      petsAllowed: false,
      allBillsIncluded: true,
      hasPorterSecurity: false,
      hasAccessibilityFeatures: false,
    });
  });

  it('clears the rental flag selections when reset is triggered', () => {
    const onReset = jest.fn();

    act(() => {
      root.render(
        <ListingFilters
          totalResults={3}
          initialFilters={{
            petsAllowed: true,
            allBillsIncluded: true,
            hasPorterSecurity: true,
            hasAccessibilityFeatures: true,
          }}
          onApply={jest.fn()}
          onReset={onReset}
        />
      );
    });

    const resetButton = container.querySelector('button[type="button"]');
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));

    checkboxes.forEach((checkbox) => {
      expect(checkbox.checked).toBe(true);
    });

    act(() => {
      resetButton.click();
    });

    checkboxes.forEach((checkbox) => {
      expect(checkbox.checked).toBe(false);
    });
    expect(onReset).toHaveBeenCalled();
  });
});
