import Link from 'next/link';
import PropertyCard from './PropertyCard';
import { resolvePropertyIdentifier } from '../lib/property-id.mjs';


export default function PropertyList({ properties }) {
  return (
    <div className="property-list">
      {properties.map((property, index) => {
        if (!property) {
          return null;
        }
        const propertyId = resolvePropertyIdentifier(property);
        const explicitKey = property?._cardKey;

        const cardProps =
          propertyId && property?.id !== propertyId
            ? { ...property, id: propertyId }
            : property;
        const keyBase =
          propertyId ??
          property?.id ??
          property?.reference ??
          property?.fullReference ??
          property?.title ??
          'property';
        const key = explicitKey ?? `${keyBase}-${index}`;

        const externalUrl = property.externalUrl;
        if (!propertyId) {
          if (externalUrl) {
            return (
              <a
                key={key}
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="property-link property-card-wrapper"
              >
                <PropertyCard property={cardProps} />
              </a>
            );
          }
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
            className="property-link property-card-wrapper"
          >
            <PropertyCard property={cardProps} />
          </Link>
        );
      })}
    </div>
  );
}
