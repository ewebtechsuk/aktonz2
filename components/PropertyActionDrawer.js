import { useId } from 'react';
import { FaBath, FaBed, FaCouch } from 'react-icons/fa';
import { formatPropertyTypeLabel } from '../lib/property-type.mjs';
import styles from '../styles/PropertyActionDrawer.module.css';
import { formatPropertyPriceLabel } from '../lib/rent.mjs';

export default function PropertyActionDrawer({
  open,
  onClose,
  title,
  description,
  property,
  children,
}) {
  const headingId = useId();
  const summary = property ?? {};
  const imageUrl = summary.images?.[0] || summary.image || null;
  const transactionLabel = summary
    ? summary.rentFrequency
      ? 'To rent'
      : 'For sale'
    : '';
  const priceLabel = formatPropertyPriceLabel(summary);
  const typeLabel =
    summary.typeLabel ??
    summary.propertyTypeLabel ??
    formatPropertyTypeLabel(summary.propertyType ?? summary.type ?? null);

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside
        className={`${styles.drawer} ${open ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={open ? 'false' : 'true'}
      >
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close panel"
          >
            &times;
          </button>
          <div className={styles.summary}>
            <div className={styles.imageWrapper}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={summary.title || 'Property image'}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={styles.placeholder}>No image</div>
              )}
            </div>
            <div className={styles.summaryContent}>
              {transactionLabel && (
                <span className={styles.transaction}>{transactionLabel}</span>
              )}
              <h3 className={styles.summaryTitle}>
                {summary.title || 'Property details'}
              </h3>
              {typeLabel && <p className={styles.summaryType}>{typeLabel}</p>}
              {priceLabel && <p className={styles.summaryPrice}>{priceLabel}</p>}
              <ul className={styles.summaryMeta}>
                {summary.bedrooms != null && (
                  <li>
                    <FaBed aria-hidden="true" />
                    <span>{summary.bedrooms} beds</span>
                  </li>
                )}
                {summary.bathrooms != null && (
                  <li>
                    <FaBath aria-hidden="true" />
                    <span>{summary.bathrooms} baths</span>
                  </li>
                )}
                {summary.receptions != null && (
                  <li>
                    <FaCouch aria-hidden="true" />
                    <span>{summary.receptions} receptions</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className={styles.content}>
            <h2 id={headingId} className={styles.title}>
              {title}
            </h2>
            {description && <p className={styles.description}>{description}</p>}
            <div className={styles.body}>{children}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
