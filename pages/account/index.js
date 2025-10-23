import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';

import AccountLayout from '../../components/account/AccountLayout';
import NeighbourhoodMap from '../../components/account/NeighbourhoodMap';
import styles from '../../styles/Account.module.css';
import { formatPriceGBP } from '../../lib/format.cjs';
import { formatOfferFrequencyLabel } from '../../lib/offer-frequency.cjs';

const DEFAULT_RENT_FREQUENCY = 'pcm';
const DEFAULT_RENT_FREQUENCY_LABEL = formatOfferFrequencyLabel(DEFAULT_RENT_FREQUENCY);

const formatRentPriceOption = (amount) => `${formatPriceGBP(amount)} ${DEFAULT_RENT_FREQUENCY_LABEL}`;

const PRICE_MIN_OPTIONS = [1500, 1700, 1900, 2100].map(formatRentPriceOption);
const PRICE_MAX_OPTIONS = [2600, 2900, 3200, 3500].map(formatRentPriceOption);
const TENURE_OPTIONS = ['6 months', '12 months', '18 months', '24 months+'];

const BEDROOM_OPTIONS = [
  { label: 'Studio' },
  { label: '1 bed' },
  { label: '2 bed', active: true },
  { label: '3 bed' },
  { label: '4+ bed' },
];

const PROPERTY_TYPES = [
  { label: 'Apartment', active: true },
  { label: 'House' },
  { label: 'New build' },
  { label: 'Period' },
  { label: 'Loft' },
];

const FLEXIBILITY_CHOICES = [
  { label: 'Stick to my areas' },
  { label: 'Show nearby too', active: true },
  { label: 'Cast a wider net' },

];

const BUDGET_MIN_OPTIONS = [1500, 1750, 1900, 2100].map(formatRentPriceOption);
const BUDGET_MAX_OPTIONS = [2400, 2750, 3000, 3250, 3500].map(formatRentPriceOption);
const SELECTED_MIN = formatRentPriceOption(1900);
const SELECTED_MAX = formatRentPriceOption(3200);

const AREAS_API_PATH = '/api/account/areas';

function normalisePoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }
  const lat = Number(point.lat ?? point.latitude ?? (Array.isArray(point) ? point[0] : null));
  const lng = Number(point.lng ?? point.longitude ?? (Array.isArray(point) ? point[1] : null));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function normaliseAreaPayload(area) {
  if (!area || typeof area !== 'object') {
    return null;
  }
  const type = area.type === 'polygon' ? 'polygon' : 'pin';
  const id = typeof area.id === 'string' && area.id ? area.id : `area-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const label = typeof area.label === 'string' ? area.label : null;

  if (type === 'pin') {
    const candidate = area.coordinates?.[0] ?? area.location ?? area.point ?? null;
    const point = normalisePoint(candidate);
    if (!point) {
      return null;
    }
    return { id, type, coordinates: [point], label };
  }

  const raw = Array.isArray(area.coordinates) ? area.coordinates : [];
  const points = raw.map((entry) => normalisePoint(entry)).filter(Boolean);
  if (points.length < 3) {
    return null;
  }
  return { id, type: 'polygon', coordinates: points, label };
}

function assignAreaLabels(nextAreas = [], previous = []) {
  const previousMap = new Map(previous.map((area) => [area.id, area]));
  let pinCount = 0;
  let polygonCount = 0;

  return nextAreas
    .map((area) => normaliseAreaPayload(area))
    .filter(Boolean)
    .map((area) => {
      const existing = previousMap.get(area.id);
      let label = existing?.label || area.label || null;
      if (area.type === 'pin') {
        pinCount += 1;
        label = label || `Pin ${pinCount}`;
      } else if (area.type === 'polygon') {
        polygonCount += 1;
        label = label || `Area ${polygonCount}`;
      }
      return { ...area, label };
    });
}

function cloneArea(area) {
  return {
    ...area,
    coordinates: Array.isArray(area.coordinates)
      ? area.coordinates.map((point) => ({ lat: point.lat, lng: point.lng }))
      : [],
  };
}

function areasEqual(current = [], previous = []) {
  if (current.length !== previous.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    const a = current[index];
    const b = previous[index];
    if (!a || !b) {
      return false;
    }
    if (a.id !== b.id || a.type !== b.type || (a.label || null) !== (b.label || null)) {
      return false;
    }
    const coordsA = Array.isArray(a.coordinates) ? a.coordinates : [];
    const coordsB = Array.isArray(b.coordinates) ? b.coordinates : [];
    if (coordsA.length !== coordsB.length) {
      return false;
    }
    for (let pointIndex = 0; pointIndex < coordsA.length; pointIndex += 1) {
      const pa = coordsA[pointIndex];
      const pb = coordsB[pointIndex];
      if (!pa || !pb) {
        return false;
      }
      const latEqual = Number(pa.lat).toFixed(6) === Number(pb.lat).toFixed(6);
      const lngEqual = Number(pa.lng).toFixed(6) === Number(pb.lng).toFixed(6);
      if (!latEqual || !lngEqual) {
        return false;
      }
    }
  }
  return true;
}

export default function AccountDashboard() {
  const [areas, setAreas] = useState([]);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState({ saving: false, error: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchState, setSearchState] = useState({ loading: false, error: null });
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const hydratedRef = useRef(false);
  const lastPersistedRef = useRef([]);
  const latestSearchRequestRef = useRef(0);
  const helperTextReactId = useId();
  const errorMessageReactId = useId();
  const suggestionsListReactId = useId();

  const sanitiseReactId = useCallback((value) => value.replace(/[^A-Za-z0-9_-]/g, '-'), []);

  const helperTextId = useMemo(
    () => `area-search-helper-${sanitiseReactId(helperTextReactId)}`,
    [helperTextReactId, sanitiseReactId],
  );
  const errorMessageId = useMemo(
    () => `area-search-error-${sanitiseReactId(errorMessageReactId)}`,
    [errorMessageReactId, sanitiseReactId],
  );
  const suggestionsListId = useMemo(
    () => `area-search-suggestions-${sanitiseReactId(suggestionsListReactId)}`,
    [suggestionsListReactId, sanitiseReactId],
  );

  const handleAreasChange = useCallback((nextAreas) => {
    setAreas((prev) => assignAreaLabels(Array.isArray(nextAreas) ? nextAreas : [], prev));
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      if (!suggestion) {
        return;
      }
      const lat = Number(suggestion.lat);
      const lng = Number(suggestion.lng ?? suggestion.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const label = typeof suggestion.label === 'string' && suggestion.label.trim() ? suggestion.label.trim() : null;
      const nextArea = {
        type: 'pin',
        coordinates: [{ lat, lng }],
        label,
      };
      handleAreasChange([...areas, nextArea]);
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      setSearchTerm('');
      setSearchState({ loading: false, error: null });
    },
    [areas, handleAreasChange]
  );

  const handleRemoveArea = useCallback((id) => {
    setAreas((prev) => assignAreaLabels(prev.filter((area) => area.id !== id), []));
    setEditingAreaId((current) => (current === id ? null : current));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAreaId(null);
  }, []);

  const handleEditingComplete = useCallback(() => {
    setEditingAreaId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAreas() {
      setLoadingAreas(true);
      try {
        const res = await fetch(AREAS_API_PATH, { credentials: 'include' });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || 'Failed to load saved areas');
        }
        const payload = await res.json();
        if (cancelled) {
          return;
        }
        const incoming = Array.isArray(payload?.areas) ? payload.areas : [];
        const normalised = assignAreaLabels(incoming, []);
        setAreas(normalised);
        setLoadError(null);
        lastPersistedRef.current = normalised.map(cloneArea);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('Failed to load saved areas', error);
        const message = error instanceof Error ? error.message : 'Failed to load saved areas';
        setAreas([]);
        setLoadError(message);
        lastPersistedRef.current = [];
      } finally {
        if (!cancelled) {
          setLoadingAreas(false);
          hydratedRef.current = true;
        }
      }
    }

    loadAreas();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    if (areasEqual(areas, lastPersistedRef.current)) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setSaveState({ saving: true, error: null });

    async function persistAreas() {
      try {
        const res = await fetch(AREAS_API_PATH, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || 'Failed to save areas');
        }
        if (cancelled) {
          return;
        }
        setSaveState({ saving: false, error: null });
        lastPersistedRef.current = areas.map(cloneArea);
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        console.error('Failed to persist saved areas', error);
        const message = error instanceof Error ? error.message : 'Failed to save areas';
        setSaveState({ saving: false, error: message });
      }
    }

    persistAreas();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [areas]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearchState({ loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const requestId = latestSearchRequestRef.current + 1;
      latestSearchRequestRef.current = requestId;
      setSearchState({ loading: true, error: null });

      (async () => {
        try {
          const response = await fetch(`/api/account/area-search?query=${encodeURIComponent(trimmed)}`, {
            signal: controller.signal,
          });
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }
          if (!response.ok) {
            const detail = await response.text();
            throw new Error(detail || 'Lookup failed');
          }
          const payload = await response.json();
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }
          const results = Array.isArray(payload?.results) ? payload.results : [];
          setSuggestions(results);
          setSearchState({ loading: false, error: null });
        } catch (error) {
          if (controller.signal.aborted || latestSearchRequestRef.current !== requestId) {
            return;
          }
          console.error('Area search lookup failed', error);
          const message = error instanceof Error ? error.message : 'Lookup failed';
          setSuggestions([]);
          setSearchState({ loading: false, error: message });
        }
      })();
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    setActiveSuggestionIndex((current) => {
      if (!suggestions.length) {
        return -1;
      }
      if (current < 0) {
        return current;
      }
      if (current >= suggestions.length) {
        return suggestions.length - 1;
      }
      return current;
    });
  }, [suggestions]);

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (!suggestions.length) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((current) => {
          if (current < suggestions.length - 1) {
            return current + 1;
          }
          return suggestions.length - 1;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((current) => {
          if (current <= 0) {
            return -1;
          }
          return current - 1;
        });
        return;
      }

      if (event.key === 'Enter') {
        const activeSuggestion =
          activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : undefined;
        if (activeSuggestion) {
          event.preventDefault();
          handleSuggestionSelect(activeSuggestion);
        }
      }
    },
    [activeSuggestionIndex, handleSuggestionSelect, suggestions]
  );

  const areaSummary = useMemo(() => {
    if (loadingAreas) {
      return 'Loading saved areas…';
    }
    if (!areas.length) {
      return 'No areas selected yet.';
    }
    if (areas.length === 1) {
      return '1 area selected';
    }
    return `${areas.length} areas selected`;
  }, [areas.length, loadingAreas]);

  return (
    <AccountLayout
      heroSubtitle="Insights. Information. Control."
      heroTitle="My lettings search"
      heroDescription="London lettings is competitive but we are here to give you an advantage."
      heroCta={{
        label: "Let's get started",
        href: '/to-rent',
        secondary: { label: 'Talk to my team', href: '/contact' },
      }}
    >
      <div className={styles.pageSections}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Register with us to jump the queue</h2>
              <p>
                Share your preferences so your dedicated lettings team can send tailored homes the moment they launch.
              </p>
            </div>
            <Link href="/account/profile" className={styles.primaryCta}>
              Update my preferences
            </Link>
          </header>

          <div className={styles.registerGrid}>
            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>Please share the price range you&apos;d like</span>
              <div className={styles.rangeControls}>
                <label className={styles.selectWrap}>
                  <span className={styles.selectCaption}>Min</span>
                  <select className={styles.select} defaultValue={SELECTED_MIN} aria-label="Minimum price per month">
                    {PRICE_MIN_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.selectWrap}>
                  <span className={styles.selectCaption}>Max</span>
                  <select className={styles.select} defaultValue={SELECTED_MAX} aria-label="Maximum price per month">
                    {PRICE_MAX_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>And for how long?</span>
              <select className={`${styles.select} ${styles.selectFull}`} defaultValue="12 months" aria-label="Tenancy length">
                {TENURE_OPTIONS.map((value) => (

                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>Please select number of bedrooms</span>
              <p className={styles.groupHint}>Choose every option that works for you.</p>
              <div className={styles.pillRow}>
                {BEDROOM_OPTIONS.map((option) => (
                  <span key={option.label} className={`${styles.pillOption} ${option.active ? styles.pillOptionActive : ''}`}>
                    {option.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.groupLabel}>What type of property would you consider?</span>
              <p className={styles.groupHint}>Tick every style that feels right.</p>
              <div className={styles.chipRow}>
                {PROPERTY_TYPES.map((type) => (
                  <span key={type.label} className={`${styles.chipOption} ${type.active ? styles.chipOptionActive : ''}`}>
                    {type.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.mapPanel}`}>
          <header className={styles.sectionHeader}>
            <div>
              <h3>Which area(s) are you looking in?</h3>
              <p>Drop pins on the map or search to add neighbourhoods you love.</p>
            </div>
            <Link href="/area-guides" className={styles.ghostButton}>

              Add another area
            </Link>
          </header>
          <div className={styles.mapShell}>
            <NeighbourhoodMap
              value={areas}
              onChange={handleAreasChange}
              editingAreaId={editingAreaId}
              onCancelEdit={handleCancelEdit}
              onEditingComplete={handleEditingComplete}
            />

            <div className={styles.mapFootnote}>
              <strong>Saved areas</strong>
              <span>{areaSummary}</span>
              {loadError ? (
                <p className={styles.mapError} role="alert">
                  {loadError}
                </p>
              ) : saveState.error ? (
                <p className={styles.mapError} role="alert">
                  {saveState.error}
                </p>
              ) : saveState.saving ? (
                <p className={styles.mapSaving}>Saving your areas…</p>
              ) : (
                <p>We will alert you instantly when properties launch within these areas.</p>
              )}
            </div>
          </div>

          <div className={styles.mapSearch}>
            <label className={styles.searchInput}>
              <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3.5a5.5 5.5 0 0 1 4.13 9.1l3.68 3.68a1 1 0 1 1-1.42 1.42l-3.68-3.68A5.5 5.5 0 1 1 9 3.5Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                type="text"
                className={styles.searchField}
                placeholder="Search areas, stations or postcodes"
                aria-label="Search areas, stations or postcodes"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestions.length > 0}
                aria-controls={suggestions.length ? suggestionsListId : undefined}
                aria-describedby={
                  searchState.error
                    ? `${helperTextId} ${errorMessageId}`
                    : helperTextId
                }
                aria-busy={searchState.loading || undefined}
                aria-activedescendant={
                  activeSuggestionIndex >= 0
                    ? `${suggestionsListId}-option-${activeSuggestionIndex}`
                    : undefined
                }
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </label>
            <p id={helperTextId} className={styles.helperText}>
              Add at least three areas so we can cross-match new launches instantly.
            </p>
            {searchState.loading ? (
              <p className={styles.searchStatus} role="status">
                Looking up suggestions…
              </p>
            ) : null}
            {searchState.error ? (
              <p id={errorMessageId} className={styles.searchError} role="alert">
                {searchState.error}
              </p>
            ) : null}
            {suggestions.length ? (
              <ul className={styles.searchResults} role="listbox" id={suggestionsListId} aria-label="Area suggestions">
                {suggestions.map((suggestion, index) => {
                  const optionId = `${suggestionsListId}-option-${index}`;
                  const isActive = index === activeSuggestionIndex;
                  return (
                    <li
                      key={suggestion.id || optionId}
                      id={optionId}
                      role="option"
                      aria-selected={isActive}
                      className={`${styles.searchResultOption} ${
                        isActive ? styles.searchResultOptionActive : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={styles.searchResultButton}
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <span className={styles.searchResultLabel}>{suggestion.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className={styles.areaChips}>
            {areas.length ? (
              areas.map((area) => (
                <div
                  key={area.id}
                  className={`${styles.areaChip} ${editingAreaId === area.id ? styles.areaChipActive : ''}`}
                >
                  <span className={styles.areaChipLabel}>{area.label}</span>
                  <div className={styles.areaChipActions}>
                    <button
                      type="button"
                      className={styles.areaChipButton}
                      onClick={() => setEditingAreaId(area.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.areaChipButton}
                      onClick={() => handleRemoveArea(area.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span className={styles.areaChipEmpty}>Drop a pin or draw an outline to add an area.</span>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <h3>How flexible are you?</h3>
          <p>Would you like us to be more flexible about your search width? Let us know how much we can broaden results.</p>
          <div className={styles.flexOptions}>
            {FLEXIBILITY_CHOICES.map((choice) => (
              <span key={choice.label} className={`${styles.flexOption} ${choice.active ? styles.flexOptionActive : ''}`}>
                {choice.label}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h3>Any other information?</h3>
          <p>
            We can work even faster when we know about commute times, outside space, school catchments or anything else that
            matters.
          </p>
          <textarea
            className={styles.textArea}
            placeholder="Tell us about must-have features, pet requirements or timing considerations."
            rows={6}
          />
        </section>
      </div>

    </AccountLayout>
  );
}
