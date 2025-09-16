import Link from 'next/link';
import PropertyCard from './PropertyCard';

function resolvePropertyId(property) {
  if (!property || typeof property !== 'object') return null;
  const rawId = property.id ?? property.listingId ?? property.listing_id;
  return rawId != null ? String(rawId) : null;
}

export default function PropertyList({ properties }) {
  return (
    <div className="property-list">
      {properties.map((property, index) => {
        if (!property) {
          return null;
        }
        const propertyId = resolvePropertyId(property);
        const cardProps =
          propertyId && property?.id !== propertyId
            ? { ...property, id: propertyId }
            : property;
        const key = propertyId ?? `${property?.title ?? 'property'}-${index}`;

        if (!propertyId) {
          return (
            <div key={key} className="property-link property-card-wrapper">
              <PropertyCard property={cardProps} />
            </div>
          );
        }

        return (
          <Link
            href={`/property/${encodeURIComponent(propertyId)}`}
            key={key}
            className="property-link"
          >
            <PropertyCard property={cardProps} />
          </Link>
        );
      })}
    </div>
  );
}
