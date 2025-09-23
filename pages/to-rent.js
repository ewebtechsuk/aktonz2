import { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import PropertyMap from '../components/PropertyMap';
import ListingFilters from '../components/ListingFilters';
import ListingInsights from '../components/ListingInsights';
import AgentCard from '../components/AgentCard';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import agentsData from '../data/agents.json';
import homeStyles from '../styles/Home.module.css';
import rentStyles from '../styles/ToRent.module.css';
import { formatPriceGBP, formatRentFrequency } from '../lib/format.mjs';

function normalizeStatus(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '_');
}

function normalizeType(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function formatTypeLabel(value) {
  return String(value || 'Other')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getRecencyValue(property) {
  const updated = toTimestamp(property?.updatedAt);
  if (updated != null) return updated;
  const created = toTimestamp(property?.createdAt);
  if (created != null) return created;
  const numericId = Number(property?.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

function getPriceValue(property) {
  if (typeof property?.priceValue === 'number' && Number.isFinite(property.priceValue)) {
    return property.priceValue;
  }
  const numeric = Number(String(property?.price ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function computeMedian(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeStats(properties) {
  if (!Array.isArray(properties) || properties.length === 0) {
    return {
      averagePrice: null,
      medianPrice: null,
      propertyTypes: [],
      topAreas: [],
      averageBedrooms: null,
    };
  }

  const priceValues = properties
    .map((property) => getPriceValue(property))
    .filter((value) => value > 0);

  const averagePrice = priceValues.length
    ? priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length
    : null;

  const medianPrice = computeMedian(priceValues);

  const bedroomValues = properties
    .map((property) => {
      const numeric = Number(property?.bedrooms);
      return Number.isFinite(numeric) ? numeric : null;
    })
    .filter((value) => value != null);

  const averageBedrooms = bedroomValues.length
    ? bedroomValues.reduce((sum, value) => sum + value, 0) / bedroomValues.length
    : null;

  const typeCounts = new Map();
  properties.forEach((property) => {
    const normalized = normalizeType(property?.propertyType || 'other');
    const label = property?.propertyType ? formatTypeLabel(property.propertyType) : 'Other';
    const existing = typeCounts.get(normalized) || { value: normalized, label, count: 0 };
    existing.count += 1;
    typeCounts.set(normalized, existing);
  });

  const propertyTypes = Array.from(typeCounts.values()).sort((a, b) => b.count - a.count);

  const areaCounts = new Map();
  properties.forEach((property) => {
    const candidates = [property?.city, property?.county];
    if (Array.isArray(property?.matchingRegions)) {
      candidates.push(...property.matchingRegions);
    }
    candidates
      .map((candidate) => (candidate ? String(candidate).trim() : ''))
      .filter(Boolean)
      .forEach((candidate) => {
        const key = candidate.toLowerCase();
        const existing = areaCounts.get(key) || { name: candidate, count: 0 };
        existing.count += 1;
        areaCounts.set(key, existing);
      });
  });

  const topAreas = Array.from(areaCounts.values()).sort((a, b) => b.count - a.count);

  return {
    averagePrice,
    medianPrice,
    propertyTypes,
    topAreas,
    averageBedrooms,
  };
}

function collectPropertyTypes(properties) {
  const counts = new Map();
  properties.forEach((property) => {
    if (!property?.propertyType) return;
    const normalized = normalizeType(property.propertyType);
    const label = formatTypeLabel(property.propertyType);
    const existing = counts.get(normalized) || { value: normalized, label, count: 0 };
    existing.count += 1;
    counts.set(normalized, existing);
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

const RENT_MIN_PRICE_OPTIONS = [
  { label: 'No minimum', value: '' },
  { label: '£800 pcm', value: '800' },
  { label: '£1,000 pcm', value: '1000' },
  { label: '£1,250 pcm', value: '1250' },
  { label: '£1,500 pcm', value: '1500' },
  { label: '£2,000 pcm', value: '2000' },
  { label: '£2,500 pcm', value: '2500' },
  { label: '£3,000 pcm', value: '3000' },
];

const RENT_MAX_PRICE_OPTIONS = [
  { label: 'No maximum', value: '' },
  { label: '£1,500 pcm', value: '1500' },
  { label: '£2,000 pcm', value: '2000' },
  { label: '£2,500 pcm', value: '2500' },
  { label: '£3,000 pcm', value: '3000' },
  { label: '£3,500 pcm', value: '3500' },
  { label: '£4,000 pcm', value: '4000' },
  { label: '£5,000 pcm', value: '5000' },
];

export default function ToRent({ properties, agents }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search.trim() : '';
  const minPrice =
    router.query.minPrice && !Array.isArray(router.query.minPrice)
      ? Number(router.query.minPrice)
      : null;
  const maxPrice =
    router.query.maxPrice && !Array.isArray(router.query.maxPrice)
      ? Number(router.query.maxPrice)
      : null;
  const bedrooms =
    router.query.bedrooms && !Array.isArray(router.query.bedrooms)
      ? Number(router.query.bedrooms)
      : null;
  const propertyType =
    router.query.propertyType && !Array.isArray(router.query.propertyType)
      ? normalizeType(router.query.propertyType)
      : null;
  const sortOrder =
    router.query.sort && !Array.isArray(router.query.sort)
      ? router.query.sort
      : 'recommended';

  const searchTerm = search.toLowerCase();

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      if (searchTerm) {
        const haystack = [
          property.title,
          property.description,
          property.city,
          property.county,
          ...(Array.isArray(property.matchingRegions) ? property.matchingRegions : []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        if (!haystack.some((value) => value.includes(searchTerm))) {
          return false;
        }
      }

      const priceValue = getPriceValue(property);
      if (minPrice != null && priceValue < minPrice) return false;
      if (maxPrice != null && priceValue > maxPrice) return false;

      const beds = Number(property?.bedrooms ?? 0);
      if (bedrooms != null && (!Number.isFinite(beds) || beds < bedrooms)) return false;

      if (propertyType) {
        const type = normalizeType(property?.propertyType || '');
        if (type !== propertyType) return false;
      }

      const status = normalizeStatus(property?.status || '');
      if (status.includes('pending')) return false;

      return true;
    });
  }, [properties, searchTerm, minPrice, maxPrice, bedrooms, propertyType]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    const comparePriceAsc = (a, b) => getPriceValue(a) - getPriceValue(b);
    const comparePriceDesc = (a, b) => getPriceValue(b) - getPriceValue(a);

    switch (sortOrder) {
      case 'price_asc':
        return items.sort(comparePriceAsc);
      case 'price_desc':
        return items.sort(comparePriceDesc);
      case 'newest':
        return items.sort((a, b) => getRecencyValue(b) - getRecencyValue(a));
      case 'recommended':
      default:
        return items.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return getRecencyValue(b) - getRecencyValue(a);
        });
    }
  }, [filtered, sortOrder]);

  const isLet = (property) => {
    const status = normalizeStatus(property?.status || '');
    return status.includes('let');
  };

  const available = useMemo(() => sorted.filter((property) => !isLet(property)), [sorted]);
  const archived = useMemo(() => sorted.filter(isLet), [sorted]);

  const insights = useMemo(() => computeStats(available), [available]);
  const propertyTypeOptions = useMemo(() => collectPropertyTypes(properties), [properties]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (search) {
      chips.push(`Keyword: “${search}”`);
    }
    if (minPrice != null) {
      chips.push(`Min ${formatPriceGBP(minPrice)} pcm`);
    }
    if (maxPrice != null) {
      chips.push(`Max ${formatPriceGBP(maxPrice)} pcm`);
    }
    if (bedrooms != null) {
      chips.push(`${bedrooms}+ bedrooms`);
    }
    if (propertyType) {
      const selected = propertyTypeOptions.find((option) => option.value === propertyType);
      if (selected) {
        chips.push(`Property type: ${selected.label}`);
      }
    }
    return chips;
  }, [search, minPrice, maxPrice, bedrooms, propertyType, propertyTypeOptions]);

  const currentFilters = useMemo(
    () => ({
      search,
      minPrice: minPrice != null ? String(minPrice) : '',
      maxPrice: maxPrice != null ? String(maxPrice) : '',
      bedrooms: bedrooms != null ? String(bedrooms) : '',
      propertyType: propertyType ?? '',
    }),
    [search, minPrice, maxPrice, bedrooms, propertyType]
  );

  const updateQuery = (filters, nextSort = sortOrder) => {
    if (!router.isReady) return;
    const query = {};
    if (filters.search && filters.search.trim()) query.search = filters.search.trim();
    if (filters.minPrice) query.minPrice = filters.minPrice;
    if (filters.maxPrice) query.maxPrice = filters.maxPrice;
    if (filters.bedrooms) query.bedrooms = filters.bedrooms;
    if (filters.propertyType) query.propertyType = filters.propertyType;
    if (nextSort && nextSort !== 'recommended') query.sort = nextSort;
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const handleApplyFilters = (nextFilters) => {
    updateQuery(nextFilters);
  };

  const handleResetFilters = () => {
    updateQuery(
      { search: '', minPrice: '', maxPrice: '', bedrooms: '', propertyType: '' },
      'recommended'
    );
  };

  const handleSortChange = (nextSort) => {
    updateQuery(currentFilters, nextSort);
  };

  const heroAreaCount = insights.topAreas.length;
  const heroAverageRent = insights.averagePrice
    ? `${formatPriceGBP(insights.averagePrice)} pcm`
    : '—';
  const heroPopularType = insights.propertyTypes[0]?.label
    ? insights.propertyTypes[0].label
    : 'Varied stock';

  const heroRentFrequency = (() => {
    const counts = new Map();
    available.forEach((property) => {
      const freq = property?.rentFrequency ? formatRentFrequency(property.rentFrequency) : null;
      if (!freq) return;
      const existing = counts.get(freq) ?? 0;
      counts.set(freq, existing + 1);
    });
    const [topFrequency] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] || [];
    return topFrequency || 'pcm';
  })();

  return (
    <>
      <Head>
        <title>Properties to Rent | Aktonz</title>
        <meta
          name="description"
          content="Explore Aktonz rental homes with refined search tools, interactive maps and lettings specialists ready to help."
        />
      </Head>
      <main className={`${homeStyles.main} ${rentStyles.page}`}>
        <section className={rentStyles.hero}>
          <div className={rentStyles.heroContent}>
            <p className={rentStyles.breadcrumbs}>Home / To Rent</p>
            <h1 className={rentStyles.heroTitle}>
              {search ? `Properties to rent around “${search}”` : 'Properties to Rent'}
            </h1>
            <p className={rentStyles.heroSubtitle}>
              Find design-led rentals{search ? ` in and around ${search}` : ''} with live pricing, neighbourhood
              insight and appointments arranged by our lettings team.
            </p>
            <div className={rentStyles.heroStats}>
              <div className={rentStyles.heroStat}>
                <span className={rentStyles.heroStatValue}>{heroAverageRent}</span>
                <span>Average monthly rent</span>
              </div>
              <div className={rentStyles.heroStat}>
                <span className={rentStyles.heroStatValue}>{available.length}</span>
                <span>Homes available now</span>
              </div>
              <div className={rentStyles.heroStat}>
                <span className={rentStyles.heroStatValue}>{heroAreaCount || '—'}</span>
                <span>Neighbourhoods covered</span>
              </div>
              <div className={rentStyles.heroStat}>
                <span className={rentStyles.heroStatValue}>{heroPopularType}</span>
                <span>Most requested style</span>
              </div>
            </div>
          </div>
        </section>

        <div className={rentStyles.content}>
          <section className={rentStyles.filtersSection}>
            <div className={rentStyles.filtersInner}>
              <ListingFilters
                totalResults={available.length}
                initialFilters={currentFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                propertyTypes={propertyTypeOptions}
                priceOptions={RENT_MIN_PRICE_OPTIONS}
                maxPriceOptions={RENT_MAX_PRICE_OPTIONS}
                submitLabel="Show rentals"
                searchPlaceholder="e.g. Shoreditch, balcony"
                minPriceLabel="Min rent"
                maxPriceLabel="Max rent"
                resultPluralNoun="homes"
                resultNoun="home"
              />
              {activeFilters.length > 0 && (
                <div className={rentStyles.activeFilters}>
                  {activeFilters.map((chip) => (
                    <span key={chip} className={rentStyles.filterChip}>
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className={rentStyles.resultsLayout}>
            <div className={rentStyles.listColumn}>
              <div className={rentStyles.resultsHeader}>
                <h2>
                  {available.length} {available.length === 1 ? 'rental' : 'rentals'} ready to view
                </h2>
                <p>
                  Sorted by{' '}
                  {sortOrder === 'recommended'
                    ? 'our lettings recommendation'
                    : sortOrder.replace(/_/g, ' ')}
                  {search ? ` for “${search}”` : ''}.
                </p>
              </div>
              <PropertyList properties={available} />
              {archived.length > 0 && (
                <section className={rentStyles.archivedSection}>
                  <h3>Recently let</h3>
                  <p>These homes have just been matched with tenants through Aktonz.</p>
                  <PropertyList properties={archived} />
                </section>
              )}
            </div>
            <aside className={rentStyles.mapColumn}>
              <div className={rentStyles.mapCard}>
                <PropertyMap properties={available} />
              </div>
              <div className={rentStyles.mapSummary}>
                <h3>Explore on the map</h3>
                <p>
                  Pan and zoom to discover homes in your preferred postcodes. Each pin reveals live pricing, key
                  amenities and viewing availability.
                </p>
                <ul>
                  <li>
                    <span>Live rentals</span>
                    <strong>{available.length}</strong>
                  </li>
                  <li>
                    <span>Average rent</span>
                    <strong>{heroAverageRent}</strong>
                  </li>
                  <li>
                    <span>Typical frequency</span>
                    <strong>{heroRentFrequency}</strong>
                  </li>
                </ul>
              </div>
            </aside>
          </div>

          <ListingInsights stats={insights} searchTerm={search} variant="rent" />

          {agents && agents.length > 0 && (
            <section className={rentStyles.agentsSection}>
              <h2>Talk to a lettings specialist</h2>
              <div className="agent-list">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          )}

          <section className={rentStyles.ctaSection}>
            <div>
              <h2>Need help finding the right rental?</h2>
              <p>
                Register with Aktonz to receive tailored alerts, arrange accompanied viewings and secure the tenancy
                that suits your lifestyle.
              </p>
            </div>
            <div className={rentStyles.ctaButtons}>
              <Link href="/register" className={rentStyles.primaryCta}>
                Register for alerts
              </Link>
              <Link href="/contact" className={rentStyles.secondaryCta}>
                Speak to our team
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const raw = await fetchPropertiesByType('rent', {
    statuses: ['available', 'under_offer', 'let_agreed', 'let', 'let_stc', 'let_by'],
  });

  const available = [];
  const archived = [];

  raw.forEach((property) => {
    if (property && typeof property === 'object') {
      const status = normalizeStatus(property.status);
      if (status.includes('let')) {
        archived.push(property);
      } else {
        available.push(property);
      }
    }
  });

  const prioritized = available.concat(archived.slice(0, 40));

  const properties = prioritized.map((property) => ({
    ...property,
    images: Array.isArray(property.images) ? property.images.slice(0, 3) : [],
    description: property.description ? property.description.slice(0, 200) : '',
  }));

  const agents = agentsData;

  return { props: { properties, agents } };
}
