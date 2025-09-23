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
  fetchProperties,
  fetchPropertiesByType,
  extractMedia,
  normalizeImages,
} from '../../lib/apex27.mjs';
import {
  resolvePropertyIdentifier,
  propertyMatchesIdentifier,
} from '../../lib/property-id.mjs';
import styles from '../../styles/PropertyDetails.module.css';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import { formatRentFrequency, formatPriceGBP } from '../../lib/format.mjs';

function parsePriceNumber(value) {
  return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
}

function rentToMonthly(price, freq) {
  const amount = parsePriceNumber(price);
  switch (freq) {
    case 'W':
      return (amount * 52) / 12;
    case 'M':
      return amount;
    case 'Q':
      return amount / 3;
    case 'Y':
      return amount / 12;
    default:
      return amount;
  }
}

export default function Property({ property, recommendations }) {
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
  const hasLocation =
    property.latitude != null && property.longitude != null;
  const mapProperties = useMemo(
    () => {
      if (!hasLocation) return [];
      return [
        {
          id: property.id,
          title: property.title,
          price: property.price,
          rentFrequency: property.rentFrequency,
          tenure: property.tenure ?? null,
          image: property.image ?? null,
          propertyType: property.type ?? null,
          lat: property.latitude,
          lng: property.longitude,
        },
      ];
    },
    [
      hasLocation,
      property.id,
      property.image,
      property.latitude,
      property.longitude,
      property.price,
      property.rentFrequency,
      property.tenure,
      property.title,
      property.type,
    ]
  );

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
          {property.type && <p className={styles.type}>{property.type}</p>}
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
              {property.rentFrequency &&
                ` ${formatRentFrequency(property.rentFrequency)}`}
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
  const [sale, rent] = await Promise.all([
    fetchProperties({ transactionType: 'sale' }),
    fetchProperties({ transactionType: 'rent' }),
  ]);
  const properties = [...sale, ...rent];
  const paths = properties
    .map((property) => resolvePropertyIdentifier(property))
    .filter(Boolean)
    .map((id) => ({ params: { id: String(id) } }));
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
      type: rawProperty.propertyType || rawProperty.type || '',
      receptions:
        rawProperty.receptionRooms ?? rawProperty.receptions ?? null,
      bedrooms: rawProperty.bedrooms ?? rawProperty.beds ?? null,
      bathrooms: rawProperty.bathrooms ?? rawProperty.baths ?? null,
      latitude: rawProperty.latitude ?? null,
      longitude: rawProperty.longitude ?? null,
      city: normalizedCity,
      outcode: normalizedOutcode,
    };
  }

  const allRent = await fetchPropertiesByType('rent');
  const recommendations = allRent
    .filter((p) => !propertyMatchesIdentifier(p, params.id))
    .slice(0, 4);

  return { props: { property: formatted, recommendations } };
}
