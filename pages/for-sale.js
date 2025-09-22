import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import PropertyMap from '../components/PropertyMap';
import AgentCard from '../components/AgentCard';
import ListingFilters from '../components/ListingFilters';
import ListingInsights from '../components/ListingInsights';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import agentsData from '../data/agents.json';
import homeStyles from '../styles/Home.module.css';
import saleStyles from '../styles/ForSale.module.css';
import { formatPriceGBP } from '../lib/format.mjs';

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
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
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

export default function ForSale({ properties, agents }) {
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

  const [viewMode, setViewMode] = useState('list');

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

  const isSold = (property) => {
    const status = normalizeStatus(property?.status || '');
    return status.includes('sold') || status.includes('sale_agreed');
  };

  const available = useMemo(() => sorted.filter((property) => !isSold(property)), [sorted]);
  const archived = useMemo(() => sorted.filter(isSold), [sorted]);

  const insights = useMemo(() => computeStats(available), [available]);
  const propertyTypeOptions = useMemo(() => collectPropertyTypes(properties), [properties]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (search) {
      chips.push(`Keyword: “${search}”`);
    }
    if (minPrice != null) {
      chips.push(`Min ${formatPriceGBP(minPrice, { isSale: true })}`);
    }
    if (maxPrice != null) {
      chips.push(`Max ${formatPriceGBP(maxPrice, { isSale: true })}`);
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
  const heroAveragePrice = insights.averagePrice
    ? formatPriceGBP(insights.averagePrice, { isSale: true })
    : '—';
  const heroPopularType = insights.propertyTypes[0]?.label
    ? insights.propertyTypes[0].label
    : 'Varied stock';

  return (
    <>
      <Head>
        <title>Properties for Sale | Aktonz</title>
        <meta
          name="description"
          content="Browse Aktonz homes for sale with advanced filters, live market insights and expert agents ready to help."
        />
      </Head>
      <main className={`${homeStyles.main} ${saleStyles.page}`}>
        <section className={saleStyles.hero}>
          <div className={saleStyles.heroContent}>
            <p className={saleStyles.breadcrumbs}>Home / For Sale</p>
            <h1 className={saleStyles.heroTitle}>
              {search ? `Properties for sale around “${search}”` : 'Properties for Sale'}
            </h1>
            <p className={saleStyles.heroSubtitle}>
              Discover curated homes{search ? ` around ${search}` : ''} with powerful filters, real-time
              market context and direct access to Aktonz negotiators.
            </p>
            <div className={saleStyles.heroStats}>
              <div className={saleStyles.heroStat}>
                <span className={saleStyles.heroStatValue}>{heroAveragePrice}</span>
                <span>Average asking price</span>
              </div>
              <div className={saleStyles.heroStat}>
                <span className={saleStyles.heroStatValue}>{available.length}</span>
                <span>Homes available now</span>
              </div>
              <div className={saleStyles.heroStat}>
                <span className={saleStyles.heroStatValue}>{heroAreaCount || '—'}</span>
                <span>Neighbourhoods covered</span>
              </div>
              <div className={saleStyles.heroStat}>
                <span className={saleStyles.heroStatValue}>{heroPopularType}</span>
                <span>Most requested style</span>
              </div>
            </div>
          </div>
        </section>

        <div className={saleStyles.content}>
          <section className={saleStyles.filtersSection}>
            <div className={saleStyles.filtersInner}>
              <ListingFilters
                totalResults={available.length}
                initialFilters={currentFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                propertyTypes={propertyTypeOptions}
              />
              {activeFilters.length > 0 && (
                <div className={saleStyles.activeFilters}>
                  {activeFilters.map((chip) => (
                    <span key={chip} className={saleStyles.filterChip}>
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className={saleStyles.resultsBar}>
            <div className={saleStyles.resultsHeader}>
              <h2>
                {available.length} {available.length === 1 ? 'home' : 'homes'} ready to view
              </h2>
              <p>
                Sorted by{' '}
                {sortOrder === 'recommended'
                  ? 'our expert recommendation'
                  : sortOrder.replace(/_/g, ' ')}
                {search ? ` for “${search}”` : ''}.
              </p>
            </div>
            <div className={saleStyles.viewToggle}>
              <button type="button" onClick={() => setViewMode('list')} disabled={viewMode === 'list'}>
                List view
              </button>
              <button type="button" onClick={() => setViewMode('map')} disabled={viewMode === 'map'}>
                Map view
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <>
              <PropertyList properties={available} />
              {archived.length > 0 && (
                <section>
                  <h2>Recently sold</h2>
                  <p>These homes were secured through Aktonz and showcase the strength of our buyer network.</p>
                  <PropertyList properties={archived} />
                </section>
              )}
            </>
          ) : (
            <div className={saleStyles.mapWrapper}>
              <PropertyMap properties={available} />
            </div>
          )}

          <ListingInsights stats={insights} searchTerm={search} />

          {agents && agents.length > 0 && (
            <section>
              <h2>Talk to a South East specialist</h2>
              <div className="agent-list">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          )}

          <section className={saleStyles.ctaSection}>
            <div>
              <h2>Need guidance before you buy?</h2>
              <p>
                From arranging viewings to securing the right mortgage partner, our negotiators support you at
                every step.
              </p>
            </div>
            <div className={saleStyles.ctaButtons}>
              <Link href="/register" className={saleStyles.primaryCta}>
                Create a buyer profile
              </Link>
              <Link href="/valuation" className={saleStyles.secondaryCta}>
                Book a valuation
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const raw = await fetchPropertiesByType('sale', {
    statuses: ['available', 'under_offer', 'sold'],
  });

  const properties = raw.slice(0, 50).map((property) => ({
    ...property,
    images: (property.images || []).slice(0, 3),
    description: property.description ? property.description.slice(0, 200) : '',
  }));

  const agents = agentsData;

  return { props: { properties, agents } };
}
