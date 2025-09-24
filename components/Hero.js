import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h2>Aktonz Appraisal Experience Platform</h2>
        <p className={styles.subtitle}>
          Turn every valuation into a signature instruction with lifecycle
          storytelling, smart follow-ups, and data-rich proposals.
        </p>
        <div className={styles.heroActions}>
          <SearchBar />
          <div className={styles.heroHighlights}>
            <div>
              <span>🎯</span>
              <p>Personalised pre-valuation microsites tailored to each lead.</p>
            </div>
            <div>
              <span>⚡</span>
              <p>Live market intelligence on every device during appointments.</p>
            </div>
            <div>
              <span>🤝</span>
              <p>Automated proposals with instant engagement alerts.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
