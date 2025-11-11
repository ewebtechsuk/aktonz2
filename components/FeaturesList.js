import styles from '../styles/PropertyDetails.module.css';

export default function FeaturesList({ features = [], className = '' }) {
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }

  const headingId = 'property-features-heading';
  const sectionClassName = [styles.featuresSection, className].filter(Boolean).join(' ');

  return (
    <section
      aria-labelledby={headingId}
      className={sectionClassName}
      id="property-features"
    >
      <div className={styles.sectionHeaderRow}>
        <h2 id={headingId}>Key features</h2>
      </div>
      <ul className={styles.featuresList}>
        {features.map((feature, index) => (
          <li key={index} className={styles.featureItem}>
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}
