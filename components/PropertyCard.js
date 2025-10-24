import { useEffect, useState } from 'react';
import { formatPricePrefix as formatSalePricePrefix } from '../lib/format.mjs';
import { formatPropertyPriceLabel } from '../lib/rent.js';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import { FiClock, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { formatPropertyTypeLabel } from '../lib/property-type.mjs';
import {
  normalizeDeposit,
  formatDepositDisplay,
  formatAvailabilityDate,
} from '../lib/deposits.mjs';

const saleHighlightIcons = {
  clock: FiClock,
  status: FiRefreshCw,
  stamp: FiTrendingUp,
};

export default function PropertyCard({ property, saleHighlights = [], variant: variantProp }) {
  const rawStatus = property.status ? property.status.replace(/_/g, ' ') : null;
  const normalized = rawStatus ? rawStatus.toLowerCase() : '';
  const isArchived =
    normalized.startsWith('sold') ||
    normalized.includes('sale agreed') ||
    normalized.startsWith('let');

  const variant = variantProp || (property?.rentFrequency ? 'rent' : 'sale');
  const cardClassName = [
    'property-card',
    isArchived ? 'archived' : '',
    variant ? `property-card--${variant}` : '',
  ]
    .filter(Boolean)
    .join(' ');

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
      ? formatSalePricePrefix(property.pricePrefix)
      : '';

  const priceLabel = formatPropertyPriceLabel(property);

  const isSaleListing = property?.transactionType
    ? String(property.transactionType).toLowerCase() === 'sale'
    : !property?.rentFrequency;

  const scrayeReference = (() => {
    if (property?.scrayeReference) {
      return property.scrayeReference;
    }
    if (!isSaleListing) {
      return null;
    }
    if (property?._scraye?.reference) {
      return property._scraye.reference;
    }

    const source = typeof property?.source === 'string' ? property.source.toLowerCase() : '';
    if (source !== 'scraye') {
      return null;
    }

    const sourceId = property?.sourceId ?? property?._scraye?.sourceId;
    if (sourceId) {
      const suffix = String(sourceId).replace(/^scraye-/i, '');
      return suffix ? `SCRAYE-${suffix}` : null;
    }

    if (typeof property?.id === 'string' && property.id.toLowerCase().startsWith('scraye-')) {
      const suffix = property.id.slice(7);
      return suffix ? `SCRAYE-${suffix}` : null;
    }

    return null;
  })();

  const numericPriceValue = (() => {
    if (property?.priceValue != null && Number.isFinite(Number(property.priceValue))) {
      return Number(property.priceValue);
    }
    if (property?.price != null) {
      const parsed = Number(String(property.price).replace(/[^0-9.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  })();

  const securityDepositInfo = normalizeDeposit(
    property?.securityDeposit,
    numericPriceValue,
    property?.rentFrequency,
    property?.depositType
  );
  const holdingDepositInfo = normalizeDeposit(
    property?.holdingDeposit,
    numericPriceValue,
    property?.rentFrequency
  );

  const isLettings = Boolean(property?.rentFrequency);
  const securityDepositResolved = formatDepositDisplay(securityDepositInfo, {
    fallback: null,
  });
  const holdingDepositResolved = formatDepositDisplay(holdingDepositInfo, {
    fallback: null,
  });
  const securityDepositLabel = securityDepositResolved ?? (isLettings ? 'Please enquire' : null);
  const holdingDepositLabel = holdingDepositResolved ?? (isLettings ? 'Please enquire' : null);

  const availabilityRaw =
    property?.availableAt ??
    property?.availableDate ??
    property?.available_from ??
    property?.availableFrom ??
    property?.available ??
    property?.dateAvailableFrom ??
    property?.dateAvailable ??
    property?.date_available_from ??
    property?.date_available ??
    null;
  const availabilityLabel = availabilityRaw
    ? formatAvailabilityDate(availabilityRaw, {
        fallback: isLettings ? 'Please enquire' : null,
      })
    : isLettings
    ? 'Please enquire'
    : null;

  const shouldShowSecurityDeposit = Boolean(securityDepositLabel);
  const shouldShowHoldingDeposit = Boolean(holdingDepositLabel);
  const shouldShowAvailability = Boolean(availabilityLabel);
  const showRentMeta =
    !isSaleListing &&
    (shouldShowSecurityDeposit || shouldShowHoldingDeposit || shouldShowAvailability);

  const hasSaleHighlights = Array.isArray(saleHighlights) && saleHighlights.length > 0;

  return (
    <div className={cardClassName}>
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
                <div
                  className="gallery-dots"
                  role="group"
                  aria-label={`${title} gallery navigation`}
                >
                  {images.map((_, index) => (
                    <button
                      type="button"
                      key={`${sliderKeyPrefix}-dot-${index}`}
                      className={`gallery-dot${index === currentImage ? ' active' : ''}`}
                      onClick={(event) => handleDotClick(event, index)}
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={index === currentImage}
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
        {hasSaleHighlights && (
          <div className="property-card__highlights" role="list">
            {saleHighlights.map((highlight, index) => {
              const IconComponent = saleHighlightIcons[highlight?.icon] || null;
              const key = highlight?.key || `${highlight?.label || 'highlight'}-${index}`;
              const tooltip = highlight?.tooltip || '';
              const label = highlight?.label || '';
              if (!label) {
                return null;
              }
              const accessibleLabel = tooltip
                ? `${label}. ${tooltip}`
                : label;
              return (
                <span
                  key={key}
                  className="property-card__highlight"
                  role="listitem"
                  tabIndex={tooltip ? 0 : -1}
                  data-tooltip={tooltip}
                  aria-label={accessibleLabel}
                  title={tooltip || undefined}
                >
                  {IconComponent && (
                    <span className="property-card__highlight-icon" aria-hidden="true">
                      <IconComponent />
                    </span>
                  )}
                  <span className="property-card__highlight-label">{label}</span>
                </span>
              );
            })}
          </div>
        )}
        <h3 className="title">{property.title}</h3>
        {typeLabel && <p className="type">{typeLabel}</p>}
        {locationText && <p className="location">{locationText}</p>}
        {scrayeReference && (
          <p className="reference">
            Scraye ref: <span>{scrayeReference}</span>
          </p>
        )}
        {priceLabel && (
          <p className="price">
            {priceLabel}
            {pricePrefixLabel && ` ${pricePrefixLabel}`}
          </p>
        )}
        {showRentChips && (
          <div className="rent-chip-row" role="list">
            {rentChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <span key={chip.key} className="rent-chip" role="listitem">
                  <span className="rent-chip__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="rent-chip__content">
                    <span className="rent-chip__label">{chip.label}</span>
                    <span className="rent-chip__value">{chip.value}</span>
                  </span>
                </span>
              );
            })}
          </div>
        )}
        {!isRentVariant && showRentMeta && (
          <dl className="rent-details">
            {shouldShowSecurityDeposit && (
              <>
                <dt>Security deposit</dt>
                <dd>{securityDepositLabel}</dd>
              </>
            )}
            {shouldShowHoldingDeposit && (
              <>
                <dt>Holding deposit</dt>
                <dd>{holdingDepositLabel}</dd>
              </>
            )}
            {shouldShowAvailability && (
              <>
                <dt>Available from</dt>
                <dd>{availabilityLabel}</dd>
              </>
            )}
          </dl>
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
