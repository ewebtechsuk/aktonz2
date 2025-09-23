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

        const cardProps =
          propertyId && property?.id !== propertyId
            ? { ...property, id: propertyId }
            : property;
        const key = propertyId ?? `${property?.title ?? 'property'}-${index}`;

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

        if (externalUrl && property.source === 'scraye') {
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
