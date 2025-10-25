import { Fragment, useEffect, useMemo, useState } from 'react';
import { formatCurrencyGBP, formatPricePrefix } from '../lib/format.mjs';
import { formatPropertyPriceLabel } from '../lib/rent.js';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import { formatPropertyTypeLabel } from '../lib/property-type.mjs';
import {
  normalizeDeposit,
  formatDepositDisplay,
  formatAvailabilityDate,
} from '../lib/deposits.mjs';

function formatSalePricePrefix(prefix) {
  if (prefix == null) {
    return null;
  }

  const formatted = formatPricePrefix(prefix);
  if (formatted && typeof formatted === 'string') {
    return formatted;
  }

  const normalized = String(prefix).trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTenureLabel(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLeaseLength({ leaseYearsRemaining, leaseDuration }) {
  const candidate = leaseYearsRemaining ?? leaseDuration;
  if (candidate == null) {
    return null;
  }

  const numeric = Number(candidate);
  if (Number.isFinite(numeric) && numeric > 0) {
    const rounded = Math.round(numeric);
    const label = `${rounded} year${rounded === 1 ? '' : 's'}`;
    return label;
  }

  const normalized = String(candidate).trim();
  return normalized || null;
}

function formatAnnualAmount(amount) {
  if (amount == null) {
    return null;
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const hasPennies = Math.abs(numeric % 1) > 0;
  const formatted = formatCurrencyGBP(numeric, {
    minimumFractionDigits: hasPennies ? 2 : 0,
    maximumFractionDigits: hasPennies ? 2 : 0,
  });

  return formatted;
}

export default function PropertyCard({ property: propertyProp, variant: variantProp } = {}) {
  const property = propertyProp ?? {};
  const cardVariant = variantProp ?? null;
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

  const isSaleListing = property?.transactionType
    ? String(property.transactionType).toLowerCase() === 'sale'
    : !property?.rentFrequency;

  const pricePrefixLabel =
    !property.rentFrequency && property.pricePrefix
      ? formatPricePrefix(property.pricePrefix)
      : '';

  const saleHighlights = useMemo(() => {
    if (!isSaleListing) {
      return [];
    }

    const highlights = [];

    const tenureLabel = formatTenureLabel(property?.tenure);
    if (tenureLabel) {
      highlights.push({
        key: 'tenure',
        label: 'Tenure',
        value: tenureLabel,
      });
    }

    const leaseLabel = formatLeaseLength({
      leaseYearsRemaining: property?.leaseYearsRemaining,
      leaseDuration: property?.leaseDuration,
    });
    if (leaseLabel) {
      highlights.push({
        key: 'lease-length',
        label: 'Lease remaining',
        value: leaseLabel,
      });
    }

    const serviceCharge = formatAnnualAmount(property?.serviceChargeAmount);
    if (serviceCharge) {
      const description = property?.serviceChargeDescription;
      const suffix = description ? ` ${description}` : ' pa';
      highlights.push({
        key: 'service-charge',
        label: 'Service charge',
        value: `${serviceCharge}${suffix}`.trim(),
      });
    }

    const groundRent = formatAnnualAmount(property?.groundRentAmount);
    if (groundRent) {
      const description = property?.groundRentDescription;
      const suffix = description ? ` ${description}` : ' pa';
      highlights.push({
        key: 'ground-rent',
        label: 'Ground rent',
        value: `${groundRent}${suffix}`.trim(),
      });
    }

    const prefix = formatSalePricePrefix(property?.pricePrefix);
    if (prefix) {
      highlights.push({
        key: 'price-prefix',
        label: 'Price qualifier',
        value: prefix,
      });
    }

    return highlights;
  }, [
    isSaleListing,
    property?.groundRentAmount,
    property?.groundRentDescription,
    property?.leaseDuration,
    property?.leaseYearsRemaining,
    property?.pricePrefix,
    property?.serviceChargeAmount,
    property?.serviceChargeDescription,
    property?.tenure,
  ]);

  const priceLabel = formatPropertyPriceLabel(property);

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

  const rentMetaEntries = useMemo(() => {
    if (isSaleListing && !availabilityLabel) {
      return [];
    }

    const entries = [];
    if (!isSaleListing && securityDepositLabel) {
      entries.push({
        key: 'security-deposit',
        label: 'Security deposit',
        value: securityDepositLabel,
      });
    }
    if (!isSaleListing && holdingDepositLabel) {
      entries.push({
        key: 'holding-deposit',
        label: 'Holding deposit',
        value: holdingDepositLabel,
      });
    }
    if (!isSaleListing && availabilityLabel) {
      entries.push({
        key: 'availability',
        label: 'Available from',
        value: availabilityLabel,
      });
    }

    return entries;
  }, [
    availabilityLabel,
    holdingDepositLabel,
    isSaleListing,
    securityDepositLabel,
  ]);

  const showRentMeta = rentMetaEntries.length > 0;
  const showSaleHighlights = saleHighlights.length > 0;
  const overlayMetaEntries = isSaleListing ? saleHighlights : rentMetaEntries;
  const showOverlayMeta = overlayMetaEntries.length > 0;

  const featureData = useMemo(() => {
    const items = [];
    if (property.receptions != null) {
      items.push({ key: 'receptions', icon: FaCouch, value: property.receptions });
    }
    if (property.bedrooms != null) {
      items.push({ key: 'bedrooms', icon: FaBed, value: property.bedrooms });
    }
    if (property.bathrooms != null) {
      items.push({ key: 'bathrooms', icon: FaBath, value: property.bathrooms });
    }
    return items;
  }, [property.bathrooms, property.bedrooms, property.receptions]);

  const rootClassName = [
    'property-card',
    isArchived ? 'archived' : '',
    cardVariant ? `property-card--${cardVariant}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
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

        {cardVariant === 'homepage' && (
          <div className="property-card__overlay" aria-hidden="true">
            <div className="property-card__overlay-inner">
              <div className="property-card__overlay-meta">
                <h3 className="title">{title}</h3>
                {locationText && <p className="location">{locationText}</p>}
              </div>
              <div className="property-card__overlay-footer">
                {priceLabel && (
                  <p className="price">
                    {priceLabel}
                    {pricePrefixLabel && ` ${pricePrefixLabel}`}
                  </p>
                )}
                <span className="property-card__cta">Book a viewing</span>
              </div>
              {showOverlayMeta && (
                <ul className="property-card__rent-chips">
                  {overlayMetaEntries.map(({ key, label, value }) => (
                    <li key={key}>
                      <span className="label">{label}</span>
                      <span className="value">{value}</span>
                    </li>
                  ))}
                </ul>
              )}
              {featureData.length > 0 && (
                <div className="property-card__quick-stats features">
                  {featureData.map(({ key, icon: Icon, value }) => (
                    <span key={key} className="feature">
                      <Icon aria-hidden="true" />
                      {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
        <h3 className="title">{title}</h3>
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
        {isSaleListing ? (
          showSaleHighlights ? (
            <dl className="sale-details">
              {saleHighlights.map(({ key, label, value }) => (
                <Fragment key={key}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </Fragment>
              ))}
            </dl>
          ) : null
        ) : showRentMeta ? (
          <dl className="rent-details">
            {rentMetaEntries.map(({ key, label, value }) => (
              <Fragment key={key}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
        ) : null}
        {cardVariant === 'homepage' || featureData.length === 0 ? null : (
          <div className="features">
            {featureData.map(({ key, icon: Icon, value }) => (
              <span key={key} className="feature">
                <Icon aria-hidden="true" />
                {value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
