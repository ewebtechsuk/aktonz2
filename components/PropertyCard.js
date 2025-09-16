import { useEffect, useState } from 'react';
import FavoriteButton from './FavoriteButton';
import { formatRentFrequency } from '../lib/format.mjs';
import { FaBed, FaBath } from 'react-icons/fa';

let SliderModule = null;

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

  const [Slider, setSlider] = useState(() => SliderModule);
  useEffect(() => {
    let mounted = true;
    if (!SliderModule) {
      import('react-slick').then((mod) => {
        const LoadedSlider = mod.default || mod;
        SliderModule = LoadedSlider;
        if (mounted) {
          setSlider(() => LoadedSlider);
        }
      });
    } else {
      setSlider(() => SliderModule);
    }
    return () => {
      mounted = false;
    };
  }, []);

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

  const sliderSettings = {
    dots: hasMultipleImages,
    arrows: hasMultipleImages,
    infinite: hasMultipleImages,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: false,
  };

  return (
    <div className={`property-card${isArchived ? ' archived' : ''}`}>
      <div className="image-wrapper">
        {hasImages && (
          <div className="property-card-slider">
            {Slider ? (
              <Slider {...sliderSettings}>
                {images.map((src, index) => (
                  <div key={`${sliderKeyPrefix}-${index}`}>
                    <img
                      src={src}
                      alt={`${title} image ${index + 1}`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </Slider>
            ) : (
              <img
                src={images[0]}
                alt={`Image of ${title}`}
                referrerPolicy="no-referrer"
              />
            )}
          </div>
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
        {property.description && (
          <p className="description">{property.description}</p>
        )}
        {property.id && <FavoriteButton propertyId={property.id} />}
      </div>
    </div>
  );
}
