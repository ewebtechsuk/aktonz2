import styles from '../styles/Home.module.css';
import SearchBar from './SearchBar';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h2>London&apos;s Estate Agent</h2>
        <p className={styles.subtitle}>Get it done with London&apos;s number one</p>
        <SearchBar />
      </div>
    </section>
  );
}
