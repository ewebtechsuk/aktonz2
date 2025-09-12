import ImageSlider from './ImageSlider';
import { formatRentFrequency } from '../lib/format.mjs';

export default function PropertyCard({ property }) {
  const rawStatus = property.status ? property.status.replace(/_/g, ' ') : null;
  const normalized = rawStatus ? rawStatus.toLowerCase() : '';
  const isArchived =
    normalized.startsWith('sold') ||
    normalized.includes('sale agreed') ||
    normalized.startsWith('let');


  return (
    <div className={`property-card${isArchived ? ' archived' : ''}`}>
      <div className="image-wrapper">
        {property.images && property.images.length > 0 ? (
          <ImageSlider images={property.images} />

        ) : (
          property.image && <img src={property.image} alt={property.title} />
        )}
        {property.featured && (
          <span className="featured-badge">Featured</span>
        )}
        {rawStatus && !isArchived && (
          <span className="status-badge">{rawStatus}</span>
        )}
        {rawStatus && isArchived && (
          <span className="status-overlay">{rawStatus}</span>
        )}
      </div>
      <div className="details">
        <h3 className="title">{property.title}</h3>
        {property.price && (
          <p className="price">
            {property.price}
            {property.rentFrequency &&
              ` ${formatRentFrequency(property.rentFrequency)}`}
          </p>
        )}
        {property.description && (
          <p className="description">{property.description}</p>
        )}
      </div>
    </div>
  );
}
