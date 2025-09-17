import { useEffect, useState } from 'react';
import FavoriteButton from './FavoriteButton';
import { formatRentFrequency } from '../lib/format.mjs';
import { FaBed, FaBath } from 'react-icons/fa';

export default function PropertyCard({ property }) {
  const rawStatus = property.status ? property.status.replace(/_/g, ' ') : null;
  const normalized = rawStatus ? rawStatus.toLowerCase() : '';
  const isArchived =
    normalized.startsWith('sold') ||
    normalized.includes('sale agreed') ||
    normalized.startsWith('let');

  const title = property.title || 'Property';
  const sliderKeyPrefix =
    property.id || property.listingId || property.listing_id || title;

  const galleryImages = Array.isArray(property.images)
    ? property.images.filter(Boolean)
    : [];

  const images =
    galleryImages.length > 0
      ? galleryImages
      : property.image
      ? [property.image]
      : [];

  const hasMultipleImages = images.length > 1;
  const hasImages = images.length > 0;
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    setCurrentImage(0);
  }, [sliderKeyPrefix, images.length]);

  const showPreviousImage = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!hasMultipleImages) return;
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const showNextImage = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!hasMultipleImages) return;
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (event, index) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!hasImages) return;
    setCurrentImage(index);
  };


  const activeImage = hasImages ? images[currentImage] : null;

  return (
    <div className={`property-card${isArchived ? ' archived' : ''}`}>
      <div className="image-wrapper">
        {hasImages ? (
          <div className={`property-card-gallery${hasMultipleImages ? '' : ' single'}`}>
            {activeImage && (
              <img
                src={activeImage}
                alt={`${title} image ${currentImage + 1}`}
                referrerPolicy="no-referrer"
              />
            )}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  className="gallery-control prev"
                  onClick={showPreviousImage}
                  aria-label="View previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="gallery-control next"
                  onClick={showNextImage}
                  aria-label="View next image"
                >
                  ›
                </button>
                <div className="gallery-dots" role="tablist" aria-label={`${title} gallery`}>
                  {images.map((_, index) => (
                    <button
                      type="button"
                      key={`${sliderKeyPrefix}-dot-${index}`}
                      className={`gallery-dot${index === currentImage ? ' active' : ''}`}
                      onClick={(event) => handleDotClick(event, index)}

                      aria-label={`View image ${index + 1}`}
                      aria-current={index === currentImage ? 'true' : undefined}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="image-placeholder">Image coming soon</div>
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
        {(property.bedrooms != null || property.bathrooms != null) && (
          <div className="features">
            {property.bedrooms != null && (
              <span className="feature">
                <FaBed aria-hidden="true" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="feature">
                <FaBath aria-hidden="true" />
                {property.bathrooms}
              </span>
            )}
          </div>
        )}
        {normalizedDescription && (
          <p className="description">{truncatedDescription}</p>
        )}
        {property.id && <FavoriteButton propertyId={property.id} />}
      </div>
    </div>
  );
}
