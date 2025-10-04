import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/ListingFilters.module.css';

const DEFAULT_MIN_PRICE_OPTIONS = [
  { label: 'No minimum', value: '' },
  { label: '£100,000', value: '100000' },
  { label: '£250,000', value: '250000' },
  { label: '£400,000', value: '400000' },
  { label: '£600,000', value: '600000' },
  { label: '£800,000', value: '800000' },
  { label: '£1,000,000', value: '1000000' },
  { label: '£1,500,000', value: '1500000' },
];

const DEFAULT_MAX_PRICE_OPTIONS = [
  { label: 'No maximum', value: '' },
  { label: '£350,000', value: '350000' },
  { label: '£500,000', value: '500000' },
  { label: '£750,000', value: '750000' },
  { label: '£1,000,000', value: '1000000' },
  { label: '£1,500,000', value: '1500000' },
  { label: '£2,000,000', value: '2000000' },
];

const DEFAULT_BEDROOM_OPTIONS = [
  { label: 'Any beds', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
  { label: '5+', value: '5' },
];

const SORT_OPTIONS = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Price: Low to high', value: 'price_asc' },
  { label: 'Price: High to low', value: 'price_desc' },
];

function mergeOptions(propertyTypes) {
  const base = [{ label: 'Any property type', value: '' }];
  if (!Array.isArray(propertyTypes) || propertyTypes.length === 0) {
    return base;
  }
  const dynamicOptions = propertyTypes.map((type) => ({
    label: type.label,
    value: type.value,
  }));
  return [...base, ...dynamicOptions];
}

export default function ListingFilters({
  totalResults = 0,
  initialFilters,
  onApply,
  onReset,
  sortOrder = 'recommended',
  onSortChange,
  propertyTypes,
  priceOptions = DEFAULT_MIN_PRICE_OPTIONS,
  maxPriceOptions = DEFAULT_MAX_PRICE_OPTIONS,
  bedroomOptions = DEFAULT_BEDROOM_OPTIONS,
  resultNoun = 'home',
  resultPluralNoun = 'homes',
  submitLabel = 'Show homes',
  searchPlaceholder = 'e.g. Canary Wharf, garden',
  sortLabel = 'Sort by',
  searchLabel = 'Search location or keyword',
  minPriceLabel = 'Min price',
  maxPriceLabel = 'Max price',
  bedroomsLabel = 'Bedrooms',
  propertyTypeLabel = 'Property type',
}) {
  const BOOLEAN_FILTER_KEYS = useMemo(
    () => ['petsAllowed', 'allBillsIncluded', 'hasPorterSecurity', 'hasAccessibilityFeatures'],
    []
  );

  const DEFAULT_FORM_STATE = useMemo(
    () => ({
      search: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      propertyType: '',
      petsAllowed: false,
      allBillsIncluded: false,
      hasPorterSecurity: false,
      hasAccessibilityFeatures: false,
    }),
    []
  );

  const coerceBoolean = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(normalized);
    }
    return Boolean(value);
  };

  const normalizeFormState = (filters = {}) => {
    const nextState = { ...DEFAULT_FORM_STATE };
    Object.keys(nextState).forEach((key) => {
      if (key in filters) {
        nextState[key] = BOOLEAN_FILTER_KEYS.includes(key)
          ? coerceBoolean(filters[key])
          : filters[key] ?? '';
      }
    });
    return nextState;
  };

  const [formState, setFormState] = useState(() => normalizeFormState(initialFilters));

  useEffect(() => {
    setFormState(normalizeFormState(initialFilters));
  }, [initialFilters]);

  const propertyTypeOptions = useMemo(() => mergeOptions(propertyTypes), [propertyTypes]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onApply?.(formState);
  };

  const handleReset = () => {
    setFormState(() => ({ ...DEFAULT_FORM_STATE }));
    onReset?.();
  };

  return (
    <form className={styles.filters} onSubmit={handleSubmit}>
      <div className={styles.headerRow}>
        <p className={styles.resultCount}>
          <strong>{totalResults}</strong>{' '}
          {totalResults === 1 ? resultNoun : resultPluralNoun} available
        </p>
        <label className={styles.sortControl}>
          <span>{sortLabel}</span>
          <select
            name="sortOrder"
            value={sortOrder}
            onChange={(event) => onSortChange?.(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.controls}>
        <label className={styles.control}>
          <span>{searchLabel}</span>
          <input
            type="search"
            name="search"
            placeholder={searchPlaceholder}
            value={formState.search}
            onChange={handleChange}
          />
        </label>

        <label className={styles.control}>
          <span>{minPriceLabel}</span>
          <select name="minPrice" value={formState.minPrice} onChange={handleChange}>
            {priceOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>{maxPriceLabel}</span>
          <select name="maxPrice" value={formState.maxPrice} onChange={handleChange}>
            {maxPriceOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>{bedroomsLabel}</span>
          <select name="bedrooms" value={formState.bedrooms} onChange={handleChange}>
            {bedroomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>{propertyTypeLabel}</span>
          <select
            name="propertyType"
            value={formState.propertyType}
            onChange={handleChange}
          >
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className={styles.flagGroup}>
        <legend>Rental preferences</legend>
        <div className={styles.flagOptions}>
          <label className={styles.flagOption}>
            <input
              type="checkbox"
              name="petsAllowed"
              checked={formState.petsAllowed}
              onChange={handleCheckboxChange}
            />
            <span>Pets allowed</span>
          </label>
          <label className={styles.flagOption}>
            <input
              type="checkbox"
              name="allBillsIncluded"
              checked={formState.allBillsIncluded}
              onChange={handleCheckboxChange}
            />
            <span>All bills included</span>
          </label>
          <label className={styles.flagOption}>
            <input
              type="checkbox"
              name="hasPorterSecurity"
              checked={formState.hasPorterSecurity}
              onChange={handleCheckboxChange}
            />
            <span>Porter or on-site security</span>
          </label>
          <label className={styles.flagOption}>
            <input
              type="checkbox"
              name="hasAccessibilityFeatures"
              checked={formState.hasAccessibilityFeatures}
              onChange={handleCheckboxChange}
            />
            <span>Accessibility features</span>
          </label>
        </div>
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" className={styles.applyButton}>
          {submitLabel}
        </button>
        <button type="button" className={styles.resetButton} onClick={handleReset}>
          Reset filters
        </button>
      </div>
    </form>
  );
}
