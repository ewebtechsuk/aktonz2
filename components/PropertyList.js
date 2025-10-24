import Link from 'next/link';
import { useRef } from 'react';
import PropertyCard from './PropertyCard';
import { resolvePropertyIdentifier } from '../lib/property-id.mjs';


export default function PropertyList({
  properties = [],
  layout = 'default',
  enableSlider = false,
  className = '',
  getSaleHighlights,
}) {
  const listRef = useRef(null);

  const handleScroll = (direction) => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const firstCard = list.querySelector('.property-card-wrapper');
    if (!firstCard) {
      return;
    }

    const { width: cardWidth } = firstCard.getBoundingClientRect();
    if (typeof window === 'undefined') {
      return;
    }

    const computedStyles = window.getComputedStyle(list);
    const gapValue = computedStyles.columnGap || computedStyles.gap || '0';
    const gap = Number.parseFloat(gapValue) || 0;
    const scrollAmount = (cardWidth + gap) * direction;

    list.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  const listClassName = [
    'property-list',
    layout === 'five-per-row' ? 'property-list--five-per-row' : '',
    enableSlider ? 'property-list--scrollable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const listContent = (
    <div ref={listRef} className={listClassName}>
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
                <PropertyCard
                  property={cardProps}
                  saleHighlights={
                    typeof getSaleHighlights === 'function' ? getSaleHighlights(cardProps) : undefined
                  }
                />
              </a>
            );
          }
          return (
            <div key={key} className="property-link property-card-wrapper">
              <PropertyCard
                property={cardProps}
                saleHighlights={
                  typeof getSaleHighlights === 'function' ? getSaleHighlights(cardProps) : undefined
                }
              />
            </div>
          );
        }

        return (
          <Link
            href={`/property/${encodeURIComponent(propertyId)}`}
            key={key}
            className="property-link property-card-wrapper"
          >
            <PropertyCard
              property={cardProps}
              saleHighlights={
                typeof getSaleHighlights === 'function' ? getSaleHighlights(cardProps) : undefined
              }
            />
          </Link>
        );
      })}
    </div>
  );
  if (!enableSlider) {
    return listContent;
  }

  return (
    <div className="property-list-slider">
      {listContent}
      <button
        type="button"
        className="property-list-slider__control property-list-slider__control--prev"
        aria-label="Scroll properties left"
        onClick={() => handleScroll(-1)}
      >
        &#8249;
      </button>
      <button
        type="button"
        className="property-list-slider__control property-list-slider__control--next"
        aria-label="Scroll properties right"
        onClick={() => handleScroll(1)}
      >
        &#8250;
      </button>
    </div>
  );
}
