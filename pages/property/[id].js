import PropertyList from '../../components/PropertyList';
import ImageSlider from '../../components/ImageSlider';
import OfferDrawer from '../../components/OfferDrawer';
import {
  fetchPropertyById,
  fetchProperties,
  fetchPropertiesByType,
} from '../../lib/apex27.mjs';
import styles from '../../styles/PropertyDetails.module.css';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';

export default function Property({ property, recommendations }) {
  if (!property) return <div>Property not found</div>;
  const features = property.features || [];

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        {property.images && property.images.length > 0 && (
          <div className={styles.sliderWrapper}>
            <ImageSlider images={property.images} />
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
          {property.price && <p className={styles.price}>{property.price}</p>}
          <OfferDrawer propertyTitle={property.title} />
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
  const properties = await fetchProperties();
  return {
    paths: properties.map((p) => ({ params: { id: String(p.id) } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const rawProperty = await fetchPropertyById(params.id);
  let formatted = null;
  if (rawProperty) {
    formatted = {
      id: String(rawProperty.id),
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
      image:
        rawProperty.images && rawProperty.images[0]
          ? rawProperty.images[0].url
          : null,
      images: rawProperty.images ? rawProperty.images.map((img) => img.url) : [],
      features:
        rawProperty.mainFeatures ||
        rawProperty.keyFeatures ||
        rawProperty.features ||
        [],
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
