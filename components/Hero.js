import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h2>Digital-first estate agency, powered by local experts</h2>
        <p className={styles.subtitle}>
          Sell or let with fixed fees, 24/7 control and dedicated support from an Aktonz expert in your
          neighbourhood.
        </p>
        <SearchBar />
      </div>
    </section>
  );
}
