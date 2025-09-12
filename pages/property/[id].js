import PropertyList from '../../components/PropertyList';
import MediaGallery from '../../components/MediaGallery';
import OfferDrawer from '../../components/OfferDrawer';
import ViewingForm from '../../components/ViewingForm';
import {
  fetchPropertyById,
  fetchProperties,
  fetchPropertiesByType,
  extractMedia,
} from '../../lib/apex27.mjs';
import styles from '../../styles/PropertyDetails.module.css';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import { formatRentFrequency } from '../../lib/format.mjs';

export default function Property({ property, recommendations }) {
  if (!property) return <div>Property not found</div>;
  const features = Array.isArray(property.features) ? property.features : [];

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        {(property.images?.length > 0 || property.media?.length > 0) && (
          <div className={styles.sliderWrapper}>
            <MediaGallery images={property.images} media={property.media} />
          </div>
        )}
        <div className={styles.summary}>
          <h1>{property.title}</h1>
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
            <OfferDrawer propertyId={property.id} propertyTitle={property.title} />
            <ViewingForm propertyTitle={property.title} />
          </div>
        </div>
      </section>

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
  );
}

export async function getStaticPaths() {
  const [sale, rent] = await Promise.all([
    fetchProperties({ transactionType: 'sale' }),
    fetchProperties({ transactionType: 'rent' }),
  ]);
  const properties = [...sale, ...rent];
  const paths = properties
    .map((p) => p.id ?? p.listingId ?? p.listing_id)
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
    formatted = {
      id: String(
        rawProperty.id ?? rawProperty.listingId ?? rawProperty.listing_id
      ),
      title:
        rawProperty.displayAddress ||
        rawProperty.address1 ||
        rawProperty.title ||
        '',
      description: rawProperty.description || rawProperty.summary || '',
      price:
        rawProperty.price != null
          ? rawProperty.priceCurrency === 'GBP'
            ? `£${rawProperty.price}`
            : rawProperty.price
          : null,
      rentFrequency: rawProperty.rentFrequency ?? null,
      image:
        rawProperty.images && rawProperty.images[0]
          ? rawProperty.images[0].url
          : null,
      images: rawProperty.images ? rawProperty.images.map((img) => img.url) : [],
      media: extractMedia(rawProperty),
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
    };
  }

  const allRent = await fetchPropertiesByType('rent');
  const recommendations = allRent
    .filter((p) => p.id !== params.id)
    .slice(0, 4);

  return { props: { property: formatted, recommendations } };
}
