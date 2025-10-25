import { useMemo } from 'react';
import PropertyList from '../../components/PropertyList';
import MediaGallery from '../../components/MediaGallery';
import OfferDrawer from '../../components/OfferDrawer';
import ViewingForm from '../../components/ViewingForm';
import NeighborhoodInfo from '../../components/NeighborhoodInfo';
import FavoriteButton from '../../components/FavoriteButton';
import PropertySustainabilityPanel from '../../components/PropertySustainabilityPanel';

import MortgageCalculator from '../../components/MortgageCalculator';
import RentAffordability from '../../components/RentAffordability';
import PropertyMap from '../../components/PropertyMap';
import Head from 'next/head';
import {
  fetchPropertyById,
  fetchPropertiesByTypeCachedFirst,
  extractMedia,
  normalizeImages,
  extractPricePrefix,
  resolveSecurityDepositSource,
  resolveHoldingDepositSource,
} from '../../lib/apex27.mjs';
import {
  resolvePropertyIdentifier,
  propertyMatchesIdentifier,
} from '../../lib/property-id.mjs';
import {
  resolvePropertyTypeLabel,
  formatPropertyTypeLabel,
} from '../../lib/property-type.mjs';
import styles from '../../styles/PropertyDetails.module.css';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import {
  formatPriceGBP,
  formatPricePrefix,
  formatRentFrequency,
} from '../../lib/format.mjs';
import {
  parsePriceNumber,
  rentToMonthly,
  formatPropertyPriceLabel,
} from '../../lib/rent.js';
import { formatOfferFrequencyLabel } from '../../lib/offer-frequency.mjs';
import {
  normalizeDeposit,
  formatDepositDisplay,
  formatAvailabilityDate,
  resolveAvailabilityDate,
} from '../../lib/deposits.mjs';

function normalizeScrayeReference(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const prefixPattern = /^scraye[-\s]?/i;
  if (prefixPattern.test(normalized)) {
    const suffix = normalized.replace(prefixPattern, '').replace(/\s+/g, '');
    return suffix ? `SCRAYE-${suffix.toUpperCase()}` : 'SCRAYE';
  }

  const cleaned = normalized.replace(/\s+/g, '');
  if (/^scraye-/i.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  return `SCRAYE-${cleaned.toUpperCase()}`;
}

function deriveScrayeReference(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const direct =
    rawProperty.scrayeReference ||
    rawProperty._scraye?.reference ||
    rawProperty._scraye?.listingReference;
  if (direct) {
    return normalizeScrayeReference(direct);
  }

  const source = typeof rawProperty.source === 'string' ? rawProperty.source.toLowerCase() : '';
  if (source !== 'scraye') {
    return null;
  }

  const candidates = [rawProperty.sourceId, rawProperty._scraye?.sourceId, rawProperty.id];
  for (const candidate of candidates) {
    const reference = normalizeScrayeReference(candidate);
    if (reference) {
      return reference;
    }
  }

  return null;
}

function normalizeEpcScoreValue(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return String(Math.round(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const bandMatch = trimmed.match(/([A-G])$/i);
    if (bandMatch) {
      return bandMatch[1].toUpperCase();
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return String(Math.round(numeric));
    }

    return trimmed;
  }

  return null;
}

function deriveEpcScore(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const candidates = [
    rawProperty.epcScore,
    rawProperty.epcRating,
    rawProperty.epcBand,
    rawProperty.epcEeCurrent,
    rawProperty.epcEiCurrent,
    rawProperty.epcArCurrent,
    rawProperty.energyPerformance?.score,
    rawProperty.energyPerformance?.currentScore,
    rawProperty.energyPerformance?.rating,
    rawProperty.energyPerformance?.currentRating,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeEpcScoreValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeCouncilTaxBand(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const bandMatch = trimmed.match(/([A-H])$/i);
    if (bandMatch) {
      return bandMatch[1].toUpperCase();
    }

    return trimmed;
  }

  return null;
}

function deriveCouncilTaxBand(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const candidates = [
    rawProperty.councilTaxBand,
    rawProperty.council_tax_band,
    rawProperty.councilTax?.band,
    rawProperty.councilTax?.value,
    rawProperty.councilTaxBanding,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCouncilTaxBand(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeBooleanFlag(value) {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    if (value > 0) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['y', 'yes', 'true', '1', 'included'].includes(normalized)) {
      return true;
    }
    if (['n', 'no', 'false', '0', 'excluded'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function deriveIncludedUtilities(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return {};
  }

  const sources = [
    rawProperty.rentalFlags,
    rawProperty.rentFlags,
    rawProperty.lettingFlags,
    rawProperty.lettings?.flags,
  ];

  const source = sources.find((value) => value && typeof value === 'object');
  if (!source) {
    return {};
  }

  const mapping = {
    all: ['allBillsIncluded'],
    water: ['waterBillIncluded', 'waterIncluded'],
    gas: ['gasBillIncluded', 'gasIncluded'],
    electricity: ['electricityBillIncluded', 'electricityIncluded'],
    internet: ['internetBillIncluded', 'wifiIncluded', 'broadbandIncluded'],
    councilTax: ['councilTaxIncluded'],
    tvLicence: ['tvLicenceIncluded', 'tvLicenseIncluded'],
  };

  const result = {};
  for (const [normalizedKey, candidateKeys] of Object.entries(mapping)) {
    let value = null;
    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        value = normalizeBooleanFlag(source[key]);
        if (value != null) {
          break;
        }
      }
    }
    result[normalizedKey] = value;
  }

  return result;
}

const RENT_PREBUILD_STATUSES = [
  'available',
  'under_offer',
  'let_agreed',
  'let',
  'let_stc',
  'let_by',
];

const SALE_PREBUILD_STATUSES = ['available', 'under_offer', 'sold'];

async function loadPrebuildPropertyIds(limit = null) {
  try {
    const [rentProperties, saleProperties] = await Promise.all([
      fetchPropertiesByTypeCachedFirst('rent', {
        statuses: RENT_PREBUILD_STATUSES,
      }),
      fetchPropertiesByTypeCachedFirst('sale', {
        statuses: SALE_PREBUILD_STATUSES,
      }),
    ]);

    const ids = [];
    const seen = new Set();

    const addProperty = (property) => {
      if (!property || typeof property !== 'object') {
        return;
      }

      const identifier = resolvePropertyIdentifier(property);
      if (!identifier) {
        return;
      }

      const normalized = String(identifier).trim();
      if (!normalized) {
        return;
      }

      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        return;
      }

      seen.add(dedupeKey);
      ids.push(normalized);
    };

    rentProperties.forEach(addProperty);
    saleProperties.forEach(addProperty);

    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
      return ids.slice(0, limit);
    }

    return ids;
  } catch (error) {
    console.warn('Unable to derive prebuild property ids from cache', error);
    return [];
  }
}

export default function Property({ property, recommendations }) {
  const hasLocation = property?.latitude != null && property?.longitude != null;
  const priceLabel = formatPropertyPriceLabel(property);
  const rentFrequencyLabel = useMemo(() => {
    if (!property?.rentFrequency) {
      return '';
    }
    return formatOfferFrequencyLabel(property.rentFrequency);
  }, [property?.rentFrequency]);

  const formattedPrimaryPrice = useMemo(() => {
    if (!property?.price) {
      return '';
    }

    if (!property?.rentFrequency) {
      return priceLabel || property.price;
    }

    const numericPrice = parsePriceNumber(property.price);
    if (!numericPrice) {
      return priceLabel || property.price;
    }

    return formatPriceGBP(numericPrice, { isSale: true });
  }, [priceLabel, property?.price, property?.rentFrequency]);

  const secondaryRentLabel = useMemo(() => {
    if (!property?.rentFrequency || !property?.price) {
      return '';
    }

    const normalized = formatRentFrequency(property.rentFrequency);
    if (!normalized || normalized === 'pcm') {
      return '';
    }

    const monthly = rentToMonthly(property.price, property.rentFrequency);
    if (!Number.isFinite(monthly) || monthly <= 0) {
      return '';
    }

    return `Approx. ${formatPriceGBP(monthly, { isSale: true })} per month`;
  }, [property?.price, property?.rentFrequency]);
  const descriptionParagraphs = useMemo(() => {
    if (!property?.description) {
      return [];
    }

    return property.description
      .split(/\r?\n\r?\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [property?.description]);
  const summaryStats = useMemo(() => {
    const stats = [];

    if (property?.bedrooms != null) {
      stats.push({
        key: 'bedrooms',
        icon: FaBed,
        value: property.bedrooms,
        label: property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms',
      });
    }

    if (property?.bathrooms != null) {
      stats.push({
        key: 'bathrooms',
        icon: FaBath,
        value: property.bathrooms,
        label: property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms',
      });
    }

    if (property?.receptions != null) {
      stats.push({
        key: 'receptions',
        icon: FaCouch,
        value: property.receptions,
        label: property.receptions === 1 ? 'Reception' : 'Receptions',
      });
    }

    return stats;
  }, [property?.bathrooms, property?.bedrooms, property?.receptions]);
  const headlinePrice = formattedPrimaryPrice || priceLabel || '';
  const numericPriceValue = useMemo(() => {
    if (property?.priceValue != null && Number.isFinite(Number(property.priceValue))) {
      return Number(property.priceValue);
    }
    if (property?.price != null) {
      const parsed = Number(String(property.price).replace(/[^0-9.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }, [property?.price, property?.priceValue]);

  const securityDepositInfo = useMemo(
    () =>
      normalizeDeposit(
        property?.securityDeposit,
        numericPriceValue,
        property?.rentFrequency,
        property?.depositType
      ),
    [
      property?.depositType,
      property?.rentFrequency,
      property?.securityDeposit,
      numericPriceValue,
    ]
  );

  const holdingDepositInfo = useMemo(
    () =>
      normalizeDeposit(
        property?.holdingDeposit,
        numericPriceValue,
        property?.rentFrequency
      ),
    [property?.holdingDeposit, property?.rentFrequency, numericPriceValue]
  );

  const isLettings = Boolean(property?.rentFrequency);
  const securityDepositResolved = formatDepositDisplay(securityDepositInfo, {
    fallback: null,
  });
  const holdingDepositResolved = formatDepositDisplay(holdingDepositInfo, {
    fallback: null,
  });
  const securityDepositLabel = securityDepositResolved ?? (isLettings ? 'Please enquire' : null);
  const holdingDepositLabel = holdingDepositResolved ?? (isLettings ? 'Please enquire' : null);
  const shouldShowSecurityDeposit = Boolean(securityDepositLabel);
  const shouldShowHoldingDeposit = Boolean(holdingDepositLabel);

  const availabilityRaw = useMemo(
    () =>
      property?.availableAt ??
      property?.availableDate ??
      property?.available_from ??
      property?.availableFrom ??
      property?.available ??
      property?.dateAvailableFrom ??
      property?.dateAvailable ??
      property?.date_available_from ??
      property?.date_available ??
      null,
    [
      property?.available,
      property?.availableAt,
      property?.availableDate,
      property?.availableFrom,
      property?.available_from,
      property?.dateAvailable,
      property?.dateAvailableFrom,
      property?.date_available,
      property?.date_available_from,
    ]
  );

  const availabilityLabel = formatAvailabilityDate(availabilityRaw, {
    fallback: isLettings ? 'Please enquire' : null,
  });
  const shouldShowAvailability = Boolean(availabilityLabel);
  const mapProperties = useMemo(
    () => {
      if (!hasLocation || !property) return [];
      return [
        {
          id: property.id,
          title: property.title,
          price: property.price,
          rentFrequency: property.rentFrequency,
          tenure: property.tenure ?? null,
          image: property.image ?? null,
          propertyType: property.propertyType ?? property.type ?? null,
          lat: property.latitude,
          lng: property.longitude,
        },
      ];
    },
    [
      hasLocation,
      property?.id,
      property?.image,
      property?.latitude,
      property?.longitude,
      property?.price,
      property?.rentFrequency,
      property?.tenure,
      property?.title,
      property?.propertyType,
      property?.type,
    ]
  );

  if (!property) {
    return (
      <>
        <Head>
          <title>Property not found | Aktonz</title>
        </Head>
        <main className={styles.main}>
          <h1>Property not found</h1>
        </main>
      </>
    );
  }
  const features = Array.isArray(property.features) ? property.features : [];
  const displayType =
    property.typeLabel ??
    property.propertyTypeLabel ??
    formatPropertyTypeLabel(property.propertyType ?? property.type ?? null);
  const locationLabel = (() => {
    const parts = [];
    if (property.city) {
      parts.push(property.city);
    }
    if (property.outcode) {
      parts.push(property.outcode);
    }
    return parts.join(' · ');
  })();
  const scrayeReference = !property.rentFrequency
    ? property.scrayeReference ?? property._scraye?.reference ?? null
    : null;
  const pricePrefixLabel =
    !property.rentFrequency && property.pricePrefix
      ? formatPricePrefix(property.pricePrefix)
      : '';

  return (
    <>
      <Head>
        <title>{property.title ? `${property.title} | Aktonz` : 'Property details'}</title>
      </Head>
      <main className={styles.main}>
        <section className={`${styles.contentRail} ${styles.hero} ${styles.heroGrid}`}>
          {(property.images?.length > 0 || property.media?.length > 0) && (
            <div className={styles.sliderWrapper}>
              <MediaGallery images={property.images} media={property.media} />
            </div>
          )}
          <div className={styles.summary}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryMain}>
                <div className={styles.summaryIntro}>
                  {displayType && <span className={styles.typeBadge}>{displayType}</span>}
                  {locationLabel && (
                    <span className={styles.locationLabel}>{locationLabel}</span>
                  )}
                  {summaryStats.length > 0 && (
                    <ul className={styles.statsList}>
                      {summaryStats.map((stat) => (
                        <li key={stat.key} className={styles.statItem}>
                          <stat.icon aria-hidden="true" />
                          <span>
                            <strong>{stat.value}</strong> {stat.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {descriptionParagraphs.length > 0 && (
                  <div className={styles.summaryDescription}>
                    {descriptionParagraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
                {scrayeReference && (
                  <p className={styles.reference}>
                    Scraye reference: <span>{scrayeReference}</span>
                  </p>
                )}
                {(pricePrefixLabel || headlinePrice) && (
                  <aside className={styles.summarySidebar}>
                    <div className={styles.summarySidebarInner}>
                      <div className={styles.priceCard}>
                        <div className={styles.priceHeader}>
                          {pricePrefixLabel && (
                            <span className={styles.pricePrefixBadge}>{pricePrefixLabel}</span>
                          )}
                          {headlinePrice && (
                            <div className={styles.priceHeadline}>
                              <span className={styles.pricePrimaryValue}>{headlinePrice}</span>
                              {rentFrequencyLabel && (
                                <span className={styles.priceFrequency}>{rentFrequencyLabel}</span>
                              )}
                            </div>
                          )}
                          {secondaryRentLabel && (
                            <p className={styles.priceSecondary}>{secondaryRentLabel}</p>
                          )}
                        </div>
                        {(shouldShowSecurityDeposit ||
                          shouldShowHoldingDeposit ||
                          shouldShowAvailability) && (
                          <dl className={styles.rentMeta}>
                            {shouldShowSecurityDeposit && (
                              <>
                                <dt>Security deposit</dt>
                                <dd>{securityDepositLabel}</dd>
                              </>
                            )}
                            {shouldShowHoldingDeposit && (
                              <>
                                <dt>Holding deposit</dt>
                                <dd>{holdingDepositLabel}</dd>
                              </>
                            )}
                            {shouldShowAvailability && (
                              <>
                                <dt>Available from</dt>
                                <dd>{availabilityLabel}</dd>
                              </>
                            )}
                          </dl>
                        )}
                        <div className={styles.priceActions}>
                          <OfferDrawer property={property} />
                          <ViewingForm property={property} />
                        </div>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          </div>
        </section>

      {hasLocation && (
        <section className={`${styles.contentRail} ${styles.mapSection}`}>
          <h2>Location</h2>
          <div className={styles.mapContainer}>
            <PropertyMap
              mapId="property-details-map"
              center={[property.latitude, property.longitude]}
              zoom={16}
              properties={mapProperties}
            />
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section className={`${styles.contentRail} ${styles.features}`}>
          <h2>Key features</h2>
          <ul>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <div className={`${styles.contentRail} ${styles.modules}`}>
        <PropertySustainabilityPanel property={property} />

        <NeighborhoodInfo lat={property.latitude} lng={property.longitude} />
        {!property.rentFrequency && property.price && (
          <section className={styles.calculatorSection}>
            <h2>Mortgage Calculator</h2>
            <MortgageCalculator defaultPrice={parsePriceNumber(property.price)} />
          </section>
        )}

        {property.rentFrequency && property.price && (
          <section className={styles.calculatorSection}>
            <h2>Rent Affordability</h2>
            <RentAffordability
              defaultRent={rentToMonthly(property.price, property.rentFrequency)}
            />
          </section>
        )}
      </div>

      <section className={`${styles.contentRail} ${styles.contact}`}>
        <p>Interested in this property?</p>
        <a href="tel:+441234567890">Call our team</a>
      </section>

      {recommendations && recommendations.length > 0 && (
        <section className={`${styles.contentRail} ${styles.related}`}>
          <h2>You might also be interested in</h2>
          <PropertyList properties={recommendations} />
        </section>
      )}
      </main>
    </>
  );
}

export async function getStaticPaths() {
  const ids = await loadPrebuildPropertyIds();
  const paths = ids.map((id) => ({ params: { id: String(id) } }));
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const rawProperty = await fetchPropertyById(params.id);
  let formatted = null;
  if (rawProperty) {
    const imgList = normalizeImages(rawProperty.images || []);
    const isSalePrice = rawProperty.rentFrequency == null;
    const propertyTypeValue =
      rawProperty.propertyType ||
      rawProperty.type ||
      rawProperty.property_type ||
      rawProperty.property_type_code ||
      '';
    const propertyTypeLabel =
      resolvePropertyTypeLabel(rawProperty) ??
      formatPropertyTypeLabel(propertyTypeValue);
    const rawOutcode =
      rawProperty.outcode ??
      rawProperty.postcode ??
      rawProperty.postCode ??
      rawProperty.address?.postcode ??
      null;
    const normalizedOutcode =
      typeof rawOutcode === 'string' && rawOutcode.trim()
        ? rawOutcode.trim().split(/\s+/)[0]
        : null;
    const cityCandidates = [
      rawProperty.city,
      rawProperty.town,
      rawProperty.locality,
      rawProperty.area,
      rawProperty._scraye?.placeName,
    ];
    const normalizedCity =
      cityCandidates.find(
        (value) => typeof value === 'string' && value.trim()
      )?.trim() ?? null;
    const numericPriceValue = (() => {
      if (rawProperty.priceValue != null && Number.isFinite(Number(rawProperty.priceValue))) {
        return Number(rawProperty.priceValue);
      }
      if (rawProperty.price != null) {
        const parsed = Number(String(rawProperty.price).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return null;
    })();

    const rawAvailabilityValue = (() => {
      const candidates = [
        rawProperty.availableAt,
        rawProperty.availableDate,
        rawProperty.available_from,
        rawProperty.availableFrom,
        rawProperty.available,
        rawProperty.dateAvailableFrom,
        rawProperty.dateAvailable,
        rawProperty.date_available_from,
        rawProperty.date_available,
      ];
      for (const candidate of candidates) {
        if (candidate != null) {
          return candidate;
        }
      }
      return null;
    })();

    const resolvedAvailabilityDate = resolveAvailabilityDate(rawAvailabilityValue);
    const normalizedAvailability = resolvedAvailabilityDate
      ? resolvedAvailabilityDate.toISOString()
      : typeof rawAvailabilityValue === 'string'
      ? rawAvailabilityValue.trim()
      : null;

    const securityDepositSource = resolveSecurityDepositSource(rawProperty);
    const holdingDepositSource = resolveHoldingDepositSource(rawProperty);

    const securityDeposit = normalizeDeposit(
      securityDepositSource,
      numericPriceValue,
      rawProperty.rentFrequency,
      rawProperty.depositType
    );

    const holdingDeposit = normalizeDeposit(
      holdingDepositSource,
      numericPriceValue,
      rawProperty.rentFrequency
    );

    formatted = {
      id: resolvePropertyIdentifier(rawProperty) ?? String(params.id),
      title:
        rawProperty.displayAddress ||
        rawProperty.address1 ||
        rawProperty.title ||
        '',
      description: rawProperty.description || rawProperty.summary || '',
      price:
        rawProperty.price != null
          ? rawProperty.priceCurrency === 'GBP'
            ? formatPriceGBP(rawProperty.price, { isSale: isSalePrice })
            : rawProperty.price
          : null,
      pricePrefix: extractPricePrefix(rawProperty) ?? null,
      priceValue: numericPriceValue,

      rentFrequency: rawProperty.rentFrequency ?? null,
      image: imgList[0] || null,
      images: imgList,
      media: extractMedia(rawProperty),
      tenure: rawProperty.tenure ?? null,
      features: (() => {
        const rawFeatures =
          rawProperty.mainFeatures ||
          rawProperty.keyFeatures ||
          rawProperty.features ||
          rawProperty.bullets ||
          [];
        if (Array.isArray(rawFeatures)) return rawFeatures;
        if (typeof rawFeatures === 'string') {
          return rawFeatures
            .split(/\r?\n|,/)
            .map((f) => f.trim())
            .filter(Boolean);
        }
        return [];
      })(),
      propertyType: propertyTypeValue || null,
      propertyTypeLabel: propertyTypeLabel ?? null,
      type: propertyTypeValue || '',
      typeLabel: propertyTypeLabel ?? null,
      receptions:
        rawProperty.receptionRooms ?? rawProperty.receptions ?? null,
      bedrooms: rawProperty.bedrooms ?? rawProperty.beds ?? null,
      bathrooms: rawProperty.bathrooms ?? rawProperty.baths ?? null,
      latitude: rawProperty.latitude ?? null,
      longitude: rawProperty.longitude ?? null,
      city: normalizedCity,
      outcode: normalizedOutcode,
      source: rawProperty.source ?? null,
      _scraye: rawProperty._scraye ?? null,
      depositType: rawProperty.depositType ?? null,
      securityDeposit,
      holdingDeposit,
      availableAt: normalizedAvailability,
      scrayeReference: deriveScrayeReference(rawProperty),
      epcScore: deriveEpcScore(rawProperty),
      councilTaxBand: deriveCouncilTaxBand(rawProperty),
      includedUtilities: deriveIncludedUtilities(rawProperty),
    };
  }

  const allRent = await fetchPropertiesByTypeCachedFirst('rent');
  const recommendations = allRent
    .filter((p) => !propertyMatchesIdentifier(p, params.id))
    .slice(0, 4);

  return { props: { property: formatted, recommendations } };
}
