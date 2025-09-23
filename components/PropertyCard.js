import { useEffect, useState } from 'react';
import { formatRentFrequency, formatPricePrefix } from '../lib/format.mjs';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import { formatPropertyTypeLabel } from '../lib/property-type.mjs';

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
    ? property.images
        .map((img) => {
          if (!img) return null;
          if (typeof img === 'string') return img;
          if (img.url) return img.url;
          if (img.thumbnailUrl) return img.thumbnailUrl;
          return null;
        })
        .filter(Boolean)
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
  const townCandidate =
    property.city ??
    property.town ??
    property.locality ??
    property.area ??
    property._scraye?.placeName ??
    null;
  const town =
    typeof townCandidate === 'string' && townCandidate.trim()
      ? townCandidate.trim()
      : null;
  const postcodeCandidate =
    property.outcode ??
    property.postcode ??
    property.postCode ??
    property._scraye?.outcode ??
    null;
  const postcode =
    typeof postcodeCandidate === 'string' && postcodeCandidate.trim()
      ? postcodeCandidate.trim().split(/\s+/)[0]
      : null;
  const locationParts = [];
  if (town) locationParts.push(town);
  if (postcode) locationParts.push(postcode);
  const locationText = locationParts.join(' · ');
  const typeLabel =
    property.propertyTypeLabel ??
    property.typeLabel ??
    formatPropertyTypeLabel(property.propertyType ?? property.type ?? null);

  const pricePrefixLabel =
    !property.rentFrequency && property.pricePrefix
      ? formatPricePrefix(property.pricePrefix)
      : '';

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
        {typeLabel && <p className="type">{typeLabel}</p>}
        {locationText && <p className="location">{locationText}</p>}
        {property.price && (
          <p className="price">
            {property.price}
            {pricePrefixLabel && ` ${pricePrefixLabel}`}
            {property.rentFrequency &&
              ` ${formatRentFrequency(property.rentFrequency)}`}
          </p>
        )}
        {(property.receptions != null || property.bedrooms != null || property.bathrooms != null) && (
          <div className="features">
            {property.receptions != null && (
              <span className="feature">
                <FaCouch aria-hidden="true" />
                {property.receptions}
              </span>
            )}
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
      </div>
    </div>
  );
}
