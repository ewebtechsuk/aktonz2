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

export default function ListingInsights({ stats, searchTerm }) {
  if (!stats) return null;

  const { averagePrice, medianPrice, propertyTypes, topAreas, averageBedrooms } = stats;

  return (
    <section className={styles.insights}>
      <div className={styles.heading}>
        <h2>Market insights {searchTerm ? `for “${searchTerm}”` : 'for our sales portfolio'}</h2>
        <p>
          Understand how our listings compare across price points, property styles and the
          neighbourhoods buyers are looking at right now.
        </p>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Typical sale price</h3>
          <p className={styles.figure}>{averagePrice ? formatPriceGBP(averagePrice, { isSale: true }) : '—'}</p>
          <p className={styles.meta}>Average asking price across available homes.</p>
          <p className={styles.subFigure}>
            {medianPrice
              ? `Median: ${formatPriceGBP(medianPrice, { isSale: true })}`
              : 'Median price unavailable'}
          </p>
        </article>

        <article className={styles.card}>
          <h3>Space buyers expect</h3>
          <p className={styles.figure}>{averageBedrooms ? `${averageBedrooms.toFixed(1)} bedrooms` : '—'}</p>
          <p className={styles.meta}>Average bedroom count across current listings.</p>
        </article>

        <article className={styles.card}>
          <h3>Most requested property styles</h3>
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
          <h3>In-demand neighbourhoods</h3>
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
            <p className={styles.meta}>We’ll update this as more buyers enquire.</p>
          )}
        </article>
      </div>
    </section>
  );
}
