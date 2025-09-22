import styles from '../styles/ListingInsights.module.css';
import { formatPriceGBP } from '../lib/format.mjs';

function formatLabel(value) {
  if (!value) return 'Other';
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ListingInsights({ stats, searchTerm, variant = 'sale' }) {
  if (!stats) return null;

  const { averagePrice, medianPrice, propertyTypes, topAreas, averageBedrooms } = stats;

  const isRent = variant === 'rent';

  const headingText = isRent
    ? `Market insights ${searchTerm ? `for “${searchTerm}” rentals` : 'for our lettings portfolio'}`
    : `Market insights ${searchTerm ? `for “${searchTerm}”` : 'for our sales portfolio'}`;

  const introText = isRent
    ? 'See how our rental homes perform across price brackets, property styles and the areas tenants ask for most.'
    : 'Understand how our listings compare across price points, property styles and the neighbourhoods buyers are looking at right now.';

  const averagePriceLabel = isRent
    ? averagePrice
      ? `${formatPriceGBP(averagePrice)} pcm`
      : '—'
    : averagePrice
    ? formatPriceGBP(averagePrice, { isSale: true })
    : '—';

  const medianPriceLabel = isRent
    ? medianPrice
      ? `Median: ${formatPriceGBP(medianPrice)} pcm`
      : 'Median rent unavailable'
    : medianPrice
    ? `Median: ${formatPriceGBP(medianPrice, { isSale: true })}`
    : 'Median price unavailable';

  const averagePriceTitle = isRent ? 'Typical monthly rent' : 'Typical sale price';
  const averagePriceMeta = isRent
    ? 'Average asking rent across available homes.'
    : 'Average asking price across available homes.';

  const bedroomsTitle = isRent ? 'Space renters expect' : 'Space buyers expect';
  const bedroomsMeta = isRent
    ? 'Average bedroom count across current rentals.'
    : 'Average bedroom count across current listings.';

  const propertyTitle = isRent
    ? 'Most requested rental styles'
    : 'Most requested property styles';

  const areaTitle = isRent ? 'Where tenants want to live' : 'In-demand neighbourhoods';
  const areaEmpty = isRent
    ? 'We’ll update this as more renters enquire.'
    : 'We’ll update this as more buyers enquire.';

  return (
    <section className={styles.insights}>
      <div className={styles.heading}>
        <h2>{headingText}</h2>
        <p>{introText}</p>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>{averagePriceTitle}</h3>
          <p className={styles.figure}>{averagePriceLabel}</p>
          <p className={styles.meta}>{averagePriceMeta}</p>
          <p className={styles.subFigure}>{medianPriceLabel}</p>
        </article>

        <article className={styles.card}>
          <h3>{bedroomsTitle}</h3>
          <p className={styles.figure}>{averageBedrooms ? `${averageBedrooms.toFixed(1)} bedrooms` : '—'}</p>
          <p className={styles.meta}>{bedroomsMeta}</p>
        </article>

        <article className={styles.card}>
          <h3>{propertyTitle}</h3>
          <ul>
            {propertyTypes.slice(0, 4).map((item) => (
              <li key={item.value}>
                <span>{formatLabel(item.label)}</span>
                <span className={styles.count}>{item.count}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h3>{areaTitle}</h3>
          {topAreas.length > 0 ? (
            <ul>
              {topAreas.slice(0, 5).map((area) => (
                <li key={area.name}>
                  <span>{area.name}</span>
                  <span className={styles.count}>{area.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.meta}>{areaEmpty}</p>
          )}
        </article>
      </div>
    </section>
  );
}
