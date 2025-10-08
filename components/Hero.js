import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

const HIGHLIGHTS = [
  'Dedicated local agents in every postcode',
  'Flexible hosted viewings and negotiation support',
  'Award-winning customer satisfaction 2023',
];

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <span className={styles.heroTagline}>Premium fixed-fee estate agency</span>
          <h1 className={styles.heroTitle}>Move smarter with Aktonz local property experts</h1>
          <p className={styles.heroSubtitle}>
            Achieve the best price with modern marketing, dedicated negotiators and a transparent £799 fee. From first
            valuation to handing over the keys, we combine powerful technology with real people who know your street.
          </p>
          <div className={styles.heroActions}>
            <a href="/valuation" className={styles.primaryButton}>
              Book a valuation
            </a>
            <a href="#listings" className={styles.secondaryButton}>
              Explore properties
            </a>
          </div>
          <ul className={styles.heroHighlights}>
            {HIGHLIGHTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelCard}>
            <div className={styles.heroPanelHeading}>
              <span>Find your next address</span>
              <p>Search thousands of properties updated around the clock.</p>
            </div>
            <SearchBar />
            <div className={styles.heroPanelFooter}>
              <div>
                <strong>4.9/5 TrustScore</strong>
                <span>from over 1,200 happy movers</span>
              </div>
              <div className={styles.heroBadge}>Propertymark Protected</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
