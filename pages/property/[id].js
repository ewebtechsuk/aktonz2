import { useMemo } from 'react';
import PropertyList from '../../components/PropertyList';
import MediaGallery from '../../components/MediaGallery';
import OfferDrawer from '../../components/OfferDrawer';
import ViewingForm from '../../components/ViewingForm';
import NeighborhoodInfo from '../../components/NeighborhoodInfo';
import FavoriteButton from '../../components/FavoriteButton';

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
import { formatOfferFrequencyLabel } from '../../lib/offer-frequency.mjs';
import { formatPriceGBP, formatPricePrefix } from '../../lib/format.mjs';
import { parsePriceNumber, rentToMonthly } from '../../lib/rent.mjs';

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

async function loadPrebuildPropertyIds(limit = 24) {
  if (!limit || limit <= 0) {
    return [];
  }

  try {
    const fs = await import('node:fs/promises');
    const pathMod = await import('path');
    const filePath = pathMod.join(process.cwd(), 'data', 'listings.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);

    const ids = [];
    const seen = new Set();

    if (Array.isArray(data)) {
      for (const entry of data) {
        const identifier = resolvePropertyIdentifier(entry);
        if (!identifier) {
          continue;
        }

        const normalized = String(identifier).trim();
        if (!normalized) {
          continue;
        }

        if (normalized.toLowerCase().startsWith('scraye-')) {
          continue;
        }

        const dedupeKey = normalized.toLowerCase();
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        ids.push(normalized);

        if (ids.length >= limit) {
          break;
        }
      }
    }

    return ids;
  } catch (error) {
    console.warn('Unable to derive prebuild property ids from cache', error);
    return [];
  }
}

export default function Property({ property, recommendations }) {
  const hasLocation = property?.latitude != null && property?.longitude != null;
  const rentFrequencyLabel = property?.rentFrequency
    ? formatOfferFrequencyLabel(property.rentFrequency)
    : '';
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
        <section className={styles.hero}>
          {(property.images?.length > 0 || property.media?.length > 0) && (
            <div className={styles.sliderWrapper}>
              <MediaGallery images={property.images} media={property.media} />
            </div>
          )}
        <div className={styles.summary}>
          <div className={styles.summaryHeader}>
            <h1>{property.title}</h1>
            {property.id && (
              <FavoriteButton
                propertyId={property.id}
                iconOnly
                className={styles.favoriteButton}
              />
            )}
          </div>
          {displayType && <p className={styles.type}>{displayType}</p>}
          {locationLabel && <p className={styles.location}>{locationLabel}</p>}
          {scrayeReference && (
            <p className={styles.reference}>
              Scraye reference: <span>{scrayeReference}</span>
            </p>
          )}
          <div className={styles.stats}>
            {property.receptions != null && (
              <span>
                <FaCouch /> {property.receptions}
              </span>
            )}
            {property.bedrooms != null && (
              <span>
                <FaBed /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span>
                <FaBath /> {property.bathrooms}
              </span>
            )}
          </div>
          {property.price && (
            <p className={styles.price}>
              {property.price}
              {pricePrefixLabel && ` ${pricePrefixLabel}`}
              {rentFrequencyLabel && ` ${rentFrequencyLabel}`}
            </p>
          )}
          <div className={styles.actions}>
            <OfferDrawer property={property} />
            <ViewingForm property={property} />
          </div>
        </div>
      </section>

      {hasLocation && (
        <section className={styles.mapSection}>
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
        <section className={styles.features}>
          <h2>Key features</h2>
          <ul>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {property.description && (
        <section className={styles.description}>
          <h2>Description</h2>
          <p>{property.description}</p>
        </section>
      )}

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

      <section className={styles.contact}>
        <p>Interested in this property?</p>
        <a href="tel:+441234567890">Call our team</a>
      </section>

      {recommendations && recommendations.length > 0 && (
        <section className={styles.recommended}>
          <h2>You might also be interested in</h2>
          <PropertyList properties={recommendations} />
        </section>
      )}
      </main>
    </>
  );
}

export async function getStaticPaths() {
  const ids = await loadPrebuildPropertyIds(24);
  const paths = ids.map((id) => ({ params: { id: String(id) } }));
  return {
    paths,
    fallback: 'blocking',
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
      scrayeReference: deriveScrayeReference(rawProperty),
    };
  }

  const allRent = await fetchPropertiesByTypeCachedFirst('rent');
  const recommendations = allRent
    .filter((p) => !propertyMatchesIdentifier(p, params.id))
    .slice(0, 4);

  return { props: { property: formatted, recommendations } };
}
