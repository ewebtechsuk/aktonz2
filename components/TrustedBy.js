import styles from '../styles/Home.module.css';

const partners = [
  'Foxtons Collective',
  'Metro Estates',
  'Prime Street Partners',
  'UrbanNest Group',
  'BlueDoor Homes'
];

export default function TrustedBy() {
  return (
    <section className={styles.trustedBy}>
      <div className={styles.trustedIntro}>
        <p className={styles.eyebrow}>Trusted Delivery</p>
        <h2>Loved by modern estate agencies</h2>
        <p>
          Leading independents and national brands rely on Aktonz to orchestrate
          personalised client journeys and capture instructions before the
          competition.
        </p>
      </div>
      <div className={styles.partnerRow}>
        {partners.map((partner) => (
          <span className={styles.partnerBadge} key={partner}>
            {partner}
          </span>
        ))}
      </div>
    </section>
  );
}
